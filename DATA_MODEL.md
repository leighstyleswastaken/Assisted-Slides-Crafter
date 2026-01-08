
# Data Model

The application state is serialized into a single JSON object called the `RunDoc`.

## Root: `RunDoc`
| Field | Type | Description |
|-------|------|-------------|
| `project_id` | String | Unique identifier. |
| `stage` | Enum (1-5) | The currently active view. |
| `stage_status` | Map<Stage, Status> | Lock/Open/Approved status for each stage. |
| `branding` | Object | Global style definitions. |
| `outline` | Array<OutlineItem> | The narrative structure. |
| `asset_library` | Array<Asset> | Global pool of generated images. |
| `slides` | Array<Slide> | The concrete slide implementations. |

## Sub-Entity: `Branding`
| Field | Type | Description |
|-------|------|-------------|
| `tone` | String | Semantic description of the vibe. |
| `palette` | String[] | Hex codes. |
| `fonts` | String[] | Google Font families. |
| `keywords` | String[] | Semantic tags extracted from source. |
| `visual_features` | String[] | Concrete visual elements to guide Art Dept. |
| `key_facts` | String[] | (New) Extracted statistics and numbers. |
| `data_visualizations` | String[] | (New) Descriptions of suggested charts. |

## Sub-Entity: `Asset`
| Field | Type | Description |
|-------|------|-------------|
| `kind` | Enum | `background`, `stamp`, `texture`, `chart` (New), `peek` (New). |
| `uri` | String | Base64 data URI of the image. |
| `transparent` | Boolean | Whether background has been removed. |
| `keep` | Boolean | User flag to prevent garbage collection. |

## Sub-Entity: `Slide`
A slide is a container for Layout Variants.

| Field | Type | Description |
|-------|------|-------------|
| `slide_id` | String | Links to `OutlineItem`. |
| `active_variant_id` | String | Which variant to render. |
| `variants` | Array<SlideVariant> | List of A/B layout options. |

## Sub-Entity: `SlideVariant`
The actual content of a slide.

| Field | Type | Description |
|-------|------|-------------|
| `zones` | Map<ZoneId, Zone> | Mapping of 3x3 grid zones to Zone configurations. |
| `text_layout` | Enum | The chosen text overlay strategy (e.g. `headline_body`). |
| `text_content` | Map<String, String> | The actual copy (headline, body, etc.). |

## Sub-Entity: `Zone`
| Field | Type | Description |
|-------|------|-------------|
| `asset_id` | String | ID of the asset in this zone. |
| `content_fit` | Enum | `cover` (Crop), `contain` (Box), `fill` (Space). |
| `shape_mask` | Object | `{ type: 'wave'|'blob'..., intensity, color, flip }` |
| `peek_asset_id` | String | ID of the secondary background showing through the mask. |
| `image_effect` | Object | (New) `{ shadow: 'none'|'subtle'..., motion: 'none'|'pan'|'zoom' }` |
