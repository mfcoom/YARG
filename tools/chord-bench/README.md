# Chord-guess benchmark (throwaway research tool)

This scores the chord guesser (`chords2.js`, the same code the tab prototype uses) against chord labels that are already known.

| Dataset | What the labels are | Licence | Source |
|---|---|---|---|
| POP909 | 909 pop piano arrangements; chord labels were extracted from the MIDI by an algorithm, not by people | MIT | github.com/music-x-lab/POP909-Dataset |
| BPS-FH | 32 Beethoven sonata movements; harmony annotated by people | see repo | github.com/Tsung-Ping/functional-harmony |

```
python3 prep.py   <POP909>/POP909 pop909.json
python3 prep_bps.py bps.json                      # edit the path inside first
python3 tune.py tune 45                           # random search on dev halves → best_params.json
python3 tune.py eval best_params.json             # dev and held-out test scores
```

Scores use `mir_eval` (root / majmin / sevenths), weighted by song length.

## Results (2026-10-12, held-out test halves)

| Guesser | POP909 root | POP909 majmin | BPS-FH root | BPS-FH majmin |
|---|---|---|---|---|
| v3, per half bar | 88.7%* | 82.6%* | 63.6%* | 60.8%* |
| v4, per beat, smoothed, tuned | 91.8% | 84.2% | 70.0% | 69.2% |

\* whole dataset, untuned. Labelling every half bar with the true chord would score 95% (POP909) and 90% (BPS-FH), so most of the remaining error is in naming the chord, not in when it changes.

What the numbers don't cover: rock and metal band arrangements, which neither dataset contains. A spot-check on four of the player's own Guitar Pro files showed two-note riffs being named as full chords. v4 now names power chords "X5" and puts a name in parentheses when some of its tones aren't sounding (3.6% of POP909 segments, 10% of BPS-FH).
