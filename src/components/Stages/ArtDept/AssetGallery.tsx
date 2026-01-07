
import React, { useState, useRef } from 'react';
import { Palette, AlertCircle, Loader2, Layers, Trash2, CheckCircle2, Heart, Eraser, RotateCw, RefreshCw, CheckCheck, Archive, Wand2, Sparkles, CopyPlus, Maximize2, Download, RotateCcw, Droplet, X, Upload, Image, Box, FileImage, Bot } from 'lucide-react';
import { Asset, AssetKind } from '../../../types';
import JSZip from 'jszip';
// @ts-ignore
import FileSaver from 'file-saver';
import ConfirmModal from '../../UI/ConfirmModal';
import { useRunDoc } from '../../../context/RunDocContext';

// Handle CDN export discrepancies for file-saver
const saveAs = (FileSaver && FileSaver.saveAs) ? FileSaver.saveAs : FileSaver;

// --- Sub-Components ---

interface AssetDetailModalProps {
   asset: Asset;
   onClose: () => void;
   onDownload: () => void;
   onRemoveBg: (asset: Asset, method: 'wand' | 'ai' | 'color-key' | 'both') => void;
   onRestore: (asset: Asset) => void;
   isProcessingBg: boolean;
}

const AssetDetailModal: React.FC<AssetDetailModalProps> = ({ asset, onClose, onDownload, onRemoveBg, onRestore, isProcessingBg }) => {
   return (
      <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in duration-200" onClick={onClose}>
         <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden max-w-5xl w-full max-h-[90vh] flex shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Image Side */}
            <div className="flex-1 bg-black/50 relative flex items-center justify-center p-8">
               <div className="absolute inset-0 z-0 opacity-20" style={{ backgroundImage: 'linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px' }}></div>
               <img src={asset.uri} alt="Full Detail" className="max-w-full max-h-full object-contain relative z-10 shadow-lg" />
            </div>
            
            {/* Info Side */}
            <div className="w-80 bg-gray-950 p-6 border-l border-gray-800 flex flex-col">
               <div className="flex justify-between items-start mb-6">
                  <h3 className="text-xl font-bold text-white font-mono">Asset Details</h3>
                  <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={24}/></button>
               </div>
               
               <div className="space-y-6 flex-1 overflow-y-auto">
                  <div>
                     <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Prompt</label>
                     <p className="text-sm text-gray-300 italic">"{asset.prompt}"</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Kind</label>
                        <span className="text-xs bg-gray-800 px-2 py-1 rounded text-purple-300 border border-purple-500/30 capitalize">{asset.kind}</span>
                     </div>
                     <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Type</label>
                        <span className="text-xs text-gray-400 font-mono">{asset.mime.split('/')[1].toUpperCase()} {asset.transparent ? '+ Alpha' : ''}</span>
                     </div>
                  </div>

                  <div>
                     <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Linked Slide</label>
                     <p className="text-sm text-gray-400 font-mono">{asset.linked_slide_id || 'N/A'}</p>
                  </div>
                  
                  {asset.tags && asset.tags.includes('reviewer_generated') && (
                     <div className="bg-purple-900/20 border border-purple-500/30 p-3 rounded text-xs text-purple-200 flex items-center gap-2">
                        <Bot size={16}/>
                        <span>Commissioned by AI Reviewer during final polish.</span>
                     </div>
                  )}
               </div>

               <div className="mt-6 pt-6 border-t border-gray-800 space-y-3">
                  {!asset.transparent && asset.status === 'completed' && (
                     <button
                        onClick={() => onRemoveBg(asset, 'ai')}
                        disabled={isProcessingBg}
                        className="w-full py-3 bg-gray-800 hover:bg-purple-900/30 text-purple-300 rounded font-bold flex items-center justify-center gap-2 transition-colors border border-gray-700"
                        title="Uses High Quality AI Removal"
                     >
                        {isProcessingBg ? <Loader2 className="animate-spin" size={18}/> : <Eraser size={18}/>}
                        Remove Background (AI)
                     </button>
                  )}
                  
                  {asset.original_uri && asset.original_uri !== asset.uri && (
                      <button
                        onClick={() => onRestore(asset)}
                        className="w-full py-3 bg-gray-800 hover:bg-yellow-900/30 text-yellow-500 rounded font-bold flex items-center justify-center gap-2 transition-colors border border-gray-700"
                      >
                         <RotateCcw size={18} /> Restore Original
                      </button>
                  )}
                  
                  <button 
                     onClick={onDownload}
                     className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                     <Download size={18} /> Save Image
                  </button>
               </div>
            </div>
         </div>
      </div>
   );
}

interface ImportClassificationModalProps {
   src: string;
   filename: string;
   onSelect: (kind: AssetKind) => void;
   onCancel: () => void;
}

const ImportClassificationModal: React.FC<ImportClassificationModalProps> = ({ src, filename, onSelect, onCancel }) => {
   return (
      <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
         <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-6">
            <div className="flex justify-between items-start">
               <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2"><Upload size={20} className="text-blue-400"/> Import Asset</h3>
                  <p className="text-sm text-gray-400 mt-1">Classify this image to add it to your library.</p>
               </div>
               <button onClick={onCancel} className="text-gray-500 hover:text-white"><X size={20}/></button>
            </div>

            <div className="flex items-center justify-center bg-gray-950 rounded-lg p-4 border border-gray-800 relative overflow-hidden h-48">
               <div className="absolute inset-0 z-0 opacity-20" style={{ backgroundImage: 'linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)', backgroundSize: '16px 16px', backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px' }}></div>
               <img src={src} alt="Preview" className="h-full object-contain relative z-10 shadow-lg"/>
            </div>
            
            <div className="space-y-3">
               <label className="text-xs font-bold text-gray-500 uppercase block">Select Type</label>
               
               <button 
                  onClick={() => onSelect(AssetKind.Background)}
                  className="w-full text-left p-4 rounded-lg bg-gray-800 hover:bg-gray-750 border border-transparent hover:border-blue-500/50 transition-all group flex items-center gap-4"
               >
                  <div className="bg-blue-900/30 p-2 rounded text-blue-400"><Image size={24}/></div>
                  <div>
                     <span className="font-bold text-white block">Background</span>
                     <span className="text-xs text-gray-400">Full slide coverage. Placed behind text.</span>
                  </div>
               </button>

               <button 
                  onClick={() => onSelect(AssetKind.Stamp)}
                  className="w-full text-left p-4 rounded-lg bg-gray-800 hover:bg-gray-750 border border-transparent hover:border-amber-500/50 transition-all group flex items-center gap-4"
               >
                  <div className="bg-amber-900/30 p-2 rounded text-amber-400"><Box size={24}/></div>
                  <div>
                     <span className="font-bold text-white block">Stamp / Element</span>
                     <span className="text-xs text-gray-400">Isolated object. Placed in grid zones.</span>
                  </div>
               </button>

               <button 
                  onClick={() => onSelect(AssetKind.Texture)}
                  className="w-full text-left p-4 rounded-lg bg-gray-800 hover:bg-gray-750 border border-transparent hover:border-purple-500/50 transition-all group flex items-center gap-4"
               >
                  <div className="bg-purple-900/30 p-2 rounded text-purple-400"><FileImage size={24}/></div>
                  <div>
                     <span className="font-bold text-white block">Texture</span>
                     <span className="text-xs text-gray-400">Subtle pattern or overlay.</span>
                  </div>
               </button>
            </div>
         </div>
      </div>
   );
};

interface RemovalMethodModalProps {
   onSelect: (method: 'wand' | 'ai' | 'color-key' | 'both') => void;
   onCancel: () => void;
}

const RemovalMethodModal: React.FC<RemovalMethodModalProps> = ({ onSelect, onCancel }) => {
   return (
      <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-200">
         <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-lg font-bold text-white flex items-center gap-2"><Eraser size={20} className="text-blue-400"/> Background Removal</h3>
               <button onClick={onCancel} className="text-gray-500 hover:text-white"><X size={20}/></button>
            </div>
            
            <div className="space-y-3">
               <button 
                  onClick={() => onSelect('wand')}
                  className="w-full text-left p-4 rounded-lg bg-gray-800 hover:bg-gray-700 border border-transparent hover:border-blue-500/50 transition-all group"
               >
                  <div className="flex items-center justify-between mb-1">
                     <span className="font-bold text-white flex items-center gap-2"><Wand2 size={16}/> Wand (Infill)</span>
                     <span className="text-[10px] bg-gray-900 px-2 py-0.5 rounded text-gray-400 uppercase">Edge Based</span>
                  </div>
                  <p className="text-xs text-gray-400 group-hover:text-gray-300">Starts at borders and floods inward. Good for solid contiguous backgrounds.</p>
               </button>

               <button 
                  onClick={() => onSelect('color-key')}
                  className="w-full text-left p-4 rounded-lg bg-gray-800 hover:bg-gray-700 border border-transparent hover:border-yellow-500/50 transition-all group"
               >
                  <div className="flex items-center justify-between mb-1">
                     <span className="font-bold text-white flex items-center gap-2"><Droplet size={16} className="text-yellow-400"/> Color Key</span>
                     <span className="text-[10px] bg-gray-900 px-2 py-0.5 rounded text-gray-400 uppercase">Global Replace</span>
                  </div>
                  <p className="text-xs text-gray-400 group-hover:text-gray-300">Samples corners and removes that color everywhere. Good for green-screen style removal.</p>
               </button>

               <button 
                  onClick={() => onSelect('ai')}
                  className="w-full text-left p-4 rounded-lg bg-gray-800 hover:bg-gray-700 border border-transparent hover:border-purple-500/50 transition-all group"
               >
                  <div className="flex items-center justify-between mb-1">
                     <span className="font-bold text-white flex items-center gap-2"><Sparkles size={16} className="text-purple-400"/> AI Remover</span>
                     <span className="text-[10px] bg-purple-900/30 px-2 py-0.5 rounded text-purple-300 uppercase">Best Quality</span>
                  </div>
                  <p className="text-xs text-gray-400 group-hover:text-gray-300">Uses neural networks to detect subject. Best for complex objects.</p>
               </button>

               <button 
                  onClick={() => onSelect('both')}
                  className="w-full text-left p-4 rounded-lg bg-gray-800 hover:bg-gray-700 border border-transparent hover:border-green-500/50 transition-all group"
               >
                  <div className="flex items-center justify-between mb-1">
                     <span className="font-bold text-white flex items-center gap-2"><CopyPlus size={16} className="text-green-400"/> Compare (Wand vs AI)</span>
                     <span className="text-[10px] bg-gray-900 px-2 py-0.5 rounded text-gray-400 uppercase">Safe</span>
                  </div>
                  <p className="text-xs text-gray-400 group-hover:text-gray-300">Creates a duplicate asset so you can try both methods.</p>
               </button>
            </div>
         </div>
      </div>
   );
};

interface Props {
  assets: Asset[];
  processingBg: Record<string, boolean>;
  onDelete: (id: string) => void;
  onToggleKeep: (id: string) => void;
  onKeepAll: () => void;
  onRemoveBg: (asset: Asset, method: 'wand' | 'ai' | 'color-key' | 'both') => void;
  onRestore: (asset: Asset) => void;
  onReroll: (asset: Asset) => void;
  onImport: (asset: Asset) => void;
}

const AssetGallery: React.FC<Props> = ({
  assets,
  processingBg,
  onDelete,
  onToggleKeep,
  onKeepAll,
  onRemoveBg,
  onRestore,
  onReroll,
  onImport
}) => {
   const { addNotification } = useRunDoc();
   const [zoomedAsset, setZoomedAsset] = useState<Asset | null>(null);
   const [isZipping, setIsZipping] = useState(false);
   const fileInputRef = useRef<HTMLInputElement>(null);
   
   // Import State
   const [pendingImport, setPendingImport] = useState<{ uri: string; name: string, mime: string } | null>(null);

   // Confirmation State
   const [confirmAction, setConfirmAction] = useState<{
      type: 'delete' | 'regenerate';
      asset: Asset;
   } | null>(null);

   // Removal Selection State
   const [removalTarget, setRemovalTarget] = useState<Asset | null>(null);

   const handleDownloadImage = (asset: Asset) => {
      const link = document.createElement("a");
      link.href = asset.uri;
      const ext = asset.mime === 'image/jpeg' ? 'jpg' : 'png';
      link.download = `asc_${asset.kind}_${asset.id.slice(-6)}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
   };

   const handleDownloadAllZip = async () => {
      if (assets.length === 0) return;
      setIsZipping(true);
      try {
         const zip = new JSZip();
         const folder = zip.folder("asc_assets");
         
         if (!folder) throw new Error("Could not create zip folder");

         assets.forEach(asset => {
            if (asset.status !== 'completed' || !asset.uri) return;
            const base64Data = asset.uri.split(',')[1];
            if (base64Data) {
               const ext = asset.mime === 'image/jpeg' ? 'jpg' : 'png';
               const filename = `${asset.kind}_${asset.id.slice(-6)}.${ext}`;
               folder.file(filename, base64Data, { base64: true });
            }
         });

         const content = await zip.generateAsync({ type: "blob" });
         saveAs(content, "asc_assets_library.zip");

      } catch (e) {
         console.error("Zip failed", e);
         addNotification("Failed to create zip archive.", 'error');
      } finally {
         setIsZipping(false);
      }
   };

   const handleConfirm = () => {
      if (!confirmAction) return;
      if (confirmAction.type === 'delete') {
         onDelete(confirmAction.asset.id);
      } else if (confirmAction.type === 'regenerate') {
         onReroll(confirmAction.asset);
      }
      setConfirmAction(null);
   };
   
   const handleMethodSelection = (method: 'wand' | 'ai' | 'color-key' | 'both') => {
      if (removalTarget) {
         onRemoveBg(removalTarget, method);
         setRemovalTarget(null);
      }
   };

   // Import Handlers
   const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
         const file = e.target.files[0];
         if (!file.type.startsWith('image/')) {
            addNotification('Please select a valid image file.', 'warning');
            return;
         }

         const reader = new FileReader();
         reader.onload = (event) => {
            if (event.target?.result) {
               setPendingImport({
                  uri: event.target.result as string,
                  name: file.name,
                  mime: file.type
               });
            }
         };
         reader.readAsDataURL(file);
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
   };

   const handleFinalizeImport = (kind: AssetKind) => {
      if (!pendingImport) return;
      
      const newAsset: Asset = {
         id: `asset_import_${Date.now()}`,
         kind: kind,
         mime: pendingImport.mime as any,
         uri: pendingImport.uri,
         original_uri: pendingImport.uri,
         transparent: false,
         keep: true, // Imported assets are kept by default
         status: 'completed',
         prompt: `Imported: ${pendingImport.name}`,
         linked_slide_id: undefined, // Or 'kit_content' if we wanted a default
         tags: ['imported', kind]
      };

      onImport(newAsset);
      setPendingImport(null);
   };

  return (
    <div className="flex-1 flex flex-col bg-gray-950 relative">
       
       <input 
         type="file" 
         ref={fileInputRef} 
         onChange={handleFileSelect} 
         className="hidden" 
         accept="image/png, image/jpeg, image/webp" 
       />

       {/* Import Classification Modal */}
       {pendingImport && (
          <ImportClassificationModal 
             src={pendingImport.uri}
             filename={pendingImport.name}
             onSelect={handleFinalizeImport}
             onCancel={() => setPendingImport(null)}
          />
       )}

       {/* Zoom Modal */}
       {zoomedAsset && (
          <AssetDetailModal 
            asset={zoomedAsset} 
            onClose={() => setZoomedAsset(null)} 
            onDownload={() => handleDownloadImage(zoomedAsset)}
            onRemoveBg={onRemoveBg}
            onRestore={onRestore}
            isProcessingBg={!!processingBg[zoomedAsset.id]}
          />
       )}

       {/* Confirmation Modal */}
       {confirmAction && (
          <ConfirmModal 
             title={confirmAction.type === 'delete' ? 'Delete Asset?' : 'Regenerate Asset?'}
             message={confirmAction.type === 'delete' 
                ? "This action cannot be undone. The asset will be permanently removed from your library." 
                : "This will discard the current image and generate a new one based on the same prompt. The current version will be lost."}
             confirmLabel={confirmAction.type === 'delete' ? 'Delete' : 'Regenerate'}
             isDestructive={true}
             onConfirm={handleConfirm}
             onCancel={() => setConfirmAction(null)}
          />
       )}

       {/* Background Removal Method Modal */}
       {removalTarget && (
          <RemovalMethodModal 
             onSelect={handleMethodSelection}
             onCancel={() => setRemovalTarget(null)}
          />
       )}

       <div className="p-4 border-b border-gray-800 flex items-center justify-between text-gray-400 font-mono text-sm font-bold uppercase tracking-wider">
          <div className="flex items-center gap-2"><Palette size={16} /> Asset Library ({assets.length})</div>
          <div className="flex items-center gap-2 text-xs">
             <span className="flex items-center gap-1 mr-2"><span className="w-2 h-2 rounded-full bg-green-500"></span> Kept: {assets.filter(a => a.keep).length}</span>
             
             <button 
               onClick={() => fileInputRef.current?.click()}
               className="flex items-center gap-1 bg-gray-800 hover:bg-blue-600 hover:text-white text-gray-300 px-3 py-1.5 rounded transition-colors mr-2"
               title="Import Image"
             >
                <Upload size={14} /> Import Image
             </button>

             {assets.length > 0 && (
                <button 
                  onClick={handleDownloadAllZip}
                  disabled={isZipping}
                  className="flex items-center gap-1 bg-gray-800 hover:bg-blue-900/30 text-gray-300 hover:text-blue-400 px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                  title="Download all assets as ZIP"
                >
                   {isZipping ? <Loader2 size={14} className="animate-spin"/> : <Archive size={14} />} 
                   Export Library
                </button>
             )}

             {assets.length > 0 && assets.some(a => !a.keep) && (
                <button 
                  onClick={onKeepAll}
                  className="flex items-center gap-1 bg-gray-800 hover:bg-green-900/30 text-gray-300 hover:text-green-400 px-3 py-1.5 rounded transition-colors"
                >
                   <CheckCheck size={14} /> Keep All
                </button>
             )}
          </div>
       </div>

       <div className="flex-1 overflow-y-auto p-6">
          {assets.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
               {assets.map((asset) => (
                  <div key={asset.id} className={`relative aspect-square rounded-lg border-2 group overflow-hidden transition-all ${asset.keep ? 'border-green-500/50 shadow-lg shadow-green-900/10' : 'border-gray-800 bg-gray-900'}`}>
                     
                     {/* Bg Pattern for Transparent Assets */}
                     {asset.transparent && (
                        <div className="absolute inset-0 z-0 opacity-20" style={{ backgroundImage: 'linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px' }}></div>
                     )}

                     {/* Image / State */}
                     <div className="relative z-10 w-full h-full cursor-pointer" onClick={() => setZoomedAsset(asset)}>
                        {asset.status === 'completed' ? (
                            <img src={asset.uri} alt="Generated asset" className="w-full h-full object-cover" />
                        ) : asset.status === 'failed' ? (
                            <div className="w-full h-full flex flex-col items-center justify-center text-red-400">
                            <AlertCircle size={24} className="mb-2"/>
                            <span className="text-xs">Generation Failed</span>
                            </div>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-purple-400">
                            <Loader2 size={24} className="mb-2 animate-spin"/>
                            <span className="text-xs animate-pulse">Forging...</span>
                            </div>
                        )}
                     </div>
                     
                     {/* Reviewer Badge */}
                     {asset.tags && asset.tags.includes('reviewer_generated') && (
                        <div className="absolute top-2 left-2 z-20 bg-purple-600 text-white p-1 rounded-full shadow-lg" title="Created by Reviewer">
                           <Bot size={12} />
                        </div>
                     )}

                     {/* Overlay Controls */}
                     <div className="absolute inset-0 z-20 bg-gray-950/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 pointer-events-none">
                        <div className="flex justify-between items-start pointer-events-auto pl-6"> 
                           {/* Padding added for the badge space */}
                           <div className="flex gap-1">
                              <span className="text-[10px] font-mono bg-black/50 px-1.5 py-0.5 rounded text-white">{asset.kind}</span>
                              {asset.transparent && <span className="text-[10px] font-mono bg-blue-900/80 text-blue-200 px-1.5 py-0.5 rounded flex items-center gap-1"><Layers size={8}/> PNG</span>}
                           </div>
                           <div className="flex gap-1">
                              <button onClick={() => setZoomedAsset(asset)} className="text-gray-400 hover:text-blue-400 p-1 bg-gray-900/50 rounded" title="View Details"><Maximize2 size={14}/></button>
                              <button onClick={() => setConfirmAction({ type: 'delete', asset })} className="text-gray-400 hover:text-red-400 p-1 bg-gray-900/50 rounded" title="Delete"><Trash2 size={14}/></button>
                           </div>
                        </div>
                        
                        <div className="text-center px-2">
                          {asset.status === 'completed' && (
                            <p className="text-[10px] text-gray-400 line-clamp-2 mb-2">{asset.prompt}</p>
                          )}
                        </div>

                        <div className="flex justify-center gap-2 pointer-events-auto pb-1">
                           {asset.status === 'completed' && (
                              <>
                                <button 
                                  onClick={() => onToggleKeep(asset.id)}
                                  className={`p-2 rounded-full transition-colors ${asset.keep ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                  title={asset.keep ? "Discard" : "Keep Asset"}
                                >
                                  {asset.keep ? <CheckCircle2 size={16} /> : <Heart size={16} />}
                                </button>

                                <button 
                                  onClick={() => setRemovalTarget(asset)}
                                  disabled={asset.transparent || !!processingBg[asset.id]}
                                  className={`p-2 rounded-full transition-colors ${
                                     asset.transparent 
                                     ? 'bg-blue-600 text-white cursor-default' 
                                     : processingBg[asset.id]
                                       ? 'bg-blue-900 text-blue-300 cursor-wait'
                                       : 'bg-gray-700 text-gray-300 hover:bg-blue-600 hover:text-white'
                                  }`}
                                  title="Remove Background"
                                >
                                  {processingBg[asset.id] ? <Loader2 size={16} className="animate-spin" /> : <Eraser size={16} />}
                                </button>
                                
                                {asset.original_uri && asset.original_uri !== asset.uri && (
                                   <button 
                                      onClick={() => onRestore(asset)}
                                      className="p-2 rounded-full bg-gray-700 text-yellow-500 hover:bg-gray-600 hover:text-yellow-400"
                                      title="Restore Original"
                                   >
                                      <RotateCcw size={16} />
                                   </button>
                                )}

                                <button 
                                  onClick={() => setConfirmAction({ type: 'regenerate', asset })}
                                  className="p-2 rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white"
                                  title="Reroll (Regenerate)"
                                >
                                  <RotateCw size={16} />
                                </button>
                              </>
                           )}
                           {asset.status === 'failed' && (
                              <button onClick={() => setConfirmAction({ type: 'regenerate', asset })} className="p-2 rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600"><RefreshCw size={16} /></button>
                           )}
                        </div>
                     </div>
                  </div>
               ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
               <Palette size={48} className="mb-4" />
               <p>No assets generated yet.</p>
            </div>
          )}
       </div>
    </div>
  );
};

export default AssetGallery;
