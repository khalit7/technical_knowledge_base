// ---- Reading 2: the cost ladder of a crossing (log scale) ----
(function(){
  if(!document.getElementById('rd-sc-chart')||!window.PD)return;
  // (the os.read() stepper became the 3D stage of Fig. 2, 36b_js_sc_sc.js, on 2026-11-07)
  // cost ladder (log scale): root's measurements plus this page's
  const el=document.getElementById('rd-sc-chart');
  const rows=[['function call (root)',1.30,'c3'],['clock_gettime via vDSO (root)',23.57,'c3'],['getppid() via syscall() (here)',PD.sysc.plain_ns,'c1'],['getppid (root)',280.9,'c1'],['os.getppid() from Python (here)',PD.sysc.py_ns,'c1'],['read 1 byte /dev/zero (root)',316.4,'c1'],['pread 4 KiB from page cache (root)',607.3,'c1'],['getppid under strace (here)',PD.sysc.strace_ns,'c2']];
  function chart(){
    const W=RD.width(el),lw=Math.min(230,W*0.45),pw=W-lw-70,h=rows.length*22+30;
    const lg=v=>Math.log10(v),x=v=>lw+pw*(lg(v)-0)/(lg(2e5)-0);
    let b='';[1,10,100,1e3,1e4,1e5].forEach(t=>{b+='<line x1="'+x(t)+'" x2="'+x(t)+'" y1="4" y2="'+(h-22)+'" stroke="var(--line)"/>'+RD.t(x(t),h-8,t>=1e3?(t/1e3)+' µs':t+' ns',{a:'middle',fs:10,fill:'var(--mute)'})});
    rows.forEach((r,i)=>{const y=8+i*22;b+=RD.t(lw-6,y+11,r[0],{a:'end',fs:12})+'<rect x="'+lw+'" y="'+y+'" width="'+Math.max(1,x(r[1])-lw)+'" height="14" rx="2" fill="var(--'+r[2]+')"/>'+RD.t(x(r[1])+4,y+11,r[1]>=1000?(r[1]/1000).toFixed(0)+' µs':r[1].toFixed(r[1]<10?1:0)+' ns',{fs:12})});
    el.innerHTML=RD.svg(W,h,b,'Cost of a function call, a vDSO call and system calls, log scale')+'<div class="small mute">Nanoseconds per call, log scale. "root" figures are medians of 7 repeats from the root page\'s <code>syscall_cost.c</code>; "here" figures from this page\'s <code>sysc.c</code> (median of 5) and Python\'s <code>timeit</code> (best of 5).</div>';
  }
  chart();RD.onRender(chart);RD.onResize(chart);
})();
