// ---- Reading tab: measured charts, tables and inline numbers (all from window.VM_DATA) ----
(function(){
  const D=window.VM_DATA,$=id=>document.getElementById(id),esc=RD.esc;
  const fmt=(x,d)=>Number(x).toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  const set=(id,v)=>{const e=$(id);if(e)e.textContent=v};
  // HTML bar rows: rows [{n (label), v (value), c (colour), t (text)}]; log: logarithmic scale
  function bars(id,rows,o){o=o||{};const el=$(id);if(!el)return;
    const max=o.max||Math.max(...rows.map(r=>r.v));const lg=!!o.log,lo=o.lo||1;
    const w=v=>lg?Math.max(1,100*Math.log10(Math.max(v,lo)/lo)/Math.log10(max/lo)):Math.max(0.5,100*v/max);
    el.innerHTML='<div class="bars">'+rows.map(r=>'<div class="row'+(r.hl?' hl':'')+'"><div class="nm" title="'+esc(r.n)+'">'+r.n+'</div><div class="track"><div class="fill" style="width:'+w(r.v).toFixed(1)+'%;background:'+(r.c||'var(--c1)')+'"></div></div><div class="val">'+r.t+'</div></div>').join('')+'</div>'+(o.cap?'<p class="small mute" style="margin:4px 0 0">'+o.cap+'</p>':'');}
  window.VMB=bars;

  // section 1: the job's address space (root's recording)
  const T=D.root_maps.totals,names={anon:'anonymous (allocators, 1 GiB reservation)',anon_res:'anonymous, resident-heavy',torch:'torch libraries (.so)',heap:'[heap] (brk)',numpy:'numpy libraries',clib:'C libraries',dataset:'dataset file (mmap)',exe:'python3.11 executable',pyext:'Python extension modules',file:'other files',stack:'[stack]',shm:'/dev/shm (batches, semaphores)',vdso:'[vdso] [vvar]'};
  const as=Object.keys(T).map(k=>({k,n:names[k]||k,cnt:T[k][0],kb:T[k][1]})).sort((a,b)=>b.kb-a.kb);
  bars('vm-as',as.map((r,i)=>({n:r.n,v:r.kb,c:'var(--c'+(1+i%6)+')',t:(r.kb>=10240?fmt(r.kb/1024)+' MiB':fmt(r.kb)+' KiB')})),{log:true,lo:8,cap:'Address space by kind of mapping (sum of VMA sizes, log scale). Reserved, not necessarily resident.'});
  set('vm-as-note',D.root_maps.n+' VMAs in the main process; total '+fmt(as.reduce((s,r)=>s+r.kb,0)/1024)+' MiB of address space. Counts per kind: '+as.map(r=>r.k+' '+r.cnt).join(', ')+'.');
  { const e=$('vm-maps');if(e)e.textContent=D.root_maps.sample.filter((l,i)=>i<10||/stack|vvar/.test(l)).join('\n'); }

  // section 2: the bit split of the dataset address, arm64 4 KiB
  if(window.VMADDR){ const e=$('vm-split');if(e)VMADDR.splitSvg(e,'ffff81fd2000','arm64-4k'); }
  set('vm-macpg',fmt(D.macos_pagesize));set('vm-pte4k',fmt(D.pte['4k']));

  // section 3: shootdowns
  bars('vm-shoot',D.shoot.map(r=>({n:r.threads+' other thread'+(r.threads===1?'':'s')+' running',v:r.ns,c:'var(--c1)',t:fmt(r.ns)+' ns'})).concat([{n:'page never touched (nothing to flush)',v:D.shoot_untouched_ns,c:'var(--c3)',t:fmt(D.shoot_untouched_ns)+' ns'}]),{max:2200,cap:'Time per mprotect call that changes a resident page (so the TLB entry must be invalidated everywhere), with 0 to 3 other threads of the process spinning on other CPUs. arm64, 4 CPUs of the VM, best of 5 runs of 40,000 calls.'});
  set('vm-shoot-note','Flat: on arm64 the broadcast TLBI costs the same whether or not other CPUs hold the address space. The same program on a multi-socket x86 server would grow with the CPU count (not run here). Raw: src/raw/vmlab.txt.');

  // section 4: fault table and inline numbers
  const F=D.first_write,Z=D.zero_page,RF=D.root_faults;
  const med=a=>{const s=a.map(x=>x.ms).sort((x,y)=>x-y);return s[(s.length-1)>>1]};
  const coldRun=RF.cold.slice().sort((a,b)=>a.ms-b.ms)[1],warmMs=med(RF.warm);
  const rows=[['First write, fresh anonymous memory (64 MiB)',F['4k'].faults,0,F['4k'].ms_median,'do_anonymous_page'],
    ['First read, fresh anonymous (shared zero page)',Z.read_faults,0,Z.read_ms,'do_anonymous_page, zero page'],
    ['Write after that read',Z.write_faults,0,Z.write_ms,'do_wp_page (zero page is read-only)'],
    ['Write after fork (copy-on-write), 256 MiB',D.cow_write['4k'].faults,0,D.cow_write['4k'].ms,'do_wp_page, wp_page_copy'],
    ['Read of the dataset, warm (root, 8 MiB)',RF.warm[0].minor,0,warmMs,'do_read_fault + fault-around'],
    ['Read of the dataset, cold (root, 8 MiB)',coldRun.minor,coldRun.major,coldRun.ms,'filemap_fault, readahead, I/O']];
  { const e=$('vm-flt-tbl');if(e)e.innerHTML='<thead><tr><th>Case <span class="meas">measured</span></th><th class="num">minor</th><th class="num">major</th><th class="num">ms</th><th class="num">us / fault</th><th>kernel path</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+r[0]+'</td><td class="num">'+fmt(r[1])+'</td><td class="num">'+fmt(r[2])+'</td><td class="num">'+fmt(r[3],2)+'</td><td class="num">'+fmt(r[3]*1000/(r[1]+r[2]),2)+'</td><td><code>'+r[4]+'</code></td></tr>').join('')+'</tbody>'; }
  set('vm-zr',fmt(Z.read_faults));set('vm-pop',fmt(D.populate.mmap_ms,1));set('vm-pop2',fmt(F['4k'].ms_median,1));

  // section 5: random rows and loading weights
  const R=D.rows,useful=20000*1028/1048576;
  const rr=[['pread, cold','pread_cold','var(--c2)'],['mmap, cold','mmap_cold','var(--c1)'],['mmap RANDOM, cold','mmap_random_cold','var(--c4)'],['pread, warm','pread_warm','var(--c2)'],['mmap, warm','mmap_warm','var(--c1)'],['mmap RANDOM, warm','mmap_random_warm','var(--c4)']];
  { const e=$('vm-rows');if(e){e.innerHTML='<div id="vm-rows-a"></div><div id="vm-rows-b" style="margin-top:10px"></div>';
    bars('vm-rows-a',rr.map(r=>({n:r[0],v:R[r[1]].us,c:r[2],t:fmt(R[r[1]].us,1)+' us'})),{cap:'Microseconds per row (median of 2 runs).'});
    bars('vm-rows-b',rr.slice(0,3).map(r=>({n:r[0],v:R[r[1]].read_mib,c:r[2],t:fmt(R[r[1]].read_mib,0)+' MiB'})),{max:260,cap:'Read from storage for the cold runs; the 20,000 rows hold '+fmt(useful,1)+' MiB. Amplification: '+rr.slice(0,3).map(r=>r[0]+' '+fmt(R[r[1]].read_mib/useful,1)+'x').join(', ')+'.'});}}
  set('vm-rows-note','Major faults, cold: mmap '+fmt(R.mmap_cold.majflt)+', mmap + MADV_RANDOM '+fmt(R.mmap_random_cold.majflt)+' (pread reads count as I/O, not faults). "mmap RANDOM" is the mapping after madvise(MADV_RANDOM). Its faster warm time was not investigated; warm times are dominated by Python indexing. Cold here means evicted from the VM\'s page cache; the VM\'s disk is itself a file cached by macOS, so a real disk is slower. Raw: src/raw/mmapread.txt.');
  { const e=$('vm-load');if(e)e.innerHTML='<thead><tr><th>Load 256 MiB, cold <span class="meas">measured</span></th><th class="num">call returns</th><th class="num">RSS after return</th><th class="num">then read every tensor</th><th class="num">RSS after reading</th></tr></thead><tbody>'+D.load.map(l=>'<tr><td><code>'+esc(l.name)+'</code></td><td class="num">'+fmt(l.return_ms,1)+' ms</td><td class="num">'+fmt(l.rss_return,0)+' MiB</td><td class="num">'+fmt(l.read_ms,1)+' ms</td><td class="num">'+fmt(l.rss_all,0)+' MiB</td></tr>').join('')+'</tbody>'; }

  // section 6
  set('vm-minfree',fmt(+D.env.min_free_kbytes));

  // section 7: fork and copy-on-write
  const FK=D.fork,fk=(k,m)=>FK.find(x=>x.kind===k&&x.mib===m).us;
  bars('vm-fork',[0,256,1024].flatMap(m=>[{n:m+' MiB resident, 4 KiB pages',v:fk('4k',m),c:'var(--c2)',t:(fk('4k',m)>=1000?fmt(fk('4k',m)/1000,1)+' ms':fmt(fk('4k',m))+' us')},{n:m+' MiB resident, THP',v:fk('thp',m),c:'var(--c3)',t:(fk('thp',m)>=1000?fmt(fk('thp',m)/1000,1)+' ms':fmt(fk('thp',m))+' us')}]),{cap:'fork + child exit + wait, best of 5.'});
  set('vm-fork-note','4 KiB pages: ('+fmt(fk('4k',1024))+' - '+fmt(fk('4k',0))+') us / 1,024 MiB = '+fmt((fk('4k',1024)-fk('4k',0))/1024,1)+' us per resident MiB. THP at 1 GiB: '+fmt(fk('4k',1024)/fk('thp',1024),1)+'x faster. Raw: src/raw/vmlab.txt.');
  set('vm-cow4k',fmt(D.cow_write['4k'].ns_per_page));set('vm-cowthp',fmt(D.cow_write.thp.ns_per_page));
  const G=D.cow_gc;
  bars('vm-cowgc',[['child reads every list (reference counts)','touch','var(--c2)'],['child runs gc.collect() only','collect','var(--c2)'],['gc.freeze() in the parent, then gc.collect()','collect_frozen','var(--c3)'],['same data as one NumPy array, child sums it','numpy','var(--c3)']].map(r=>({n:r[0],v:G[r[1]],c:r[2],t:fmt(G[r[1]])+' pages'})),{max:17000});

  // section 8
  set('vm-k1',fmt(+D.env.pages_to_scan));set('vm-k2',D.env.max_ptes_none);
  set('vm-bl4',fmt(D.bloat['4k']));set('vm-blh',fmt(D.bloat.thp));set('vm-blr',fmt(D.bloat.thp/D.bloat['4k']));
  set('vm-thp0',fmt(F.thp.ms_runs[0],1));set('vm-thp2',fmt(F.thp.ms_runs[2],1));set('vm-ptethp',fmt(D.pte.thp));

  // sections 9, 10
  { const e=$('vm-mlock');if(e)e.textContent=D.mlock_txt; const c=$('vm-commit');if(c)c.textContent=D.commit_txt; }
  set('vm-cl',fmt(D.commit.CommitLimit_kb));

  // section 12: scenario summary and oom_score
  const CG=D.cg,mib=k=>fmt(k/1024);
  const peak=(s,i)=>Math.max(...CG[s].samples.map(x=>x[i]));
  const sc=[['pagecache','Write then read a 768 MiB file','page cache filled to the limit and was recycled'],['anon_oom','A process grows 32 MiB at a time, no swap','page cache dropped first, then the process was killed'],['swap','A process needs 640 MiB, swap allowed','alive, ~'+mib((a=>a[a.length>>1])(CG.swap.samples.filter(x=>x[2]>300*1024).map(x=>x[5]).sort((p,q)=>p-q)))+' MiB in swap (median while walking), passes of 4 to 5 s'],['shm','320 MiB in /dev/shm, then a 320 MiB process','killed; the /dev/shm file outlived it']];
  { const e=$('vm-cgsum');if(e)e.innerHTML='<thead><tr><th>Run</th><th class="num">peak anon</th><th class="num">peak file</th><th class="num">max events</th><th class="num">oom_kill</th><th>Outcome</th></tr></thead><tbody>'+sc.map(r=>'<tr><td><a href="#" data-tab="t-cg" data-sc="'+r[0]+'">'+r[1]+'</a></td><td class="num">'+mib(peak(r[0],2))+' MiB</td><td class="num">'+mib(peak(r[0],3))+' MiB</td><td class="num">'+fmt(CG[r[0]].events.max)+'</td><td class="num">'+CG[r[0]].events.oom_kill+'</td><td>'+r[2]+'</td></tr>').join('')+'</tbody>';
    if(e)e.addEventListener('click',ev=>{const a=ev.target.closest('a[data-sc]');if(!a)return;ev.preventDefault();if(window.VMCG)VMCG.pick(a.dataset.sc);const b=document.querySelector('#tabs button[data-t="t-cg"]');if(b){b.click();$('tabs').scrollIntoView({block:'start'})}}); }
  const O=D.oom,tot=Math.floor(O.memtotal_kb/4)+Math.floor(O.swaptotal_kb/4);
  const memcgTot=262144;
  { const e=$('vm-oom');if(e)e.innerHTML='<thead><tr><th>Process</th><th class="num">rss pages</th><th class="num">page tables</th><th class="num">adj</th><th class="num">formula</th><th class="num">kernel</th><th class="num">points in the 1 GiB cgroup OOM</th></tr></thead><tbody>'+O.procs.map((p,i)=>{
      const base=p.rss_pages+Math.floor(p.vmswap_kb/4)+Math.floor(p.vmpte_kb*1024/4096);const bad=base+p.oom_score_adj*Math.floor(tot/1000);
      const pred=Math.floor((1000+Math.floor(bad*1000/tot))*2/3);const cgp=base+p.oom_score_adj*Math.floor(memcgTot/1000);
      return '<tr><td>'+['A, holds 100 MiB','B, holds 300 MiB','C, holds 200 MiB','D, holds 100 MiB'][i]+'</td><td class="num">'+fmt(p.rss_pages)+'</td><td class="num">'+fmt(p.vmpte_kb)+' KiB</td><td class="num">'+p.oom_score_adj+'</td><td class="num">'+pred+'</td><td class="num">'+p.oom_score+(pred===p.oom_score?' <span class="pill ok">=</span>':' <span class="pill bad">!=</span>')+'</td><td class="num">'+fmt(cgp)+'</td></tr>'}).join('')+'</tbody>'; }
  set('vm-oom-note','totalpages for /proc = MemTotal + SwapTotal = '+fmt(tot)+' pages of the whole VM, so the 1 GiB limit plays no part in oom_score, and adj 500 adds 500 x '+fmt(Math.floor(tot/1000))+' points. In the cgroup OOM, totalpages = 262,144 (1 GiB, no swap): adj 500 adds only 131,000, but that is still half the limit, so C would be chosen before B, which holds more. D tried to set -500 and was refused. Raw: src/raw/oomscore.txt.');

  // section 13: RSS, PSS, USS of the job
  const J=D.job;
  { const e=$('vm-pss');if(e){const mx=Math.max(...J.map(p=>p.rss));
    const seg=(p)=>[['Shared_Clean',p.sc,'var(--c6)'],['Shared_Dirty',p.sd,'var(--c1)'],['Private_Clean',p.pc,'var(--c5)'],['Private_Dirty',p.pd,'var(--c2)']];
    e.innerHTML='<div class="leg">'+seg(J[0]).map(s=>'<span style="--sw:'+s[2]+'">'+s[0]+'</span>').join('')+'</div>'+J.map((p,i)=>'<div class="split" style="grid-template-columns:minmax(0,6.5em) minmax(0,1fr)"><div class="small"><b>'+(i?'worker '+i:'main')+'</b></div><div><div class="sb" style="width:'+(100*p.rss/mx).toFixed(1)+'%">'+seg(p).map(s=>'<span title="'+s[0]+' '+mib(s[1])+' MiB" style="width:'+(100*s[1]/p.rss).toFixed(1)+'%;background:'+s[2]+'"></span>').join('')+'</div><div class="small mute">RSS '+mib(p.rss)+' MiB, PSS '+mib(p.pss)+' MiB, USS '+mib(p.uss)+' MiB</div></div></div>').join('');}}
  const sum=k=>J.reduce((s,p)=>s+p[k],0);
  set('vm-pss-note','Sums over the three processes: RSS '+mib(sum('rss'))+' MiB, PSS '+mib(sum('pss'))+' MiB, USS '+mib(sum('uss'))+' MiB. Bar length is RSS. Sampled 1.8 s into a 300-step run with 2 fork-started workers. Raw: src/raw/job_mem.txt.');
})();
