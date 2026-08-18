# Fork development rules

This repo is a PlaybookMediaLLC fork of OpenWhispr/openwhispr. Upstream
conventions live in CLAUDE.md (upstream owns that file).

## What the fork owns

- Release automation: semantic-release, the protected main branch, and the
  required "tests" check. All changes land through PRs.
- The local development CLI: `bin/openwhispr` and the `Makefile`.
- `.github/workflows/sync-upstream.yml` and this file.

## Keep upstream merges cheap

1. Put fork work in fork-owned files (`bin/`, `Makefile`, `FORK.md`, release
   workflow config). Do not edit upstream app code for fork concerns.
2. Do not reformat upstream files.
3. App fixes belong upstream. Send them as upstream PRs.

## Upstream sync

`.github/workflows/sync-upstream.yml` merges OpenWhispr/openwhispr main into
the `upstream` branch every night and opens a PR against main. The required
"tests" check runs on that PR before merge.

The Actions token cannot push changes to workflow files. When the sync job
fails on a workflow-file push, run the merge locally and push the `upstream`
branch with your own credentials. The next workflow run then opens the PR.
