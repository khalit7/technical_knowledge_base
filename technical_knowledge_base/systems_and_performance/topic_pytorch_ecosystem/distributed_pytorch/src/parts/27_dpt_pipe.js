// ---- Pipeline schedule explorer, inline in Reading section 8 (was the Pipeline schedules tab) ----
(function(){
  const D=window.DPT,U=window.DU,$=U.$;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const COL={F:'var(--c1)',B:'var(--c4)',I:'var(--c2)',W:'var(--c3)'},COST={F:1,B:2,I:1,W:1};
  const ORDER=['GPipe','1F1B','Interleaved1F1B','LoopedBFS','InterleavedZeroBubble','ZBVZeroBubble','DualPipeV'];
  const keys=Object.keys(D.pp).sort((a,b)=>{const p=k=>{const m=/^(.*)_w(\d)_m(\d)$/.exec(k);return [+m[2],+m[3],ORDER.indexOf(m[1])]};const x=p(a),y=p(b);return x[0]-y[0]||x[1]-y[1]||x[2]-y[2]});
  const label=k=>{const m=/^(.*)_w(\d)_m(\d)$/.exec(k);return m[1]+', '+m[2]+' ranks, '+m[3]+' micro-batches'};
  $('dp-a').innerHTML=keys.map(k=>'<option value="'+k+'"'+(k==='1F1B_w2_m4'?' selected':'')+'>'+label(k)+'</option>').join('');
  $('dp-b').innerHTML='<option value="">none</option>'+keys.map(k=>'<option value="'+k+'"'+(k==='ZBVZeroBubble_w2_m4'?' selected':'')+'>'+label(k)+'</option>').join('');
  let clock='meas',pos=1,playing=false,timer=0,spd=1;
  // ideal replay of the recorded order: each rank runs its actions in order; an action waits for its dependency
  function ideal(ranks){
    const nst=Math.max(...ranks.flatMap(r=>r.acts.map(a=>a[1])))+1;
    const done={};const k=(t,s,m)=>t+s+'.'+m;
    const ptr=ranks.map(()=>0),free=ranks.map(()=>0),out=ranks.map(()=>[]);let left=ranks.reduce((a,r)=>a+r.acts.length,0),guard=0;
    while(left>0&&guard++<100000){let moved=false;
      ranks.forEach((r,ri)=>{while(ptr[ri]<r.acts.length){const a=r.acts[ptr[ri]];const t=a[0],s=a[1],m=a[2];let dep=0,ok=true;
        if(t==='F'&&s>0){ok=done[k('F',s-1,m)]!=null;dep=done[k('F',s-1,m)]}
        if((t==='B'||t==='I')){if(s<nst-1){const d=done[k('B',s+1,m)]!=null?done[k('B',s+1,m)]:done[k('I',s+1,m)];ok=d!=null;dep=d}else{ok=done[k('F',s,m)]!=null;dep=done[k('F',s,m)]}}
        if(t==='W'){const d=done[k('I',s,m)];ok=d!=null;dep=d}
        if(!ok)break;const st=Math.max(free[ri],dep||0),en=st+COST[t];out[ri].push([t,s,m,st,en]);done[k(t,s,m)]=en;free[ri]=en;ptr[ri]++;left--;moved=true}});
      if(!moved)break}
    const span=Math.max(...free);
    return {acts:out,span,bubble:out.map(a=>1-a.reduce((x,q)=>x+q[4]-q[3],0)/span)};
  }
  DU.ppIdeal=ideal;
  function series(key){const r=D.pp[key];if(clock==='ideal'){const id=ideal(r);return {acts:id.acts,span:id.span,bub:id.bubble,unit:'units'}}
    return {acts:r.map(x=>x.acts),span:Math.max(...r.map(x=>x.step)),bub:r.map(x=>x.bubble),unit:'ms'}}
  function draw(){
    const el=$('dp-tl');const w=U.W(el);const A=$('dp-a').value,B=$('dp-b').value;const list=[A].concat(B&&B!==A?[B]:[]);
    const ss=list.map(series);const span=Math.max(...ss.map(s=>s.span));const L=56,R=Math.min(74,w*0.16),lane=24;
    let y=4,s='';const X=t=>L+(w-L-R)*t/span;const tcur=pos*span;
    list.forEach((key,qi)=>{const S=ss[qi];s+=RD.t(4,y+11,label(key).split(',')[0],{w:600});y+=16;
      S.acts.forEach((acts,ri)=>{s+=RD.t(4,y+15,'rank '+ri,{fill:'var(--mute)'})+'<rect x="'+L+'" y="'+y+'" width="'+(X(S.span)-L)+'" height="'+(lane-4)+'" fill="var(--dim)" opacity=".45"/>';
        acts.forEach(a=>{const x0=X(a[3]),x1=X(Math.min(a[4],tcur));if(a[3]>tcur)return;const wd=Math.max(0.8,x1-x0);
          s+='<rect x="'+x0+'" y="'+y+'" width="'+wd+'" height="'+(lane-4)+'" fill="'+COL[a[0]]+'"><title>'+a[0]+' stage '+a[1]+' micro-batch '+a[2]+': '+a[3].toFixed(2)+' to '+a[4].toFixed(2)+' '+S.unit+'</title></rect>';
          if(x1-x0>22)s+=RD.t((x0+x1)/2,y+14,a[0]+a[1]+'.'+a[2],{a:'middle',fs:9.5,fill:'var(--bg)'})});
        s+=RD.t(w-2,y+15,(S.bub[ri]*100).toFixed(0)+'% idle',{a:'end',fs:10,fill:'var(--mute)'});y+=lane});
      y+=8});
    s+='<line x1="'+X(tcur)+'" x2="'+X(tcur)+'" y1="0" y2="'+y+'" stroke="var(--bad)" stroke-width="1"/>';
    s+=RD.t(L,y+10,'0',{fill:'var(--mute)',fs:10})+RD.t(w-R,y+10,span.toFixed(clock==='ideal'?0:1)+' '+ss[0].unit,{a:'end',fill:'var(--mute)',fs:10});
    el.innerHTML=RD.svg(w,y+14,s,'Pipeline schedule timelines');
    // counters for the first schedule at the playhead
    const S=ss[0],r0=S.acts[0];const fin=r0.filter(a=>a[4]<=tcur);
    const inflight=fin.filter(a=>a[0]==='F').length-fin.filter(a=>a[0]==='B'||a[0]==='I').length;
    const busy=r0.reduce((acc,a)=>acc+Math.max(0,Math.min(a[4],tcur)-a[3])*(a[3]<tcur?1:0),0);
    const rec=D.pp[A][0];
    $('dp-cnt').innerHTML=RD.stat('Time',tcur.toFixed(clock==='ideal'?1:1)+' '+S.unit,'of '+S.span.toFixed(1))+RD.stat('Rank 0 activations held','for '+inflight+' micro-batch'+(inflight===1?'':'es'),'forwards done minus backwards done')+
      RD.stat('Rank 0 busy so far',tcur>0?(100*busy/tcur).toFixed(0)+'%':'-','')+RD.stat('Rank 0 measured peak',U.mb(rec.mem,0),'memory profiler, one step')+
      RD.stat('Steps (5 timed)',D.pp[A][0].steps.join(', ')+' ms','load '+rec.load[0]);
  }
  function setPlay(p){playing=p;$('dp-play').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';if(timer){clearTimeout(timer);timer=0}if(p){if(pos>=1)pos=0;tick()}}
  const visible=()=>{const c=$('dpt-pipe');return c&&c.offsetParent!==null&&!document.hidden};
  function tick(){timer=0;if(!playing)return;if(!visible()){setPlay(false);return}pos=Math.min(1,pos+0.01*spd);$('dp-scrub').value=Math.round(pos*1000);draw();if(pos>=1){setPlay(false);return}timer=setTimeout(tick,60)}
  $('dp-play').addEventListener('click',()=>setPlay(!playing));
  $('dp-scrub').addEventListener('input',e=>{setPlay(false);pos=+e.target.value/1000;draw()});
  $('dp-spd').addEventListener('change',e=>{spd=+e.target.value});
  $('dp-a').addEventListener('change',()=>{pos=1;$('dp-scrub').value=1000;draw()});$('dp-b').addEventListener('change',draw);
  U.seg($('dp-clock'),m=>{clock=m;draw()});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)setPlay(false)});
  function table(){
    $('dp-tbl').innerHTML=U.table(['Schedule','Ranks, micro-batches','Stages per rank','Step, median (range of 5)','Bubble per rank, median (range)','Ideal-clock bubble','Formula (p&minus;1)/(m+p&minus;1)','Peak per rank','Gradients vs one process'],keys.map(k=>{const r=D.pp[k];const m=/^(.*)_w(\d)_m(\d)$/.exec(k);const p=+m[2],mb=+m[3];const id=ideal(r);
      return [m[1],p+', '+mb,r[0].stages.length,r[0].step.toFixed(0)+' ms ('+Math.min(...r[0].steps).toFixed(0)+' to '+Math.max(...r[0].steps).toFixed(0)+')',r.map(x=>x.bubble.toFixed(2)+' ('+Math.min(...x.bubbles).toFixed(2)+' to '+Math.max(...x.bubbles).toFixed(2)+')').join('; '),id.bubble.map(b=>b.toFixed(2)).join(', '),((p-1)/(mb+p-1)).toFixed(2),r.map(x=>U.mb(x.mem,0)).join(', '),U.sci(Math.max(...r.map(x=>x.gd)))]}));
    const ld=keys.map(k=>D.pp[k][0].load[0]);
    $('dp-foot').innerHTML='Load average (1 minute) at the end of each run: '+Math.min(...ld).toFixed(1)+' to '+Math.max(...ld).toFixed(1)+'. The formula assumes every stage takes the same time; here the first stage also embeds and the last also computes the head and loss, so ranks differ. Measured bubbles include Python overhead and gloo send/recv waits, which the ideal clock leaves out; on GPUs the ratio of communication to compute is different again, so trust the order and the ideal-clock column for what transfers. The ideal clock reproduces the formula for GPipe and 1F1B by construction (equal stages, no communication); for the multi-stage schedules it shows their own smaller fill and drain. Peaks are activations, gathered weights and temporaries above the persistent state, for float32 on this CPU.';
  }
  table();RD.onRender(draw);RD.onResize(draw);draw();
})();
