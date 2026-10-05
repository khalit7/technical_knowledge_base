// ---- Reading tab: measured outputs, charts, the threshold stepper, drills. Data: window.AD (22_js_data.js).
(function(){
  const D=window.AD,$=id=>document.getElementById(id),esc=RD.esc;if(!D)return;
  const COL={glibc:'--c1',jemalloc:'--c3',tcmalloc:'--c2',mimalloc:'--c4',fixed_threshold:'--c5',arena_max_2:'--c6'};
  const NAME={glibc:'glibc (default)',fixed_threshold:'glibc, MALLOC_MMAP_THRESHOLD_=131072',arena_max_2:'glibc, MALLOC_ARENA_MAX=2',jemalloc:'jemalloc',tcmalloc:'tcmalloc',mimalloc:'mimalloc'};
  const med=a=>{const s=a.slice().sort((x,y)=>x-y),n=s.length;return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2};
  const f1=v=>v.toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1});
  const fk=v=>v.toLocaleString('en-US');
  // plain recorded outputs
  if($('rd-slab'))$('rd-slab').textContent=D.slab;
  if($('rd-buddy'))$('rd-buddy').textContent='            order:    0      1      2      3      4      5      6      7      8      9     10\n'+D.buddy;
  if($('rd-pym'))$('rd-pym').textContent=D.pym;
  if($('rd-torch'))$('rd-torch').innerHTML=D.torch.split('\n').map(l=>{const t=esc(l);return /^write/.test(l)?'<span class="c">'+t+'</span>':/1073741824|67108864/.test(l)?'<span class="hl">'+t+'</span>':t}).join('\n');
  // bars helper: rows [{nm, v, max, col, lab}]
  function hbar(el,rows,max){el.innerHTML=rows.map(r=>'<div class="r"><div class="nm" title="'+esc(r.nm)+'">'+esc(r.nm)+'</div><div class="tr"><div class="f" style="width:'+(100*r.v/max).toFixed(1)+'%;background:var('+r.col+')"></div></div><div class="v">'+r.lab+'</div></div>').join('')}
  // chunk sizes
  if($('rd-sizes')){const rows=D.sizes.filter(r=>r[0]<=1033);const mx=Math.max(...rows.map(r=>r[2]));
    const el=$('rd-sizes');el.classList.add('hbar');
    hbar(el,rows.map(r=>({nm:'malloc('+r[0]+')',v:r[2],col:'--c1',lab:r[1]+' / '+r[2]+' B'})),mx);
    el.insertAdjacentHTML('afterbegin','<div class="small mute">request: usable / chunk bytes (beyond the chart: 4,096 costs '+D.sizes.find(r=>r[0]===4096)[2]+', 65,536 costs '+D.sizes.find(r=>r[0]===65536)[2]+')</div>')}
  // arenas
  if($('rd-arenas')){const A=D.arenas,keys=['glibc','glibc MALLOC_ARENA_MAX=1','glibc MALLOC_ARENA_MAX=2','jemalloc','tcmalloc','mimalloc'].filter(k=>A[k]);
    const rows=keys.map(k=>{const r=A[k];return {nm:k.replace('glibc ','glibc, '),v:med(r.map(x=>x[1])),col:COL[k.split(' ')[0]]||'--c1',lab:f1(med(r.map(x=>x[1])))+' MiB'}});
    hbar($('rd-arenas'),rows,Math.max(...rows.map(r=>r.v)));
    $('rd-arenas').insertAdjacentHTML('beforeend','<div class="tw"><table class="tbl-sm"><thead><tr><th>Configuration</th><th class="num">peak RSS, MiB</th><th class="num">RSS at the end, MiB</th><th class="num">seconds</th></tr></thead><tbody>'+
      keys.map(k=>{const r=A[k];return '<tr><td>'+k+'</td><td class="num">'+f1(med(r.map(x=>x[1])))+'</td><td class="num">'+f1(med(r.map(x=>x[2])))+'</td><td class="num">'+med(r.map(x=>x[0])).toFixed(2)+' <span class="mute">('+r.map(x=>x[0].toFixed(2)).join(', ')+')</span></td></tr>'}).join('')+'</tbody></table></div>')}
  // fragmentation table with mini bars
  if($('rd-frag')){const P=['freed all but every 64th','malloc_trim(0) returned 1','3 s later, after one malloc/free'];
    const rows=[['glibc',D.frag.glibc],['jemalloc',D.frag.jemalloc],['tcmalloc',D.frag.tcmalloc],['mimalloc',D.frag.mimalloc],['jemalloc, purging',D.frag_purge.jemalloc],['tcmalloc, purging',D.frag_purge.tcmalloc],['mimalloc, purging',D.frag_purge.mimalloc]];
    const mx=Math.max(...rows.map(r=>r[1]['allocated 400,000 x 256 B']));
    const cell=(v,c)=>v==null?'<td class="mute">n/a</td>':'<td><div style="display:flex;align-items:center;gap:6px"><div style="flex:1 1 40px;height:10px;background:var(--soft);border-radius:2px;position:relative;min-width:30px"><div style="position:absolute;left:0;top:0;bottom:0;width:'+(100*v/mx).toFixed(1)+'%;background:var('+c+');border-radius:2px"></div></div><span style="white-space:nowrap">'+fk(v)+'</span></div></td>';
    $('rd-frag').innerHTML='<div class="tw"><table class="tbl-sm"><thead><tr><th>Allocator</th><th>RSS after freeing 98%, KiB</th><th>after malloc_trim(0) (glibc&#39;s own; the others are untouched by it)</th><th>all freed, 3 s later</th></tr></thead><tbody>'+
      rows.map(r=>{const c=COL[r[0].split(',')[0]],o=r[1],tk=Object.keys(o).find(k=>/^malloc_trim/.test(k));return '<tr><td>'+r[0]+'</td>'+cell(o[P[0]],c)+cell(o[tk],c)+cell(o[P[2]],c)+'</tr>'}).join('')+'</tbody></table></div><div class="small mute">Live data after the frees: 1,562 KiB. Start of each run: 756 to 5,572 KiB.</div>'}
  // bench table
  if($('rd-bench')){const B=D.bench,cols=[['1/pairs/16','16 B'],['1/pairs/256','256 B'],['1/pairs/4096','4 KiB'],['1/pairs/65536','64 KiB'],['1/pairs/1048576','1 MiB'],['1/batch1000/256','batch 256 B'],['1/batch1000/4096','batch 4 KiB'],['1/batch1000/1048576','batch 1 MiB']];
    $('rd-bench').innerHTML='<table class="tbl-sm"><thead><tr><th>ns per pair</th>'+cols.map(c=>'<th class="num">'+c[1]+'</th>').join('')+'</tr></thead><tbody>'+
      ['glibc','jemalloc','tcmalloc','mimalloc'].map(a=>{const mn=cols.map(c=>Math.min(...['glibc','jemalloc','tcmalloc','mimalloc'].map(x=>B[x][c[0]])));
        return '<tr><td>'+a+'</td>'+cols.map((c,i)=>{const v=B[a][c[0]];return '<td class="num"'+(v===mn[i]?' style="font-weight:600;color:var(--good)"':v>8*mn[i]?' style="color:var(--bad)"':'')+'>'+f1(v)+'</td>'}).join('')+'</tr>'}).join('')+
      '</tbody></table><div class="small mute">Green: fastest in the column; orange: more than 8 times the fastest.</div>'}
  // job table
  if($('rd-job')){const J=D.job;$('rd-job').innerHTML='<table class="tbl-sm"><thead><tr><th>Allocator</th><th class="num">seconds (median of 3)</th><th class="num">all runs</th><th class="num">peak RSS, main process, MiB</th></tr></thead><tbody>'+
      Object.keys(J).map(a=>{const r=J[a];return '<tr><td>'+a+'</td><td class="num">'+med(r.map(x=>x[0])).toFixed(2)+'</td><td class="num mute">'+r.map(x=>x[0].toFixed(2)).join(', ')+'</td><td class="num">'+f1(med(r.map(x=>x[1]))/1024)+'</td></tr>'}).join('')+'</tbody></table>'}
  // loader chart
  function loader(mode){const el=$('rd-loader');if(!el)return;
    if(mode==='final'){const R=D.loader_runs,ks=Object.keys(R),mx=Math.max(...ks.map(k=>med(R[k].map(x=>x[1])))),mt=Math.max(...ks.map(k=>med(R[k].map(x=>x[0]))));
      el.innerHTML='<div class="small mute">Median of 3 runs: RSS after the window is dropped (kept records: '+D.loader_runs.glibc.length+' runs, 68.7 MiB live), and seconds for 120,000 samples.</div><div class="hbar">'+
        ks.map(k=>{const r=med(R[k].map(x=>x[1])),s=med(R[k].map(x=>x[0]));return '<div class="r"><div class="nm" title="'+NAME[k]+'">'+NAME[k]+'</div><div class="tr"><div class="f" style="width:'+(100*r/mx).toFixed(1)+'%;background:var('+COL[k]+')"></div></div><div class="v">'+f1(r)+' MiB</div></div>'+
          '<div class="r"><div class="nm mute">time</div><div class="tr"><div class="f" style="width:'+(100*s/mt).toFixed(1)+'%;background:var('+COL[k]+');opacity:.45"></div></div><div class="v">'+s.toFixed(2)+' s</div></div>'}).join('')+'</div>';return}
    const S=D.loader_series,ks=Object.keys(S),W=RD.width(el),H=Math.round(Math.min(300,Math.max(200,W*0.45))),L=40,Rm=8,T=10,Bm=26;
    const xm=Math.max(...ks.map(k=>S[k][S[k].length-1][0])),ym=Math.max(...ks.map(k=>Math.max(...S[k].map(p=>p[1]))))*1.05;
    const X=v=>L+(W-L-Rm)*v/xm,Y=v=>T+(H-T-Bm)*(1-v/ym);let b='';
    for(let y=0;y<=ym;y+=50){b+='<line x1="'+L+'" x2="'+(W-Rm)+'" y1="'+Y(y).toFixed(1)+'" y2="'+Y(y).toFixed(1)+'" stroke="var(--line)"/>'+RD.t(L-4,Y(y)+4,y,{a:'end',fs:10,fill:'var(--mute)'})}
    for(let x=0;x<=xm;x+=40000)b+=RD.t(X(x),H-8,x/1000+'k',{a:'middle',fs:10,fill:'var(--mute)'});
    b+=RD.t(L,T+2,'RSS, MiB',{fs:10,fill:'var(--mute)'});
    const live=S.glibc.map(p=>[p[0],p[2]]);
    b+='<polyline fill="none" stroke="var(--mute)" stroke-dasharray="4 3" stroke-width="1.2" points="'+live.map(p=>X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)).join(' ')+'"/>';
    ks.forEach(k=>{b+='<polyline fill="none" stroke="var('+COL[k]+')" stroke-width="1.6" points="'+S[k].map(p=>X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)).join(' ')+'"/>'});
    el.innerHTML=RD.svg(W,H,b,'RSS over the run for six allocator settings')+'<div class="leg">'+ks.map(k=>'<span style="--sw:var('+COL[k]+')">'+NAME[k]+'</span>').join('')+'<span style="--sw:var(--mute)">live data (dashed)</span></div>'}
  let lm='rss';if($('rd-loader-seg'))RD.seg($('rd-loader-seg'),m=>{lm=m;loader(m)});
  loader(lm);RD.onRender(()=>loader(lm));RD.onResize(()=>loader(lm));
  // threshold stepper: the two strace recordings, cut at the program's markers
  if($('rd-thr-card')){
    const cut=lines=>{const ph=[[]];lines.forEach(l=>{if(/^write\(2, "---/.test(l)){ph.push([l])}else ph[ph.length-1].push(l)});return ph};
    const P=[cut(D.thr[0]),cut(D.thr[1])];
    const CAP=['Two runs of the same program under strace. Step through its four actions.',
      '1st malloc(1 MiB): above the 128 KiB threshold, so both runs map a fresh region with mmap (the brk calls set up the heap for small allocations).',
      'free: both runs give the mapping straight back with munmap. In the default run glibc also raises its threshold to about 1 MiB.',
      '2nd malloc(1 MiB): the default run now serves it from the heap, growing it with brk; the fixed-threshold run maps again.',
      'free: the default run makes no system call, the 1 MiB stays in the heap (trim threshold now about 2 MiB); the fixed run unmaps it.',
      'End: same program, same requests; the default run ends holding 1 MiB more.'];
    function draw(i){[0,1].forEach(k=>{const ph=P[k];let h='';
      for(let j=1;j<=Math.min(i,ph.length-1);j++){ph[j].forEach(l=>{h+='<div'+(j===i?' class="now"':'')+'>'+esc(l.replace(/\s+=\s+/,' = ').replace(/\)\s+=/,') ='))+'</div>'})}
      $(k?'rd-thr-b':'rd-thr-a').innerHTML=h||'<div>(nothing yet)</div>'});
      $('rd-thr-cap').innerHTML='<p>'+CAP[Math.min(i,CAP.length-1)]+'</p>'}
    RD.anim({card:'rd-thr-card',ctl:'rd-thr-ctl',n:6,ms:1800,label:'Step',draw:draw});
  }
  // drills
  document.querySelectorAll('#t-read .drill').forEach(d=>{const opts=d.querySelectorAll('.opts button'),ans=d.querySelector('.ans');
    opts.forEach(b=>b.addEventListener('click',()=>{opts.forEach(o=>{o.disabled=true;if(o.hasAttribute('data-right'))o.classList.add('right')});if(!b.hasAttribute('data-right'))b.classList.add('wrong');if(ans)ans.hidden=false}))});
})();
