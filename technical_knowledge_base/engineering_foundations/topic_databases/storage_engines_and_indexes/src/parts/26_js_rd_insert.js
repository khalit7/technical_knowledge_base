// ---- Reading section 6: one insert, two engines (before: B-tree page split; after: LSM memtable, flush, compaction) ----
(function(){
  const card=document.getElementById('rd-ins-card');if(!card)return;
  const svg=document.getElementById('rd-ins-svg'),cap=document.getElementById('rd-ins-cap'),cnt=document.getElementById('rd-ins-cnt');
  // B-tree: pages hold 4 keys (illustrative; a real leaf holds about 367 bigint keys). Key 42 goes into a full leaf.
  const BT=[
    {root:[30,60],leaves:[[10,15,20,25],[30,35,40,45],[60,70]],hl:[],read:0,dirty:[],wal:0,rnd:0,t:'The B-tree before the insert',p:'A root page with two separators and three leaf pages of at most 4 keys. The middle leaf is full. We insert key 42.'},
    {root:[30,60],leaves:[[10,15,20,25],[30,35,40,45],[60,70]],hl:['r'],read:1,dirty:[],wal:0,rnd:0,t:'1. Read the root',p:'Binary search in the root: 42 is at least 30 and below 60, so follow the middle downlink. One page read (from the buffer pool if it is cached).'},
    {root:[30,60],leaves:[[10,15,20,25],[30,35,40,45],[60,70]],hl:['l1'],read:2,dirty:[],wal:0,rnd:0,t:'2. Read the leaf: it is full',p:'Key 42 belongs between 40 and 45, but the page has no room. It must split.'},
    {root:[30,60],leaves:[[10,15,20,25],[30,35],[40,42,45],[60,70]],hl:['l1','l2'],read:2,dirty:['l1','l2'],wal:1,rnd:0,split:1,t:'3. Split the leaf',p:'A new page is allocated; the upper half of the keys moves to it and 42 is inserted there. Two pages are now dirty, and a split record goes to the log.'},
    {root:[30,40,60],leaves:[[10,15,20,25],[30,35],[40,42,45],[60,70]],hl:['r'],read:2,dirty:['l1','l2','r'],wal:2,rnd:0,split:1,t:'4. Tell the parent',p:'The parent gets a new separator, 40, pointing at the new page. A third page is dirty. Had the root been full too, it would split and the tree would grow a level.'},
    {root:[30,40,60],leaves:[[10,15,20,25],[30,35],[40,42,45],[60,70]],hl:[],read:2,dirty:['l1','l2','r'],wal:2,rnd:3,split:1,t:'5. Commit, then write in place later',p:'The commit flushes only the log. At the next checkpoint the three dirty pages are written back, each to its own place in the file: three random 8 KB writes for one key, and three full-page images in the log if they are the first changes since the last checkpoint.'}];
  const LS=[
    {mem:[10,25,30],l0:[[5,12,47,80]],l1:[[1,3,8,20,33,50,64,90]],hl:[],wal:0,seq:0,comp:0,t:'The LSM-tree before the insert',p:'A memtable in memory holds 3 of 4 keys. On disk: one sorted run in level 0 and one in level 1. Files are never modified once written. We insert key 42.'},
    {mem:[10,25,30],l0:[[5,12,47,80]],l1:[[1,3,8,20,33,50,64,90]],hl:['wal'],wal:1,seq:0,comp:0,t:'1. Append to the log',p:'The change is appended to the write-ahead log, a sequential write; the commit waits for its flush, exactly as in Postgres.'},
    {mem:[10,25,30,42],l0:[[5,12,47,80]],l1:[[1,3,8,20,33,50,64,90]],hl:['mem'],wal:1,seq:0,comp:0,t:'2. Insert into the memtable',p:'42 goes into the sorted in-memory table. No page on disk is read or changed. The memtable is now full.'},
    {mem:[],l0:[[10,25,30,42],[5,12,47,80]],l1:[[1,3,8,20,33,50,64,90]],hl:['l0a'],wal:1,seq:4,comp:0,t:'3. Flush: write a new sorted run',p:'The full memtable is written as a new immutable sorted file in level 0, in one sequential write. Level 0 now has 2 runs, which triggers a compaction.'},
    {mem:[],l0:[],l1:[[1,3,5,8,10,12,20,25,30,33,42,47,50,64,80,90]],hl:['l1'],wal:1,seq:4,comp:16,t:'4. Later, in the background: compaction',p:'The level-0 runs are merge-sorted with level 1 into one new run, and the old files are deleted. 16 keys are rewritten to place 4 new ones. This is where the LSM-tree pays its write amplification.'},
    {mem:[],l0:[],l1:[[1,3,5,8,10,12,20,25,30,33,42,47,50,64,80,90]],hl:[],wal:1,seq:4,comp:16,t:'5. The bill',p:'The insert itself cost one log append; no random write ever happened. The price: every key is rewritten at each level it passes through, and until compaction catches up a read may have to search the memtable and several runs (bloom filters skip most of them).'}];
  let mode='bt';const seq=()=>mode==='bt'?BT:LS;
  function box(x,y,w,h,keys,on,dash){let s='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+w.toFixed(1)+'" height="'+h+'" rx="4" fill="'+(on?'var(--hl)':'var(--soft)')+'" stroke="'+(on?'var(--acc)':'var(--line)')+'" stroke-width="'+(on?2:1)+'"'+(dash?' stroke-dasharray="4 3"':'')+'/>';
    s+=RD.t(x+w/2,y+h/2+4,keys.join(' '),{a:'middle',fs:w<90?10:11.5,fill:keys.length?'var(--ink)':'var(--mute)'});return s}
  function draw(i){const s=seq()[i],W=RD.width(svg);let b='',H;
    if(mode==='bt'){H=150;const rw=Math.min(180,W*0.45);b+=box((W-rw)/2,10,rw,32,s.root,s.hl.includes('r'));
      const n=s.leaves.length,g=8,lw=(W-g*(n-1))/n;
      s.leaves.forEach((l,j)=>{const x=j*(lw+g),id=j===1?'l1':(j===2&&n===4)?'l2':'x',on=s.hl.includes(id);
        b+='<line x1="'+(W/2)+'" y1="42" x2="'+(x+lw/2).toFixed(1)+'" y2="90" stroke="var(--line)"/>';b+=box(x,90,lw,32,l,on);
        if(s.dirty.includes(id))b+=RD.t(x+lw/2,138,'dirty',{a:'middle',fs:10.5,fill:'var(--bad)',w:600})});
      if(s.dirty.includes('r'))b+=RD.t(W/2+rw/2+6,30,'dirty',{fs:10.5,fill:'var(--bad)',w:600});
    }else{H=178;const lab=30,w=W-lab;b+=RD.t(0,30,'mem',{fs:11,w:600});b+=box(lab,10,Math.min(w,200),30,s.mem,s.hl.includes('mem'),true);
      b+=RD.t(0,82,'L0',{fs:11,w:600});let x=lab;s.l0.forEach((r,j)=>{const rw=Math.min(150,w/2-6);b+=box(x,62,rw,30,r,j===0&&s.hl.includes('l0a'));x+=rw+8});
      if(!s.l0.length)b+=RD.t(lab,82,'(empty)',{fs:11,fill:'var(--mute)'});
      b+=RD.t(0,134,'L1',{fs:11,w:600});s.l1.forEach(r=>{b+=box(lab,114,w,30,r,s.hl.includes('l1'))});
      b+=RD.t(lab,170,'log: '+(s.wal?'... 42':'...'),{fs:11,fill:s.hl.includes('wal')?'var(--acc)':'var(--mute)',w:s.hl.includes('wal')?600:400})}
    svg.innerHTML=RD.svg(W,H,b,mode==='bt'?'A B-tree with a root and leaf pages':'An LSM-tree with a memtable, level 0 and level 1');
    cnt.innerHTML=mode==='bt'?RD.stat('Pages read',s.read)+RD.stat('Pages dirtied',s.dirty.length)+RD.stat('Random page writes',s.rnd,'at the checkpoint')+RD.stat('Log records',s.wal+(i>=5?1:0)):
      RD.stat('Log appends',s.wal)+RD.stat('Random writes',0)+RD.stat('Keys written by flush',s.seq,'sequential')+RD.stat('Keys rewritten by compaction',s.comp,'background');
    cap.innerHTML='<div class="t">'+s.t+'</div><p>'+s.p+'</p>'}
  const A=RD.anim({card:'rd-ins-card',ctl:'rd-ins-ctl',n:BT.length,draw,ms:2200,label:'Step'});
  RD.seg(document.getElementById('rd-ins-mode'),m=>{mode=m;A.reset(seq().length);A.play()});
  RD.onResize(()=>A.redraw());
})();
