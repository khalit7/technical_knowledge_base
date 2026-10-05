// ---- Reading section 5: the recorded TTL change, negative caching and serve-stale runs ----
(function(){
  const C=DNSD.cache;const esc=RD.esc;
  function chart(id,rows,kind){
    const el=document.getElementById(id);if(!el)return;const w=RD.width(el);const H=120,top=24,base=top+H,h=base+46;
    const R=rows.filter(r=>r.s==='10.53.0.53'),A=rows.filter(r=>r.s==='10.53.0.12'),ev=rows.find(r=>r.event);
    const tmax=Math.ceil(Math.max(...rows.map(r=>r.t))/5)*5,bw=Math.max(4,(w-60)/R.length*0.55),x=t=>40+bw/2+(w-52-bw)*t/tmax;let b='';
    for(let v=0;v<=30;v+=10){const y=base-H*v/30;b+='<line x1="40" x2="'+(w-10)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+RD.t(30,y+4,v,{a:'end',fs:10})}
    b+=RD.t(4,top-10,kind==='neg'?'seconds the "no" has left':'TTL left (s)',{fs:10});
    R.forEach(r=>{const old=kind==='neg'?r.st==='NXDOMAIN':r.v==='10.53.0.81';const ttl=Math.min(30,r.ttl||0);const hh=Math.max(2,H*ttl/30);
      const col=old?(kind==='neg'?'#c2703a':'#2f6fb5'):'#3f7f56';
      b+='<rect x="'+(x(r.t)-bw/2)+'" y="'+(base-hh)+'" width="'+bw+'" height="'+hh+'" fill="'+col+'"><title>'+r.t+' s: '+(r.v||r.st)+', TTL '+r.ttl+'</title></rect>';
      if(!old&&(r.ttl||0)>30&&!R.lab){R.lab=1;b+=RD.t(x(r.t)-bw/2,base-H-3,'TTL '+r.ttl+' (cut at 30)',{a:'end',fs:9})}});
    A.forEach(r=>{const old=kind==='neg'?r.st==='NXDOMAIN':r.v==='10.53.0.81';b+='<rect x="'+(x(r.t)-3)+'" y="'+(base+10)+'" width="6" height="10" fill="'+(old?(kind==='neg'?'#c2703a':'#2f6fb5'):'#3f7f56')+'"/>'});
    b+=RD.t(36,base+34,'authoritative server (squares), same colours',{fs:10,fill:'var(--mute)'});
    if(ev){b+='<line x1="'+x(ev.t)+'" x2="'+x(ev.t)+'" y1="'+(top-4)+'" y2="'+(base+22)+'" stroke="var(--bad)" stroke-dasharray="4 3"/>'+RD.t(Math.min(w-80,x(ev.t)+4),top+6,kind==='neg'?'record created':'address changed',{fs:10,fill:'var(--bad)'})}
    for(let t=0;t<=tmax;t+=10)b+=RD.t(x(t),h-2,t+' s',{a:'middle',fs:10});
    el.innerHTML=RD.svg(w,h,b,id);
  }
  function notes(){
    const ch=C.change,ev=ch.find(r=>r.event),R=ch.filter(r=>r.s==='10.53.0.53'),Au=ch.filter(r=>r.s==='10.53.0.12');
    const firstNewRes=R.find(r=>r.v==='10.53.0.82'),firstNewAuth=Au.find(r=>r.v==='10.53.0.82');
    const n1=document.getElementById('tt-note');if(n1)n1.innerHTML='<span class="meas">measured</span>: the address changed at '+ev.t.toFixed(1)+' s; the authoritative server answered with it from '+firstNewAuth.t.toFixed(1)+' s (it reloads its zone file every second); the resolver kept the old one until '+firstNewRes.t.toFixed(1)+' s, '+(firstNewRes.t-R[0].t).toFixed(1)+' s after it first fetched it (TTL 30). Bars: blue = old address, green = new; height = TTL left.';
    const ng=C.neg,e2=ng.find(r=>r.event),R2=ng.filter(r=>r.s==='10.53.0.53'),A2=ng.filter(r=>r.s==='10.53.0.12');
    const f1=R2.find(r=>r.st==='NOERROR'),f2=A2.find(r=>r.st==='NOERROR');
    const n2=document.getElementById('nx-note');if(n2)n2.innerHTML='<span class="meas">measured</span>: first lookup at 0 s (NXDOMAIN, SOA TTL '+R2[0].ttl+' = min(300, 30)); record created at '+e2.t.toFixed(1)+' s; the authoritative server answered from '+f2.t.toFixed(1)+' s; the resolver still said NXDOMAIN until its "no" expired and answered from '+f1.t.toFixed(1)+' s. Orange = NXDOMAIN, green = the new address.';
  }
  function stale(){
    const el=document.getElementById('st-stale');if(!el)return;
    el.innerHTML=C.stale.map(r=>r.event?'<div class="q"><span>'+r.t.toFixed(1)+' s</span><span>'+esc(r.event)+'</span></div>':
      '<div><span>'+r.t.toFixed(1)+' s</span><span>'+(r.s==='10.53.0.54'?'serve-expired: yes':'default Unbound')+': <b class="'+(r.st==='NOERROR'?'okk':'nx')+'">'+r.st+'</b>'+(r.v?' '+r.v+', TTL '+r.ttl:'')+(r.ms!=null?', '+r.ms+' ms':'')+(r.st==='no reply'?' (dig gave up waiting)':'')+'</span></div>').join('');
  }
  function all(){chart('tt-chart',C.change,'chg');chart('nx-chart',C.neg,'neg')}
  RD.onRender(all);RD.onResize(all);all();notes();stale();
})();
