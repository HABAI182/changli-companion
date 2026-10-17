# Tracked asset inventory — 2026-10-17

Baseline `e9fc7bcfb10ac83ea2ea77dda83807314eedc82a`; `757` tracked files, `169` asset/model-reference files. Exact tracked paths, byte sizes and SHA256 are in [assets.json](assets.json), generated from `git ls-files`, not an untracked directory listing.

| Category | Location | Dependency / rights status |
|---|---|---|
| Editable source | `authoring/ChangliReferenceRepair-v71-verified.cmo3` (55,314,208 bytes) | Authoring/rollback only; already public. SHA256 `849400cb201df17964af540a8dbe6cb0d00b9ec36ea077c6f7dfb3d39c793366` |
| Exported runtime model | `public/models/changli/live-reference-repair-v71-candidate/` | Keep MOC3, model3, motions, expressions, physics and textures; required by active renderer |
| Runtime art / fallback | `public/models/changli/assets/`, `preview.jpg`, `public/assets/` | Keep; used by fallback renderer, overlays, preview, sound and UI |
| Native application icon | `src-tauri/icons/` | Keep; referenced by Tauri bundle configuration |
| Live2D Framework/Core | `vendor/live2d/`, `public/vendor/live2d/` | Separate vendor licenses and redistributable-file list; not MIT character rights |
| Authoring helpers | `tools/live2d-authoring/` | Some require old local candidates; not a reproducible full authoring pipeline |

Character/model/cropped artwork rights remain permission-pending where no verifiable grant is present. Source possession, Git visibility and a code license are not rights evidence. No new character material was added by this audit. See [dependency map](DEPENDENCY-MAP.md), [risk decisions](RISK-DECISIONS.md), [license scope](../../LICENSE-SCOPE.md).

## Current HEAD after source-only migration

The table and `assets.json` above are the immutable pre-migration baseline. Only `authoring/ChangliReferenceRepair-v71-verified.cmo3` was removed from current HEAD after both independent backups were read back with the recorded SHA256. All 168 other baseline assets retain their original bytes; no runtime resource was removed. See [source-migration.json](source-migration.json) and [private preservation/recovery notes](../../authoring/README.md). Public history/old Releases remain intact.
