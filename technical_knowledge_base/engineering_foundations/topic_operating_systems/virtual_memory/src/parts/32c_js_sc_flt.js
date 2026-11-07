// ---- Scene, Fig. 4 (section 4): one access followed through the arm64 fault path of Linux v5.10, per case (renderer v2) ----
// Left to right: the CPU, the TLB, the page-table entry (a glass plate), the kernel, physical memory; behind them the places a page can come from
// (the zero page, the page cache, the file on disk, swap). The step list on the left is filled per case from C (the kernel functions and the measured costs).
(function(){
  if(!document.getElementById('stg-flt')||!window.VM_DATA)return;const {at,lerp,mix}=S3,D=VM_DATA,$=id=>document.getElementById(id);
  const fmt=(x,d)=>Number(x).toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  const GH='https://github.com/torvalds/linux/blob/v5.10/',L=(f,l,t)=>'<a href="'+GH+f+'#L'+l+'" target="_blank" rel="noopener noreferrer">'+t+'</a>';
  const F=D.first_write,Z=D.zero_page,RF=D.root_faults;
  const warm=RF.warm.slice().sort((a,b)=>a.ms-b.ms)[1],cold=RF.cold.slice().sort((a,b)=>a.ms-b.ms)[1];
  const sw=D.root_swap.filter(x=>x.majflt>0),swUs=sw.reduce((s,x)=>s+x.s*1e6/x.majflt,0)/sw.length;
  // per case: the access, the VMA, the entry before, the handler, what the entry points at after, the source drawn, the measured cost
  const C={
    anon_w:{acc:'store',vma:'anonymous, private, rw-',pte0:'none (never touched)',src:'new',
      h:'do_anonymous_page ('+L('mm/memory.c',3469,'mm/memory.c line 3469')+'): take a free frame, zero it, map it writable.',fr:'a new zeroed 4 KiB frame',
      us:F['4k'].ms_median*1000/F['4k'].faults,cost:'64 MiB first touched: '+fmt(F['4k'].faults)+' faults in '+fmt(F['4k'].ms_median,1)+' ms (median of 3)'},
    anon_r:{acc:'load',vma:'anonymous, private, rw-',pte0:'none (never touched)',src:'zero',
      h:'do_anonymous_page sees a read: map the one shared zero page, read-only ('+L('mm/memory.c',3496,'lines 3496 to 3500')+'). No frame is used.',fr:'the shared zero page',
      us:Z.read_ms*1000/Z.read_faults,cost:'64 MiB read: '+fmt(Z.read_faults)+' faults in '+fmt(Z.read_ms,1)+' ms, RSS +0'},
    file_w:{acc:'load',vma:'file train.bin, shared, r--',pte0:'none',src:'cache',
      h:'do_fault, do_read_fault ('+L('mm/memory.c',3990,'line 3990')+'): the page is in the page cache, so do_fault_around maps it and up to 15 cached neighbours (64 KiB, '+L('mm/memory.c',3875,'line 3875')+').',fr:'the page-cache page itself, plus neighbours',
      us:warm.ms*1000/warm.minor,cost:'root, dataset warm: 2,056 pages in '+warm.minor+' faults, '+fmt(warm.ms,2)+' ms'},
    file_c:{acc:'load',vma:'file train.bin, shared, r--',pte0:'none',src:'disk',
      h:'filemap_fault: page not cached, start readahead I/O, sleep until the device returns it ('+L('mm/filemap.c',2738,'mm/filemap.c line 2738')+' counts the major fault).',fr:'a page-cache page just read from disk',
      us:cold.ms*1000/(cold.minor+cold.major),cost:'root, dataset cold: '+cold.major+' major + '+cold.minor+' minor faults, '+fmt(cold.ms,1)+' ms (average over both kinds)'},
    cow:{acc:'store',vma:'anonymous, private, rw-',pte0:'present, read-only (fork write-protected it)',src:'copy',
      h:'handle_pte_fault: write to a read-only entry, do_wp_page; the frame is shared, so wp_page_copy ('+L('mm/memory.c',2817,'line 2817')+') copies 4 KiB.',fr:'a private copy of the page',
      us:D.cow_write['4k'].ns_per_page/1000,cost:'child writes 256 MiB: '+fmt(D.cow_write['4k'].faults)+' faults, '+fmt(D.cow_write['4k'].ms,0)+' ms'},
    swap:{acc:'load',vma:'anonymous, private, rw-',pte0:'not present: holds a swap slot',src:'swap',
      h:'handle_pte_fault: not present, do_swap_page ('+L('mm/memory.c',4377,'line 4377')+'): read the slot (and 7 neighbours) from swap, map the frame.',fr:'a frame read back from swap',
      us:swUs,cost:'root Debug lab, 700 MiB in a 512 MiB container: '+sw.map(x=>fmt(x.majflt)+' major in '+x.s+' s').join('; ')+' (includes evicting other pages)'},
    segv:{acc:'load',vma:'none',pte0:'none',src:'none',fr:'none',us:0,cost:''}};
  let cur='anon_w';
  function fill(){const c=C[cur],l=$(cur==='segv'?'sx-flt-segv':'sx-flt');l.querySelectorAll('[data-f]').forEach(s=>{const v=c[s.dataset.f];if(v!=null)s.innerHTML=v});
    $('vm-flt-cost').innerHTML=c.us?'<span class="meas">measured</span> '+fmt(c.us,c.us<10?2:0)+' us per fault: '+c.cost+'.':'No cost: the process is killed.'}
  // layout
  const XC=-4.4,XT=-3.0,XP=-1.5,XK=.5,XM=2.7,ZB=-1.7,ZM=.2;
  const SRC={zero:[1.2,0,ZB],cache:[2.6,0,ZB],disk:[4.0,0,ZB],swap:[5.3,0,ZB]};
  function draw(R,k,e){const P=R.P,c=C[cur],nar=R.W<520,segv=cur==='segv',last=segv?3:6;R.grid(-5.4,6,-2.6,1.6,.5);
    const f=s=>k===s?1:.35;
    // CPU and TLB
    R.box([XC,0,ZM],[.9,.6,.8],{fill:mix(P.paper,P.c1,.3),a:Math.max(.5,f(0))});R.label([XC,.6,ZM],'CPU: '+c.acc,{fs:12.5,b:1,dy:-10,a:1});
    R.box([XT,0,ZM],[.75,.42,.65],{fill:mix(P.paper,P.c2,.3),a:k===0||k===last?1:.4});R.label([XT,.42,ZM],k===last&&!segv?'TLB: cached':'TLB: miss',{fs:12.5,b:1,dy:-10,c:k===0?P.bad:P.ink,a:k===0||k===last?1:.5});
    if(k===0)R.flow([[XC+.45,.35,ZM],[XT-.35,.3,ZM]],{c:P.c2,a:e,r:.07});
    // the page-table entry
    const pa=k===1||(k===last&&!segv)?1:.4,valid=k>=5&&!segv,ro=cur==='cow'&&k<5;
    R.glass([XP-.7,.55,ZM-.55],[1.4,0,0],[0,0,1.1],{c:P.c5,nu:4,nv:4,a:pa});R.label([XP,.6,ZM-.55],'page-table entry',{fs:12.5,b:1,dy:-10,c:P.c5,a:Math.max(.5,pa)});
    R.box([XP,.57,ZM],[.35,.08,.26],{fill:valid?P.c5:ro?mix(P.paper,P.c5,.4):P.paper,ec:valid?P.edge:P.bad,a:1,shadow:false});
    R.label([XP,.57,ZM+.13],valid?'valid':ro?'read-only':'no entry',{fs:12,dy:14,c:valid?P.c5:P.bad,a:1});
    if(k===1)R.flow([[XT+.35,.3,ZM],[XP,.6,ZM]],{c:P.c2,a:e,r:.07});
    // the kernel
    const ka=k>=2&&k<=5||(segv&&k===3)?1:.35;R.box([XK,0,ZM],[1.3,.65,1.0],{fill:segv&&k===3?mix(P.paper,P.bad,.35):mix(P.paper,P.c4,.25),a:Math.max(.45,ka)});
    const KL=['kernel','kernel','data abort','find the VMA','handle_mm_fault','handler','kernel'];
    R.label([XK,.65,ZM],segv&&k===3?'SIGSEGV':KL[k],{fs:12.5,b:1,mono:k>=4,dy:-10,c:segv&&k===3?P.bad:P.ink,a:Math.max(.5,ka)});
    if(k===2)R.flowArc([XP,.6,ZM],[XK,.65,ZM],.5,{c:P.c4,a:e,r:.07});
    if(k===3)R.label([XK,0,ZM+.5],'VMA: '+c.vma,{fs:12,dy:14,c:segv?P.bad:P.c4,a:e});
    // physical memory: a few frames already in use, and the frame this fault ends on
    for(let i=0;i<4;i++)R.box([XM+i*.45,0,ZM],[.34,.34,.34],{fill:mix(P.paper,P.c3,.25),a:.5});
    R.label([XM+.7,0,ZM+.2],'physical memory',{fs:12,dy:16,c:P.mute,wide:1});
    // the sources behind
    R.box(SRC.zero,[.4,.4,.4],{fill:P.paper,a:c.src==='zero'?1:.3});R.label([SRC.zero[0],.4,ZB],'zero page',{fs:12,dy:-10,a:c.src==='zero'?1:.45});
    for(let i=0;i<3;i++)R.box([SRC.cache[0]+(i-1)*.36,0,ZB],[.3,.3,.3],{fill:mix(P.paper,P.c1,.5),a:c.src==='cache'||c.src==='disk'?1:.3});
    R.label([SRC.cache[0],.3,ZB],'page cache',{fs:12,dy:-10,c:P.c1,a:c.src==='cache'||c.src==='disk'?1:.45});
    R.box(SRC.disk,[1.0,.2,.7],{fill:mix(P.paper,P.mute,.3),a:c.src==='disk'?1:.3});R.label([SRC.disk[0],.2,ZB],'file on disk',{fs:12,dy:-10,a:c.src==='disk'?1:.45,wide:1});
    R.box(SRC.swap,[1.0,.2,.7],{fill:mix(P.paper,P.c5,.35),a:c.src==='swap'?1:.3});R.label([SRC.swap[0],.2,ZB],'swap',{fs:12,dy:-10,a:c.src==='swap'?1:.45});
    // step 6: the handler fills the entry from the case's source
    const hx=XM+1.8,hp=[hx,0,ZM],ha=k===5?e:k>5?1:0;
    if(!segv&&ha>0){const P1=[XK+.6,.4,ZM],to=c.src==='zero'?[SRC.zero[0],.4,ZB]:c.src==='cache'||c.src==='disk'?[SRC.cache[0],.3,ZB]:hp;
      if(c.src==='new'||c.src==='swap'||c.src==='copy')R.box(hp,[.34,.34,.34],{fill:mix(P.paper,c.src==='copy'?P.c2:P.c3,.6),a:ha});
      if(k===5){if(c.src==='disk')R.flow([[SRC.disk[0],.2,ZB],[SRC.cache[0]+.4,.3,ZB]],{c:P.c1,a:e,r:.07,speed:.6});
        if(c.src==='swap')R.flowArc([SRC.swap[0],.2,ZB],[hx,.34,ZM],.6,{c:P.c5,a:e,r:.06,n:8});
        if(c.src==='copy')R.flowArc([XM+.45,.34,ZM],[hx,.34,ZM],.5,{c:P.c2,a:e,r:.06});
        R.flowArc(P1,c.src==='new'||c.src==='swap'||c.src==='copy'?[hx,.34,ZM]:to,.6,{c:P.c4,a:e,r:.06})}
      if(c.src==='copy'){R.label([XM+.45,.34,ZM],'shared',{fs:12,dy:-10,c:P.mute,a:ha})}
      // the entry now points at it
      R.line([[XP,.6,ZM],[XP+.6,.9,ZM-.2],[to[0],to[1]+.05,to[2]]],{c:P.c5,w:1.6,a:ha*.85,dash:c.src==='zero'?[5,4]:null});
      R.label(to,c.src==='zero'?'read-only':c.src==='cache'||c.src==='disk'?'+15 neighbours':c.src==='copy'?'copy':c.src==='swap'?'read back':'zeroed',{fs:12,dy:-24,c:P.c5,a:ha,b:1})}
    if(k===last&&!segv){R.flow([[XC+.45,.35,ZM],[XT,.42,ZM],[XP,.65,ZM],[XP+.6,.9,ZM-.2],[cur==='anon_r'?SRC.zero[0]:cur==='file_w'||cur==='file_c'?SRC.cache[0]:hx,.4,cur==='anon_r'||cur==='file_w'||cur==='file_c'?ZB:ZM]],{c:P.c2,a:e,r:.07,speed:1.5})}
    if(segv&&k===3)R.label([XC,0,ZM+.4],'process killed',{fs:12.5,b:1,dy:14,c:P.bad,a:e})
  }
  const full={cam:[.12,.72],bounds:[[-5,0,-2.2],[5.8,.9,.9]]};
  const st=S3.stage({id:'stg-flt',list:'sx-flt',fig:'Fig. 4 · one access through the 5.10 fault path',cam:full.cam,bounds:full.bounds,aspect:.4,dur:1300,hold:4600,draw,
    // on a phone the long row turns into depth, so the scene fills the narrow card
    view:()=>innerWidth<520?{cam:[.62,.8],bounds:full.bounds}:null,
    margin:w=>w<520?[26,8,22,8]:[30,14,24,14]});
  const M=$('vm-flt-mode');M.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;cur=b.dataset.m;M.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    $('sx-flt').hidden=cur==='segv';$('sx-flt-segv').hidden=cur!=='segv';fill();st.list(cur==='segv'?'sx-flt-segv':'sx-flt')});
  fill();
})();
