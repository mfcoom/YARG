# Build as a maintained fork of YARG `dev`

We build on a personal fork of YARG's `dev` branch (and its YARG.Core submodule) instead of a companion app or upstream-only contributions. Real-instrument play ("Realtone") is a stretch goal and freestyle guitar is "Problematic" in upstream's CONTRIBUTING.md, so those PRs would be discouraged; YARG has no plugin system to extend from outside (DESIGNING.md: "Modlessness"); and a separate app would have to rebuild the timing, ASIO/WASAPI audio, time-stretch, practice and replay systems that `dev` already has. `dev` rather than `master` because ASIO, WASAPI exclusive, the native audio library and recent practice features exist only there.

## Consequences

- Rebase onto upstream `dev` regularly; keep our changes in new files and narrow seams where possible.
- Generic fixes upstream would welcome (Elite Drums bindings, hi-hat CC4, Pro Guitar groundwork) go upstream as PRs to shrink our diff.
- Personal and non-commercial: BASS and the CC BY-NC sound assets are fine under those terms, and LGPL-3.0 applies to anything we publish.
