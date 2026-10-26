# Fork development rules

This repo is the Oppulence Engineering fork of OpenWhispr/openwhispr. Upstream
conventions live in CLAUDE.md (upstream owns that file).

## What the fork owns

- Release automation: semantic-release, the protected main branch, and the
  required "tests" check. All changes land through PRs.
- The local development CLI: `bin/openwhispr` and the `Makefile`.
- `.github/workflows/sync-upstream.yml` and this file.
- `distributions/`, `extensions/`, and the small distribution hook modules.
- `.github/workflows/oppulence-voice-docs.yml` for the fork-owned documentation site.

## Keep upstream merges cheap

1. Put fork work in fork-owned files (`distributions/`, `extensions/`, `bin/`,
   `Makefile`, `FORK.md`, and release workflow config). Keep upstream app edits
   limited to the documented distribution hook points.
2. Do not reformat upstream files.
3. App fixes belong upstream. Send them as upstream PRs.

## Current generic upstream hooks

- `src/vite.config.mjs` maps renderer logo imports to the selected manifest.
- `src/components/CliIntegrationCard.tsx`, `McpIntegrationCard.tsx`, and
  `ControlPanelSidebar.tsx` import those generic aliases instead of fixed assets.
- `src/helpers/tray.js` and `linuxAutostart.js` resolve the selected manifest's
  tray and Linux assets through `src/config/distributionAssets.ts`.
- `scripts/prepare-release-config.js` maps packaging icons and the optional
  macOS asset catalog from the selected manifest.
- `eslint.config.js` excludes the independently checked generated docs subtree
  from the upstream JavaScript lint pass.

These hooks contain no Oppulence-specific branches. Product assets, Compose,
smoke tooling, and public docs stay under `distributions/oppulence-voice/`.

## Upstream sync

`.github/workflows/sync-upstream.yml` runs every night. It merges `develop`,
then OpenWhispr/openwhispr `main`, into the `upstream` branch. Then it opens a
PR from `upstream` to `develop`. The required checks run on that PR before
merge.

The job needs the `SYNC_UPSTREAM_TOKEN` secret. Use a fine-grained token for
this repository with read and write access to contents, pull requests, issues,
and workflows. The built-in Actions token cannot push upstream workflow-file
changes, and a PR that it opens does not start the required checks.

When a merge conflicts, the job opens or updates the issue "Upstream sync
needs conflict resolution". The issue lists the conflicted files. To resolve
the conflict:

1. `git fetch origin && git switch upstream && git merge --ff-only origin/upstream`
2. `git merge origin/develop`
3. `git fetch upstream main && git merge upstream/main`
4. Resolve each file. Keep fork changes at the hook points above.
5. Run `npm run quality-check && npm test`.
6. Push `upstream`, then run the workflow manually. The run opens the PR.
