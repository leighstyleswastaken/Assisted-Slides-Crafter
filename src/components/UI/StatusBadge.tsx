import React from 'react';
import { StageStatus } from '../../types';
import { Lock, CheckCircle, Circle, AlertTriangle } from 'lucide-react';

interface Props {
  status: StageStatus;
}

const StatusBadge: React.FC<Props> = ({ status }) => {
  switch (status) {
    case StageStatus.Locked:
      return <div className="flex items-center text-gray-500 gap-1"><Lock size={14} /><span className="text-xs uppercase font-bold">Locked</span></div>;
    case StageStatus.Approved:
      return <div className="flex items-center text-green-400 gap-1"><CheckCircle size={14} /><span className="text-xs uppercase font-bold">Approved</span></div>;
    case StageStatus.Dirty:
      return <div className="flex items-center text-yellow-500 gap-1"><AlertTriangle size={14} /><span className="text-xs uppercase font-bold">Dirty</span></div>;
    case StageStatus.Open:
    default:
      return <div className="flex items-center text-blue-400 gap-1"><Circle size={14} /><span className="text-xs uppercase font-bold">Open</span></div>;
  }
};

export default StatusBadge;
