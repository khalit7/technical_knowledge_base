// ---- Reading tab figures added in the 2026-10-24 rebuild: hero, blk-mq and NVMe queues, FTL stepper, VFS objects,
// fsync error before/after, jbd2 commit stepper, data paths, NFS close-to-open. Static figures are drawn at the measured
// width; the steppers use RD.anim and never move before the reader acts. ----
(function(){
const D=window.ST_DATA,$=id=>document.getElementById(id),esc=RD.esc,T=RD.t;
const med=(sh,m)=>D.sync.find(r=>r.fs==='ext4'&&r.shape===sh&&r.mode===m).med;
const f0=x=>Math.round(x).toLocaleString('en-US'),f1=x=>(Math.round(x*10)/10).toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1});
const us=x=>(x<10?f1(x):f0(x))+' us';
const marker=id=>'<defs><marker id="'+id+'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--mute)"/></marker></defs>';
const box=(x,y,w,h,cls,dash)=>'<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h+'" rx="6" class="'+(cls||'vbox')+'"'+(dash?' stroke-dasharray="4 3" fill="none"':'')+'/>';
const line=(x1,y1,x2,y2,id,o)=>{o=o||{};return '<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="'+(o.c||'var(--mute)')+'" stroke-width="'+(o.w||1.5)+'"'+(o.d?' stroke-dasharray="'+o.d+'"':'')+(id?' marker-end="url(#'+id+')"':'')+'/>'};
const draws=[];const reg=f=>{draws.push(f);f()};
RD.onRender(()=>draws.forEach(f=>f()));RD.onResize(()=>draws.forEach(f=>f()));

// ---- hero: how far each call pushes one 4 KiB overwrite ----
function hero(){const el=$('rd-hero');if(!el)return;const W=Math.min(860,RD.width(el)),nar=W<520;
  const L=[['Your program','your 4 KiB buffer'],['Page cache','kernel memory, dirty (3, 4)'],['Block layer, driver','bios in flight (1)'],['Device cache','acked, lost on power cut (1)'],['Stable media','flash or platter (5)']];
  const C=[['write()','write',1,1,med('overwrite','none')],['sync_file_range','sfr',3,1,med('overwrite','sfr')],['fdatasync','fdatasync',4,1,med('overwrite','fdatasync')],['fsync','fsync',4,4,med('overwrite','fsync')]];
  const HH=nar?36:26,RH=nar?44:40,FH=nar?36:24,LW=Math.min(330,Math.round(W*(nar?0.44:0.40))),H=HH+RH*L.length+FH,cw=(W-LW-6)/C.length;
  let g=marker('rdHa')+'<defs><marker id="rdHb" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--acc)"/></marker><marker id="rdHc" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--c4)"/></marker></defs>';
  L.forEach((l,i)=>{const y=HH+i*RH;if(i%2===0)g+='<rect x="0" y="'+y+'" width="'+W+'" height="'+RH+'" fill="var(--soft)"/>';
    g+=T(8,y+16,l[0],{w:600,fs:12})+T(8,y+31,l[1],{fill:'var(--mute)'})});
  const yl=HH+4*RH;g+=line(0,yl,W,yl,null,{c:'var(--bad)',w:2,d:'6 4'});
  const yc=i=>HH+i*RH+RH/2;
  C.forEach((c,k)=>{const cx=LW+cw*k+cw/2;
    g+=T(cx,nar?(k%2?30:14):17,nar?c[1]:c[0],{a:'middle',w:600,fill:'var(--acc)'});
    g+=line(cx-5,HH+6,cx-5,yc(c[2])+(c[2]===0?0:4),'rdHb',{c:'var(--acc)',w:5});
    g+=line(cx+5,HH+6,cx+5,yc(c[3])+4,'rdHc',{c:'var(--c4)',w:2.5,d:'4 3'});
    g+=T(cx,H-(nar?(k%2?6:21):8),us(c[4]),{a:'middle',fill:'var(--ink)'})});
  el.innerHTML=RD.svg(W,H,g,'Layers from program to stable media; how far write, sync_file_range, fdatasync and fsync push data and metadata')}
reg(hero);

// ---- section 1: blk-mq software queues feeding NVMe queue pairs ----
function mq(){const el=$('rd-mq');if(!el)return;const W=Math.min(860,RD.width(el)),n=5,gap=W<520?4:10,bw=(W-gap*(n-1))/n,nar=W<520;
  let g=marker('rdMa'),y=0;const xs=i=>i*(bw+gap);
  const row=(lab,sub,h,cls)=>{for(let i=0;i<n;i++){g+=box(xs(i),y,bw,h,cls);g+=T(xs(i)+bw/2,y+15,lab(i),{a:'middle',w:600})+(sub?T(xs(i)+bw/2,y+29,sub(i),{a:'middle',fill:'var(--mute)'}):'')}};
  const arrows=(y1,y2)=>{for(let i=0;i<n;i++)g+=line(xs(i)+bw/2,y1,xs(i)+bw/2,y2-2,'rdMa')};
  g+=T(0,11,nar?'blk-mq: a software queue per CPU':'blk-mq: one software queue per CPU (merge, plug, optional scheduler)',{fill:'var(--mute)'});y=18;
  row(i=>'CPU '+i,i=>nar?'sw q':'sw queue',36);arrows(y+36,y+56);y+=56;
  g+=T(0,y+11,nar?'hardware queue = NVMe SQ + CQ pair':'hardware queue = NVMe submission + completion queue pair, in host memory',{fill:'var(--mute)'});y+=18;
  row(i=>nar?'SQ, CQ':'SQ '+i+', CQ '+i,i=>nar?'bell':'doorbell',36,'vboxa');
  const y2=y+36;y+=58;for(let i=0;i<n;i++)g+=line(xs(i)+bw/2,y2,W/2,y-2,'rdMa',{w:1});
  g+=box(0,y,W,46);g+=T(W/2,y+17,nar?'SSD controller: fetches by DMA':'SSD controller: fetches commands by DMA, posts completions, interrupts',{a:'middle',w:600,fs:nar?11:12});
  g+=T(W/2,y+34,nar?'FTL, volatile cache, flash dies':'inside: the FTL (below), a volatile DRAM cache (FLUSH, FUA), flash dies',{a:'middle',fill:'var(--mute)'});
  el.innerHTML=RD.svg(W,y+48,g,'Per-CPU blk-mq software queues feeding per-CPU NVMe queue pairs and the SSD controller')}
reg(mq);

// ---- section 1: FTL stepper (illustrative) ----
if($('rd-ftl-card')){
  // cell: [label, state] state v valid, x invalid, e erased; n marks the cells written in this step
  const E=['.','e'];
  const S=[
   {b:[E,E,E,E,E,E,E,E],n:[],h:0,f:0,t:'A new drive: every page is erased',p:'Two erase blocks of four pages. A page can be programmed (written) once after its block is erased.'},
   {b:[['A','v'],['B','v'],['C','v'],E,E,E,E,E],n:[0,1,2],h:3,f:3,t:'Write A, B and C',p:'The FTL places them in free pages of block 0 and records logical page to physical page in its map.'},
   {b:[['A','x'],['B','v'],['C','v'],['A′','v'],E,E,E,E],n:[3],h:4,f:4,t:'Overwrite A: it goes to a fresh page',p:'Flash cannot rewrite page 0 in place, so the new A goes to page 3, the map now points there, and the old copy is marked invalid. One host write, one flash write.'},
   {b:[['A','x'],['B','x'],['C','v'],['A′','v'],['B′','v'],E,E,E],n:[4],h:5,f:5,t:'Overwrite B: block 0 is full, so block 1',p:'Block 0 now holds two dead pages that cannot be reused until the whole block is erased.'},
   {b:[['A','x'],['B','x'],['C','x'],['A′','x'],['B′','v'],['C','v'],['A′','v'],E],n:[5,6],h:5,f:7,t:'Garbage collection copies the live pages out',p:'To free block 0 the FTL copies its valid pages (C and A′) to block 1: two flash writes the host never asked for. This is write amplification.'},
   {b:[E,E,E,E,['B′','v'],['C','v'],['A′','v'],E],n:[],h:5,f:7,t:'Erase block 0',p:'An erase takes 1.5 to 2 ms against 200 to 300 us to program a page (SLC, OSTEP ch. 44). A discard (TRIM) of dead data would have spared the copies. Write amplification here: 7 flash writes / 5 host writes = 1.4.'}];
  const draw=i=>{const s=S[i];const cell=(c,k)=>'<i class="'+c[1]+(s.n.indexOf(k)>=0?' nw':'')+'">'+c[0]+'</i>';
    $('rd-ftl').innerHTML='<div class="fblk">Erase block 0</div><div class="fl8">'+s.b.slice(0,4).map(cell).join('')+'</div><div class="fblk">Erase block 1</div><div class="fl8">'+s.b.slice(4).map((c,k)=>cell(c,k+4)).join('')+'</div><div class="leg"><span style="--sw:var(--acc2)">valid</span><span style="--sw:var(--soft)">invalid (struck through)</span><span style="--sw:var(--bg)">erased (.)</span></div>';
    $('rd-ftl-cap').innerHTML='<div class="t">Step '+(i+1)+' of '+S.length+': '+s.t+'</div><p>'+s.p+'</p>';
    $('rd-ftl-cnt').innerHTML=RD.stat('host writes',s.h)+RD.stat('flash writes',s.f)+RD.stat('write amplification',s.h?(s.f/s.h).toFixed(2):'n/a','flash / host')};
  RD.anim({card:'rd-ftl-card',ctl:'rd-ftl-ctl',n:S.length,draw,ms:1800,label:'Step'});
}

// ---- section 2: VFS objects over the real ext4 image ----
function vfs(){const el=$('rd-vfs');if(!el)return;const W=Math.min(860,RD.width(el)),wide=W>=640;
  const cw=wide?Math.round(W*0.6):W,BH=40,G=20;let g=marker('rdVa'),y=0;
  const B=(x,yy,w,h,t,ds,cls)=>{let s=box(x,yy,w,h,cls)+T(x+8,yy+16,t,{w:600});(ds||[]).forEach((d,j)=>s+=T(x+8,yy+31+j*14,d,{fill:'var(--mute)'}));return s};
  const chain=[['fd 5','one slot in the process\'s descriptor table'],['struct file','offset, open flags (O_WRONLY)'],['dentry "ckpt.pt" in out/','name to inode 13, cached'],['inode 13 (the file)','size 3,000,000 bytes, Links: 1']];
  chain.forEach((c,i)=>{g+=B(0,y,cw,BH,c[0],[c[1]],i===3?'vboxa':'vbox');y+=BH;g+=line(cw/2,y,cw/2,y+G-2,'rdVa');y+=G});
  const hw=(cw-10)/2,h2=W<420?54:40;
  g+=line(cw/2,y-G,hw/2,y-2,'rdVa')+line(cw/2,y-G,hw+10+hw/2,y-2,'rdVa');
  g+=B(0,y,hw,h2,'address_space',W<420?['its pages in the','page cache']:['its pages in the page cache']);
  g+=B(hw+10,y,hw,h2,'one extent',W<420?['logical 0 to 732','to 2066 to 2798']:['logical 0 to 732 at 2066 to 2798']);
  y+=h2;g+=line(hw+10+hw/2,y,hw+10+hw/2,y+G-2,'rdVa');y+=G;
  g+=B(0,y,cw,BH,'disk: 733 blocks of 4 KiB, contiguous',['Blockcount: 5864 (512-byte sectors)']);y+=BH;
  // two names, one inode
  let x0=0,y0=y+26;if(wide){x0=cw+24;y0=0}const sw=wide?W-x0:W,nw=(sw-10)/2;
  g+=T(x0,y0+11,'Two names, one file (a hard link)',{w:600,fill:'var(--mute)'});y0+=20;
  g+=B(x0,y0,nw,BH,'"hello.txt"',['dentry']);g+=B(x0+nw+10,y0,nw,BH,'"hardlink.txt"',['dentry']);
  g+=line(x0+nw/2,y0+BH,x0+sw/2,y0+BH+G-2,'rdVa')+line(x0+nw+10+nw/2,y0+BH,x0+sw/2,y0+BH+G-2,'rdVa');
  g+=B(x0,y0+BH+G,sw,BH,'inode 14',['Links: 2; freed when 0 and not open'],'vboxa');
  const H=Math.max(y,y0+BH*2+G)+2;el.innerHTML=RD.svg(W,H,g,'File descriptor to struct file to dentry to inode 13 to its extent; two dentries pointing at inode 14')}
reg(vfs);

// ---- section 5: fsync error reporting, before and after errseq_t ----
if($('rd-fe-card')){
  const S={old:[
    ['write() on A returns','dirty: the new checkpoint bytes','none','',''],
    ['writeback fails: the device returns EIO','marked clean, but the bytes never reached the disk; may be dropped','an error flag (AS_EIO) on the file\'s mapping','',''],
    ['B calls fsync first','unchanged','flag reported and cleared','','<span class="pill bad">EIO</span>'],
    ['A calls fsync','unchanged','none left','<span class="pill ok">0: success</span> A believes the checkpoint is durable','<span class="pill bad">EIO</span>'],
    ['A calls fsync again','unchanged','none','<span class="pill ok">0</span> the loss is silent','<span class="pill bad">EIO</span>']],
   new:[
    ['write() on A returns','dirty: the new checkpoint bytes','errseq_t: counter 0','A sampled 0 at open','B sampled 0 at open'],
    ['writeback fails: the device returns EIO','write failed; the page may be dropped','errseq_t: counter 1, EIO','',''],
    ['B calls fsync first','unchanged','B\'s sample moves to 1','','<span class="pill bad">EIO</span>'],
    ['A calls fsync','unchanged','A\'s sample moves to 1','<span class="pill bad">EIO</span> A knows: rewrite from memory','<span class="pill bad">EIO</span>'],
    ['A calls fsync again','unchanged','nothing new since A\'s sample','<span class="pill ok">0</span> a retry looks like success; the data is still gone','<span class="pill bad">EIO</span>']]};
  const CAP={old:['The bytes are only in the page cache.','The failed page is marked clean, so nothing will try to write it again.','B is told. The flag is now cleared.','A, the writer that cares, is told nothing. This is the fsyncgate failure PostgreSQL hit.','Retrying fsync cannot bring the bytes back, and does not even report the loss.'],
   new:['Each open file descriptor remembers the errseq_t value it last saw.','The error is recorded once in the mapping, with a counter.','B sees that the counter moved since its sample: EIO.','A sees it too: every descriptor open at the time gets the error once.','The error was reported to A once. Rewrite the checkpoint; do not retry the fsync and carry on.']};
  let mode='old';
  const draw=i=>{const s=S[mode][i];let a='',b='';for(let k=0;k<=i;k++){if(S[mode][k][3])a=S[mode][k][3];if(S[mode][k][4])b=S[mode][k][4]}
    $('rd-fe').innerHTML='<div class="tw"><table class="tbl-sm nar"><tbody><tr><td><b>page in the cache</b></td><td>'+s[1]+'</td></tr><tr><td><b>error record</b></td><td>'+s[2]+'</td></tr><tr><td><b>fsync on A</b></td><td>'+(a||'not called yet')+'</td></tr><tr><td><b>fsync on B</b></td><td>'+(b||'not called yet')+'</td></tr></tbody></table></div>';
    $('rd-fe-cap').innerHTML='<div class="t">Step '+(i+1)+' of 5: '+esc(s[0])+'</div><p>'+CAP[mode][i]+'</p>'};
  const an=RD.anim({card:'rd-fe-card',ctl:'rd-fe-ctl',n:5,draw,ms:1800,label:'Step'});
  RD.seg($('rd-fe-mode'),m=>{mode=m;an.reset(5)});
}

// ---- section 7: one jbd2 commit under the three data modes ----
if($('rd-jb-card')){
  const M='<span class="pill acc">metadata: inode, dir entry, bitmap</span>',Dd='<span class="pill mid">data: 4 blocks (dirty)</span>',Dk='<span class="pill ok">data: 4 blocks</span>',Mk='<span class="pill acc">metadata</span>',C='<span class="pill ok">commit block</span>',O='<span class="pill inv">old metadata</span>';
  const S={ordered:[
    [M+Dd,'',O,'Handles join the running transaction','The rename or create changed the inode, a directory block and a bitmap, in memory; the file\'s data is dirty in the page cache.','Crash now: nothing new is on disk. Old state.'],
    [M,'',O+Dk,'Commit starts (5 s old, or an fsync): data first','Ordered mode writes the data blocks to their home locations before any metadata that points at them is logged.','Crash now: new data sits in blocks nothing points to. Old state, no harm.'],
    [M,Mk,O+Dk,'Metadata blocks to the journal','The changed metadata blocks are copied into the journal area.','Crash now: no commit block, so replay discards the transaction. Old state.'],
    ['',Mk+C,O+Dk,'Commit block, with PREFLUSH and FUA','The device cache is flushed and the commit block written through to stable media: the transaction is committed.','Crash now: replay copies the metadata home. The new file, with its data.'],
    ['',Mk+C,Mk+Dk,'Checkpoint: metadata written home, later','In the background the metadata blocks are written to their real places.','Crash now: replay is harmless (it writes the same blocks again).'],
    ['','',Mk+Dk,'Journal space freed','That part of the journal is reused by later transactions.','Crash now: the new state, nothing to replay.']],
   journal:[
    [M+Dd,'',O,'Handles join the running transaction','As in ordered mode: metadata and data are changed in memory.','Crash now: old state.'],
    [M,Mk+'<span class="pill ok">data</span>',O,'Data and metadata to the journal','In data=journal mode the file\'s data is logged too: every byte is written twice.','Crash now: no commit block, replay discards both. Old state.'],
    ['',Mk+'<span class="pill ok">data</span>'+C,O,'Commit block, with PREFLUSH and FUA','Data and metadata are committed together.','Crash now: replay writes both home. Consistent data and metadata.'],
    ['',Mk+'<span class="pill ok">data</span>'+C,Mk+Dk,'Checkpoint: both written home','The second write of every byte.','Crash now: replay is harmless.'],
    ['','',Mk+Dk,'Journal space freed','Reused by later transactions.','Crash now: the new state.']],
   writeback:[
    [M+Dd,'',O,'Handles join the running transaction','As before.','Crash now: old state.'],
    [M+Dd,Mk,O,'Metadata to the journal; data not waited for','data=writeback does not order data before metadata: the data may still be dirty in memory.','Crash now: no commit block. Old state.'],
    [Dd,Mk+C,O,'Commit block, with PREFLUSH and FUA','The metadata is committed while the data has not reached its blocks.','Crash now: replay installs an inode that points at blocks whose new data never arrived, so their stale contents appear in the file.'],
    ['',Mk+C,O+Dk,'Data written later by ordinary writeback','Whenever the flusher gets to it.','Crash now: replay gives the new file with its data.'],
    ['','',Mk+Dk,'Checkpoint and journal space freed','As in the other modes.','Crash now: the new state.']]};
  let mode='ordered';
  const draw=i=>{const s=S[mode][i];
    $('rd-jb').innerHTML='<div class="tri"><div><h5>Memory</h5>'+(s[0]||'<span class="small mute">nothing pending</span>')+'</div><div><h5>Journal (on disk)</h5>'+(s[1]||'<span class="small mute">empty</span>')+'</div><div><h5>Home locations (on disk)</h5>'+s[2]+'</div></div><div class="crashnote">'+s[5]+'</div>';
    $('rd-jb-cap').innerHTML='<div class="t">Step '+(i+1)+' of '+S[mode].length+': '+s[3]+'</div><p>'+s[4]+'</p>'};
  const an=RD.anim({card:'rd-jb-card',ctl:'rd-jb-ctl',n:S.ordered.length,draw,ms:1800,label:'Step'});
  RD.seg($('rd-jb-mode'),m=>{mode=m;an.reset(S[m].length)});
}

// ---- section 8: where the bytes are copied ----
function dp(){const el=$('rd-dp');if(!el)return;const W=Math.min(860,RD.width(el)),nar=W<520,gp=nar?50:90,bw=(W-2*gp)/3,BH=nar?40:34;
  const L=[['Buffered (read, write)',[['Your buffer'],['Page cache'],['Device']],[['CPU copy',0],['DMA',0]]],
   ['O_DIRECT',[['Your buffer','(aligned)'],['page cache','skipped',1],['Device']],[['DMA',1]]],
   ['GPUDirect Storage',[['GPU memory'],['host memory','skipped',1],['NVMe or NIC']],[['DMA',1]]]];
  let g=marker('rdDa'),y=0;const xs=i=>i*(bw+gp);
  L.forEach(l=>{g+=T(0,y+12,l[0],{w:600});y+=18;
    l[1].forEach((b,i)=>{g+=box(xs(i),y,bw,BH,i===1&&!b[2]?'vboxa':'vbox',b[2]);
      const lines=nar&&b[0].indexOf(' ')>0&&!b[1]?b[0].split(' '):[b[0]].concat(b[1]?[b[1]]:[]);
      lines.forEach((t,j)=>g+=T(xs(i)+bw/2,y+BH/2+4+(j-(lines.length-1)/2)*13,t,{a:'middle',fill:b[2]?'var(--mute)':'var(--ink)'}))});
    const ym=y+BH/2;
    if(l[2].length===2){g+=line(xs(0)+bw,ym,xs(1)-2,ym,'rdDa',{c:'var(--bad)',w:2})+T((xs(0)+bw+xs(1))/2,y+BH+13,l[2][0][0],{a:'middle',fill:'var(--bad)'});
      g+=line(xs(1)+bw,ym,xs(2)-2,ym,'rdDa',{c:'var(--good)',w:2})+T((xs(1)+bw+xs(2))/2,y+BH+13,'DMA',{a:'middle',fill:'var(--good)'})}
    else{g+='<path d="M'+(xs(0)+bw).toFixed(1)+','+(ym-4)+' C'+(xs(1)+bw*0.2).toFixed(1)+','+(y-12)+' '+(xs(1)+bw*0.8).toFixed(1)+','+(y-12)+' '+(xs(2)-2).toFixed(1)+','+(ym-4)+'" fill="none" stroke="var(--good)" stroke-width="2" marker-end="url(#rdDa)"/>'+T(xs(1)+bw/2,y+BH+13,'DMA, no copy',{a:'middle',fill:'var(--good)'})}
    y+=BH+34});
  el.innerHTML=RD.svg(W,y-12,g,'Buffered I/O copies into the page cache; O_DIRECT and GPUDirect Storage move data by DMA without it')}
reg(dp);

// ---- section 9: NFS close-to-open between ranks and a restarted node ----
function nfs(){const el=$('rd-nfs');if(!el)return;const W=Math.min(760,RD.width(el)),nar=W<520;
  const P=['rank 7 (node A)','rank 0','NFS server','restart (node B)'],PS=['rank 7','rank 0','server','node B'];
  const m=nar?34:60,x=i=>m+i*(W-2*m)/3,top=34,dy=nar?38:34;
  const M=[[0,0,'write(): only in A\'s page cache'],[0,2,'close(): WRITE + COMMIT'],[0,1,'barrier: shard closed'],[1,2,'marker: write, close'],[3,2,'open(marker): GETATTR'],[3,2,'open(shard): GETATTR, READ'],[3,3,'sees the new shard']];
  let g=marker('rdNa');const H=top+dy*(M.length+0.6);
  P.forEach((p,i)=>{g+=T(x(i),14,nar?PS[i]:p,{a:'middle',w:600})+line(x(i),20,x(i),H-4,null,{c:'var(--line)',w:1.5,d:i===2?'':'3 3'})});
  M.forEach((mm,k)=>{const y=top+dy*(k+0.5);
    if(mm[0]===mm[1]){const left=mm[0]===3;const tx=left?x(3)-6:x(0)+6;
      g+='<circle cx="'+x(mm[0])+'" cy="'+y+'" r="4" fill="'+(k===6?'var(--good)':'var(--c5)')+'"/>'+T(tx,y+4,mm[2],{a:left?'end':'start',fill:k===6?'var(--good)':'var(--mute)'});return}
    const x1=x(mm[0]),x2=x(mm[1]);g+=line(x1,y+6,x2+(x2>x1?-3:3),y+6,'rdNa',{c:'var(--acc)',w:1.6});
    g+=T((x1+x2)/2,y,mm[2],{a:'middle'})});
  el.innerHTML=RD.svg(W,H,g,'Sequence: rank 7 closes its shard to the server, rank 0 writes the marker after a barrier, node B opens marker then shard')}
reg(nfs);
})();
