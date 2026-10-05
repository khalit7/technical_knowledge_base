// ---- Part 1 (In depth), Event loop tab: replay of the real a2_trace.py events, drawn to scale ----
(function(){
  const $=id=>document.getElementById(id),esc=RD.esc,TAB='t-pa-loop';
  if(!$('pa-loop-card'))return;
  const R=(window.TAB_RENDER=window.TAB_RENDER||{});(R[TAB]=R[TAB]||[]);
  const WHO=['A','B','C'],AXIS=620;
  let mode='sequential';
  const secs=n=>{const m=/([\d.]+)\)?$/.exec(n||'');return m?parseFloat(m[1]):0};
  function state(ev,i){
    const T=ev[i][2],st={};
    WHO.forEach(w=>{const mine=ev.slice(0,i+1).filter(e=>e[0]===w);
      if(!mine.length){st[w]={s:mode==='sequential'?'not created yet':'ready (task queued)',k:mode==='sequential'?'none':'ready'};return}
      const last=mine[mine.length-1];
      if(last[1]==='start'||last[1]==='resume')st[w]={s:'running',k:'run'};
      else if(last[1]==='block')st[w]={s:'blocking the thread',k:'block'};
      else if(last[1]==='done')st[w]={s:'done at '+last[2].toFixed(0)+' ms',k:'done'};
      else if(last[1]==='await'){const due=last[2]+secs(last[3])*1000;st[w]=T>=due-0.5?{s:'ready (due at '+due.toFixed(0)+' ms)',k:'ready'}:{s:'suspended until '+due.toFixed(0)+' ms',k:'wait'}}
    });
    return st;
  }
  function caption(ev,i,tot){
    const [w,what,t,note]=ev[i];let c='<b>'+t.toFixed(1)+' ms.</b> ';
    if(what==='start')c+=w+' starts running on the loop\'s one thread.'+(mode==='sequential'&&w!=='A'?' In this mode <code>main</code> awaits each coroutine in turn, so '+w+' is created only now.':'');
    else if(what==='await'){const due=t+secs(note)*1000;
      c+=w+' reaches <code>await '+esc(note)+'</code> and suspends: the thread goes back to the loop'+(note.indexOf('to_thread')>=0?', and the blocking call runs in a worker thread.':', which sets a timer for '+due.toFixed(0)+' ms.')+(mode!=='sequential'&&w!=='C'?' The loop immediately runs the next ready task.':'')}
    else if(what==='block')c+=w+' calls <code>'+esc(note)+'</code>. That is not an <code>await</code>: the thread is stuck inside the call, and the loop cannot run A\'s timer or start C until it returns.';
    else if(what==='resume'){let a=null;for(let k=i-1;k>=0;k--)if(ev[k][0]===w&&ev[k][1]==='await'){a=ev[k];break}
      const due=a?a[2]+secs(a[3])*1000:t,late=t-due;
      c+=w+'\'s wait is over (due at '+due.toFixed(0)+' ms); the loop resumes it.'+(late>20?' <b>'+late.toFixed(0)+' ms late</b>: the thread was busy with B\'s blocking call.':'')}
    else if(what==='done')c+=w+' returns its result.'+(i===ev.length-1?' <b>All done: total '+tot.toFixed(0)+' ms.</b>':'');
    return c;
  }
  function draw(i){
    const D=PA.loop[mode],ev=D.events,T=ev[i][2];
    const W=Math.min(860,RD.width($('pa-loop-svg'))),L=58,x=v=>L+(W-L-10)*v/AXIS,lh=34,top=22,H=top+4*lh+26;
    let b='';
    for(let m=0;m<=600;m+=100){b+='<line x1="'+x(m)+'" y1="'+top+'" x2="'+x(m)+'" y2="'+(top+4*lh)+'" stroke="var(--line)"/>'+RD.t(x(m),top+4*lh+14,m+(m===600?' ms':''),{a:'middle',fs:10.5,fill:'var(--mute)'})}
    const lanes=['thread'].concat(WHO);
    lanes.forEach((n,k)=>{b+=RD.t(4,top+k*lh+lh/2+4,n==='thread'?'thread':'coro '+n,{fs:11.5,w:n==='thread'?600:400})});
    const seen=ev.slice(0,i+1);
    WHO.forEach((w,k)=>{const y=top+(k+1)*lh+lh/2,mine=seen.filter(e=>e[0]===w);
      for(let j=0;j<mine.length;j++){const e=mine[j],nx=mine[j+1],end=nx?nx[2]:T;
        if(e[1]==='start'||e[1]==='resume'){if(nx||e[2]<=T)b+='<rect x="'+x(e[2])+'" y="'+(y-7)+'" width="'+Math.max(3,x(end)-x(e[2]))+'" height="14" rx="2" fill="var(--ink)"/>'}
        else if(e[1]==='await'){b+='<rect x="'+x(e[2])+'" y="'+(y-2)+'" width="'+Math.max(1,x(end)-x(e[2]))+'" height="4" rx="2" fill="var(--c1)"/>';
          const due=e[2]+secs(e[3])*1000;b+='<circle cx="'+x(due)+'" cy="'+y+'" r="4" fill="var(--bg)" stroke="var(--c1)" stroke-width="2"/>'}
        else if(e[1]==='block'){b+='<rect x="'+x(e[2])+'" y="'+(y-7)+'" width="'+Math.max(3,x(end)-x(e[2]))+'" height="14" rx="2" fill="var(--bad)"/>'}
      }});
    // thread lane: red while blocked, dark slivers when a coroutine runs
    const ty=top+lh/2;b+='<rect x="'+x(0)+'" y="'+(ty-1)+'" width="'+(x(T)-x(0))+'" height="2" fill="var(--dim)"/>';
    seen.forEach((e,j)=>{if(e[1]==='block'){const d=seen.find(f=>f[0]===e[0]&&f[1]==='done'&&f[2]>=e[2]);b+='<rect x="'+x(e[2])+'" y="'+(ty-7)+'" width="'+Math.max(3,x(d?d[2]:T)-x(e[2]))+'" height="14" rx="2" fill="var(--bad)"/>'}
      else b+='<rect x="'+(x(e[2])-1.5)+'" y="'+(ty-7)+'" width="3" height="14" fill="var(--ink)"/>'});
    b+='<line x1="'+x(T)+'" y1="'+(top-8)+'" x2="'+x(T)+'" y2="'+(top+4*lh)+'" stroke="var(--acc)" stroke-width="1.5"/>'+RD.t(Math.min(x(T),W-40),top-10,T.toFixed(0)+' ms',{a:'middle',fs:11,fill:'var(--acc)',w:600});
    $('pa-loop-svg').innerHTML=RD.svg(W,H,b,'Timeline of three coroutines, mode '+mode);
    $('pa-loop-cap').innerHTML='<b>Step '+(i+1)+' of '+ev.length+'.</b> '+caption(ev,i,D.total_ms);
    const st=state(ev,i),cnt=k=>WHO.filter(w=>st[w].k===k).length;
    $('pa-loop-cnt').innerHTML='<span>loop clock: <b>'+T.toFixed(1)+' ms</b></span>'+WHO.map(w=>'<span>'+w+': <b>'+esc(st[w].s)+'</b></span>').join('')+'<span>suspended: <b>'+cnt('wait')+'</b>, ready: <b>'+cnt('ready')+'</b>, done: <b>'+cnt('done')+'</b></span><span>this mode\'s total: <b>'+D.total_ms.toFixed(0)+' ms</b></span>';
  }
  const an=RD.anim({card:'pa-loop-card',ctl:'pa-loop-ctl',n:PA.loop[mode].events.length,draw,ms:1500,label:'Event'});
  RD.seg($('pa-loop-mode'),m=>{mode=m;an.reset(PA.loop[m].events.length);an.play()});
  R[TAB].push(()=>an.redraw());
  addEventListener('resize',()=>{const t=$(TAB);if(t&&!t.hidden)an.redraw()});
})();
