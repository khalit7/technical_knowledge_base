// ---- Profile reader (tab t-xpprof): a small trace viewer of one step ----
(function(){
  const D=XP.D, P=D.prof, esc=XP.esc, f=XP.f, $=id=>document.getElementById(id);
  const PC={f:'var(--c1)',b:'var(--c2)',o:'var(--c3)','?':'var(--dim)'}, PN={f:'forward',b:'backward',o:'optimiser','?':'other or unlabelled'};
  const FC={layer_norm:'var(--c1)',linear:'var(--c2)',attention:'var(--c4)',mlp:'var(--c5)',optimiser:'var(--c3)','model (other)':'var(--c6)',other:'var(--dim)','':'var(--dim)'};
  let col='phase';
  const color=e=>col==='phase'?PC[e[4]]||'var(--dim)':FC[e[5]]||'var(--dim)';
  function legend(){$('xv-leg').innerHTML=col==='phase'?Object.keys(PC).map(k=>'<span style="--sw:'+PC[k]+'">'+PN[k]+'</span>').join(''):Object.keys(FC).filter(k=>k).map(k=>'<span style="--sw:'+FC[k]+'">'+esc(k)+'</span>').join('')}
  function draw(){
    const host=$('xv-tl'), W=RD.width(host)-2, rows=P.threads.length, rh=16, pl=Math.min(118,W*0.3), H=rows*rh+22;
    const zoom=+$('xv-zoom').value, span=P.dur/zoom, start=(P.dur-span)*(+$('xv-start').value)/1000, x=t=>pl+(W-pl-4)*(t-start)/span;
    let s='';
    P.threads.forEach((t,r)=>{s+='<rect x="0" y="'+(r*rh)+'" width="'+W+'" height="'+rh+'" fill="'+(r%2?'var(--soft)':'var(--bg)')+'"/>'+RD.t(4,r*rh+11,esc(t.length>18&&pl<100?t.replace('XLA:CPU worker','worker'):t),{fs:10})});
    P.ev.forEach((e,k)=>{const a=e[1],b=e[1]+e[2];if(b<start||a>start+span)return;const x0=Math.max(pl,x(a)),x1=Math.min(W-4,x(b));
      s+='<rect data-k="'+k+'" x="'+x0.toFixed(1)+'" y="'+(e[0]*rh+2)+'" width="'+Math.max(0.8,x1-x0).toFixed(1)+'" height="'+(rh-4)+'" fill="'+color(e)+'"><title>'+esc(e[3])+' '+e[2]+' us</title></rect>'});
    const nt=W<500?2:4;for(let k=0;k<=nt;k++){const t=start+span*k/nt;s+=RD.t(x(t),rows*rh+15,(t/1000).toFixed(1)+' ms',{fs:10,a:k===0?'start':k===nt?'end':'middle'})}
    host.innerHTML=RD.svg(W,H,s,'Timeline of one step');
  }
  function bars(id,obj,c){const E=Object.entries(obj).filter(([k,v])=>v>0).sort((a,b)=>b[1]-a[1]);const mx=E.length?E[0][1]:1;$(id).innerHTML=XP.bars(E.map(([k,v])=>({n:k||'(none)',v,t:XP.ms(v),c:c(k)})),mx)}
  const tot=Object.values(P.by_phase).reduce((a,b)=>a+b,0);
  $('xv-cnt').innerHTML=RD.stat('This step',XP.ms(P.dur),'wall time, step 3 of 5')+RD.stat('All five steps',P.step_ms.map(v=>v.toFixed(0)).join(', '),'ms')+RD.stat('Kernel thread time',XP.ms(tot),'summed over threads')+RD.stat('1-minute load',P.load1.join(' / '),'before / after, 10 cores');
  $('xv-min').textContent=P.min_dur;$('xv-kept').textContent=f(P.ev.length);$('xv-all').textContent=f(P.n_all);
  $('xv-files').innerHTML=P.files.map(x=>'<code>'+esc(x)+'</code>').join(', ');
  bars('xv-phase',Object.fromEntries(Object.entries(P.by_phase).map(([k,v])=>[k==='?'?'other':k,v])),k=>({forward:PC.f,backward:PC.b,optimiser:PC.o}[k]||'var(--dim)'));
  bars('xv-fn',P.by_fn,k=>FC[k]||'var(--dim)');
  bars('xv-kind',Object.fromEntries(Object.entries(P.by_kind).map(([k,v])=>[k==='fusion '?'op inside a library call':k==='fusion kCustom'?'library fusion (kCustom)':k==='fusion kLoop'?'loop fusion (kLoop)':k,v])),k=>'var(--acc)');
  $('xv-top').innerHTML='<thead><tr><th>Kernel</th><th class="num">Time</th><th>Phase</th><th>Function</th></tr></thead><tbody>'+P.top.slice(0,10).map(t=>'<tr><td><code>'+esc(t[0])+'</code></td><td class="num">'+XP.ms(t[1])+'</td><td>'+esc(t[2]||'')+'</td><td>'+esc(t[3]||'')+'</td></tr>').join('')+'</tbody>';
  $('xv-tl').addEventListener('click',e=>{const r=e.target.closest('rect[data-k]');if(!r)return;const ev=P.ev[+r.dataset.k];
    $('xv-det').innerHTML='<b><code>'+esc(ev[3])+'</code></b> on '+esc(P.threads[ev[0]])+': starts at '+(ev[1]/1000).toFixed(2)+' ms, runs '+ev[2]+' us. Phase: '+PN[ev[4]]+(ev[5]?'; model function: '+esc(ev[5]):'')+'.'});
  ['xv-start','xv-zoom'].forEach(id=>$(id).addEventListener('input',draw));
  $('xv-col').addEventListener('change',e=>{col=e.target.value;legend();draw()});
  legend();
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-xpprof']=[draw];
  addEventListener('resize',()=>{if(!$('t-xpprof').hidden)draw()});
})();
