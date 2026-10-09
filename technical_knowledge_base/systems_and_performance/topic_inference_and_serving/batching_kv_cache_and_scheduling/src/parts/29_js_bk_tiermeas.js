// ---- Reading section 4: llama-server KV tiers, measured (BKD.meas.tiers) ----
(function(){
  const el=document.getElementById('bk-tm-bars');if(!el||!BKD.meas)return;
  const T=BKD.meas.tiers,on=T.runs['8192'],off=T.runs['0'];
  const med=a=>{const s=a.slice().sort((x,y)=>x-y);return s[Math.floor(s.length/2)]};
  const rng=a=>[Math.min(...a),Math.max(...a)];
  const all=on.concat(off);
  const rows=[
    ['Recompute (nothing cached)',on.map(r=>r.res.recompute.wall_s),'var(--c2)'],
    ['From the host prompt cache',on.map(r=>r.res.host_cache.wall_s),'var(--good)'],
    ['Same, prompt cache off',off.map(r=>r.res.host_cache.wall_s),'var(--c2)'],
    ['From a file: restore, then first token',all.map(r=>r.res.file_restore.wall_s+r.res.after_file_restore.wall_s),'var(--c6)'],
    ['Still in the slot (GPU memory)',all.map(r=>r.res.resident.wall_s),'var(--c1)']];
  const mx=Math.max(...rows.map(r=>Math.max(...r[1])));
  const f=v=>v>=1?v.toFixed(2)+' s':Math.round(v*1000)+' ms';
  el.innerHTML=rows.map(r=>{const m=med(r[1]),q=rng(r[1]);return '<div class="row"><div class="nm">'+r[0]+'</div><div class="track"><div class="fill" style="width:'+Math.max(0.6,100*m/mx).toFixed(2)+'%;background:'+r[2]+'"></div></div><div class="val">'+f(m)+'<span class="ml">'+f(q[0])+' to '+f(q[1])+'</span></div></div>'}).join('');
  const kb=T.slot_file_bytes.length?Math.round(Math.max(...T.slot_file_bytes)/1e6):0;
  document.getElementById('bk-tm-note').innerHTML='<span class="meas">measured here</span>: time from sending the request to its first token (median, then range over '+on.length+' runs, or '+all.length+' where both servers ran it), '+T.model+', '+T.engine+'. The slot\'s cache in a file: '+kb+' MB. Script: <code>src/exp/tiers_client.py</code>.';
})();
