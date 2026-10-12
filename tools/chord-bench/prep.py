# Turn POP909 songs into {bars, notes, gt} JSON in quarter-note units.
import pretty_midi, json, sys, os, numpy as np
root=sys.argv[1]; out=[]
for sid in sorted(os.listdir(root)):
    d=os.path.join(root,sid)
    if not os.path.isdir(d): continue
    pm=pretty_midi.PrettyMIDI(os.path.join(d,sid+'.mid')); res=pm.resolution
    tq=lambda t: pm.time_to_tick(t)/res
    beats=np.loadtxt(os.path.join(d,'beat_midi.txt'))
    if beats.ndim<2: continue
    downs=[b[0] for b in beats if b[2]==1.0] if beats.shape[1]>2 else []
    if len(downs)<4: continue
    bq=[tq(t) for t in downs]+[tq(beats[-1][0])+1]
    bars=[{"q0":bq[i],"len":bq[i+1]-bq[i],"ts":"4/4"} for i in range(len(bq)-1) if bq[i+1]-bq[i]>0.5]
    notes=[{"q":tq(n.start),"d":max(tq(n.end)-tq(n.start),0.05),"midi":n.pitch} for inst in pm.instruments for n in inst.notes]
    gt=[]
    for line in open(os.path.join(d,'chord_midi.txt')):
        a,b,l=line.strip().split('\t'); gt.append([tq(float(a)),tq(float(b)),l])
    out.append({"id":sid,"bars":bars,"notes":notes,"gt":gt})
json.dump(out,open(sys.argv[2],'w')); print(len(out),'songs')
