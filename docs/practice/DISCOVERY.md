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
| Page-turn tab (still lines, sweeping cursor, next line swapped in) is the starting layout; scrolling stays as an option | 4 | — |
| Show a third line when the median line lasts under 4 s at the current speed (and there's room for it) | 5 | — |
| Jam leads with the key's scale and the notes actually sounding; chord names are secondary | 6 | — |
| The converter (`tools/gp-import`, Node + alphaTab) writes versioned JSON tab charts in integer ticks | 6 | ADR 0005, `docs/practice/tab-chart-format.md` |
| Hardware: TD-17KVX over USB MIDI, plus a two-input Hi-Z Focusrite Scarlett for guitar and bass. The M-Track Solo is not needed | 2 | — |

## Open

- **Overlays**: whether rhythm stems, chord names and hand-position markers stay on by default.
- **Technique notation**: the player said v2 "could use improvement". v3 follows Guitar Pro conventions (H/P labels; legato slides with an arc, shift slides as a line; slide in and out; ties as arcs; staccato; T/S/P; P.M. end tick; heavy accent; harmonic types; tuplets). It still needs specific feedback.
- **Chord source for Jam**: Guitar Pro files don't carry chord names (0 in 4 real files), so chords have to be guessed from the notes. The guesser is measured in `tools/chord-bench`: on held-out halves it scores root 92% / chord quality 84% on POP909 (algorithmic labels) and 70% / 69% on BPS-FH (labels written by people). Rock and metal aren't covered by either dataset. On the player's files it names power-chord riffs "X5" and puts a name in parentheses when some of its tones aren't sounding. Settled in round 6: Jam leads with the scale and the tones actually sounding; names are secondary.
- **Drums from Guitar Pro**: all 3 files have drum tracks with per-piece General MIDI articulations (closed/open/pedal hi-hat, ride, crashes, toms). These could give kit-shaped TD-17 drum parts for songs that have no Elite Drums chart.
- **Sections**: only 1 section marker across the 3 files. Practice sections need another source (chart sections when synced, otherwise bar ranges).
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

## Converter status (2026-10-12)

- `tools/gp-import` converts .gp, .gpx, .gp5, .gp4 and .gp3 files to `<song>.tab.json`.
- **Timing source:** playback order, bar positions and tempo come from alphaTab's own MIDI generator, so repeats, alternate endings, D.C./D.S./Coda/Fine jumps and pickup bars follow alphaTab's player.
- **Tests:** 17 fixture tests. Two optional file sweeps: `GP_SAMPLES` (the player's own files) and `ALPHATAB_TESTDATA` (103 files from alphaTab's own test set). In the sweeps, every note alphaTab's player strikes is checked to appear at the same tick. All pass in the cloud workspace; the fixtures also pass on the PC's Linux shell. Not yet run in native Windows Node.
- **Independent review:** found 14 defects in the first version, all fixed. The worst were wrong unrolling of multi-bar endings, nested repeats and D.S./D.C. jumps; pickup bars at full length; links across repeat jumps; capo missing from chord pitch; multi-staff tracks; keyboard tracks; and no Windows wildcard support.
- **Not drawn yet** (counted in each part's `notDrawn`): whammy bar, fades, strum direction, trills, ornaments, rasgueado patterns, fingering numbers.

## Experiments queued

1. **E1: MIDI timing.** Record a pad hit with a microphone into the Scarlett while logging when the TD-17's MIDI arrives. This measures MIDI latency and jitter against the audio clock.
2. **E2: Visual offset.** Do people settle on stable values in prototype v2, and on the Unity build?
3. **E3: ASIO sharing.** Can the game and an amp sim use the Scarlett at the same time? This decides how takes are captured.
4. **E4: Guitar Pro import — done 2026-10-12** (alphaTab 1.8.4, JavaScript build: the same codebase as the .NET package).
   - **Files**: Khayal (Kazdoura), Bubble Dream (CHON), Slumber Party (Brigitte Calls Me Baby). All parsed without errors.
   - **What came through**: tracks, tunings (6-string guitar and 4-string bass), time signatures, and tempo changes, including Bubble Dream's 5 tempo marks. Song lengths match (Slumber Party: 161 bars, 237 s).
   - **Techniques** (Bubble Dream guitars): dead notes, legato and shift slides, palm mute, natural harmonics, staccato, hammer-ons and pull-offs, ties, and slide in and out all came through and render in prototype v3.
   - **Gaps**: chord names were 0 in all files, and there was 1 section marker in total. No file had repeats (all were already unrolled), so repeat unrolling is implemented but untested on real data.
   - **7-string confirmed** with Trivium "Down From The Sky": four 7-string parts in B standard, a 5-string bass (low B), 11 sections, a bar in 3/4, and techniques including bends and artificial harmonics. All render in prototype v4.
   - **Tuning mismatch** came up straight away: the 5-string bass part can't be played as written on a 4-string bass. That's the re-fretting feature, still deferred.
