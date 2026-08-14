# Release and upstream workflows

## Release a version under a new product name

The **Release** workflow supports both normal OpenWhispr releases and renamed fork releases.
It always uploads artifacts to the repository where the workflow is running, not the canonical
`OpenWhispr/openwhispr` repository.

Before running the workflow:

1. Update `package.json` and `package-lock.json` to the intended semantic version and commit the
   change. The workflow rejects a version that does not match `package.json`.
2. Open **Actions → Release → Run workflow**.
3. Enter the version without the `v` prefix.
4. Choose the displayed product name.
5. For a renamed product, provide a unique reverse-DNS application ID and deep-link scheme. The
   workflow rejects a renamed build that keeps OpenWhispr's application ID or URL scheme because
   it could overwrite or intercept links intended for an OpenWhispr installation.
6. Leave **Publish release** enabled to publish only after Linux, Windows, and both macOS builds
   succeed. Disable it to leave the GitHub release as a draft.

The workflow generates an Electron Builder configuration for each runner. It updates the visible
product name, bundle/application ID, protocol scheme, macOS permission text, artifact names, and
GitHub publishing target without committing generated branding files.

Windows and macOS builds use signing secrets when the complete platform secret set is available.
Forks without those secrets still produce unsigned artifacts. Unsigned artifacts are suitable for
internal testing but will show operating-system trust warnings and should not be presented as a
fully trusted public release.

Repository administrators must allow GitHub Actions to create releases with `contents: write`.
Publishing a release also triggers the Nix updater, which discovers the renamed AppImage asset and
opens a pull request pointing `nix/package.nix` at this repository's release.

Tag pushes matching `v*.*.*` retain the existing behavior: they build the standard OpenWhispr
identity and leave the release as a draft for manual review.

## Synchronize canonical upstream

The **Sync upstream branch** workflow runs daily at 06:17 UTC and can also be dispatched manually.
By default it mirrors `OpenWhispr/openwhispr@main` into this repository's branch named `upstream`.

The `upstream` branch is a mirror, not a merge branch. The workflow force-updates it with
`--force-with-lease`, so commits made directly on that branch will be replaced on the next sync.
Use it as the source for comparison or merge pull requests into `main`.

The workflow requires `contents: write`. If the `upstream` branch is protected, its rules must
allow GitHub Actions to update it. Scheduled workflows run only from the repository's default
branch and GitHub may disable schedules in inactive repositories, so the manual dispatch remains
available as a fallback.
