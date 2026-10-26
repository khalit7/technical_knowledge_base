// ---- Sections 1 and 2: the GIL bars and prediction, the event-loop prediction, the fan-out bars (data: PA from src/pa/outputs) ----
(function(){
  const $=id=>document.getElementById(id);if(!window.PA||!window.CGU)return;
  const G=PA.k1.gil,F=PA.k1.ft,val=(rows,kind,how)=>rows.find(r=>r[0]===kind&&r[1]===how)[2];
  // prediction: four threads on CPU-bound Python, default build
  const s=val(G,'CPU','serial'),t=val(G,'CPU','4 threads'),r=t/s;
  CGU.drill($('cg-pr-gil'),'Predict: on the default 3.14 build, how long do four threads take for the CPU job, against '+s.toFixed(2)+' s serially?',
    [{t:'About a quarter of the time (four cores)',right:r<0.4},{t:'About half',right:r>=0.4&&r<0.8},{t:'About the same as serial',right:r>=0.8&&r<1.25},{t:'Much slower than serial',right:r>=1.25}],
    'Measured: '+t.toFixed(3)+' s on four threads against '+s.toFixed(3)+' s serially. The bars below have every case on both builds.');
  // bars: both builds
  const rows=[];
  [['gil','3.14 (GIL)','var(--c2)'],['ft','3.14t (no GIL)','var(--acc)']].forEach(([k,lab,c])=>PA.k1[k].forEach(x=>rows.push({name:x[0]+' '+x[1]+', '+lab,v:x[2],label:x[2].toFixed(2)+' s',col:c,cpu:x[0]==='CPU'})));
  rows.sort((a,b)=>(a.cpu?0:1)-(b.cpu?0:1));
  CGU.bars($('cg-gil-bars'),rows,null,'Wall-clock seconds, best of 3, from <code>k1_gil.py</code> on CPython 3.14.8 and 3.14.8t (Apple M1 Pro, load average near 8); shorter is better.');

  // prediction: the blocked loop
  const ev=PA.loop.gathered_blocking.events,aRes=ev.find(e=>e[0]==='A'&&e[1]==='resume')[2];
  CGU.drill($('cg-pr-loop'),'Predict, for mode 3 below: A\'s 100 ms timer is due while B is inside <code>time.sleep(0.2)</code>. When does A resume?',
    [{t:'At 100 ms, on time',right:aRes<150},{t:'At about 200 ms, when B\'s sleep returns',right:aRes>=150&&aRes<260},{t:'At about 300 ms, after C',right:aRes>=260}],
    'A resumed at '+aRes.toFixed(1)+' ms in the real trace: the loop could not run its timer while the thread was stuck in B. Step through mode 3 to see it.');

  // fan-out bars
  const NM={'sequential, 20 calls':'sequential, 20 calls','gather, 20 at once':'gather, 20 at once','gather, at most 5 at once':'Semaphore(5): 5 in flight','TaskGroup, 20 at once':'TaskGroup, 20 at once','timeout after':'timeout(0.25) on a 2 s call'};
  CGU.bars($('cg-fan-bars'),PA.a3.map(x=>({name:NM[x[0]]||x[0],v:x[1],label:x[1].toFixed(3)+' s',col:/sequential/.test(x[0])?'var(--c2)':'var(--acc)'})),null,
    'Twenty calls of 100 ms each against a local standard-library server, from <code>a3_fanout.py</code> on CPython 3.14.8; shorter is better.');
})();
