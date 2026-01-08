
import React from 'react';
import { Stage, StageStatus } from '../../types';
import { GraduationCap, LogOut } from 'lucide-react';

interface Props {
  state: any;
  onExit: () => void;
}

export const TutorialCoach: React.FC<Props> = ({ state, onExit }) => {
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
