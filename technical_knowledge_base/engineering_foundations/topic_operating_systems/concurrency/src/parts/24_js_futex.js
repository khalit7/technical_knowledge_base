// ---- Section 4: one contended lock, four designs (before/after animation) ----
// A tick simulation (1 tick = 0.1 µs) of threads A and B (each: 1 µs work, lock, 2 µs critical section, unlock; twice)
// and thread C (8 µs of work, no lock) on 2 CPUs. Costs: a futex system call 0.3 µs (measured: the wake-on-every-unlock
// lock's 289 ns per pair); wake-up latency from the measured ping-pong (half a round trip, same CPU or across CPUs); time slice 3 µs
// (illustrative, shortened so that preemption appears at this scale); adaptive spin limit 1 µs (illustrative).
window.FXSIM=function(mode,wakeUs){
  const SYS=3,SLICE=30,SPINMAX=10,WAKE=Math.round(wakeUs*10),NCPU=2;
  const mk=(name,prog,start)=>({name,prog,ip:0,rem:prog[0].d||0,act:'ready',on:false,used:0,start,wakeAt:0,spin:0,sys:null,acts:[],waited:false,readyAt:start});
  const AB=()=>[{t:'work',d:10},{t:'lock'},{t:'cs',d:20},{t:'unlock'},{t:'work',d:10},{t:'lock'},{t:'cs',d:20},{t:'unlock'},{t:'end'}];
  const T=[mk('A',AB(),0),mk('B',AB(),1),mk('C',[{t:'work',d:80},{t:'end'}],0)];
  T[1].prog[0].d=12;T[1].rem=12;
  let word=0,owner=null;const waitq=[];const ev=[];let sys=0,spinT=0,tick=0;
  const say=(txt,sc)=>ev.push({t:tick,txt,sys:!!sc});
  const nextOp=th=>{th.ip++;const o=th.prog[th.ip];th.rem=o.d||0;th.spin=0;if(o.t==='end'){th.act='done';th.on=false;say(th.name+' finishes')}};
  function wake(){if(!waitq.length)return;const w=waitq.shift();w.act='waking';w.wakeAt=tick+WAKE;say('the kernel wakes '+w.name+'; it needs '+wakeUs+' µs to be running again')}
  while(tick<2000){
    if(T.every(t=>t.act==='done'))break;
    T.forEach(t=>{if(t.act==='waking'&&tick>=t.wakeAt){t.act='ready';t.readyAt=tick}});
    // scheduling: preempt after a slice if someone waits; fill free CPUs in order of waiting
    const ready=()=>T.filter(t=>!t.on&&t.act==='ready').sort((a,b)=>a.readyAt-b.readyAt);
    let waiting=ready().length;
    T.forEach(t=>{if(waiting>0&&t.on&&t.used>=SLICE&&!t.sys){waiting--;t.on=false;t.act='ready';t.readyAt=tick;t.used=0;say(t.name+'\'s time slice ends; it is preempted'+(owner===t?' while holding the lock':''))}});
    let free=NCPU-T.filter(t=>t.on).length;ready().forEach(t=>{if(free>0){t.on=true;t.used=0;free--;t.act='run'}});
    T.forEach(t=>{
      if(!t.on){t.acts.push(t.act==='done'?'done':t.act==='sleep'?'sleep':t.act==='waking'?'waking':'ready');return}
      t.used++;
      if(t.sys){t.acts.push('sys');t.sys.rem--;if(t.sys.rem<=0){const f=t.sys.then;t.sys=null;f()}return}
      const o=t.prog[t.ip];
      if(o.t==='work'||o.t==='cs'){t.acts.push(o.t);if(--t.rem<=0)nextOp(t);return}
      if(o.t==='lock'){
        if(word===0){word=(mode==='futex'||mode==='adaptive')&&t.waited?2:1;owner=t;t.acts.push('cs');say(t.name+' takes the lock'+(t.spin?' after spinning '+(t.spin/10).toFixed(1)+' µs':'')+(word===2?' (word = 2: others may still sleep)':' with one atomic instruction'));t.waited=false;nextOp(t);
          const o2=t.prog[t.ip];if(o2.t==='cs'){t.rem--}return}
        if(mode==='spin'||(mode==='adaptive'&&t.spin<SPINMAX)){if(!t.spin)say(t.name+' finds the lock taken and spins');t.spin++;spinT++;t.acts.push('spin');return}
        // sleep in the kernel
        if(mode!=='sysc')word=2;
        sys++;t.acts.push('sys');say(t.name+(mode==='adaptive'?' gave up spinning':' finds the lock taken')+': futex_wait system call',1);
        t.sys={rem:SYS-1,then:()=>{
          if(word===0||(mode!=='sysc'&&word!==2)){say(t.name+'\'s futex_wait returns EAGAIN: the word changed; retry');return}
          t.act='sleep';t.on=false;t.waited=true;waitq.push(t);say(t.name+' sleeps; its CPU is free for other threads')}};
        if(t.sys.rem<=0){const f=t.sys.then;t.sys=null;f()}
        return}
      if(o.t==='unlock'){const old=word;word=0;owner=null;
        const need=mode==='sysc'||((mode==='futex'||mode==='adaptive')&&old===2);
        if(need){sys++;t.acts.push('sys');say(t.name+' unlocks'+(mode==='sysc'?': this lock always makes a futex_wake call':': the word was 2, so futex_wake'),1);
          t.sys={rem:SYS-1,then:()=>{wake();nextOp(t)}};}
        else{t.acts.push('cs');say(t.name+' unlocks with one atomic exchange, no system call');nextOp(t)}
        return}
    });
    tick++;
  }
  const doneAt=n=>{const a=T.find(t=>t.name===n).acts;const i=a.indexOf('done');return i<0?a.length:i};
  return {threads:T.map(t=>({name:t.name,acts:t.acts})),events:ev,end:tick,sys,spin:spinT,doneC:doneAt('C'),doneAB:Math.max(doneAt('A'),doneAt('B'))};
};
(function(){const card=document.getElementById('rd-fx-card');if(!card)return;
  const C={work:'var(--c3)',cs:'var(--c1)',spin:'var(--c2)',sys:'var(--c4)',sleep:'var(--dim)',waking:'var(--c5)',ready:'none'};
  const LEG=[['work','work outside the lock'],['cs','critical section'],['spin','spinning'],['sys','in the kernel (futex call)'],['sleep','asleep (off CPU)'],['waking','being woken']];
  document.getElementById('rd-fx-leg').innerHTML=LEG.map(([k,n])=>'<span style="--sw:'+C[k]+'">'+n+'</span>').join('');
  const WK={same:+window.CD.v['pp.1cpu.futex.half'],cross:+window.CD.v['pp.2cpu.futex.half']};
  let mode='spin',wk=WK.same,sim,frames,MAXT=400;
  function build(){MAXT=Math.ceil(Math.max(...['spin','sysc','futex','adaptive'].map(m=>FXSIM(m,wk).end))/50)*50;sim=FXSIM(mode,wk);const ts=[...new Set(sim.events.map(e=>e.t))].sort((a,b)=>a-b);frames=ts.map(t=>({t,ev:sim.events.filter(e=>e.t===t)}));frames.push({t:sim.end,ev:[{txt:'All done at '+(sim.end/10).toFixed(1)+' µs'}]})}
  const svgEl=document.getElementById('rd-fx-svg'),cap=document.getElementById('rd-fx-cap'),cnt=document.getElementById('rd-fx-cnt');
  // the time axis is the same for all four designs at a given wake-up cost, so they compare to scale
  function draw(i){const f=frames[Math.min(i,frames.length-1)],cut=f.t;const W=RD.width(svgEl),l=26,r=10,pw=W-l-r,rh=26,H=3*rh+28;
    const x=t=>l+t/MAXT*pw;let s='';
    const stepUs=MAXT>500?10:5;for(let us=0;us<=MAXT/10;us+=stepUs){s+='<line x1="'+x(us*10)+'" x2="'+x(us*10)+'" y1="4" y2="'+(3*rh+6)+'" stroke="var(--line)"/>'+RD.t(x(us*10),3*rh+20,us+' µs',{a:us+stepUs>MAXT/10?'end':us===0?'start':'middle',fs:10})}
    sim.threads.forEach((th,k)=>{const y=6+k*rh;s+=RD.t(4,y+15,th.name,{w:600,fs:12});
      let a0=0;for(let t=1;t<=Math.min(cut,th.acts.length);t++){if(t===Math.min(cut,th.acts.length)||th.acts[t]!==th.acts[a0]){const k2=th.acts[a0];
        if(C[k2]&&C[k2]!=='none')s+='<rect x="'+x(a0)+'" y="'+(y+3)+'" width="'+Math.max(0.6,x(t)-x(a0))+'" height="'+(rh-8)+'" fill="'+C[k2]+'"'+(k2==='sleep'?' opacity="0.8"':'')+'/>';
        else if(k2==='ready')s+='<line x1="'+x(a0)+'" x2="'+x(t)+'" y1="'+(y+rh/2)+'" y2="'+(y+rh/2)+'" stroke="var(--mute)" stroke-dasharray="2 2"/>';
        a0=t}}});
    s+='<line x1="'+x(cut)+'" x2="'+x(cut)+'" y1="2" y2="'+(3*rh+8)+'" stroke="var(--ink)" stroke-width="1.2"/>';
    svgEl.innerHTML=RD.svg(W,H,s,'Timeline of threads A, B and C');
    cap.innerHTML='<div class="t">'+(cut/10).toFixed(1)+' µs</div>'+f.ev.map(e=>'<p>'+RD.esc(e.txt)+'</p>').join('');
    // running counters up to the cursor
    const sysN=sim.events.filter(e=>e.t<=cut&&e.sys).length;
    let sp=0;sim.threads.forEach(th=>{for(let t=0;t<Math.min(cut,th.acts.length);t++)if(th.acts[t]==='spin')sp++});
    const fin=i>=frames.length-1;
    cnt.innerHTML=RD.stat('futex system calls',String(sysN),'so far')+RD.stat('CPU time spent spinning',(sp/10).toFixed(1)+' µs','so far')+
      RD.stat('C (no lock) finishes at',fin?(sim.doneC/10).toFixed(1)+' µs':'...','8 µs of work')+RD.stat('A and B finish at',fin?(sim.doneAB/10).toFixed(1)+' µs':'...','both lock holders');}
  build();
  const A=RD.anim({card:'rd-fx-card',ctl:'rd-fx-ctl',n:frames.length,ms:1300,label:'Step through the timeline',draw});
  RD.seg(document.getElementById('rd-fx-mode'),m=>{mode=m;build();A.reset(frames.length);A.play()});
  RD.seg(document.getElementById('rd-fx-wake'),m=>{wk=WK[m];build();A.reset(frames.length);A.play()});
  RD.onResize(()=>A.redraw());
})();
