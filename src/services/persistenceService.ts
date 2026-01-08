
import { get, set, del } from 'idb-keyval';
import { RunDoc } from '../types';
import { validateRunDoc } from './validationService';

const DB_KEY = 'deckforge_rundoc_v2';

export const saveProject = async (doc: RunDoc): Promise<void> => {
  try {
    // 1. Standard Save: Strip history stacks to avoid massive IDB blobs
    const { undoStack, redoStack, ...cleanDoc } = doc;
    
    // Ensure we don't accidentally save with stacks if they were somehow passed
    const persistableDoc = { ...cleanDoc, undoStack: [], redoStack: [] };

    await set(DB_KEY, persistableDoc);
    
    // Save lightweight metadata for quick size access without loading the full blob
    // Wrap in try-catch for stringify safety (circular ref guard)
    try {
        const size = new Blob([JSON.stringify(persistableDoc)]).size;
        await set(DB_KEY + '_meta', { size, last_modified: doc.last_modified });
    } catch (e) {
        console.warn("Could not calculate project size (likely circular ref or too big). Skipping meta save.");
    }
    
  } catch (error) {
    console.error('Failed to save project to IndexedDB:', error);
    
    // 2. Emergency Brake: The "Critical Save"
    // If the main save failed (QuotaExceeded, Circular Structure, etc.), 
    // try to save ONLY the critical content (Slides + Branding + Outline).
    // We sacrifice history logs and assets if needed to save the text/layout.
    try {
        console.log("Attempting Emergency Save (Critical Data Only)...");
        const criticalDoc = {
            ...doc,
            undoStack: [],
            redoStack: [],
            history: { events: [] }, // Drop logs
            // If the error was QuotaExceeded, assets might be the culprit. 
            // We keep assets for now in emergency save, but if this fails, we could even drop unused assets.
        };
        await set(DB_KEY, criticalDoc);
        console.log("Emergency Save Successful.");
    } catch (criticalError) {
        console.error("CRITICAL: Emergency Save Failed. Data may be lost.", criticalError);
    }
  }
};

export const loadProject = async (): Promise<RunDoc | null> => {
  try {
    const data = await get<RunDoc>(DB_KEY);
    if (!data) return null;

    // Validate structure before returning
    const { valid, errors } = validateRunDoc(data);
    if (!valid) {
      console.warn("Corrupted save file found:", errors);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to load project from IndexedDB:', error);
    return null;
  }
};

export const clearProject = async (): Promise<void> => {
  try {
    await del(DB_KEY);
    await del(DB_KEY + '_meta');
    console.log('Project cleared from IndexedDB');
  } catch (error) {
    console.error('Failed to clear project:', error);
  }
};

export const getProjectSize = async (): Promise<number> => {
  try {
    // Attempt to read from metadata first to avoid loading heavy JSON
    const meta = await get<{size: number}>(DB_KEY + '_meta');
    if (meta && typeof meta.size === 'number') {
        return meta.size;
    }
    
    // If no meta exists (legacy save), return -1 to indicate unknown (triggering save on next change)
    return -1;
  } catch (error) {
    console.error('Failed to calculate project size:', error);
    return 0;
  }
};
