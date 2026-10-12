import numpy as np, pandas as pd, json, re, sys, numpy.lib.recfunctions as rfn, math
src=open('/root/bench/functional-harmony/preprocessing.py').read()
fn=src[src.index('def r2tconvert'):src.index('def segment_pianorolls')]
ns={'np':np,'rfn':rfn}; exec(fn,ns); r2t=ns['r2tconvert']
ACC={'+':'#','-':'b'}
Q={'M':'maj','m':'min','M7':'maj7','m7':'min7','7':'7','aug':'aug','dim':'dim','dim7':'dim7','m7(b5)':'hdim7'}
def harte(t):
    m=re.match(r'([A-G])([+-]*)(.*)',t); root=m.group(1)+''.join(ACC[c] for c in m.group(2)); return root+':'+Q[m.group(3)]
out=[]
base='/root/bench/functional-harmony/BPS_FH_Dataset/'
for i in range(1,33):
    d=base+str(i)+'/'
    notes=np.genfromtxt(d+'notes.csv',delimiter=',')
    off=-min(0,notes[:,0].min())
    ch=pd.read_excel(d+'chords.xlsx',header=None)
    dt=[('onset','float'),('end','float'),('key','<U10'),('degree','<U10'),('quality','<U10'),('inversion','int'),('rchord','<U10')]
    arr=np.array([(float(r[0]),float(r[1]),str(r[2]),str(int(r[3])) if isinstance(r[3],float) else str(r[3]),str(r[4]),int(r[5]),str(r[6])) for r in ch.itertuples(index=False)],dtype=dt)
    t=r2t(arr)
    gt=[[float(r['onset'])+off,float(r['end'])+off,harte(str(r['tchord']))] for r in t]
    import os
    if os.path.exists(d+'dBeats.xlsx'): db=[x+off for x in pd.read_excel(d+'dBeats.xlsx',header=None)[0].tolist()]
    else:
        ms={}
        for n in notes: ms[int(n[5])]=min(ms.get(int(n[5]),1e9),float(n[0])+off)
        db=sorted(ms.values())
    end=max(notes[:,0]+notes[:,3])+off; db.append(end)
    bars=[{"q0":db[k],"len":db[k+1]-db[k],"ts":"4/4"} for k in range(len(db)-1) if db[k+1]-db[k]>0.2]
    out.append({"id":"bps%02d"%i,"bars":bars,"notes":[{"q":float(n[0])+off,"d":max(float(n[3]),.05),"midi":int(n[1])} for n in notes],"gt":gt})
json.dump(out,open(sys.argv[1],'w')); print(len(out),'pieces', sum(len(s['gt']) for s in out),'chord labels')
