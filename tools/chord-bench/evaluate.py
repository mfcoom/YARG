import json, sys, numpy as np, mir_eval, warnings
warnings.filterwarnings('ignore')
songs={s['id']:s for s in json.load(open(sys.argv[1]))}; pred=json.load(open(sys.argv[2]))
ids=sorted(songs)[int(sys.argv[3]):int(sys.argv[4])] if len(sys.argv)>4 else sorted(songs)
NN={'C':0,'C♯':1,'D':2,'E♭':3,'E':4,'F':5,'F♯':6,'G':7,'A♭':8,'A':9,'B♭':10,'B':11}
HR=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']
Q={'':'maj','m':'min','5':'5','7':'7','maj7':'maj7','m7':'min7','m7♭5':'hdim7','dim':'dim','sus2':'sus2','sus4':'sus4','add9':'maj(9)','m(add9)':'min(9)','9':'9','m9':'min9','maj9':'maj9','6':'maj6','m6':'min6','7sus4':'sus4(b7)','dim7':'dim7','aug':'aug'}
DEG=['1','b2','2','b3','3','4','b5','5','b6','6','b7','7']
def harte(name):
    name=name[1:-1] if name.startswith('(') else name
    main,_,bass=name.partition('/')
    root=main[:2] if len(main)>1 and main[1] in '♯♭' else main[:1]; qual=main[len(root):]
    r=NN[root]; h=HR[r]+':'+Q[qual]
    if bass: h+='/'+DEG[(NN[bass]-r)%12]
    return h
tot={k:[] for k in ['root','majmin','mirex','thirds','sevenths']}; W=[]
for sid in [i for i in ids if i in pred]:
    s=songs[sid]; p=pred.get(sid,[])
    end=s['gt'][-1][1]
    if not p: continue
    pi=np.array([[p[i]['q'], p[i+1]['q'] if i+1<len(p) else end] for i in range(len(p))]); pl=[c['harte'] if 'harte' in c else harte(c['name']) for c in p]
    gi=np.array([[a,b] for a,b,_ in s['gt']]); gl=[l for _,_,l in s['gt']]
    try:
        sc=mir_eval.chord.evaluate(gi,gl,pi,pl)
    except Exception as e:
        continue
    for k in tot: tot[k].append(sc[k])
    W.append(end)
W=np.array(W)
for k,v in tot.items(): print(f"{k:9s} {np.average(v,weights=W)*100:5.1f}%")
print('songs',len(W))
