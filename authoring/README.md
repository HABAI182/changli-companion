# Editable source preservation

`ChangliReferenceRepair-v71-verified.cmo3` (55,314,208 bytes) is the verified editable source corresponding to the active v71 export. It has been removed from current public HEAD after source-only dependency checks and two independent recoverable backups: access-controlled private Git storage (cloned back) and persistent local storage. Both match SHA256:

`849400cb201df17964af540a8dbe6cb0d00b9ec36ea077c6f7dfb3d39c793366`

The maintainer retains the editable file for Cubism editing/re-export/recovery. Access is private; ordinary app users and public source builds do not need it. No role/character or third-party license is granted by possession or private storage. This does **not** remove the previously public source from Git history, forks, clones, source archives or old Releases.

Runtime MOC3, model3, motions, expressions, physics, textures, cropped art, icon and download URLs remain unchanged. The current application builds entirely from those runtime resources. Runtime hand contour, tail/head elasticity and flame changes remain in `public/models/changli/model.json` and `src/renderer/live2d/` / `src/pet/`; they are not a new CMO3 export. Historical authoring tools may still require local sources.

Restoration: obtain the preserved file from the maintainer/private vault and verify its size/SHA256 before opening Cubism; no need to restore it to public Git. Reverting the source migration commit is an engineering rollback that would make the historical file public in HEAD again, so use that route only if needed. Historical baseline metadata is retained in [assets.json](../docs/repository-audit/assets.json); exact migration facts in [source-migration.json](../docs/repository-audit/source-migration.json).
