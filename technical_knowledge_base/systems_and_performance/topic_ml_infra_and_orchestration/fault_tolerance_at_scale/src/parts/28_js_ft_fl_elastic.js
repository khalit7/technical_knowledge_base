// ---- Moved from the root Failure lab (2026-10-19): elastic torchrun, shrink and grow, against a run with a spare agent (measured) ----
(function(){
  const H=window.FLH&&window.FLH('t-read'),D=window.FL_DATA;if(!H||!D||!D.elastic)return;const $=H.$;
  let mode='el';const N=70;
  const run=()=>mode==='el'?D.elastic:D.spare;
  function events(r){
    const E=[];const mk=r.marks,st=r.starts;
    E.push([st[0][0],'Agents A and B meet at the rendezvous; 4 ranks start (world size 4).']);
    E.push([mk.kill_B,'Agent B and its two ranks are killed with SIGKILL after step '+(mode==='el'?120:150)+'.']);
    if(mode==='sp')E.splice(1,0,[mk.start_C,'Agent C starts while the job is full (2 of 2 nodes): it waits as a spare, and training is not disturbed.']);
    st.slice(1).forEach(s=>E.push([s[0],'Workers restart with world size '+s[1]+' from step_'+String(s[2]).padStart(6,'0')+'.pt, '+(s[0]-mk.kill_B<0?'':((mode==='el'&&s[1]===4)?(s[0]-mk.start_C).toFixed(1)+' s after C started':(s[0]-mk.kill_B).toFixed(1)+' s after the kill'))+' (restart count '+s[3]+').']));
    if(mode==='el')E.splice(3,0,[mk.start_C,'Agent C starts: a new node is waiting, so the agents restart the workers to let it in.']);
    return E.sort((a,b)=>a[0]-b[0]);
  }
  function draw(i){
    const el=$('fl-el-svg');if(!el)return;const r=run();const W=H.width(el),h=250,L=40,R=12,T=12,B=56;
    const tmax=Math.max(...r.pts.map(p=>p[0]))*1.03,X=t=>L+(W-L-R)*t/tmax,Y=s=>T+(h-T-B)*(1-s/400);
    const tnow=tmax*i/(N-1);let b='';
    [0,100,200,300,400].forEach(s=>{b+=H.line(L,Y(s),W-R,Y(s),'var(--line)');b+=H.t(L-6,Y(s)+4,String(s),{a:'end',fs:10,fill:'var(--mute)'})});
    b+=H.t(L,T-2,'step',{fs:10,fill:'var(--mute)'});
    // segments split at restarts
    const seg=[];let cur=[];r.pts.forEach(p=>{if(cur.length&&(p[1]<cur[cur.length-1][1]||p[2]!==cur[cur.length-1][2]||p[0]-cur[cur.length-1][0]>6)){seg.push(cur);cur=[]}cur.push(p)});seg.push(cur);
    seg.forEach(s=>{const v=s.filter(p=>p[0]<=tnow);if(v.length>1)b+='<polyline fill="none" stroke="'+(v[0][2]===2?'var(--c5)':'var(--acc)')+'" stroke-width="2.5" points="'+v.map(p=>X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)).join(' ')+'"/>'});
    // world size band
    const by=h-B+10,bh=14;b+=H.t(L-6,by+11,'world',{a:'end',fs:10,fill:'var(--mute)'});
    const st=r.starts,ends=mode==='el'?[r.marks.kill_B,r.marks.start_C,tmax]:[r.marks.kill_B,tmax];
    for(let k=0;k<st.length;k++){const a=st[k][0],stop=ends[k];
      const a2=Math.min(a,tnow),e2=Math.min(stop,tnow);if(e2>a2)b+=H.rect(X(a2),by,X(e2)-X(a2),bh,st[k][1]===2?'var(--c5)':'var(--acc)',{rx:2});
      if(e2>a2&&X(e2)-X(a2)>22)b+=H.t((X(a2)+X(e2))/2,by+11,String(st[k][1]),{a:'middle',fs:10,fill:'var(--bg)',w:600});
      if(k+1<st.length){const g0=Math.min(stop,tnow),g1=Math.min(st[k+1][0],tnow);if(g1>g0){b+=H.rect(X(g0),by,X(g1)-X(g0),bh,'var(--bad)',{rx:2,op:.35});if(X(g1)-X(g0)>40)b+=H.t((X(g0)+X(g1))/2,by+11,(st[k+1][0]-stop).toFixed(1)+' s',{a:'middle',fs:10,w:600,fill:'var(--bad)'})}}}
    for(let t=0;t<=tmax;t+=20)b+=H.t(X(t),h-10,t+' s',{a:'middle',fs:10,fill:'var(--mute)'});
    const mk=r.marks;[['kill_B','B killed','var(--bad)'],['start_C','C starts','var(--good)']].forEach(([k,lab,col])=>{if(mk[k]!=null&&tnow>=mk[k]){b+=H.line(X(mk[k]),T,X(mk[k]),h-B,col,{dash:'3 3'});b+=H.t(X(mk[k])+3,T+10+(k==='start_C'?14:0),lab,{fs:10,w:600,fill:col})}});
    b+=H.line(X(tnow),T,X(tnow),h-B,'var(--acc)',{op:.3});
    el.innerHTML=H.svg(W,h,b,'Elastic run: steps and world size against time');
    const E=events(r).filter(e=>e[0]<=tnow);const last=E.length?E[E.length-1]:[0,'Starting.'];
    $('fl-el-cap').innerHTML='<b>'+tnow.toFixed(1)+' s.</b> '+last[1];
  }
  const A=H.anim({card:'fl-el-card',ctl:'fl-el-ctl',n:N,draw,ms:180,label:'Time'});
  H.seg($('fl-el-mode'),v=>{mode=v;A.go(0)});
})();
