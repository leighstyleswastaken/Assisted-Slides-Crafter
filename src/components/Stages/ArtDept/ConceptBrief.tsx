
import React from 'react';
import { Wand2, Loader2, RefreshCw, Sparkles, Box, LayoutTemplate } from 'lucide-react';
import { Asset, ImageConcept, Branding } from '../../../types';
import { useRunDoc } from '../../../context/RunDocContext';

interface Props {
  concepts: ImageConcept[];
  isGeneratingConcepts: boolean;
  isApproved: boolean;
  assetLibrary: Asset[];
  onGenerateConcepts: () => void;
  onGenerateAsset: (concept: ImageConcept) => void;
  onGenerateAll: () => void;
  onBulkRegenerate: () => void;
}

const ConceptBrief: React.FC<Props> = ({
  concepts,
  isGeneratingConcepts,
  isApproved,
  assetLibrary,
  onGenerateConcepts,
  onGenerateAsset,
  onGenerateAll,
  onBulkRegenerate
}) => {
  const { state } = useRunDoc();
  const visualTokens = [...(state.branding.keywords || []), ...(state.branding.visual_features || [])];

  const getConceptBadge = (slideId: string) => {
    if (slideId === 'kit_content') {
       return <span className="flex items-center gap-1 text-[10px] bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30"><LayoutTemplate size={10}/> CONTENT BG</span>;
    }
    if (slideId === 'kit_deco') {
       return <span className="flex items-center gap-1 text-[10px] bg-amber-900/50 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30"><Box size={10}/> DECO KIT</span>;
    }
    return <span className="text-[10px] bg-gray-800 px-1.5 py-0.5 rounded text-gray-400 font-mono">{slideId}</span>;
  };

  return (
    <div className="w-full md:w-1/4 border-r border-gray-800 flex flex-col bg-gray-900/30">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between text-purple-400 font-mono text-sm font-bold uppercase tracking-wider">
        <div className="flex items-center gap-2"><Wand2 size={16} /> The Brief</div>
        {!isApproved && (
          <button 
            onClick={onGenerateConcepts}
            disabled={isGeneratingConcepts}
            className="text-xs bg-purple-900/30 hover:bg-purple-800/50 text-purple-300 px-2 py-1 rounded transition-colors disabled:opacity-50"
          >
            {isGeneratingConcepts ? <Loader2 className="animate-spin" size={14}/> : 'Suggest'}
          </button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
         
         {/* Visual Tokens Chip Cloud */}
         {visualTokens.length > 0 && (
           <div className="bg-gray-900/50 p-3 rounded border border-gray-800">
              <h4 className="text-[10px] text-gray-500 uppercase font-bold mb-2 flex items-center gap-1"><Sparkles size={10}/> Visual Tokens</h4>
              <div className="flex flex-wrap gap-1.5">
                 {visualTokens.map((t, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-gray-800 text-gray-400 text-[10px] rounded border border-gray-700 select-none cursor-help" title="Used for AI Context">{t}</span>
                 ))}
              </div>
           </div>
         )}

        {!isApproved && (
           <div className="space-y-2 mb-4 pb-4 border-b border-gray-800">
              <button 
                onClick={onGenerateAll}
                disabled={concepts.length === 0}
                className="w-full py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white text-xs font-bold rounded transition-colors flex items-center justify-center gap-2"
              >
                Generate From List
              </button>
              {assetLibrary.length > 0 && (
                <button 
                  onClick={onBulkRegenerate}
                  className="w-full py-2 bg-purple-900/20 hover:bg-purple-900/40 text-purple-300 text-xs font-bold rounded transition-colors flex items-center justify-center gap-2 border border-purple-900/30"
                  title="Discard unkept assets and regenerate with current branding"
                >
                   <RefreshCw size={12} /> Regenerate Unkept
                </button>
              )}
           </div>
        )}
        
        {concepts.length > 0 ? (
          <>
             {concepts.map((concept, i) => (
                <div key={i} className="p-3 bg-gray-900 border border-gray-800 rounded group hover:border-purple-500/50 transition-colors">
                   <div className="flex justify-between items-start mb-2">
                      {getConceptBadge(concept.slide_id)}
                      <span className="text-[10px] text-gray-500 uppercase">{concept.kind}</span>
                   </div>
                   <p className="text-xs text-gray-300 mb-2 line-clamp-3">{concept.visual_prompt}</p>
                   {!isApproved && (
                     <button 
                       onClick={() => onGenerateAsset(concept)}
                       className="w-full py-1.5 bg-gray-800 hover:bg-purple-900/30 text-purple-400 text-[10px] font-bold rounded flex items-center justify-center gap-1"
                     >
                       <Wand2 size={10} /> Generate
                     </button>
                   )}
                </div>
             ))}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-gray-600 text-center">
             <p className="text-xs">No concepts loaded.<br/>Click "Suggest" to begin.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConceptBrief;
