// ---- Tab: Drafters measured (t-sddr) ----
(function(){
  const D=SD.D,R=D.drafters,tab=document.getElementById('t-sddr');if(!tab||!R)return;
  const $=id=>document.getElementById(id);
  $('sddr-setup').innerHTML=R.setup;
  let view='speed',cp=R.prompts[0];
  const plab=R.plabel;
  function cell(k,p){const r=R.res[k]&&R.res[k][p];if(!r)return '<td class="num mute">n/a</td>';const b=R.res[R.base][p];
    if(view==='speed'&&r.tok_s==null)return '<td class="num mute">'+(r.stalled?'stalled':'not timed')+'</td>';
    const sp=r.tok_s/b.tok_s,col=sp>=1?'color-mix(in srgb,var(--good) '+Math.min(60,Math.round((sp-1)*60))+'%,transparent)':'color-mix(in srgb,var(--bad) '+Math.min(60,Math.round((1-sp)*90))+'%,transparent)';
    if(view==='speed')return '<td class="num" style="background:'+(k===R.base?'transparent':col)+'">'+(k===R.base?SD.fmt(b.tok_s,1)+' tok/s':SD.fmt(sp,2)+'x')+'</td>';
    if(view==='len')return '<td class="num">'+(r.L==null?'n/a':SD.fmt(r.L,2))+'</td>';
    return '<td class="num">'+(r.drafted==null?'n/a':SD.fmt(100*r.accepted/Math.max(1,r.drafted),0)+'% <span class="mute">of '+r.drafted+'</span>')+'</td>'}
  function table(){$('sddr-tbl').innerHTML='<thead><tr><th>Drafter</th>'+R.prompts.map(p=>'<th class="num">'+plab[p]+'</th>').join('')+'</tr></thead><tbody>'+
    R.cfgs.map(c=>'<tr><td>'+c.label+'</td>'+R.prompts.map(p=>cell(c.key,p)).join('')+'</tr>').join('')+'</tbody>';
    $('sddr-note').innerHTML='<span class="meas">measured here</span> '+(view==='speed'?'Generation speed relative to the same server with no drafter (first row: its tokens per second); one run per prompt and drafter. Cells marked stalled had a request slower than 5 tokens per second while the shared machine was swapping, and rows marked not timed ran only during such a period; for both only the acceptance counts, which do not depend on speed, are shown. ':view==='len'?'Mean tokens per target pass (1 means no guess was ever kept). ':'Share of drafted tokens accepted, and how many were drafted (llama-server counts). ')+R.note}
  function bars(){const el=$('sddr-svg'),W=Math.max(280,Math.min(860,SD.width(el))),lab=Math.min(190,W*0.42),bw=W-lab-60,rh=20;
    const rows=R.cfgs.filter(c=>R.res[c.key]&&R.res[c.key][cp]&&R.res[c.key][cp].tok_s!=null).map(c=>{const r=R.res[c.key][cp];return [c.label.replace(/<[^>]+>/g,''),r.tok_s,r.lo,r.hi]});
    const mx=Math.max(...rows.map(r=>r[3]||r[1]))||1,base=R.res[R.base][cp].tok_s;let s='';
    rows.forEach((r,i)=>{const y=i*rh+4;s+='<text x="'+(lab-6)+'" y="'+(y+12)+'" text-anchor="end" font-size="11">'+SD.esc(r[0].slice(0,Math.floor(lab/6)))+'</text><rect x="'+lab+'" y="'+(y+2)+'" width="'+(bw*r[1]/mx).toFixed(1)+'" height="12" fill="'+(i===0?'var(--mute)':r[1]>=base?'var(--good)':'var(--bad)')+'" opacity=".85"/>'+
      '<text x="'+(lab+bw*r[1]/mx+4)+'" y="'+(y+12)+'" font-size="10.5" fill="var(--mute)">'+SD.fmt(r[1],1)+'</text>'});
    const xb=lab+bw*base/mx;s+='<line x1="'+xb+'" x2="'+xb+'" y1="0" y2="'+(rows.length*rh+6)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>';
    el.innerHTML='<svg viewBox="0 0 '+W+' '+(rows.length*rh+10)+'" width="'+W+'" height="'+(rows.length*rh+10)+'" role="img" aria-label="tokens per second by drafter">'+s+'</svg><div class="small mute">Tokens per second for "'+SD.esc(plab[cp])+'"; dashed line: no drafter.</div>'}
  SD.segs($('sddr-view'),[['speed','Speed-up'],['len','Acceptance length'],['acc','Drafted tokens accepted']],'speed',m=>{view=m;table()});
  SD.segs($('sddr-p'),R.prompts.map(p=>[p,plab[p]]),cp,m=>{cp=m;bars()});
  $('sddr-cfg').innerHTML='<thead><tr><th>Drafter</th><th>Kind</th><th>Draft file</th><th>Flags added</th></tr></thead><tbody>'+R.cfgs.map(c=>'<tr><td>'+c.label+'</td><td>'+c.kind+'</td><td>'+c.file+'</td><td><code>'+SD.esc(c.flags)+'</code></td></tr>').join('')+'</tbody>';
  $('sddr-find').innerHTML=R.findings;
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-sddr']=window.TAB_RENDER['t-sddr']||[]).push(()=>{table();bars()});
  addEventListener('resize',()=>{if(!tab.hidden)bars()});table();bars();
})();
