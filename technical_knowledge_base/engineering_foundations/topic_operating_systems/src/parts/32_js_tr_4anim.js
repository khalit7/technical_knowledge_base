// ---- Syscall tracer (t-trace): sections 4 to 6, three before/after animations on the same job ----

// Section 4: fork, spawn, forkserver, from iter(dl) to the first batch, to scale in system calls
(function(){
  const {D,$,esc,fmt,sec,color,kindOf,seg,anim,onRender,onResize,width}=TR;
  const LBL={fork:'fork',spawn:'spawn',forkserver:'forkserver'};
  function build(mode){
    const r=D.runs[mode],ph=r.phase_counts,a=ph.find(p=>p.phase==='loader_start'),b=ph.find(p=>p.phase==='first_batch');
    const t0=a.t0,t1=b.t0,lanes=r.lanes.map((l,i)=>Object.assign({i},l)).filter(l=>!l.threads);
    const ev=[];r.events.split('\n').forEach(line=>{if(!line)return;const x=line.split('|');const t=+x[1]/10000;if(t<t0||t>t1)return;
      const lane=+x[0];if(r.lanes[lane].threads)return;const name=r.names[+x[2]],txt=x.slice(5).join('|');ev.push({lane,t,name,n:+x[3],txt})});
    // segments per lane: detail calls between storms, and storms
    const segs=[];
    lanes.forEach(l=>{
      const st=r.storms.filter(s=>s.lane===l.i&&s.t1>=t0&&s.t0<=t1).sort((x,y)=>x.t0-y.t0);
      const mine=ev.filter(e=>e.lane===l.i);let cut=[t0].concat(st.flatMap(s=>[s.t0,s.t1])).concat([t1]);
      for(let k=0;k<cut.length-1;k+=2){const lo=cut[k],hi=cut[k+1];const part=mine.filter(e=>e.t>=lo&&e.t<=hi);
        if(part.length){const n=part.reduce((s,e)=>s+e.n,0),names={};part.forEach(e=>names[e.name]=(names[e.name]||0)+e.n);
          const top=Object.entries(names).sort((p,q)=>q[1]-p[1]).slice(0,4);
          const forks=part.filter(e=>(e.name==='clone'||e.name==='clone3')&&!/CLONE_THREAD/.test(e.txt)).length,execs=part.filter(e=>e.name==='execve').length;
          segs.push({lane:l.i,t:part[0].t,n,kind:'calls',top,forks,execs,label:l.label})}
        const s=st[k/2];if(s)segs.push({lane:l.i,t:s.t0,n:s.n,kind:'storm',label:l.label,storm:s})}
    });
    segs.sort((x,y)=>x.t-y.t);
    return {r,lanes,segs,t0,t1};
  }
  const M={fork:build('fork'),spawn:build('spawn'),forkserver:build('forkserver')};
  const scaleMax=Math.max(...Object.values(M).flatMap(m=>m.lanes.map(l=>m.segs.filter(s=>s.lane===l.i).reduce((a,s)=>a+s.n,0))));
  let mode='fork';
  function caption(s){
    if(s.kind==='storm'){const lab=s.storm.label;
      return '<b>'+esc(s.label)+':</b> '+esc(lab)+', '+fmt(s.n)+' system calls ('+fmt(s.storm.opened)+' files opened, '+fmt(s.storm.enoent)+' missing-path checks, '+s.storm.code_mb+' MB of code mapped). '+
        (/import numpy, torch/.test(lab)?'A fresh process has to import torch again before it can produce a batch.':/start-up/.test(lab)?'A new Python interpreter starting: the loader maps libpython and libc, Python reads its standard library.':'')}
    let t='<b>'+esc(s.label)+':</b> '+fmt(s.n)+' system calls, mostly '+s.top.map(x=>esc(x[0])+' '+fmt(x[1])).join(', ')+'.';
    if(s.forks)t+=' It creates '+s.forks+' process'+(s.forks>1?'es':'')+' with clone (fork: a copy-on-write copy of itself).';
    if(s.execs)t+=' It runs execve: a new program replaces the copy.';
    return t}
  function draw(i){
    const m=M[mode],el=$('tr-sm-svg'),W=Math.min(width(el),900),narrow=W<560,lw=narrow?0:110,rowH=narrow?40:30,top=8,H=top+m.lanes.length*rowH+6;
    const x0=lw+4,bw=W-x0-8,sc=bw/scaleMax;let s='';const shown=m.segs.slice(0,i);const off={};
    m.lanes.forEach((l,k)=>{const y=top+k*rowH+(narrow?14:0);
      s+=narrow?'<text x="0" y="'+(y-3)+'" font-size="11" fill="var(--ink)">'+esc(l.label)+'</text>':'<text x="'+lw+'" y="'+(y+13)+'" font-size="11.5" text-anchor="end" fill="var(--ink)">'+esc(l.label)+'</text>';
      s+='<rect x="'+x0+'" y="'+y+'" width="'+bw+'" height="18" fill="var(--soft)" stroke="var(--line)"/>'});
    shown.forEach((g,j)=>{const k=m.lanes.findIndex(l=>l.i===g.lane),y=top+k*rowH+(narrow?14:0),x=x0+(off[g.lane]||0),w=Math.max(1.5,g.n*sc);off[g.lane]=(off[g.lane]||0)+w;
      const col=g.kind==='storm'?color('file'):color('proc'),last=j===shown.length-1;
      s+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+w.toFixed(1)+'" height="18" fill="'+col+'" opacity="'+(g.kind==='storm'?.75:1)+'"'+(last?' stroke="var(--ink)" stroke-width="1.5"':'')+'><title>'+esc(g.label)+': '+fmt(g.n)+'</title></rect>'});
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Worker start-up with '+mode+', to scale in system calls">'+s+'</svg><div class="tr-cap">Bar length: system calls, same scale for all three methods (full width = '+fmt(scaleMax)+'). Orange: import storms; blue: other calls.</div>';
    const tot=shown.reduce((a,g)=>a+g.n,0),all=m.segs.reduce((a,g)=>a+g.n,0);
    $('tr-sm-step').innerHTML=i===0?'<b>'+LBL[mode]+':</b> the main process calls <code>iter(dl)</code>. Step through to see who makes which calls until the first batch arrives.':
      (i<m.segs.length?caption(m.segs[i-1]):caption(m.segs[i-1])+' <b>The first batch reaches the main process.</b>');
    const fb=D.first_batch[mode],ep=D.epochs[mode];
    $('tr-sm-stats').innerHTML=stat('System calls so far',fmt(tot),'of '+fmt(all)+' until the first batch (processes only)')+
      stat('Processes created',String(m.lanes.length-1),m.lanes.filter(l=>l.role!=='main').map(l=>l.label).join(', '))+
      stat('Time to first batch, untraced',sec(fb.median_s),'median of '+fb.runs_s.length+' runs ('+sec(fb.min_s)+' to '+sec(fb.max_s)+')')+
      stat('Under strace',sec(m.t1-m.t0),'same window, traced: inflated');
  }
  function stat(k,v,d){return '<div class="tr-stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+d+'</div></div>'}
  const A=anim({card:'tr-s-sm',ctl:'tr-sm-ctl',n:M.fork.segs.length+1,draw,ms:1500,label:'Start-up step'});
  seg($('tr-sm-mode'),v=>{mode=v;A.reset(M[mode].segs.length+1)});
  onResize(()=>A.redraw());
  // epochs table
  const E=D.epochs,rows=[['fork','fork'],['spawn','spawn'],['forkserver','forkserver'],['forkserver --preload torch,numpy','forkserver + set_forkserver_preload(["torch", "numpy"])']];
  $('tr-sm-epochs').innerHTML='<h3>Every epoch pays again, unless...</h3><p>A DataLoader re-creates its workers for every new iterator (every epoch) unless <code>persistent_workers=True</code> (<a href="https://docs.pytorch.org/docs/stable/data.html#torch.utils.data.DataLoader" target="_blank" rel="noopener noreferrer">DataLoader docs</a>). Measured without strace, 5 runs each: the first batch of the first iterator, and of a second one.</p>'+
    '<div class="tr-tw"><table class="tr-t"><thead><tr><th>Start method</th><th class="num">First iterator</th><th class="num">Second iterator</th></tr></thead><tbody>'+
    rows.map(([k,lab])=>{const e=E[k];return '<tr><td>'+esc(lab)+'</td><td class="num">'+sec(e.first_median_s)+'</td><td class="num">'+sec(e.second_median_s)+'</td></tr>'}).join('')+'</tbody></table></div>'+
    '<p class="tr-cap">Medians; raw runs in <code>src/trace/raw/timing_epochs.txt</code>. Why plain forkserver does not help here: the forkserver is meant to preload <code>__main__</code> by default, but in CPython\'s source the forkserver asks for the key <code>main_path</code> (<a href="https://github.com/python/cpython/blob/v3.11.2/Lib/multiprocessing/forkserver.py#L129-L132" target="_blank" rel="noopener noreferrer">forkserver.py lines 129 to 132</a>) while <code>spawn.get_preparation_data</code> names it <code>init_main_from_path</code> (<a href="https://github.com/python/cpython/blob/v3.11.2/Lib/multiprocessing/spawn.py#L191-L196" target="_blank" rel="noopener noreferrer">spawn.py lines 191 to 196</a>), so the preload is skipped; the same two lines are unchanged in 3.14.0. That is our reading of the source, and the trace agrees: the forkserver made only '+fmt((D.runs.forkserver.storms.find(s=>s.label.indexOf('python start-up')===0)||{n:0}).n)+' calls at start-up and each worker imported torch itself. Naming the modules explicitly works.</p>';
})();

// Section 5: buffered against unbuffered writes
(function(){
  const {D,$,esc,fmt,ms,color,seg,anim,onResize,width}=TR;
  const W5=D.writes,STEPS=[0,1,2,4,8,16,17,32,64,256,1024,4096,4097];
  let mode='buffered';
  function per(){return mode==='buffered'?(W5.buffered.write_sizes[0][0]/256):1}
  function draw(i){
    const k=STEPS[i],el=$('tr-wr-svg'),Wd=Math.min(width(el),900),cols=64,cell=Math.max(3,Math.floor((Wd-8)/cols)),gw=cols*cell,rowsN=64,H=rowsN*cell+8;
    const g=per(),done=Math.min(k,4096),sys=Math.floor(done/g)+(k>4096&&done%g?1:0),flushed=sys*g;
    let s='';
    for(let j=0;j<4096;j++){const x=4+(j%cols)*cell,y=4+Math.floor(j/cols)*cell;
      const st=j<flushed?2:j<done?1:0;
      s+='<rect x="'+x+'" y="'+y+'" width="'+(cell-1)+'" height="'+(cell-1)+'" fill="'+(st===2?color('file'):st===1?'var(--c5)':'var(--soft)')+'"/>'}
    if(g>1&&cell>=4)for(let j=0;j<4096;j+=g){const x=4+(j%cols)*cell,y=4+Math.floor(j/cols)*cell;s+='<rect x="'+(x-.5)+'" y="'+(y-.5)+'" width="'+(g*cell)+'" height="'+cell+'" fill="none" stroke="var(--line)"/>'}
    el.innerHTML='<svg viewBox="0 0 '+(gw+8)+' '+H+'" width="'+(gw+8)+'" height="'+H+'" role="img" aria-label="4096 Python writes and the write system calls they become, '+mode+'">'+s+'</svg><div class="tr-cap">One square = one f.write() of 256 bytes. Yellow: waiting in Python\'s buffer; orange: handed to the kernel by write(2).</div>';
    const w=W5[mode];
    $('tr-wr-step').innerHTML=k===0?'The file is open: <code>'+esc(w.names.filter(n=>n[0]!=='write').map(n=>n[0]).join(', '))+'</code> (the trace\'s calls besides the writes). Now 4,096 calls to <code>f.write(256 bytes)</code>.':
      k>4096?'<code>close()</code> flushes what is left. Total: '+fmt(w.writes)+' <code>write(2)</code> calls of '+fmt(w.write_sizes[0][0])+' bytes each, from the trace.':
      fmt(done)+' Python writes so far; '+fmt(sys)+' <code>write(2)</code> system calls'+(g>1?(done%g?', '+fmt((done%g)*256)+' bytes waiting in the buffer':', the buffer just emptied into the kernel'):', one per Python write')+'.';
    $('tr-wr-stats').innerHTML=st('write(2) calls',fmt(w.writes),mode+', counted in the trace')+st('Time, untraced',ms(w.untraced_best_ms/1000),'best of '+w.untraced_reps+' runs; the other mode: '+ms(W5[mode==='buffered'?'unbuffered':'buffered'].untraced_best_ms/1000))+
      st('Per extra system call',((W5.unbuffered.untraced_best_ms-W5.buffered.untraced_best_ms)*1000/(W5.unbuffered.writes-W5.buffered.writes)).toFixed(2)+' &micro;s','(unbuffered minus buffered time) / (extra calls)')+st('Under strace',ms(w.traced_ms/1000),'the same writes, traced');
  }
  function st(k,v,d){return '<div class="tr-stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+d+'</div></div>'}
  const A=anim({card:'tr-s-wr',ctl:'tr-wr-ctl',n:STEPS.length,draw,ms:1100,label:'Writes step'});
  seg($('tr-wr-mode'),v=>{mode=v;A.reset(STEPS.length)});
  onResize(()=>A.redraw());
})();

// Section 6: a checkpoint three ways, with "a crash here"
(function(){
  const {D,$,esc,fmt,ms,color,seg,anim,onResize,width}=TR;
  const C=D.ckpt;let mode='naive';
  // what is on the device if the machine crashed right after row i (reasoned from the call order)
  function states(rows){
    let s={old:'ok',neu:'none',tmp:'none',name:'old',dirsync:false},out=[];
    out.push({s:Object.assign({},s),why:'Before the first call: the previous checkpoint is safe on disk.'});
    rows.forEach(r=>{
      let why='';
      if(r.name==='openat'&&/O_TRUNC/.test(r.args)&&!/\.tmp/.test(r.args)){s.old='gone';s.neu='partial';why='O_TRUNC empties the existing ckpt.pt at once: the old checkpoint is destroyed before a byte of the new one exists.'}
      else if(r.name==='openat'&&/\.tmp/.test(r.args)){s.tmp='partial';why='A new file ckpt.pt.tmp is created; ckpt.pt is untouched.'}
      else if(r.name==='write'||r.name==='writev'){why=fmt(r.bytes||0)+' bytes copied into the page cache (memory). The kernel writes them to the device later, in its own order.';if(s.tmp==='partial'||s.tmp==='cached')s.tmp='cached';else s.neu='cached'}
      else if(r.name==='fsync'&&/\.tmp/.test(r.args)){s.tmp='durable';why='fsync returns only when the device has the temporary file\'s data and size.'}
      else if(r.name==='fsync'&&/ck_\w+\.pt>/.test(r.args)){s.neu='durable';why='fsync: the new checkpoint\'s bytes are now on the device.'}
      else if(r.name==='renameat'){s.name='new?';why='The name ckpt.pt now points at the new file, atomically. The directory change itself may still be only in memory.'}
      else if(r.name==='fsync'){s.dirsync=true;if(s.name==='new?')s.name='new';why='fsync of the directory makes the rename durable.'}
      else if(r.name==='close'){why='close does not flush: "A successful close does not guarantee that the data has been successfully saved to disk" (close(2)).'}
      else if(r.name==='(Python import)'){why='torch.save\'s first call imports its serialization helpers.'}
      else why='Bookkeeping by Python\'s io module.';
      out.push({s:Object.assign({},s),why})});
    return out}
  function verdict(s){
    if(mode==='safe'){if(s.name==='new')return ['good','ckpt.pt is the new checkpoint, durable.'];
      if(s.name==='new?')return ['good','ckpt.pt is either the old or the new checkpoint, both complete (the rename may not have reached the device).'];
      return ['good','ckpt.pt is the old, complete checkpoint'+(s.tmp!=='none'?'; a leftover ckpt.pt.tmp may be partial: delete it on restart.':'.')]}
    if(s.old==='ok')return ['good','ckpt.pt is the old, complete checkpoint.'];
    if(s.neu==='durable')return ['good','ckpt.pt is the new checkpoint, durable.'];
    return ['bad','ckpt.pt may be empty, partial or complete: nothing forced it to the device, and the old checkpoint is already gone. The training run has no checkpoint.']}
  function draw(i){
    const rows=C[mode].rows,S=states(rows),cur=S[i],el=$('tr-ck-svg');
    el.innerHTML=rows.map((r,j)=>'<div class="r'+(j===i-1?' sel':'')+'" style="cursor:default;opacity:'+(j<i?1:.45)+'"><span class="t">'+(j+1)+'</span><span class="n">'+esc(r.name)+(r.n>1?' x'+r.n:'')+'</span><span class="a">'+esc(r.args.replace(/AT_FDCWD<\/work>, /g,''))+(r.ret?' = '+esc(r.ret):'')+'</span></div>').join('');
    const v=verdict(cur.s);
    $('tr-ck-step').innerHTML=(i===0?'':'<b>'+esc(rows[i-1].name)+'</b>: ')+esc(cur.why)+'<br><b style="color:var('+(v[0]==='good'?'--good':'--bad')+')">A crash now:</b> '+esc(v[1]);
    const T=C.timing;
    $('tr-ck-stats').innerHTML=st('System calls',fmt(C[mode].n_syscalls),'between the markers, traced')+st('Time on /work',ms(T.work[mode].median_ms/1000),'median of '+T.work[mode].reps+' untraced runs')+
      st('Time on /dev/shm',ms(T.shm[mode].median_ms/1000),'tmpfs: memory only, fsync has nothing to wait for')+st('Size',fmt(T.work[mode].size_b)+' B',mode==='naive'?'torch.save(path) uses its own C++ writer: few large writev calls':'torch.save(file object): Python writes');
  }
  function st(k,v,d){return '<div class="tr-stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+d+'</div></div>'}
  const A=anim({card:'tr-s-ck',ctl:'tr-ck-ctl',n:C.naive.rows.length+1,draw,ms:1400,label:'Checkpoint step'});
  seg($('tr-ck-mode'),v=>{mode=v;A.reset(C[mode].rows.length+1)});
  onResize(()=>A.redraw());
})();
