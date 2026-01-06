import { get, set } from 'idb-keyval';
import { RunDoc } from '../types';
import { validateRunDoc } from './validationService';

const DB_KEY = 'deckforge_rundoc_v2';

export const saveProject = async (doc: RunDoc): Promise<void> => {
  try {
    await set(DB_KEY, doc);
    // console.log('Project saved to IndexedDB');
  } catch (error) {
    console.error('Failed to save project to IndexedDB:', error);
    // Fallback or alert user could go here, but usually IDB is reliable
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
