# Next steps

This picks up where the cloud discovery session (2026-10-12) stopped. Read these first:
- `CLAUDE.md`
- `GLOSSARY.md`
- `docs/practice/DISCOVERY.md` (settled decisions and evidence)
- `docs/adr/`
- `docs/practice/tab-chart-format.md`

## 1. Find a test song for the first in-game version

A good test song has all three of:
1. **A Guitar Pro file** with a bass part, and ideally a 7-string guitar part too.
2. **A YARG or Clone Hero chart:**
   - a `song.ini`,
   - a `notes.mid` or `notes.chart` with a beat-accurate tempo map,
   - any `[Section]` events.
3. **Separate audio stems**, so the player's part can be muted. Look for `song.ogg` plus `bass.ogg`, `guitar.ogg`, `drums*.ogg` or `rhythm.ogg` (or `.opus`/`.mp3`), or a `.sng` that contains them.

How to look:
- **On disk:** scan the player's song folders (ask where the YARG and Clone Hero songs live) for chart folders that have stems.
- **Guitar Pro files:** match them by artist and title.
- **Online (if reachable from this machine):** `POST https://api.enchor.us/search` with `{"search":"<title>","page":1}` finds community charts. Stems are only visible after downloading the `.sng`.
- **Repertoire:** metal, prog, djent, neo-soul and rock, with 7-string and drop tunings.

Report:
- a short table of candidates, with tuning, stems and BPM;
- whether the Guitar Pro tempo agrees with the chart's tempo map (compare bar times; `tools/gp-import` writes `tempo`/`bars`);
- a recommendation.

## 2. First in-game version (after the song is chosen)

- **Reader:** a C# reader for `<song>.tab.json` (format v1).
- **Song sync:** map the tab's bars onto the chart's tempo map, falling back to Guitar Pro tempo plus `firstDownbeatSeconds`.
- **Display:** page-turn tab for one bass part over the real song, with the bass stem muted. Use YARG's practice speed and A/B loop.
- **No judging:** strings are unjudged (ADR 0002).
- **Where the code goes:** new files and narrow seams in YARG `dev` code (ADR 0001).
- **Before writing code,** define acceptance criteria with the player, for example:
  - visual offset stays stable across a full song;
  - the tab cursor stays within ±15 ms of the beat after calibration;
  - the loop keeps time at 70% speed.

## Environment notes

- **Upstream remote:** `upstream` = YARC-Official/YARG. The working branch is `practice`.
- **Converter:** `tools/gp-import` needs Node 20 or newer. Its fixture tests pass on Linux; run `npm test` once in native Windows to confirm.
- **Unity:** YARG `dev` uses Unity 6000.3.x. Check the editor version in `ProjectSettings/ProjectVersion.txt`.
- **Chord benchmark:** `tools/chord-bench` reproduces the chord-guess scores. The datasets aren't committed.
