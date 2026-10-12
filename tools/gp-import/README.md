# gp-import

This tool converts Guitar Pro files (.gp, .gpx, .gp5, .gp4, .gp3) into tab charts (`<song>.tab.json`) for the practice fork. The format is described in `docs/practice/tab-chart-format.md`.

```
cd tools/gp-import
npm install
node src/cli.js "path/to/song.gp"              # writes song.tab.json next to it
node src/cli.js "songs/*.gp" --out charts/     # wildcards and whole folders work, also on Windows
```

For each file it prints the parts, tunings, note counts, which techniques came through, what isn't drawn yet, and any warnings (capo, transposition).

## Tests

```
npm test                                       # fixtures written in alphaTex
GP_SAMPLES="path/to/folder" npm test           # also checks real files (not committed)
```

On Windows PowerShell, set the variable first with `$env:GP_SAMPLES="C:\path"`, then run `npm test`.

The real-file test checks that every sounding note alphaTab reads in each part ends up in the chart, and that the song length agrees with the tempo map.

## What it does

- **Repeats.** It unrolls repeats and alternate endings into playback order.
- **Ties and links.** It keeps ties, hammer-ons, pull-offs and slides as links to the earlier note, so the game can draw arcs and lines.
- **Chords.** It guesses chord names, because Guitar Pro files from the community rarely carry them. The guesser is `src/chords.js`, measured in `tools/chord-bench`.
