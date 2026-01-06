
import React from 'react';
import { useRunDoc } from '../../context/RunDocContext';
import { Stage, StageStatus } from '../../types';
import { Lock } from 'lucide-react';

interface Props {
  stage: Stage;
  children: React.ReactNode;
  className?: string;
}

const LockGuard: React.FC<Props> = ({ stage, children, className = '' }) => {
  const { state, dispatch } = useRunDoc();
  const isApproved = state.stage_status[stage] === StageStatus.Approved;

  const handleUnlockRequest = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (window.confirm("This stage is approved and locked. Do you want to un-approve it to make edits?")) {
      dispatch({ type: 'UNLOCK_STAGE', payload: stage });
    }
  };

  return (
    <div className={`relative ${className}`}>
      {children}
      
      {/* Overlay when locked */}
      {isApproved && (
        <div 
          onClick={handleUnlockRequest}
          className="absolute inset-0 z-[60] bg-gray-900/10 cursor-not-allowed group flex items-center justify-center transition-colors hover:bg-gray-900/30"
          title="Stage is Locked. Click to Unlock."
        >
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-2xl border border-gray-700 transform scale-90 group-hover:scale-100 duration-200">
             <Lock size={16} />
             <span className="text-sm font-bold">Locked. Click to Edit</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LockGuard;
