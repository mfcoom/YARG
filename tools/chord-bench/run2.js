const fs=require('fs'); const {guessChords2,CHORD_DEFAULTS}=require('./chords2.js');
const songs=JSON.parse(fs.readFileSync(process.argv[2],'utf8')); const P=Object.assign({},CHORD_DEFAULTS,JSON.parse(process.argv[4]||'{}'));
const lo=+(process.argv[5]||0), hi=+(process.argv[6]||1e9); const out={};
const ids=songs.map(s=>s.id).sort(); const keep=new Set(ids.slice(lo,hi));
for(const s of songs){ if(!keep.has(s.id)) continue; const M={bars:s.bars,tracks:[{drum:false,notes:s.notes.map(n=>({...n,f:0})).sort((a,b)=>a.q-b.q)}]}; out[s.id]=guessChords2(M,P); }
fs.writeFileSync(process.argv[3],JSON.stringify(out));
