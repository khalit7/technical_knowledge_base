// ---- Reading, section 11: the lock queue, replayed from three measured runs (inputs/queue.json) ----
// Each run is cut into a few explained stretches (the step lists sx-q-*, one item per stretch); a stretch replays its part of the timeline
// when it is reached going forward (about real time), and jumps to its end on back, the scrubber or under reduced motion.
(function(){
  const svgEl=document.getElementById('rd-q-svg');if(!svgEl)return;
  const Q=window.SM_DATA.queue,esc=RD.esc;
  const T1=4.5,ST={long:[[0,.5],[.5,.75],[.75,4.0],[4.0,4.5]],timeout:[[0,.5],[.5,1.05],[1.05,2.0],[2.0,3.5],[3.5,4.5]],quick:[[0,.5],[.5,.75],[.75,4.5]]};
  let mode='long',raf=0;
  window.CHK=Object.assign(window.CHK||{},{queue:Object.fromEntries(Object.keys(ST).map(m=>[m,ST[m].length]))});
  const lanes=()=>{const ev=Q.scenarios[mode].events;const names=[];ev.forEach(e=>{if(!names.includes(e.who))names.push(e.who)});
    const order=['Long transaction','Migration'];return order.filter(n=>names.includes(n)).concat(names.filter(n=>!order.includes(n)).sort())};
  function render(t){
    const sc=Q.scenarios[mode],ev=sc.events,L=lanes();
    const W=RD.width(svgEl),lab=W<420?92:122,pw=W-lab-6,lh=20,top=18,x=s=>lab+pw*Math.min(s,T1)/T1;
    let s='';
    for(let k=0;k<=T1;k+=0.5){const xx=x(k);s+='<line x1="'+xx+'" x2="'+xx+'" y1="'+(top-4)+'" y2="'+(top+L.length*lh)+'" stroke="var(--line)"/>'+RD.t(xx,11,k.toFixed(1)+' s',{fs:11,a:k===0?'start':k>=T1?'end':'middle',fill:'var(--mute)'})}
    L.forEach((nm,li)=>{const y=top+li*lh;s+=RD.t(0,y+13,nm,{fs:11,w:nm==='Migration'?600:400});
      ev.filter(e=>e.who===nm).forEach(e=>{if(e.start>t)return;const end=Math.min(e.end,t),x0=x(e.start),x1=Math.max(x0+2,x(end));
        let col='var(--dim)';
        if(e.kind==='read')col=(end-e.start)>0.1?'var(--bad)':'var(--good)';
        if(e.kind==='alter')col=e.outcome==='lock_timeout'?'var(--c5)':'var(--c4)';
        s+='<rect x="'+x0+'" y="'+(y+3)+'" width="'+(x1-x0)+'" height="'+(lh-6)+'" rx="3" fill="'+col+'" opacity="'+(e.kind==='txn'?0.7:0.9)+'"/>';
        if(e.end<=t&&e.kind==='alter'&&e.outcome==='lock_timeout')s+=RD.t(x1+3,y+13,'gave up',{fs:11,fill:'var(--c5)'});
        if(e.end<=t&&e.kind==='read'&&e.wait>0.1&&W>=420)s+=RD.t(x1+3,y+13,e.wait.toFixed(2)+' s',{fs:11,fill:'var(--bad)'});});});
    s+='<line x1="'+x(t)+'" x2="'+x(t)+'" y1="'+(top-6)+'" y2="'+(top+L.length*lh+2)+'" stroke="var(--ink)" stroke-width="1.5"/>';
    svgEl.innerHTML=RD.svg(W,top+L.length*lh+6,s,'Sessions on messages_big over time');
    const reads=ev.filter(e=>e.kind==='read');
    const waiting=reads.filter(e=>e.start<=t&&e.end>t&&t-e.start>0.05).length,done=reads.filter(e=>e.end<=t).length;
    const worst=Math.max(0,...reads.filter(e=>e.start<=t).map(e=>Math.min(e.end,t)-e.start));
    const al=ev.filter(e=>e.kind==='alter'),aldone=al.find(e=>e.outcome==='done'&&e.end<=t);
    document.getElementById('rd-q-cnt').innerHTML=RD.stat('Time',t.toFixed(1)+' s')+RD.stat('Reads finished',done+' of '+reads.length)+RD.stat('Reads waiting now',waiting)+RD.stat('Longest read wait so far',worst.toFixed(2)+' s')+RD.stat('ALTER',aldone?'done at '+aldone.end.toFixed(2)+' s':(al.some(e=>e.start<=t)?'waiting (attempt '+Math.max(...al.filter(e=>e.start<=t).map(e=>e.attempt))+')':'not started'));
    const sn=sc.snapshot&&sc.snapshot.waiting_locks||[];
    document.getElementById('rd-q-note').innerHTML=sn.length?'Snapshot of <code>pg_locks</code> taken at 2.2 s in this run: '+sn.map(r=>esc(r[0])+(r[1]?' granted':' <b>waiting</b>')+' ('+esc(r[2].split(' FROM')[0].slice(0,24))+')').join('; ')+'. Recorded '+esc(Q.date)+' on PostgreSQL '+esc(Q.postgres)+'; median of 3 runs per scenario.':'Recorded '+esc(Q.date)+' on PostgreSQL '+esc(Q.postgres)+'; median of 3 runs per scenario.';
  }
  const card=document.getElementById('rd-q-card');
  function draw(i){cancelAnimationFrame(raf);const [t0,t1]=ST[mode][i];
    if(!card.classList.contains('rd-fwd')||RD.RM||card.offsetParent===null){render(t1);return}
    const T0=performance.now(),dur=Math.max(700,(t1-t0)*1000);
    const step=now=>{const u=Math.min(1,(now-T0)/dur);render(t0+(t1-t0)*u);if(u<1)raf=requestAnimationFrame(step)};raf=requestAnimationFrame(step)}
  const lists=m=>{Object.keys(ST).forEach(k=>{const l=document.getElementById('sx-q-'+k);if(l)l.hidden=k!==m})};lists(mode);
  const A=RD.anim({card:'rd-q-card',ctl:'rd-q-ctl',n:ST[mode].length,ms:6500,label:'Stretch',draw,list:'sx-q-'+mode});
  RD.seg(document.getElementById('rd-q-mode'),m=>{mode=m;lists(m);A.reset(ST[m].length,'sx-q-'+m)});
  RD.onResize(()=>A.redraw());
})();
