
import React, { useState, useEffect, useMemo } from 'react';
import { useRunDoc } from '../../context/RunDocContext';
import { Stage, StageStatus, AppNotification } from '../../types';
import { STAGE_NAMES } from '../../constants';
import StatusBadge from '../UI/StatusBadge';
import Stage1Strategist from '../Stages/Stage1Strategist';
import Stage2ArtDept from '../Stages/Stage2ArtDept';
import Stage3Architect from '../Stages/Stage3Architect';
import Stage4Copywriter from '../Stages/Stage4Copywriter';
import Stage5Publisher from '../Stages/Stage5Publisher';
import { Hammer, Palette, Layout, PenTool, Printer, Settings, Undo2, Redo2, Zap, CloudOff, Info, AlertTriangle, CheckCircle, AlertCircle, GraduationCap, X, Menu, Download, Brain } from 'lucide-react';
import WelcomeModal from '../UI/WelcomeModal';
import SettingsModal from '../UI/SettingsModal';
import ConfirmModal from '../UI/ConfirmModal';
import { loadGoogleFonts } from '../../utils/fontUtils';
import { getTotalTokens } from '../../services/usageService';
import { TutorialCoach } from '../UI/TutorialCoach';
import { YoloOverlay } from '../UI/YoloOverlay';

const Toast: React.FC<{ notification: AppNotification; onDismiss: () => void }> = ({ notification, onDismiss }) => {
   let icon = <Info size={16} />;
   let bgClass = "bg-blue-900/90 border-blue-500/50 text-blue-100";

   if (notification.type === 'error') {
      icon = <AlertCircle size={16} />;
      bgClass = "bg-red-900/90 border-red-500/50 text-red-100";
   } else if (notification.type === 'warning') {
      icon = <AlertTriangle size={16} />;
      bgClass = "bg-yellow-900/90 border-yellow-500/50 text-yellow-100";
   } else if (notification.type === 'success') {
      icon = <CheckCircle size={16} />;
      bgClass = "bg-green-900/90 border-green-500/50 text-green-100";
   }

   return (
      <div className={`p-4 rounded-lg border shadow-xl flex items-start gap-3 backdrop-blur-md animate-in slide-in-from-left-2 duration-300 pointer-events-auto max-w-sm ${bgClass}`}>
         <div className="mt-0.5 shrink-0">{icon}</div>
         <p className="text-sm flex-1 font-medium">{notification.message}</p>
         <button onClick={onDismiss} className="opacity-60 hover:opacity-100 transition-opacity"><X size={14}/></button>
      </div>
   );
};

const AppShell: React.FC = () => {
  const { state, canNavigateTo, dispatch, yolo, notifications, removeNotification } = useRunDoc();
  
  // View State
  const [showSettings, setShowSettings] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Keep Alive State: Track which stages have been visited to lazily mount them
  const [visitedStages, setVisitedStages] = useState<Set<Stage>>(new Set([state.stage]));

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  // Quota Monitoring
  const [tokenCount, setTokenCount] = useState({ input: 0, output: 0 });

  const isTutorial = state.project_id === 'tutorial_mode';

  // Update visited stages whenever current stage changes
  useEffect(() => {
    setVisitedStages(prev => {
        const next = new Set(prev);
        next.add(state.stage);
        return next;
    });
  }, [state.stage]);

  // PWA Install Handler
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log("AppShell: PWA event caught via listener");
    };

    if ((window as any).deferredPrompt) {
        setDeferredPrompt((window as any).deferredPrompt);
        (window as any).deferredPrompt = null;
    }

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // Update token count periodically
  useEffect(() => {
     const interval = setInterval(() => {
        setTokenCount(getTotalTokens());
     }, 2000);
     return () => clearInterval(interval);
  }, []);

  // Global Font Loader
  useEffect(() => {
    loadGoogleFonts(state.branding.fonts);
  }, [state.branding.fonts]);

  useEffect(() => {
    // Check if user has seen tutorial
    const hasSeen = localStorage.getItem('deckforge_tutorial_seen');
    if (!hasSeen) {
      setShowWelcome(true);
    }
  }, []);

  const handleCloseWelcome = () => {
    localStorage.setItem('deckforge_tutorial_seen', 'true');
    setShowWelcome(false);
  };

  const handleStageChange = (newStage: Stage) => {
    if (canNavigateTo(newStage) && !yolo.isActive) {
      dispatch({ type: 'SET_STAGE', payload: newStage });
      setIsSidebarOpen(false); // Close sidebar on mobile nav
    }
  };

  const performExitTutorial = () => {
      dispatch({ type: 'UPDATE_AI_SETTINGS', payload: { mockMode: false } });
      dispatch({ type: 'UPDATE_PROJECT_ID', payload: `my_draft_${Date.now()}` });
      setShowExitConfirm(false);
  };

  const getStageIcon = (s: Stage) => {
    switch (s) {
      case Stage.Strategist: return <Brain size={18} />;
      case Stage.ArtDept: return <Palette size={18} />;
      case Stage.Architect: return <Layout size={18} />;
      case Stage.Copywriter: return <PenTool size={18} />;
      case Stage.Publisher: return <Printer size={18} />;
    }
  };
  
  // Calculate quota status
  const totalTokens = tokenCount.input + tokenCount.output;
  const quotaPercentage = Math.min(100, (totalTokens / 50000) * 100); 
  const quotaColor = quotaPercentage > 80 ? 'bg-red-500' : 'bg-green-500';

  // Helper to render stages with keep-alive
  const shouldRender = (s: Stage) => visitedStages.has(s) || state.stage === s;
  const isVisible = (s: Stage) => state.stage === s;

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden font-sans relative">
      
      {isTutorial && <TutorialCoach state={state} onExit={() => setShowExitConfirm(true)} />}

      {/* Toast Container */}
      <div className="absolute top-16 right-4 z-[9999] flex flex-col gap-2 pointer-events-none max-w-sm w-full md:left-auto">
         {notifications.map(n => (
            <Toast key={n.id} notification={n} onDismiss={() => removeNotification(n.id)} />
         ))}
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 lg:hidden backdrop-blur-sm animate-in fade-in" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 border-r border-gray-800 bg-gray-900 shadow-2xl flex flex-col transition-transform duration-300 transform
        lg:relative lg:translate-x-0 lg:shadow-none
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        
        {isTutorial && (
          <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 z-50"></div>
        )}

        <div className="p-6 border-b border-gray-800 flex flex-col gap-4 relative">
           <button 
             onClick={() => setIsSidebarOpen(false)} 
             className="absolute top-4 right-4 text-gray-500 hover:text-white lg:hidden"
           >
             <X size={20}/>
           </button>

           <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-blue-600 p-1.5 rounded text-white"><Hammer size={20} /></div>
                <h1 className="font-bold text-lg tracking-tight">Assisted Slides</h1>
              </div>
           </div>
           <div className="flex items-center justify-between gap-2">
             <div className="flex items-center gap-1">
                <button 
                  onClick={() => dispatch({ type: 'UNDO' })}
                  disabled={!state.undoStack?.length}
                  className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded border border-gray-700 disabled:opacity-20 transition-all"
                  title="Undo (Ctrl+Z)"
                >
                    <Undo2 size={14} />
                </button>
                <button 
                  onClick={() => dispatch({ type: 'REDO' })}
                  disabled={!state.redoStack?.length}
                  className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded border border-gray-700 disabled:opacity-20 transition-all"
                  title="Redo (Ctrl+Shift+Z)"
                >
                    <Redo2 size={14} />
                </button>
             </div>
             <button onClick={() => setShowSettings(true)} className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded border border-gray-700 relative transition-all">
                <Settings size={14} />
                {(state.ai_settings?.mockMode || isTutorial) && <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>}
             </button>
           </div>
        </div>

        {isTutorial && (
          <div className="px-6 py-3 bg-indigo-900/20 border-b border-indigo-900/30 flex items-center gap-2 text-indigo-400 font-bold text-[10px] uppercase tracking-widest">
             <GraduationCap size={14}/> Tutorial Active
          </div>
        )}

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {[Stage.Strategist, Stage.ArtDept, Stage.Architect, Stage.Copywriter, Stage.Publisher].map((stageNum) => {
            const isAccessible = canNavigateTo(stageNum);
            const isActive = state.stage === stageNum;
            const status = state.stage_status[stageNum as Stage];

            return (
              <button
                key={stageNum}
                onClick={() => handleStageChange(stageNum)}
                className={`w-full flex flex-col gap-1 p-3 rounded-md transition-all border ${
                  isActive 
                  ? 'bg-gray-800 border-gray-700 shadow-sm' 
                  : 'border-transparent hover:bg-gray-800/50'
                } ${(!isAccessible || yolo.isActive) ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-blue-400' : 'text-gray-500'}>
                      {getStageIcon(stageNum)}
                    </span>
                    <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-400'}`}>
                      {STAGE_NAMES[stageNum as Stage]}
                    </span>
                  </div>
                </div>
                <div className="pl-8">
                  <StatusBadge status={status} />
                </div>
              </button>
            );
          })}
        </nav>
        
        {/* Token Monitor */}
        <div className="px-6 py-2">
           <div className="bg-gray-900 rounded p-2 border border-gray-800">
              <div className="flex justify-between items-center mb-1">
                 <span className="text-[10px] text-gray-500 font-bold uppercase flex items-center gap-1">
                    {(state.ai_settings?.mockMode || isTutorial) ? <CloudOff size={10} className="text-green-500"/> : <Zap size={10} className="text-yellow-500"/>}
                    {(state.ai_settings?.mockMode || isTutorial) ? 'Mock Mode' : 'Token Usage'}
                 </span>
                 <span className="text-[10px] text-gray-400 font-mono">{(totalTokens / 1000).toFixed(1)}k</span>
              </div>
              <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                 <div className={`h-full ${quotaColor} transition-all duration-500`} style={{ width: (state.ai_settings?.mockMode || isTutorial) ? '0%' : `${quotaPercentage}%` }}></div>
              </div>
           </div>
        </div>

        <div className="p-4 border-t border-gray-800 space-y-2">
           {deferredPrompt && (
              <button 
                onClick={handleInstallClick}
                className="flex items-center gap-2 text-xs text-green-400 hover:text-green-300 w-full p-2 rounded hover:bg-gray-800 transition-colors font-bold"
              >
                <Download size={14} />
                <span>Install App</span>
              </button>
           )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-gray-900 via-gray-950 to-gray-950 flex flex-col w-full">
        
        {/* Mobile Header Toggle */}
        <div className="lg:hidden p-4 border-b border-gray-800 flex items-center gap-3 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-30">
           <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-gray-800 rounded text-gray-300 hover:text-white">
              <Menu size={20}/>
           </button>
           <h1 className="font-bold text-sm text-white">{STAGE_NAMES[state.stage]}</h1>
        </div>

        {/* Keep-Alive View Container */}
        <div className="flex-1 relative overflow-hidden flex flex-col">
            
            {/* Stage 1: Strategist */}
            <div className={`flex-1 flex flex-col h-full ${isVisible(Stage.Strategist) ? '' : 'hidden'}`}>
                {shouldRender(Stage.Strategist) && <Stage1Strategist key={state.project_id} />}
            </div>

            {/* Stage 2: Art Dept */}
            <div className={`flex-1 flex flex-col h-full ${isVisible(Stage.ArtDept) ? '' : 'hidden'}`}>
                {shouldRender(Stage.ArtDept) && <Stage2ArtDept key={state.project_id} />}
            </div>

            {/* Stage 3: Architect */}
            <div className={`flex-1 flex flex-col h-full ${isVisible(Stage.Architect) ? '' : 'hidden'}`}>
                {shouldRender(Stage.Architect) && <Stage3Architect key={state.project_id} />}
            </div>

            {/* Stage 4: Copywriter */}
            <div className={`flex-1 flex flex-col h-full ${isVisible(Stage.Copywriter) ? '' : 'hidden'}`}>
                {shouldRender(Stage.Copywriter) && <Stage4Copywriter key={state.project_id} />}
            </div>

            {/* Stage 5: Publisher */}
            <div className={`flex-1 flex flex-col h-full ${isVisible(Stage.Publisher) ? '' : 'hidden'}`}>
                {shouldRender(Stage.Publisher) && <Stage5Publisher key={state.project_id} />}
            </div>

        </div>
      </main>

      {/* Modals & Overlays */}
      <YoloOverlay 
         yolo={yolo} 
         slideCount={state.outline.length} 
         aiSettings={state.ai_settings} 
         isTutorial={isTutorial}
      />

      {showExitConfirm && (
         <ConfirmModal 
            title="Leave Tutorial?"
            message="This will disable mock mode and allow you to use your own API key. Your current progress will be saved as a draft."
            confirmLabel="Exit Tutorial"
            onConfirm={performExitTutorial}
            onCancel={() => setShowExitConfirm(false)}
         />
      )}
      
      {showWelcome && <WelcomeModal onClose={handleCloseWelcome} />}
      
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
};

export default AppShell;
