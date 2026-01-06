
import React from 'react';
import { AlertTriangle, AlertCircle } from 'lucide-react';

interface ConfirmModalProps {
   title: string;
   message: string;
   confirmLabel: string;
   isDestructive?: boolean;
   onConfirm: () => void;
   onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ title, message, confirmLabel, isDestructive, onConfirm, onCancel }) => {
   return (
      <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
         <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-sm w-full shadow-2xl transform scale-100 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4 text-white">
               {isDestructive ? <AlertTriangle className="text-red-500" size={24}/> : <AlertCircle className="text-blue-500" size={24}/>}
               <h3 className="text-lg font-bold">{title}</h3>
            </div>
            <p className="text-gray-300 text-sm mb-6 leading-relaxed">
               {message}
            </p>
            <div className="flex justify-end gap-3">
               <button onClick={onCancel} className="px-4 py-2 text-gray-400 hover:text-white text-sm font-medium transition-colors">Cancel</button>
               <button 
                  onClick={onConfirm}
                  className={`px-4 py-2 rounded text-white text-sm font-bold shadow-lg transition-colors ${isDestructive ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'}`}
               >
                  {confirmLabel}
               </button>
            </div>
         </div>
      </div>
   );
};

export default ConfirmModal;
