# Release preservation checklist

- Use a new version, immutable tag, separate delivery directory and exact source commit; preserve current and previous working versions.
- Record runtime MOC3/texture hashes, editable source provenance, runtime-only patches and third-party notices separately.
- Keep application/package versions aligned and record target OS/architecture. Build each target on an appropriate host; distinguish compile/unit/file checks from real GUI, input and installer acceptance.
- Generate SHA256/size manifests for original artifacts; verify uploaded IDs, names, sizes and digests. Source ZIP is not the application installer.
- Do not overwrite/delete Releases or tags, force-push, repackage historical binaries or upload private sources/logs.
- Confirm current download URLs before/after maintenance. Roll back normal changes with `git revert <merge-commit>` (or `git revert -m 1 <merge-commit>` for a merge commit); leave release artifacts intact.
- Character and SDK distribution rights require separate verified permission; visibility or MIT code does not decide those rights.
