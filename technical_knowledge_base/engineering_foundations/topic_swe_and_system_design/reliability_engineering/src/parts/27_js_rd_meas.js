// ---- Reading, "A retry storm, measured": the real runs (window.MEAS from 23_js_meas_data.js) ----
(function(){
  const svg=document.getElementById('rd-ms-svg');if(!svg||!window.MEAS)return;
  const M=MEAS,CF=['none','naive','backoff','budget','deadline','shed'];
  const LB={none:'Timeouts, no retries',naive:'Retry at once',backoff:'Backoff + full jitter',budget:'Backoff + retry budget',deadline:'Retry at once + server skips expired work',shed:'Retry at once + bounded queue (8)'};
  let cf='naive',seed='1';
  const seg=document.getElementById('rd-ms-seg'),sseg=document.getElementById('rd-ms-seed');
  seg.innerHTML=CF.map(c=>'<button data-m="'+c+'"'+(c===cf?' class="on"':'')+'>'+LB[c]+'</button>').join('');
  sseg.innerHTML=['1','2','3'].map(s=>'<button data-m="'+s+'"'+(s===seed?' class="on"':'')+'>Seed '+s+'</button>').join('');
  const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
  const pct=v=>(v*100).toFixed(1)+'%';
  function draw(){
    const r=M.runs[cf][seed],S=r.series,NS=41;
    const W=Math.max(300,Math.min(860,RD.width(svg)));const x0=34,x1=W-6,bw=(x1-x0)/NS,X=k=>x0+k*bw;
    let b='';const mx=Math.max(120,...S.att.slice(0,NS));const p1=10,h1=130,Y=v=>p1+h1*(1-v/mx);
    b+='<rect x="'+X(10)+'" y="'+p1+'" width="'+(5*bw)+'" height="'+(h1+110)+'" fill="var(--bad)" opacity=".09"/>'+RD.t(X(10)+3,p1+10,'slowdown',{fs:10,fill:'var(--bad)'});
    b+='<line x1="'+x0+'" x2="'+x1+'" y1="'+Y(0)+'" y2="'+Y(0)+'" stroke="var(--line)"/>'+RD.t(x0-4,Y(mx)+8,String(mx),{fs:9.5,a:'end'})+RD.t(x0-4,Y(0),'0',{fs:9.5,a:'end'});
    b+='<line x1="'+x0+'" x2="'+x1+'" y1="'+Y(160)+'" y2="'+Y(160)+'" stroke="var(--ink)" stroke-dasharray="4 3"/>'+RD.t(x1,Y(160)-3,'normal capacity 160/s',{fs:9.5,a:'end',fill:'var(--mute)'});
    let pa='',pr='';
    for(let k=0;k<NS;k++){const x=X(k)+1,w=Math.max(2,bw-2);
      if(S.ok[k])b+='<rect x="'+x+'" y="'+Y(S.ok[k])+'" width="'+w+'" height="'+(Y(0)-Y(S.ok[k]))+'" fill="var(--good)"/>';
      if(S.fail[k])b+='<rect x="'+x+'" y="'+Y(S.ok[k]+S.fail[k])+'" width="'+w+'" height="'+(Y(S.ok[k])-Y(S.ok[k]+S.fail[k]))+'" fill="var(--bad)" opacity=".75"/>';
      pa+=(k?'L':'M')+(x+w/2).toFixed(1)+' '+Y(S.att[k]).toFixed(1);pr+=(k?'L':'M')+(x+w/2).toFixed(1)+' '+Y(S.arr[k]).toFixed(1)}
    b+='<path d="'+pa+'" fill="none" stroke="var(--c4)" stroke-width="2"/><path d="'+pr+'" fill="none" stroke="var(--ink)" stroke-width="1" stroke-dasharray="2 2"/>';
    // queue panel
    const qm=Math.max(10,...S.q.slice(0,NS)),p2=p1+h1+30,h2=70,Yq=v=>p2+h2*(1-v/qm);
    b+=RD.t(0,p2-6,'Server queue (most waiting in the second), max '+qm,{fs:10.5,fill:'var(--mute)'});
    b+='<line x1="'+x0+'" x2="'+x1+'" y1="'+Yq(0)+'" y2="'+Yq(0)+'" stroke="var(--line)"/>';
    for(let k=0;k<NS;k++){const x=X(k)+1,w=Math.max(2,bw-2);if(S.q[k])b+='<rect x="'+x+'" y="'+Yq(S.q[k])+'" width="'+w+'" height="'+(Yq(0)-Yq(S.q[k]))+'" fill="var(--c6)"/>';
      if(k%5===0)b+=RD.t(x+w/2,p2+h2+13,String(k),{fs:9.5,a:'middle',fill:'var(--mute)'})}
    b+=RD.t((x0+x1)/2,p2+h2+25,'second',{fs:10,a:'middle',fill:'var(--mute)'});
    svg.innerHTML=RD.svg(W,p2+h2+30,b,'Measured successes, failures and attempts per second, and server queue length, for '+LB[cf]);
    document.getElementById('rd-ms-leg').innerHTML='<span style="--sw:var(--good)">requests answered</span><span style="--sw:var(--bad)">requests failed (all attempts)</span><span style="--sw:var(--c4)">HTTP attempts sent</span><span style="--sw:var(--ink)">new requests (dotted)</span><span style="--sw:var(--c6)">server queue</span>';
    document.getElementById('rd-ms-cnt').innerHTML=RD.stat('Success',pct(r.success),'of '+r.requests+' requests')+RD.stat('Attempts per request',r.attempts_per_req.toFixed(2),'')+RD.stat('Useful server work',pct(r.useful_share),'client still waiting')+RD.stat('Recovery',r.recovery_s===null?'never':r.recovery_s+' s','after the slowdown ends');
    document.getElementById('rd-ms-note').textContent='Seed '+seed+' of 3. '+M.meta.configs[cf]+'.';
  }
  function table(){const t=document.getElementById('rd-ms-tab');
    const rng=a=>{const lo=Math.min(...a),hi=Math.max(...a);return lo===hi?'':' <span class="mute small">('+(lo*100).toFixed(1)+' to '+(hi*100).toFixed(1)+')</span>'};
    const rec=a=>a.every(x=>x===null)?'never':a.some(x=>x===null)?a.map(x=>x===null?'never':x).join(', ')+' s':Math.min(...a)+' to '+Math.max(...a)+' s';
    t.innerHTML='<thead><tr><th>Configuration</th><th class="num">Success (measured)</th><th class="num">Attempts / request</th><th class="num">Useful work</th><th class="num">Recovery (measured)</th><th class="num">Model: success, recovery</th></tr></thead><tbody>'+
    CF.map(c=>{const rs=['1','2','3'].map(s=>M.runs[c][s]),ms=['1','2','3'].map(s=>M.model[c][s]);
      return '<tr><td>'+LB[c]+'</td><td class="num">'+pct(mean(rs.map(r=>r.success)))+rng(rs.map(r=>r.success))+'</td><td class="num">'+mean(rs.map(r=>r.attempts_per_req)).toFixed(2)+'</td><td class="num">'+pct(mean(rs.map(r=>r.useful_share)))+'</td><td class="num">'+rec(rs.map(r=>r.recovery_s))+'</td><td class="num">'+pct(mean(ms.map(m=>m.success)))+', '+rec(ms.map(m=>m.recovery))+'</td></tr>'}).join('')+'</tbody>'}
  RD.seg(seg,m=>{cf=m;draw()});RD.seg(sseg,m=>{seed=m;draw()});
  table();draw();RD.onRender(draw);RD.onResize(draw);
})();
