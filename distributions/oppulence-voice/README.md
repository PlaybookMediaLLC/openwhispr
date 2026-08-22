# Oppulence Voice distribution

This directory owns the Oppulence-specific development stack, documentation,
and release assets. Keeping these files together avoids copying Rowboat backend
source into this fork and limits upstream merge conflicts.

## Local backend

The stack pulls the latest backend image that passed the Rowboat production
deployment. Authenticate to GHCR first if the package is private.

```bash
docker login ghcr.io
make -C distributions/oppulence-voice pull
make -C distributions/oppulence-voice up
make -C distributions/oppulence-voice smoke
make -C distributions/oppulence-voice dev
```

Set `ROWBOAT_API_IMAGE` to reproduce a versioned tag or digest. Set `API_URL`
only when running the smoke client against another backend.

`production-latest` must come from a Rowboat release containing `/devstack`,
`/rowboat-api-worker`, and the Voice API. Older AMD64-only tags can be run on
Apple Silicon for diagnosis with `DOCKER_DEFAULT_PLATFORM=linux/amd64`, but a
current promoted release is multi-architecture and needs no override.

The default host ports use an isolated `28xxx` range. Override them with
`OPPULENCE_VOICE_API_PORT`, `OPPULENCE_VOICE_DEVSTACK_PORT`,
`OPPULENCE_VOICE_POSTGRES_PORT`, `OPPULENCE_VOICE_TEMPORAL_PORT`,
`OPPULENCE_VOICE_TEMPORAL_UI_PORT`, `OPPULENCE_VOICE_GRPC_PORT`, or
`OPPULENCE_VOICE_METRICS_PORT` when necessary.

Temporal UI is optional:

```bash
make -C distributions/oppulence-voice up-tools
open http://127.0.0.1:28088
```
