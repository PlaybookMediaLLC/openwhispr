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

Enable **Validate only** to exercise the hosted input validation, generated packaging
configuration, quality checks, translations, dependency audit, and tests without creating a tag,
draft release, build assets, or published release. Use this before the first release under a new
product identity.

`MICROSOFT_CALENDAR_CLIENT_ID` is required for every release build. Configure it in repository
secrets before dispatching the workflow.

Fork repositories must always use an application ID and protocol scheme distinct from canonical
OpenWhispr, even if they keep the OpenWhispr display name. This prevents fork builds from replacing
canonical installations or claiming canonical deep links.

The workflow generates an Electron Builder configuration for each runner. It updates the visible
product name, bundle/application ID, protocol scheme, macOS permission text, artifact names, and
GitHub publishing target without committing generated branding files.

Windows and macOS builds use signing secrets when the complete platform secret set is available.
Forks without those secrets still produce unsigned artifacts. Unsigned artifacts are suitable for
internal testing but will show operating-system trust warnings and should not be presented as a
fully trusted public release. The workflow refuses to publish unsigned artifacts unless
**Allow unsigned release** is explicitly enabled. Draft-only runs do not require that override.

Repository administrators must allow GitHub Actions to create releases with `contents: write`.
Publishing a release also triggers the Nix updater, which discovers the renamed AppImage asset and
opens a pull request pointing `nix/package.nix` at this repository's release.

On the canonical repository, tag pushes matching `v*.*.*` retain the existing behavior: they build
the standard OpenWhispr identity and leave the release as a draft for manual review. Fork releases
must use manual dispatch so their distinct application ID and protocol scheme can be supplied.

The workflow creates one empty draft before starting platform builds and rejects any version whose
tag or release already exists. This prevents reruns from mixing assets from different commits. If a
run fails after creating its draft, delete that incomplete draft before retrying the same version.

## Synchronize canonical upstream

The **Sync upstream branch** workflow runs daily at 06:17 UTC and can also be dispatched manually.
By default it mirrors `OpenWhispr/openwhispr@main` into this repository's branch named `upstream`.

The `upstream` branch is a mirror, not a merge branch. Scheduled runs only fast-forward it. If the
branch contains divergent history, the workflow stops instead of replacing commits. A manual run
can enable **Allow non-fast-forward** to replace divergent history with `--force-with-lease` when
that reset is intentional. Use the branch as the source for comparison or merge pull requests into
`main`.

The workflow requires `contents: write`. GitHub's built-in workflow token cannot create or update
a branch when the incoming commits change files under `.github/workflows`. For an exact mirror,
configure an `UPSTREAM_SYNC_TOKEN` repository secret using a fine-grained personal access token
with **Contents: Read and write** and **Workflows: Read and write** access to this repository. The
workflow falls back to `github.token` when that secret is absent and stops with a clear error before
a workflow-file change would be skipped or partially mirrored.

If the `upstream` branch is protected, its rules must allow GitHub Actions to update it. Scheduled
workflows run only from the repository's default branch and GitHub may disable schedules in inactive
repositories, so the manual dispatch remains available as a fallback.
