// ---- Run Bitune tab: ask the models, look inside, results from training, test in the browser ----
(function(){
  if(!window.BT||!window.BTT)return;
  const R=BTT.results,V=BT.vocab,P0=BT.p0,C0=BT.c0,NP=C0-P0,NC=V.length-C0;
  const LAB={lora:'LoRA',lora_2r:'LoRA, rank 8 (like LoRA16)',naive:'Naive Bidir.',nomix:'No Mixing',onlycausal:'Only Causal',shared:'Shared Weights',anti:'Anti-causal 2nd pass',bitune:'Bitune',lora_qfirst:'Question first (LoRA)'};
  const DESC={lora:'one causal pass',lora_2r:'one causal pass, twice the adapter rank',naive:'one bidirectional pass, one adapter: a prefix-LM',nomix:'one bidirectional pass with its own adapter',onlycausal:'two causal passes, two adapters, mixed',shared:'causal and bidirectional passes with one adapter, mixed',anti:'causal and anti-causal passes, two adapters, mixed',bitune:'causal and bidirectional passes, two adapters, mixed',lora_qfirst:'LoRA trained and tested with the question first'};
  const ORDER=['lora','lora_2r','naive','nomix','onlycausal','shared','anti','bitune','lora_qfirst'].filter(m=>R[m]);
  const SHIP=Object.keys(BT.variants);
  const pct=v=>(100*v).toFixed(1)+'%';
  const mean=m=>R[m]?R[m].mean:NaN;
  window.BT_ABL={'LoRA':{m:100*mean('lora'),sd:100*R.lora.sd},'Naive Bidir.':R.naive&&{m:100*mean('naive'),sd:100*R.naive.sd},'No Mixing':R.nomix&&{m:100*mean('nomix'),sd:100*R.nomix.sd},
    'Only Causal':R.onlycausal&&{m:100*mean('onlycausal'),sd:100*R.onlycausal.sd},'Shared Weights':R.shared&&{m:100*mean('shared'),sd:100*R.shared.sd},'Bitune':{m:100*mean('bitune'),sd:100*R.bitune.sd}};
  if(window.BT_ABL_REDRAW)BT_ABL_REDRAW();

  // the Reading tab's toy section
  const best=ORDER.filter(m=>m!=='lora_qfirst').reduce((a,b)=>mean(b)>mean(a)?b:a);
  const line=ORDER.map(m=>LAB[m]+' <b>'+pct(mean(m))+'</b>').join(', ');
  const bidirM=['naive','nomix','shared','anti','bitune'].filter(m=>R[m]),lo=Math.min(...bidirM.map(mean)),hi=Math.max(...bidirM.map(mean));
  const ab=R.bitune.alpha[0],abAll=ab?ab[0].concat(ab[1]):[];
  $('toyReveal').innerHTML='A method with a bidirectional pass. Held-out accuracy, mean of 3 seeds: '+line+'. Every method whose prompt features can see the club after them reaches '+pct(lo)+' to '+pct(hi)+', within a few tenths of the question-first ceiling. The methods that stay causal fall short: plain LoRA '+pct(mean('lora'))+', two causal passes mixed (Only Causal) '+pct(mean('onlycausal'))+', and LoRA at twice the rank '+pct(mean('lora_2r'))+'; the last two have the same number of trainable parameters as Bitune. Extra capacity lets a causal model build a workaround, slowly and incompletely; seeing the question is what solves it. Unlike the paper, the toy cannot rank Bitune against its ablations: every bidirectional variant hits the ceiling. And here the anti-causal pass works as well as the bidirectional one, because everything a person token needs lies to its right; on real text, where context lies on both sides, the paper found anti-causal no better than causal (Table 8). The toy\'s Bitune ends with α between '+Math.min(...abAll).toFixed(2)+' and '+Math.max(...abAll).toFixed(2)+', leaning bidirectional, where the paper\'s Llama3-8B leans causal (about 0.32). <a href="#" data-tab="t-run">Run Bitune</a> has the per-seed results, the curves and the attention maps.';
  $('toySum').innerHTML='Mean ± SD over 3 seeds: '+ORDER.map(m=>LAB[m]+' '+pct(mean(m))+' ± '+(100*R[m].sd).toFixed(2)).join('; ')+'.';
  // setup facts
  const ck=BTT.check,ov=BTT.overlap,pre=BTT.pretrain[BTT.pretrain.length-1];
  $('ptQf').textContent=pct(pre[3]);
  $('methList').innerHTML=ORDER.map(m=>'<b>'+LAB[m]+'</b> ('+DESC[m]+')').join('; ')+'.';
  $('lrSweep').innerHTML=BTT.lr?Object.entries(BTT.lr).map(([k,v])=>k+': '+pct(v)).join(', ')+'; chosen '+R.lora.lr:'';
  $('overlapNote').innerHTML=ov?ov.test_in_finetune_stream+' of '+fmt(ov.test_unique)+' test prompts occur among the '+fmt(ov.finetune_stream)+' finetuning prompts; the space holds '+sci(ov.prompt_space,1)+' prompts':'';
  if(ck){const w=Math.max(...SHIP.map(n=>ck[n]?ck[n].max_logit_diff:0));$('fwdCheck').innerHTML=ck.verdict+', identical answers on '+SHIP.map(n=>ck[n]?ck[n].same_answer:0).reduce((a,b)=>Math.min(a,b))+' of '+ck[SHIP[0]].prompts+' prompts per model, logits within '+w.toExponential(1)}

  // 1. ask
  const clubSel=$('rqClub');for(let c=0;c<NC;c++){const o=document.createElement('option');o.value=c;o.textContent=V[C0+c];clubSel.appendChild(o)}
  let rnd=mulberry32(7),st={c:0,k:5,ppl:[],m:0};
  const members=c=>{const a=[],b=[];for(let p=0;p<NP;p++)(BT.member(c,p)?a:b).push(p);return [a,b]};
  const pick=(arr,n)=>{const a=arr.slice(),o=[];for(let i=0;i<n;i++)o.push(a.splice(Math.floor(rnd()*a.length),1)[0]);return o};
  function newList(){const [a,b]=members(st.c);const m=pick(a,1)[0],o=pick(b,st.k-1);const at=Math.floor(rnd()*st.k);o.splice(at,0,m);st.ppl=o;st.m=m}
  st.c=Math.floor(rnd()*NC);clubSel.value=st.c;newList();
  const promptIds=(qf)=>qf?[1,BT.IDX['?'],C0+st.c,...st.ppl.map(p=>P0+p)]:[1,...st.ppl.map(p=>P0+p),BT.IDX['?'],C0+st.c];
  function ask(w){const ids=promptIds(false);
    $('rqPrompt').innerHTML=ids.map(i=>V[i]==='<bos>'?'&lt;bos&gt;':(i-P0)===st.m?'<b style="color:var(--good)">'+V[i]+'</b>':V[i]).join(' ')+' &nbsp;→&nbsp; : ?';
    $('rqTruth').innerHTML='The member of '+V[C0+st.c]+' in this list: <b>'+V[P0+st.m]+'</b> (from the membership table). Question-first form: '+promptIds(true).map(i=>V[i]==='<bos>'?'&lt;bos&gt;':V[i]).join(' ')+'.';
    const vs=SHIP.filter(n=>n!=='lora_qfirst').concat(SHIP.includes('lora_qfirst')?['lora_qfirst']:[]);
    const rows=vs.map(n=>{const r=BT.run(n,promptIds(n==='lora_qfirst'));const pr=r.steps[0].probs;return {n,ans:r.answer,pr:st.ppl.map(p=>pr[P0+p]),other:1-st.ppl.reduce((s,p)=>s+pr[P0+p],0)}});
    const pl=Math.min(170,w*0.36),rh=20,H=rows.length*rh+12,cw=(w-pl-8);let s='';
    rows.forEach((r,i)=>{const y=6+i*rh;let x=pl;s+=tx(pl-6,y+13,LAB[r.n],{fs:11,a:'end',w:r.n==='bitune'?600:null});
      r.pr.forEach((p,j)=>{const ww=cw*p,isM=st.ppl[j]===st.m;s+=rc(x,y+2,Math.max(0,ww-0.5),14,isM?'var(--good)':'var(--bad)',{r:1,op:isM?.9:.35+0.5*(j%2)})+(ww>34?tx(x+3,y+13,V[P0+st.ppl[j]],{fs:11,c:'#fff'}):'')+'<title>'+LAB[r.n]+': '+V[P0+st.ppl[j]]+' '+pct(p)+'</title>';x+=ww});
      s+=rc(x,y+2,Math.max(0,cw*r.other),14,'var(--dim)',{r:1});
      const pm=r.pr[st.ppl.indexOf(st.m)];s+='<title>'+LAB[r.n]+': '+pct(pm)+' on the member</title>'});
    $('rqSvg').innerHTML=svgW(w,H,s,'Answer probabilities')}
  clubSel.addEventListener('change',()=>{st.c=+clubSel.value;newList();refit($('rqSvg'));drawRA()});
  $('rqK').addEventListener('change',()=>{st.k=+$('rqK').value;newList();refit($('rqSvg'));drawRA()});
  $('rqNew').addEventListener('click',()=>{newList();refit($('rqSvg'));drawRA()});
  $('rqMove').addEventListener('click',()=>{const i=st.ppl.indexOf(st.m),j=(i+1)%st.k;[st.ppl[i],st.ppl[j]]=[st.ppl[j],st.ppl[i]];refit($('rqSvg'));drawRA()});

  // 2. look inside
  const raVar=$('raVar');SHIP.forEach(n=>{const o=document.createElement('option');o.value=n;o.textContent=LAB[n];raVar.appendChild(o)});raVar.value='bitune';
  function grid(att,rowsLab,colsLab,x0,y0,cs,title,hh){let s=tx(x0,y0-6,title,{fs:11,w:600});
    const n=att.length?att[0][0].length:0;
    rowsLab.forEach((rl,i)=>{s+=tx(x0-4,y0+i*cs+cs*0.7,rl,{fs:11,a:'end',c:'var(--mute)'});
      for(let j=0;j<colsLab.length;j++){let a=0;if(hh<0){for(let h=0;h<att.length;h++)a+=att[h][i][j];a/=att.length}else a=att[hh][i][j];
        s+=rc(x0+j*cs,y0+i*cs,cs-1,cs-1,a>0?'var(--acc)':'var(--soft)',{r:1,op:a>0?Math.max(.06,Math.min(1,a*1.6)):1})+'<title>'+rl+' → '+colsLab[j]+': '+(100*a).toFixed(1)+'%</title>'}});
    colsLab.forEach((cl,j)=>s+='<text font-size="11" fill="var(--mute)" transform="translate('+(x0+j*cs+cs*0.7)+','+(y0+rowsLab.length*cs+4)+') rotate(60)">'+cl+'</text>');
    return s}
  function drawRA(){const el=$('raSvg'),w=el.clientWidth;if(!w)return;const n=raVar.value,l=+$('raL').value,hh=+$('raH').value,qf=n==='lora_qfirst',ids=promptIds(qf),r=BT.run(n,ids);
    const lab=ids.map(i=>V[i].replace('<bos>','bos'));const T=ids.length;
    const panels=r.passes.map(p=>({att:p.att[l],title:(p.mask==='causal'?'causal':p.mask==='bidir'?'bidirectional':'anti-causal')+' pass ('+p.adapter+' adapter)'}));
    const ansAtt=r.steps[0].att[l];
    const cols=panels.length+1,narrow=w<620,cs=Math.max(12,Math.min(22,Math.floor((narrow?w-60:(w-60*cols)/cols)/(T+0.5))));
    let s='',x=56,y=24,H=0;
    panels.forEach(p=>{s+=grid(p.att,lab,lab,x,y,cs,p.title,hh);if(narrow){y+=T*cs+70}else x+=T*cs+60});
    s+=grid(ansAtt.map(hd=>[hd[0]]),[':'],lab,x,y,cs,'answer ":" reads the '+(panels.length>1?'mixed ':'')+'cache',hh);
    H=narrow?y+cs+60:24+T*cs+60;
    el.innerHTML=svgW(w,H,s,'Attention maps');
    const pm=r.steps[0].probs[P0+st.m];
    // where do person tokens look in the bidirectional pass?
    let msg='Answer: <b>'+V[r.answer]+'</b> ('+pct(pm)+' on the member, '+V[P0+st.m]+'). ';
    const bi=r.passes.find(p=>p.mask==='bidir');
    if(bi){const ci=ids.indexOf(C0+st.c);let tot=0;st.ppl.forEach(p=>{const i=ids.indexOf(P0+p);let a=0;for(let h=0;h<4;h++)a+=bi.att[l][h][i][ci];tot+=a/4});
      msg+='In this block\'s bidirectional pass the person tokens put on average <b>'+pct(tot/st.k)+'</b> of their attention on the club token that comes after them, which the causal pass cannot do. '}
    $('raOut').innerHTML=msg;
    const al=r.alpha,ra=$('raAl');
    if(al){const ww=ra.clientWidth||w,L=al[0].length,bw=Math.min(60,(ww-150)/(2*L+2));let s2=tx(0,12,'learned α (share of bidirectional features) per block',{fs:11,w:600});
      const Y=v=>110-90*v;[0,0.5,1].forEach(t=>s2+=ln2(40,Y(t),40+(2*L+1)*bw+10,Y(t),'var(--line)')+tx(34,Y(t)+4,t.toFixed(1),{fs:11,a:'end',c:'var(--mute)'}));
      for(let i=0;i<L;i++){s2+=rc(44+i*2*bw,Y(al[0][i]),bw-2,Y(0)-Y(al[0][i]),'var(--c1)',{r:1})+rc(44+i*2*bw+bw,Y(al[1][i]),bw-2,Y(0)-Y(al[1][i]),'var(--c2)',{r:1})+tx(44+i*2*bw+bw,124,'block '+(i+1),{fs:11,a:'middle',c:'var(--mute)'})}
      const pk=window.PAPER.rc.fig3;s2+=ln2(40,Y(pk.mean_k),44+2*L*bw,Y(pk.mean_k),'var(--ink)',{da:'4 3'})+tx(48+2*L*bw,Y(pk.mean_k)+4,'paper, Llama3-8B mean '+pk.mean_k.toFixed(2),{fs:11,c:'var(--mute)'});
      const lg=legend([['keys','var(--c1)'],['values','var(--c2)']],48+2*L*bw,40,140);
      ra.innerHTML=svgW(ww,132,s2+lg.s,'Learned mixing ratios')+'<p class="small">'+al[0].map((a,i)=>'block '+(i+1)+': α<sub>k</sub> '+a.toFixed(2)+', α<sub>v</sub> '+al[1][i].toFixed(2)).join('; ')+'. All start at 0.5.</p>'}
    else ra.innerHTML='<p class="small mute">This model has one prompt pass, so nothing is mixed.</p>'}
  ['raVar','raL','raH'].forEach(id=>$(id).addEventListener('change',drawRA));

  // 3. results
  function results(w){const H=ORDER.length*24+40,pl=Math.min(190,w*0.42),X0=0.8,X=v=>pl+(w-pl-56)*(Math.max(v,X0)-X0)/(1-X0);let s='';
    [0.8,0.85,0.9,0.95,1].forEach((t,q)=>s+=ln2(X(t),4,X(t),H-26,'var(--line)')+tx(X(t),H-10,(100*t)+'%',{fs:11,a:q===4?'end':'middle',c:'var(--mute)'}));
    ORDER.forEach((m,i)=>{const y=8+i*24,r=R[m],c=m==='bitune'?'var(--good)':m==='lora_qfirst'?'var(--mute)':/naive|nomix|shared|anti|onlycausal/.test(m)?'var(--acc)':'var(--c2)';
      s+=tx(pl-6,y+12,LAB[m],{fs:11,a:'end',w:m==='bitune'?600:null})+rc(X(0),y+2,X(r.mean)-X(0),13,c,{r:2,op:.35});
      r.test.forEach(t=>s+='<circle cx="'+X(t).toFixed(1)+'" cy="'+(y+8.5)+'" r="3.5" fill="'+c+'"><title>'+LAB[m]+' seed: '+pct(t)+'</title></circle>');
      s+=tx(w-2,y+12,pct(r.mean),{fs:11,a:'end',c:'var(--mute)'})});
    $('rrSvg').innerHTML=svgW(w,H,s,'Toy results');
    const b=R.bitune,l=R.lora;let o='Bitune <b>'+pct(b.mean)+'</b> ± '+(100*b.sd).toFixed(1)+' against LoRA <b>'+pct(l.mean)+'</b> ± '+(100*l.sd).toFixed(1)+' (mean ± SD of 3 seeds). ';
    if(R.lora_2r)o+='Doubling LoRA\'s rank: '+pct(R.lora_2r.mean)+'. ';
    if(b.test_quantised!=null)o+='6-bit quantisation of the shipped seed-0 models costs at most '+Math.max(...SHIP.map(n=>Math.abs(R[n].test[0]-R[n].test_quantised)*100)).toFixed(1)+' points (Bitune: '+pct(b.test[0])+' before, '+pct(b.test_quantised)+' after). ';
    $('rrOut').innerHTML=o}
  const rcSel=$('rrCurve');ORDER.forEach(m=>{const o=document.createElement('option');o.value=m;o.textContent=LAB[m];rcSel.appendChild(o)});rcSel.value='bitune';
  function curves(w){const m=rcSel.value,H=226,pl=40,pr=14,pt=10,pb=58,X=v=>pl+(w-pl-pr)*v/3000,Y=v=>pt+(H-pt-pb)*(1-v);let s='';
    [0,0.5,1].forEach(t=>s+=ln2(pl,Y(t),w-pr,Y(t),'var(--line)')+tx(pl-6,Y(t)+4,(100*t)+'%',{fs:11,a:'end',c:'var(--mute)'}));
    [0,1000,2000,3000].forEach((t,q)=>s+=tx(X(t),H-pb+16,fmt(t),{fs:11,a:q===3?'end':'middle',c:'var(--mute)'}));s+=tx((pl+w-pr)/2,H-pb+30,'finetuning step',{fs:11,a:'middle',c:'var(--mute)'});
    const cl=['var(--c1)','var(--c2)','var(--c3)'];
    const draw=(mm,op,dash)=>R[mm].curves.forEach((cv,k)=>s+='<polyline fill="none" stroke="'+(mm===m?cl[k]:'var(--mute)')+'" stroke-width="'+(mm===m?2:1.2)+'" opacity="'+op+'"'+(dash?' stroke-dasharray="4 3"':'')+' points="'+cv.map(p=>X(p[0]).toFixed(1)+','+Y(p[2]).toFixed(1)).join(' ')+'"/>');
    if(m!=='lora')draw('lora',.5,true);draw(m,1,false);
    const lg=legend([['seed 0','var(--c1)'],['seed 1','var(--c2)'],['seed 2','var(--c3)']].concat(m!=='lora'?[['LoRA, for reference','var(--mute)','4 3']]:[]),pl,H-12,w-pl-pr);
    $('rcSvg').innerHTML=svgW(w,H,s+lg.s,'Training curves')}
  rcSel.addEventListener('change',()=>refit($('rcSvg')));

  // 4. test in the browser
  const rtVar=$('rtVar');SHIP.forEach(n=>{const o=document.createElement('option');o.value=n;o.textContent=LAB[n];rtVar.appendChild(o)});rtVar.value='bitune';
  $('rtGo').addEventListener('click',()=>{const n=rtVar.value,N=+$('rtN').value,r2=mulberry32(Date.now()%100000);let ok=0,i=0;const t0=performance.now();$('rtGo').disabled=true;
    const step=()=>{const end=Math.min(N,i+25);for(;i<end;i++){const c=Math.floor(r2()*NC),k=3+Math.floor(r2()*4),[a,b]=members(c);
        const m=a[Math.floor(r2()*a.length)],bb=b.slice(),o=[];for(let j=0;j<k-1;j++)o.push(bb.splice(Math.floor(r2()*bb.length),1)[0]);o.splice(Math.floor(r2()*k),0,m);
        const ids=n==='lora_qfirst'?[1,BT.IDX['?'],C0+c,...o.map(p=>P0+p)]:[1,...o.map(p=>P0+p),BT.IDX['?'],C0+c];
        if(BT.run(n,ids).answer===P0+m)ok++}
      $('rtOut').innerHTML=LAB[n]+': <b>'+ok+' of '+i+'</b> correct ('+pct(ok/i)+') in '+((performance.now()-t0)/1000).toFixed(1)+' s. PyTorch, the same 6-bit model on 2,000 prompts: '+pct(R[n].test_quantised)+'.';
      if(i<N)setTimeout(step,0);else $('rtGo').disabled=false};step()});

  // limits
  $('toyLim').innerHTML='It can test the mechanism: whether features of early prompt tokens that cannot see a later question limit what a causally pretrained model can learn with small adapters, and whether a bidirectional pass with its own weights fixes that. It is built so that it should: the pretrained model knows each fact only when the club comes first, and the instruction template puts the club last. So a large gap here shows the mechanism works as described, not how large the benefit is on real instructions, where most of the needed context is often already to the left. It cannot test scale, natural language, multiple choice by log-likelihood, or generation of long answers. The pretrained model was trained '+(ov?'on '+fmt(ov.pretrain_qfirst_examples)+' question-first examples; '+ov.test_list_seen_in_pretraining_qfirst+' of the test lists (club plus people in order) appeared among them in the other order':'')+'.';

  onTab('t-run',()=>{fit($('rqSvg'),ask);fit($('rrSvg'),results);fit($('rcSvg'),curves);drawRA()});
  window.BT_STATE=()=>({ids:promptIds(false),member:st.m});
})();
