
import { RunDoc, Action } from '../../types';

export const assetReducer = (state: RunDoc, action: Action): RunDoc => {
  switch (action.type) {
    case 'ADD_ASSETS':
      return {
        ...state,
        asset_library: [...state.asset_library, ...action.payload]
      };

    case 'UPDATE_ASSET':
      return {
        ...state,
        asset_library: state.asset_library.map(a => 
          a.id === action.payload.id ? { ...a, ...action.payload } : a
        )
      };

    case 'DELETE_ASSET':
      return {
        ...state,
        asset_library: state.asset_library.filter(a => a.id !== action.payload)
      };

    case 'TOGGLE_ASSET_KEEP':
      return {
        ...state,
        asset_library: state.asset_library.map(a => 
          a.id === action.payload ? { ...a, keep: !a.keep } : a
        )
      };

    case 'KEEP_ALL_ASSETS':
      return {
        ...state,
        asset_library: state.asset_library.map(a => ({ ...a, keep: true }))
      };

    case 'PRUNE_UNKEPT_ASSETS':
      return {
        ...state,
        asset_library: state.asset_library.filter(a => a.keep)
      };

    default:
      return state;
  }
};
