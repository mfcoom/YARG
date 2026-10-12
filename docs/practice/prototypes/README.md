# Prototypes (throwaway)

These are kept as the source record for the decisions in `../DISCOVERY.md`. Don't build on them.

- `tab-study-v4.html` is the play-along tab study. Open it in a browser and drop a Guitar Pro file on it.
  - It shows page-turn and scrolling tab, technique notation, rhythm stems, guessed chords and an import report.
  - It settled several round 3–5 decisions: tab staff over string lanes or a neck view, page-turn as the default layout, and three lines when lines are short.
  - It loads alphaTab from jsDelivr. Its importer is the ancestor of `tools/gp-import`, but the converter's timing and linking are more correct now.
