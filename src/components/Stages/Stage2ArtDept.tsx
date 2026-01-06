import React, { useState } from 'react';
import { useRunDoc } from '../../context/RunDocContext';
import { Stage, StageStatus, Asset, ImageConcept } from '../../types';
import { generateImageConcepts, generateAssetImage } from '../../services/geminiService';
import { removeBackgroundMagicWand, removeBackgroundAI, removeBackgroundColorKey, compressImage } from '../../services/imageProcessingService';
import { ArrowRight, Unlock, GraduationCap } from 'lucide-react';
import ConfirmModal from '../UI/ConfirmModal';

// Sub-components
import ConceptBrief from './ArtDept/ConceptBrief';
import AssetGallery from './ArtDept/AssetGallery';

const Stage2ArtDept: React.FC = () => {
  const { state, dispatch } = useRunDoc();
  const [isGeneratingConcepts, setIsGeneratingConcepts] = useState(false);
  const [concepts, setConcepts] = useState<ImageConcept[]>([]);
  const [, setGeneratingAssets] = useState<Record<string, boolean>>({});
  const [processingBg, setProcessingBg] = useState<Record<string, boolean>>({});

  const [confirmState, setConfirmState] = useState<{
      type: 'bulk_regenerate' | 'restore';
      asset?: Asset;
  } | null>(null);

  const isApproved = state.stage_status[Stage.ArtDept] === StageStatus.Approved;

  const getTextModel = () => state.ai_settings?.mockMode ? 'mock-gemini' : state.ai_settings?.textModel;
  const getImageModel = () => state.ai_settings?.mockMode ? 'mock-gemini' : state.ai_settings?.imageModel;

  const handleGenerateConcepts = async () => {
    setIsGeneratingConcepts(true);
    try {
      const result = await generateImageConcepts(state.outline, state.branding, getTextModel());
      setConcepts(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingConcepts(false);
    }
  };

  const handleGenerateAsset = async (concept: ImageConcept) => {
    const newAssetId = `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newAsset: Asset = {
      id: newAssetId,
      kind: concept.kind,
      mime: 'image/png',
      uri: '',
      transparent: false,
      keep: false,
      status: 'pending',
      prompt: concept.visual_prompt,
      linked_slide_id: concept.slide_id,
      tags: [concept.kind]
    };

    dispatch({ type: 'ADD_ASSETS', payload: [newAsset] });
    setGeneratingAssets(prev => ({ ...prev, [newAssetId]: true }));
    
    try {
       dispatch({ type: 'UPDATE_ASSET', payload: { id: newAssetId, status: 'generating' } });
       const base64Image = await generateAssetImage(concept.visual_prompt, concept.kind, getImageModel());
       
       // Optimization: Compress immediately to WebP (0.8 quality) to save RAM and IDB space
       const compressedUri = await compressImage(base64Image, 0.8, 'image/webp');

       dispatch({ 
         type: 'UPDATE_ASSET', 
         payload: { 
            id: newAssetId, 
            status: 'completed', 
            uri: compressedUri,
            original_uri: compressedUri,
            mime: 'image/webp' as any // Updating mime to match compression
         } 
       });
    } catch (e) {
       console.error(e);
       dispatch({ type: 'UPDATE_ASSET', payload: { id: newAssetId, status: 'failed' } });
    } finally {
       setGeneratingAssets(prev => {
         const next = { ...prev };
         delete next[newAssetId];
         return next;
       });
    }
  };

  const handleGenerateAll = async () => {
    for (const concept of concepts) {
       await handleGenerateAsset(concept);
    }
  };

  const handleRemoveBackground = async (asset: Asset, method: 'wand' | 'ai' | 'color-key' | 'both') => {
    if (processingBg[asset.id] || asset.transparent) return;

    const processSingle = async (targetId: string, uri: string, procMethod: 'wand' | 'ai' | 'color-key') => {
        setProcessingBg(prev => ({ ...prev, [targetId]: true }));
        try {
            let newUri = uri;
            if (procMethod === 'ai') {
                newUri = await removeBackgroundAI(uri);
            } else if (procMethod === 'color-key') {
                newUri = await removeBackgroundColorKey(uri);
            } else {
                newUri = await removeBackgroundMagicWand(uri);
            }

            dispatch({
                type: 'UPDATE_ASSET',
                payload: {
                    id: targetId,
                    uri: newUri,
                    transparent: true,
                    mime: 'image/png' // Removed BG usually implies PNG
                }
            });
        } catch (e) {
            console.error(`${procMethod} bg removal failed`, e);
        } finally {
            setProcessingBg(prev => {
                const next = { ...prev };
                delete next[targetId];
                return next;
            });
        }
    };

    if (method === 'both') {
        const cloneId = `${asset.id}_ai`;
        const cloneAsset: Asset = {
            ...asset,
            id: cloneId,
            tags: [...(asset.tags || []), 'ai-cutout'],
            transparent: false
        };
        dispatch({ type: 'ADD_ASSETS', payload: [cloneAsset] });

        await processSingle(asset.id, asset.uri, 'wand');
        await processSingle(cloneId, cloneAsset.uri, 'ai');

    } else {
        await processSingle(asset.id, asset.uri, method);
    }
  };
  
  const requestRestore = (asset: Asset) => {
      if (!asset.original_uri) return;
      setConfirmState({ type: 'restore', asset });
  };

  const performRestore = () => {
      if (confirmState?.type !== 'restore' || !confirmState.asset?.original_uri) return;
      const asset = confirmState.asset;
      dispatch({
          type: 'UPDATE_ASSET',
          payload: {
              id: asset.id,
              uri: asset.original_uri,
              transparent: false,
          }
      });
      setConfirmState(null);
  }

  const requestBulkRegenerate = () => {
    setConfirmState({ type: 'bulk_regenerate' });
  };

  const performBulkRegenerate = async () => {
    setConfirmState(null);
    dispatch({ type: 'PRUNE_UNKEPT_ASSETS' });

    setIsGeneratingConcepts(true);
    try {
      const keptSlideIds = new Set(state.asset_library.filter(a => a.keep && a.linked_slide_id).map(a => a.linked_slide_id));
      const slidesNeedingAssets = state.outline.filter(slide => !keptSlideIds.has(slide.slide_id));

      if (slidesNeedingAssets.length === 0) {
        return;
      }

      const newConcepts = await generateImageConcepts(slidesNeedingAssets, state.branding, getTextModel());
      setConcepts(newConcepts);
      
      for (const c of newConcepts) {
         await handleGenerateAsset(c);
      }

    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingConcepts(false);
    }
  };

  const handleReroll = async (asset: Asset) => {
    if (!asset.prompt) return;
    dispatch({ type: 'UPDATE_ASSET', payload: { id: asset.id, status: 'generating' } });
    setGeneratingAssets(prev => ({ ...prev, [asset.id]: true }));

    try {
      const base64Image = await generateAssetImage(asset.prompt, asset.kind, getImageModel());
      // Compress Reroll too
      const compressedUri = await compressImage(base64Image, 0.8, 'image/webp');

      dispatch({ 
         type: 'UPDATE_ASSET', 
         payload: { 
             id: asset.id, 
             status: 'completed', 
             uri: compressedUri,
             original_uri: compressedUri,
             mime: 'image/webp' as any
         } 
       });
    } catch (e) {
       console.error(e);
       dispatch({ type: 'UPDATE_ASSET', payload: { id: asset.id, status: 'failed' } });
    } finally {
      setGeneratingAssets(prev => {
        const next = { ...prev };
        delete next[asset.id];
        return next;
      });
    }
  };

  const handleImportAsset = async (asset: Asset) => {
     // Optimize imports too
     const compressedUri = await compressImage(asset.uri, 0.8, 'image/webp');
     const optimizedAsset = { ...asset, uri: compressedUri, original_uri: compressedUri, mime: 'image/webp' as any };
     dispatch({ type: 'ADD_ASSETS', payload: [optimizedAsset] });
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-200 relative">
      
      {/* Modals */}
      {confirmState?.type === 'restore' && (
         <ConfirmModal 
            title="Restore Original?"
            message="This will discard any background removal or edits and revert to the original generated image."
            confirmLabel="Restore"
            isDestructive
            onConfirm={performRestore}
            onCancel={() => setConfirmState(null)}
         />
      )}

      {confirmState?.type === 'bulk_regenerate' && (
         <ConfirmModal 
             title="Regenerate Unkept Assets?"
             message="This will permanently delete all assets you haven't marked as 'Kept' and generate new ones for missing slides. Continue?"
             confirmLabel="Regenerate"
             isDestructive
             onConfirm={performBulkRegenerate}
             onCancel={() => setConfirmState(null)}
         />
      )}

      {/* Header */}
      <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div>
          <h2 className="text-2xl font-bold font-mono text-white flex items-center gap-2">
            <span className="text-purple-500">02</span> Art Dept
          </h2>
          <p className="text-sm text-gray-400 mt-1">Generate, curate, and refine visual assets.</p>
        </div>
        
        <div className="flex items-center gap-4">
          {isApproved ? (
            <div className="flex items-center gap-2">
              <div className="px-4 py-2 bg-gray-900 border border-green-900/50 text-green-400 rounded-full text-xs font-mono font-bold flex items-center gap-2">
                <span>LOCKED & APPROVED</span>
              </div>
              <button 
                onClick={() => dispatch({ type: 'UNLOCK_STAGE', payload: Stage.ArtDept })}
                className="p-2 text-gray-500 hover:text-white transition-colors"
                title="Unlock Stage"
              >
                <Unlock size={16} />
              </button>
            </div>
          ) : (
             <button
               onClick={() => dispatch({ type: 'APPROVE_STAGE', payload: Stage.ArtDept })}
               disabled={state.asset_library.filter(a => a.keep).length === 0}
               className={`px-6 py-2.5 rounded font-bold transition-all flex items-center gap-2 shadow-lg ${
                 state.asset_library.filter(a => a.keep).length === 0
                 ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                 : 'bg-green-600 hover:bg-green-500 text-white hover:shadow-green-900/20'
               }`}
             >
               Approve Assets <ArrowRight size={16} />
             </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        <ConceptBrief 
          concepts={concepts}
          isGeneratingConcepts={isGeneratingConcepts}
          isApproved={isApproved}
          assetLibrary={state.asset_library}
          onGenerateConcepts={handleGenerateConcepts}
          onGenerateAsset={handleGenerateAsset}
          onGenerateAll={handleGenerateAll}
          onBulkRegenerate={requestBulkRegenerate}
        />

        <AssetGallery 
          assets={state.asset_library}
          processingBg={processingBg}
          onDelete={(id) => dispatch({ type: 'DELETE_ASSET', payload: id })}
          onToggleKeep={(id) => dispatch({ type: 'TOGGLE_ASSET_KEEP', payload: id })}
          onKeepAll={() => dispatch({ type: 'KEEP_ALL_ASSETS' })}
          onRemoveBg={handleRemoveBackground}
          onRestore={requestRestore}
          onReroll={handleReroll}
          onImport={handleImportAsset}
        />
      </div>
    </div>
  );
};

export default Stage2ArtDept;