// ---- Syscall tracer (t-trace): section 2, the trace explorer ----
(function(){
  const {D,$,esc,fmt,KINDS,KLABEL,KVAR,color,cssv,kindOf,chip,legend,seg,onRender,onResize,width}=TR;
  const cache={};
  function load(run){
    if(cache[run])return cache[run];
    const r=D.runs[run],ev=[];
    r.events.split('\n').forEach(line=>{if(!line)return;const a=line.split('|');const txt=a.slice(5).join('|');
      const name=r.names[+a[2]];ev.push({lane:+a[0],t:+a[1]/10000,name,n:+a[3],dur:+a[4],txt,k:kindOf(name,txt)})});
    const st=r.storms.map(s=>Object.assign({storm:true,k:'file',t:s.t0},s));
    return cache[run]={r,ev,st};
  }
  const S={run:'fork',t0:0,t1:0,q:'',kinds:{},shown:200,sel:null};
  KINDS.forEach(k=>S.kinds[k]=true);
  legend($('tr-x-kinds'),['proc','mem','file','ipc','time','sig','other'],()=>{S.shown=200;draw()},S.kinds);
  function phaseOptions(){
    const {r}=load(S.run),sel=$('tr-x-phase');
    const opts=[['all','whole run ('+fmt(r.n_total)+' calls)']].concat(r.phase_counts.map((p,i)=>[String(i),p.label+' ('+fmt(p.n)+')']));
    sel.innerHTML=opts.map(o=>'<option value="'+o[0]+'">'+esc(o[1])+'</option>').join('');
    const dflt=r.phase_counts.findIndex(p=>p.phase==='loader_start');sel.value=String(dflt>=0?dflt:'all');setWindow();
  }
  function setWindow(){
    const {r}=load(S.run),v=$('tr-x-phase').value;
    if(v==='all'){S.t0=0;S.t1=r.t_end}else{const p=r.phase_counts[+v];S.t0=p.t0;S.t1=Math.max(p.t1,p.t0+0.001)}
    S.shown=200;
  }
  function pass(e,lanes){
    if(!S.kinds[e.k])return false;
    if(!S.q)return true;const q=S.q.toLowerCase();
    return (e.name||'').toLowerCase().includes(q)||(e.txt||'').toLowerCase().includes(q)||(lanes[e.lane]&&lanes[e.lane].label.toLowerCase().includes(q))||(e.label||'').toLowerCase().includes(q);
  }
  let geom=null;
  function draw(){
    const {r,ev,st}=load(S.run),host=$('tr-x-cv'),W=Math.min(width(host),900),L=r.lanes;
    const laneH=30,top=20,H=top+L.length*laneH+4,dpr=window.devicePixelRatio||1;
    let cv=host.querySelector('canvas');if(!cv){cv=document.createElement('canvas');host.appendChild(cv);cv.addEventListener('click',click);
      cv.setAttribute('role','img')}
    cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);cv.style.width=W+'px';cv.style.height=H+'px';
    cv.setAttribute('aria-label','Timeline of system calls by process and thread, '+S.run+' run');
    const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,W,H);
    const span=S.t1-S.t0,X=t=>(t-S.t0)/span*(W-8)+4;
    const ink=cssv('--ink'),mute=cssv('--mute'),line=cssv('--line'),soft=cssv('--soft');
    c.font='10px ui-sans-serif,-apple-system,Segoe UI,Helvetica,Arial,sans-serif';
    // axis
    c.fillStyle=mute;c.textAlign='left';c.fillText(fmtT(S.t0),4,11);c.textAlign='right';c.fillText(fmtT(S.t1)+' (time under strace)',W-4,11);
    // lanes
    L.forEach((l,i)=>{const y=top+i*laneH;c.fillStyle=i%2?soft:'transparent';if(i%2)c.fillRect(0,y,W,laneH);
      c.strokeStyle=line;c.beginPath();c.moveTo(0,y+laneH-.5);c.lineTo(W,y+laneH-.5);c.stroke()});
    // density background (whole run, every call): faint columns by dominant kind
    const B=r.bins,bw=r.t_end/B,dens={};
    r.density.forEach(([ln,b,k,n])=>{const key=ln+'_'+b;const d=dens[key]||(dens[key]={ln,b,n:0,best:0,k:0});d.n+=n;if(n>d.best){d.best=n;d.k=k}});
    Object.values(dens).forEach(d=>{const t0=d.b*bw,t1=t0+bw;if(t1<S.t0||t0>S.t1)return;const y=top+d.ln*laneH+12;
      c.globalAlpha=Math.min(.55,.08+.09*Math.log10(d.n+1));c.fillStyle=color(KINDS[d.k]);
      const x0=Math.max(0,X(t0)),x1=Math.min(W,X(t1));c.fillRect(x0,y,Math.max(1,x1-x0),laneH-14)});
    c.globalAlpha=1;
    // storms
    const marks=[];
    st.forEach(s=>{if(s.t1<S.t0||s.t0>S.t1||!pass(Object.assign({name:'storm',txt:s.label,label:s.label},s),L))return;const y=top+s.lane*laneH+12;
      const x0=Math.max(0,X(s.t0)),x1=Math.min(W,X(s.t1));c.strokeStyle=color('file');c.lineWidth=1;c.strokeRect(x0+.5,y+.5,Math.max(2,x1-x0)-1,laneH-15);
      c.save();c.beginPath();c.rect(x0,y,Math.max(2,x1-x0),laneH-14);c.clip();c.strokeStyle=color('file');c.globalAlpha=.35;
      for(let x=x0-20;x<x1;x+=6){c.beginPath();c.moveTo(x,y+laneH-14);c.lineTo(x+(laneH-14),y);c.stroke()}c.restore();
      if(x1-x0>60){c.fillStyle=ink;c.textAlign='left';c.fillText(fmt(s.n)+' calls',x0+3,y+laneH-17)}
      marks.push({x0,x1,lane:s.lane,o:s})});
    // detail ticks
    ev.forEach(e=>{if(e.t<S.t0||e.t>S.t1||!pass(e,L))return;const x=X(e.t),y=top+e.lane*laneH+12;
      c.fillStyle=color(e.k);c.fillRect(Math.round(x),y,e.n>1?2:1.4,laneH-14);marks.push({x0:x-1,x1:x+2,lane:e.lane,o:e})});
    // lane labels
    c.textAlign='left';L.forEach((l,i)=>{const y=top+i*laneH;c.fillStyle=ink;c.fillText(l.label+(l.threads?'':' (pid '+l.pid+')'),4,y+10)});
    if(S.sel&&!S.sel.storm&&S.sel.t>=S.t0&&S.sel.t<=S.t1){const x=X(S.sel.t),y=top+S.sel.lane*laneH;c.strokeStyle=ink;c.lineWidth=1.5;c.strokeRect(x-3,y+10,7,laneH-10)}
    geom={W,top,laneH,marks,L};
    list();
    const inView=ev.filter(e=>e.t>=S.t0&&e.t<=S.t1).length;
    $('tr-x-cap').innerHTML='Showing '+fmtT(S.t0)+' to '+fmtT(S.t1)+'. Faint columns: every call in the run, binned ('+B+' bins); marks: calls shown one by one; hatched: an import storm. '+
      (r.detail_window?'For this run, calls are listed one by one only from "'+r.detail_window[0]+'" to "'+r.detail_window[1]+'" (where the start methods differ), and threads\' calls only as columns. ':'Threads\' futex calls ('+fmt(r.thread_calls_omitted)+') appear only as columns. ')+
      'Repeated identical calls on one thread are merged into one mark (xN).';
  }
  function fmtT(t){return t<1?(t*1000).toFixed(0)+' ms':t.toFixed(t<10?2:1)+' s'}
  function click(e){
    if(!geom)return;const rc=e.target.getBoundingClientRect(),x=e.clientX-rc.left,y=e.clientY-rc.top;
    const lane=Math.floor((y-geom.top)/geom.laneH);let best=null,bd=9;
    geom.marks.forEach(m=>{if(m.lane!==lane)return;const d=x<m.x0?m.x0-x:x>m.x1?x-m.x1:0;if(d<bd||(d===0&&best&&best.o.storm)){bd=d;best=m}});
    if(best)select(best.o);
  }
  function list(){
    const {r,ev,st}=load(S.run),L=r.lanes;
    const rows=ev.filter(e=>e.t>=S.t0&&e.t<=S.t1&&pass(e,L)).concat(st.filter(s=>s.t1>=S.t0&&s.t0<=S.t1&&pass(Object.assign({name:'storm',txt:s.label,label:s.label},s),L))).sort((a,b)=>a.t-b.t);
    const el=$('tr-x-list'),n=Math.min(rows.length,S.shown);
    el.innerHTML=rows.slice(0,n).map((e,i)=>e.storm?
      '<div class="r storm" role="listitem" data-i="'+i+'"><span class="t">'+fmtT(e.t0)+'</span><span class="n">'+esc(L[e.lane].label)+'</span><span class="a"><b>Import storm:</b> '+esc(e.label)+', '+fmt(e.n)+' calls (click for what is inside)</span></div>':
      '<div class="r" role="listitem" data-i="'+i+'"><span class="t">'+fmtT(e.t)+'</span><span class="n" style="color:var('+KVAR[e.k]+')">'+esc(e.name==='IMPORT'?'(import)':e.name)+(e.n>1?' x'+e.n:'')+'</span><span class="a">'+esc(L[e.lane].label.replace(/ threads.*/,' thread'))+': '+esc(e.txt)+'</span></div>').join('');
    el._rows=rows;
    $('tr-x-more').hidden=rows.length<=n;
    $('tr-x-count').textContent=fmt(n)+' of '+fmt(rows.length)+' rows in this window';
  }
  $('tr-x-list').addEventListener('click',e=>{const d=e.target.closest('.r');if(!d)return;const o=$('tr-x-list')._rows[+d.dataset.i];
    $('tr-x-list').querySelectorAll('.r').forEach(x=>x.classList.toggle('sel',x===d));select(o,true)});
  $('tr-x-more').addEventListener('click',()=>{S.shown+=200;list()});
  function select(o,fromList){
    S.sel=o;const {r}=load(S.run),L=r.lanes,info=$('tr-x-info');
    if(o.storm){
      info.innerHTML='<h4>Import storm: '+esc(o.label)+'</h4><div class="k">'+esc(L[o.lane].label)+', '+fmtT(o.t0)+' to '+fmtT(o.t1)+' under strace</div>'+
        '<p>'+fmt(o.n)+' system calls; '+fmt(o.opened)+' files opened; '+fmt(o.enoent)+' calls failed with ENOENT (a path that does not exist: the import system looking in the wrong places first); '+o.libs.length+' shared libraries opened, '+o.code_mb+' MB of executable code mapped.</p>'+
        '<p><span class="k">Most frequent:</span> '+o.names.map(n=>esc(n[0])+' '+fmt(n[1])).join(', ')+'</p>'+
        '<p><span class="k">Files opened by package:</span> '+o.pkgs.map(n=>esc(n[0])+' '+fmt(n[1])).join(', ')+'</p>'+
        (o.libs.length?'<details class="tr-d"><summary>Shared libraries opened ('+o.libs.length+')</summary><div class="small mono">'+o.libs.map(esc).join(', ')+'</div></details>':'');
    }else{
      const d=window.TRD[o.name];
      let h='<h4><code>'+esc(o.name==='IMPORT'?'(Python import)':o.name)+'</code> '+chip(o.k)+(o.n>1?' <span class="k">x'+o.n+' in a row</span>':'')+'</h4>'+
        '<div class="k">'+esc(L[o.lane].label)+', at '+fmtT(o.t)+' under strace'+(o.dur?', took '+fmt(o.dur)+' &micro;s (traced)':'')+'</div>'+
        '<pre class="wrap">'+esc(o.txt)+'</pre>';
      if(o.name==='IMPORT')h+='<p>A run of the import system\'s calls (newfstatat, openat, read, close, lseek, ioctl on .pyc files and package directories) collapsed into one row: '+fmt(o.n)+' calls'+(o.txt?' that loaded '+esc(o.txt.trim().split(' ').join(', ')):'')+'. Python imports a module the first time something needs it, so these appear mid-run.</p>';
      else if(o.name==='SIGNAL')h+='<p>Not a system call: strace\'s report that the kernel delivered a signal to this thread. See <a href="https://man7.org/linux/man-pages/man7/signal.7.html" target="_blank" rel="noopener noreferrer">signal(7)</a>.</p>';
      else if(o.name==='EXIT')h+='<p>Not a system call: strace\'s report that this thread or process ended.</p>';
      else if(d)h+='<p><span class="k">Asks the kernel:</span> '+esc(d[2])+'</p><p><span class="k">OS idea:</span> '+esc(d[3])+'</p>'+(d[4]?'<p><span class="k">Who called it in these traces:</span> '+esc(d[4])+'</p>':'')+
        '<p><span class="k">Man page:</span> <a href="https://man7.org/linux/man-pages/man'+d[1].split('.').pop()+'/'+d[1]+'.html" target="_blank" rel="noopener noreferrer">'+esc(d[1].replace(/\.(\d)$/,'($1)'))+'</a></p>';
      if((o.name==='madvise'||o.name==='mmap')&&/1073741824/.test(o.txt)&&D.hugepage_stack)h+='<p><b>Who makes this 1 GiB reservation:</b> the mimalloc allocator built into PyTorch\'s <code>libc10.so</code> (this aarch64 CPU wheel): it reserves an arena with <code>mmap</code> (MAP_NORESERVE) and asks for transparent huge pages with <code>madvise(MADV_HUGEPAGE)</code>. Every process that allocates tensors makes one (here the main process at model build; in spawn and forkserver runs, each worker too).</p><details class="tr-d" open><summary>The call stack, captured with gdb (innermost first)</summary><div><ol class="tr-stack">'+D.hugepage_stack.slice(0,8).map(f=>'<li>'+esc(f)+'</li>').join('')+'</ol><p class="small mute">The 1 GiB range is reserved, not used: MAP_NORESERVE means no memory is committed until pages are touched.</p></div></details>';
      info.innerHTML=h;
    }
    if(!fromList)draw();else draw();
  }
  seg($('tr-x-run'),m=>{S.run=m;S.sel=null;phaseOptions();draw();$('tr-x-info').innerHTML='<span class="mute">Click a mark or a row.</span>'});
  $('tr-x-phase').addEventListener('change',()=>{setWindow();draw()});
  let qt=0;$('tr-x-q').addEventListener('input',e=>{clearTimeout(qt);qt=setTimeout(()=>{S.q=e.target.value.trim();S.shown=200;draw()},150)});
  $('tr-x-jump').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    const {r}=load(S.run),i=r.phase_counts.findIndex(p=>p.phase===b.dataset.ph);if(i<0)return;
    $('tr-x-phase').value=String(i);setWindow();S.q=b.dataset.q;$('tr-x-q').value=S.q;draw();
    const rs=[...$('tr-x-list').querySelectorAll('.r')];const pick=b.dataset.q==='1073741824'?(rs.find(x=>/madvise/.test(x.textContent))||rs[0]):rs[0];if(pick)pick.click()});
  phaseOptions();
  onRender(draw);onResize(draw);
})();
