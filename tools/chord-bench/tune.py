import json, subprocess, random, numpy as np, mir_eval, warnings, sys
warnings.filterwarnings('ignore')
exec(open('evaluate.py').read().split("tot={")[0].split("songs={")[0])  # imports only
src=open('evaluate.py').read(); ns={}
exec(src[src.index("NN="):src.index("tot={")],ns); harte=ns['harte']
data={'pop':json.load(open('/root/bench/pop909.json')),'bps':json.load(open('/root/bench/bps.json'))}
def score(name,pred,ids):
    S={s['id']:s for s in data[name]}; vals=[];W=[]
    for sid in ids:
        if sid not in pred or not pred[sid]: continue
        s=S[sid]; p=pred[sid]; end=s['gt'][-1][1]
        pi=np.array([[p[i]['q'], p[i+1]['q'] if i+1<len(p) else end] for i in range(len(p))]); pl=[harte(c['name']) for c in p]
        gi=np.array([[a,b] for a,b,_ in s['gt']]); gl=[l for _,_,l in s['gt']]
        try: sc=mir_eval.chord.evaluate(gi,gl,pi,pl)
        except Exception: continue
        vals.append([sc['root'],sc['majmin'],sc['sevenths']]); W.append(end)
    return np.average(np.array(vals),axis=0,weights=W)
def run(params,split):
    res={}
    for name,(lo,hi) in split.items():
        f=f'/tmp/tune_{name}.json'
        subprocess.run(['node','run2.js',f'/root/bench/{"pop909" if name=="pop" else "bps"}.json',f,json.dumps(params),str(lo),str(hi)],check=True)
        pred=json.load(open(f)); ids=sorted(pred)
        res[name]=score(name,pred,ids)
    return res
DEV={'pop':(0,300),'bps':(0,16)}; TEST={'pop':(300,909),'bps':(16,32)}
if sys.argv[1]=='tune':
    random.seed(1); best=None
    space={'extra':(0.4,1.4),'missThird':(0.1,0.6),'missOther':(0.05,0.4),'bass':(0.1,0.6),'bassInv':(0,0.2),'complexity':(0,0.1),'change':(0.2,1.2),'weakBeat':(0.1,0.8),'onsetBoost':(0,1),'shortCut':(0.1,0.5),'fifthOnly':(0,0.4)}
    for it in range(int(sys.argv[2])):
        p={k:round(random.uniform(*v),3) for k,v in space.items()} if it>0 else {}
        r=run(p,DEV); obj=(r['pop'][1]+r['bps'][1])/2
        if best is None or obj>best[0]: best=(obj,p,r); print(it,round(obj*100,2),'pop',np.round(r['pop']*100,1),'bps',np.round(r['bps']*100,1),p,flush=True)
    json.dump(best[1],open('/root/bench/best_params.json','w'))
else:
    p=json.load(open(sys.argv[2])) if len(sys.argv)>2 else {}
    for nm,split in [('dev',DEV),('test',TEST)]:
        r=run(p,split); print(nm,'pop root/majmin/7ths',np.round(r['pop']*100,1),'| bps',np.round(r['bps']*100,1))
