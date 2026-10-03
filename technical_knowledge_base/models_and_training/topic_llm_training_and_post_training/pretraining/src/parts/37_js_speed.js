// ---- Speedrun records tab: log-time chart with replay, category filter, shares, full table ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('sp-card')||!window.SPEED)return;
  const esc=RD.esc;
  const CAT={arch:['Architecture','var(--c1)'],opt:['Optimiser','var(--c2)'],sys:['Systems, kernels, precision','var(--c3)'],attn:['Attention and context','var(--c4)'],
    sched:['Schedule and batch','var(--c5)'],eval:['Evaluation','var(--c6)'],mixed:['Bundle (record 92)','var(--ink)'],base:['Baseline (llm.c)','var(--mute)'],retime:['Re-timing','var(--mute)']};
  const rows=SPEED.rows.map(r=>({n:r[0],m:r[1],d:r[2],t:Date.parse(r[2]+'T00:00:00Z'),desc:r[3],url:r[4],c:r[5],g:r[6]}));
  const recs=rows.filter(r=>r.c!=='retime');
  const first=recs[0],last=recs[recs.length-1];
  $('sp-stats').innerHTML=RD.stat('First record',first.m+' min','llm.c baseline, '+first.d)+RD.stat('Latest record',last.m+' min','record '+last.n+', '+last.d+' (about '+Math.round(last.m*60)+' s)')+
    RD.stat('Speed-up',(first.m/last.m).toFixed(1)+'×','derived: '+first.m+' / '+last.m)+RD.stat('Training tokens','10B to under 330M','README');
  const on={};Object.keys(CAT).forEach(k=>on[k]=true);let sel=null;
  $('sp-chips').innerHTML=['arch','opt','sys','attn','sched','eval','mixed'].map(k=>'<button data-c="'+k+'"><i style="background:'+CAT[k][1]+'"></i>'+CAT[k][0]+'</button>').join('');
  $('sp-chips').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const k=b.dataset.c;
    const solo=Object.keys(on).filter(x=>on[x]&&x!=='base'&&x!=='retime');
    if(solo.length===1&&solo[0]===k){Object.keys(on).forEach(x=>on[x]=true)}else{Object.keys(on).forEach(x=>on[x]=(x===k||x==='base'||x==='retime'))}
    [...$('sp-chips').children].forEach(x=>x.classList.toggle('off',!on[x.dataset.c]));A.redraw()});
  const t0=Date.parse('2024-05-01T00:00:00Z'),t1=Date.parse('2026-10-01T00:00:00Z');
  let upto=rows.length-1;
  function draw(i){
    upto=stepIdx[i];
    const w=RD.width($('sp-plot')),h=Math.round(Math.min(340,Math.max(240,w*0.5))),pl=38,pr=10,pt=10,pb=26,W=w-pl-pr,H=h-pt-pb;
    const lmin=Math.log(0.5),lmax=Math.log(60);
    const X=t=>pl+(t-t0)/(t1-t0)*W,Y=m=>pt+(lmax-Math.log(m))/(lmax-lmin)*H;
    let s='<svg width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Record time against date, log scale">';
    [0.5,1,2,5,10,20,45].forEach(m=>{s+='<line x1="'+pl+'" x2="'+(pl+W)+'" y1="'+Y(m).toFixed(1)+'" y2="'+Y(m).toFixed(1)+'" stroke="var(--line)"/><text x="'+(pl-4)+'" y="'+(Y(m)+4).toFixed(1)+'" text-anchor="end" fill="var(--mute)">'+m+'</text>'});
    s+='<text x="'+(pl+4)+'" y="'+(pt+H-4)+'" fill="var(--mute)">minutes (log)</text>';
    ['2024-07','2025-01','2025-07','2026-01','2026-07'].forEach(d=>{const x=X(Date.parse(d+'-01T00:00:00Z'));s+='<line x1="'+x.toFixed(1)+'" x2="'+x.toFixed(1)+'" y1="'+pt+'" y2="'+(pt+H)+'" stroke="var(--line)"/><text x="'+x.toFixed(1)+'" y="'+(h-8)+'" text-anchor="middle" fill="var(--mute)">'+d+'</text>'});
    // step line through the records shown so far
    let p='';rows.slice(0,upto+1).forEach((r,k)=>{const x=X(r.t),y=Y(r.m);p+=(k?'H'+x.toFixed(1)+'V'+y.toFixed(1):'M'+x.toFixed(1)+' '+y.toFixed(1))});
    s+='<path d="'+p+'" fill="none" stroke="var(--mute)" stroke-width="1.2"/>';
    rows.slice(0,upto+1).forEach((r,k)=>{const x=X(r.t),y=Y(r.m),c=CAT[r.c][1],vis=on[r.c];
      s+='<circle data-k="'+k+'" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(sel===k?6:4.2)+'" fill="'+(r.c==='retime'?'var(--bg)':c)+'" stroke="'+(r.c==='retime'?'var(--mute)':(sel===k?'var(--ink)':'var(--bg)'))+'" stroke-width="'+(sel===k?2:1)+'" opacity="'+(vis?1:0.15)+'" style="cursor:pointer"/>'});
    s+='</svg>';$('sp-plot').innerHTML=s;
    const r=rows[upto];
    $('sp-cap').innerHTML='<div class="t">'+r.d.slice(0,7)+': '+r.m+' minutes'+(r.c==='retime'?' (re-timing)':' (record '+r.n+')')+'</div><p>'+esc(r.desc)+'</p>';
  }
  // replay steps: one per month with at least one row, ending at the last row
  const stepIdx=[];let lastMonth='';rows.forEach((r,k)=>{const mo=r.d.slice(0,7);if(mo!==lastMonth){if(k>0)stepIdx.push(k-1);lastMonth=mo}});stepIdx.push(rows.length-1);
  function detail(k){sel=k;const r=rows[k],prev=k>0?rows[k-1]:null;
    $('sp-det').innerHTML='<b>'+(r.c==='retime'?'Re-timing of record 21':'Record '+r.n)+'</b>, '+r.d+': <b>'+r.m+' min</b>'+(prev&&r.c!=='retime'&&r.c!=='base'?', '+((1-r.m/prev.m)*100).toFixed(1)+'% faster than the previous timing':'')+
      '<br>'+esc(r.desc)+'<br><span class="mute">Kind (this page\'s tagging): '+CAT[r.c][0]+'</span>'+(r.url?' · <a href="'+esc(r.url)+'" target="_blank" rel="noopener noreferrer">source</a>':'');A.redraw()}
  $('sp-plot').addEventListener('click',e=>{const c=e.target.closest('circle');if(c)detail(+c.dataset.k)});
  const A=RD.anim({card:'sp-card',ctl:'sp-ctl',n:stepIdx.length,start:stepIdx.length-1,draw:draw,ms:900,label:'Replay month'});
  // shares
  const tot=recs.reduce((a,r)=>a+r.g,0);
  const sh=['arch','opt','sys','attn','mixed','sched','eval'].map(k=>[k,recs.filter(r=>r.c===k).reduce((a,r)=>a+r.g,0)/tot*100,recs.filter(r=>r.c===k).length]);
  const mx=Math.max(...sh.map(x=>x[1]));
  $('sp-share').innerHTML=sh.map(x=>'<div class="row"><div class="nm">'+CAT[x[0]][0]+' <span class="mute">('+x[2]+')</span></div><div class="track"><div class="fill" style="width:'+(x[1]/mx*100).toFixed(1)+'%;background:'+CAT[x[0]][1]+'"></div></div><div class="val">'+x[1].toFixed(1)+'%</div></div>').join('');
  // table
  $('sp-tbl').innerHTML='<thead><tr><th>#</th><th>Date</th><th class="num">Minutes</th><th>Change</th><th>Kind</th></tr></thead><tbody>'+
    rows.map(r=>'<tr><td>'+r.n+'</td><td class="d">'+r.d+'</td><td class="num">'+r.m+'</td><td>'+(r.url?'<a href="'+esc(r.url)+'" target="_blank" rel="noopener noreferrer">'+esc(r.desc)+'</a>':esc(r.desc))+'</td><td class="mute">'+CAT[r.c][0]+'</td></tr>').join('')+'</tbody>';
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-speed']=window.TAB_RENDER['t-speed']||[]).push(()=>A.redraw());
  addEventListener('resize',()=>{if($('sp-plot').offsetParent)A.redraw()});
})();
