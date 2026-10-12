# YARG Practice (personal fork)

A personal fork of YARG `dev` for playing real guitar, bass and drums along with songs. Upstream is the `upstream` remote, and our work lives on the `practice` branch.

- Start with `docs/practice/NEXT.md`. Before naming things, read `GLOSSARY.md`. Decisions live in `docs/adr/`, and the current state of discovery is in `docs/practice/DISCOVERY.md`.
- Use the vocabulary of upstream's own docs (`docs/song_sync.md`, `docs/audio_pipeline.md`) for timing and audio.
- Keep changes in new files and narrow seams so rebasing onto upstream `dev` stays cheap. Don't reformat upstream files.
- Discovery uses `/grill-with-docs` (project skills in `.claude/skills`). Its glossary goes at the repo root and its ADRs in `docs/adr/`.
- Don't change working gameplay systems until the direction for that area is settled in DISCOVERY.md.
