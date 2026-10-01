// ---- Parameters and memory tab: parameter tables from config.json, checkpoint bytes, cache against context ----
(function(){
  if(!$('t-par'))return;
  const V=163840,d=7168;
  // K3 (config.json text_config + modeling_kimi_linear.py shapes)
  const K3={L:93,nK:69,nM:24,H:96,hd:128,E:896,k:16,lat:3584,fi:3072,ns:2,dense:33792,r:512,rope:64,ql:1536,conv:4};
  const P3=K3.H*K3.hd;
  const kdaL=3*d*P3+3*P3*K3.conv+K3.H+d*K3.hd+K3.hd*P3+P3+d*K3.H+d*P3+K3.hd+P3*d;
  const qh=128+64,mla=(r,ql,nh)=>d*ql+ql+ql*nh*qh+d*(r+64)+r+r*nh*(128+128)+nh*128*d;
  const mla3=mla(K3.r,K3.ql,K3.H)+d*P3; // + full-rank output gate
  const exp3=3*K3.lat*K3.fi,nMoE3=K3.L-1;
  const HF3={F32:11122432,BF16:57179884544,U8:2722740830208,total:2779931837184,bytes:1560860324864};
  // K2 (config.json)
  const K2={L:61,H:64,E:384,k:8,fi:2048,ns:1,dense:18432};
  const mla2=mla(512,1536,64),exp2=3*d*K2.fi,nMoE2=K2.L-1;
  const HF2={total:1026408235864,bytes:1029173256720};
  function parts(m){
    if(m==='k3'){const vis=HF3.BF16+HF3.F32-(K3.nK*kdaL+K3.nM*mla3+nMoE3*(3*d*K3.fi*K3.ns+2*d*K3.lat+K3.lat+K3.E*d+K3.E)+3*d*K3.dense+K3.L*6*d+2*V*d+3*d);
      return [
      {n:'Routed experts',f:'92 layers × 896 × 3 × 3,584 × 3,072',t:nMoE3*K3.E*exp3,a:nMoE3*K3.k*exp3,p:'mx'},
      {n:'Shared experts',f:'92 × 3 × 7,168 × (2 × 3,072)',t:nMoE3*3*d*K3.fi*K3.ns,a:nMoE3*3*d*K3.fi*K3.ns},
      {n:'Latent projections W↓, W↑',f:'92 × (2 × 7,168 × 3,584 + 3,584)',t:nMoE3*(2*d*K3.lat+K3.lat),a:nMoE3*(2*d*K3.lat+K3.lat)},
      {n:'Routers',f:'92 × (896 × 7,168 + 896)',t:nMoE3*(K3.E*d+K3.E),a:nMoE3*(K3.E*d+K3.E)},
      {n:'Dense first-layer MLP',f:'3 × 7,168 × 33,792',t:3*d*K3.dense,a:3*d*K3.dense},
      {n:'KDA attention (69 layers)',f:'69 × '+fmt(kdaL)+' (q, k, v, convs, gates, output)',t:K3.nK*kdaL,a:K3.nK*kdaL},
      {n:'Gated MLA attention (24 layers)',f:'24 × '+fmt(mla3)+' (MLA + output gate)',t:K3.nM*mla3,a:K3.nM*mla3},
      {n:'Norms and AttnRes pseudo-queries',f:'93 × 6 × 7,168 + 3 × 7,168',t:K3.L*6*d+3*d,a:K3.L*6*d+3*d},
      {n:'Input embedding',f:'163,840 × 7,168',t:V*d,a:0,note:'a lookup, not counted as active'},
      {n:'Output head',f:'163,840 × 7,168',t:V*d,a:V*d},
      {n:'Vision encoder and projector',f:'Hugging Face BF16 + F32 count minus the text parts above',t:vis,a:0,note:'derived remainder; the card lists a 401M encoder'}]}
    return [
      {n:'Routed experts',f:'60 layers × 384 × 3 × 7,168 × 2,048',t:nMoE2*K2.E*exp2,a:nMoE2*K2.k*exp2,p:'mx'},
      {n:'Shared expert',f:'60 × 3 × 7,168 × 2,048',t:nMoE2*exp2,a:nMoE2*exp2},
      {n:'Routers',f:'60 × (384 × 7,168 + 384)',t:nMoE2*(K2.E*d+K2.E),a:nMoE2*(K2.E*d+K2.E)},
      {n:'Dense first-layer MLP',f:'3 × 7,168 × 18,432',t:3*d*K2.dense,a:3*d*K2.dense},
      {n:'MLA attention (61 layers)',f:'61 × '+fmt(mla2),t:K2.L*mla2,a:K2.L*mla2},
      {n:'Norms',f:'61 × 2 × 7,168 + 7,168',t:K2.L*2*d+d,a:K2.L*2*d+d},
      {n:'Input embedding',f:'163,840 × 7,168',t:V*d,a:0,note:'a lookup, not counted as active'},
      {n:'Output head',f:'163,840 × 7,168',t:V*d,a:V*d},
      {n:'MTP module (not in the release)',f:'one MLA + MoE layer + 2 × 7,168² projection',t:mla2+K2.E*exp2+exp2+K2.E*d+K2.E+2*d*d+4*d,a:mla2+K2.k*exp2+exp2+K2.E*d+K2.E+2*d*d+4*d,mtp:1,note:'reconstruction: K3\'s report lists 1 MTP layer for K2'}]}
  const B=x=>x>=1e12?(x/1e12).toFixed(4)+'T':x>=1e9?(x/1e9).toFixed(2)+'B':(x/1e6).toFixed(1)+'M';
  let PM='k3',SCH='mx';
  function drawP(){
    const ps=parts(PM),rel=ps.filter(p=>!p.mtp),tot=rel.reduce((s,p)=>s+p.t,0),act=rel.reduce((s,p)=>s+p.a,0);
    let h='<tr><th>Part</th><th>Formula from config.json</th><th class="num">Total</th><th class="num">Active per token</th></tr>';
    ps.forEach(p=>{h+='<tr'+(p.mtp?' class="mute"':'')+'><td>'+p.n+(p.note?'<div class="pt">'+p.note+'</div>':'')+'</td><td class="small">'+p.f+'</td><td class="num">'+B(p.t)+'</td><td class="num">'+(p.a?B(p.a):'0')+'</td></tr>'});
    h+='<tr class="hl2"><td><b>Released checkpoint</b></td><td></td><td class="num"><b>'+B(tot)+'</b></td><td class="num"><b>'+B(act)+'</b></td></tr>';
    if(PM==='k2'){const m=ps.find(p=>p.mtp);h+='<tr><td>With the MTP module</td><td></td><td class="num">'+B(tot+m.t)+'</td><td class="num">'+B(act+m.a)+'</td></tr>'}
    $('ppTab').innerHTML=h;
    // stacked bars of total and active
    const W=Math.max(300,Math.min(860,$('ppBar').clientWidth||700)),cols=['var(--c1)','var(--c3)','var(--c5)','var(--c6)','var(--c4)','var(--c2)','var(--bad)','var(--dim)','var(--mute)','var(--open)','var(--closed)'];
    let s='';[['Total',tot,'t'],['Active',act,'a']].forEach(([lab,sum,key],r)=>{let x=70;const y=10+r*34,w=W-80;s+='<text x="0" y="'+(y+14)+'" font-size="11.5">'+lab+'</text>';
      rel.forEach((p,i)=>{const ww=w*p[key]/sum;if(ww<=0)return;s+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+Math.max(0.5,ww).toFixed(1)+'" height="20" fill="'+cols[i%cols.length]+'"><title>'+p.n+': '+B(p[key])+' ('+(100*p[key]/sum).toFixed(1)+'%)</title></rect>';if(ww>70)s+='<text x="'+(x+4)+'" y="'+(y+14)+'" font-size="10.5" fill="var(--bg)">'+p.n.split(' (')[0]+' '+(100*p[key]/sum).toFixed(0)+'%</text>';x+=ww})});
    $('ppBar').innerHTML=svgEl(W,80,s,'Share of total and active parameters by part');
    $('ppNote').innerHTML=PM==='k3'?'Hugging Face counts '+fmt(HF3.total)+' parameters ('+B(HF3.total)+'): the routed experts match its MXFP4 count exactly, and the total matches by construction because the vision row is the remainder (447M, consistent with the card\'s 401M encoder plus a projector). Active '+B(act)+' against the report\'s 104.2B; including the embedding lookup it would be '+B(act+V*d)+'. Routed experts are '+(100*rel[0].t/tot).toFixed(1)+'% of the total but '+(100*rel[0].a/act).toFixed(1)+'% of the active parameters.':
      'Hugging Face counts '+fmt(HF2.total)+' in the released K2 checkpoint; the config sum above is '+fmt(tot)+'. The report\'s 1.04T and 32.6B: adding the MTP module gives '+B(tot+ps[8].t)+' and '+B(act+ps[8].a)+' (reconstruction). Routed experts are '+(100*rel[0].t/tot).toFixed(1)+'% of the total and '+(100*rel[0].a/act).toFixed(1)+'% of the active parameters.';
    drawM();
  }
  function drawM(){
    const ps=parts(PM).filter(p=>!p.mtp),bits=p=>SCH==='bf16'?16:SCH==='allmx'?4.25:SCH==='mx'?(p.p==='mx'?4.25:16):(p.n.startsWith('Input')||p.n.startsWith('Output')||p.n.startsWith('Norms')||p.n.startsWith('Vision')?16:8+32/16384);
    const by=ps.map(p=>p.t*bits(p)/8),sum=by.reduce((s,x)=>s+x,0),bf=ps.reduce((s,p)=>s+p.t*2,0);
    const real=PM==='k3'?HF3.bytes:HF2.bytes;
    let note='';
    if(PM==='k3'&&SCH==='mx'){const exact=HF3.U8*4.25/8+HF3.BF16*2+HF3.F32*4;note='Exact with Hugging Face\'s per-dtype counts: '+fmt(HF3.U8)+' × 4.25/8 + '+fmt(HF3.BF16)+' × 2 + '+fmt(HF3.F32)+' × 4 = '+fmt(exact)+' bytes; the safetensors index says '+fmt(HF3.bytes)+'. The parts table, with every non-expert part at BF16, gives '+fmt(Math.round(sum))+' (the 11.1M F32 parameters account for the difference).'}
    else if(PM==='k2'&&SCH==='k2fp8')note='K2 ships FP8 (E4M3) with one FP32 scale per 128 × 128 block; embeddings, head and norms assumed BF16. Index total '+fmt(HF2.bytes)+' bytes; this estimate is '+(100*(sum/real-1)).toFixed(2)+'% off.';
    else if(SCH==='allmx')note='Every weight at 4.25 bits: the estimate an earlier version of this page used ('+(PM==='k3'?'1.49 TB at 2.8T':'')+'). The release keeps '+(PM==='k3'?'57.2B':'the non-expert')+' parameters in higher precision, so it understates the real checkpoint.';
    else note='Scheme applied to the parts table above; the real checkpoint is '+fmtTB(real)+'.';
    $('pmOut').innerHTML=stat('Weights',fmtTB(sum),fmt(Math.round(sum))+' bytes')+stat('Against BF16',(100*sum/bf).toFixed(1)+'%','BF16: '+fmtTB(bf))+stat('Published checkpoint',fmtTB(real),'safetensors index total')+stat('Difference',(Math.abs(100*(sum/real-1))<0.005?'0.00':(100*(sum/real-1)).toFixed(2))+'%','this scheme against the checkpoint');
    const W=Math.max(300,Math.min(860,$('pmBar').clientWidth||700));let s='',x=70;const w=W-80;s+='<text x="0" y="14" font-size="11.5">Bytes</text>';
    const cols=['var(--c1)','var(--c3)','var(--c5)','var(--c6)','var(--c4)','var(--c2)','var(--bad)','var(--dim)','var(--mute)','var(--open)','var(--closed)'];
    ps.forEach((p,i)=>{const ww=w*by[i]/sum;s+='<rect x="'+x.toFixed(1)+'" y="0" width="'+Math.max(0.5,ww).toFixed(1)+'" height="20" fill="'+cols[i%cols.length]+'"><title>'+p.n+': '+fmtTB(by[i])+' at '+bits(p).toFixed(2)+' bits</title></rect>';if(ww>80)s+='<text x="'+(x+4)+'" y="14" font-size="10.5" fill="var(--bg)">'+p.n.split(' (')[0]+' '+(100*by[i]/sum).toFixed(0)+'%</text>';x+=ww});
    $('pmBar').innerHTML=svgEl(W,24,s,'Bytes by part');$('pmNote').innerHTML=note;
  }
  function fmtTB(b){return b>=1e12?(b/1e12).toFixed(3)+' TB':(b/1e9).toFixed(1)+' GB'}
  // cache against context
  let DB=4;
  function drawC(){
    const lt=+$('pcCtx').value,T=Math.round(2**lt);$('pcT').textContent=fmt(T)+' tokens';
    const st=96*128*128,conv=3*96*128*3,mlaTok=576*2;
    const hyb=t=>24*mlaTok*t+69*(st*DB+conv*2),full=t=>93*mlaTok*t,k2=t=>61*mlaTok*t;
    const W=Math.max(300,Math.min(860,$('pcSvg').clientWidth||700)),H=280,pl=56,pr=14,pt=14,pb=40;
    const lx=t=>pl+(W-pl-pr)*(Math.log2(t)-10)/10,lo=Math.log10(1e8),hi=Math.log10(2e11);
    const ly=v=>pt+(H-pt-pb)*(1-(Math.log10(v)-lo)/(hi-lo));
    let s='';[[1e8,'100 MB'],[1e9,'1 GB'],[1e10,'10 GB'],[1e11,'100 GB']].forEach(([v,l])=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+ly(v)+'" y2="'+ly(v)+'" stroke="var(--line)"/><text x="'+(pl-6)+'" y="'+(ly(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+l+'</text>'});
    [[1024,'1K'],[8192,'8K'],[65536,'64K'],[262144,'256K'],[1048576,'1M']].forEach(([t,l])=>{s+='<text x="'+lx(t)+'" y="'+(H-pb+16)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+l+'</text>'});
    s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-6)+'" font-size="11" text-anchor="middle" fill="var(--mute)">context, tokens (log); bytes per sequence (log)</text>';
    const ln=(fn,col,dash,lab)=>{let p='';for(let i=0;i<=100;i++){const t=2**(10+i/10);p+=(i?'L':'M')+lx(t).toFixed(1)+' '+ly(fn(t)).toFixed(1)}return '<path d="'+p+'" fill="none" stroke="'+col+'" stroke-width="2.2"'+(dash?' stroke-dasharray="5 4"':'')+'/><text x="'+(W-pr)+'" y="'+(ly(fn(2**20))+(lab[1]||-6))+'" font-size="11" text-anchor="end" fill="'+col+'">'+lab[0]+'</text>'};
    s+=ln(full,'var(--c2)',true,['K3-shaped, all MLA (93)',-6])+ln(k2,'var(--c4)',true,['K2 (61 MLA)',14])+ln(hyb,'var(--acc)',false,['K3 hybrid',14]);
    const xs=69*(st*DB+conv*2)/(69*mlaTok);
    if(xs>1024)s+='<circle cx="'+lx(xs)+'" cy="'+ly(full(xs))+'" r="4" fill="var(--ink)"/><text x="'+(lx(xs)+6)+'" y="'+(ly(full(xs))-6)+'" font-size="10.5">equal at '+fmt(Math.round(xs))+'</text>';
    s+='<line x1="'+lx(T)+'" x2="'+lx(T)+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--ink)" stroke-dasharray="2 3" opacity=".6"/>';
    $('pcSvg').innerHTML=svgEl(W,H,s,'Cache memory against context');
    const g=b=>b>=2**30?(b/2**30).toFixed(2)+' GiB':(b/2**20).toFixed(0)+' MiB';
    $('pcOut').innerHTML=stat('K3 hybrid',g(hyb(T)),'24 × 576 × 2 B per token + 69 states ('+g(69*(st*DB+conv*2))+')')+stat('All-MLA 93 layers',g(full(T)),'93 × 576 × 2 B per token')+stat('Cut',(100*(1-hyb(T)/full(T))).toFixed(1)+'%',hyb(T)>full(T)?'negative: the fixed state dominates here':'limit 74.2% as context grows')+stat('K2 at this context',g(k2(T)),'61 × 576 × 2 B per token')+stat('Hybrid equals all-MLA at',fmt(Math.round(xs))+' tokens','below this the hybrid holds more');
  }
  segBind('ppM',m=>{PM=m;drawP()});segBind('pmS',m=>{SCH=m;drawM()});segBind('pcD',m=>{DB=+m;drawC()});
  $('pcCtx').addEventListener('input',drawC);
  const all=()=>{drawP();drawC()};onTab('t-par',all);addEventListener('resize',()=>{if(!$('t-par').hidden)all()});
})();
