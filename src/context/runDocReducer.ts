
import { RunDoc, Action } from '../types';
import { slideReducer } from './reducers/slideReducer';
import { assetReducer } from './reducers/assetReducer';
import { globalReducer } from './reducers/globalReducer';

// Helper to strip stacks to prevent recursion (O(n) size growth instead of exponential)
const snapshotState = (s: RunDoc): RunDoc => {
  const { undoStack, redoStack, ...rest } = s;
  return { ...rest, undoStack: [], redoStack: [] };
};

const pushToHistory = (state: RunDoc): RunDoc => {
  const snap = snapshotState(state);
  const newUndoStack = [snap, ...(state.undoStack || [])].slice(0, 50);
  return { ...state, undoStack: newUndoStack, redoStack: [] };
};

// Orchestrator Reducer that delegates to slices
const combinedReducer = (state: RunDoc, action: Action): RunDoc => {
  // Pass state through the chain of reducers.
  let nextState = globalReducer(state, action);
  
  if (nextState === state) {
     nextState = assetReducer(state, action);
  }
  
  if (nextState === state) {
     nextState = slideReducer(state, action);
  }

  // Handle Event Logging (Cross-cutting concern)
  if (action.type === 'LOG_EVENT') {
     const event = { ...action.payload, timestamp: action.payload.timestamp || new Date().toISOString() };
     return {
        ...state,
        history: {
           ...state.history,
           events: [...state.history.events, event]
        }
     };
  }

  return nextState;
};

export const runDocReducer = (state: RunDoc, action: Action): RunDoc => {
  const lastModified = new Date().toISOString();

  // History Management Actions
  if (action.type === 'UNDO') {
    if (!state.undoStack || state.undoStack.length === 0) return state;
    const [previousState, ...newUndoStack] = state.undoStack;
    
    // Save current state (cleaned) to redo stack
    const currentSnap = snapshotState(state);
    
    return {
      ...previousState,
      undoStack: newUndoStack,
      redoStack: [currentSnap, ...(state.redoStack || [])]
    };
  }

  if (action.type === 'REDO') {
    if (!state.redoStack || state.redoStack.length === 0) return state;
    const [nextState, ...newRedoStack] = state.redoStack;
    
    // Save current state (cleaned) to undo stack
    const currentSnap = snapshotState(state);

    return {
      ...nextState,
      undoStack: [currentSnap, ...(state.undoStack || [])],
      redoStack: newRedoStack
    };
  }

  // Batch Processing
  if (action.type === 'BATCH_ACTIONS') {
    let newState = { ...state };
    action.payload.forEach(subAction => {
      newState = combinedReducer(newState, subAction);
    });
    
    // Only push history once for the batch
    return pushToHistory({
      ...newState,
      last_modified: lastModified
    });
  }

  // Single Action Processing
  const newState = combinedReducer(state, action);

  // If state changed, update timestamp and consider history
  if (newState !== state) {
     const finalState = { ...newState, last_modified: lastModified };
     
     // Determine if this action should trigger a history snapshot
     // Generally, most content updates should.
     const historyExemptActions = ['LOG_EVENT', 'UPDATE_PROJECT_ID', 'UPDATE_AI_SETTINGS'];
     
     if (!historyExemptActions.includes(action.type)) {
        return pushToHistory(finalState);
     }
     
     return finalState;
  }

  return state;
};
