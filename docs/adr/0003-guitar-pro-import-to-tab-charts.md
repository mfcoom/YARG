# Import Guitar Pro offline into our own tab charts

String content comes from Guitar Pro files, converted by a separate offline .NET tool (using alphaTab, MPL-2.0) into a tab chart stored next to the song. The game reads only tab charts. Rock Band pro-guitar charts are scarce, 6-string only (`ProGuitarString` has six values), and YARG parses only string, fret, strum type and mute from them; Guitar Pro covers 7-string, drop tunings and the full technique set. Keeping alphaTab out of Unity avoids loading its native rendering dependencies into the game and lets the converter be tested and rerun on its own.

## Consequences

- Tab charts support 4–8 strings and per-part tuning from the start.
- Song sync order: an existing YARG/Clone Hero chart's tempo map first; otherwise the Guitar Pro tempo plus a first-downbeat offset; tap-along beat mapping later for songs not recorded to a click.
- Re-fretting and transposition between tunings are later features; v1 shows the file's tuning and asks the player to match it.
