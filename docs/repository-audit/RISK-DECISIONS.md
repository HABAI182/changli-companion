# Risk decisions — 2026-10-17

- Preserve current runtime model/texture paths, user download links, version tags and Release assets. No external asset-loader migration is authorized by these maintenance changes.
- Editable CMO3 source must first have two independently recoverable, SHA256-verified backups, including verified private storage, before a source-only HEAD removal can be considered. Record readback and rollback in a separate migration change.
- Removing a file from HEAD does not remove public history, clones, forks, source archives or old Releases. History rewriting, tag/Release removal and existing visibility changes require separate approval and were not performed.
- Source/art rights, official character IP, reference author rights and Live2D SDK licenses are separate. No new licensing/commercial grant is asserted; policy decisions remain with the user.
- The limited reachable-history text scan found no matches for the four credential marker families tested. It found historical local user paths in authoring/QA material. The scanner is not a complete secret detector; do not publish raw logs or path values. Historical cleanup would require a separately approved policy.
- npm audit results and native tests are timestamped evidence, not a guarantee against unknown vulnerabilities. Existing Rust upstream maintenance/platform advisories must remain visible; do not suppress them merely because a target differs.
