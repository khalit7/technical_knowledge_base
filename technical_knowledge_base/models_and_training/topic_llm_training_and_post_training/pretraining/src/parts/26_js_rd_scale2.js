// ---- Reading, section 3: the inference-aware optimum (Sardana et al. 2024, Eq. 3), before/after stepper ----
// Moved here from the Chinchilla paper page on 2026-10-26 (Pretraining owns the inference-aware optimum).
// Two modes on the same steps of lifetime inference demand: keep the Chinchilla-optimal model, or re-optimise
// training + inference along the iso-loss curve. The engine is PTS.sardana (26_js_rd_scale0.js; check_data.py compares it with recompute.py).
(function(){
  const $=id=>document.getElementById(id);
  if(!$('sa-card')||!window.PTS)return;
  const P=window.PTS,DI=[0,1e10,1e11,1e12,2e12,1e13];
  const sup={'-':'⁻','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
  const sci=(v,d)=>{if(!v)return '0';const e=Math.floor(Math.log10(v)+1e-9),m=v/Math.pow(10,e);return m.toFixed(d==null?2:d)+' × 10'+String(e).split('').map(c=>sup[c]).join('')};
  const sci0=v=>{const e=Math.round(Math.log10(v)),m=v/Math.pow(10,e);return (Math.abs(m-1)<1e-9?'':m.toFixed(0)+' × ')+'10'+String(e).split('').map(c=>sup[c]).join('')};
  const big=v=>v>=1e12?(v/1e12).toFixed(v>=1e13?0:1).replace(/\.0$/,'')+'T':v>=1e9?(v/1e9).toFixed(v>=1e11?0:1).replace(/\.0$/,'')+'B':(v/1e6).toFixed(0)+'M';
  const st={m:'chin',di:0,raf:0};
  const F=()=>P.FITS[$('sa-fit').value],Q=()=>+$('sa-q').value;
  const T=(x,y,s,o)=>{o=o||{};return '<text x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'"'+(o.a?' text-anchor="'+o.a+'"':'')+(o.c?' fill="'+o.c+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+(o.w?' font-weight="'+o.w+'"':'')+'>'+s+'</text>'};
  const L=(x1,y1,x2,y2,c,o)=>{o=o||{};return '<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="'+c+'"'+(o.da?' stroke-dasharray="'+o.da+'"':'')+(o.sw?' stroke-width="'+o.sw+'"':'')+'/>'};
  const R=(x,y,w,h,c,op)=>'<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(0,w).toFixed(1)+'" height="'+h+'" rx="2" fill="'+c+'" opacity="'+op+'"/>';
  const steps=[{t:'One quality, a curve of models',c:()=>'Every point on the curve reaches the same predicted loss as a Chinchilla-optimal '+big(Q())+' model: smaller models need more tokens. The Chinchilla point is the one that costs least to <i>train</i>.'}]
    .concat(DI.slice(1).map(d=>({t:'Inference demand: '+sci0(d)+' tokens',c:m=>m==='chin'?'Keep the Chinchilla-optimal model. Every inference token costs 2<i>N</i> FLOPs, so the inference bar grows in proportion to demand and to model size.':'Re-optimise for training plus inference: the best model slides down the curve, smaller and trained on more tokens, until the extra training is repaid by cheaper inference.'})));
  function render(di){
    const el=$('sa-svg'),w=RD.width(el),f=F(),q=Q(),c=P.chinRef(f,q),s0=P.sardana(f,q,di),aware=st.m==='sard';
    const N=aware?s0.N:c.N,D=aware?s0.D:c.D;
    const X=[c.N/12,c.N*3],Y=[c.D/4,c.D*60],H1=Math.round(Math.min(290,Math.max(220,w*0.48))),pl=46,pr=12,pt=12,pb=40,lg=Math.log10;
    const lx=v=>pl+(w-pl-pr)*(lg(v)-lg(X[0]))/(lg(X[1])-lg(X[0])),ly=v=>pt+(H1-pt-pb)*(1-(lg(v)-lg(Y[0]))/(lg(Y[1])-lg(Y[0])));
    let s='';
    for(let e=Math.ceil(lg(Y[0]));e<=Math.floor(lg(Y[1]));e++){const v=Math.pow(10,e);s+=L(pl,ly(v),w-pr,ly(v),'var(--line)')+T(pl-6,ly(v)+4,big(v),{a:'end',c:'var(--mute)'})}
    [1e8,2e8,5e8,1e9,2e9,5e9,1e10,2e10,5e10,1e11,2e11,5e11].filter(v=>v>=X[0]&&v<=X[1]).filter((v,i,a)=>w>500||a.length<5||String(v)[0]==='1')
      .forEach(v=>{s+=L(lx(v),H1-pb,lx(v),H1-pb+4,'var(--mute)')+T(lx(v),H1-pb+16,big(v),{a:'middle',c:'var(--mute)'})});
    s+=T((pl+w-pr)/2,H1-4,'parameters N (log)',{a:'middle',c:'var(--mute)'});
    s+='<text x="12" y="'+((pt+H1-pb)/2)+'" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 12 '+((pt+H1-pb)/2)+')">training tokens D (log)</text>';
    [20,100,1000].forEach(r=>{const n0=Math.max(X[0],Y[0]/r),n1=Math.min(X[1],Y[1]/r);if(n0<n1)s+=L(lx(n0),ly(n0*r),lx(n1),ly(n1*r),'var(--dim)',{da:'2 3'})+T(lx(n1)-3,ly(n1*r)+12,r+(w<500?' t/p':' tokens per parameter'),{a:'end',c:'var(--mute)'})});
    const pts=[];for(let i=0;i<=80;i++){const n=X[0]*Math.pow(X[1]/X[0],i/80),d=P.isoD(f,c.L,n),y=ly(d);if(isFinite(y)&&y>=pt&&y<=H1-pb)pts.push(lx(n).toFixed(1)+' '+y.toFixed(1))}
    s+='<path d="M'+pts.join(' L')+'" fill="none" stroke="var(--ink)" stroke-width="2.2"/>';
    s+='<circle cx="'+lx(c.N).toFixed(1)+'" cy="'+ly(c.D).toFixed(1)+'" r="5" stroke="var(--c1)" stroke-width="2" fill="'+(aware?'var(--bg)':'var(--c1)')+'"/>'+T(lx(c.N)-6,ly(c.D)+18,'Chinchilla-optimal',{a:'end',c:'var(--c1)'});
    if(aware&&di>0)s+='<circle cx="'+lx(N).toFixed(1)+'" cy="'+ly(D).toFixed(1)+'" r="6" fill="var(--c2)"/>'+T(lx(N)+9,ly(D)-9,'inference-aware',{c:'var(--c2)'});
    // bars: training and inference FLOPs of both choices, one scale (the Chinchilla model at the largest demand)
    const mx=P.sardana(f,q,DI[DI.length-1]).c0.tot*1.02,bl=64,bw=w-bl-14,y0=H1+6;
    const bar=(y,b,lab,op)=>R(bl,y,bw*b.train/mx,18,'var(--c1)',op)+R(bl+bw*b.train/mx,y,bw*b.inf/mx,18,'var(--c2)',op)+T(bl-6,y+13,lab,{a:'end',c:'var(--mute)'})+T(Math.min(bl+bw*b.tot/mx+5,w-70),y+13,b.tot?sci(b.tot,2):'0',{op});
    s+=T(bl,y0+10,'FLOPs: training (blue) + inference (orange)',{c:'var(--mute)'})+bar(y0+18,s0.c0,'Chinchilla',aware?0.4:1)+bar(y0+42,s0,'aware',aware?1:0.4);
    el.innerHTML='<svg viewBox="0 0 '+w+' '+(H1+70)+'" width="'+w+'" height="'+(H1+70)+'" role="img" aria-label="Models of equal predicted loss, and their training and inference cost">'+s+'</svg>';
    const tr=6*N*D,inf=2*N*di,save=s0.saving_frac;
    $('sa-cnt').innerHTML=RD.stat('Model',big(N),(D/N).toFixed(0)+' tokens per parameter')+RD.stat('Training tokens',big(D),sci(tr,2)+' FLOPs')+
      RD.stat('Inference',inf?sci(inf,2):'0','FLOPs for '+(di?sci(di,0):'0')+' tokens')+
      RD.stat('Total',sci(tr+inf,2),aware?(save>1e-4?'saves '+(save*100).toFixed(1)+'% against Chinchilla':'same as Chinchilla'):'aware choice: '+big(s0.N)+', '+(save*100).toFixed(1)+'% less');
  }
  // one step: caption, then the demand eases from the previous step's value to this one (log scale, linear from zero; instant under reduced motion)
  function draw(i){
    const sp=steps[i];$('sa-cap').innerHTML='<div class="t">'+sp.t+'</div><p>'+sp.c(st.m)+'</p>';
    const to=DI[i],from=st.di;cancelAnimationFrame(st.raf);
    if(RD.RM||from===to||!$('sa-card').offsetParent){st.di=to;render(to);return}
    const lin=from===0||to===0,a=lin?from:Math.log10(from),b=lin?to:Math.log10(to),t0=performance.now(),dur=700;
    const fr=now=>{const k=Math.min(1,(now-t0)/dur),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2,v=a+(b-a)*e;
      st.di=k>=1?to:(lin?v:Math.pow(10,v));render(st.di);if(k<1)st.raf=requestAnimationFrame(fr)};
    st.raf=requestAnimationFrame(fr);
  }
  const A=RD.anim({card:'sa-card',ctl:'sa-ctl',n:steps.length,draw,ms:2400,label:'Inference demand step'});
  // a mode switch or a new quality or fit redraws the same step; it never starts playback
  RD.seg($('sa-mode'),m=>{st.m=m;$('sa-mode').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m));A.go(A.i)});
  ['sa-q','sa-fit'].forEach(id=>$(id).addEventListener('change',()=>A.go(A.i)));
  RD.onResize(()=>render(st.di));
  const r=P.sardana(P.FITS.hoff,13e9,2e12);$('sa-rep').textContent=big(r.N)+', saving '+sci(r.saving,1)+' FLOPs ('+(r.saving_frac*100).toFixed(0)+'%)';
})();
