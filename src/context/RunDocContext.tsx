
import React, { createContext, useContext, useReducer, useEffect, useState, ReactNode, useRef, useCallback } from 'react';
import { RunDoc, Action, Stage, StageStatus, AppNotification } from '../types';
import { INITIAL_RUN_DOC } from '../constants';
import { runDocReducer } from './runDocReducer';
import { loadProject, saveProject } from '../services/persistenceService';
import LoadingScreen from '../components/UI/LoadingScreen';
import { runYoloPipeline, YoloControl } from '../services/pipelineService';
import { GeminiEvents } from '../services/geminiService';
import { validateRunDoc } from '../services/validationService';

interface RunDocContextType {
  state: RunDoc;
  dispatch: React.Dispatch<Action>;
  canNavigateTo: (stage: Stage) => boolean;
  
  // Notification System
  notifications: AppNotification[];
  addNotification: (message: string, type: AppNotification['type']) => void;
  removeNotification: (id: string) => void;

  // YOLO Interface
  yolo: {
    isActive: boolean; // Is Modal Open?
    isRunning: boolean; // Is Pipeline Executing?
    isPaused: boolean;
    isStopping: boolean; // Is Gracefully Stopping?
    status: string;
    open: () => void; // Open Modal (Pre-flight)
    start: () => void; // Start Pipeline
    pause: () => void;
    resume: () => void;
    stop: () => void; // Abort
    close: () => void; // Close Modal
  };
}

const RunDocContext = createContext<RunDocContextType | undefined>(undefined);

export const RunDocProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(runDocReducer, INITIAL_RUN_DOC);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // YOLO State
  const [yoloActive, setYoloActive] = useState(false);
  const [yoloRunning, setYoloRunning] = useState(false);
  const [yoloPaused, setYoloPaused] = useState(false);
  const [yoloStopping, setYoloStopping] = useState(false);
  const [yoloStatus, setYoloStatus] = useState("");
  
  // Refs to maintain state access inside the async pipeline
  const yoloControlRef = useRef<YoloControl>({
    isPaused: false,
    isAborted: false,
    resumeResolver: null
  });

  // Track if we've already warned about mock mode to prevent spam
  const hasShownMockToast = useRef(false);

  // --- Notification System ---
  const addNotification = useCallback((message: string, type: AppNotification['type']) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type }]);
    
    // Auto remove after 5s
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // --- Event Subscriptions (Quota & Mock) ---
  useEffect(() => {
    const unsubQuota = GeminiEvents.subscribe('quotaExhausted', () => {
       // Force update state to Mock Mode
       dispatch({ type: 'UPDATE_AI_SETTINGS', payload: { mockMode: true } });
       addNotification("API Quota Reached. Switched to Offline Mock Mode automatically.", "error");
    });

    const unsubMock = GeminiEvents.subscribe('mockUsed', () => {
       // Check if this was a forced fallback due to missing key
       const key = process.env.API_KEY;
       const isMissingKey = !key || key.trim() === '';

       if (isMissingKey && !hasShownMockToast.current) {
           addNotification("No API Key found. Running in Demo Mode (Mock Data).", "info");
           hasShownMockToast.current = true;
           // Ensure state reflects reality
           dispatch({ type: 'UPDATE_AI_SETTINGS', payload: { mockMode: true } });
       } else if (!hasShownMockToast.current) {
           addNotification("Running in Offline Mode (Using Mock Data)", "info");
           hasShownMockToast.current = true;
       }
    });

    return () => {
       unsubQuota();
       unsubMock();
    }
  }, [addNotification]);

  // Initial Load (Async)
  useEffect(() => {
    const init = async () => {
      try {
        // Load raw data first
        const rawData = await loadProject();
        
        // Check for API Key
        const key = process.env.API_KEY;
        const isMissingKey = !key || key.trim() === '';

        if (rawData) {
          console.log("Rehydrated project from IndexedDB");
          // Validate before hydrating
          const { valid, errors } = validateRunDoc(rawData);
          
          if (!valid) {
             console.error("Corrupted Save Detected:", errors);
             const repaired = { ...INITIAL_RUN_DOC, ...rawData };
             
             // Ensure critical arrays exist
             if (!repaired.slides) repaired.slides = [];
             if (!repaired.outline) repaired.outline = [];
             if (!repaired.asset_library) repaired.asset_library = [];
             
             dispatch({ type: 'REHYDRATE', payload: repaired });
             addNotification("Project recovered in Safe Mode. Some data may be lost.", "warning");
          } else {
             if (isMissingKey) rawData.ai_settings.mockMode = true;
             dispatch({ type: 'REHYDRATE', payload: rawData });
          }
        } else {
          console.log("No saved project found, using default.");
          if (isMissingKey) dispatch({ type: 'UPDATE_AI_SETTINGS', payload: { mockMode: true } });
        }

        if (isMissingKey && !hasShownMockToast.current) {
            setTimeout(() => {
               addNotification("Welcome to the Demo! No API Key detected, using simulated AI.", "success");
               hasShownMockToast.current = true;
            }, 1000);
        }
      } catch (e) {
        console.error("Critical Init Failure", e);
        dispatch({ type: 'RESET_PROJECT' });
        addNotification("Fatal error loading project. Workspace reset.", "error");
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [addNotification]);

  // Autosave (Debounced Async)
  useEffect(() => {
    if (isLoading) return; // Don't save before load completes

    const timeoutId = setTimeout(() => {
      saveProject(state);
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [state, isLoading]);

  // Global Keyboard Shortcuts (Undo/Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        // Don't hijack input if user is typing
        const tagName = (document.activeElement as HTMLElement)?.tagName;
        const isEditable = tagName === 'INPUT' || tagName === 'TEXTAREA' || (document.activeElement as HTMLElement)?.isContentEditable;
        
        if (isEditable) return;

        // Check for Cmd+Z or Ctrl+Z
        if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
            e.preventDefault();
            if (e.shiftKey) {
                // Redo
                dispatch({ type: 'REDO' });
            } else {
                // Undo
                dispatch({ type: 'UNDO' });
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const canNavigateTo = (targetStage: Stage): boolean => {
    if (targetStage === Stage.Strategist) return true;
    return state.stage_status[targetStage] !== StageStatus.Locked;
  };

  // --- YOLO Actions ---

  const openYolo = () => {
    setYoloActive(true);
    setYoloRunning(false);
    setYoloPaused(false);
    setYoloStopping(false);
    setYoloStatus("Ready to launch");
    // Reset control ref just in case
    yoloControlRef.current = { isPaused: false, isAborted: false, resumeResolver: null };
  };

  const startYoloPipeline = async () => {
    setYoloRunning(true);
    setYoloPaused(false);
    setYoloStopping(false);
    yoloControlRef.current = { isPaused: false, isAborted: false, resumeResolver: null };
    
    try {
      await runYoloPipeline(state, dispatch, setYoloStatus, yoloControlRef.current);
      setYoloStatus("Mission Complete");
    } catch (e) {
      if ((e as Error).message === "YOLO Pipeline Aborted") {
         setYoloStatus("Aborted");
      } else {
         console.error("Yolo Failed", e);
         setYoloStatus("Error: " + (e as Error).message);
      }
    } finally {
      setYoloRunning(false);
      setYoloPaused(false);
      setYoloStopping(false);
    }
  };

  const pauseYolo = () => {
    setYoloPaused(true);
    yoloControlRef.current.isPaused = true;
    setYoloStatus("Paused by user...");
  };

  const resumeYolo = () => {
    setYoloPaused(false);
    yoloControlRef.current.isPaused = false;
    if (yoloControlRef.current.resumeResolver) {
      yoloControlRef.current.resumeResolver();
      yoloControlRef.current.resumeResolver = null;
    }
    setYoloStatus("Resuming...");
  };

  const stopYolo = () => {
    setYoloStopping(true);
    setYoloStatus("Stopping...");
    yoloControlRef.current.isAborted = true;
    if (yoloControlRef.current.resumeResolver) {
      yoloControlRef.current.resumeResolver();
    }
  };

  const closeYolo = () => {
    if (yoloRunning) {
        stopYolo();
    }
    setYoloActive(false);
    setYoloRunning(false);
    setYoloStopping(false);
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <RunDocContext.Provider value={{ 
      state, 
      dispatch, 
      canNavigateTo,
      notifications,
      addNotification,
      removeNotification,
      yolo: {
        isActive: yoloActive,
        isRunning: yoloRunning,
        isPaused: yoloPaused,
        isStopping: yoloStopping,
        status: yoloStatus,
        open: openYolo,
        start: startYoloPipeline,
        pause: pauseYolo,
        resume: resumeYolo,
        stop: stopYolo,
        close: closeYolo
      }
    }}>
      {children}
    </RunDocContext.Provider>
  );
};

export const useRunDoc = () => {
  const context = useContext(RunDocContext);
  if (!context) {
    throw new Error('useRunDoc must be used within a RunDocProvider');
  }
  return context;
};
