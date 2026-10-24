// ---- Hero: one CPU's run queue (classes in order, the fair class sorted by measured vruntime) and a container's quota stopping all of its threads (measured gaps) ----
(function(){
  const $=id=>document.getElementById(id);if(!$('sc-hero-rq'))return;
  const D=window.SC_DATA,f=(x,d)=>Number(x).toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  // measured sample: /proc/PID/sched about 1 s into the vruntime run (section 4)
  const S=D.vrun.reduce((a,r)=>Math.abs(r.t-1000)<Math.abs(a.t-1000)?r:a,D.vrun[0]);
  const TH=D.throttle.find(r=>r.n===5&&r.period===100000);
  function rq(){const el=$('sc-hero-rq'),w=RD.width(el),narrow=w<520;
    const cls=[['deadline',1],['real-time',1.1],['fair: nearly every thread',2.3],['idle',0.75]],gap=14,top=22,bh=30;
    const tot=cls.reduce((s,c)=>s+c[1],0),unit=(w-gap*(cls.length-1)-2)/tot;let x=1,b='',fx0=0,fx1=0;
    b+=RD.t(1,12,narrow?'tried in this order, highest first':'classes are tried in this order, highest first; the first with a runnable thread wins',{fs:11,fill:'var(--mute)'});
    cls.forEach((c,i)=>{const bw=c[1]*unit,fair=i===2;
      b+='<rect x="'+x.toFixed(1)+'" y="'+top+'" width="'+bw.toFixed(1)+'" height="'+bh+'" rx="5" fill="'+(fair?'var(--acc2)':'var(--soft)')+'" stroke="'+(fair?'var(--acc)':'var(--line)')+'"/>';
      b+=RD.t(x+bw/2,top+bh/2+4,fair&&narrow?'fair':c[0],{a:'middle',fs:11.5,w:fair?600:400});
      if(i<cls.length-1)b+='<path d="M'+(x+bw+2).toFixed(1)+' '+(top+bh/2)+' l'+(gap-6)+' 0 m-4 -3 l4 3 l-4 3" fill="none" stroke="var(--mute)"/>';
      if(fair){fx0=x;fx1=x+bw}x+=bw+gap});
    // the fair class's queue, opened out: threads placed by measured vruntime
    const ay=top+bh+62,L=8,R=w-8;
    b+='<path d="M'+fx0.toFixed(1)+' '+(top+bh)+' L'+L+' '+(ay-38)+' M'+fx1.toFixed(1)+' '+(top+bh)+' L'+R+' '+(ay-38)+'" fill="none" stroke="var(--acc)" stroke-dasharray="3 3"/>';
    const pts=[['sleeper',S.sleeper[0],'var(--acc)'],['nice 5 loop',S.nice5[0],'var(--c2)'],['nice 0 loop',S.nice0[0],'var(--c3)']];
    const lo=Math.min(...pts.map(p=>p[1]))-2.5,hi=Math.max(...pts.map(p=>p[1]))+2.5,X=v=>L+(v-lo)/(hi-lo)*(R-L);
    b+='<line x1="'+L+'" x2="'+R+'" y1="'+ay+'" y2="'+ay+'" stroke="var(--ink)"/>';
    b+='<path d="M'+(R-6)+' '+(ay-4)+' L'+R+' '+ay+' L'+(R-6)+' '+(ay+4)+'" fill="none" stroke="var(--ink)"/>';
    b+=RD.t(L,ay+32,'virtual runtime, ms →',{fs:11,fill:'var(--mute)'});
    pts.forEach((p,i)=>{const px=X(p[1]),up=i!==1;
      b+='<circle cx="'+px.toFixed(1)+'" cy="'+ay+'" r="'+(i===0?7:6)+'" fill="'+p[2]+'"/>';
      const ly=up?ay-14:ay+20,anc=i===0?'start':i===2?'end':'middle';
      b+=RD.t(i===0?Math.max(L,px-6):i===2?Math.min(R,px+6):px,ly,p[0]+' '+f(p[1],1),{a:anc,fs:11,w:i===0?600:400,fill:i===0?'var(--acc)':'var(--ink)'})});
    b+=RD.t(X(S.sleeper[0])-6<L?L:X(S.sleeper[0])-6,ay-28,'leftmost runs next',{fs:11,w:600,fill:'var(--acc)'});
    el.innerHTML=RD.svg(w,ay+38,b,'one CPU run queue: scheduling classes in order, and the fair class ordered by virtual runtime')}
  function quota(){const el=$('sc-hero-q'),w=RD.width(el),END=300,L=30,R=6,T=26,lane=11,g=4,n=TH.threads.length;
    const X=t=>L+t/END*(w-L-R),H=T+n*(lane+g)+20;let b='';
    // the longest stretch in which every thread was stopped, and the run just before it
    const stoppedAll=t=>TH.threads.every(th=>th.gaps.some(q=>q[0]<=t&&t<q[1]));let s0=null,best=null;
    for(let t=0;t<=END;t+=0.25){if(stoppedAll(t)){if(s0==null)s0=t}else if(s0!=null){if(!best||t-s0>best[1]-best[0])best=[s0,t];s0=null}}
    TH.threads.forEach((th,j)=>{const y=T+j*(lane+g);b+=RD.t(L-5,y+lane-2,'t'+(j+1),{a:'end',fs:11,fill:'var(--mute)'});
      b+='<rect x="'+X(0)+'" y="'+y+'" width="'+(X(END)-X(0)).toFixed(1)+'" height="'+lane+'" fill="var(--c1)" opacity=".85"/>';
      th.gaps.forEach(q=>{if(q[0]>=END)return;b+='<rect x="'+X(q[0]).toFixed(2)+'" y="'+y+'" width="'+Math.max(.6,X(Math.min(END,q[1]))-X(q[0])).toFixed(2)+'" height="'+lane+'" fill="var(--soft)"/>'});
      b+='<rect x="'+X(0)+'" y="'+y+'" width="'+(X(END)-X(0)).toFixed(1)+'" height="'+lane+'" fill="none" stroke="var(--line)"/>'});
    if(best){const m=(X(best[0])+X(best[1]))/2;b+='<path d="M'+X(best[0]).toFixed(1)+' '+(T-5)+' l0 -4 L'+X(best[1]).toFixed(1)+' '+(T-9)+' l0 4" fill="none" stroke="var(--acc)" stroke-width="1.5"/>';
      b+=RD.t(m,T-12,'all '+n+' stopped '+f(best[1]-best[0])+' ms',{a:'middle',fs:11,w:600,fill:'var(--acc)'})}
    [0,100,200,300].forEach(t=>b+=RD.t(X(t),H-4,t+(t===END?' ms':''),{a:t===0?'start':t===END?'end':'middle',fs:11,fill:'var(--mute)'}));
    el.innerHTML=RD.svg(w,H,b,'five threads of a container with a one-CPU quota: running in short bursts, then all stopped')+
      '<div class="tl-leg"><span style="--sw:var(--c1)">running</span><span style="--sw:var(--soft)">stopped (gap over 300 us)</span></div>';
    const c=$('sc-hero-qn');if(c&&best)c.textContent=f(best[1]-best[0])}
  const draw=()=>{rq();quota()};draw();RD.onRender(draw);RD.onResize(draw);
})();
