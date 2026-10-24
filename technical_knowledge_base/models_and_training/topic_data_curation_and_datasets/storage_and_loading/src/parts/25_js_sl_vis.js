// ---- Reading figures added 2026-10-24: hero (bytes per token by stage, then the computed order), tar member and MDS layout,
// index-based against shard-based sharding, and prefetch before/after (absorbed from Storage and data movement) ----
(function(){
  const U=SLU,$=U.$,S=window.SL;if(!$('sl-hero'))return;
  const T=(x,y,s,o)=>RD.t(x,y,s,o),R=(x,y,w,h,f,o)=>'<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(0,w).toFixed(1)+'" height="'+h+'" fill="'+f+'"'+(o||'')+'/>';
  const arrow=(x1,y1,x2,y2,c)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(c||'var(--mute)')+'" stroke-width="1.4" marker-end="url(#sl-ah)"/>';
  const defs='<defs><marker id="sl-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="var(--mute)"/></marker></defs>';

  // 1. hero
  function hero(){const el=$('sl-hero'),W=RD.width(el),narrow=W<560,lw=narrow?Math.min(150,W*0.42):190,vx=W-62,bx=lw+4,bw=Math.max(40,vx-bx-6);
    const b=k=>S.bpt.find(r=>r.what.indexOf(k)===0).bpt,mx=5.5,sc=bw/mx;
    const doc=[['UTF-8 text alone',b('UTF-8'),'var(--dim)'],['JSONL',b('JSONL, unc'),'var(--c2)'],['JSONL + zstd 3',b('JSONL + zstd'),'var(--c2)'],['Parquet + zstd 3',b('Parquet'),'var(--c2)']];
    const tok=[[narrow?'uint32 ids, Qwen3':'Token file, uint32 (Qwen3)',b('Token file, uint32'),'var(--acc)'],[narrow?'uint16 ids, GPT-2':'Token file, uint16 (GPT-2)',b('Token file, uint16'),'var(--acc)']];
    let y=4,s=defs;
    const head=(t,c)=>{s+=T(0,y+12,t,{fs:12,w:600,fill:c||'var(--ink)'});y+=20};
    const row=r=>{s+=T(lw-2,y+12,r[0],{a:'end',fs:11})+R(bx,y+2,r[1]*sc,13,r[2])+T(bx+r[1]*sc+4,y+12,r[1].toFixed(2)+' B',{fs:11});y+=19};
    head(narrow?'Documents: for people, pipelines':'Documents: for people and pipelines (kept, published)');doc.forEach(row);
    y+=4;s+=arrow(lw/2,y,lw/2,y+16);s+=T(lw/2+8,y+12,'tokenize once, offline (CPU)',{fs:11,fill:'var(--mute)'});y+=22;
    head(narrow?'Tokens: for the GPU':'Tokens: for the GPU (flat arrays + document-end index)');tok.forEach(row);
    // scale tick
    s+='<line x1="'+bx+'" x2="'+(bx+4*sc).toFixed(1)+'" y1="'+(y+4)+'" y2="'+(y+4)+'" stroke="var(--mute)"/>'+'<line x1="'+bx+'" x2="'+bx+'" y1="'+y+'" y2="'+(y+8)+'" stroke="var(--mute)"/><line x1="'+(bx+4*sc).toFixed(1)+'" x2="'+(bx+4*sc).toFixed(1)+'" y1="'+y+'" y2="'+(y+8)+'" stroke="var(--mute)"/>'+T(bx+2*sc,y+18,'4 bytes per token',{fs:10.5,a:'middle',fill:'var(--mute)'});y+=26;
    // computed stage: three boxes
    s+=T(0,y+12,'Computed, not stored',{fs:12,w:600,fill:'var(--acc)'});y+=20;
    const gap=14,bwx=(W-2*gap-2)/3,bh=38,lines=[['Pack + shuffle','indices (seed)'],['Rank’s slice,','prefetched'],['GPU batch','B × L tokens']];
    lines.forEach((l,i)=>{const x=1+i*(bwx+gap);s+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+bwx.toFixed(1)+'" height="'+bh+'" rx="6" fill="var(--acc2)" stroke="var(--acc)"/>'+
      T(x+bwx/2,y+16,l[0],{a:'middle',fs:11})+T(x+bwx/2,y+31,l[1],{a:'middle',fs:11});if(i<2)s+=arrow(x+bwx+1,y+bh/2,x+bwx+gap-1,y+bh/2)});
    const yb=y+bh,x3=1+2*(bwx+gap)+bwx/2,x1=1+bwx/2;
    s+='<path d="M'+x3.toFixed(1)+' '+yb+' V'+(yb+16)+' H'+x1.toFixed(1)+' V'+(yb+3)+'" fill="none" stroke="var(--acc)" stroke-width="1.4" stroke-dasharray="4 3" marker-end="url(#sl-ah)"/>';
    s+=T((x1+x3)/2,yb+30,'checkpoint saves samples consumed',{a:'middle',fs:11,fill:'var(--acc)'});y=yb+36;
    el.innerHTML=RD.svg(W,y,s,'Bytes per token for each stored form of the corpus, and the computed order')}

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

  // 3. index-based against shard-based
  function shard(){const el=$('sl-shard');if(!el)return;const W=RD.width(el);let s='',y=4;
    s+=T(2,y+11,'Index-based: one global batch of 16 from the seeded order',{fs:11.5,w:600});y+=18;
    const perm=[13,2,9,6,0,15,11,4,8,1,14,7,3,12,5,10],cw=(W-4)/16;
    perm.forEach((v,i)=>{const r=i<8?0:1;s+=R(2+i*cw,y,cw-2,22,r?'var(--c4)':'var(--c1)',' fill-opacity="0.8"');if(cw>22)s+=T(2+i*cw+(cw-2)/2,y+15,String(v),{a:'middle',fs:10.5,fill:'var(--bg)'})});
    y+=26;s+=T(2+4*cw,y+11,'rank 0',{a:'middle',fs:11,fill:'var(--c1)'})+T(2+12*cw,y+11,'rank 1',{a:'middle',fs:11,fill:'var(--c4)'});y+=22;
    s+=T(2,y+11,W<520?'Shard-based: 11 shards dealt to 2 × 4 workers':'Shard-based: 11 shards dealt round robin to 2 ranks × 4 workers',{fs:11.5,w:600});y+=18;
    const sw=(W-4)/11;for(let i=0;i<11;i++){s+=R(2+i*sw,y,sw-3,20,'var(--soft)',' stroke="var(--line)"')+T(2+i*sw+(sw-3)/2,y+14,'s'+i,{a:'middle',fs:10.5})}
    y+=30;const ww=(W-4)/4,wh=40;
    for(let r=0;r<2;r++)for(let w=0;w<4;w++){const mine=[];for(let i=r;i<11;i+=2)mine.push(i);const ws=mine.filter((_,j)=>j%4===w),x=2+w*ww,yy=y+r*(wh+6),c=r?'var(--c4)':'var(--c1)';
      s+='<rect x="'+x.toFixed(1)+'" y="'+yy+'" width="'+(ww-4).toFixed(1)+'" height="'+wh+'" rx="5" fill="none" stroke="'+c+'"/>'+T(x+5,yy+14,'r'+r+' w'+w,{fs:10.5,fill:c});
      const bw2=(ww-14)/2;ws.forEach((sh,k)=>{s+=R(x+5+k*(bw2+2),yy+20,bw2,15,k?'var(--bad)':'var(--good)',' fill-opacity="0.85"')+(bw2>20?T(x+5+k*(bw2+2)+bw2/2,yy+31,'s'+sh,{a:'middle',fs:10.5,fill:'var(--bg)'}):'')})}
    y+=2*(wh+6)+4;s+=T(2,y+11,'green: first shard; red: a second shard, read while 5 workers idle',{fs:11,fill:'var(--mute)'});y+=16;
    el.innerHTML=RD.svg(W,y,s,'Index-based and shard-based ways to split data across ranks and workers')}

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
  const all=()=>{hero();shd();shard();pf()};
  RD.onRender(all);RD.onResize(all);all();
})();
