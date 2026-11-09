// ---- Reading figures added 2026-10-24: tar member and MDS layout, and prefetch before/after (absorbed from Storage and data movement).
// The 2D hero and the sharding diagram were replaced on 2026-11-09 by the 3D stages Fig. 1 (27_js_sc_hero.js) and Fig. 7 (34_js_sc_shard.js). ----
(function(){
  const U=SLU,$=U.$,S=window.SL;if(!$('sl-shd'))return;
  const T=(x,y,s,o)=>RD.t(x,y,s,o),R=(x,y,w,h,f,o)=>'<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(0,w).toFixed(1)+'" height="'+h+'" fill="'+f+'"'+(o||'')+'/>';

  // 2. tar member and MDS shard
  function shd(){const el=$('sl-shd');if(!el)return;const W=RD.width(el),tar=S.fmt2k.tar,mean=tar.payload_bytes/tar.members,pad=Math.ceil(mean/512)*512-mean;
    const segs=[['PAX',1024,'var(--bad)'],['hdr',512,'var(--c5)'],['payload',mean,'var(--c3)'],['',pad,'var(--dim)']],tot=segs.reduce((a,x)=>a+x[1],0),sc=(W-4)/tot;
    let s='',x=2,y=4;s+=T(2,y+11,'One tar member: '+U.f0(Math.round(tot))+' bytes for '+U.f0(Math.round(mean))+' of text',{fs:11.5,w:600});y+=16;
    segs.forEach(g=>{const w=g[1]*sc;s+=R(x,y+14,w,20,g[2],' stroke="var(--bg)"');if(g[0])s+=T(x+w/2,y+11,g[0]==='payload'?'payload '+U.f0(Math.round(mean)):g[0]==='PAX'?'PAX 1,024':'hdr 512',{a:'middle',fs:11});x+=w});
    y+=44;const f=tar.file_bytes,p=tar.payload_bytes,sc2=(W-4)/f;
    s+=T(2,y+11,'Whole tar: '+(f/1e6).toFixed(2)+' MB, payload '+(p/1e6).toFixed(2)+' MB',{fs:11.5,w:600});y+=16;
    s+=R(2,y,p*sc2,20,'var(--c3)')+R(2+p*sc2,y,(f-p)*sc2,20,'var(--bad)',' fill-opacity="0.75"')+T(6,y+14,U.pc(p/f,0)+' payload',{fs:11,fill:'var(--bg)'})+T(W-6,y+14,U.pc(1-p/f,0)+' headers, padding',{fs:11,a:'end',fill:'var(--bg)'});
    y+=32;s+=T(2,y+11,W<520?'MDS shard (\u2264 64 MiB): offsets, samples':'MDS shard (at most 64 MiB): offsets, then samples back to back',{fs:11.5,w:600});y+=16;
    const L=S.lens2k.slice(0,14),sumL=L.reduce((a,b)=>a+b,0),ow=Math.max(26,W*0.06),sc3=(W-6-ow)/sumL;
    s+=R(2,y,ow,20,'var(--c5)')+T(2+ow/2,y+14,'offs',{a:'middle',fs:10.5,fill:'var(--bg)'});x=2+ow;
    L.forEach((n,i)=>{const w=n*sc3;s+=R(x,y,w,20,i%2?'var(--c1)':'var(--c6)',' stroke="var(--bg)"');x+=w});
    y+=28;const iw=Math.min(W-4,300);s+='<rect x="2" y="'+y+'" width="'+iw+'" height="22" rx="4" fill="var(--soft)" stroke="var(--line)"/>'+T(10,y+15,'index.json: every shard’s samples, bytes, codec',{fs:11});y+=26;
    el.innerHTML=RD.svg(W,y,s,'WebDataset tar member and MDS shard layouts')}

  // 4. prefetch before/after
  let pst='s3';
  function pf(){const el=$('sl-pf');if(!el)return;const W=RD.width(el),P=S.prefetch,n=16,step=100;let rows,fetch;
    if(pst==='model'){fetch=+$('sl-pf-f').value;$('sl-pf-fv').textContent=fetch;
      const none=Array(n).fill(fetch),pre=[fetch].concat(Array(n-1).fill(Math.max(0,fetch-step)));rows=[['No prefetch',none],['Prefetch',pre]]}
    else{const a=P[pst+'|none'],b=P[pst+'|prefetch2'];rows=[['No prefetch',a.wait_ms,a.total_s],['Prefetch 2 shards',b.wait_ms,b.total_s]]}
    const tot=rows.map(r=>r[1].reduce((x,y)=>x+y,0)+n*step),mxT=Math.max(...tot),lab=W<520?78:120,sc=(W-lab-8)/mxT;let s='',y=4;
    rows.forEach((r,k)=>{let x=lab;s+=T(lab-6,y+16,r[0],{a:'end',fs:11});
      r[1].forEach(w=>{s+=R(x,y+4,w*sc,18,'var(--bad)')+R(x+w*sc,y+4,step*sc,18,'var(--acc)',' stroke="var(--bg)" stroke-width="0.6"');x+=(w+step)*sc});
      s+=T(Math.min(W-4,x+4),y+40,(r[2]||tot[k]/1000).toFixed(2)+' s'+(r[2]?' measured':''),{fs:11,a:x+100>W?'end':null});y+=46});
    s+='<line x1="'+lab+'" x2="'+(lab+1000*sc).toFixed(1)+'" y1="'+(y+2)+'" y2="'+(y+2)+'" stroke="var(--mute)"/>'+T(lab,y+15,'0',{fs:10.5,fill:'var(--mute)'})+T(lab+1000*sc,y+15,'1 s',{fs:10.5,a:'middle',fill:'var(--mute)'});y+=20;
    el.innerHTML=RD.svg(W,y,s,'Per-step wait for the shard (red) and compute (blue), without and with prefetch');
    const a=rows[0][1].reduce((x,y)=>x+y,0)/n;
    let t;if(pst==='model')t='Model: a fetch of '+fetch+' ms per shard. Without prefetch every step costs '+(fetch+step)+' ms; with it, '+Math.max(fetch,step)+' ms after the first. '+(fetch<step?'The fetch hides under the compute.':'Fetching is now slower than computing: prefetch saves only the overlap, and the GPU waits '+(fetch-step)+' ms a step. Only more parallel fetches or a local cache help.')+' At 9 ms the totals are '+(16*(9+step)/1000).toFixed(2)+' s and '+((9+16*step)/1000).toFixed(2)+' s, against the measured S3 runs’ '+P['s3|none'].total_s.toFixed(2)+' s and '+P['s3|prefetch2'].total_s.toFixed(2)+' s.';
    else t='Red is each step’s wait for its shard (mean '+a.toFixed(1)+' ms without prefetch), blue the 100 ms of compute. Without prefetch every step pays the fetch; with two shards in flight only the first does. Totals: '+P[pst+'|none'].total_s.toFixed(2)+' s against '+P[pst+'|prefetch2'].total_s.toFixed(2)+' s. A real object store’s tens of milliseconds per request make the first case worse and the second no different, until a fetch takes longer than a step: try the model.';
    $('sl-pf-txt').innerHTML=t}
  RD.seg($('sl-pf-st'),m=>{pst=m;$('sl-pf-mctl').hidden=m!=='model';pf()});$('sl-pf-f').addEventListener('input',pf);
  const all=()=>{shd();pf()};
  RD.onRender(all);RD.onResize(all);all();
})();
