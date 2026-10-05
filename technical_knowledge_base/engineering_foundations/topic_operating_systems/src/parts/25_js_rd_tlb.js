// ---- Reading sections 3 and 4: context-switch numbers, cgroup files, address translation (TLB hit, miss, huge page), TLB and fault measurements ----
(function(){
  const R=window.RD_DATA||{};const $=id=>document.getElementById(id);
  // section 3: context switches and the cgroup view
  if(R.ctx&&$('rd-ctx-out')){const c=R.ctx;const S=(R.sim&&R.sim.ctxsw)||'';
    const one=[...S.matchAll(/cpus 1,1 .*per_switch_us ([\d.]+)/g)].map(m=>+m[1]).sort((a,b)=>a-b),two=[...S.matchAll(/cpus 1,2 round_trip_us ([\d.]+)/g)].map(m=>+m[1]).sort((a,b)=>a-b);
    const md=a=>a[Math.floor(a.length/2)];
    $('rd-ctx-out').innerHTML=(one.length?RD.stat('Context switch, one CPU',md(one).toFixed(2)+' &micro;s','median of '+one.length+' ('+one[0].toFixed(2)+' to '+one[one.length-1].toFixed(2)+'), pipe cost subtracted'):'')+
      RD.stat('Pipe round trip, one CPU',(c.pipe_roundtrip_same_cpu_ns/1000).toFixed(1)+' &micro;s','two switches plus four pipe calls')+
      RD.stat('Round trip across 2 CPUs',(c.pipe_roundtrip_two_cpus_ns/1000).toFixed(0)+(two.length?' to '+two[two.length-1].toFixed(0):'')+' &micro;s','waking an idle virtual CPU; varies run to run');
    $('rd-ctx-note').innerHTML='<span class="meas">measured here</span> Two processes bounce one byte over two pipes (the method of lmbench\'s lat_ctx and OSTEP ch. 6\'s homework). The per-switch figure is the {{OS simulators|#t-sim}} tab\'s measurement (<code>src/sim/real/ctxsw.c</code>), which subtracts the cost of the same pipe calls without a switch; the pipe round trips are from <code>src/read/code/ctxswitch.c</code> (median of 5) and the simulators\' runs. Across two CPUs the time is dominated by waking a sleeping CPU, which inside a virtual machine means waking a virtual CPU through the hypervisor: it ranged from '+(c.pipe_roundtrip_two_cpus_ns/1000).toFixed(0)+' to '+(two.length?two[two.length-1].toFixed(0):'?')+' &micro;s across runs here, and is far less on a bare-metal server. These are this VM\'s numbers, not a general constant.';RD.tabLinks($('rd-ctx-note'))}
  if(R.container&&$('rd-cpu-max')){const L=R.container.split('\n');
    $('rd-cpu-max').textContent='$ cat /sys/fs/cgroup/cpu.max\n'+L.find(l=>l.startsWith('cpu.max:')).slice(9)+'\n$ grep nr_ /sys/fs/cgroup/cpu.stat\n'+L.filter(l=>/^nr_/.test(l)).join('\n');
    $('rd-cpu-count').textContent='$ python3 -c "import os; print(os.cpu_count(), len(os.sched_getaffinity(0)))"\n'+L.find(l=>l.startsWith('cpu_count')).replace(/cpu_count (\d+) affinity (\d+)/,'$1 $2')+'\n$ python3 -c "import torch; print(torch.get_num_threads())"\n'+L.find(l=>l.startsWith('torch.get_num_threads')).split(' ').pop()}
  if(R.vm&&$('rd-vm-set')){$('rd-vm-set').textContent=R.vm.split('\n').filter(l=>/overcommit|transparent|swappiness|^Mem:|^Swap:|total|available:|PAGESIZE|^4096/.test(l)).join('\n')}

  // section 4: one real address through the MMU
  const svgEl=$('rd-tlb-svg');if(!svgEl||!R.maps)return;
  const line=R.maps.before_fork_main.sample.find(l=>l.indexOf('train.bin')>0)||'';
  const vaHex=line.split('-')[0]||'ffff81fd2000';const VA=BigInt('0x'+vaHex);
  const fld=(lo,n)=>Number((VA>>BigInt(lo))&((1n<<BigInt(n))-1n));
  const IDX=[fld(39,9),fld(30,9),fld(21,9),fld(12,9)],OFF=fld(0,12),OFF2=fld(0,21);
  const STEPS={
    hit:[{t:'A load from the dataset',p:'The program reads the first byte of train.bin at virtual address 0x'+vaHex+'. The MMU must turn it into a physical address before the cache or memory can be asked.',show:0},
      {t:'Split the address',p:'Low 12 bits: the offset inside a 4 KiB page ('+OFF+'). The 36 bits above them: the virtual page number, four 9-bit indexes ('+IDX.join(', ')+').',show:1},
      {t:'Look it up in the TLB',p:'The TLB holds recent virtual-page to physical-frame translations. Hit: the frame number comes back in about a cycle, with its permission bits checked at the same time.',show:2,tlb:'hit'},
      {t:'Physical address',p:'Frame number plus the unchanged offset gives the physical address; the load goes to the cache. Extra memory accesses for translation: none.',show:4,tlb:'hit'}],
    miss:[{t:'A load from the dataset',p:'Same address, but its translation is not in the TLB (first touch, or evicted by others).',show:0},
      {t:'Split the address',p:'Offset '+OFF+'; indexes '+IDX.join(', ')+' for the four levels of the page-table tree.',show:1},
      {t:'TLB miss',p:'No entry. The hardware page-table walker (on ARM64 and x86-64 the walk is done by hardware, not by the kernel) starts at the table the kernel installed for this process.',show:2,tlb:'miss'},
      {t:'Level 0: index '+IDX[0],p:'One memory read: entry '+IDX[0]+' of the top table points to a level-1 table.',show:3,lv:1},
      {t:'Level 1: index '+IDX[1],p:'A second dependent read. Each level must finish before the next address is known.',show:3,lv:2},
      {t:'Level 2: index '+IDX[2],p:'A third read.',show:3,lv:3},
      {t:'Level 3: index '+IDX[3],p:'A fourth read gives the page-table entry itself: the physical frame and permissions. If it is not valid, this is a page fault and the kernel takes over.',show:3,lv:4},
      {t:'Fill the TLB, finish the load',p:'The translation is cached in the TLB and the load proceeds: four extra dependent memory reads (fewer when the table entries are in the CPU caches). Inside a virtual machine each of those table addresses must itself be translated by the hypervisor\'s tables, so a cold walk can take up to 24 reads (two-dimensional walk, Bhargava et al., ASPLOS 2008).',show:4,lv:4,tlb:'fill'}],
    huge:[{t:'The same load, in a 2 MiB huge page',p:'If the data sits in a 2 MiB page, the low 21 bits are the offset ('+OFF2+') and only three 9-bit indexes remain.',show:1,huge:1},
      {t:'TLB miss',p:'A miss still walks, but one TLB entry now covers 2 MiB instead of 4 KiB: 512 times the reach, so misses are rarer.',show:2,tlb:'miss',huge:1},
      {t:'Level 0, 1, 2',p:'Three reads; the level-2 entry is a block entry pointing straight at a 2 MiB physical region. Level 3 is skipped.',show:3,lv:3,huge:1},
      {t:'Fill the TLB, finish the load',p:'Three extra reads instead of four, and the next 511 small-page-sized neighbours hit the same TLB entry. The measurement below shows the effect.',show:4,lv:3,tlb:'fill',huge:1}]};
  let mode='hit';
  function draw(i){const S=STEPS[mode],st=S[i];const W=RD.width(svgEl),H=196,huge=!!st.huge;
    let b='';const bits=huge?[[47,39,'L0'],[38,30,'L1'],[29,21,'L2'],[20,0,'offset']]:[[47,39,'L0'],[38,30,'L1'],[29,21,'L2'],[20,12,'L3'],[11,0,'offset']];
    const vals=huge?[IDX[0],IDX[1],IDX[2],OFF2]:[IDX[0],IDX[1],IDX[2],IDX[3],OFF];
    const x0=6,bw=W-12,tot=48;let x=x0;
    b+=RD.t(x0,13,'virtual address 0x'+vaHex,{fs:11,w:600});
    bits.forEach((f,k)=>{const w=bw*(f[0]-f[1]+1)/tot;const on=st.show>=1;const cur=st.lv&&k===st.lv-1;
      b+='<rect x="'+x+'" y="20" width="'+(w-2)+'" height="30" rx="4" fill="'+(f[2]==='offset'?'var(--soft)':cur?'var(--acc2)':'var(--bg)')+'" stroke="'+(cur?'var(--acc)':'var(--line)')+'" stroke-width="'+(cur?2:1)+'"/>';
      b+=RD.t(x+w/2,33,f[2],{a:'middle',fs:10,fill:'var(--mute)'})+RD.t(x+w/2,46,on?String(vals[k]):'',{a:'middle',fs:11,w:600});x+=w});
    // TLB box and walk boxes
    const ty=66;const tc=st.tlb==='hit'||st.tlb==='fill'?'var(--good)':st.tlb==='miss'?'var(--bad)':'var(--line)';
    b+='<rect x="6" y="'+ty+'" width="'+Math.min(150,W*.3)+'" height="44" rx="6" fill="var(--bg)" stroke="'+tc+'" stroke-width="'+(st.tlb?2:1)+'"/>'+RD.t(12,ty+17,'TLB',{fs:11,w:600})+RD.t(12,ty+33,st.tlb==='hit'?'hit':st.tlb==='miss'?'miss':st.tlb==='fill'?'filled':'',{fs:11,fill:tc});
    const levels=huge?3:4;const lx=6+Math.min(150,W*.3)+10,lw=(W-lx-6)/4;
    for(let k=0;k<levels;k++){const on=st.lv&&k<st.lv;const xx=lx+k*lw;
      b+='<rect x="'+xx+'" y="'+ty+'" width="'+(lw-6)+'" height="44" rx="6" fill="'+(on?'var(--acc2)':'var(--bg)')+'" stroke="'+(on?'var(--acc)':'var(--line)')+'"/>'+RD.t(xx+(lw-6)/2,ty+17,'table L'+k,{a:'middle',fs:10.5})+RD.t(xx+(lw-6)/2,ty+33,on?'read '+(k+1):'',{a:'middle',fs:10,fill:'var(--mute)'})}
    if(huge)b+=RD.t(lx+3*lw+(lw-6)/2,ty+28,'skipped',{a:'middle',fs:10,fill:'var(--mute)'});
    const py=128;b+='<rect x="6" y="'+py+'" width="'+(W-12)+'" height="44" rx="6" fill="'+(st.show>=4?'var(--soft)':'var(--bg)')+'" stroke="var(--line)"/>'+RD.t(14,py+18,'physical address = frame number + offset',{fs:11})+RD.t(14,py+34,st.show>=4?'ready: the load goes to the cache and memory':'',{fs:10.5,fill:'var(--mute)'});
    svgEl.innerHTML=RD.svg(W,H-16,b,'Address translation');
    $('rd-tlb-cap').innerHTML='<div class="t">Step '+(i+1)+' of '+S.length+': '+st.t+'</div><p>'+st.p+'</p>';
    const reads=st.lv||0;$('rd-tlb-cnt').innerHTML=RD.stat('Extra memory reads',String(reads),'for translation, so far')+RD.stat('Bytes one TLB entry covers',huge?'2 MiB':'4 KiB','')+RD.stat('Page size',huge?'2 MiB (huge)':'4 KiB','')}
  const A=RD.anim({card:'rd-tlb-card',ctl:'rd-tlb-ctl',n:STEPS.hit.length,draw:draw,ms:2000,label:'Step of the translation'});
  RD.seg($('rd-tlb-mode'),m=>{mode=m;A.reset(STEPS[m].length);A.play()});
  // measured TLB curves
  function chart(){const T=R.tlb,el=$('rd-tlb-chart');if(!T||!el)return;const W=RD.width(el),H=230,ml=40,mr=10,mt=10,mb=40;
    const xs=T.map(r=>Math.log2(r.lines)),x0=Math.min(...xs),x1=Math.max(...xs),ymax=Math.ceil(Math.max(...T.map(r=>r.spread))/10)*10;
    const X=v=>ml+(W-ml-mr)*(Math.log2(v)-x0)/(x1-x0),Y=v=>mt+(H-mt-mb)*(1-v/ymax);
    let b='';for(let y=0;y<=ymax;y+=ymax/4){b+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(y)+'" y2="'+Y(y)+'" stroke="var(--line)"/>'+RD.t(ml-4,Y(y)+4,String(Math.round(y)),{a:'end',fs:10,fill:'var(--mute)'})}
    T.forEach((r,k)=>{if(W<520&&k%2)return;b+=RD.t(X(r.lines),H-mb+14,r.lines>=1024?(r.lines/1024)+'K':String(r.lines),{a:'middle',fs:10,fill:'var(--mute)'})});
    b+=RD.t(ml,H-6,(W<520?'cache lines visited, log scale':'cache lines visited (each in its own page when spread), log scale'),{fs:10,fill:'var(--mute)'})+RD.t(4,mt+4,'ns',{fs:10,fill:'var(--mute)'});
    [['packed','var(--c3)'],['spread','var(--c2)'],['thp','var(--c1)']].forEach(s=>{b+='<polyline fill="none" stroke="'+s[1]+'" stroke-width="2" points="'+T.map(r=>X(r.lines)+','+Y(r[s[0]])).join(' ')+'"/>'+T.map(r=>'<circle cx="'+X(r.lines)+'" cy="'+Y(r[s[0]])+'" r="2.5" fill="'+s[1]+'"><title>'+r.lines+' lines: '+r[s[0]]+' ns</title></circle>').join('')});
    el.innerHTML=RD.svg(W,H,b,'Nanoseconds per access against lines visited');
    $('rd-tlb-leg').innerHTML='<span style="--sw:var(--c3)">packed (few pages)</span><span style="--sw:var(--c2)">spread, 4 KiB pages</span><span style="--sw:var(--c1)">spread, 2 MiB huge pages</span>';
    const r=T.find(q=>q.lines===4096)||T[T.length-1];
    $('rd-tlb-note').innerHTML='<span class="meas">measured here</span> At '+r.lines+' lines: '+r.packed+' ns packed, '+r.spread+' ns spread over 4 KiB pages, '+r.thp+' ns spread over huge pages (AnonHugePages confirmed '+(r.thp_kb/1024)+' MiB in smaps_rollup). The '+(r.spread-r.packed).toFixed(0)+' ns gap is the price of a TLB miss on this machine, and huge pages remove most of it. Median of 5 runs of 20 million dependent loads, <code>src/read/code/tlb.c</code>, in a VM, where walks are two-dimensional and dearer than on bare metal. perf\'s TLB-miss counters are not available inside this VM ("No permission to enable dTLB-load-misses event"), so the attribution to the TLB is by construction of the experiment, not by counter.'}
  chart();RD.onRender(chart);RD.onResize(()=>{A.redraw();chart();faults()});
  // faults bars
  function faults(){const F=R.faults,el=$('rd-flt');if(!F||!el)return;const med=a=>a.map(x=>x).sort((p,q)=>p.ms-q.ms)[1];
    const rows=[['Dataset, cold (evicted from page cache)',med(F.cold),'var(--bad)'],['Dataset, warm (in page cache)',med(F.warm),'var(--good)'],['64 MiB fresh private memory',med(F.anon),'var(--c1)'],['64 MiB fresh shared memory (shmem)',med(F.anon_shared),'var(--c4)']];
    const mx=Math.max(...rows.map(r=>r[1].ms));
    el.innerHTML='<div class="tw"><table class="tbl-sm"><thead><tr><th>Touch every page of</th><th class="num">pages</th><th class="num">minor</th><th class="num">major</th><th class="num">time</th><th style="min-width:80px"></th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+r[0]+'</td><td class="num">'+r[1].pages+'</td><td class="num">'+r[1].minor+'</td><td class="num">'+r[1].major+'</td><td class="num">'+r[1].ms.toFixed(2)+' ms</td><td><div class="bars"><div class="track"><div class="fill" style="width:'+(100*r[1].ms/mx)+'%;background:'+r[2]+'"></div></div></div></td></tr>').join('')+'</tbody></table></div>';
    $('rd-flt-note').innerHTML='<span class="meas">measured here</span> <code>src/read/code/faults.py</code>, median of 3; faults from getrusage. Three things to notice. The warm file needs only '+med(F.warm).minor+' minor faults for '+med(F.warm).pages+' pages because the kernel maps 16 neighbouring cached pages per fault ("fault-around": fault_around_bytes is 65536, mm/memory.c line 3875 at v5.10). The cold file needs only '+med(F.cold).major+' major faults because readahead pulls in neighbours with each read. And fresh shared memory is counted as major faults here although no device is read: Linux counts a fault as major if it needed I/O or had to be retried (mm/memory.c line 4552 at v5.10); which applied was not traced. Cold reads are '+Math.round(med(F.cold).ms/med(F.warm).ms)+'x slower than warm even on this VM\'s fast virtual disk.'}
  faults();
})();
