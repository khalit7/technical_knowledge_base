// ---- The paper tab: recounted parameters, the fill-in reveal (the leak stage and Figure 2 are 3D scenes, 32_js_sc_mlm.js and 33_js_sc_emb.js),
// the masking widget, the three predict reveals and Figure 5 ----
const RC=PAPER.rc,TB=PAPER.tables;
const fM=v=>(v/1e6).toFixed(1)+'M';
// horizontal bars at measured width: items [{t, p (0..1 or value), c, lab}]
function hbars(el,title,items,o){o=o||{};fit(el,w=>{let lw=Math.min(o.lw||110,w*.38);const rw=o.rw||46,bh=18,top=title?22:4;
  // stacked when a label would not fit beside its bar (narrow screens): label on its own line above the bar
  const st=items.some(x=>String(x.t).length*6.6>lw-6),gap=st?20:6,off=st?16:0;if(st)lw=0;
  const H=top+items.length*(bh+gap)+4,mx=o.max||Math.max(...items.map(x=>Math.abs(x.p)),1e-9);
  let s=title?tx(0,14,title,{fs:12,w:600}):'';
  items.forEach((x,i)=>{const y=top+i*(bh+gap)+off,bw=Math.max(0,(w-lw-rw-8)*Math.abs(x.p)/mx);
    s+=(st?tx(0,y-4,x.t,{fs:12}):tx(lw-6,y+13,x.t,{fs:12,a:'end'}))+rc(lw,y,bw,bh,x.c||'var(--acc)',{r:3})+tx(lw+bw+5,y+13,x.lab!=null?x.lab:(x.p*100).toFixed(1)+'%',{fs:11,c:'var(--mute)'})});
  el.innerHTML=svgW(w,H,s,title||'bars')})}

(function(){
  const p=RC.params;
  $('pcB').textContent=fM(p.base_30522);$('pcL').textContent=fM(p.large_30522);$('pcG').textContent=fM(p.gpt1);
})();

// ---- live numbers from the toy models for the fill-in question ----
function toyFill(sentence,t){const B=BM.load('bert'),Lm=BM.load('ltr');const w=sentence.slice();const mw=w.slice();mw[t-1]='[MASK]';
  const rb=BM.run(B,mw),rl=BM.run(Lm,w);return {bert:BM.fill(B,rb,t),ltr:BM.fill(Lm,rl,t)}}
const top5=pr=>pr.map((p,i)=>({i,p})).sort((a,b)=>b.p-a.p).slice(0,5).map(x=>({t:BM.vocab[x.i],p:x.p}));

// ---- predict: fill in the blank ----
PRED_REVEAL['pr-fill']=function(){const go=()=>{const v=$('pfV').value,s=('the big cat '+v+' at the farmer').split(' ');const f=toyFill(s,3);
  hbars($('pfA'),'Bidirectional (toy BERT)',top5(f.bert).map(x=>({t:x.t,p:x.p,c:LANG.ANIMALS[x.t]===v?'var(--good)':'var(--acc)'})),{max:1});
  hbars($('pfB'),'Left to right (toy LTR)',top5(f.ltr).map(x=>({t:x.t,p:x.p,c:LANG.ANIMALS[x.t]===v?'var(--good)':'var(--c2)'})),{max:1})};
  $('pfV').addEventListener('change',go);go()};

// ---- the masking widget: the paper's rule on a toy pretraining pair, with the toy BERT's predictions ----
(function(){
  const PAIRS=[['they say austin is a city','we flew to austin','IsNext'],['the big dog barked at the farmer','the dog barked again','IsNext'],
    ['i met jordan yesterday','jordan has a cold','IsNext'],['paris has a castle','the lazy cow mooed near the child','NotNext'],['we called sydney','florence flooded today','NotNext']];
  const sel=$('mkP');PAIRS.forEach((p,i)=>{const o=document.createElement('option');o.value=i;o.textContent=p[0]+' | '+p[1]+' ('+p[2]+')';sel.appendChild(o)});
  let rng=mulberry32(11);
  function maskIt(ids,r){const cand=[];ids.forEach((t,i)=>{if(t!==1&&t!==2)cand.push(i)});const n=Math.max(1,Math.round(cand.length*.15));
    const pick=[],c=cand.slice();for(let k=0;k<n;k++){const j=Math.floor(r()*c.length);pick.push(c.splice(j,1)[0])}pick.sort((a,b)=>a-b);
    const x=ids.slice(),kind={};pick.forEach(i=>{const u=r();if(u<.8){x[i]=3;kind[i]='mask'}else if(u<.9){x[i]=4+Math.floor(r()*(BM.vocab.length-4));kind[i]='random'}else kind[i]='same'});return {x,pick,kind}}
  function go(){const P=PAIRS[+sel.value],a=P[0].split(' '),b=P[1].split(' '),pk=BM.pack(a,b),m=maskIt(pk.ids,rng);
    const B=BM.load('bert'),n=a.length+2,wa=m.x.slice(1,n-1).map(i=>BM.vocab[i]),wb=m.x.slice(n,-1).map(i=>BM.vocab[i]);
    const R=BM.run(B,wa,wb);const K={mask:'[MASK]',random:'random word',same:'kept'};
    $('mkSeq').innerHTML='<div class="sent">'+m.x.map((id,i)=>{const k=m.kind[i];return '<span class="w'+(k?' cur':'')+'">'+BM.vocab[id]+(k?'<small>'+K[k]+(k!=='same'?': '+BM.vocab[pk.ids[i]]:'')+'</small>':'<small>'+(pk.seg[i]?'B':'A')+'</small>')+'</span>'}).join('')+'</div>';
    let h='';m.pick.forEach(i=>{const pr=BM.softmax(Array.from(R.lm[i]).map((v,j)=>j<4?-1e9:v));let bi=4;for(let j=4;j<pr.length;j++)if(pr[j]>pr[bi])bi=j;
      const ok=bi===pk.ids[i];h+=stat('Position '+i+' ('+K[m.kind[i]]+')',BM.vocab[bi]+' <span class="small mute">'+(pr[bi]*100).toFixed(0)+'%</span>','answer '+BM.vocab[pk.ids[i]]+(ok?' <span class="ok">✓</span>':' <span class="no">✗</span>'))});
    h+=stat('NSP: P(IsNext)',(R.nsp[1]*100).toFixed(0)+'%','true label '+P[2]);$('mkOut').innerHTML=h;
    // tally of the rule over 10,000 draws
    const r2=mulberry32(5);let tot=0,c={mask:0,random:0,same:0};for(let k=0;k<10000;k++){const z=maskIt(pk.ids,r2);Object.values(z.kind).forEach(v=>c[v]++);tot+=pk.ids.length-2}
    const sh=v=>(100*v/tot).toFixed(2)+'%';$('mkTally').innerHTML='<p class="small mute">Over 10,000 draws on this pair: '+sh(c.mask+c.random+c.same)+' of the '+(pk.ids.length-2)+' word positions predicted ('+sh(c.mask)+' masked, '+sh(c.random)+' random, '+sh(c.same)+' kept). Short sequences round the 15% up: at least one position is always chosen.</p>'}
  sel.addEventListener('change',go);$('mkR').addEventListener('click',go);go()})();

// ---- predict: the left-to-right tagger on right-cue names ----
PRED_REVEAL['pr-tag']=function(){const R=RES.tok,g=(v,k)=>R.mean[v]&&R.mean[v][128]?R.mean[v][128][k]:NaN;
  hbars($('ptOut'),'Name tagging accuracy, 128 labelled sentences',[
    {t:'BERT, cue after',p:g('bert','R'),c:'var(--c1)'},{t:'LTR, cue after',p:g('ltr','R'),c:'var(--c2)'},
    {t:'BERT, cue before',p:g('bert','L'),c:'var(--c1)'},{t:'LTR, cue before',p:g('ltr','L'),c:'var(--c2)'},
    {t:'LTR, whole sentence',p:RES.sent.mean.ltr[128].R,c:'var(--c3)',lab:(RES.sent.mean.ltr[128].R*100).toFixed(1)+'% (cue after)'}],{max:1,lw:150,rw:120})};

// ---- predict: Table 5 decomposed ----
PRED_REVEAL['pr-t5']=function(){const E=RC.t5_effects,el=$('t5Bars');
  fit(el,w=>{const cols=E.cols,ser=[['NSP',E.nsp,'var(--c3)'],['Bidirectionality',E.bidirectional,'var(--c2)'],['+ BiLSTM recovers',E.bilstm_recovers,'var(--c4)']];
    const lw=64,top=34,gh=3*15+12,H=top+cols.length*gh,x0=lw+(w-lw)*.18,sc=(w-x0-40)/10.5;let s='';
    const lg=legend(ser.map(x=>[x[0],x[2]]),0,12,w);s+=lg.s;const t2=top+lg.h-14;
    cols.forEach((c,ci)=>{const y=t2+ci*gh;s+=tx(lw-6,y+24,c,{fs:12,a:'end'});
      ser.forEach(([nm,v,col],k)=>{const val=v[ci],yy=y+k*15+2,bw=Math.abs(val)*sc;s+=rc(val>=0?x0:x0-bw,yy,bw,12,col,{r:2})+tx(val>=0?x0+bw+4:x0-bw-4,yy+10,(val>0?'+':'')+val.toFixed(1),{fs:11,a:val>=0?'start':'end',c:'var(--mute)'})})});
    s+=ln2(x0,t2-4,x0,t2+cols.length*gh,'var(--mute)');
    el.innerHTML=svgW(w,t2+cols.length*gh+6,s,'Table 5 differences')})};

// ---- Figure 5, decoded ----
function fig5(el,series,o){fit(el,w=>{const H=230,pl=40,pr=118,pt=14,pb=34;const xs=series[0].x;const xmax=o.xmax,ymin=o.y[0],ymax=o.y[1];
  const X=v=>pl+(w-pl-pr)*v/xmax,Y=v=>pt+(H-pt-pb)*(1-(v-ymin)/(ymax-ymin));let s='';
  for(let v=ymin;v<=ymax+1e-9;v+=o.ystep){s+=ln2(pl,Y(v),w-pr,Y(v),'var(--line)')+tx(pl-5,Y(v)+4,o.yf?o.yf(v):v,{fs:11,a:'end',c:'var(--mute)'})}
  o.xt.forEach(v=>{s+=tx(X(v),H-pb+15,o.xf?o.xf(v):v,{fs:11,a:'middle',c:'var(--mute)'})});s+=tx((pl+w-pr)/2,H-4,o.xl,{fs:11,a:'middle',c:'var(--mute)'});
  const ends=[];series.forEach(S=>{let d='';S.x.forEach((x,i)=>{d+=(i?'L':'M')+X(x).toFixed(1)+','+Y(S.y[i]).toFixed(1)});s+='<path d="'+d+'" fill="none" stroke="'+S.c+'" stroke-width="2"'+(S.da?' stroke-dasharray="'+S.da+'"':'')+'/>';
    S.x.forEach((x,i)=>{s+='<circle cx="'+X(x).toFixed(1)+'" cy="'+Y(S.y[i]).toFixed(1)+'" r="3" fill="'+S.c+'"><title>'+S.n+': '+(o.yf?o.yf(S.y[i]):S.y[i])+' at '+(o.xf?o.xf(x):x)+'</title></circle>'});
    ends.push({y:Y(S.y[S.y.length-1]),n:S.n,c:S.c,how:S.n})});
  s+=endLabels(ends,w-pr+6,14);el.innerHTML=svgW(w,H,s,o.label||'chart')})}
(function(){const F=RC.fig5;const go=()=>fig5($('f5r'),[{n:'Masked LM',x:F.steps_k,y:F.mlm,c:'var(--c1)'},{n:'Left to right',x:F.steps_k,y:F.ltr,c:'var(--c2)'}],
  {xmax:1000,y:[78,85],ystep:1,xt:[0,200,400,600,800,1000],xl:'pretraining steps (thousands); MNLI dev accuracy, BERT-Base',label:'Figure 5 rebuilt'});onTab('t-read',go);go()})();
