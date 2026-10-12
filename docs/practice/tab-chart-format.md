# Tab chart format, version 1

A tab chart is one JSON file per song, `<song>.tab.json`, kept in the song's folder next to its chart and audio. It is written by `tools/gp-import` and read by the game. Version 1 is what the converter writes today; the game reader doesn't exist yet.

## Time

All times are **integer ticks**, 960 per quarter note (`ticksPerQuarter`), counted from bar 1, beat 1 **in playback order**. Repeats, alternate endings and D.C., D.S., Coda and Fine jumps are already unrolled, following alphaTab's player, so time only moves forward. Strums and arpeggios are written on their beat; the player may spread them over a few ticks. To turn ticks into seconds, use `tempo`. To turn those seconds into recording time, add `sync.firstDownbeatSeconds`, or replace the whole mapping with a chart's tempo map when one is used for song sync.

## Top level

| Field | Meaning |
|---|---|
| `format`, `version` | `"yarg-practice/tab-chart"`, `1`. A reader must refuse a higher major version. |
| `ticksPerQuarter` | Always 960 in version 1. |
| `source` | Original file name, title, artist, and the converter and alphaTab versions that wrote it. |
| `sync` | `method` (`"guitar-pro-tempo"` for now) and `firstDownbeatSeconds`: where bar 1, beat 1 falls in the recording. Set by the player or by song sync; the converter writes 0. |
| `lengthSeconds` | Song length from the Guitar Pro tempo, for display. |
| `tempo[]` | `{ t, bpm }`, quarter-note BPM, sorted, first at `t: 0`. |
| `bars[]` | `{ t, len, number, ts, pickup?, section? }`, in playback order. `number` is the bar number written in the file, so a repeated bar appears again with the same number. `ts` is a time signature such as `"7/8"`. `pickup: true` marks a pickup bar, which is shorter than its time signature. |
| `chords[]` | `{ t, name, implied }`, guessed from the notes of every pitched part. `implied: true` means some named tones aren't sounding. A power chord is named `"C5"`. |
| `parts[]` | In file order: one entry per Guitar Pro track, or per staff when a track has several. |
| `report` | `writtenBars`, `playedBars`, `chordNamesInFile`, `warnings[]` (capo, transposition, runaway repeats). |

## Parts

`{ name, kind, strings?, notes[], counts?, notDrawn? }`

There is one part per Guitar Pro track. A track with several staves gets one part per staff, named `"<track> (staff 2)"`.

- `kind` is `guitar`, `bass`, `drums` or `other`. It's guessed from the track name and tuning, and the player can override it.
- `strings[]` (pitched parts only) lists the open strings **lowest first**: `{ midi, name }`. A 7-string in B standard is `[35, 40, 45, 50, 55, 59, 64]`. 4 to 8 strings are expected.
- `counts` gives the number of notes carrying each technique. `notDrawn` counts things the file holds that the game doesn't show yet (whammy bar, trills, fingering, strum direction).

### Pitched notes

```json
{ "t": 6080, "d": 320, "s": 4, "f": 7, "dur": 8, "tuplet": 3,
  "from": { "t": 5760, "f": 6 }, "tech": ["hammer-on"] }
```

| Field | Meaning |
|---|---|
| `t`, `d` | Start and sounding length in ticks. |
| `s` | String index, 0 = lowest string. |
| `f` | Fret, 0 = open. |
| `dur` | Written note value, for rhythm notation: 1 whole, 2 half, 4 quarter, 8 eighth, 16, 32 …; −2 is a double whole note. |
| `dots`, `tuplet` | Present only when not 0. `tuplet` 3 means a triplet. |
| `tie` | `true` when this note continues the previous one on the same string. It is held, not played again. |
| `from` | `{ t, f }` of the note this one is linked to: the tie origin, or the start of a hammer-on, pull-off or slide. |
| `bend` | `{ semitones, pre, release }`. A full bend is 2 semitones. |
| `tech[]` | Sorted from: `hammer-on`, `pull-off`, `legato-slide`, `shift-slide`, `slide-in-below`, `slide-in-above`, `slide-out-up`, `slide-out-down`, `pick-slide`, `vibrato`, `palm-mute`, `let-ring`, `dead`, `ghost`, `staccato`, `accent`, `heavy-accent`, `tap`, `slap`, `pop`, `tremolo` (tremolo picking), `trill`, `grace`, `ornament` (a turn or mordent, drawn as a symbol), `rasgueado` (a flamenco strum pattern on one written chord), `natural-harmonic`, `artificial-harmonic`, `pinch-harmonic`, `tapped-harmonic`, `semi-harmonic`, `feedback-harmonic`. |

### Parts without strings

Keyboard and similar tracks have no `strings`. Their notes are `{ t, d, midi }`, at sounding pitch, and they still count towards the chord guesses.

### Drum notes

`{ t, d, midi, vel }`, as alphaTab's player strikes them. `midi` is the General MIDI percussion note (36 kick, 38 snare, 42/46/44 closed/open/pedal hi-hat, 49/57 crashes, 51 ride, 53 bell, toms 41–50). `vel` is from 0 to 1.

## Compatibility rules

- New optional fields can be added without changing `version`, and readers must ignore fields they don't know.
- Changing the meaning of an existing field, or the tick base, needs `version: 2`.
