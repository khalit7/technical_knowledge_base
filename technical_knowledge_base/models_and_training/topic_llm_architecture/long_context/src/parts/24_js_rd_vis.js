// Reading-tab figures: the hero (one request's memory against context, to scale), one token's entry per design,
// attention's share of FLOPs, key and value channel outliers, and Gemma 3 27B's layer strip. Numbers from window.KC
// (the calculator's engine) and KCD.vis (written by src/kv_calc/make_kv_data.py with the root's calc.py).
(function(){
  if(!window.KC||!window.KCD||!document.getElementById('lc-hero'))return;
  const $=id=>document.getElementById(id),T=RD.t,G=1e9,f1=x=>x.toLocaleString('en-GB',{maximumFractionDigits:1}),fi=x=>Math.round(x).toLocaleString('en-GB');
  // ---- hero ----
  function hero(){
    const el=$('lc-hero-svg'),W=RD.width(el),H=Math.round(Math.min(310,Math.max(240,W*0.46))),L=W<520?34:40,R=W<520?8:14,Tp=12,B=40;
    const p=KC.byKey['llama-3.1-8b'],w=p.params*2,cap=80*G*0.92,Tm=131072;
    const mha=KC.redesign(p,'mha'),X=t=>L+(W-L-R)*t/Tm,Y=v=>Tp+(H-B-Tp)*(1-v/(80*G));
    let s='';[0,20,40,60,80].forEach(v=>{s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v*G)+'" y2="'+Y(v*G)+'" stroke="var(--line)"/>'+T(L-4,Y(v*G)+4,v+' GB',{a:'end'})});
    [0,32768,65536,98304,131072].forEach(t=>{s+=T(X(t),H-B+15,t?(t/1024)+'K':'0',{a:t===131072?'end':'middle'})});
    s+=T(W-R,H-3,'context of one request (tokens)',{a:'end',fill:'var(--mute)'});
    s+='<rect x="'+L+'" y="'+Y(w)+'" width="'+(W-L-R)+'" height="'+(Y(0)-Y(w))+'" fill="var(--c2)" opacity=".35"/>'+T(L+6,Y(w/2)+4,'weights 16.06 GB, paid once',{fill:'var(--ink)'});
    const pts=k=>{let a='M'+X(0)+' '+Y(w);for(let t=0;t<=Tm;t+=1024){const v=w+KC.seq(k,t).total;if(v>80*G)break;a+='L'+X(t).toFixed(1)+' '+Y(v).toFixed(1)}return a};
    let area='M'+X(0)+' '+Y(w);for(let t=0;t<=Tm;t+=2048)area+='L'+X(t).toFixed(1)+' '+Y(w+KC.seq(p,t).total).toFixed(1);area+='L'+X(Tm)+' '+Y(w)+'Z';
    s+='<path d="'+area+'" fill="var(--acc)" opacity=".35"/>';
    s+='<path d="'+pts(mha)+'" fill="none" stroke="var(--bad)" stroke-width="2" stroke-dasharray="6 4"/>';
    s+='<path d="'+pts(p)+'" fill="none" stroke="var(--acc)" stroke-width="2.5"/>';
    s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(cap)+'" y2="'+Y(cap)+'" stroke="var(--bad)" stroke-width="1.5"/>'+T(L+4,Y(cap)+14,'usable on an 80 GB GPU (92%)',{fill:'var(--bad)'});
    const c=KC.seq(p,Tm).total;s+=T(X(Tm)-4,Y(w+c)-8,'cache 17.18 GB at 131,072',{a:'end',fill:'var(--acc)',w:600});
    const xm=KC.reach(mha,cap-w);s+='<circle cx="'+X(xm)+'" cy="'+Y(cap)+'" r="4" fill="var(--bad)"/>'+T(X(xm)-8,Y(cap)-8,'MHA (32 KV heads): full at '+fi(xm),{a:'end',fill:'var(--bad)'});
    s+=T(X(Tm*0.5),Y(w+KC.seq(p,Tm*0.5).total)+16,'GQA-8 as released: +128 KiB per token',{a:'middle',fill:'var(--ink)'});
    el.innerHTML=RD.svg(W,H,s,'Weights and KV cache of one Llama 3.1 8B request against context');
  }
  // ---- one token's entry per design, squares of 64 numbers ----
  function entry(){
    const el=$('lc-entry-svg'),W=RD.width(el),narrow=W<520,lab=narrow?92:150,sq=narrow?6:8,gap=1,per=Math.max(8,Math.floor((W-lab-80)/(sq+gap)));
    const rows=[['MHA (32 KV heads)',8192,'var(--bad)'],['GQA-8 (Llama 3.1)',2048,'var(--acc)'],['MQA (1 KV head)',256,'var(--c3)'],['MLA (DeepSeek-V3)',576,'var(--c5)'],['MLA + DSA indexer',704,'var(--c5)'],['Recurrent layer',0,'var(--c6)']];
    let y=4,s='';rows.forEach(([nm,n,col])=>{const k=n/64,lines=Math.max(1,Math.ceil(k/per));
      s+=T(0,y+sq+1,nm,{fs:11});
      for(let i=0;i<k;i++){const r=Math.floor(i/per),c=i%per;s+='<rect x="'+(lab+c*(sq+gap))+'" y="'+(y+r*(sq+gap))+'" width="'+sq+'" height="'+sq+'" fill="'+col+'" opacity="'+(nm.includes('indexer')&&i>=9?'.45':'.85')+'"/>'}
      const txt=n?fi(n)+' numbers, '+(n*2>=1024?f1(n*2/1024)+' KiB':n*2+' B')+' bf16':'0 per token; a fixed state per sequence';
      const tx=lab+Math.min(k,per)*(sq+gap)+6,fits=!n||tx+txt.length*6<W;
      if(fits){s+=T(n?tx:lab,y+sq+1,txt,{fs:11,fill:'var(--mute)'});y+=lines*(sq+gap)+(narrow?14:12)}
      else{s+=T(lab,y+lines*(sq+gap)+11,txt,{fs:11,fill:'var(--mute)'});y+=lines*(sq+gap)+26}});
    el.innerHTML=RD.svg(W,y,s,'Numbers one token stores in one layer, by design');
  }
  // ---- attention share of FLOPs, Llama 3.1 8B ----
  function flops(){
    const el=$('lc-fl-svg'),W=RD.width(el),H=Math.round(Math.min(260,Math.max(210,W*0.38))),L=40,R=12,Tp=12,B=40,d=KCD.vis.flops8b;
    const X=t=>L+(W-L-R)*(Math.log2(t)-10)/10,Y=v=>Tp+(H-B-Tp)*(1-v);
    let s='';[0,.25,.5,.75,1].forEach(v=>{s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+T(L-4,Y(v)+4,(v*100)+'%',{a:'end'})});
    (W<520?[10,12,14,16,18,20]:[10,11,12,13,14,15,16,17,18,19,20]).forEach(e=>{const t=2**e;s+=T(X(t),H-B+15,t>=1048576?'1M':(t/1024)+'K',{a:'middle'})});
    s+=T(W-R,H-3,'context (tokens, log scale)',{a:'end',fill:'var(--mute)'})+'<line x1="'+(L+8)+'" x2="'+(L+30)+'" y1="'+(H-7)+'" y2="'+(H-7)+'" stroke="var(--acc)" stroke-width="2.5"/>'+T(L+34,H-3,'decode',{})+'<line x1="'+(L+84)+'" x2="'+(L+106)+'" y1="'+(H-7)+'" y2="'+(H-7)+'" stroke="var(--c4)" stroke-width="2.5" stroke-dasharray="6 4"/>'+T(L+110,H-3,'prefill',{});
    const line=(k,col,dash)=>'<path d="'+d.map((r,i)=>(i?'L':'M')+X(r[0]).toFixed(1)+' '+Y(r[k]).toFixed(1)).join('')+'" fill="none" stroke="'+col+'" stroke-width="2.5"'+(dash?' stroke-dasharray="6 4"':'')+'/>';
    s+=line(1,'var(--acc)')+line(2,'var(--c4)',1);
    s+='<circle cx="'+X(28600)+'" cy="'+Y(.5)+'" r="4" fill="var(--acc)"/>'+T(X(28600)-8,Y(.5)+16,'decode: half at about 28,600',{fill:'var(--acc)',w:600,a:'end'});
    const p=d.find(r=>r[0]===131072);s+='<circle cx="'+X(131072)+'" cy="'+Y(p[2])+'" r="4" fill="var(--c4)"/>'+T(X(131072)+8,Y(p[2])+16,'prefill: '+Math.round(p[2]*100)+'% at 131,072',{a:W<520?'middle':'start',fill:'var(--c4)',w:600});
    el.innerHTML=RD.svg(W,H,s,'Attention share of FLOPs against context');
  }
  // ---- key and value channel outlier ratios ----
  function kch(){
    const el=$('lc-kch-svg'),W=RD.width(el),L=W<520?50:60,R=12,H=120,d=KCD.vis.kchan,X=v=>L+(W-L-R)*Math.log2(v)/Math.log2(32);
    let s='';[1,2,4,8,16,32].forEach(v=>{s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="8" y2="'+(H-24)+'" stroke="var(--line)"/>'+T(X(v),H-10,v+'x',{a:'middle'})});
    s+=T(W-R,H,'largest channel / median channel (log scale)',{a:'end',fill:'var(--mute)',fs:11});
    [['keys',0,30,'var(--acc)',KCD.vis.kmed],['values',1,66,'var(--c4)',KCD.vis.vmed]].forEach(([nm,k,y,col,md])=>{s+=T(0,y+4,nm,{w:600});
      d.forEach((r,i)=>{s+='<circle cx="'+X(Math.min(32,r[k])).toFixed(1)+'" cy="'+(y+((i*7)%13)-6)+'" r="2.6" fill="'+col+'" opacity=".55"/>'});
      s+='<line x1="'+X(md)+'" x2="'+X(md)+'" y1="'+(y-12)+'" y2="'+(y+12)+'" stroke="var(--ink)" stroke-width="2.5"/>'+T(X(md)+5,y-10,'median '+md,{fs:11})});
    el.innerHTML=RD.svg(W,H+4,s,'Outlier channel ratio of keys and values per head');
  }
  // ---- Gemma 3 27B layer strip, context slider ----
  function lg(){
    const r=$('lc-lg-r'),T0=Math.round(2**(+r.value)),el=$('lc-lg-svg'),W=RD.width(el),L=W<520?30:40,R=8,rh=W<520?3:3.4,H=Math.round(62*rh+22);
    $('lc-lg-v').textContent=fi(T0)+' tokens';
    const p=KC.byKey['gemma-3-27b'],X=t=>L+(W-L-R)*t/T0;let s='';
    // Gemma 3: every sixth layer global (layers 6, 12, ... in 1-based numbering)
    let loc=0,glo=0;for(let i=0;i<62;i++){const g=(i+1)%6===0,n=g?T0:Math.min(T0,1024);g?glo+=n:loc+=n;
      s+='<rect x="'+L+'" y="'+(i*rh)+'" width="'+Math.max(0.8,X(n)-L)+'" height="'+(rh-0.6)+'" fill="'+(g?'var(--acc)':'var(--c4)')+'" opacity=".85"/>'}
    s+=T(L-4,rh*3,'L0',{a:'end'})+T(L-4,62*rh,'L61',{a:'end'})+T(L,62*rh+15,'0',{})+T(W-R,62*rh+15,fi(T0)+' tokens cached',{a:'end'});
    el.innerHTML=RD.svg(W,H,s,'Tokens cached per layer of Gemma 3 27B');
    const tot=KC.seq(p,T0).total,all=KC.seq(Object.assign({},p,{groups:p.groups.map(g=>Object.assign({},g,{win:0}))}),T0).total,sh=loc/(loc+glo);
    $('lc-lg-cap').innerHTML='Each row is one of the 62 layers; its length is the tokens it caches (16 KV heads of 128, 8 KiB per token in bf16). <b style="color:var(--c4)">52 local layers</b> stop at 1,024; <b style="color:var(--acc)">10 global layers</b> keep growing. At '+fi(T0)+' tokens: '+(tot/2**30).toFixed(2)+' GiB, against '+(all/2**30).toFixed(2)+' GiB if every layer were global; the local layers hold '+(100*sh).toFixed(1)+'% of it. <span class="der">derived</span>';
  }
  function all(){hero();entry();flops();kch();lg()}
  $('lc-lg-r').addEventListener('input',lg);
  RD.onRender(all);RD.onResize(all);all();
})();
