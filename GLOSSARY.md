# YARG Practice

A personal fork of YARG for playing real guitar, bass and drums along with songs: reading tab in time, practising sections, and later jamming and songwriting.

## Songs and charts

**Chart**:
The timed notes for one song, in YARG's existing formats (`.mid`, `.chart`, `.sng`), together with its tempo map.
_Avoid_: Track, map

**Tab chart**:
Our own per-song file holding string-and-fret notes, techniques, tuning and chord names for one string part, aligned to the song's tempo map.
_Avoid_: Pro guitar chart, tab file

**Guitar Pro file**:
A `.gp`/`.gp5`/`.gpx` score that a tab chart is imported from. Never read by the game itself.
_Avoid_: Tab (on its own)

**Tempo map**:
The list of beat positions in a recording's time, so that "bar 12, beat 3" means an exact moment in the audio.
_Avoid_: Beat map, sync map

**Song sync**:
How a tab chart's bars line up with the recording: borrowed from an existing chart's tempo map, from the Guitar Pro tempo plus a first-downbeat offset, or from tap-along beat mapping.
_Avoid_: Alignment, calibration

**First-downbeat offset**:
The time in the recording where bar 1, beat 1 falls.
_Avoid_: Song offset, delay

## Instruments and parts

**Part**:
One instrument's line in a song (bass part, guitar part, drum part).
_Avoid_: Track, instrument (when the line is meant)

**String layout**:
The number of strings and their open-string pitches for a part, from 4 to 8 strings.
_Avoid_: Tuning (when the string count is meant too)

**Tuning**:
The open-string pitches of a string layout, e.g. B E A D G B E.

**Technique**:
A playing instruction attached to a note: hammer-on, pull-off, slide, bend, vibrato, ghost note, dead note, natural or pinch harmonic, palm mute, accent, let ring, tap.
_Avoid_: Articulation, effect

**Hand position**:
The fret the fretting hand is anchored at; a shift is where it moves.

## Playing

**Unjudged play**:
Playing along with no scoring; the game shows what to play and when, and the player judges themselves.
_Avoid_: Free play, practice mode

**Judged play**:
YARG's existing scored play, where inputs are compared with chart notes inside hit windows. Used for drums, not strings.

**Visual offset**:
The per-player shift between when a note reaches the cursor and when it is heard, set so the two coincide.
_Avoid_: Latency, input offset

**Take**:
A recording of a player's direct input during a run, played back against the tab to check timing.
_Avoid_: Replay (YARG's replays are input logs, not audio)

**Jam**:
Playing over a song or section with the key, scale or mode and chord tones shown, instead of fixed notes.

**Sketchpad**:
Jam without a song: pick a key and mode, get suggested progressions and voicings, and loop a simple backing.
_Avoid_: Songwriting mode
