// ---- Tab "Balancer lab": four recorded 7-second runs animated together on one time axis ----
(function(){
  const S=window.SA,esc=RD.esc;if(!document.getElementById('t-lb'))return;
  const TL=S.lb.timelines,B=['backend-1','backend-2','backend-3'],COL={'backend-1':'var(--c1)','backend-2':'var(--c4)','backend-3':'var(--c3)'};
  const TMAX=7,STEP=0.1,N=Math.round(TMAX/STEP)+1,pct=x=>(100*x/TMAX).toFixed(2)+'%';
  document.getElementById('lb-ver').textContent=S.meta.grpcio;
  const pan=document.getElementById('lb-panels');
  pan.innerHTML=TL.map((t,k)=>'<div class="pn" id="lb-p'+k+'"><h3>'+esc(t.setup)+'</h3><div class="nt">'+esc(t.note)+'</div>'+
    B.map(b=>'<div class="trk"><span>'+b+'</span><div class="bar" data-b="'+b+'"></div><span class="n" data-n="'+b+'">0</span></div>').join('')+
    '<div class="ax"><div></div><div><span>0 s</span><span>1.5 s: backend-3 joins</span><span>7 s</span></div><div></div></div></div>').join('');
  function draw(i){const t=i*STEP;
    TL.forEach((tl,k)=>{const p=document.getElementById('lb-p'+k),join=tl.backend3_joined_s;
      B.forEach(b=>{const calls=tl.calls.filter(c=>c[1]===b&&c[0]<=t+1e-9);
        p.querySelector('.bar[data-b="'+b+'"]').innerHTML=(b==='backend-3'?'<span class="off" style="width:'+pct(join)+'"></span>':'')+
          calls.map(c=>'<i style="left:'+pct(c[0])+';background:'+COL[b]+'"></i>').join('')+'<span class="now" style="left:'+pct(Math.min(t,TMAX))+'"></span>';
        p.querySelector('[data-n="'+b+'"]').textContent=calls.length})});
    let cap;
    if(t<1.5)cap=['Two replicas','Every setup has spread or pinned its calls already: L4 and L4 + age sit on one replica at a time, L7 and round_robin alternate.'];
    else if(t<2.2)cap=['backend-3 joins','nginx reloads with three backends. L7 starts sending calls to backend-3 almost at once; L4 does not, because the client\'s connection was opened before the change.'];
    else if(t<4.5)cap=['Waiting for a reconnect','With MAX_CONNECTION_AGE the servers keep closing connections with GOAWAY; each reconnect is a new choice by the L4 balancer. Plain L4 and the fixed client list never change.'];
    else cap=['After 7 seconds','Read the counters: the plain L4 run never left backend-1; L4 + age reached backend-3 only after reconnects; L7 spread evenly once the replica existed; the fixed list never knew it existed.'];
    document.getElementById('lb-cap').innerHTML='<div class="t">t = '+t.toFixed(1)+' s: '+cap[0]+'</div><p>'+cap[1]+'</p>'}
  RD.anim({card:'lb-panels',ctl:'lb-ctl',n:N,ms:140,draw,label:'Time',tab:'t-lb'});
  document.querySelector('#lb-counts tbody').innerHTML=S.lb.counts.map(c=>'<tr><td>'+esc(c.setup)+'</td>'+B.map(b=>'<td class="num">'+(c.answers[b]||0)+'</td>').join('')+'</tr>').join('');
})();
