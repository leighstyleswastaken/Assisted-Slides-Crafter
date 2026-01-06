
export interface LogEntry {
  id: string;
  timestamp: string;
  model: string;
  operation: string;
  status: 'success' | 'error';
  latency?: number;
  inputTokens?: number;
  outputTokens?: number;
}

let listeners: ((logs: LogEntry[]) => void)[] = [];
let logs: LogEntry[] = [];

export const logApiCall = (
  model: string, 
  operation: string, 
  status: 'success' | 'error' = 'success', 
  latency?: number,
  inputTokens?: number,
  outputTokens?: number
) => {
  const entry: LogEntry = {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    model,
    operation,
    status,
    latency,
    inputTokens,
    outputTokens
  };
  logs = [entry, ...logs];
  notify();
};

const notify = () => {
  listeners.forEach(l => l([...logs]));
};

export const subscribeToUsage = (listener: (logs: LogEntry[]) => void) => {
  listeners.push(listener);
  listener([...logs]);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
};

export const clearLogs = () => {
  logs = [];
  notify();
};

export const getUsageStats = () => {
    return logs.reduce((acc, curr) => {
        acc[curr.model] = (acc[curr.model] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
};

export const getTotalTokens = () => {
    return logs.reduce((acc, curr) => {
        acc.input += (curr.inputTokens || 0);
        acc.output += (curr.outputTokens || 0);
        return acc;
    }, { input: 0, output: 0 });
};
