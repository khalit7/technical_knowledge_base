// ---- Reading: forgetting, watched (the toy's CPT run with and without replay, animated) ----
(function(){
  const T=window.CPT&&CPT.toy;const plot=document.getElementById('fgPlot');if(!plot)return;
  if(!T){plot.innerHTML='<p class="small mute" style="padding:8px">Toy runs not packed yet.</p>';return}
  const S=T.summary,B=T.meta.batch*T.meta.ctx,PT=T.meta.pt_steps,N=T.meta.cpt_steps;
  const LBL={'p1.0_r0.0':'No replay','p1.0_r0.25':'25% replay','p0.1_r0.0':'No replay, peak 0.1×'};
  const REP={'p1.0_r0.0':0,'p1.0_r0.25':0.25,'p0.1_r0.0':0};
  const MARK=[0,50,100,200,400,700,1000,N];  // CPT steps shown at each animation step
  let mode='p1.0_r0.0';
  // mean and range over seeds at each logged step: rows [cptStep, enMean, deMean, enLo, enHi, deLo, deHi]
  function agg(name){const runs=T.cpt[name];return runs[0].map((r,i)=>{const en=runs.map(x=>x[i][1]),de=runs.map(x=>x[i][2]);
    const m=a=>a.reduce((s,v)=>s+v,0)/a.length;return [r[0]-PT,m(en),m(de),Math.min(...en),Math.max(...en),Math.min(...de),Math.max(...de)]})}
  const A={};Object.keys(LBL).forEach(k=>A[k]=agg(k));
  const at=(name,st)=>{const a=A[name];let best=a[0];a.forEach(r=>{if(r[0]<=st)best=r});return best};
  const base=S.base,uni=S.union;
  const f=v=>v.toFixed(2),sg=v=>(v>=0?'+':'−')+Math.abs(v).toFixed(2);
  const fmtC=v=>v>=1e6?(v/1e6).toFixed(1)+'M':v>=1e3?Math.round(v/1e3)+'K':String(v);
  function caption(i){
    const st=MARK[Math.min(i,MARK.length-1)],r=at(mode,st),lab='<b>'+LBL[mode]+'.</b> ';
    const dEn=r[1]-base.en,dDe=r[2]-base.de;
    if(i===0)return '<div class="t">Step 1 of '+(MARK.length+1)+': the base model</div>Pretrained on English only for '+PT.toLocaleString()+' steps, learning rate decayed to its minimum. English loss '+f(base.en)+' bits per character; German '+f(base.de)+' (it has never seen a German word; umlauts are written ae, oe, ue).';
    if(i===MARK.length){const o=Object.keys(LBL).map(k=>{const e=at(k,N);return LBL[k]+': English '+f(e[1])+', German '+f(e[2])}).join('; ');
      return '<div class="t">Step '+(i+1)+' of '+(MARK.length+1)+': the three runs side by side</div>'+o+'. Retrained from scratch on both languages: '+f(uni.en)+' and '+f(uni.de)+'. Replay keeps most of the English for a small price in German; a lower peak forgets less but learns less German, and still forgets far more than replay does.'}
    let t='<div class="t">Step '+(i+1)+' of '+(MARK.length+1)+': after '+st.toLocaleString()+' CPT steps</div>'+lab;
    if(st===50)t+='The learning rate re-warmed to its peak in 15 steps. English loss is already '+f(r[1])+' ('+sg(dEn)+'): the forgetting comes first, before German has been learned (German '+f(r[2])+').';
    else if(st<=200)t+='German loss falls fast ('+f(r[2])+', '+sg(dDe)+') while English '+(dEn>0.5?'keeps degrading':'holds')+' at '+f(r[1])+' ('+sg(dEn)+').';
    else if(st<N)t+='The cosine decay slows both curves. English '+f(r[1])+' ('+sg(dEn)+'), German '+f(r[2])+' ('+sg(dDe)+').';
    else t+='End of the run, learning rate at 10% of its peak. English '+f(r[1])+' ('+sg(dEn)+'), German '+f(r[2])+' ('+sg(dDe)+'). The dashed green lines are the retrained-from-scratch model.';
    return t}
  function draw(i){
    const w=Math.min(RD.width(plot),860),h=Math.max(220,Math.min(320,w*0.48));
    const F=PL.frame({w,h,x:[0,N],y:[1.4,6],xt:[0,250,500,750,1000,1250,1500].filter(v=>v<=N),yt:[2,3,4,5,6],xlab:'CPT step (each step: '+B.toLocaleString()+' characters)',ylab:'bits per character',m:{l:40,r:18,t:10,b:34}});
    const st=MARK[Math.min(i,MARK.length-1)],last=i===MARK.length;
    let s=F.open()+F.axes;
    // retrained-from-scratch reference levels
    [['en',uni.en],['de',uni.de]].forEach(([k,v])=>{s+='<line x1="'+F.m.l+'" x2="'+(F.W-F.m.r)+'" y1="'+F.sy(v)+'" y2="'+F.sy(v)+'" stroke="var(--c3)" stroke-dasharray="5 4" opacity=".8"/>'});
    if(last)Object.keys(LBL).filter(k=>k!==mode).forEach(k=>{const a=A[k];
      s+='<path d="'+PL.path(a.map(r=>[r[0],r[1]]),F.sx,F.sy)+'" fill="none" stroke="var(--c1)" stroke-dasharray="4 4" opacity=".55"/>';
      s+='<path d="'+PL.path(a.map(r=>[r[0],r[2]]),F.sx,F.sy)+'" fill="none" stroke="var(--c2)" stroke-dasharray="4 4" opacity=".55"/>';
      const e=a[a.length-1];s+='<text x="'+(F.sx(N)-4)+'" y="'+(F.sy(e[1])-5)+'" text-anchor="end" font-size="10.5" fill="var(--mute)">'+LBL[k]+'</text>'});
    const a=A[mode].filter(r=>r[0]<=st);
    if(a.length>1){
      s+='<path d="'+PL.band(a.map(r=>[r[0],r[3]]),a.map(r=>[r[0],r[4]]),F.sx,F.sy)+'" fill="var(--c1)" opacity=".15"/>';
      s+='<path d="'+PL.band(a.map(r=>[r[0],r[5]]),a.map(r=>[r[0],r[6]]),F.sx,F.sy)+'" fill="var(--c2)" opacity=".15"/>';
      s+='<path d="'+PL.path(a.map(r=>[r[0],r[1]]),F.sx,F.sy)+'" fill="none" stroke="var(--c1)" stroke-width="2.4"/>';
      s+='<path d="'+PL.path(a.map(r=>[r[0],r[2]]),F.sx,F.sy)+'" fill="none" stroke="var(--c2)" stroke-width="2.4"/>'}
    const e=a[a.length-1];
    s+='<circle cx="'+F.sx(e[0])+'" cy="'+F.sy(e[1])+'" r="4" fill="var(--c1)"/><circle cx="'+F.sx(e[0])+'" cy="'+F.sy(e[2])+'" r="4" fill="var(--c2)"/>';
    s+='<text x="'+(F.sx(e[0])+6>F.W-60?F.sx(e[0])-6:F.sx(e[0])+6)+'" y="'+(F.sy(e[1])-6)+'" text-anchor="'+(F.sx(e[0])+6>F.W-60?'end':'start')+'" font-size="11" fill="var(--c1)">English '+f(e[1])+'</text>';
    s+='<text x="'+(F.sx(e[0])+6>F.W-60?F.sx(e[0])-6:F.sx(e[0])+6)+'" y="'+(F.sy(e[2])+14)+'" text-anchor="'+(F.sx(e[0])+6>F.W-60?'end':'start')+'" font-size="11" fill="var(--c2)">German '+f(e[2])+'</text>';
    plot.innerHTML=s+F.close();
    const rp=REP[mode],chars=st*B;
    document.getElementById('fgN').innerHTML=RD.stat('CPT steps',st.toLocaleString()+' / '+N.toLocaleString(),'peak '+(mode==='p0.1_r0.0'?'0.1×':'1×')+' of pretraining')+
      RD.stat('German read',fmtC(Math.round(chars*(1-rp))),'characters')+
      RD.stat('English replayed',fmtC(Math.round(chars*rp)),rp?Math.round(rp*100)+'% of each batch':'none')+
      RD.stat('English loss',f(e[1]),'<span class="'+(e[1]-base.en>0.3?'warn':'ok')+'">'+sg(e[1]-base.en)+'</span> from the base')+
      RD.stat('German loss',f(e[2]),sg(e[2]-base.de)+' from the base');
    document.getElementById('fgCap').innerHTML=caption(i);
    const sm=document.getElementById('fgSmp');
    if(last||st===N){const s0=T.samples[0];const q=x=>RD.esc(x);
      sm.innerHTML='<p class="small" style="margin:6px 0 2px">The English prompt "it was a", continued by seed 1 (temperature 0.7):</p><div class="smp"><span class="pr">base:</span> '+q(s0.base.en)+'</div><div class="smp"><span class="pr">'+LBL[mode]+':</span> '+q(s0[mode].en)+'</div>'}
    else sm.innerHTML=''}
  const an=RD.anim({card:'fgCard',ctl:'fgCtl',n:MARK.length+1,ms:1700,draw,label:'Training step'});
  document.querySelectorAll('#fgMode button').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('#fgMode button').forEach(x=>x.classList.toggle('on',x===b));mode=b.dataset.m;an.reset(MARK.length+1);an.play()}));
  addEventListener('resize',()=>an.redraw());
})();
