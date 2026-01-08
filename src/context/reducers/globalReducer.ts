
import { RunDoc, Action, Stage, StageStatus, Slide, TextLayout, AssetKind } from '../../types';
import { INITIAL_RUN_DOC } from '../../constants';

export const globalReducer = (state: RunDoc, action: Action): RunDoc => {
  switch (action.type) {
    case 'SET_STAGE':
      return { ...state, stage: action.payload };

    case 'APPROVE_STAGE': {
      const stage = action.payload;
      const nextStage = stage < 5 ? (stage + 1 as Stage) : stage;
      
      const updatedStatus = { 
        ...state.stage_status, 
        [stage]: StageStatus.Approved 
      };

      if (nextStage !== stage && state.stage_status[nextStage] === StageStatus.Locked) {
         updatedStatus[nextStage] = StageStatus.Open;
      }

      return {
        ...state,
        stage: nextStage,
        stage_status: updatedStatus
      };
    }

    case 'APPROVE_PROJECT': {
      const allApproved = {
        1: StageStatus.Approved,
        2: StageStatus.Approved,
        3: StageStatus.Approved,
        4: StageStatus.Approved,
        5: StageStatus.Approved,
      };
      
      return {
        ...state,
        stage_status: allApproved,
        stage: Stage.Publisher
      };
    }

    case 'UNLOCK_STAGE':
      return {
        ...state,
        stage_status: {
          ...state.stage_status,
          [action.payload]: StageStatus.Open
        }
      };

    case 'UPDATE_SOURCE':
      return {
        ...state,
        source_material: action.payload,
        revisions: { ...state.revisions, source: state.revisions.source + 1 }
      };

    case 'UPDATE_BRANDING':
      return {
        ...state,
        branding: action.payload,
        revisions: { ...state.revisions, branding: state.revisions.branding + 1 }
      };

    case 'UPDATE_PRESENTATION_TYPE':
      return {
        ...state,
        presentation_type: action.payload
      };

    case 'UPDATE_OUTLINE': {
      const currentSlideIds = new Set(state.slides.map(s => s.slide_id));
      const defaultBgAsset = state.asset_library.find(
         a => a.linked_slide_id === 'kit_content' && a.kind === AssetKind.Background
      );
      const defaultBgId = defaultBgAsset ? defaultBgAsset.id : '';

      const newSlides: Slide[] = action.payload.map(item => {
        if (currentSlideIds.has(item.slide_id)) {
          return state.slides.find(s => s.slide_id === item.slide_id)!;
        }
        return {
          slide_id: item.slide_id,
          active_variant_id: 'v1',
          variants: [
            {
              variant_id: 'v1',
              label: 'Default Variant',
              zones: { background: { asset_id: defaultBgId } },
              text_layout: item.suggest_text_layout || TextLayout.HeadlineBody,
              text_content: { headline: item.title, body: item.intent },
              text_bold: { headline: true }, 
              text_italic: {}
            }
          ],
          status: { layout: 'draft', copy: 'draft' }
        };
      });

      return {
        ...state,
        outline: action.payload,
        slides: newSlides,
        revisions: { ...state.revisions, outline: state.revisions.outline + 1 }
      };
    }

    case 'UPDATE_PROJECT_ID':
      return { ...state, project_id: action.payload };

    case 'UPDATE_AI_SETTINGS':
      return { ...state, ai_settings: { ...state.ai_settings, ...action.payload } };

    case 'RESET_PROJECT':
      return { ...INITIAL_RUN_DOC, project_id: `proj_${Date.now()}` };

    case 'REHYDRATE':
      return { ...action.payload };

    default:
      return state;
  }
};
