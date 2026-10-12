import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { loadAlphaTex, loadScore, scoreToModel, modelToTabChart, playbackOrder, playback, secondsAt, partKind, FORMAT, TPQ } from "../src/import.js";
import { guessChords } from "../src/chords.js";

const SIX = "\\tuning (E4 B3 G3 D3 A2 E2)";
const chartFromTex = (tex) => modelToTabChart(scoreToModel(loadAlphaTex(tex)));
const notesOf = (chart, i = 0) => chart.parts[i].notes;

test("repeats and alternate endings play in order", () => {
  const score = loadAlphaTex(`\\track "G" ${SIX} . \\ro 1.1.1 | 2.1.1 | \\ae (1) \\rc 2 3.1.1 | \\ae (2) 4.1.1 | 5.1.1 |`);
  assert.deepEqual(playbackOrder(score), [0, 1, 2, 0, 1, 3, 4]);
  const chart = modelToTabChart(scoreToModel(score));
  assert.deepEqual(chart.bars.map((b) => b.number), [1, 2, 3, 1, 2, 4, 5]);
  assert.deepEqual(notesOf(chart).map((n) => n.f), [1, 2, 3, 1, 2, 4, 5]);
  assert.deepEqual(notesOf(chart).map((n) => n.t), [0, 1, 2, 3, 4, 5, 6].map((k) => k * 4 * TPQ));
});

test("7-string tuning keeps the low B as string 0", () => {
  const chart = chartFromTex(`\\track "G7" \\tuning (E4 B3 G3 D3 A2 E2 B1) . 0.7.4 2.7.4 r.2 |`);
  assert.deepEqual(chart.parts[0].strings.map((s) => s.midi), [35, 40, 45, 50, 55, 59, 64]);
  assert.deepEqual(notesOf(chart).map((n) => [n.s, n.f]), [[0, 0], [0, 2]]);
  assert.equal(chart.parts[0].kind, "guitar");
});

test("4-string bass is recognised as bass", () => {
  const chart = chartFromTex(`\\track "Low part" \\tuning (G2 D2 A1 E1) . 0.4.1 |`);
  assert.equal(chart.parts[0].kind, "bass");
});

test("hammer-ons and pull-offs link to the note they come from", () => {
  const n = notesOf(chartFromTex(`\\track "G" ${SIX} . 5.3{h}.8 7.3.8 7.3{h}.8 5.3.8 r.2 |`));
  assert.deepEqual(n[1].tech, ["hammer-on"]);
  assert.deepEqual(n[1].from, { t: 0, f: 5 });
  assert.deepEqual(n[3].tech, ["pull-off"]);
  assert.deepEqual(n[3].from, { t: TPQ, f: 7 });
});

test("legato and shift slides land on the target note; slide-out is on the origin", () => {
  const n = notesOf(chartFromTex(`\\track "G" ${SIX} . 5.3{sl}.4 7.3.4 5.3{ss}.4 7.3{sou}.4 |`));
  assert.deepEqual(n[1].tech, ["legato-slide"]);
  assert.deepEqual(n[1].from, { t: 0, f: 5 });
  assert.ok(n[3].tech.includes("shift-slide"));
  assert.ok(n[3].tech.includes("slide-out-up"));
});

test("bends, vibrato, palm mute, dead, ghost and harmonics come through", () => {
  const a = notesOf(chartFromTex(`\\track "G" ${SIX} . 7.3{b (0 4)}.2 7.3{v}.2 |`));
  assert.deepEqual(a[0].bend, { semitones: 2, pre: false, release: false });
  assert.deepEqual(a[1].tech, ["vibrato"]);
  const b = notesOf(chartFromTex(`\\track "G" ${SIX} . 0.6{pm}.4 x.6.4 5.4{g}.4 12.1{nh}.4 |`));
  assert.deepEqual(b.map((n) => n.tech), [["palm-mute"], ["dead"], ["ghost"], ["natural-harmonic"]]);
});

test("tied notes keep the fret and point back to the original", () => {
  const n = notesOf(chartFromTex(`\\track "G" ${SIX} . 5.3.2 -.3.2 |`));
  assert.equal(n[1].tie, true);
  assert.equal(n[1].f, 5);
  assert.deepEqual(n[1].from, { t: 0, f: 5 });
});

test("output is versioned and every time is an integer tick", () => {
  const chart = chartFromTex(`\\track "G" ${SIX} . 5.3.8 7.3.8 r.4 r.2 |`);
  assert.equal(chart.format, FORMAT);
  assert.equal(chart.version, 1);
  assert.equal(chart.ticksPerQuarter, 960);
  for (const n of notesOf(chart)) { assert.ok(Number.isInteger(n.t)); assert.ok(Number.isInteger(n.d)); }
  for (const b of chart.bars) { assert.ok(Number.isInteger(b.t)); assert.ok(Number.isInteger(b.len)); }
});

test("seconds follow tempo changes", () => {
  const tempo = [{ q: 0, bpm: 120 }, { q: 8, bpm: 60 }];
  assert.equal(secondsAt(tempo, 4), 2);
  assert.equal(secondsAt(tempo, 8), 4);
  assert.equal(secondsAt(tempo, 10), 6);
});

test("chord guesser names what is sounding and marks what it infers", () => {
  const bars = [{ q0: 0, len: 4, ts: "4/4" }, { q0: 4, len: 4, ts: "4/4" }];
  const note = (q, midi) => ({ q, d: 4, midi, f: 0, tags: new Set() });
  const run = (...ns) => guessChords({ bars, tracks: [{ drum: false, notes: ns }] }).map((c) => c.name);
  assert.deepEqual(run(note(0, 48), note(0, 52), note(0, 55), note(4, 45), note(4, 48), note(4, 52)), ["C", "Am"]);
  assert.deepEqual(run(note(0, 48), note(0, 55), note(4, 48), note(4, 55)), ["C5"]);           // power chord, no third
  const dyad = run(note(0, 40), note(0, 49), note(4, 40), note(4, 49));                          // E + C♯ only
  assert.ok(dyad.every((n) => n.startsWith("(") || !/^A/.test(n)), `dyad named ${dyad}`);       // never a bare "A" chord
});

test("nested repeats, multi-bar endings and D.S. al Coda follow alphaTab's player", () => {
  const order = (tex) => modelToTabChart(scoreToModel(loadAlphaTex(`\\track "G" ${SIX} . ${tex}`))).bars.map((b) => b.number - 1);
  assert.deepEqual(order("\\ro 1.1.1 | \\ro 2.1.1 | \\rc 2 3.1.1 | \\rc 2 4.1.1 | 5.1.1 |"), [0, 1, 2, 1, 2, 3, 0, 1, 2, 1, 2, 3, 4]);
  assert.deepEqual(order("\\jump Segno 1.1.1 | \\jump DaCoda 2.1.1 | \\jump DalSegnoAlCoda 3.1.1 | \\jump Coda 4.1.1 |"), [0, 1, 2, 0, 1, 3]);
  assert.deepEqual(order("1.1.1 | \\jump Fine 2.1.1 | \\jump DaCapoAlFine 3.1.1 |"), [0, 1, 2, 0, 1]);
});

test("a pickup bar is only as long as its notes", () => {
  const chart = chartFromTex(`\\track "G" ${SIX} . \\ac 1.1.4 | 2.1.1 |`);
  assert.deepEqual(chart.bars.map((b) => [b.t, b.len]), [[0, 960], [960, 3840]]);
  assert.equal(chart.bars[0].pickup, true);
  assert.deepEqual(notesOf(chart).map((n) => n.t), [0, 960]);
});

test("a tie reached by jumping back is played, not held", () => {
  const n = notesOf(chartFromTex(`\\track "G" ${SIX} . r.2 5.3.2 | \\ro -.3.2 r.2 | \\rc 2 7.3.1 | 9.3.1 |`));
  const second = n.filter((x) => x.t === 11520)[0];
  assert.ok(second && !second.tie && !second.from, JSON.stringify(second));
  assert.equal(second.f, 5);
});

test("capo is part of the sounding pitch the chords are guessed from", () => {
  const chart = chartFromTex(`\\track "G" ${SIX} \\capo 2 . (0.5 2.4 2.3 1.2 0.1).1 |`);
  assert.equal(chart.chords[0].name, "Bm");
  assert.ok(chart.report.warnings.some((w) => /capo at fret 2/.test(w)));
});

test("a part without strings keeps pitches and doesn't break chords", () => {
  const chart = chartFromTex(`\\track "Piano" \\instrument piano . C4.4 E4.4 G4.4 r.4 |`);
  assert.equal(chart.parts[0].kind, "other");
  assert.equal(chart.parts[0].strings, undefined);
  assert.deepEqual(notesOf(chart).map((n) => n.midi), [60, 64, 67]);
  assert.equal(chart.chords[0].name, "C");
});

test("grace notes before the first beat don't get negative times", () => {
  const n = notesOf(chartFromTex(`\\track "G" ${SIX} . 5.3{gr}.16 7.3.4 r.4 r.2 |`));
  assert.ok(n.every((x) => x.t >= 0));
});

test("part kinds: low-tuned guitars stay guitars", () => {
  assert.equal(partKind("Rhythm Guitar", [33, 40, 45, 50, 54, 59], false), "guitar");
  assert.equal(partKind("Baritone", [35, 40, 45, 50, 55, 59], false), "guitar");
  assert.equal(partKind("Track 3", [28, 33, 38, 43], false), "bass");
  assert.equal(partKind("Fretless", [23, 28, 33, 38, 43], false), "bass");
});

// Every note alphaTab's own player strikes must be in the chart at the same tick and pitch.
// Exceptions alphaTab treats differently: legato-slide destinations (not re-struck) and harmonics (played at harmonic pitch).
function checkAgainstPlayer(score, label) {
  const { noteOns } = playback(score);
  const chart = modelToTabChart(scoreToModel(score));
  chart.parts.forEach((p, i) => {
    if (p.kind === "drums") {
      const heard = noteOns.filter((n) => n.track === i).map((n) => `${n.start}:${n.key}`).sort();
      const ours = p.notes.map((n) => `${n.t}:${n.midi}`).sort();
      assert.deepEqual(ours, heard, `${label} / ${p.name}`);
      return;
    }
  });
  // pitched parts: compare onsets per track (all staves together)
  const byTrack = new Map();
  let partIndex = 0;
  score.tracks.forEach((track, ti) => {
    const staves = track.staves[0].isPercussion ? 1 : track.staves.length;
    const parts = chart.parts.slice(partIndex, partIndex + staves); partIndex += staves;
    if (parts[0].kind === "drums") return;
    const heard = noteOns.filter((n) => n.track === ti).map((n) => Math.max(0, n.start)); // grace notes before bar 1 are clamped to 0
    const struck = [];
    for (const p of parts) for (const n of p.notes) if (!n.tie && !(n.tech || []).includes("legato-slide")) struck.push(n.t);
    // strums and arpeggios are spread over a few ticks by the player but written on the beat
    heard.sort((x, y) => x - y); struck.sort((x, y) => x - y);
    const left = new Map(); for (const t of struck) left.set(t, (left.get(t) || 0) + 1);
    const take = (t) => { const c = left.get(t) || 0; if (!c) return false; left.set(t, c - 1); return true; };
    const late = [];
    for (const t of heard) if (!take(t)) late.push(t);
    let missing = 0;
    // ornaments, rasgueado, tremolo picking and trills are one written note that the player turns into several
    const ornaments = []; for (const p of parts) for (const n of p.notes) if ((n.tech || []).some((x) => ["ornament", "rasgueado", "tremolo", "trill"].includes(x))) ornaments.push([n.t, n.t + n.d]);
    for (const t of late) { let ok = false; for (let back = 1; back <= 240 && !ok; back++) ok = take(t - back);
      if (!ok) ok = ornaments.some(([a, b]) => t >= a && t <= b); if (!ok) missing++; }
    assert.equal(missing, 0, `${label} / ${track.name}: ${missing} notes alphaTab plays are missing`);
  });
  JSON.parse(JSON.stringify(chart));
  const last = chart.bars[chart.bars.length - 1];
  if (last) {
    const tempo = chart.tempo.map((t) => ({ q: t.t / TPQ, bpm: t.bpm }));
    assert.ok(Math.abs(secondsAt(tempo, (last.t + last.len) / TPQ) - chart.lengthSeconds) < 0.01, `${label} length`);
  }
}

// Real Guitar Pro files are not committed (they are other people's transcriptions).
// GP_SAMPLES: a folder of your own files. ALPHATAB_TESTDATA: alphaTab's test-data folder (guitarpro3/4/5, audio).
for (const [envName, dir] of [["GP_SAMPLES", process.env.GP_SAMPLES], ["ALPHATAB_TESTDATA", process.env.ALPHATAB_TESTDATA]]) {
  test(`files in ${envName} match alphaTab's player`, { skip: !dir && `set ${envName} to a folder of Guitar Pro files` }, () => {
    const files = [];
    const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.gp[x345]?$/i.test(e.name)) files.push(p); } };
    walk(dir);
    assert.ok(files.length > 0, `no Guitar Pro files in ${envName}`);
    for (const f of files) checkAgainstPlayer(loadScore(fs.readFileSync(f)), path.basename(f));
  });
}
