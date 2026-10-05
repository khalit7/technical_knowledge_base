// ---- Cache timeline tab: the same change without and with lowering the TTL first, animated over time ----
(function(){
  const tab=document.getElementById('t-cache');if(!tab)return;
  const OLD=[60,300,900,3600,14400,86400],NEW=[30,60,120,300,600],LEAD=[0,60,300,900,1800,3600,7200,43200,86400];
  const $=id=>document.getElementById(id);$('cc-lead').value=5;
  const dur=s=>s>=86400&&s%3600===0?(s/86400)+(s===86400?' day':' days'):s>=3600&&s%60===0?(s/3600).toFixed(s%3600?1:0)+' h':s>=120?(s/60).toFixed(s%60?1:0)+' min':s+' s';
  let P,ma,mb,H;const STEPS=50;
  function compute(){
    P={oldTTL:OLD[+$('cc-old').value],newTTL:NEW[+$('cc-new').value],lead:LEAD[+$('cc-lead').value],jvm:30,jvmShare:+$('cc-jvm').value/100,pinShare:+$('cc-pin').value/100};
    $('cc-oldv').textContent=dur(P.oldTTL);$('cc-newv').textContent=dur(P.newTTL);$('cc-leadv').textContent=P.lead?dur(P.lead):'not lowered';
    $('cc-jvmv').textContent=Math.round(P.jvmShare*100)+'%';$('cc-pinv').textContent=Math.round(P.pinShare*100)+'%';
    ma=cacheModel(Object.assign({},P,{lead:0}));mb=cacheModel(P);
    H=Math.max(60,Math.max(ma.worst,mb.worst)*1.08);
  }
  function cells(id,m,t){const N=100;const oldShare=m.at(t)-P.pinShare;let h='';
    for(let i=0;i<N;i++){const f=(i+0.5)/N;h+='<span class="'+(f>=1-P.pinShare?'p':(f<oldShare?'o':''))+'"></span>'}
    $(id).innerHTML=h}
  function chart(k){
    const el=$('cc-chart');const w=RD.width(el);const h=190,top=10,base=150,x=t=>40+(w-52)*t/H,y=v=>base-(base-top)*v;let b='';
    [0,0.25,0.5,0.75,1].forEach(v=>{b+='<line x1="40" x2="'+(w-12)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+RD.t(36,y(v)+4,Math.round(v*100)+'%',{a:'end',fs:10})});
    const path=(m,col)=>{let d='';for(let i=0;i<=200;i++){const t=H*i/200;d+=(i?'L':'M')+x(t).toFixed(1)+' '+y(m.at(t)).toFixed(1)}return '<path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="2"/>'};
    b+=path(ma,'#2f6fb5')+path(mb,'#3f7f56');
    // the lab's recorded single cache: old address until its entry expired
    const ch=DNSD.cache.change,ev=ch.find(r=>r.event),R=ch.filter(r=>r.s==='10.53.0.53');const flip=R.find(r=>r.v==='10.53.0.82');
    if(flip&&flip.t-ev.t<H){const tf=flip.t-ev.t;b+='<path d="M'+x(0)+' '+y(1)+'L'+x(tf)+' '+y(1)+'L'+x(tf)+' '+y(0)+'" fill="none" stroke="#c2703a" stroke-width="1.5" stroke-dasharray="4 3"/>'}
    const tc=H*k/(STEPS-1);b+='<line x1="'+x(tc)+'" x2="'+x(tc)+'" y1="'+top+'" y2="'+base+'" stroke="var(--ink)" stroke-width="1"/>';
    for(let i=0;i<=4;i++){const t=H*i/4;b+=RD.t(x(t),base+16,dur(Math.round(t)),{a:'middle',fs:10})}
    b+=RD.t(40,h-6,'time since the change; share of clients still on the old address',{fs:10,fill:'var(--mute)'});
    el.innerHTML=RD.svg(w,h,b,'Share of clients on the old address over time');
    cells('cc-ca',ma,tc);cells('cc-cb',mb,tc);
    const s=(m)=>'Worst case '+dur(Math.round(m.worst))+(m.pinned?', plus '+Math.round(P.pinShare*100)+'% never switch':'')+'; half switched by '+(isFinite(m.median)?dur(Math.round(m.median)):'never');
    $('cc-sa').textContent=s(ma);$('cc-sb').textContent=s(mb);
    $('cc-cap').innerHTML='At <b>'+dur(Math.round(tc))+'</b> after the change: <b>'+Math.round(ma.at(tc)*100)+'%</b> of clients still on the old address without lowering, <b>'+Math.round(mb.at(tc)*100)+'%</b> with the TTL lowered '+(P.lead?dur(P.lead)+' ahead':'(not lowered)')+'.'+
      (P.lead&&P.lead<P.oldTTL?' The lead is shorter than the old TTL, so caches that fetched just before the lowering still hold the old TTL.':'');
  }
  compute();
  const A=RD.anim({card:'cc-chart',ctl:'cc-ctl',n:STEPS,draw:chart,ms:220,label:'Time'});
  ['cc-old','cc-new','cc-lead','cc-jvm','cc-pin'].forEach(id=>$(id).addEventListener('input',()=>{compute();A.redraw()}));
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-cache']=[()=>A.redraw()];
  addEventListener('resize',()=>{if(!tab.hidden)A.redraw()});
  function calcs(){
    const a=+$('nc-ttl').value,b=+$('nc-min').value;$('nc-out').innerHTML='A "no" is cached for min('+a+', '+b+') = <b>'+dur(Math.min(a,b))+'</b> (RFC 2308).';
    const i=+$('fo-int').value,f=+$('fo-thr').value,t=+$('fo-ttl').value;$('fo-out').innerHTML='Detection about '+i+' &times; '+f+' = '+dur(i*f)+', then caches expire within '+dur(t)+': clients can keep the dead address for up to about <b>'+dur(i*f+t)+'</b> (derived; checkers\' timing varies).';
    const n=+$('ns-ttl').value,o=+$('ns-own').value;$('ns-out').innerHTML='Resolvers can keep the old name servers for up to <b>'+dur(Math.max(n,o))+'</b> (the larger of the parent\'s delegation and your own NS TTL, depending on which copy a resolver cached). Keep the old servers answering correctly for that long.';
  }
  ['nc-ttl','nc-min','fo-int','fo-thr','fo-ttl','ns-ttl','ns-own'].forEach(id=>$(id).addEventListener('input',calcs));calcs();
})();
