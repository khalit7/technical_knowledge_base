// ---- Reading, section 2: FIFO against EASY backfill on one queue (same simulator as src/read/recompute.py) ----
(function(){
  const NODES=8;
  const JOBS=[['A',4,6],['B',6,4],['C',2,3],['D',1,2],['E',4,5],['F',2,7],['G',1,1],['H',3,2]];
  const COL=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','var(--c1)','var(--c3)'];
  function simulate(policy){
    let t=0;const waiting=JOBS.map((j,i)=>i),running=[],sched={},events=[];
    for(let guard=0;guard<100&&(waiting.length||running.length);guard++){
      let changed=true;
      while(changed){changed=false;
        let free=NODES-running.reduce((a,r)=>a+JOBS[r.i][1],0);
        while(waiting.length&&JOBS[waiting[0]][1]<=free){const i=waiting.shift();
          running.push({i,s:t,e:t+JOBS[i][2]});sched[JOBS[i][0]]=[t,t+JOBS[i][2]];events.push([t,'start',JOBS[i][0],'in order']);free-=JOBS[i][1];changed=true}
        if(policy==='easy'&&waiting.length){
          const need=JOBS[waiting[0]][1];const ends=running.map(r=>[r.e,JOBS[r.i][1]]).sort((a,b)=>a[0]-b[0]);
          let avail=free,shadow=null;for(const [le,n] of ends){avail+=n;if(avail>=need){shadow=le;break}}
          let extra=avail-need;
          for(const i of waiting.slice(1)){const n=JOBS[i][1],rt=JOBS[i][2];
            if(n<=free&&(t+rt<=shadow||n<=extra)){waiting.splice(waiting.indexOf(i),1);running.push({i,s:t,e:t+rt});sched[JOBS[i][0]]=[t,t+rt];
              events.push([t,'start',JOBS[i][0],'backfilled']);free-=n;if(!(t+rt<=shadow))extra-=n;changed=true}}
        }
      }
      if(!running.length)break;
      t=Math.min(...running.map(r=>r.e));
      for(const r of running.filter(r=>r.e===t)){running.splice(running.indexOf(r),1);events.push([t,'end',JOBS[r.i][0],''])}
    }
    const mk=Math.max(...Object.values(sched).map(v=>v[1]));
    const busy=JOBS.reduce((a,j)=>a+j[1]*j[2],0);
    const mw=Object.values(sched).reduce((a,v)=>a+v[0],0)/JOBS.length;
    // node rows: lowest free node indices at each start
    const order=Object.keys(sched).sort((a,b)=>sched[a][0]-sched[b][0]||events.findIndex(e=>e[2]===a&&e[1]==='start')-events.findIndex(e=>e[2]===b&&e[1]==='start'));
    const freeAt=new Array(NODES).fill(0),rows={};
    order.forEach(k=>{const j=JOBS.find(x=>x[0]===k),[s,e]=sched[k];const r=[];for(let n=0;n<NODES&&r.length<j[1];n++)if(freeAt[n]<=s)r.push(n);r.forEach(n=>freeAt[n]=e);rows[k]=r});
    return {sched,events,makespan:mk,util:busy/(NODES*mk),meanWait:mw,rows};
  }
  const R={fifo:simulate('fifo'),easy:simulate('easy')};
  window.RD_BF=R;
  const pct=x=>Math.round(x*100)+'%';
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
  set('rd-bf-m1',R.fifo.makespan);set('rd-bf-m2',R.easy.makespan);set('rd-bf-u1',pct(R.fifo.util));set('rd-bf-u2',pct(R.easy.util));
  set('rd-bf-w1',R.fifo.meanWait.toFixed(1));set('rd-bf-w2',R.easy.meanWait.toFixed(1));
  const svgEl=document.getElementById('rd-bf-svg');if(!svgEl)return;
  let mode='fifo';
  const TMAX=Math.max(R.fifo.makespan,R.easy.makespan);
  function draw(i){
    const r=R[mode],t=Math.min(i,r.makespan);
    const w=Math.max(300,Math.min(860,RD.width(svgEl)));
    const L=w<480?44:56,rw=w-L-8,rh=w<480?20:24,top=18,H=top+NODES*rh+34;
    const xs=v=>L+v/TMAX*rw;let b='';
    for(let n=0;n<NODES;n++){b+='<rect x="'+L+'" y="'+(top+n*rh)+'" width="'+rw+'" height="'+(rh-3)+'" fill="var(--soft)"/>'+RD.t(L-6,top+n*rh+rh/2+3,(w<480?'n':'node ')+(n+1),{a:'end',fs:10.5,fill:'var(--mute)'})}
    for(let v=0;v<=TMAX;v+=w<480?4:2)b+=RD.t(xs(v),top+NODES*rh+12,v,{a:'middle',fs:10,fill:'var(--mute)'});
    b+=RD.t(L+rw/2,top+NODES*rh+26,'time',{a:'middle',fs:10.5,fill:'var(--mute)'});
    JOBS.forEach((j,ji)=>{const k=j[0],[s,e]=r.sched[k];if(s>t)return;const e2=Math.min(e,t);if(e2<=s&&!(s===t))return;
      const bf=r.events.some(ev=>ev[2]===k&&ev[3]==='backfilled');
      r.rows[k].forEach((n,ri)=>{const x=xs(s),ww=Math.max(2,xs(Math.max(e2,s+0.15))-x);
        b+='<rect x="'+x+'" y="'+(top+n*rh)+'" width="'+ww+'" height="'+(rh-3)+'" rx="2" fill="'+COL[ji]+'" opacity="'+(e2<e?0.6:0.9)+'"'+(bf?' stroke="var(--ink)" stroke-dasharray="3 2"':'')+'/>';
        if(ri===0&&ww>12)b+=RD.t(x+ww/2,top+n*rh+rh/2+3,k,{a:'middle',fs:11,w:600,fill:'var(--bg)'});});
    });
    b+='<line x1="'+xs(t)+'" y1="'+(top-6)+'" x2="'+xs(t)+'" y2="'+(top+NODES*rh)+'" stroke="var(--ink)" stroke-width="1.5"/>';
    // waiting queue
    const wq=JOBS.filter(j=>r.sched[j[0]][0]>t);
    svgEl.innerHTML=RD.svg(w,H,b,'Gantt chart of eight jobs on eight nodes');
    // caption
    const evs=r.events.filter(ev=>ev[0]===t);
    const starts=evs.filter(e=>e[1]==='start'),ends=evs.filter(e=>e[1]==='end');
    let title='Time '+t,body='';
    if(t===0)body=mode==='fifo'?'A takes 4 nodes. B needs 6 and only 4 are free, so FIFO stops: nothing behind B may start, and 4 nodes sit idle.':'A takes 4 nodes. B needs 6, so B gets a reservation at time 6, when A ends. C, D and G fit in the 4 idle nodes and end before 6: they start now.';
    else{if(ends.length)body+=ends.map(e=>e[2]).join(', ')+' finished. ';
      if(starts.length)body+=starts.map(e=>e[2]+(e[3]==='backfilled'?' backfilled':' started in order')).join(', ')+'. ';
      if(!evs.length)body='Running; nothing changes this step.';}
    if(t>=r.makespan)body+=' All done at '+r.makespan+'; utilisation '+pct(r.util)+', mean wait '+r.meanWait.toFixed(1)+'.';
    document.getElementById('rd-bf-cap').innerHTML='<div class="t">'+title+'</div><p>'+body+'</p>';
    const busyNow=JOBS.filter(j=>{const [s,e]=r.sched[j[0]];return s<=t&&t<e}).reduce((a,j)=>a+j[1],0);
    const used=JOBS.reduce((a,j)=>{const [s,e]=r.sched[j[0]];return a+j[1]*Math.max(0,Math.min(e,t)-s)},0);
    document.getElementById('rd-bf-cnt').innerHTML=RD.stat('Nodes busy now',busyNow+' of '+NODES)+RD.stat('Waiting',wq.length?wq.map(j=>j[0]).join(' '):'none')+RD.stat('Utilisation so far',t?pct(used/(NODES*t)):'n/a')+RD.stat('B starts at',r.sched.B[0]);
  }
  const an=RD.anim({card:'rd-bf-card',ctl:'rd-bf-ctl',n:R.fifo.makespan+1,draw,ms:1300,label:'Time'});
  RD.seg(document.getElementById('rd-bf-mode'),m=>{mode=m;an.reset(R[m].makespan+1);an.play()});
  RD.onResize(()=>an.redraw());
})();
