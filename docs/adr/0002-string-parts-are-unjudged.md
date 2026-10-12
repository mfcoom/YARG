# Guitar and bass are unjudged; no pitch detection

String parts show tab in time and never score the player, so the game does not analyse guitar or bass audio. The player judges themselves, and a wrong verdict from unreliable detection would be worse than none: confirming a low note's pitch needs about two waveform periods (roughly 32–49 ms for a 7-string's low B and a bass's low E, before buffering), chords are much harder, and YARG's only pitch tracker is a 50–1600 Hz monophonic vocal tracker.

## Consequences

- No audio input is needed to play strings; latency work for strings reduces to visual offset.
- Audio input is still used for takes (recording direct input for playback), which needs no analysis.
- Drums stay judged through YARG's existing engine, because MIDI hits are exact.
- Revisit only if the player asks for feedback that recordings cannot give.
