// ---- Reading tab widgets (prefix mx2): predictions, Pile bars, temperature and UniMax, repetition curve, code ----
(function(){
  const D=window.MX2, $=id=>document.getElementById(id), esc=RD.esc;
  const pct=(x,d)=>(100*x).toFixed(d==null?1:d)+'%', fmt=(x,d)=>Number(x).toLocaleString('en-GB',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  // generic predict-then-reveal: every .mx2-pred on the page (all tabs)
  document.querySelectorAll('.mx2-pred').forEach(p=>{
    p.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      p.querySelectorAll('.opts button').forEach(x=>{x.classList.toggle('right',x.dataset.o===p.dataset.ans);x.classList.toggle('wrong',x===b&&x.dataset.o!==p.dataset.ans)});
      p.querySelector('.ans').hidden=false}))});
  // bars helper: rows [{nm, v, col, txt, hl}] scaled to max
  function bars(el,rows,max){
    max=max||Math.max(...rows.map(r=>r.v))||1;
    el.innerHTML=rows.map(r=>'<div class="row'+(r.hl?' hl':'')+'"><span class="nm" title="'+esc(r.nm)+'">'+esc(r.nm)+'</span><span class="track"><span class="fill" style="width:'+(100*Math.min(1,r.v/max)).toFixed(2)+'%;background:'+(r.col||'var(--c1)')+'"></span></span><span class="val">'+r.txt+'</span></div>').join('')}
  RD.mx2bars=bars;

  // 1. The Pile Table 1
  const pile=D.pile; let pm='weight';
  function drawPile(){
    const rows=pile.map(p=>({nm:p.name,v:pm==='weight'?p.weight_pct:pm==='raw'?p.raw_gib:p.epochs,col:pm==='epochs'?'var(--c3)':pm==='raw'?'var(--c5)':'var(--c1)',
      txt:pm==='weight'?p.weight_pct.toFixed(2)+'%':pm==='raw'?fmt(p.raw_gib,1)+' GiB':p.epochs.toFixed(1)+'×'}));
    rows.sort((a,b)=>b.v-a.v); bars($('mx2-pile-bars'),rows,pm==='epochs'?3:null)}
  RD.seg($('mx2-pile-seg'),m=>{pm=m;drawPile()}); drawPile();

  // temperature and UniMax on the Pile's raw sizes
  const sizes=pile.map(p=>p.raw_gib), tot=sizes.reduce((a,b)=>a+b,0);
  function temperature(tau){if(!isFinite(tau))return sizes.map(()=>1/sizes.length);const q=sizes.map(s=>Math.pow(s/tot,1/tau)),z=q.reduce((a,b)=>a+b,0);return q.map(x=>x/z)}
  function unimax(B,N){const ord=sizes.map((s,i)=>i).sort((a,b)=>sizes[a]-sizes[b]);const U=sizes.map(()=>0);let left=B;
    ord.forEach((i,j)=>{const b=left/(sizes.length-j);U[i]=b>sizes[i]*N?sizes[i]*N:b;left-=U[i]});const z=U.reduce((a,b)=>a+b,0);return U.map(u=>u/z)}
  RD.mx2samp={temperature,unimax};
  const tauOf=v=>v/100;   // slider 100..1000 -> tau 1.00..10.00
  function drawTemp(){
    const tau=tauOf(+$('mx2-temp-t').value),N=+$('mx2-temp-n').value,B=+$('mx2-temp-b').value;
    $('mx2-temp-tv').textContent=isFinite(tau)?tau.toFixed(2):'∞ (uniform)';$('mx2-temp-nv').textContent=N;$('mx2-temp-bv').textContent=fmt(B);
    const q=temperature(tau),u=unimax(B,N),mx=Math.max(...q,...u,...pile.map(p=>p.weight_pct/100));
    const W=RD.width($('mx2-temp-bars')),nmW=Math.min(150,Math.max(96,W*0.3)),bw=W-nmW-60,rh=24,H=pile.length*rh+6;
    const order=pile.map((p,i)=>i).sort((a,b)=>sizes[b]-sizes[a]);let g='';
    order.forEach((i,j)=>{const y=j*rh+3,s=x=>(x/mx)*bw;
      g+=RD.t(nmW-6,y+15,esc(pile[i].name.replace(' (en)','').replace('Gutenberg (PG-19)','Gutenberg')),{a:'end',fs:11});
      g+='<rect x="'+nmW+'" y="'+(y+1)+'" width="'+s(pile[i].weight_pct/100).toFixed(1)+'" height="20" fill="var(--dim)"/>';
      g+='<rect x="'+nmW+'" y="'+(y+3)+'" width="'+s(q[i]).toFixed(1)+'" height="7" fill="var(--c1)"/>';
      g+='<rect x="'+nmW+'" y="'+(y+12)+'" width="'+s(u[i]).toFixed(1)+'" height="7" fill="var(--c3)"/>';
      g+=RD.t(nmW+bw+4,y+10,(q[i]*B/sizes[i]).toFixed(1)+'×',{fs:10,fill:'var(--c1)'})+RD.t(nmW+bw+4,y+20,(u[i]*B/sizes[i]).toFixed(1)+'×',{fs:10,fill:'var(--c3)'});});
    $('mx2-temp-bars').innerHTML=RD.svg(W,H,g,'Temperature and UniMax shares per Pile component, with epochs at the right');
    const wi=pile.findIndex(p=>p.name==='Wikipedia (en)'),pc=pile.findIndex(p=>p.name==='Pile-CC');
    const maxEp=Math.max(...q.map((x,i)=>x*B/sizes[i]));
    $('mx2-temp-out').innerHTML=RD.stat('Wikipedia, temperature',pct(q[wi],2),(q[wi]*B/sizes[wi]).toFixed(2)+' epochs')+RD.stat('Wikipedia, UniMax',pct(u[wi],2),(u[wi]*B/sizes[wi]).toFixed(2)+' epochs')+
      RD.stat('Pile-CC, temperature',pct(q[pc]),(q[pc]*B/sizes[pc]).toFixed(2)+' epochs')+RD.stat('Most-repeated domain, temperature',maxEp.toFixed(1)+' epochs','numbers at right of each bar: epochs')}
  ['mx2-temp-t','mx2-temp-n','mx2-temp-b'].forEach(id=>$(id).addEventListener('input',drawTemp));
  RD.onRender(drawTemp); RD.onResize(drawTemp); drawTemp();
  $('mx2-ex-t333').textContent=D.pile_examples.tau333_epochs.toFixed(2);

  // code snippet and its real output
  $('mx2-code-samp').textContent=D.snippets.sampling; $('mx2-code-samp-out').textContent=D.snippets.sampling_out;

  // 2. repetition: Muennighoff effective data
  const RS=D.muennighoff.R_D_star, eff=e=>1+RS*(1-Math.exp(-(e-1)/RS));
  RD.mx2eff=eff;
  function drawRep(){
    const E=+$('mx2-rep-e').value;$('mx2-rep-ev').textContent=E;
    const W=RD.width($('mx2-rep-plot')),H=220,L=40,R=12,T=10,B=30,xm=64,ym=20,X=e=>L+(e-1)/(xm-1)*(W-L-R),Y=v=>T+(1-v/ym)*(H-T-B);
    let g='';for(let v=0;v<=ym;v+=5){g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(L-5,Y(v)+4,v,{a:'end',fs:10,fill:'var(--mute)'})}
    [1,4,16,32,48,64].forEach(e=>g+=RD.t(X(e),H-12,e,{a:'middle',fs:10,fill:'var(--mute)'}));
    g+=RD.t((L+W-R)/2,H-1,'epochs',{a:'middle',fs:10,fill:'var(--mute)'});
    g+='<line x1="'+X(1)+'" y1="'+Y(1)+'" x2="'+X(ym)+'" y2="'+Y(ym)+'" stroke="var(--mute)" stroke-dasharray="4 3"/>';
    g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(1+RS)+'" y2="'+Y(1+RS)+'" stroke="var(--bad)" stroke-dasharray="2 3"/>'+RD.t(W-R,Y(1+RS)-4,'ceiling 16.39',{a:'end',fs:10,fill:'var(--bad)'});
    let d='';for(let e=1;e<=xm;e+=0.5)d+=(e===1?'M':'L')+X(e).toFixed(1)+' '+Y(eff(e)).toFixed(1);
    g+='<path d="'+d+'" fill="none" stroke="var(--c1)" stroke-width="2"/>';
    g+='<circle cx="'+X(E)+'" cy="'+Y(eff(E))+'" r="5" fill="var(--c1)"/>';
    g+=RD.t(L+4,T+10,'effective data D′ / unique data',{fs:10,fill:'var(--mute)'});
    $('mx2-rep-plot').innerHTML=RD.svg(W,H,g,'Effective data against epochs');
    $('mx2-rep-out').innerHTML=RD.stat('Tokens read',E+' × U','face value')+RD.stat('Worth (D′)',eff(E).toFixed(2)+' × U','fresh-data equivalent')+RD.stat('Value per token read',pct(eff(E)/E,0),'of a fresh token')+RD.stat('Next epoch adds',(eff(E+1)-eff(E)).toFixed(3)+' × U','marginal value')}
  $('mx2-rep-e').addEventListener('input',drawRep); RD.onRender(drawRep); RD.onResize(drawRep); drawRep();
})();
