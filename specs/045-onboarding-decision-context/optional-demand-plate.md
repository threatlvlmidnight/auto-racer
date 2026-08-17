# Optional Frontier Asset: Regional Demand Instrument Plate

**Ownership**: `[ASSET-FRONTIER-OPTIONAL]`  
**Blocking**: No. The code-native chart is the complete fallback and may ship
without this asset.

## Deliverable

- Stable key: `ui-regional-demand-plate-v1`
- File: `public/assets/ui/regional-demand-plate-v1.png`
- Format: transparent PNG, 1024×1024 master, square
- Safe chart area: centered 760×760 pixels
- Outer decorative budget: 120 pixels per edge
- No baked labels, numbers, axes, grids, polygons, points, stat icons, region
  names, colors with semantic meaning, or selected-item highlights
- Tone: alternate-1901 engineering instrument / route survey plate, restrained
  brass/ink/enamel detail, readable behind dynamic lines at small size
- Contrast: central safe area remains quiet enough for two overlaid polygons and
  four labels; decoration cannot cross the axes/label safe zones
- Provenance/approval must be recorded before integration is enabled

DeepSeek may implement the stable manifest key, preload, safe-area placement,
missing/corrupt fallback, and automated geometry tests. It must not generate,
edit, crop, select, or approve the plate.

