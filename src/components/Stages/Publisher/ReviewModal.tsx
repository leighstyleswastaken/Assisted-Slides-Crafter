
import React from 'react';
import { Sparkles, CheckSquare, Square, Wand2, Loader2 } from 'lucide-react';
import { Action, Asset } from '../../../types';
import { ReviewSuggestion } from '../../../services/reviewerService';

interface SelectableSuggestion {
  data: ReviewSuggestion;
  selected: boolean;
}

interface Props {
  suggestions: SelectableSuggestion[];
  assets: Asset[]; // Needed for image previews
  isApplying: boolean;
  onToggle: (index: number) => void;
  onApply: () => void;
  onDiscard: () => void;
}

const ReviewModal: React.FC<Props> = ({ 
  suggestions, 
  assets, 
  isApplying, 
  onToggle, 
  onApply, 
  onDiscard 
}) => {

  // --- Helper Functions (Refactored for Safety) ---

  const getActionContext = (action: Action | any) => {
    // 1. Safety Check: Ensure payload exists
    if (!action || !action.payload) return 'Unknown Action';

    const { slideId } = action.payload;
    // We don't have access to slide index here easily without passing full state, 
    // so we'll use the ID or a generic label.
    const slideLabel = slideId ? `Slide ${slideId}` : 'Global';

    if (action.type === 'UPDATE_TEXT_CONTENT') {
       const field = action.payload.field || 'Text';
       return `${slideLabel} • ${field.replace(/_/g, ' ').toUpperCase()}`;
    }
    if (action.type === 'UPDATE_ZONE') {
       const zone = action.payload.zoneId || 'Zone';
       return `${slideLabel} • ${zone.toUpperCase()}`;
    }
    if (action.type === 'REQUEST_NEW_ASSET') {
       const kind = action.payload.kind || 'Asset';
       return `${slideLabel} • NEW ${kind.toUpperCase()}`;
    }
    if (action.type === 'UPDATE_TEXT_ALIGNMENT') {
       return `${slideLabel} • ALIGNMENT`;
    }
    return slideLabel;
  };

  const renderActionPreview = (action: Action | any) => {
    if (!action || !action.payload) return null;

    if (action.type === 'UPDATE_TEXT_CONTENT') {
       return (
          <div className="mt-2 text-[10px] font-mono bg-gray-950 p-2 rounded border border-gray-800 text-green-400 break-words leading-relaxed">
             "{action.payload.value || ''}"
          </div>
       );
    }
    if (action.type === 'UPDATE_ZONE') {
        const assetId = action.payload.assetId;
        if (!assetId) return <div className="mt-2 text-[10px] text-red-400">Invalid Asset ID</div>;

        const asset = assets.find(a => a.id === assetId);
        return (
          <div className="mt-2 flex items-center gap-2 text-[10px] font-mono bg-gray-950 p-2 rounded border border-gray-800 text-blue-300">
             {asset && <img src={asset.uri} className="w-6 h-6 rounded object-cover" alt="Preview"/>}
             <span>Asset: {assetId.slice ? assetId.slice(-6) : assetId}</span>
          </div>
        )
    }
    if (action.type === 'REQUEST_NEW_ASSET') {
       const prompt = action.payload.visualPrompt || 'No prompt provided';
       const target = action.payload.zoneId || 'Auto';
       return (
          <div className="mt-2 flex flex-col gap-2 bg-gray-950 p-2 rounded border border-purple-500/30">
             <div className="flex items-center gap-2 text-purple-300 text-[10px] font-bold uppercase">
                <Wand2 size={12}/> Generating New Image
             </div>
             <p className="text-[10px] text-gray-400 italic">"{prompt}"</p>
             <div className="text-[9px] text-gray-600 font-mono">Target: {target.toUpperCase()}</div>
          </div>
       );
    }
    if (action.type === 'UPDATE_TEXT_ALIGNMENT') {
       const field = action.payload.field || 'Field';
       const align = action.payload.alignment || 'Unknown';
       return (
          <div className="mt-2 text-[10px] font-mono bg-gray-950 p-2 rounded border border-gray-800 text-yellow-400">
             Set {field} to {align.toUpperCase()}
          </div>
       );
    }
    return null;
  };

  const selectedCount = suggestions.filter(s => s.selected).length;

  return (
     <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-gray-900 border border-purple-500/50 rounded-xl p-6 max-w-lg w-full shadow-2xl transform scale-100 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
           <div className="flex items-center gap-3 mb-4 text-white border-b border-gray-800 pb-4">
              <Sparkles className="text-purple-400" size={24}/>
              <div>
                 <h3 className="text-lg font-bold">Creative Director Review</h3>
                 <p className="text-xs text-gray-400">Review and select polish items to apply.</p>
              </div>
           </div>
           
           <div className="space-y-3 mb-6 max-h-[60vh] overflow-y-auto pr-2">
              {suggestions.map((item, i) => (
                 <div 
                    key={i} 
                    onClick={() => onToggle(i)}
                    className={`flex gap-3 p-3 rounded border cursor-pointer transition-all duration-200 group ${
                       item.selected 
                       ? 'bg-gray-900 border-purple-500/40 shadow-inner' 
                       : 'bg-gray-950 border-gray-800 opacity-60 hover:opacity-80 hover:border-gray-700'
                    }`}
                 >
                    <div className={`pt-1 transition-colors ${item.selected ? 'text-purple-400' : 'text-gray-600'}`}>
                       {item.selected ? <CheckSquare size={18} /> : <Square size={18} />}
                    </div>
                    <div className="flex-1">
                       <div className="flex justify-between items-start">
                          <span className={`text-xs font-bold font-mono mb-1 ${item.selected ? 'text-blue-400' : 'text-gray-600'}`}>
                             {getActionContext(item.data.action)}
                          </span>
                          <span className={`text-[9px] px-1.5 rounded uppercase font-bold tracking-wider ${item.selected ? 'bg-purple-900/30 text-purple-300' : 'bg-gray-800 text-gray-600'}`}>
                             {(item.data.action.type || 'UNKNOWN').replace('UPDATE_', '').replace('REQUEST_', '').replace(/_/g, ' ')}
                          </span>
                       </div>
                       <p className={`text-sm leading-relaxed ${item.selected ? 'text-gray-200' : 'text-gray-500'}`}>
                          {item.data.description}
                       </p>
                       {/* Render Change Preview */}
                       {item.selected && renderActionPreview(item.data.action)}
                    </div>
                 </div>
              ))}
           </div>

           <div className="flex justify-between items-center pt-4 border-t border-gray-800">
              <button onClick={onDiscard} disabled={isApplying} className="px-4 py-2 text-gray-400 hover:text-white text-sm font-medium transition-colors disabled:opacity-50">Discard All</button>
              <button 
                 onClick={onApply}
                 disabled={selectedCount === 0 || isApplying}
                 className="px-6 py-2 rounded text-white text-sm font-bold shadow-lg transition-all bg-purple-600 hover:bg-purple-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:shadow-none flex items-center gap-2"
              >
                 {isApplying ? <Loader2 className="animate-spin" size={14}/> : <Sparkles size={14}/>} 
                 {isApplying ? 'Applying...' : selectedCount === 0 ? 'Select Fixes' : `Apply ${selectedCount} Fixes`}
              </button>
           </div>
        </div>
     </div>
  );
};

export default ReviewModal;
