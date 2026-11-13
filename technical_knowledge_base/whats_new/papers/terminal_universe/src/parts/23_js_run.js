// ---- Replay tab: the trace picker, the file viewer and the 640-row statistics (the replay itself is drawn by parts/33_js_sc_rr.js) ----
(function(){
  const TR=window.TRACES,ST=window.REPLAY_STATS;if(!TR||!$('stg-rr'))return;
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const short=p=>p.replace(/^\/app\//,'');
  let R=null;
  // a trace change loads it on the 3D stage (parts/33_js_sc_rr.js, which builds the step list) and in the file viewer below
  function load(i){const C=TR[i];R=RP.run(C);
    $('rtTask').textContent=C.task;
    document.querySelectorAll('#rtPick button').forEach((b,j)=>{b.classList.toggle('on',j===i);b.setAttribute('aria-pressed',j===i?'true':'false')});
    files();if(window.TURR)TURR.load(i)}
  function files(){const el=$('rrFiles');const ps=Object.keys(R.E0).concat(Object.keys(R.created).filter(p=>R.created[p]&&R.created[p].length));
    el.innerHTML=ps.map((p,i)=>'<button data-i="'+i+'"'+(i===0?' class="on"':'')+'>'+esc(short(p))+'</button>').join('');
    const show=i=>{const p=ps[i];el.querySelectorAll('button').forEach((b,j)=>b.classList.toggle('on',j===i));
      const E=R.E0[p],F=R.final[p];let h='';
      const blockOf=(v,ttl)=>'<p class="small"><b>'+ttl+'</b> <span class="mute">('+(v.lines.length+v.cut)+' lines'+(v.full?'':', partial view')+', turn '+v.t+(v.cut?'; '+v.cut+' lines cut for this page':'')+')</span></p><pre class="code">'+esc(v.lines.join('\n'))+'</pre>';
      if(E){h+=blockOf(E,'Earliest version: what Ê0 holds');if(F&&F.t!==E.t&&JSON.stringify(F.lines)!==JSON.stringify(E.lines))h+=blockOf(F,'Last version seen in the trace')}
      else{h+='<p class="small"><b>Written by the agent</b> <span class="mute">(held back from Ê0; kept as the agent\'s change for verification)</span></p><pre class="code">'+esc(R.created[p].join('\n'))+'</pre>'}
      $('rrView').innerHTML=h};
    el.querySelectorAll('button').forEach((b,i)=>b.addEventListener('click',()=>show(i)));if(ps.length)show(0);else $('rrView').innerHTML='<p class="small mute">No file content recovered.</p>'}
  $('rtPick').innerHTML=TR.map((t,i)=>'<button data-i="'+i+'" aria-pressed="false">'+t.cat.replace(/_task$/,'').replace(/_/g,' ')+'</button>').join('');
  $('rtPick').querySelectorAll('button').forEach((b,i)=>b.addEventListener('click',()=>load(i)));
  load(0);
  // sample statistics
  function stats(w){const h=ST.seed_hist_e0_files,ha=ST.all_hist_e0_files,mx=Math.max(...ha),pl=40,pb=30,H=220,bw=(w-pl-10)/h.length;let s='';
    const y=v=>H-pb-(H-pb-44)*v/mx;
    [0,100,200,300,400].filter(v=>v<=mx).forEach(v=>{s+=ln2(pl,y(v),w-10,y(v),'var(--line)')+tx(pl-6,y(v)+4,v,{fs:11,a:'end',c:'var(--mute)'})});
    h.forEach((v,i)=>{const x=pl+i*bw;s+=rc(x+bw*.12,y(ha[i]),bw*.76,H-pb-y(ha[i]),'var(--dim)',{r:2})+rc(x+bw*.24,y(v),bw*.52,H-pb-y(v),'var(--acc)',{r:2});
      s+=tx(x+bw/2,H-pb+15,i===h.length-1?i+'+':i,{fs:11,a:'middle',c:'var(--mute)'});if(ha[i])s+=tx(x+bw/2,y(ha[i])-4,ha[i],{fs:11,a:'middle',c:'var(--mute)'})});
    s+=tx((pl+w)/2,H-2,'pre-existing files recovered by replay (Ê0) per trajectory',{fs:11,a:'middle',c:'var(--mute)'});
    const lg=legend([['all 640 sampled',"var(--dim)"],['the 157 that pass the seed filter','var(--acc)']],pl,12,w-pl);
    $('rsPlot').innerHTML=svgW(w,H,s+lg.s,'Histogram of replayed files per trajectory')}
  fit($('rsPlot'),stats);
  const CK=PAPER.chk;$('ckN').textContent=fmt(CK.sample_traces);$('ckE').textContent=fmt(CK.sample_events);$('ckB').textContent=CK.sample_mismatching_fields;
  const cats=Object.entries(ST.categories).sort((a,b)=>b[1]-a[1]).map(([k,v])=>k.replace(/_task$/,'').replace(/_/g,' ')+' '+v).join(', ');
  $('rsText').innerHTML='<p class="small">'+ST.n+' rows drawn at seeded random offsets ('+ST.distinct_tasks+' distinct tasks). Every one is a <b>'+Object.keys(ST.agents).join(', ')+'</b> session by <b>'+Object.keys(ST.models).join(', ')+'</b>; task families: '+cats+'. Replay finds a median of '+ST.all.e0_files.median+' pre-existing file ('+ST.all.e0_lines.median+' lines) per trace; '+ST.seed_pass+' of '+ST.n+' ('+(100*ST.seed_pass/ST.n).toFixed(1)+'%) pass the seed filter, and among those the median is '+ST.seed.e0_files.median+' file and '+ST.seed.e0_lines.median+' lines (mean '+ST.seed.e0_files.mean+' and '+ST.seed.e0_lines.mean+'). '+A(PAPER.meta.ax+'#A1.T13','Table 13')+' reports 2 files and 60 lines (means 2.9 and 90) for the replayed terminal pool. '+ST.held_any+' traces read a file the rule must hold back, and '+ST.created_any+' write files of their own.</p>'})();
