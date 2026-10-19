// ---- Session cost tab ----
(function(){
  let mode='fixed';
  const g=id=>+$(id).value;
  // returns {write, read, inp, out, total, full}
  function bill(p,P,T,N,O,o){
    const tokF=o.tok&&p.old?1/1.3:1; // same text: the old tokenizer counts about 30% fewer tokens
    P*=tokF;N*=tokF;O*=tokF;
    const bm=o.batch?0.5:1,wm=o.h1?2:1.25,i=p.i*bm,oo=p.o*bm,c=p.c*bm,w=wm*p.i*bm;let r={write:0,read:0,inp:0,out:0,full:null};
    if(mode==='none'){r.inp=T*(P+N)*i;r.out=T*O*oo;
      if(P+N>p.win)r.full=1}
    else if(mode==='fixed'){r.write=o.warm?0:P*w;r.read=T*P*c;r.inp=T*N*i;r.out=T*O*oo;if(P+N>p.win)r.full=1}
    else{for(let t=1;t<=T;t++){const ctx=P+(t-1)*(N+O)+N;if(ctx>p.win&&r.full==null)r.full=t;
        if(t===1){if(o.warm){r.read+=P*c;r.write+=N*w}else r.write+=(P+N)*w}else{r.read+=(P+(t-2)*(N+O)+N)*c;r.write+=(O+N)*w}r.out+=O*oo}}
    Object.keys(r).forEach(k=>{if(k!=='full')r[k]/=1e6});r.total=r.write+r.read+r.inp+r.out;return r}
  function preset(m){const set=(id,v)=>{$(id).value=v};
    if(m==='page'){set('scP',100000);set('scT',50);set('scN',5000);set('scO',2000);$('scWarm').checked=false;mode='fixed'}
    if(m==='agentic'){set('scP',230000);set('scT',80);set('scN',4000);set('scO',1500);$('scWarm').checked=false;mode='fixed'}
    if(m==='managed'){set('scP',40000);set('scT',1);set('scN',10000);set('scO',15000);$('scWarm').checked=true;mode='fixed'}
    $('sc1h').checked=false;$('scBatch').checked=false;$('scTok').checked=false;
    $('scMode').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m===mode));draw()}
  function draw(){
    const P=g('scP'),T=g('scT'),N=g('scN'),O=g('scO'),o={h1:$('sc1h').checked,batch:$('scBatch').checked,warm:$('scWarm').checked,tok:$('scTok').checked};
    $('scPv').textContent=fmt(P);$('scTv').textContent=fmt(T);$('scNv').textContent=fmt(N);$('scOv').textContent=fmt(O);
    const rs=PRICES.map(p=>({p,r:bill(p,P,T,N,O,o)}));const mx=Math.max(...rs.map(x=>x.r.total))||1;
    const C=[['write','cache write','var(--c5)'],['read','cache read','var(--good)'],['inp','uncached input','var(--c1)'],['out','output','var(--c4)']];
    let h='<div class="leg">'+C.map(([k,l,c])=>'<span><i style="background:'+c+';height:10px"></i>'+l+'</span>').join('')+'</div><div class="split" style="grid-template-columns:minmax(0,11em) minmax(0,1fr)">';
    rs.forEach(({p,r})=>{h+='<span'+(p.cur?' style="font-weight:600"':'')+'>'+(p.s||p.n)+'<br><span class="mute">'+usd(r.total,r.total<10?3:2)+(r.full?' · window full'+(mode==='grow'?' at turn '+r.full:''):'')+'</span></span><div class="sb" style="height:20px;width:'+Math.max(1,100*r.total/mx).toFixed(1)+'%">'+C.map(([k,l,c])=>r[k]>0?'<span style="width:'+(100*r[k]/r.total).toFixed(2)+'%;background:'+c+'" title="'+l+' '+usd(r[k],3)+'"></span>':'').join('')+'</div>'});
    $('scBars').innerHTML=h+'</div>';
    const f51=rs.find(x=>x.p.n==='Fable 5.1').r,f5=rs.find(x=>x.p.n==='Fable 5').r,o55=rs.find(x=>x.p.n==='Opus 5.5').r,o5=rs.find(x=>x.p.n.startsWith('Opus 5 ')).r,hk=rs.find(x=>x.p.n==='Haiku 4.5').r;
    const sv=f5.total?1-f51.total/f5.total:0,share=f5.total?f5.read/f5.total:0;
    $('scStats').innerHTML=stat('Fable 5 to 5.1 saving',(100*sv).toFixed(1)+'%','cache reads are '+(100*share).toFixed(1)+'% of the Fable 5 bill; saving = 0.75 × that')+
      stat('Opus 5.5 against Opus 5',(o5.total?100*(1-o55.total/o5.total):0).toFixed(1)+'% cheaper','same tokens, price list only')+
      stat('Output share on Fable 5.1',(f51.total?100*f51.out/f51.total:0).toFixed(0)+'%','the part effort controls')+
      stat('Haiku 4.5 window',hk.full?(mode==='grow'?'full at turn '+hk.full:'exceeded'):'fits','200K tokens; the 5.x models have 1M');
    $('scHow').innerHTML=mode==='fixed'?'<b>Formula.</b> C = (P w + T (P c + N i + O o)) / 10<sup>6</sup>, with w = '+(o.h1?'2':'1.25')+' i'+(o.warm?', and no write because the prefix is already cached':'')+'. The prefix is fixed and the cache stays warm.':
      mode==='grow'?'<b>Growing context.</b> Turn t sends P + (t − 1)(N + O) + N tokens. Turn 1 writes P + N to the cache; every later turn reads what the previous request cached, P + (t − 2)(N + O) + N, and writes what is new since then: the previous output O and the new input N. Output stays in context, as it does on current models that keep thinking blocks.':
      '<b>No caching.</b> Every turn bills P + N at the input price and O at the output price: C = T ((P + N) i + O o) / 10<sup>6</sup>.';
    const isPage=P===100000&&T===50&&N===5000&&O===2000&&!o.h1&&!o.batch&&!o.warm&&!o.tok,isMan=P===40000&&T===1&&N===10000&&O===15000&&o.warm&&!o.h1&&!o.batch&&!o.tok;
    let rep='';
    if(mode==='fixed'&&isPage)rep='Defaults reproduce the page\'s worked example (by construction: same formula and prices): Fable 5.1 $10.00, Fable 5 $13.75, Opus 5.5 $4.50, Opus 5 $6.875, Sonnet 5.5 $2.75, Haiku 4.5 $1.375. The 27.3% Fable saving is close to, but not the same thing as, Anthropic\'s "around 25%", which Anthropic measured on four weeks of real August 2026 usage ({{Anthropic|@fab51}}).';
    else if(mode==='fixed'&&isMan)rep='Reproduces the pricing page\'s Claude Managed Agents example for Opus 5 (by construction): $0.445 of tokens; the page adds $0.08 of session runtime for $0.525 ({{pricing|@pricing}}).';
    else if(mode==='none'&&isPage)rep='Reproduces the page\'s "Fable 5.1 with no caching" line: $57.50, almost six times the cached $10.00.';
    else rep='Anthropic\'s Fable 5.1 chart: typical workloads 100 to 75 (cache reads a third of the Fable 5 bill), highly agentic 100 to 55 (cache reads 60% of it). Your mix: cache reads '+(100*share).toFixed(0)+'% of the Fable 5 bill, saving '+(100*sv).toFixed(0)+'%.';
    $('scRep').innerHTML=rep;
  }
  segBind('scMode',m=>{mode=m;draw()});
  ['scP','scT','scN','scO'].forEach(id=>$(id).addEventListener('input',draw));['sc1h','scBatch','scWarm','scTok'].forEach(id=>$(id).addEventListener('change',draw));
  $('scPre').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>preset(b.dataset.m)));
  onTab('t-cost',draw);
})();
