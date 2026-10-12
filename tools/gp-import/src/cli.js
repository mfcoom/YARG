#!/usr/bin/env node
// Usage: gp-import <file.gp | folder | pattern>... [--out <dir>] [--quiet]
// Writes <name>.tab.json next to each input (or into --out) and prints what came through.
import fs from "node:fs";
import path from "node:path";
import { convert } from "./import.js";

const USAGE = "Usage: gp-import <file.gp | folder | *.gp>... [--out <dir>] [--quiet]";
const GP = /\.(gp|gpx|gp5|gp4|gp3)$/i;
const ascii = (s) => s.replace(/♯/g, "#").replace(/♭/g, "b");

const args = process.argv.slice(2);
let outDir = null, quiet = false; const patterns = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--out") {
    outDir = args[++i];
    if (!outDir || outDir.startsWith("--")) { console.error("--out needs a folder."); process.exit(2); }
  } else if (args[i] === "--quiet") quiet = true;
  else if (args[i] === "-h" || args[i] === "--help") { console.log(USAGE); process.exit(0); }
  else patterns.push(args[i]);
}
if (!patterns.length) { console.error(USAGE); process.exit(2); }

// Windows shells don't expand wildcards, so do it here. Folders are converted whole.
function expand(p) {
  if (/[*?]/.test(path.basename(p))) {
    const dir = path.dirname(p);
    const re = new RegExp("^" + path.basename(p).replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$", "i");
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter((f) => re.test(f) && GP.test(f)).map((f) => path.join(dir, f));
  }
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) return fs.readdirSync(p).filter((f) => GP.test(f)).map((f) => path.join(p, f));
  return [p];
}
const inputs = [...new Set(patterns.flatMap(expand))];
if (!inputs.length) { console.error(`No Guitar Pro files matched ${patterns.join(", ")}.`); process.exit(2); }

let failed = 0; const written = new Set();
for (const file of inputs) {
  try {
    const chart = convert(fs.readFileSync(file), { sourceFile: path.basename(file) });
    const base = path.basename(file).replace(GP, "");
    if (outDir) fs.mkdirSync(outDir, { recursive: true });
    let out = path.join(outDir || path.dirname(file), `${base}.tab.json`);
    if (written.has(out)) {
      out = path.join(path.dirname(out), `${base}-${written.size + 1}.tab.json`);
      console.warn(`  Two inputs are named ${base}; writing this one to ${out}`);
    }
    written.add(out);
    fs.writeFileSync(out, JSON.stringify(chart, null, 1) + "\n");
    if (!quiet) {
      const sections = chart.bars.filter((b) => b.section).length;
      console.log(`${file} -> ${out}`);
      console.log(ascii(`  ${chart.source.title || "(untitled)"}${chart.source.artist ? " - " + chart.source.artist : ""} | ${chart.bars.length} bars | ${chart.lengthSeconds.toFixed(1)} s | ${chart.tempo.length} tempo marks | ${sections} sections | ${chart.chords.length} chord changes (guessed)`));
      for (const p of chart.parts) {
        const tuning = p.strings ? `${p.strings.length}-string ${p.strings.map((s) => s.name).join(" ")}` : p.kind === "drums" ? "drums" : "no strings";
        const tech = p.counts ? Object.entries(p.counts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k} ${v}`).join(", ") : "";
        const nd = p.notDrawn && Object.keys(p.notDrawn).length ? ` | not drawn: ${Object.entries(p.notDrawn).map(([k, v]) => `${k} ${v}`).join(", ")}` : "";
        console.log(ascii(`  - [${p.kind}] ${p.name}: ${tuning} | ${p.notes.length} notes${tech ? " | " + tech : ""}${nd}`));
      }
      for (const w of chart.report.warnings) console.log(ascii(`  ! ${w}`));
    }
  } catch (e) {
    failed++;
    console.error(`${file}: couldn't convert (${e.message || e}). Guitar Pro 3-8 files (.gp, .gpx, .gp5, .gp4, .gp3) are supported.`);
  }
}
process.exit(failed ? 1 : 0);
