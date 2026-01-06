
import React, { useState, useEffect } from 'react';
import { subscribeToUsage, LogEntry, clearLogs, getUsageStats, getTotalTokens } from '../../services/usageService';
import { X, Trash2, Activity, Clock, Zap } from 'lucide-react';

const UsageLogger: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  useEffect(() => {
    const unsub = subscribeToUsage(setLogs);
    return unsub;
  }, []);

  const stats = getUsageStats();
  const totalCalls = logs.length;
  const tokens = getTotalTokens();

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-gray-950 border-l border-gray-800 shadow-2xl z-[60] flex flex-col animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900">
        <h3 className="text-white font-bold flex items-center gap-2"><Activity size={18} className="text-blue-400"/> API Usage</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18}/></button>
      </div>

      <div className="p-4 bg-gray-900/50 border-b border-gray-800 grid grid-cols-2 gap-4">
         <div>
            <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">Total Calls</label>
            <span className="text-2xl font-mono text-white">{totalCalls}</span>
         </div>
         <div className="text-right">
             <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">Total Tokens</label>
             <div className="text-xs font-mono text-gray-300">
                <span className="text-green-400">{tokens.input.toLocaleString()}</span> in
             </div>
             <div className="text-xs font-mono text-gray-300">
                <span className="text-blue-400">{tokens.output.toLocaleString()}</span> out
             </div>
         </div>
         <div className="col-span-2">
            <div className="flex justify-between items-center mb-1">
               <label className="text-[10px] uppercase text-gray-500 font-bold">Model Breakdown</label>
               <button onClick={clearLogs} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"><Trash2 size={10}/> Clear</button>
            </div>
            <div className="flex flex-wrap gap-2">
               {Object.entries(stats).map(([model, count]) => (
                  <span key={model} className="text-[10px] px-2 py-1 rounded bg-gray-800 border border-gray-700 text-gray-300">
                     {model}: <span className="text-blue-400 font-bold">{count}</span>
                  </span>
               ))}
            </div>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
         {logs.length === 0 ? (
            <div className="text-center text-gray-600 mt-10 text-sm">No API calls recorded yet.</div>
         ) : (
            logs.map(log => (
               <div key={log.id} className="bg-gray-900 border border-gray-800 p-3 rounded text-sm group hover:border-gray-700 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                     <span className={`font-bold font-mono text-xs px-1.5 py-0.5 rounded ${log.status === 'success' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                        {log.status.toUpperCase()}
                     </span>
                     <span className="text-[10px] text-gray-500 flex items-center gap-1">
                        <Clock size={10}/> {new Date(log.timestamp).toLocaleTimeString()}
                        {log.latency && <span>• {log.latency}ms</span>}
                     </span>
                  </div>
                  <div className="font-bold text-gray-300 mb-1">{log.operation}</div>
                  <div className="flex justify-between items-center">
                     <div className="text-[10px] text-gray-500 font-mono truncate max-w-[150px]" title={log.model}>{log.model}</div>
                     {(log.inputTokens || log.outputTokens) && (
                        <div className="flex gap-2 text-[10px] font-mono text-gray-600">
                           <span title="Input Tokens" className="flex items-center gap-0.5"><Zap size={8}/> {log.inputTokens || 0}</span>
                           <span title="Output Tokens" className="flex items-center gap-0.5"><Zap size={8} className="rotate-180"/> {log.outputTokens || 0}</span>
                        </div>
                     )}
                  </div>
               </div>
            ))
         )}
      </div>
    </div>
  );
};

export default UsageLogger;
