// ---- Part 1 (ra) Reading: the borrow-timeline animation (section 5), the measured iterator bars (section 11), section nav ----
(function(){
  const D=window.RA_DATA;if(!D||!document.getElementById('t-ra-read'))return;
  const esc=RA.esc;
  // ----- borrow timeline: three versions of the same five-line program -----
  const M={
    err:{src:D.gate.err.src,out:D.gate.err.out,sh:[3,5],mu:4,
      cap:['<code>main</code> starts.','<code>v</code> owns a vector with one element.','<code>first</code> borrows <code>v</code> (shared, blue). The borrow lives until <code>first</code> is last used.','<code>push</code> needs <code>&amp;mut v</code> (orange) while the blue borrow is still alive (it is used on line 5): <b>conflict</b>.','Line 5 is why the blue borrow was alive at line 4. Remove this use and the conflict disappears.','<code>}</code>: <code>v</code> goes out of scope and its buffer is freed.','The compiler refuses the program, with the three labels you just saw: borrow, conflicting use, later use.']},
    reorder:{src:D.gate.reorder.src,out:D.gate.reorder.out,sh:[3,4],mu:5,
      cap:['<code>main</code> starts.','<code>v</code> owns a vector with one element.','<code>first</code> borrows <code>v</code> (shared, blue).','<code>first</code> is used for the last time: the blue borrow ends here.','<code>push</code> takes <code>&amp;mut v</code>; no other borrow is alive, so it is allowed.','Printing <code>v</code> borrows it again briefly.','<code>}</code>: <code>v</code> goes out of scope and its buffer is freed.','Compiles and runs: the bars do not overlap.']},
    fix:{src:D.gate.fix.src,out:D.gate.fix.out,sh:null,mu:4,
      cap:['<code>main</code> starts.','<code>v</code> owns a vector with one element.','<code>v[0]</code> is an <code>i32</code>, which is <code>Copy</code>: <code>first</code> is a copy of the number, not a borrow.','<code>push</code> takes <code>&amp;mut v</code>; nothing else borrows <code>v</code>.','<code>first</code> is an independent number; the vector may have moved, it does not matter.','<code>}</code>: <code>v</code> goes out of scope and its buffer is freed.','Compiles and runs.']}
  };
  let mode='err',A=null;
  const box=document.getElementById('ra-nll-code'),cap=document.getElementById('ra-nll-cap'),outEl=document.getElementById('ra-nll-out');
  function lines(){return M[mode].src.split('\n')}
  function draw(i){const m=M[mode],L=lines(),n=L.length,cur=i+1;let h='';
    L.forEach((t,k)=>{const no=k+1;const shown=no<=Math.min(cur,n);
      const inSh=m.sh&&no>=m.sh[0]&&no<=m.sh[1]&&shown,isMu=no===m.mu&&shown;const conflict=inSh&&isMu;
      h+='<div class="ln'+(no===cur?' on':'')+'"><span class="no">'+no+'</span><span class="tx">'+RA.hl(t)+'</span><span class="bars">'+
        '<span class="bar" style="background:'+(conflict?'var(--ra-red)':inSh?'var(--c1)':'transparent')+'" title="shared borrow"></span>'+
        '<span class="bar" style="background:'+(conflict?'var(--ra-red)':isMu?'var(--c2)':'transparent')+'" title="exclusive borrow"></span></span></div>'});
    box.innerHTML=h;
    cap.innerHTML='<b>Step '+(i+1)+' of '+(n+1)+'.</b> '+(m.cap[Math.min(i,m.cap.length-1)]||'');
    const last=i>=n;outEl.hidden=!last;if(last){const t=RA.out(m.out);outEl.className=/exit code/.test(m.out)?'ra-out ra-bad':'ra-out';outEl.innerHTML=t.replace(/^<pre[^>]*>\n?/,'').replace(/<\/pre>$/,'')}}
  A=RD.anim({card:'ra-nll-card',ctl:'ra-nll-ctl',n:lines().length+1,draw,ms:1700,label:'Line'});
  RD.seg(document.getElementById('ra-nll-seg'),v=>{mode=v;A.reset(lines().length+1);A.play()});
  RA.onTab('t-ra-read',()=>A.redraw());
  // ----- measured bars, log scale -----
  const bars=document.getElementById('ra-bench-bars');
  function parse(t,lang){return t.split('\n').map(l=>l.match(/^(.+?)\s+([0-9.]+) ns\/element/)).filter(Boolean).map(m=>({n:(lang==='py'?'Python: ':'Rust: ')+m[1].trim(),v:+m[2],lang}))}
  const rows=parse(D.bench.rs,'rs').concat(parse(D.bench.py,'py'));
  function drawBars(){const lo=Math.log10(0.1),hi=Math.log10(200);
    bars.innerHTML=rows.map(r=>{const w=Math.max(2,(Math.log10(r.v)-lo)/(hi-lo)*100);
      return '<div class="row"><span class="nm" title="'+esc(r.n)+'">'+esc(r.n)+'</span><span class="track"><span class="fill" style="width:'+w.toFixed(1)+'%;background:'+(r.lang==='py'?'var(--c5)':r.n.includes('dyn')?'var(--c2)':'var(--c1)')+'"></span></span><span class="val">'+r.v+' ns</span></div>'}).join('')+
      '<div class="small mute">nanoseconds per element, logarithmic scale; shorter is faster</div>'}
  drawBars();
  // ----- section nav highlight -----
  const nav=document.getElementById('ra-nav');
  if(nav&&'IntersectionObserver' in window){const links=[...nav.querySelectorAll('a')];const map={};links.forEach(a=>map[a.getAttribute('href').slice(1)]=a);
    const io=new IntersectionObserver(es=>{es.forEach(en=>{if(en.isIntersecting){links.forEach(a=>a.classList.remove('cur'));const a=map[en.target.id];if(a){a.classList.add('cur');nav.scrollLeft=Math.max(0,a.offsetLeft-40)}}})},{rootMargin:'-45% 0px -50% 0px'});
    Object.keys(map).forEach(id=>{const s=document.getElementById(id);if(s)io.observe(s)})}
})();
