
import React, { useState, useEffect } from 'react';
import { useRunDoc } from '../../context/RunDocContext';
import { Stage, StageStatus, AppNotification } from '../../types';
import { STAGE_NAMES } from '../../constants';
import StatusBadge from '../UI/StatusBadge';
import Stage1Strategist from '../Stages/Stage1Strategist';
import Stage2ArtDept from '../Stages/Stage2ArtDept';
import Stage3Architect from '../Stages/Stage3Architect';
import Stage4Copywriter from '../Stages/Stage4Copywriter';
import Stage5Publisher from '../Stages/Stage5Publisher';
import { Hammer, Brain, Palette, Layout, PenTool, Printer, Terminal, Settings, Rocket, Pause, Play, Square, X, Save, Activity, Undo2, Redo2, Zap, CloudOff, Info, AlertTriangle, CheckCircle, AlertCircle, GraduationCap, LogOut, Menu } from 'lucide-react';
import ProgressTracker from '../DevTools/ProgressTracker';
import UsageLogger from '../DevTools/UsageLogger';
import WelcomeModal from '../UI/WelcomeModal';
import SettingsModal from '../UI/SettingsModal';
import ConfirmModal from '../UI/ConfirmModal';
import { loadGoogleFonts } from '../../utils/fontUtils';
import { getTotalTokens } from '../../services/usageService';

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

const TutorialCoach: React.FC<{ state: any; onExit: () => void }> = ({ state, onExit }) => {
   const stage = state.stage;
   const status = state.stage_status[stage];
   
   let instruction = "";
   let action = "";

   if (stage === Stage.Strategist) {
      if (state.revisions.branding === 0) {
         instruction = "01. Define Brand";
         action = "Press the Sparkles (Star icon) on the Brand Identity panel.";
      } else if (state.revisions.outline === 0) {
         instruction = "02. Generate Outline";
         action = "Press the 'Generate' button on the Outline panel.";
      } else {
         instruction = "03. Lock Strategist";
         action = "Press 'Approve Stage' to unlock the Art Dept.";
      }
   } else if (stage === Stage.ArtDept) {
      const hasAssets = state.asset_library.length > 0;
      const allKept = hasAssets && state.asset_library.some((a: any) => a.keep);

      if (state.asset_library.length === 0) {
         instruction = "04. Imagine Visuals";
         action = "Press 'Suggest' then 'Generate From List' in the left panel.";
      } else if (!allKept) {
         instruction = "05. Curate Assets";
         action = "Mark your favorite images by pressing 'Keep' (Heart/Check), then click 'Keep All'.";
      } else {
         instruction = "06. Lock Art Dept";
         action = "Click 'Approve Assets' to move to composition.";
      }
   } else if (stage === Stage.Architect) {
      const hasBg = state.slides.some((s: any) => s.variants[0].zones.background?.asset_id);
      if (!hasBg) {
         instruction = "07. Design Layout";
         action = "Drag a background from the right 'Library' and drop it on the slide canvas.";
      } else {
         instruction = "08. Sync Style";
         action = "Click 'Apply to All Slides', then click 'Approve Layouts'.";
      }
   } else if (stage === Stage.Copywriter) {
      const hasContent = state.slides.some((s: any) => s.variants[0].text_content.headline !== "New Slide");
      if (!hasContent) {
         instruction = "09. Write Copy";
         action = "Click the pink 'Simulate All Copy' button in the top header.";
      } else {
         instruction = "10. Lock Copy";
         action = "Review your messaging and click 'Approve Copy'.";
      }
   } else if (stage === Stage.Publisher) {
      if (status !== StageStatus.Approved) {
         instruction = "11. Final Polish";
         action = "Turn on 'Vignette' in the right panel, then press 'Finalise Project'.";
      } else {
         instruction = "12. Mission Complete";
         action = "Congratulations! You've mastered the ASC workflow. Use 'PDF' to export.";
      }
   }

   if (!instruction) return null;

   return (
      <div className="fixed bottom-24 right-6 z-[100] w-80 animate-in slide-in-from-right-8 duration-500">
         <div className="bg-indigo-600 border border-indigo-400 rounded-2xl shadow-2xl p-5 text-white ring-4 ring-indigo-900/30">
            <div className="flex items-center justify-between mb-3">
               <div className="flex items-center gap-2">
                  <div className="bg-white/20 p-1.5 rounded-lg"><GraduationCap size={20}/></div>
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Guided Learning Path</span>
               </div>
               <button 
                  onClick={onExit}
                  className="text-indigo-200 hover:text-white transition-colors"
                  title="Exit Tutorial"
               >
                  <LogOut size={16} />
               </button>
            </div>
            <h4 className="font-bold text-xl leading-tight mb-2">{instruction}</h4>
            <div className="bg-indigo-700/60 p-3 rounded-xl border border-indigo-500/30 text-xs font-medium leading-relaxed">
               {action}
            </div>
            <div className="mt-3 flex gap-1 h-1">
               {[1,2,3,4,5].map(s => (
                  <div key={s} className={`flex-1 rounded-full ${stage >= s ? 'bg-white' : 'bg-white/20'}`}></div>
               ))}
            </div>
         </div>
      </div>
   );
};

const AppShell: React.FC = () => {
  const { state, canNavigateTo, dispatch, yolo, notifications, removeNotification } = useRunDoc();
  
  // View State
  const [showDevTools, setShowDevTools] = useState(false);
  const [showUsage, setShowUsage] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Quota Monitoring
  const [tokenCount, setTokenCount] = useState({ input: 0, output: 0 });

  const isTutorial = state.project_id === 'tutorial_mode';

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
      // Change ID to stop tutorial mode logic (but keep content)
      dispatch({ type: 'UPDATE_PROJECT_ID', payload: `my_draft_${Date.now()}` });
      setShowExitConfirm(false);
  };

  const renderActiveView = () => {
    switch (state.stage) {
      case Stage.Strategist: return <Stage1Strategist key={state.project_id} />;
      case Stage.ArtDept: return <Stage2ArtDept key={state.project_id} />;
      case Stage.Architect: return <Stage3Architect key={state.project_id} />;
      case Stage.Copywriter: return <Stage4Copywriter key={state.project_id} />;
      case Stage.Publisher: return <Stage5Publisher key={state.project_id} />;
      default: return <div>Unknown Stage</div>;
    }
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
  
  const lastSavedTime = state.last_modified 
    ? new Date(state.last_modified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
    : 'Never';

  // Calculate quota status
  const totalTokens = tokenCount.input + tokenCount.output;
  const quotaPercentage = Math.min(100, (totalTokens / 50000) * 100); 
  const quotaColor = quotaPercentage > 80 ? 'bg-red-500' : 'bg-green-500';

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
           <button 
             onClick={() => setShowUsage(true)}
             className="flex items-center gap-2 text-xs text-gray-500 hover:text-blue-400 w-full p-2 rounded hover:bg-gray-800 transition-colors"
           >
             <Activity size={14} />
             <span>Usage Monitor</span>
           </button>
           <button 
             onClick={() => setShowDevTools(!showDevTools)}
             className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 w-full p-2 rounded hover:bg-gray-800 transition-colors"
           >
             <Terminal size={14} />
             <span>Dev Tools</span>
           </button>
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

        <div className="flex-1 relative overflow-hidden flex flex-col">
            {renderActiveView()}
        </div>
        
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur border border-gray-800 rounded-full px-4 py-2 text-[10px] font-mono text-gray-400 pointer-events-none select-none z-50 no-print flex items-center gap-3 shadow-2xl ring-1 ring-white/5 hidden md:flex">
           <span className="flex items-center gap-1"><span className="text-gray-600">PROJ:</span> <span className="text-white">{state.project_id}</span></span>
           <span className="w-px h-3 bg-gray-700"></span>
           <span className="flex items-center gap-1"><span className="text-gray-600">REV:</span> <span className="text-blue-400">{state.revisions.source}.{state.revisions.branding}.{state.revisions.outline}</span></span>
           <span className="w-px h-3 bg-gray-700"></span>
           <span className="flex items-center gap-1 text-green-400"><Save size={10}/> <span className="text-gray-400">Autosaved:</span> {lastSavedTime}</span>
           {isTutorial ? (
              <>
                 <span className="w-px h-3 bg-gray-700"></span>
                 <span className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/20 border border-blue-500/50 text-blue-400 rounded-full animate-pulse">
                    <GraduationCap size={10}/> TUTORIAL ACTIVE
                 </span>
              </>
           ) : state.ai_settings?.mockMode && (
              <>
                 <span className="w-px h-3 bg-gray-700"></span>
                 <span className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/20 border border-amber-500/50 text-amber-400 rounded-full animate-pulse">
                    <CloudOff size={10}/> OFFLINE MOCK
                 </span>
              </>
           )}
        </div>
      </main>

      {/* Modals & Overlays */}
      {yolo.isActive && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300 p-4">
           <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl max-w-md w-full flex flex-col items-center text-center relative overflow-hidden">
              
              {(state.ai_settings?.mockMode || isTutorial) && (
                 <div className="absolute -right-12 top-6 bg-blue-500 text-black text-[10px] font-black uppercase tracking-widest px-12 py-1 rotate-45 shadow-xl border-b border-black/20">
                    {isTutorial ? 'Tutorial' : 'Simulation'}
                 </div>
              )}

              {!yolo.isRunning && yolo.status !== 'Mission Complete' && yolo.status !== 'Aborted' && !yolo.status.startsWith('Error') ? (
                 <>
                    <button onClick={yolo.close} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={24}/></button>
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-purple-900/40">
                       <Rocket size={40} className="text-white ml-1" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">Autopilot Ready</h2>
                    <p className="text-gray-400 text-sm mb-8 px-4">
                       Assisted Slides Crafter will now take control to generate assets, compose layouts, and write copy for <strong>{state.outline.length} slides</strong>.
                    </p>
                    <button 
                       onClick={yolo.start}
                       className="px-8 py-3 bg-white text-black hover:bg-gray-200 rounded-full font-bold flex items-center gap-2 transition-transform active:scale-95 w-full justify-center"
                    >
                       <Play size={20} fill="currentColor"/> { (state.ai_settings?.mockMode || isTutorial) ? 'Run Tutorial Pipeline' : 'Start Generation'}
                    </button>
                 </>
              ) : !yolo.isRunning ? (
                 <>
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-6">
                       {yolo.status === 'Mission Complete' ? <Rocket size={32} className="text-green-500" /> : <Square size={32} className="text-red-500" />}
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">{yolo.status === 'Mission Complete' ? 'Done!' : 'Stopped'}</h2>
                    <p className="text-gray-400 text-sm mb-8 px-4">
                       {yolo.status === 'Mission Complete' ? "The pipeline has finished. You can now review and polish your deck." : "The autopilot was stopped."}
                    </p>
                    <button 
                       onClick={yolo.close}
                       className="px-8 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-full font-bold"
                    >
                       Close
                    </button>
                 </>
              ) : (
                 <>
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-6 relative">
                       <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full"></div>
                       <div className="absolute inset-0 border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                       <Brain size={32} className="text-purple-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">{(state.ai_settings?.mockMode || isTutorial) ? 'Simulating...' : 'Generating...'}</h2>
                    <div className="bg-gray-800 rounded-lg p-4 w-full mb-8 font-mono text-xs text-purple-300 border border-gray-700 min-h-[60px] flex items-center justify-center">
                       {yolo.status}
                    </div>

                    <div className="flex gap-4">
                       {yolo.isPaused ? (
                          <button 
                             onClick={yolo.resume}
                             className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded font-bold flex items-center gap-2"
                          >
                             <Play size={16} fill="currentColor"/> Resume
                          </button>
                       ) : (
                          <button 
                             onClick={yolo.pause}
                             className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded font-bold flex items-center gap-2"
                          >
                             <Pause size={16} fill="currentColor"/> Pause
                          </button>
                       )}
                       <button 
                          onClick={yolo.stop}
                          className="px-6 py-2 bg-gray-800 hover:bg-red-900/50 text-gray-300 hover:text-red-400 rounded font-bold flex items-center gap-2"
                       >
                          <Square size={16} fill="currentColor"/> Stop
                       </button>
                    </div>
                 </>
              )}
           </div>
        </div>
      )}

      {showExitConfirm && (
         <ConfirmModal 
            title="Leave Tutorial?"
            message="This will disable mock mode and allow you to use your own API key. Your current progress will be saved as a draft."
            confirmLabel="Exit Tutorial"
            onConfirm={performExitTutorial}
            onCancel={() => setShowExitConfirm(false)}
         />
      )}

      {showDevTools && <ProgressTracker onClose={() => setShowDevTools(false)} />}
      
      {showUsage && <UsageLogger onClose={() => setShowUsage(false)} />}
      
      {showWelcome && <WelcomeModal onClose={handleCloseWelcome} />}
      
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
};

export default AppShell;
