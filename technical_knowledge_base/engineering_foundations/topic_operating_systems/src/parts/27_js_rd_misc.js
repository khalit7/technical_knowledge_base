// ---- Reading sections 5, 6, 8: recorded outputs shown verbatim (from RD_DATA, generated from src/read/code/out/) ----
(function(){
  const R=window.RD_DATA||{};const $=id=>document.getElementById(id);const set=(id,s)=>{const e=$(id);if(e&&s!=null)e.textContent=s};
  if(R.malloc){const L=R.malloc.split('\n');const i=L.findIndex(l=>l.indexOf('--- malloc(64')>=0);set('rd-malloc','$ strace -e trace=brk,mmap,munmap,write ./malloc_sizes\n...\n'+L.slice(Math.max(0,i)).join('\n').trim())}
  if(R.counter)set('rd-counter','$ ./counter\n'+R.counter.trim());
  if(R.futex){set('rd-futex','$ strace -f -c -e trace=futex ./counter mutex\n'+R.futex.split('\n').filter(l=>!/attached/.test(l)).join('\n').trim());
    const m=R.futex.match(/\n\s*[\d.]+\s+[\d.]+\s+\d+\s+(\d+)\s+(\d+)\s+futex/);
    if(m&&$('rd-futex-note'))$('rd-futex-note').innerHTML='<span class="meas">measured here</span> 20,000,000 lock and unlock pairs under heavy contention entered the kernel '+(+m[1]).toLocaleString('en-US')+' times: '+(100*m[1]/4e7).toFixed(3)+'% of the 40 million lock operations. (Under strace each system call is much slower than normal, so these timings are not the program\'s real speed.)'}
  if(R.epoll)set('rd-epoll','$ strace -f -e trace=epoll_create1,epoll_ctl,epoll_wait,epoll_pwait python3 asyncio_epoll.py\n'+R.epoll.split('\n').slice(0,14).join('\n')+'\n...');
  const S=R.sim||{};const H=(id,h)=>{const e=$(id);if(e&&h){e.innerHTML=h;RD.tabLinks(e)}};
  if(S.nice_share){const m=S.nice_share.match(/nice 0 vs nice 5 .*cpu_s ([\d.]+) ([\d.]+) share_nice0 ([\d.]+)/);
    if(m){const w=1024/(1024+335);H('rd-nice','<span class="meas">measured here</span> by the {{OS simulators|#t-sim}} tab: two CPU-bound threads pinned to one CPU for 10 s, nice 0 against nice 5, got '+(100*m[3]).toFixed(2)+'% and '+(100-100*m[3]).toFixed(2)+'% of it; the weight table predicts 1024 / (1024 + 335) = '+(100*w).toFixed(2)+'% (<code>src/sim/real/nice_share.c</code>).')}}
  if(S.cow){const m=S.cow.match(/list\s+iterate .*= +(\d+) pages/),n=[...S.cow.matchAll(/numpy \w+ .*= +(\d+) pages/g)].map(x=>+x[1]).sort((a,b)=>a-b);
    if(m)H('rd-cow','<span class="meas">measured here</span> by the {{OS simulators|#t-sim}} tab: a forked child that only iterated over a list of one million Python ints copied '+(+m[1]).toLocaleString('en-US')+' pages ('+(m[1]*4/1024).toFixed(1)+' MiB); reading the same numbers from a NumPy array copied '+n[0]+' to '+n[n.length-1]+' pages (<code>src/sim/real/cow.py</code>).')}
  if(S.race_2cpu){const l=[...S.race_2cpu.matchAll(/mode none .*lost (\d+)/g)].map(x=>+x[1]).sort((a,b)=>a-b),one=S.race_1cpu?[...S.race_1cpu.matchAll(/mode none .*lost (\d+)/g)].map(x=>+x[1]):[];
    if(l.length)H('rd-race','the {{OS simulators|#t-sim}} tab\'s runs lost '+(l[0]/1e6).toFixed(1)+' to '+(l[l.length-1]/1e6).toFixed(1)+' million on two CPUs'+(one.length&&Math.max(...one)===0?' and none when both threads shared one CPU':''))}
  if(S.tlb&&$('rd-tlb-sim')){const a=S.tlb.match(/4k pages\s+4096 ns_per_access ([\d.]+)/),b=S.tlb.match(/huge pages\s+4096 ns_per_access ([\d.]+)/),w=S.tlb.match(/row_major_ns ([\d.]+) col_major_ns ([\d.]+) ratio ([\d.]+)/);
    if(a&&b)H('rd-tlb-sim','A second, independent measurement in the {{OS simulators|#t-sim}} tab (one access per page, 4,096 pages, <code>src/sim/real/tlb.c</code>): '+a[1]+' ns per access with 4 KiB pages against '+b[1]+' ns with 2 MiB pages'+(w?'; and walking a 2-D array by columns instead of rows was '+w[3]+'x slower':'')+'. Different designs, same conclusion.')}
  if(R.container)set('rd-ctr','$ sh container_view.sh\n'+R.container.trim());
})();
