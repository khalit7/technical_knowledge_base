// ---- Then and now: the inference-aware optimum (Sardana et al.), tokens per parameter over time, replications ----
// Chinchilla-optimal reference: the model of size Nc on the fit's frontier (Eq. 4); its loss l fixes the quality.
function chinRef(f,Nc){const G=Math.pow(f.alpha*f.A/(f.beta*f.B),1/(f.alpha+f.beta)),a=f.beta/(f.alpha+f.beta),b=1-a,Dc=Math.pow(Nc/G,b/a)/G;return {N:Nc,D:Dc,l:lossOf(f,Nc,Dc)}}
// on the iso-loss curve, D as a function of N
const isoD=(f,l,N)=>{const r=l-f.E-f.A/Math.pow(N,f.alpha);return r>0?Math.pow(f.B/r,1/f.beta):Infinity};
function sardana(f,Nc,Dinf){const c=chinRef(f,Nc),tot=N=>{const D=isoD(f,c.l,N);return 6*N*D+2*N*Dinf};let lo=Math.log(Nc*.05),hi=Math.log(Nc);
  for(let i=0;i<200;i++){const m1=lo+(hi-lo)/3,m2=hi-(hi-lo)/3;if(tot(Math.exp(m1))<tot(Math.exp(m2)))hi=m2;else lo=m1}
  const N=Math.exp(lo),D=isoD(f,c.l,N);return {N,D,train:6*N*D,inf:2*N*Dinf,tot:6*N*D+2*N*Dinf,c,c0:{train:6*c.N*c.D,inf:2*c.N*Dinf,tot:6*c.N*c.D+2*c.N*Dinf}}}
(function(){const DI=[0,1e10,1e11,1e12,2e12,1e13];const f=()=>FITS[$('infFit').value],Q=()=>+$('infQ').value;
  const mk=m=>[{t:'One quality, a curve of models',c:'Every point on the curve reaches the same predicted loss as a Chinchilla-optimal '+hum(Q())+' model: smaller models need more tokens. The Chinchilla point is the one that costs least to <i>train</i>.'}].concat(DI.slice(1).map(d=>({t:'Inference demand: '+sciT(d,0)+' tokens',
    c:m==='chin'?'Keep the Chinchilla-optimal model. Every inference token costs 2<i>N</i> FLOPs, so the inference bar grows in proportion to demand and to model size.':'Re-optimise for training plus inference: the best model slides down the curve, smaller and trained on more tokens, until the extra training is repaid by cheaper inference.'})));
  const modes={chin:mk('chin'),sard:mk('sard')};
  function draw(m,k,e,w){const F0=f(),c=chinRef(F0,Q()),prev=k>1?DI[k-1]:0,cur=DI[k]||0,di=k>0?(k===1?cur*e:Math.exp(Math.log(Math.max(prev,1))+(Math.log(cur)-Math.log(Math.max(prev,1)))*e)):0;
    const s0=sardana(F0,Q(),di),N=m==='sard'?s0.N:c.N,D=m==='sard'?s0.D:c.D;
    const X=[c.N/12,c.N*3],Y=[c.D/4,c.D*60],H1=Math.min(290,Math.max(220,w*.48));
    const Fr=logFrame({W:w,H:H1,pl:46,pr:12,pt:12,pb:40,x:X,y:Y,xt:[1e8,2e8,5e8,1e9,2e9,5e9,1e10,2e10,5e10,1e11,2e11,5e11].filter(v=>v>=X[0]&&v<=X[1]).filter((v,i,a)=>w>500||a.length<5||String(v)[0]==='1').map(v=>[v,hum(v)]),yt:decTicks(Y[0],Y[1],1).map(t=>[t[0],hum(t[0])]),xl:'parameters N',yl:'training tokens D'});
    let s=Fr.s;const cv=geo(X[0],X[1],80).map(n=>[Fr.lx(n),Fr.ly(isoD(F0,c.l,n))]).filter(p=>isFinite(p[1])&&p[1]>=12&&p[1]<=H1-40);s+=pth(pathOf(cv),'var(--ink)',{sw:2.2});
    [20,100,1000].forEach(r=>{const n0=Math.max(X[0],Y[0]/r),n1=Math.min(X[1],Y[1]/r);if(n0<n1){s+=ln2(Fr.lx(n0),Fr.ly(n0*r),Fr.lx(n1),Fr.ly(n1*r),'var(--dim)',{da:'2 3'})+tx(Fr.lx(n1)-3,Fr.ly(n1*r)+12,r+' tokens per parameter',{fs:11,a:'end',c:'var(--mute)'})}});
    s+=dot(Fr.lx(c.N),Fr.ly(c.D),5,'var(--c1)',{f:m==='chin'?'var(--c1)':'var(--bg)'})+tx(Fr.lx(c.N)+8,Fr.ly(c.D)+4,'Chinchilla-optimal',{fs:11,c:'var(--c1)'});
    if(m==='sard'&&k>0)s+=dot(Fr.lx(N),Fr.ly(D),6,'var(--c2)',{f:'var(--c2)'})+tx(Fr.lx(N)-8,Fr.ly(D)-6,'inference-aware',{fs:11,a:'end',c:'var(--c2)'});
    // bars
    const a=m==='sard'?s0:{train:s0.c0.train,inf:s0.c0.inf,tot:s0.c0.tot},mx=Math.max(sardana(F0,Q(),DI[DI.length-1]).c0.tot,1)*1.02,bl=60,bw=w-bl-14,y0=H1+6;
    const bar=(y,b,lab,op)=>rc(bl,y,bw*b.train/mx,18,'var(--c1)',{op,r:2})+rc(bl+bw*b.train/mx,y,bw*b.inf/mx,18,'var(--c2)',{op,r:2})+tx(bl-6,y+13,lab,{fs:11,a:'end',c:'var(--mute)'})+tx(Math.min(bl+bw*b.tot/mx+5,w-70),y+13,b.tot?sciT(b.tot,2):'0',{fs:11,op});
    let b=tx(bl,y0+10,'FLOPs: training (blue) + inference (orange)',{fs:11,c:'var(--mute)'})+bar(y0+18,s0.c0,'Chinchilla',m==='chin'?1:.4)+bar(y0+42,s0,'aware',m==='sard'?1:.4);
    return svgW(w,H1+70,s+b,'Models of equal predicted loss, and their training and inference cost')}
  function counters(m,k){const F0=f(),di=DI[k]||0,s0=sardana(F0,Q(),di),N=m==='sard'?s0.N:s0.c.N,D=m==='sard'?s0.D:s0.c.D,tr=6*N*D,inf=2*N*di,tot=tr+inf,save=1-s0.tot/s0.c0.tot;
    return '<div class="cnt2">'+stat('Model',hum(N),(D/N).toFixed(0)+' tokens per parameter')+stat('Training tokens',hum(D),sciT(tr,2)+' FLOPs')+stat('Inference',inf?sciT(inf,2):'0','FLOPs for '+(di?sciT(di,0):'0')+' tokens')+stat('Total',sciT(tot,2),m==='sard'?(save>0?'saves '+(save*100).toFixed(1)+'% against Chinchilla':'same as Chinchilla'):'aware choice: '+hum(s0.N)+', '+(save*100).toFixed(1)+'% less')+'</div>'}
  window.INF=makeAnim({id:'inf',modes,mode:'chin',draw,counters,dur:2600});
  ['infQ','infFit'].forEach(id=>$(id).addEventListener('change',()=>{if(window.INF){INF.st.lk=-1;const m=INF.st.m;modes.chin.splice(0,99,...mk('chin'));modes.sard.splice(0,99,...mk('sard'));INF.draw()}}));
  const r=sardana(FITS.hoffU,13e9,2e12);$('infRep').textContent=hum(r.N)+', saving '+sciT(r.c0.tot-r.tot,1)+' FLOPs ('+((1-r.tot/r.c0.tot)*100).toFixed(0)+'%)';
})();
// tokens per parameter over time
(function(){const M=PAPER.tables.models.rows;$('tlSrc').innerHTML=M.map(r=>A(r[4],r[0])).join(', ');
  function draw(w){const H=w<500?330:Math.min(320,w*.5),t=s=>{const [y,m]=s.split('-').map(Number);return y+(m-.5)/12},X=[2020,2025.9],Y=[0.6,4000],pl=44,pr=12,pt=12,pb=36;
    const lx=v=>pl+(w-pl-pr)*(v-X[0])/(X[1]-X[0]),ly=v=>pt+(H-pt-pb)*(1-(lg10(v)-lg10(Y[0]))/(lg10(Y[1])-lg10(Y[0])));
    let s='';[1,10,100,1000].forEach(v=>{s+=ln2(pl,ly(v),w-pr,ly(v),'var(--line)')+tx(pl-6,ly(v)+4,fmt(v),{fs:11,a:'end',c:'var(--mute)'})});
    [2020,2021,2022,2023,2024,2025].forEach(y=>{s+=tx(lx(y),H-pb+16,String(y),{fs:11,a:'middle',c:'var(--mute)'})});
    s+=ln2(pl,ly(20),w-pr,ly(20),'var(--c1)',{da:'1 3',sw:1.6})+tx(pl+4,ly(20)+14,'20',{fs:11,c:'var(--c1)'});
    s+=tx(12,(pt+H-pb)/2,'tokens per parameter',{fs:11,a:'middle',c:'var(--mute)'}).replace('<text','<text transform="rotate(-90 12 '+((pt+H-pb)/2)+')"');
    const pts=M.map(r=>({x:lx(t(r[3])),y:ly(r[2]/r[1]),t:(w<500?r[0].replace(' (37B active)','').replace('DeepSeek-','DS-'):r[0].replace(' (37B active)',''))+' '+(r[2]/r[1]<10?(r[2]/r[1]).toFixed(1):fmt(r[2]/r[1])),fs:11}));placeLabels(pts,w,H);
    pts.forEach((p,i)=>{s+=dot(p.x,p.y,4.5,/Chinchilla/.test(M[i][0])?'var(--c1)':'var(--c2)',{f:/Chinchilla/.test(M[i][0])?'var(--c1)':'var(--bg)'})+tx(p.lx,p.ly,p.t,{fs:11,a:p.la,c:'var(--mute)'})});
    $('tlSvg').innerHTML=svgW(w,H,s,'Tokens per parameter of major models over time')}
  onTab('t-then',()=>refit($('tlSvg')));fit($('tlSvg'),draw);
})();
// replications
(function(){const T=PAPER.tables.repl,F=PAPER.fit.fits;
  const rows=T.rows.map(r=>{let a=r[3],b=r[4];if(a==='RC_SUM'){a=F.sum.a_exp.toFixed(3);b=(1-F.sum.a_exp).toFixed(3)}if(a==='RC_A2'){a=A2.a.toFixed(3);b=A2.b.toFixed(3)}
    const u=r[5],nm=/^tab:/.test(u)?'<a href="#" data-tab="'+u.split(':')[1]+'"'+(u.split(':')[2]?' data-to="'+u.split(':')[2]+'"':'')+'>'+r[0]+'</a>':A(u,r[0]);return [nm,r[1],r[2],'<b>'+a+'</b>',b]});
  tbl('replT',T.head,rows);
  $('replT').querySelectorAll('a[data-tab]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const b=document.querySelector('#tabs button[data-t="'+a.dataset.tab+'"]');if(b)b.click();const to=a.dataset.to&&$(a.dataset.to);if(to)to.scrollIntoView({block:'start'})}));
})();
