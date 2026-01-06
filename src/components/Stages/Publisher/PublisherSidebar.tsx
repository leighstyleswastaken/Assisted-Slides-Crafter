
import React, { useState } from 'react';
import { Printer, AlertTriangle, ExternalLink, Sparkles, Download, Loader2, Type } from 'lucide-react';
import { RunDoc } from '../../../types';
import { downloadFontPack } from '../../../services/fontService';

interface Props {
  state: RunDoc;
  isDraft: boolean;
  isApproved: boolean;
  polish: { noise: boolean; vignette: boolean };
  setPolish: React.Dispatch<React.SetStateAction<{ noise: boolean; vignette: boolean }>>;
}

const PublisherSidebar: React.FC<Props> = ({ state, isDraft, isApproved, polish, setPolish }) => {
  const [isZippingFonts, setIsZippingFonts] = useState(false);

  const handleDownloadFonts = async () => {
     setIsZippingFonts(true);
     try {
        await downloadFontPack(state.branding.fonts, state.project_id);
     } catch (e) {
        console.error(e);
        alert("Failed to download fonts.");
     } finally {
        setIsZippingFonts(false);
     }
  };

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="bg-gray-900 border border-gray-800 rounded p-4">
        <h3 className="text-sm font-bold text-gray-400 uppercase mb-3 flex items-center gap-2"><Printer size={16} /> Deck Stats</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Slides</span><span className="text-white font-mono">{state.slides.length}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Assets</span><span className="text-white font-mono">{state.asset_library.filter(a => a.keep).length}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Status</span><span className={`font-mono ${isDraft ? 'text-yellow-500' : 'text-green-400'}`}>{isDraft ? 'DRAFT' : 'FINAL'}</span></div>
        </div>
      </div>

      <div className="bg-amber-900/10 border border-amber-500/30 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
           <h3 className="text-[10px] font-bold text-amber-500 uppercase flex items-center gap-2"><AlertTriangle size={14} /> Font Parity</h3>
        </div>
        <p className="text-[11px] text-amber-200/70 leading-relaxed mb-3">
          PowerPoint requires fonts to be installed on your computer. Download the Font Pack to ensure text looks correct.
        </p>
        
        <button 
           onClick={handleDownloadFonts}
           disabled={isZippingFonts}
           className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold flex items-center justify-center gap-2 mb-4 shadow-lg transition-colors disabled:opacity-50"
        >
           {isZippingFonts ? <Loader2 size={14} className="animate-spin"/> : <Download size={14} />} 
           Download Font Pack
        </button>

        <div className="space-y-1">
          {state.branding.fonts.map(f => (
            <div key={f} className="flex items-center justify-between bg-gray-950 px-2 py-1.5 rounded border border-gray-800">
              <span className="text-[10px] font-bold text-white font-mono flex items-center gap-2">
                 <Type size={10} className="text-gray-500"/> {f}
              </span>
              <a href={`https://fonts.google.com/specimen/${f.replace(/\s+/g, '+')}`} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-white transition-colors" title="View on Google Fonts">
                <ExternalLink size={10} />
              </a>
            </div>
          ))}
        </div>
      </div>

      <div className={`bg-gray-900 border border-gray-800 rounded p-4 ${isApproved ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
        <h3 className="text-sm font-bold text-gray-400 uppercase mb-3 flex items-center gap-2"><Sparkles size={16} /> Final Polish</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer group">
            <span className="text-sm text-gray-300 group-hover:text-white">Film Grain</span>
            <input 
              type="checkbox" 
              className="w-5 h-5 rounded accent-red-600 cursor-pointer" 
              checked={polish.noise} 
              onChange={() => setPolish(p => ({...p, noise: !p.noise}))} 
              disabled={isApproved}
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer group">
            <span className="text-sm text-gray-300 group-hover:text-white">Vignette</span>
            <input 
              type="checkbox" 
              className="w-5 h-5 rounded accent-red-600 cursor-pointer" 
              checked={polish.vignette} 
              onChange={() => setPolish(p => ({...p, vignette: !p.vignette}))} 
              disabled={isApproved}
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default PublisherSidebar;
