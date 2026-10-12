# Discovery log

Where the product stands: what is settled, what is still open, and the evidence behind it. Vocabulary is in `/GLOSSARY.md`, and decisions that are hard to reverse are in `/docs/adr/`. Update this file as rounds settle; delete sections once they are captured in code or ADRs.

## Settled

| Decision | Round | Where recorded |
|---|---|---|
| Maintained fork of YARG `dev` | 1 | ADR 0001 |
| Personal, non-commercial project; might later become an open-source fork | 1 | ADR 0001 |
| Guitar and bass are unjudged; no pitch detection | 2 | ADR 0002 |
| Guitar Pro first, imported offline into tab charts | 2 | ADR 0003 |
| Song sync: existing chart tempo map → Guitar Pro tempo + first-downbeat offset → tap-along later | 3 | ADR 0003 |
| Hybrid monitoring | 1 | ADR 0004 |
| Bass is the first string instrument; 7-string supported from the start (4–8 strings) | 2 | ADR 0003 |
| Re-fretting and transposition between tunings come later | 2 | ADR 0003 |
| First slice: tab in time over a real song (bass first), with loop and speed | 2 | — |
| Takes (record direct input, play back against tab) are the first addition after the slice | 3 | — |
| Jam and Sketchpad form their own mode family, after the first slice. Suggestions come from a rule-based theory engine, and chords and keys come from Guitar Pro files, not audio | 3 | — |
| Notation is tab staff. String lanes and the neck view were rejected in play-testing | 3 | — |
| Hardware: TD-17KVX over USB MIDI, plus a two-input Hi-Z Focusrite Scarlett for guitar and bass. The M-Track Solo is not needed | 2 | — |

## Open

- **Tab motion**: scrolling tab (A) vs page-turn tab (D), and whether rhythm stems, chord names and hand-position markers stay on by default. Prototype v2 tests this.
- **Technique notation**: the v2 glyph set needs a play-test (see the prototype's Technique key). Bass-specific marks (slap, pop) aren't drawn yet.
- **Drum work** after the string slice: a TD-17 auto-map, kit-shaped view, hi-hat pedal (CC4), early/late feedback and a tempo ladder in practice.
- **Shared screen**: how a tab staff and a drum view share one screen. Not explored yet.
- **Mode structure**: Perform / Practice / Jam as one session with three intents, or separate modes.
- **Repertoire**: no list from the player yet. A representative survey is below.

## YARG facts that shaped this (checked on `dev` @ cd531608, 2026-10-10)

- **Drums**: MIDI kits work as 4-lane, 5-lane or Pro with velocity (`Assets/Script/Input/Bindings/DrumPadButtonBinding.cs`). In Elite Drums mode the per-kit-piece bindings are commented out (`BindingCollection.Templates.cs` L97–111), and the mode loads the 4- or 5-lane prefab (`GameManager.Loading.cs` L495). Nothing reads CC4.
- **Pro guitar**: only chart data exists. `ProGuitarString` has 6 values (`YARG.Core/Chart/Notes/ProGuitarNote.cs`). The technique channels are commented out (`MidIOHelper.cs`). There is no engine, and `_proGuitarPrefab: {fileID: 0}` in `Assets/Scenes/Gameplay.unity`. The `protar` branch is a 2024 prototype that is not merged.
- **Audio**: `dev` only has ASIO and WASAPI-exclusive output and input (`Assets/Script/Audio/Bass/{Asio,Wasapi}`), the native read-ahead and time-stretch library (`Native/YargAudio`, `docs/time-stretch.md`), and a clock model where the input clock is the master and audio is nudged to follow it (`docs/song_sync.md`).
- **Practice**: sections, an A/B loop and pitch-preserving speed from 10–200% (`Assets/Script/Gameplay/PracticeManager.cs`).
- **Replays**: replays store every timestamped input (`YARG.Core/Replays`).
- **Upstream stance** (`CONTRIBUTING.md`): Pro Guitar is Planned and PRs are welcome. Realtone is a Stretch Goal and PRs are discouraged. Freestyle Guitar is Problematic.

## Song availability survey (2026-10-12, partly unverified)

I sampled 14 songs across metal, prog, neo-soul and rock. None has an official Rock Band 3 Pro Guitar or Pro Bass track, so every song needs a Guitar Pro file.

- **Community charts** (Clone Hero / YARG): probably exist for about 10–12 of the 14. None of this is verified, because the chart search API (`api.enchor.us`) was blocked from the research environment.
- **Tap-along mapping**: probably needed for about 3–4 songs, the ones not recorded to a click: Tool "Schism", RHCP "Can't Stop", Vulfpeck "Dean Town", and possibly Foo Fighters "Everlong".
- **Guitar Pro tempo plus a first-downbeat offset**: should be enough for the modern click-recorded prog, djent and neo-soul songs.
- **Next step**: query the chart search from the PC (`POST https://api.enchor.us/search`) to verify which charts exist and whether they include stems.

## Experiments queued

1. **E1: MIDI timing.** Record a pad hit with a microphone into the Scarlett while logging when the TD-17's MIDI arrives. This measures MIDI latency and jitter against the audio clock.
2. **E2: Visual offset.** Do people settle on stable values in prototype v2, and on the Unity build?
3. **E3: ASIO sharing.** Can the game and an amp sim use the Scarlett at the same time? This decides how takes are captured.
4. **E4: Guitar Pro import.** Run alphaTab on 3 real Guitar Pro files (a bass part, a 7-string part, one with heavy techniques) and check that string count, tuning, techniques, chord names and tempo changes survive.
