// Chord guesser: per beat, from every pitched part, smoothed across beats (Viterbi).
// Settings were tuned on the dev halves of POP909 and BPS-FH; see tools/chord-bench.
// A name in parentheses means some of its tones are not sounding; "X5" means no third is sounding.
// Input: { bars:[{q0,len,ts}], tracks:[{drum, notes:[{q,d,midi,f?,tags?:Set}]}] } with q in quarter notes.
// Beat-level chord guesser with smoothing (Viterbi). Pure function of the song model.
const CHORD_TYPES2=[["",[0,4,7]],["m",[0,3,7]],["5",[0,7]],["7",[0,4,7,10]],["maj7",[0,4,7,11]],["m7",[0,3,7,10]],["m7♭5",[0,3,6,10]],["dim",[0,3,6]],["dim7",[0,3,6,9]],["aug",[0,4,8]],
  ["sus2",[0,2,7]],["sus4",[0,5,7]],["add9",[0,2,4,7]],["m(add9)",[0,2,3,7]],["9",[0,2,4,7,10]],["m9",[0,2,3,7,10]],["maj9",[0,2,4,7,11]],["6",[0,4,7,9]],["m6",[0,3,7,9]],["7sus4",[0,5,7,10]]];
export const CHORD_DEFAULTS=Object.freeze(Object.assign({strict:0,present:0.06},{"extra": 1.062, "missThird": 0.23, "missOther": 0.24, "bass": 0.254, "bassInv": 0.049, "complexity": 0.008, "change": 0.481, "weakBeat": 0.788, "onsetBoost": 0.448, "shortCut": 0.361, "fifthOnly": 0.257}));
export function guessChords(M,P=CHORD_DEFAULTS){
  const NAMES=["C","C♯","D","E♭","E","F","F♯","G","A♭","A","B♭","B"];
  const pitched=M.tracks.filter(t=>!t.drum&&t.notes.length); if(!pitched.length) return [];
  const notes=[].concat(...pitched.map(t=>t.notes)).filter(n=>!(n.tags&&n.tags.has("dead"))&&!(n.f<0)).sort((a,b)=>a.q-b.q);
  // beat grid
  const beats=[]; for(const b of M.bars){ const den=+((b.ts||"4/4").split("/")[1]); const step=4/den; const n=Math.max(1,Math.round(b.len/step));
    for(let k=0;k<n;k++) beats.push({a:b.q0+k*b.len/n,b:b.q0+(k+1)*b.len/n,strong:k===0?2:(n%2===0&&k===n/2?1:0)}); }
  // chord vocabulary
  const cands=[]; for(let r=0;r<12;r++) for(const [name,iv] of CHORD_TYPES2){ const set=new Array(12).fill(false); iv.forEach(x=>set[(r+x)%12]=true); cands.push({r,name,iv,set,third:iv.includes(3)||iv.includes(4)}); }
  // emissions
  let ni=0; const E=[]; const totals=[];
  for(const bt of beats){ const len=bt.b-bt.a; const w=new Array(12).fill(0); let bass=null,total=0;
    while(ni<notes.length&&notes[ni].q+notes[ni].d<=bt.a-8) ni++;
    for(let i=ni;i<notes.length&&notes[i].q<bt.b;i++){ const n=notes[i]; if(n.q+n.d<=bt.a) continue;
      const ov=Math.min(bt.b,n.q+n.d)-Math.max(bt.a,n.q); if(ov<=0) continue;
      let wt=ov/len; if(n.q>=bt.a-1e-6&&n.q<bt.a+len*.25) wt*=1+P.onsetBoost; if(n.d<len*P.shortCut) wt*=.5; if(n.tags&&n.tags.has("ghost")) wt*=.3;
      w[n.midi%12]+=wt; total+=wt; if(bass===null||n.midi<bass) bass=n.midi; }
    totals.push(total);
    const row=new Float64Array(cands.length);
    if(total<1e-6){ E.push(null); continue; }
    for(let c=0;c<cands.length;c++){ const C=cands[c]; let inS=0,out=0,miss=0;
      for(let pc=0;pc<12;pc++){ if(C.set[pc]) inS+=w[pc]; else out+=w[pc]; }
      let invented=false;
      for(const x of C.iv){ const pc=(C.r+x)%12; const absent=w[pc]<total*P.present; if(absent){ miss+=(x===3||x===4)?P.missThird:(x===0?P.missThird:P.missOther); if(P.strict&&x!==7) invented=true; } }
      if(invented){ row[c]=-1e9; continue; }
      let s=(inS-P.extra*out)/total-miss-P.complexity*(C.iv.length-3);
      if(C.name==="5") s-=P.fifthOnly;
      if(bass!==null){ const bp=bass%12; if(bp===C.r) s+=P.bass; else if(C.set[bp]) s+=P.bassInv; }
      row[c]=s; }
    E.push(row); }
  // Viterbi with a change penalty that is cheaper on strong beats
  const K=cands.length, T=beats.length; if(!T) return [];
  let prev=new Float64Array(K), back=[]; for(let c=0;c<K;c++) prev[c]=E[0]?E[0][c]:0;
  for(let t=1;t<T;t++){ let bi=0; for(let c=1;c<K;c++) if(prev[c]>prev[bi]) bi=c;
    const pen=P.change+(beats[t].strong===0?P.weakBeat:0); const cur=new Float64Array(K), bk=new Int32Array(K);
    for(let c=0;c<K;c++){ const stay=prev[c], sw=prev[bi]-pen; if(stay>=sw){ cur[c]=stay; bk[c]=c; } else { cur[c]=sw; bk[c]=bi; } cur[c]+=E[t]?E[t][c]:0; }
    back.push(bk); prev=cur; }
  let c=0; for(let k=1;k<K;k++) if(prev[k]>prev[c]) c=k; const path=new Array(T); path[T-1]=c; for(let t=T-1;t>0;t--){ c=back[t-1][c]; path[t-1]=c; }
  // bass per segment for slash names
  const out=[]; let last=-1, segStart=0;
  const flush=(t0,t1,ci)=>{ const C=cands[ci]; let lo=null; for(const n of notes){ if(n.q>=beats[t1].b) break; if(n.q+n.d<=beats[t0].a) continue; if(lo===null||n.midi<lo) lo=n.midi; }
    // what is actually sounding across the segment decides how sure the name may look
    const w=new Array(12).fill(0); let tot=0; const a=beats[t0].a, b=beats[t1].b;
    for(const n of notes){ if(n.q>=b) break; if(n.q+n.d<=a) continue; const ov=Math.min(b,n.q+n.d)-Math.max(a,n.q); w[n.midi%12]+=ov; tot+=ov; }
    const has=x=>w[(C.r+x)%12]>=tot*P.present;
    const third=C.iv.find(x=>x===3||x===4);
    let name=C.name, implied=false;
    if(third!==undefined&&!has(third)&&C.iv.every(x=>x===0||x===7||x===third)) name=has(7)?"5":"";
    if(!has(0)) implied=true;
    for(const x of C.iv){ if(x===0||x===7) continue; if(name==="5"&&(x===3||x===4)) continue; if(!has(x)) implied=true; }
    let label=NAMES[C.r]+name; if(lo!==null&&lo%12!==C.r&&C.set[lo%12]) label+="/"+NAMES[lo%12];
    return implied?"("+label+")":label; };
  for(let t=0;t<=T;t++){ if(t===T||path[t]!==last){ if(last>=0){ const lab=flush(segStart,t-1,last); if(!out.length||out[out.length-1].name!==lab) out.push({q:beats[segStart].a,name:lab}); } last=t<T?path[t]:-1; segStart=t; } }
  return out;
}

