# Tab charts are versioned JSON in integer ticks, written by a Node converter

Tab charts are one JSON file per song (`<song>.tab.json`, spec in `docs/practice/tab-chart-format.md`) with every time in integer ticks at 960 per quarter note and repeats already unrolled. Integer ticks avoid floating-point drift, and 960 is alphaTab's own resolution, so nothing is rounded during import. Unrolling repeats in the converter means the game never has to interpret repeat signs. Seconds stay out of the file because song sync can later swap in a chart's tempo map.

The converter (`tools/gp-import`) is a Node CLI on the npm build of alphaTab, not the .NET tool ADR 0003 assumed. NuGet is blocked from both build environments available to us (the cloud workspace and the PC's Linux shell), so a .NET build couldn't be compiled or tested; npm is reachable from both. It is the same alphaTab codebase, and it already powers the tab prototype, so the two can be compared directly. The game reads JSON and never links alphaTab, so ADR 0003's reason for keeping the import offline still holds.

## Consequences

- Running the converter on Windows needs Node 20 or later (`npm install`, then `node src/cli.js song.gp`).
- If a .NET converter is wanted later, the format is the contract: port it and check it against this tool's output on the same files.
