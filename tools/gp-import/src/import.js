// Guitar Pro (via alphaTab) → tab chart.
// The format is described in docs/practice/tab-chart-format.md.
//
// Playback order, bar positions and tempo come from alphaTab's own MIDI generator, so repeats,
// alternate endings, D.C./D.S./Coda/Fine jumps and pickup bars follow what alphaTab's player does.
import * as alphaTab from "@coderline/alphatab";
import { guessChords } from "./chords.js";

export const FORMAT = "yarg-practice/tab-chart";
export const FORMAT_VERSION = 1;
export const TPQ = 960; // ticks per quarter note, same as alphaTab
export const IMPORTER = "gp-import 0.2.0";
const NOTE_NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];

export function loadScore(bytes) {
  return alphaTab.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(bytes), new alphaTab.Settings());
}

export function loadAlphaTex(text) {
  const imp = new alphaTab.importer.AlphaTexImporter();
  imp.initFromString(text, new alphaTab.Settings());
  return imp.readScore();
}

/**
 * Runs alphaTab's MIDI generator and returns what it played:
 * bars in playback order (with ticks and tempo) and every note-on per track.
 */
export function playback(score) {
  const file = new alphaTab.midi.MidiFile();
  const handler = new alphaTab.midi.AlphaSynthMidiFileHandler(file);
  const noteOns = [];
  const addNote = handler.addNote.bind(handler);
  handler.addNote = (track, start, length, key, velocity, channel) => {
    noteOns.push({ track, start, length, key, velocity });
    addNote(track, start, length, key, velocity, channel);
  };
  const gen = new alphaTab.midi.MidiFileGenerator(score, new alphaTab.Settings(), handler);
  gen.applyTranspositionPitches = false;
  gen.generate();
  const bars = gen.tickLookup.masterBars.map((m) => ({
    index: m.masterBar.index, start: m.start, end: m.end,
    tempo: (m.tempoChanges || []).map((t) => ({ tick: t.tick, bpm: t.tempo })),
  }));
  return { bars, noteOns };
}

/** Bar indices in playback order, as alphaTab plays them. */
export function playbackOrder(score) {
  return playback(score).bars.map((b) => b.index);
}

const HARMONIC = { 1: "natural-harmonic", 2: "artificial-harmonic", 3: "pinch-harmonic", 4: "tapped-harmonic", 5: "semi-harmonic", 6: "feedback-harmonic" };

export function partKind(name, tuning, drum) {
  if (drum) return "drums";
  if (/\bbass\b/i.test(name)) return "bass";
  if (/guitar|gtr\b/i.test(name)) return "guitar";
  if (!tuning.length) return "other";
  if (/sax|vocal|voice|pad|piano|keys?\b|synth|organ|strings\b|violin|cello|brass|trumpet|flute/i.test(name)) return "other";
  if (tuning.length <= 5 && tuning[0] < 36) return "bass";
  return "guitar";
}

/**
 * Builds the in-memory song model (times in quarter notes, q) from an alphaTab score.
 * Kept close to the tab prototype's model so the two can be compared.
 */
export function scoreToModel(score) {
  const mbs = score.masterBars;
  const pb = playback(score);
  const M = { title: score.title || "", artist: score.artist || "", bars: [], tempo: [], tracks: [],
    report: { writtenBars: mbs.length, playedBars: pb.bars.length, chordNamesInFile: 0, warnings: [] } };

  for (const b of pb.bars) {
    const mb = mbs[b.index];
    M.bars.push({ q0: b.start / TPQ, len: (b.end - b.start) / TPQ, number: b.index + 1,
      ts: `${mb.timeSignatureNumerator}/${mb.timeSignatureDenominator}`, pickup: !!mb.isAnacrusis,
      section: mb.section ? (mb.section.text || mb.section.marker || null) : null });
    for (const t of b.tempo) {
      const last = M.tempo[M.tempo.length - 1];
      if (last && Math.abs(last.q - t.tick / TPQ) < 1e-9) last.bpm = t.bpm;
      else if (!last || last.bpm !== t.bpm) M.tempo.push({ q: t.tick / TPQ, bpm: t.bpm });
    }
  }
  if (!M.tempo.length || M.tempo[0].q > 0) M.tempo.unshift({ q: 0, bpm: score.tempo || 120 });
  if (!pb.bars.length && mbs.length) M.report.warnings.push("alphaTab produced no playback order; the song is empty.");

  score.tracks.forEach((track, ti) => {
    const drum = !!track.staves[0]?.isPercussion;
    const trackName = track.name || `Track ${ti + 1}`;
    if (drum) {
      // alphaTab's own percussion mapping, already in playback order
      const T = { name: trackName, drum: true, kind: "drums", tuning: [], notes: [], counts: {}, notDrawn: {} };
      for (const n of pb.noteOns) if (n.track === ti) T.notes.push({ q: n.start / TPQ, d: n.length / TPQ, midi: n.key, vel: Math.round(n.velocity / 127 * 100) / 100, tags: new Set() });
      T.notes.sort((a, b) => a.q - b.q || a.midi - b.midi);
      M.tracks.push(T);
      return;
    }
    track.staves.forEach((st, si) => {
      const tuning = [...st.tuning].reverse(); // lowest string first
      const name = track.staves.length > 1 ? `${trackName} (staff ${si + 1})` : trackName;
      const T = { name, drum: false, kind: partKind(trackName, tuning, false), tuning, notes: [], counts: {}, notDrawn: {} };
      const inc = (o, k) => (o[k] = (o[k] || 0) + 1);
      const latest = new Map();       // alphaTab note → { copy, k } for its most recent playback
      const pendingSlide = new Map(); // slide target → origin
      const linked = (entry, k) => entry && k - entry.k <= 1 && k >= entry.k ? entry.copy : null; // same or previous played bar only
      if (st.capo) M.report.warnings.push(`${name}: capo at fret ${st.capo}; frets are written relative to the capo.`);
      if (st.transpositionPitch) M.report.warnings.push(`${name}: written transposition of ${st.transpositionPitch} semitones.`);
      if (!tuning.length) M.report.warnings.push(`${name}: no strings (keyboard or similar); kept as pitches, not tab.`);

      pb.bars.forEach((pbar, k) => {
        const bar = st.bars[pbar.index];
        if (!bar) return;
        const barQ = pbar.start / TPQ;
        for (const v of bar.voices) for (const b of v.beats) {
          if (b.isRest || !b.notes.length) continue;
          const grace = !!(b.graceType && b.graceType !== 0);
          const bq = Math.max(0, barQ + b.playbackStart / TPQ);
          const bd = grace ? 0.12 : Math.max(b.playbackDuration / TPQ, 0.05);
          if (b.chordId && st.chords && st.chords.get && st.chords.get(b.chordId)) M.report.chordNamesInFile++;
          if (b.whammyBarPoints && b.whammyBarPoints.length) inc(T.notDrawn, "whammy bar");
          if (b.fade) inc(T.notDrawn, "volume swell or fade");
          if (b.brushType) inc(T.notDrawn, "strum direction");
          for (const n of b.notes) {
            if (!tuning.length) { T.notes.push({ q: bq, d: bd, midi: n.realValue, tags: new Set() }); continue; }
            const s = n.string - 1;
            const o = { q: bq, d: bd, s, f: n.fret, midi: n.isDead ? tuning[s] + (st.capo || 0) + n.fret : n.realValue,
              tags: new Set(), grace, dur: b.duration, dots: b.dots,
              tuplet: (b.tupletNumerator > 0 && b.tupletNumerator !== b.tupletDenominator) ? b.tupletNumerator : 0 };
            const tag = (t) => { o.tags.add(t); inc(T.counts, t); };
            if (grace) tag("grace");
            if (b.tremoloSpeed) tag("tremolo");
            if (b.rasgueado) { tag("rasgueado"); inc(T.notDrawn, "rasgueado pattern"); }
            if (n.isTieDestination) {
              const src = n.tieOrigin && linked(latest.get(n.tieOrigin), k);
              if (src) { o.tie = true; o.from = { q: src.q, f: src.f }; o.f = src.f; o.s = src.s; o.midi = src.midi; inc(T.counts, "tie"); }
              else if (n.tieOrigin) { o.f = n.tieOrigin.fret; o.midi = n.tieOrigin.realValue; } // reached by a jump: play it
            }
            if (n.isDead) tag("dead");
            if (n.isGhost) tag("ghost");
            if (n.isPalmMute) tag("palm-mute");
            if (n.isLetRing) tag("let-ring");
            if (n.vibrato || b.vibrato) tag("vibrato");
            if (n.accentuated === 1) tag("accent"); else if (n.accentuated === 2) tag("heavy-accent");
            if (n.isStaccato) tag("staccato");
            if (b.tap) tag("tap");
            if (b.slap) tag("slap");
            if (b.pop) tag("pop");
            if (HARMONIC[n.harmonicType || 0]) tag(HARMONIC[n.harmonicType]);
            if (n.hasBend && n.bendPoints && n.bendPoints.length) {
              const vals = n.bendPoints.map((p) => p.value), max = Math.max(...vals); // quarter tones
              o.bend = { semitones: max / 2, pre: vals[0] > 0, release: vals[vals.length - 1] < max };
              inc(T.counts, "bend");
            }
            if (n.isHammerPullDestination && n.hammerPullOrigin) {
              const src = linked(latest.get(n.hammerPullOrigin), k);
              if (src) { o.from = { q: src.q, f: src.f }; tag(n.fret >= src.f ? "hammer-on" : "pull-off"); }
            }
            const ps = pendingSlide.get(n);
            if (ps && k - ps.k <= 1) { o.from = { q: ps.q, f: ps.f }; tag(ps.kind); }
            pendingSlide.delete(n);
            if (n.slideOutType === 1 || n.slideOutType === 2) {
              if (n.slideTarget) pendingSlide.set(n.slideTarget, { q: bq, f: n.fret, k, kind: n.slideOutType === 2 ? "legato-slide" : "shift-slide" });
            } else if (n.slideOutType === 3) tag("slide-out-up");
            else if (n.slideOutType === 4) tag("slide-out-down");
            else if (n.slideOutType >= 5) tag("pick-slide");
            if (n.slideInType === 1) tag("slide-in-below"); else if (n.slideInType === 2) tag("slide-in-above");
            if (n.ornament) { tag("ornament"); inc(T.notDrawn, "ornament symbol"); }
            if (n.trillValue >= 0) { tag("trill"); inc(T.notDrawn, "trill"); }
            if (n.leftHandFinger >= 0) inc(T.notDrawn, "fingering");
            latest.set(n, { copy: o, k });
            T.notes.push(o);
          }
        }
      });
      T.notes.sort((a, b) => a.q - b.q || (a.s ?? 0) - (b.s ?? 0));
      M.tracks.push(T);
    });
  });

  // the chord guesser reads the same shape the prototype uses (q, d, midi, f, tags), at sounding pitch
  M.chords = guessChords({ bars: M.bars, tracks: M.tracks });
  return M;
}

const tick = (q) => Math.round(q * TPQ);
export function secondsAt(tempo, q) {
  let i = tempo.length - 1;
  while (i > 0 && tempo[i].q > q) i--;
  let sec = 0;
  for (let k = 1; k <= i; k++) sec += (tempo[k].q - tempo[k - 1].q) * 60 / tempo[k - 1].bpm;
  return sec + (q - tempo[i].q) * 60 / tempo[i].bpm;
}

/** Serialises the model as a tab chart (plain JSON object). */
export function modelToTabChart(M, { sourceFile = null } = {}) {
  const end = M.bars.length ? M.bars[M.bars.length - 1].q0 + M.bars[M.bars.length - 1].len : 0;
  const parts = M.tracks.map((T) => {
    const base = { name: T.name, kind: T.kind };
    if (T.drum) return { ...base, notes: T.notes.map((n) => ({ t: tick(n.q), d: tick(n.d), midi: n.midi, vel: n.vel })) };
    if (!T.tuning.length) return { ...base, notes: T.notes.map((n) => ({ t: tick(n.q), d: tick(n.d), midi: n.midi })) };
    return {
      ...base,
      strings: T.tuning.map((m) => ({ midi: m, name: NOTE_NAMES[m % 12] })),
      notes: T.notes.map((n) => {
        const o = { t: tick(n.q), d: tick(n.d), s: n.s, f: n.f, dur: n.dur };
        if (n.dots) o.dots = n.dots;
        if (n.tuplet) o.tuplet = n.tuplet;
        if (n.tie) o.tie = true;
        if (n.from) o.from = { t: tick(n.from.q), f: n.from.f };
        const tech = [...n.tags].sort();
        if (tech.length) o.tech = tech;
        if (n.bend) o.bend = n.bend;
        return o;
      }),
      counts: T.counts,
      notDrawn: T.notDrawn,
    };
  });
  return {
    format: FORMAT,
    version: FORMAT_VERSION,
    ticksPerQuarter: TPQ,
    source: { file: sourceFile, title: M.title, artist: M.artist, importer: IMPORTER, alphaTab: "1.8.4" },
    sync: { method: "guitar-pro-tempo", firstDownbeatSeconds: 0 },
    lengthSeconds: Math.round(secondsAt(M.tempo, end) * 1000) / 1000,
    tempo: M.tempo.map((t) => ({ t: tick(t.q), bpm: t.bpm })),
    bars: M.bars.map((b) => { const o = { t: tick(b.q0), len: tick(b.len), number: b.number, ts: b.ts }; if (b.pickup) o.pickup = true; if (b.section) o.section = b.section; return o; }),
    chords: M.chords.map((c) => ({ t: tick(c.q), name: c.name.replace(/^\((.*)\)$/, "$1"), implied: c.name.startsWith("(") })),
    parts,
    report: M.report,
  };
}

export function convert(bytes, opts = {}) {
  return modelToTabChart(scoreToModel(loadScore(bytes)), opts);
}
