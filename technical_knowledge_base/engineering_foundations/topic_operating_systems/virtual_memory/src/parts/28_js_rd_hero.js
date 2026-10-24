// ---- Top of the Reading tab: the hero figure (static annotated diagram). Virtual ranges -> TLB and page tables -> frames -> disk ----
(function(){
  const el=document.getElementById('vm-hero');if(!el)return;
  const R=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+Math.max(1,w).toFixed(1)+'" height="'+h+'" rx="'+(o.rx==null?4:o.rx)+'" fill="'+(o.f||'none')+'"'+(o.op?' fill-opacity="'+o.op+'"':'')+' stroke="'+(o.s||'var(--line)')+'"'+(o.sw?' stroke-width="'+o.sw+'"':'')+(o.d?' stroke-dasharray="'+o.d+'"':'')+'/>'};
  const T=(x,y,s,o)=>RD.t(x.toFixed(1),y,s,o);
  const A=(x1,y1,x2,y2,o)=>{o=o||{};return '<line x1="'+x1.toFixed(1)+'" y1="'+y1+'" x2="'+x2.toFixed(1)+'" y2="'+y2+'" stroke="'+(o.s||'var(--mute)')+'" stroke-width="1.4"'+(o.d?' stroke-dasharray="'+o.d+'"':'')+' marker-end="url(#vmh-ar)"/>'};
  function draw(){
    const W=Math.min(860,RD.width(el)),nar=W<560,m=2,U=W-2*m,X=f=>m+U*f;
    const fs=nar?11:12;
    // virtual ranges: [name short, name long, from, to, kind]  kind: f file, a anonymous, s shared memory, r reserved untouched
    const V=[['code .so','code (.so files)',0,.12,'f'],['dataset','dataset (mmap)',.15,.28,'f'],['shm','/dev/shm',.31,.42,'s'],['heap','heap (anon)',.45,.58,'a'],['stack','stack',.61,.72,'a'],['reserve','1 GiB reserve (untouched)',.75,1,'r']];
    const COL={f:'var(--c1)',a:'var(--c3)',s:'var(--c4)',r:'var(--mute)'};
    const yV=22,hV=30,yP=92,hP=34,yM=192,hM=32,yD=274,hD=28,H=yD+hD+4;
    let b='<defs><marker id="vmh-ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L8,4L0,8z" fill="var(--mute)"/></marker></defs>';
    b+=T(m,14,nar?'Virtual address space: mappings (VMAs, §1)':'Virtual address space of one process: its mappings (VMAs, §1), grouped by kind, not to scale',{fs,w:600,fill:'var(--ink)'});
    V.forEach(v=>{const x=X(v[2]),w=X(v[3])-x;b+=R(x,yV,w,hV,{f:COL[v[4]],op:v[4]==='r'?.05:.22,s:COL[v[4]],d:v[4]==='r'?'4 3':null});
      b+=T(x+w/2,yV+19,nar||w<110?v[0]:v[1],{a:'middle',fs:nar?10.5:11.5,fill:'var(--ink)'})});
    // gaps between ranges
    for(let i=0;i<V.length-1;i++){const x1=X(V[i][3]),x2=X(V[i+1][2]);b+='<line x1="'+(x1+2)+'" y1="'+(yV+hV/2)+'" x2="'+(x2-2)+'" y2="'+(yV+hV/2)+'" stroke="var(--dim)" stroke-dasharray="2 2"/>'}
    // translation box: TLB then page tables
    const tl=nar?.22:.16;
    b+=R(X(0),yP,U,hP,{f:'var(--soft)',s:'var(--line)'})+'<line x1="'+X(tl)+'" y1="'+yP+'" x2="'+X(tl)+'" y2="'+(yP+hP)+'" stroke="var(--line)"/>';
    b+=T(X(tl/2),yP+21,'TLB §3',{a:'middle',fs,w:600,fill:'var(--acc)'});
    b+=T(X(tl+(1-tl)/2),yP+21,nar?'page tables, 4 levels §2, huge §8':'page-table tree, 4 levels (§2); a huge page is one entry for 2 MiB (§8)',{a:'middle',fs,fill:'var(--ink)'});
    // arrows from each range into the translation box
    V.forEach(v=>{const cx=X((v[2]+v[3])/2);b+=A(cx,yV+hV+2,cx,yP-2,{d:v[4]==='r'?'3 3':null})});
    // physical memory
    const M=[['cache','page cache §6','page cache: file and shm pages, one copy for all (§6)',0,.42,'var(--c1)'],['anon','anon §7 §9','anonymous: fork shares §7, pinned §9',.45,.745,'var(--c3)'],['zero','zero','zero page',.775,.87,'var(--mute)'],['free','free','free',.9,1,'var(--dim)']];
    b+=T(m,yM-8,'Physical RAM: 4 KiB frames',{fs,w:600,fill:'var(--ink)'});
    M.forEach(r=>{const x=X(r[3]),w=X(r[4])-x;b+=R(x,yM,w,hM,{f:r[5],op:.22,s:r[5]});b+=T(x+w/2,yM+20,nar||w<300?r[1]:r[2],{a:'middle',fs:nar?10.5:11,fill:'var(--ink)'})});
    // cgroup charge around anon + page cache
    b+=R(X(0)-1,yM-3,X(.745)-X(0)+2,hM+6,{s:'var(--bad)',d:'5 3',sw:1.3,rx:6});
    b+=T(X(.775),yM+hM+16,nar?'dashed: cgroup':'dashed: charged to the cgroup',{fs:10.5,fill:'var(--bad)'})+T(X(.775),yM+hM+30,nar?'limit, OOM §12':'memory.max: reclaim, OOM §12',{fs:10.5,fill:'var(--bad)'});
    // arrows from the tables to frames (first touch), labelled
    const tx=(i)=>X((V[i][2]+V[i][3])/2);
    const am=[[0,.08,''],[1,.2,'§5 no copy'],[2,.36,''],[3,.53,'§4 first write'],[4,.67,''],[5,.82,'§4 read']];
    am.forEach(a=>{b+=A(tx(a[0]),yP+hP+2,X(a[1]),yM-16,{d:a[0]===5?'3 3':null});if(a[2]&&!(nar&&a[0]===5))b+=T((tx(a[0])+X(a[1]))/2+4,(yP+hP+yM-16)/2+4,a[2],{fs:10.5,fill:'var(--mute)'})});
    // disk
    b+=R(X(.45),yD,X(.745)-X(.45),hD,{f:'var(--c5)',op:.22,s:'var(--c5)'})+T(X(.5975),yD+18,nar?'swap §11':'swap device (§11)',{a:'middle',fs:nar?10.5:11,fill:'var(--ink)'});
    b+=R(X(0),yD,X(.42)-X(0),hD,{f:'var(--soft)',s:'var(--line)'})+T(X(.21),yD+18,nar?'files on disk':'files on disk (.so, dataset)',{a:'middle',fs:nar?10.5:11,fill:'var(--ink)'});
    b+=A(X(.6),yM+hM+4,X(.6),yD-3,{d:'4 3'})+T(X(.6)+5,yM+hM+30,nar?'swap out':'reclaim: swap out',{fs:10.5,fill:'var(--mute)'});
    b+='<line x1="'+X(.15)+'" y1="'+(yD-3)+'" x2="'+X(.15)+'" y2="'+(yM+hM+4)+'" stroke="var(--mute)" stroke-width="1.4" marker-end="url(#vmh-ar)" marker-start="url(#vmh-ar)"/>'+T(X(.15)+5,yM+hM+30,nar?'read, writeback':'read in, write back (§5, §6)',{fs:10.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,b,'One process: virtual mappings, translated by the TLB and page tables, onto anonymous frames, page cache and the zero page, with swap and files on disk below and the cgroup limit around charged memory');
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();
