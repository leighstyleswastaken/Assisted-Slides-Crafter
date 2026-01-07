
import React, { useRef, useState, useCallback } from 'react';
import { useRunDoc } from '../../context/RunDocContext';
import { validateRunDoc } from '../../services/validationService';
import { saveProject, clearProject } from '../../services/persistenceService';
import { TEMPLATES } from '../../templates';
import { X, Save, Upload, Sliders, FileJson, Trash2, Loader2, AlertTriangle, CheckCircle, Tag, PlusSquare, LayoutTemplate, ToggleLeft, ToggleRight, Sparkles, RefreshCw, Archive, Package } from 'lucide-react';
import JSZip from 'jszip';
// @ts-ignore
import FileSaver from 'file-saver';
import ConfirmModal from './ConfirmModal';

// Handle CDN export discrepancies for file-saver
const saveAs = (FileSaver && FileSaver.saveAs) ? FileSaver.saveAs : FileSaver;

interface Props {
  onClose: () => void;
}

const SettingsModal: React.FC<Props> = ({ onClose }) => {
  const { state, dispatch, addNotification } = useRunDoc();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'general' | 'templates' | 'data'>('general');
  
  // Project ID Editing State
  const [projectId, setProjectId] = useState(state.project_id);
  const [idError, setIdError] = useState<string | null>(null);

  // Import State
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [loadSuccess, setLoadSuccess] = useState(false);

  // Export State
  const [isZipping, setIsZipping] = useState(false);

  // Reset/Template State
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showFactoryResetConfirm, setShowFactoryResetConfirm] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<any | null>(null);

  const handleExport = () => {
    // CRITICAL: Strip history stacks to prevent massive file bloat
    const { undoStack, redoStack, history, ...cleanState } = state;
    
    // We optionally allow keeping the event history log (metadata), but drop the full state stacks
    const exportData = {
        ...cleanState,
        // Reset history stacks on export for the file
        undoStack: [],
        redoStack: [],
        history: { events: history.events.slice(-50) } // Keep last 50 meta-events only
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `asc_project_${state.project_id}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleExportArchive = async () => {
    setIsZipping(true);
    try {
        const zip = new JSZip();
        
        // 1. Prepare State Copy (Strip ephemeral stacks)
        const { undoStack, redoStack, ...fullState } = state;
        
        // 2. Separate Change Log
        const changeLog = fullState.history;
        
        // 3. Prepare Project Data (Without History, will process assets next)
        const projectData = { ...fullState, history: { events: [] } };
        
        // 4. Process Assets (Extract base64 to files)
        const assetsFolder = zip.folder("assets");
        const leanAssets = projectData.asset_library.map(asset => {
            // Only extract if it's a data URI (base64)
            if (asset.uri && asset.uri.startsWith('data:image')) {
                const parts = asset.uri.split(',');
                const meta = parts[0]; // e.g., data:image/png;base64
                const data = parts[1];
                
                // Determine extension
                let ext = 'png';
                if (meta.includes('jpeg')) ext = 'jpg';
                else if (meta.includes('webp')) ext = 'webp';
                
                const filename = `${asset.id}.${ext}`;
                if (assetsFolder && data) {
                    assetsFolder.file(filename, data, { base64: true });
                }
                
                // Return asset with relative path reference instead of heavy base64
                return {
                    ...asset,
                    uri: `assets/${filename}`,
                    original_uri: asset.original_uri && asset.original_uri.startsWith('data:image') 
                        ? `assets/${asset.id}_original.${ext}` // Note: We aren't saving original separately to save space/time for now unless needed
                        : asset.original_uri
                };
            }
            return asset;
        });
        
        // Update the project data with the lean assets
        projectData.asset_library = leanAssets;

        // 5. Add files to Zip
        zip.file("project_data.json", JSON.stringify(projectData, null, 2));
        zip.file("change_log.json", JSON.stringify(changeLog, null, 2));
        zip.file("README.txt", "Assisted Slides Crafter Project Archive\n\n- project_data.json: Core project state with lightweight asset references.\n- change_log.json: Full history of AI interactions and edits.\n- assets/: Folder containing all image files.");
        
        // 6. Generate and Save
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `asc_project_${state.project_id}_archive.zip`);
        
    } catch (e) {
        console.error("Archive export failed", e);
        addNotification("Failed to create archive. See console for details.", 'error');
    } finally {
        setIsZipping(false);
    }
  };

  // --- Project ID Handler ---
  const handleProjectIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.length > 30) return;
    
    // Windows filename regex check (no \ / : * ? " < > |)
    if (/[\\/:*?"<>|]/.test(val)) {
        setIdError("Contains invalid characters for filenames");
    } else {
        setIdError(null);
    }
    setProjectId(val);
  };

  const saveProjectId = () => {
    if (idError) return;
    if (!projectId.trim()) {
        setIdError("Cannot be empty");
        return;
    }
    dispatch({ type: 'UPDATE_PROJECT_ID', payload: projectId.trim() });
  };

  // --- Drag & Drop Handlers ---
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
       validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
     setImportError(null);
     setLoadSuccess(false);
     if (file.type === "application/json" || file.name.endsWith(".json")) {
        setSelectedFile(file);
     } else {
        setImportError("Invalid file type. Please upload a .json file.");
     }
  };

  const handleLoadProject = () => {
    if (!selectedFile) return;
    setIsParsing(true);
    setImportError(null);

    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const jsonContent = event.target?.result as string;
        if (!jsonContent) throw new Error("File is empty");
        
        const json = JSON.parse(jsonContent);
        
        // 1. Validate Schema
        const { valid, errors } = validateRunDoc(json);
        
        if (!valid) {
          setImportError(`Structure invalid: ${errors[0]}`);
          setIsParsing(false);
          return;
        }

        // Proceed directly
        try {
            await saveProject(json);
            dispatch({ type: 'REHYDRATE', payload: json });
            setLoadSuccess(true);
            setImportError(null);
            
            setTimeout(() => {
               onClose();
            }, 800);

        } catch (saveErr) {
            console.error("Failed to persist loaded project", saveErr);
            setImportError("Failed to save project to storage.");
            setIsParsing(false);
        }
        
      } catch (err) {
        setImportError("Failed to parse JSON. File might be corrupted.");
        setIsParsing(false);
      }
    };
    
    reader.onerror = (e) => {
        setImportError("Error reading file.");
        setIsParsing(false);
    };

    reader.readAsText(selectedFile);
  };

  const handleCreateNew = () => {
     const hasWork = state.revisions.source > 0 || state.outline.length > 0 || state.asset_library.length > 0;
     
     if (hasWork && !showResetConfirm) {
        setShowResetConfirm(true);
        return;
     }

     dispatch({ type: 'RESET_PROJECT' });
     setShowResetConfirm(false);
     onClose();
  };

  const handleFactoryReset = async () => {
     await clearProject();
     localStorage.clear();
     window.location.reload();
  };
  
  const handleLoadTemplate = (template: any) => {
     const hasWork = state.revisions.source > 0 || state.outline.length > 0 || state.asset_library.length > 0;
     if (hasWork) {
        setPendingTemplate(template);
     } else {
        dispatch({ type: 'REHYDRATE', payload: template.data });
        onClose();
     }
  };

  const confirmTemplateLoad = () => {
     if (pendingTemplate) {
        dispatch({ type: 'REHYDRATE', payload: pendingTemplate.data });
        setPendingTemplate(null);
        onClose();
     }
  };

  const formatFileSize = (bytes: number) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const updateAiSetting = (key: 'textModel' | 'imageModel' | 'mockMode', val: any) => {
    dispatch({ type: 'UPDATE_AI_SETTINGS', payload: { [key]: val } });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      
      {/* Template Confirmation Modal Layer */}
      {pendingTemplate && (
         <ConfirmModal 
            title="Overwrite Workspace?"
            message="Loading this template will discard your current project. Are you sure you want to proceed?"
            confirmLabel="Load Template"
            isDestructive
            onConfirm={confirmTemplateLoad}
            onCancel={() => setPendingTemplate(null)}
         />
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900">
           <h2 className="text-white font-bold flex items-center gap-2"><Sliders size={18}/> Settings</h2>
           <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20}/></button>
        </div>
        
        <div className="flex border-b border-gray-800 bg-gray-900/50">
           <button onClick={() => setActiveTab('general')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'general' ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800/50' : 'text-gray-500 hover:text-white'}`}>General & AI</button>
           <button onClick={() => setActiveTab('templates')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'templates' ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800/50' : 'text-gray-500 hover:text-white'}`}>Templates</button>
           <button onClick={() => setActiveTab('data')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'data' ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800/50' : 'text-gray-500 hover:text-white'}`}>Data</button>
        </div>

        <div className="p-6 space-y-8 overflow-y-auto flex-1">
           
           {activeTab === 'general' && (
             <div className="space-y-6">
                {/* Project Identity */}
                <div className="space-y-4 pb-4 border-b border-gray-800">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2"><Tag size={14} /> Project Identity</h3>
                    <div className="space-y-1">
                        <label className="text-sm text-gray-300 block">Project ID (Filename)</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={projectId}
                                onChange={handleProjectIdChange}
                                className={`flex-1 bg-gray-800 border ${idError ? 'border-red-500' : 'border-gray-700'} rounded p-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono`}
                                placeholder="my_project_v1"
                            />
                            <button 
                                onClick={saveProjectId}
                                disabled={!!idError || projectId === state.project_id}
                                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded font-bold text-xs shadow-lg transition-colors"
                            >
                                Rename
                            </button>
                        </div>
                        {idError ? (
                            <p className="text-xs text-red-400">{idError}</p>
                        ) : (
                            <p className="text-[10px] text-gray-500">Max 30 chars. No special characters.</p>
                        )}
                    </div>
                </div>

                {/* AI Models */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">AI Models</h3>
                       
                       {/* Mock Mode Toggle */}
                       <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-400 font-bold uppercase">Mock Mode</label>
                          <button 
                             onClick={() => updateAiSetting('mockMode', !state.ai_settings?.mockMode)}
                             className={`text-2xl transition-colors ${state.ai_settings?.mockMode ? 'text-green-400' : 'text-gray-600'}`}
                          >
                             {state.ai_settings?.mockMode ? <ToggleRight size={28}/> : <ToggleLeft size={28}/>}
                          </button>
                       </div>
                    </div>
                    
                    <div className="space-y-1">
                        <label className="text-sm text-gray-300 block">Text & Logic Model</label>
                        <select 
                        value={state.ai_settings?.textModel || 'gemini-3-flash-preview'} 
                        onChange={(e) => updateAiSetting('textModel', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        disabled={state.ai_settings?.mockMode}
                        >
                            <option value="gemini-3-flash-preview">Gemini 3 Flash (Fast & Recommended)</option>
                            <option value="gemini-3-pro-preview">Gemini 3 Pro (Complex Reasoning)</option>
                            <option value="gemini-flash-latest">Gemini Flash (Latest)</option>
                            <option value="gemini-flash-lite-latest">Gemini Flash Lite (Fastest)</option>
                            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                        </select>
                        <p className="text-[10px] text-gray-500">Controls Branding, Outline, Copy, and Layout Strategy.</p>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm text-gray-300 block">Image Generation Model</label>
                        <select 
                        value={state.ai_settings?.imageModel || 'gemini-2.5-flash-image'} 
                        onChange={(e) => updateAiSetting('imageModel', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        disabled={state.ai_settings?.mockMode}
                        >
                            <option value="gemini-2.5-flash-image">Gemini 2.5 Flash Image (Fast & Efficient)</option>
                            <option value="gemini-3-pro-image-preview">Gemini 3 Pro Image (High Quality)</option>
                        </select>
                        <p className="text-[10px] text-gray-500">Controls Asset Generation in Art Dept.</p>
                    </div>
                    
                    {state.ai_settings?.mockMode && (
                       <div className="p-3 bg-green-900/20 border border-green-500/30 rounded text-green-300 text-xs flex items-center gap-2">
                          <Sparkles size={14}/>
                          <span>Mock Mode Active. API calls will be simulated with fake data. Zero quota usage.</span>
                       </div>
                    )}
                </div>
             </div>
           )}
           
           {activeTab === 'templates' && (
              <div className="grid grid-cols-2 gap-4">
                 {TEMPLATES.map((t, i) => (
                    <button 
                       key={i} 
                       onClick={() => handleLoadTemplate(t)}
                       className="flex flex-col bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-blue-500/50 rounded-lg p-4 text-left transition-all group"
                    >
                       <div className="mb-3 p-3 bg-gray-900 rounded border border-gray-800 group-hover:border-gray-700 flex items-center justify-center">
                          <LayoutTemplate size={32} className="text-gray-600 group-hover:text-blue-400 transition-colors"/>
                       </div>
                       <h4 className="text-sm font-bold text-white mb-1">{t.name}</h4>
                       <p className="text-xs text-gray-400 mb-3">{t.description}</p>
                       <div className="mt-auto flex flex-wrap gap-1">
                          {t.tags.map((tag, j) => (
                             <span key={j} className="text-[10px] bg-gray-900 text-gray-500 px-2 py-0.5 rounded border border-gray-800">{tag}</span>
                          ))}
                       </div>
                    </button>
                 ))}
              </div>
           )}

           {activeTab === 'data' && (
             <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Project Data</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button 
                        onClick={handleExport}
                        className="flex flex-col items-center justify-center p-6 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-blue-500/50 rounded-xl transition-all group text-left"
                    >
                        <FileJson size={32} className="text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
                        <span className="font-bold text-white text-sm">Export JSON</span>
                        <span className="text-xs text-gray-500 mt-1">Single file. Best for backups.</span>
                    </button>

                    <button 
                        onClick={handleExportArchive}
                        disabled={isZipping}
                        className="flex flex-col items-center justify-center p-6 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-green-500/50 rounded-xl transition-all group text-left disabled:opacity-50"
                    >
                        {isZipping ? <Loader2 size={32} className="animate-spin text-green-400 mb-3"/> : <Package size={32} className="text-green-400 mb-3 group-hover:scale-110 transition-transform" />}
                        <span className="font-bold text-white text-sm">Export Archive (Zip)</span>
                        <span className="text-xs text-gray-500 mt-1 text-center">Separates Images, Text, & Logs.<br/>Best for developer analysis.</span>
                    </button>
                </div>

                <div className="space-y-4 border-t border-gray-800 pt-6">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Import Project</h3>
                    {/* Upload Area */}
                    {!selectedFile ? (
                        <div 
                        onDragEnter={handleDrag} 
                        onDragLeave={handleDrag} 
                        onDragOver={handleDrag} 
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors cursor-pointer group min-h-[120px] ${
                            dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 hover:border-gray-500 hover:bg-gray-800/50'
                        }`}
                        >
                        <div className="bg-gray-800 p-3 rounded-full mb-3 group-hover:scale-110 transition-transform">
                            <Upload size={24} className="text-gray-400 group-hover:text-white" />
                        </div>
                        <p className="text-sm text-gray-300 font-medium mb-1">Click to browse or drag file here</p>
                        <p className="text-xs text-gray-500">Supports .json project files (Max 50MB)</p>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileSelect} 
                            className="hidden" 
                            accept=".json"
                        />
                        </div>
                    ) : (
                        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                        <div className="flex items-start gap-4">
                            <div className="bg-blue-900/30 p-3 rounded-lg text-blue-400">
                                <FileJson size={24} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-white truncate">{selectedFile.name}</h4>
                                <p className="text-xs text-gray-400">{formatFileSize(selectedFile.size)}</p>
                                
                                {importError && (
                                    <div className="mt-2 flex items-start gap-2 text-red-400 text-xs bg-red-900/20 p-2 rounded">
                                    <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                                    <span>{importError}</span>
                                    </div>
                                )}
                            </div>
                            <button 
                                onClick={() => { setSelectedFile(null); setImportError(null); setLoadSuccess(false); }}
                                className="text-gray-500 hover:text-red-400 transition-colors p-1"
                                disabled={isParsing}
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>

                        <div className="mt-4 flex flex-col gap-3">
                            {!loadSuccess ? (
                                <>
                                    <div className="bg-yellow-900/20 text-yellow-400 text-xs p-2 rounded border border-yellow-900/30 flex items-start gap-2">
                                    <AlertTriangle size={14} className="shrink-0 mt-0.5"/>
                                    <p>Warning: Loading this project will immediately overwrite your current workspace. Unsaved changes will be lost.</p>
                                    </div>
                                    <button 
                                    onClick={handleLoadProject}
                                    disabled={isParsing || !!importError}
                                    className="w-full bg-red-700 hover:bg-red-600 disabled:bg-gray-700 disabled:text-gray-500 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-lg"
                                    >
                                    {isParsing ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle size={16}/>}
                                    {isParsing ? 'Verifying & Loading...' : 'Load & Overwrite Workspace'}
                                    </button>
                                </>
                            ) : (
                                <div className="w-full bg-green-600/20 border border-green-500/30 text-green-400 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 animate-in fade-in">
                                    <CheckCircle size={18}/>
                                    <span>Loaded Successfully!</span>
                                </div>
                            )}
                        </div>
                        </div>
                    )}

                    {/* Reset Controls */}
                    <div className="pt-6 border-t border-gray-800 space-y-4">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2"><PlusSquare size={14}/> Reset Options</h3>
                        
                        {!showResetConfirm ? (
                        <button 
                            onClick={handleCreateNew}
                            className="w-full border border-dashed border-gray-600 hover:border-gray-400 text-gray-400 hover:text-white py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                        >
                            <PlusSquare size={16} /> Create New Space (Clear Workspace)
                        </button>
                        ) : (
                        <div className="bg-red-900/10 border border-red-900/30 rounded-lg p-4 animate-in fade-in">
                            <h4 className="text-red-400 font-bold text-sm flex items-center gap-2 mb-2"><AlertTriangle size={16}/> Unsaved Changes</h4>
                            <p className="text-gray-400 text-xs mb-4">Creating a new space will wipe your current project. Make sure you have exported your work if you want to keep it.</p>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setShowResetConfirm(false)}
                                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded font-bold text-xs"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleCreateNew}
                                    className="flex-1 bg-red-700 hover:bg-red-600 text-white py-2 rounded font-bold text-xs shadow-lg"
                                >
                                    Create Anyway
                                </button>
                            </div>
                        </div>
                        )}

                        {!showFactoryResetConfirm ? (
                           <button 
                              onClick={() => setShowFactoryResetConfirm(true)}
                              className="w-full text-red-500 hover:text-red-400 py-2 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                           >
                              <RefreshCw size={14}/> Application Factory Reset
                           </button>
                        ) : (
                           <div className="bg-red-950 border border-red-800 rounded-lg p-4 animate-in fade-in mt-2">
                              <h4 className="text-red-400 font-bold text-sm flex items-center gap-2 mb-2"><AlertTriangle size={16}/> Wipe Everything?</h4>
                              <p className="text-gray-400 text-xs mb-4">This will clear all Local Storage and IndexedDB data for this domain and reload the page. This is destructive and irreversible.</p>
                              <div className="flex gap-2">
                                 <button 
                                       onClick={() => setShowFactoryResetConfirm(false)}
                                       className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded font-bold text-xs"
                                 >
                                       Cancel
                                 </button>
                                 <button 
                                       onClick={handleFactoryReset}
                                       className="flex-1 bg-red-700 hover:bg-red-600 text-white py-2 rounded font-bold text-xs shadow-lg"
                                 >
                                       Yes, Wipe All Data
                                 </button>
                              </div>
                           </div>
                        )}
                    </div>

                </div>
             </div>
           )}

        </div>

      </div>
    </div>
  );
};

export default SettingsModal;
