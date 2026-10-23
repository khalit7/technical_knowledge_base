// ---- Reading, section 3: the IsoFLOP valley (slider: compute) and the over-training curve (slider: tokens per parameter) ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('sl-iso')||!window.PTS)return;
  const P=window.PTS,F=P.FITS.besi;
  const sup={'-':'⁻','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
  const sci=(v,d)=>{const e=Math.floor(Math.log10(v)+1e-9),m=v/Math.pow(10,e);return m.toFixed(d==null?2:d)+' × 10'+String(e).split('').map(c=>sup[c]).join('')};
  const big=v=>v>=1e12?(v/1e12).toFixed(v>=1e14?0:2).replace(/\.?0+$/,'')+'T':v>=1e9?(v/1e9).toFixed(v>=1e11?0:1).replace(/\.0$/,'')+'B':(v/1e6).toFixed(0)+'M';
  const nice=v=>v>=100?Math.round(v).toLocaleString('en-GB'):v>=10?v.toFixed(1).replace(/\.0$/,''):v.toFixed(2);
  // published runs drawn at their own budget (N in parameters; C as the sources state it)
  const RUNS=[{c:5.76e23,N:70e9,lbl:'Chinchilla 70B'},{c:5.76e23,N:280e9,lbl:'Gopher 280B'},
    {c:3.8e25,N:405.85e9,lbl:'Llama 3.1 405B'},{c:3.8e25,N:402e9,lbl:"Meta's fit 402B",below:true}];
  // ---- IsoFLOP valley ----
  function iso(){
    const el=$('sl-iso');if(!el.offsetParent)return;
    const lc=+$('sl-iso-c').value,C=Math.pow(10,lc),o=P.opt(F,C),kN=P.kaplan(C);
    $('sl-iso-cv').textContent=sci(C)+' FLOPs';
    const w=RD.width(el),h=Math.round(Math.min(300,Math.max(220,w*0.42))),pl=46,pr=12,pt=14,pb=34,W=w-pl-pr,H=h-pt-pb;
    const n0=Math.log10(o.N)-1.6,n1=Math.log10(o.N)+1.6;
    const pts=[];for(let i=0;i<=160;i++){const ln=n0+(n1-n0)*i/160,N=Math.pow(10,ln);pts.push([ln,P.loss(F,N,C/6/N)])}
    const lo=o.L,hi=Math.max(...pts.map(p=>p[1])),top=lo+(hi-lo)*1.05,bot=lo-(hi-lo)*0.2;
    const X=ln=>pl+(ln-n0)/(n1-n0)*W,Y=v=>pt+(top-v)/(top-bot)*H;
    let s='<svg width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Predicted loss against model size at a fixed compute budget">';
    for(let k=0;k<=3;k++){const v=bot+(top-bot)*(k+0.5)/4;s+='<line x1="'+pl+'" x2="'+(pl+W)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'" stroke="var(--line)"/><text x="'+(pl-4)+'" y="'+(Y(v)+4).toFixed(1)+'" text-anchor="end" fill="var(--mute)">'+v.toFixed(3)+'</text>'}
    const narrow=w<520;
    for(let e=Math.ceil(n0);e<=Math.floor(n1);e++){const N=Math.pow(10,e);s+='<line x1="'+X(e).toFixed(1)+'" x2="'+X(e).toFixed(1)+'" y1="'+pt+'" y2="'+(pt+H)+'" stroke="var(--line)" stroke-dasharray="2 3"/><text x="'+X(e).toFixed(1)+'" y="'+(pt+H+14)+'" text-anchor="middle" fill="var(--mute)">'+big(N)+'</text>'}
    s+='<text x="'+(pl+W)+'" y="'+(h-4)+'" text-anchor="end" fill="var(--mute)">parameters N (log); tokens D = C / 6N</text><text x="4" y="'+(pt+6)+'" fill="var(--mute)">loss</text>';
    s+='<path d="'+pts.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)).join(' ')+'" fill="none" stroke="var(--ink)" stroke-width="1.8"/>';
    const at=N=>[X(Math.log10(N)),Y(P.loss(F,N,C/6/N))];
    // 20 tokens per parameter: N = sqrt(C/120)
    const n20=Math.sqrt(C/120),[x20,y20]=at(n20);s+='<circle cx="'+x20.toFixed(1)+'" cy="'+y20.toFixed(1)+'" r="7" fill="none" stroke="var(--c1)" stroke-width="2"/>';
    const [xo,yo]=at(o.N);s+='<circle cx="'+xo.toFixed(1)+'" cy="'+yo.toFixed(1)+'" r="5" fill="var(--acc)"/><text x="'+xo.toFixed(1)+'" y="'+(yo+20).toFixed(1)+'" text-anchor="middle" fill="var(--acc)" font-weight="600">optimum '+big(o.N)+'</text>';
    const kl=Math.log10(kN);
    if(kl<=n1){const [xk,yk]=at(kN);s+='<rect x="'+(xk-5).toFixed(1)+'" y="'+(yk-5).toFixed(1)+'" width="10" height="10" fill="var(--c4)"/><text x="'+Math.min(xk+8,pl+W).toFixed(1)+'" y="'+(yk+20).toFixed(1)+'" text-anchor="'+(xk+8>pl+W*0.8?'end':'start')+'" fill="var(--c4)">Kaplan '+big(kN)+'</text>'}
    else s+='<text x="'+(pl+W)+'" y="'+(pt+12)+'" text-anchor="end" fill="var(--c4)">Kaplan '+big(kN)+' &#8594; off the chart</text>';
    RUNS.forEach(r=>{if(Math.abs(Math.log10(r.c)-lc)>0.015)return;const [x,y]=at(r.N);
      s+='<line x1="'+x.toFixed(1)+'" x2="'+x.toFixed(1)+'" y1="'+(y-4).toFixed(1)+'" y2="'+(r.below?y+30:y-26).toFixed(1)+'" stroke="var(--mute)"/><text x="'+x.toFixed(1)+'" y="'+(r.below?y+42:y-30).toFixed(1)+'" text-anchor="'+(x>pl+W*0.75?'end':x<pl+W*0.25?'start':'middle')+'" fill="var(--mute)">'+(narrow?r.lbl.replace(/ \d.*$/,''):r.lbl)+'</text>'});
    el.innerHTML=s+'</svg>';
    const pen=100*(P.loss(F,kN,C/6/kN)-o.L)/o.L;
    $('sl-iso-cnt').innerHTML=RD.stat('Optimal size',big(o.N),'parameters')+RD.stat('Optimal tokens',big(o.D),nice(o.tpp)+' per parameter')+
      RD.stat('Predicted loss',o.L.toFixed(3),'nats per token, this fit')+RD.stat("Kaplan's rule",big(kN),'loss +'+pen.toFixed(1)+'%');
  }
  $('sl-iso-c').addEventListener('input',()=>{[...$('sl-iso-pre').children].forEach(b=>b.classList.toggle('on',Math.abs(+b.dataset.c-+$('sl-iso-c').value)<0.006));iso()});
  $('sl-iso-pre').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;$('sl-iso-c').value=b.dataset.c;[...$('sl-iso-pre').children].forEach(x=>x.classList.toggle('on',x===b));iso()});
  // ---- over-training at Chinchilla's loss ----
  const C0=5.76e23,o0=P.opt(F,C0),FLOOR=P.floorN(F,o0.L);
  const K0=1,K1=3.7,CURVE=[];for(let i=0;i<=90;i++){const lk=K0+(K1-K0)*i/90;CURVE.push([lk,P.over(F,C0,Math.pow(10,lk))])}
  const MARK=[[20,'Chinchilla 20'],[1868,'Llama 3.1 8B'],[3642,'SmolLM3']];
  function ov(){
    const el=$('sl-over');if(!el.offsetParent)return;
    const lk=+$('sl-over-k').value,k=Math.pow(10,lk),r=P.over(F,C0,k);
    $('sl-over-kv').textContent=nice(k);
    const w=RD.width(el),h=Math.round(Math.min(280,Math.max(220,w*0.4))),pl=40,pr=12,pt=12,pb=34,W=w-pl-pr,H=h-pt-pb;
    const y0=-1,y1=1.3,X=l=>pl+(l-K0)/(K1-K0)*W,Y=l=>pt+(y1-l)/(y1-y0)*H;
    let s='<svg width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Training compute and serving cost against tokens per parameter at a fixed loss">';
    [0.1,0.2,0.5,1,2,5,10,20].forEach(v=>{const l=Math.log10(v);s+='<line x1="'+pl+'" x2="'+(pl+W)+'" y1="'+Y(l).toFixed(1)+'" y2="'+Y(l).toFixed(1)+'" stroke="var(--line)"'+(v===1?'':' stroke-dasharray="2 3"')+'/><text x="'+(pl-4)+'" y="'+(Y(l)+4).toFixed(1)+'" text-anchor="end" fill="var(--mute)">'+v+'×</text>'});
    [10,100,1000].forEach(v=>{const l=Math.log10(v);s+='<text x="'+X(l).toFixed(1)+'" y="'+(pt+H+14)+'" text-anchor="middle" fill="var(--mute)">'+v.toLocaleString('en-GB')+'</text>'});
    s+='<text x="'+(pl+W)+'" y="'+(h-4)+'" text-anchor="end" fill="var(--mute)">tokens per parameter (log)</text>';
    MARK.forEach(([v,t],i)=>{const x=X(Math.log10(v)),R=i>0;s+='<line x1="'+x.toFixed(1)+'" x2="'+x.toFixed(1)+'" y1="'+pt+'" y2="'+(pt+H)+'" stroke="var(--mute)" stroke-dasharray="3 3"/>'+(w<520&&i===2?'':'<text x="'+(x+(R?-3:3)).toFixed(1)+'" y="'+(pt+10+(i===2?14:0))+'" text-anchor="'+(R?'end':'start')+'" fill="var(--mute)">'+t+'</text>')});
    const line=(key,col)=>'<path d="'+CURVE.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+' '+Y(Math.log10(p[1][key])).toFixed(1)).join(' ')+'" fill="none" stroke="'+col+'" stroke-width="2"/>';
    s+=line('C_ratio','var(--c2)')+line('serve_ratio','var(--c1)');
    const lf=Math.log10(FLOOR/o0.N);s+='<line x1="'+pl+'" x2="'+(pl+W)+'" y1="'+Y(lf).toFixed(1)+'" y2="'+Y(lf).toFixed(1)+'" stroke="var(--bad)" stroke-dasharray="4 3"/><text x="'+X(Math.log10(400)).toFixed(1)+'" y="'+(Y(lf)-4).toFixed(1)+'" text-anchor="middle" fill="var(--bad)">size floor '+big(FLOOR)+'</text>';
    const xs=X(lk);s+='<line x1="'+xs.toFixed(1)+'" x2="'+xs.toFixed(1)+'" y1="'+pt+'" y2="'+(pt+H)+'" stroke="var(--acc)" stroke-width="2"/>';
    s+='<circle cx="'+xs.toFixed(1)+'" cy="'+Y(Math.log10(r.C_ratio)).toFixed(1)+'" r="4.5" fill="var(--c2)"/><circle cx="'+xs.toFixed(1)+'" cy="'+Y(Math.log10(r.serve_ratio)).toFixed(1)+'" r="4.5" fill="var(--c1)"/>';
    const LX=Math.log10(150),cl=CURVE.reduce((a,p)=>Math.abs(p[0]-LX)<Math.abs(a[0]-LX)?p:a);
    s+='<text x="'+X(LX).toFixed(1)+'" y="'+(Y(Math.log10(cl[1].C_ratio))-10).toFixed(1)+'" text-anchor="middle" fill="var(--c2)">training compute</text><text x="'+X(LX).toFixed(1)+'" y="'+(Y(Math.log10(cl[1].serve_ratio))-10).toFixed(1)+'" text-anchor="middle" fill="var(--c1)">serving cost per token</text>';
    el.innerHTML=s+'</svg>';
    $('sl-over-cnt').innerHTML=RD.stat('Model',big(r.N)+' on '+big(r.D),'parameters on tokens')+RD.stat('Training compute',r.C_ratio.toFixed(2)+'×','of the compute-optimal run')+
      RD.stat('Serving cost',r.serve_ratio.toFixed(2)+'×','per token, 2N FLOPs')+RD.stat('Repaid after',r.breakeven_tokens&&r.C_ratio>1.01?big(r.breakeven_tokens)+' tokens':'n/a','served, against the optimum');
  }
  $('sl-over-k').addEventListener('input',ov);
  // ---- predict, then reveal ----
  function pq(id,right,text){const q=$(id);q.addEventListener('click',e=>{const b=e.target.closest('button[data-a]');if(!b)return;
    [...q.querySelectorAll('button')].forEach(x=>x.classList.toggle('on',x===b));const r=q.querySelector('.rev');r.hidden=false;
    r.innerHTML=(b.dataset.a===right?'<b>Right.</b> ':'<b>Not quite.</b> ')+text})}
  const g=100*(P.loss(F,280e9,C0/6/280e9)-o0.L)/o0.L,r18=P.over(F,C0,1868);
  pq('sl-q1','1','Under the refit, 280B on the same budget predicts a loss '+g.toFixed(2)+'% above the optimum\'s. The valley is shallow in loss; what Gopher lost was a model four times larger to serve for slightly worse quality. Move the slider: the valley keeps that shape at every budget.');
  pq('sl-q2','5.6','About '+r18.C_ratio.toFixed(1)+' times: a '+big(r18.N)+' model on '+big(r18.D)+' tokens, '+r18.serve_ratio.toFixed(2)+' times the serving cost per token. Most of the shrinkage is bought early; past about 1,000 tokens per parameter each doubling of compute buys little, because no model below '+big(FLOOR)+' reaches this loss.');
  const draw=()=>{iso();ov()};RD.onRender(draw);RD.onResize(draw);draw();
})();
