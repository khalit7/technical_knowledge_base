// ---- Reading 3: BatchNorm in training and at inference, against LayerNorm, on one seeded stream of batches ----
(function(){
  const NI=window.NI,g=document.getElementById('bn-g');if(!g)return;
  const D=NI.BNF.D,MOM=0.1,NSHOW=5,NLONG=200;
  let mode='b8';
  const f=(v,d)=>(Math.abs(v)<1e-12?0:v).toFixed(d===undefined?2:d);
  const col=(v,m)=>{const a=Math.min(1,Math.abs(v)/m);return 'color-mix(in srgb,'+(v>=0?'var(--c1)':'var(--c2)')+' '+Math.round(a*65)+'%,var(--bg))'};
  // precompute everything for a mode
  function run(m){const B=m==='b2'?2:8,ln=m==='ln';
    const bs=NI.bnStream(7,B,NLONG,0);let run={m:new Float64Array(D),v:new Float64Array(D).fill(1)};const steps=[];
    bs.forEach((x,k)=>{const r=NI.bnTrain(x,B,D,run,MOM);const l=NI.lnRows(x,B,D);
      if(k<NSHOW)steps.push({x,B,bt:r,ln:l,runBefore:run,runAfter:r.run});run=r.run});
    const test=NI.bnStream(99,B,1,0)[0],shift=NI.bnStream(99,B,1,3)[0];
    const tTrain=NI.bnTrain(test,B,D,run,MOM),tEval=NI.bnEval(test,B,D,run),sEval=NI.bnEval(shift,B,D,run),sLn=NI.lnRows(shift,B,D),tLn=NI.lnRows(test,B,D);
    return {B,ln,steps,run,test,shift,tTrain,tEval,sEval,sLn,tLn}}
  let R=run(mode);
  function grid(x,B,opt){opt=opt||{};const m=opt.m||Math.max(...Array.from(x,Math.abs),1);
    const cols=D+(opt.rowStats?1:0);let h='<div class="gr" style="grid-template-columns:repeat('+cols+',minmax(0,1fr))">';
    for(let d=0;d<D;d++)h+='<div class="hd">f'+(d+1)+'</div>';if(opt.rowStats)h+='<div class="hd">'+opt.rowStats.h+'</div>';
    for(let b=0;b<B;b++){for(let d=0;d<D;d++){const v=x[b*D+d];h+='<div style="background:'+col(v,m)+'">'+f(v,opt.dp===undefined?1:opt.dp)+'</div>'}
      if(opt.rowStats)h+='<div class="st">'+opt.rowStats.v[b]+'</div>'}
    (opt.foot||[]).forEach(r=>{for(let d=0;d<D;d++)h+='<div class="st'+(r.hl?' hl':'')+'">'+r.v[d]+'</div>';if(opt.rowStats)h+='<div class="st">'+r.h+'</div>'});
    return h+'</div>'}
  const colMeans=(y,B)=>{const o=[];for(let d=0;d<D;d++){let s=0;for(let b=0;b<B;b++)s+=y[b*D+d];o.push(s/B)}return o};
  const maxGap=(a,b)=>{let m=0;for(let i=0;i<a.length;i++)m=Math.max(m,Math.abs(a[i]-b[i]));return m};
  const N=NSHOW+3;
  function draw(i){const B=R.B,ln=R.ln;let cap,h='',cnt='';
    const runRow=(r,lbl)=>[{v:Array.from(r.m,v=>f(v)),h:''},{v:Array.from(r.v,v=>f(Math.sqrt(v))),h:''}];
    if(i<NSHOW){const s=R.steps[i];
      const inG=ln?grid(s.x,B,{rowStats:{h:'&mu;, &sigma;',v:Array.from(s.ln.mu,(m,b)=>f(m,1)+', '+f(Math.sqrt(s.ln.v[b]),1))}})
        :grid(s.x,B,{foot:[{v:Array.from(s.bt.mu,v=>'&mu; '+f(v,1))},{v:Array.from(s.bt.v,v=>'&sigma; '+f(Math.sqrt(v),1))}]});
      const out=ln?s.ln.y:s.bt.y;
      h='<div><div class="t">Batch '+(i+1)+': '+B+' examples &times; '+D+' features</div>'+inG+'</div><div><div class="t">Output in training</div>'+grid(out,B,{m:2.2,dp:2})+'</div>';
      if(!ln)h+='<div><div class="t">Running statistics after this batch</div>'+grid(new Float64Array(0),0,{foot:[{v:Array.from(s.runAfter.m,v=>'mean '+f(v)),hl:true},{v:Array.from(s.runAfter.v,v=>'sd '+f(Math.sqrt(v))),hl:true},{v:NI.BNF.mean.map(v=>'true '+v)}]})+'</div>';
      cap=ln?['LayerNorm: batch '+(i+1),'Each row (example) is normalised by its own mean and spread across its 4 features. Nothing depends on the other rows and nothing is stored for later.']
        :(i===0?['BatchNorm: batch 1','Each column (feature) is normalised by the batch\'s own mean and standard deviation, then the running averages move 10% of the way towards this batch\'s statistics (PyTorch momentum 0.1), from their starting values 0 and 1.']
        :['BatchNorm: batch '+(i+1),B===2?'With two examples, each column is just two numbers: after normalising they are always +1 and &minus;1, whatever the inputs. Only which of the two was larger survives.':'Same procedure; the running mean creeps towards the true feature means (5, &minus;1, 0, 2) at 10% per batch.']);
      cnt=RD.stat('Batches seen',i+1,'of the stream')+(ln?RD.stat('Stored for inference','nothing','LayerNorm has no running statistics'):RD.stat('Running mean, feature 1',f(s.runAfter.m[0]),'true mean 5'))+
        RD.stat('Output values in training',B===2&&!ln?'only &plusmn;1':'continuous',B===2&&!ln?'two per column':'')}
    else if(i===NSHOW){h=ln?'<div><div class="t">After '+NLONG+' batches</div><p class="small">LayerNorm has stored nothing: there is no estimate to converge, and no difference between training and inference.</p></div>'
        :'<div><div class="t">Running statistics after '+NLONG+' batches</div>'+grid(new Float64Array(0),0,{foot:[{v:Array.from(R.run.m,v=>'mean '+f(v)),hl:true},{v:Array.from(R.run.v,v=>'sd '+f(Math.sqrt(v))),hl:true},{v:NI.BNF.mean.map(v=>'true '+v)},{v:NI.BNF.sd.map(v=>'true sd '+v)}]})+'</div>';
      cap=ln?['LayerNorm: nothing to carry','The whole training-time machinery of BatchNorm (running averages, momentum, unbiased variance) is absent.']
        :['BatchNorm: '+NLONG+' batches later','The running averages are an exponential average over roughly the last 10 batches (1 / momentum), so they track the true statistics with some noise'+(B===2?'; even at batch 2 they are fine on average, because the unbiased variance corrects for the tiny batch.':'.')];
      cnt=RD.stat('Batches seen',NLONG,'')+(ln?'':RD.stat('Running mean, feature 1',f(R.run.m[0]),'true mean 5')+RD.stat('Running sd, feature 3',f(Math.sqrt(R.run.v[2])),'true sd 3'))}
    else if(i===NSHOW+1){const yT=ln?R.tLn.y:R.tTrain.y,yE=ln?R.tLn.y:R.tEval;
      h='<div><div class="t">A test batch, same distribution</div>'+grid(R.test,B)+'</div><div><div class="t">'+(ln?'Output (training = inference)':'Inference output, running statistics')+'</div>'+grid(yE,B,{m:2.2,dp:2})+'</div>'+
        (ln?'':'<div><div class="t">What training mode would have output</div>'+grid(yT,B,{m:2.2,dp:2})+'</div>');
      const gap=maxGap(yT,yE);
      cap=ln?['LayerNorm at inference','Exactly the same computation as in training, one example at a time.']
        :['BatchNorm at inference',B===2?'Training only ever produced &plusmn;1; inference now produces a continuous range, so the next layer meets inputs it never saw in training. The gap between the two modes is large.':'Inference uses the stored averages, training mode would have used this batch\'s own statistics: close with batch 8, never identical.'];
      cnt=RD.stat('Largest train against inference gap',f(gap),'same inputs, two modes')+RD.stat('Mode used at inference',ln?'per example':'running averages','')}
    else{const y=ln?R.sLn.y:R.sEval,mu=colMeans(y,B);
      h='<div><div class="t">Test batch after a shift: every feature +3</div>'+grid(R.shift,B)+'</div><div><div class="t">'+(ln?'LayerNorm output':'BatchNorm inference output')+'</div>'+grid(y,B,{m:2.2,dp:2,foot:[{v:mu.map(v=>'mean '+f(v)),hl:true}]})+'</div>';
      cap=ln?['LayerNorm under the shift','A shift added to every feature of an example is removed with the example\'s own mean: the output is unchanged.']
        :['BatchNorm under the shift','The running averages still describe the training data, so every output column is pushed off centre by about 3 / sd in expectation (1.5 for feature 1, 6 for feature 2; this batch\'s own means are below the grid). The fix is to recompute the statistics on new data (or adapt them at test time), which LayerNorm never needs.'];
      cnt=RD.stat('Mean output, feature 2',f(mu[1]),ln?'centred':'should be about 0')+RD.stat('Mean output, feature 1',f(mu[0]),'')}
    g.innerHTML=h;
    document.getElementById('bn-cap').innerHTML='<div class="t">'+(i+1)+' / '+N+' · '+cap[0]+'</div><p>'+cap[1]+'</p>';
    document.getElementById('bn-cnt').innerHTML=cnt}
  const A=RD.anim({card:'bn-card',ctl:'bn-ctl',n:N,ms:2800,label:'BatchNorm step',draw});
  document.getElementById('bn-modes').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.m;R=run(mode);
    [...e.currentTarget.children].forEach(x=>x.classList.toggle('on',x===b));A.redraw()});
})();
