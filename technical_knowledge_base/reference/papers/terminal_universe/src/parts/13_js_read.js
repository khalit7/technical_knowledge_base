// ---- Reading tab charts: completion bars, funnel, multi-round session, Figure 3, Table 3, predict reveals ----
(function(){
  const TB=PAPER.tables,FG=PAPER.figs,RC=PAPER.rc;
  const n=s=>+String(s).replace(/[,%*k]/g,'');
  // hbar rows: [[label, value, colour, text, err]], max, unit
  function hbars(w,rows,o){o=o||{};const lw=Math.min(o.lw||170,w*.42),bw=w-lw-(o.rw||70),mx=o.max,sx=v=>lw+bw*Math.max(0,v)/mx,rh=o.rh||26;let s='';
    if(o.title)s+=tx(lw,12,o.title,{fs:11,c:'var(--mute)'});const y0=o.title?20:4;
    if(o.ref!=null)s+=ln2(sx(o.ref),y0-2,sx(o.ref),y0+rows.length*rh,'var(--mute)',{da:'4 3'});
    rows.forEach(([l,v,c,t,er],i)=>{const y=y0+i*rh;s+=tx(lw-8,y+14,l,{fs:11.5,a:'end'})+rc(lw,y+2,sx(v)-lw,rh-9,c,{r:3});
      if(er)s+=ln2(sx(v-er),y+rh/2-1,sx(v+er),y+rh/2-1,'var(--ink)',{sw:1.5})+ln2(sx(v-er),y+rh/2-5,sx(v-er),y+rh/2+3,'var(--ink)')+ln2(sx(v+er),y+rh/2-5,sx(v+er),y+rh/2+3,'var(--ink)');
      s+=tx(sx(v+(er||0))+6,y+15,t==null?String(v):t,{fs:11.5,w:600})});
    return svgW(w,y0+rows.length*rh+4,s,o.label||'')}
  // 1. completion (Table 13)
  let cxm=0;const t13=TB.t13.rows;
  function cx(w){const r=t13[cxm],p=c=>c.split(' / ').map(x=>n(x)),rows=[['Terminal, replayed',...p(r[1])],['Terminal, completed',...p(r[2])],['SWE, replayed',...p(r[3])],['SWE, completed',...p(r[4])]];
    const mx=Math.max(...rows.map(x=>x[2]))*1.08;
    $('cxPlot').innerHTML=hbars(w,rows.map(([l,med,mean],i)=>[l,mean,i%2?'var(--c1)':'var(--c3)','mean '+fmt(mean,mean%1?1:0)+' (median '+fmt(med)+')']),{max:mx,rw:150,title:r[0]+' per workspace',label:'Workspace size before and after completion'})}
  segBind('cxM',m=>{cxm=+m;refit($('cxPlot'))});fit($('cxPlot'),cx);
  // 2. funnel (pipeline figure, Tables 2, 12, 14, 19)
  function fun(w){const st=[['Source trajectories',359593,'Table 12'],['Reconstructed environments',68263,'after replay and the seed filter'],['Reached the judge',40194,'after decontamination and repo deduplication'],['Task-sufficient',37273,'35,809 terminal + 1,464 SWE'],['SFT records (Full Mixture)',31977,'25,386 + 3,512 + 3,079, terminal only']];
    const bw=w-70,sx=v=>bw*v/359593;let s='';
    st.forEach(([l,v,d],i)=>{const y=6+i*46;s+=tx(2,y+12,l,{fs:12,w:600})+tx(2,y+26,d,{fs:11,c:'var(--mute)'})+rc(2,y+31,Math.max(2,sx(v)),12,i===4?'var(--c4)':'var(--acc)',{r:3})+tx(2+Math.max(2,sx(v))+6,y+42,fmt(v),{fs:11.5,w:600})});
    $('funPlot').innerHTML=svgW(w,st.length*46+8,s,'Pipeline funnel from trajectories to SFT records')}
  fit($('funPlot'),fun);
  // 3. multi-round session (Table 18, Appendix E.3)
  const MR=[['Initial request','start','"Working in the project root /app, the entrypoint sensor_processor.py hard-codes both its input path … and its output path …, which makes the script impossible to run against alternate data without editing source. Make it possible to invoke the script as python sensor_processor.py &lt;input_csv&gt; &lt;output_json&gt; so that the two positional arguments override the input and output locations."','The coding agent solves it; the private verifier passes.'],
    ['Round 1','extension','"The path override work is solid, thanks. Now I need this to stop being a one-shot script, because in production my sensor_data.csv keeps growing and I don\'t want to re-crunch the entire file every time I get a new batch of readings. […] Please add a resumable/incremental ingestion mode backed by a small persisted state store."','The agent adds incremental aggregation, but an unseeded random scaling makes the values unstable. The private verifier fails the round.'],
    ['Round 2','revision','"The row-counting side of the incremental mode looks right, readings_count comes out at 150 per sensor on a fresh run and rises to exactly 154 after I append four rows, so old rows aren\'t being double-counted. But the actual aggregate values are wrong and unstable, and it\'s making the output useless for me. […] It looks like each reading is being scaled down before it\'s aggregated."','Same requirements, no tests mentioned: the user agent describes the symptom (averages, minima and maxima about half the real readings, changing between reruns). The agent removes the random scaling and passes.'],
    ['Round 3','extension','"The aggregates are solid and stable now, thanks. The next thing I actually need for production is alerting, because right now I have to eyeball processed_results.json to notice when a sensor drifts out of its safe range. […] Please add a threshold rules engine in a new rules.py, driven by a JSON rules config."','A pass, so a new grounded requirement compatible with the active ones.'],
    ['Round 4','conflict','"The alerting engine is doing its job now, but I\'ve hit a real production gap: I\'ve decided to change how alerts.json works. Right now it\'s overwritten every run holding only the new alerts for that run, which means when a sensor recovers the alert just silently vanishes and I have no record it ever fired or when it cleared. […] Please turn alerts.json into an append-only history of transition events."','A permitted requirement change, stated as a product decision rather than a defect: exit code 2 for a new firing, 0 for a lone resolution, first-observed timestamp and severity kept with every event. The new history requirement governs the remaining rounds.'],
    ['Round 5','extension','"The event history is finally durable, but right now alerts.json and alerts.jsonl are write-only, nothing ever reads them back, so when I come in Monday morning I still have to eyeball a growing history file to answer basic questions. I need a reporting command that turns that trail into an operational summary."','Reporting on top of the history.'],
    ['Round 6','extension','"The reconcile check has already caught me out once, it correctly flagged that state.json and the alerts.json history disagreed about what was open, but all it can do is tell me there\'s drift and exit non-zero. […] I need reconcile to be able to actually fix the drift, not just report it. Please add a repair capability on top of the existing reconcile logic."','The sixth follow-up, the maximum a session allows.']];
  const MC={start:'var(--mute)',extension:'var(--c3)',revision:'var(--c2)',conflict:'var(--c4)'};
  $('mrChips').innerHTML=MR.map((r,i)=>'<button data-i="'+i+'"'+(i===0?' class="on"':'')+' style="border-left:4px solid '+MC[r[1]]+'">'+r[0]+'</button>').join('');
  const mrShow=i=>{const r=MR[i];$('mrChips').querySelectorAll('button').forEach((b,j)=>b.classList.toggle('on',j===i));
    $('mrBody').innerHTML='<p class="small"><b style="color:'+MC[r[1]]+'">'+(r[1]==='start'?'Initial request':r[1].charAt(0).toUpperCase()+r[1].slice(1))+'</b></p><p style="font-style:italic">'+r[2]+'</p><p class="small mute">'+r[3]+' Quotes abridged as printed in '+A(PAPER.meta.ax+'#A5.T18','Table 18')+'; the round outcomes are from '+A(PAPER.meta.ax+'#A5.SS3','Appendix E.3')+'.</p>'};
  $('mrChips').querySelectorAll('button').forEach((b,i)=>b.addEventListener('click',()=>mrShow(i)));mrShow(0);
  // 4. Figure 3: session shapes
  function f3(w){const sh=FG.fig3.shapes,cs=['var(--c3)','var(--c1)','var(--c6)','var(--c5)','var(--dim)'];let s='',x=0;const W=w-4,H=26;
    sh.forEach((r,i)=>{const bw=W*r.share/100;s+=rc(2+x,4,bw-1,H,cs[i],{r:2});if(bw>34)s+=tx(2+x+bw/2,22,r.share.toFixed(1)+'%',{fs:11,a:'middle',c:i===4?'var(--ink)':'var(--bg)',w:600});x+=bw});
    const kept=100-sh[4].share;s+=ln2(2,H+10,2+W*kept/100,H+10,'var(--ink)')+tx(2,H+24,'kept by the round rule: '+kept.toFixed(1)+'% ≈ '+fmt(Math.round(kept/100*4563))+' of 4,563 sessions',{fs:11})+tx(2,H+39,'the text reports 3,079 retained records',{fs:11,c:'var(--mute)'});
    let y=H+58;sh.forEach((r,i)=>{const t=r.shape+': '+r.share.toFixed(1)+'%';if(t.length*6.2>w-24&&t.indexOf(' (')>0){const k=t.indexOf(' (');s+=rc(2,y-9,10,10,cs[i],{r:2})+tx(18,y,t.slice(0,k),{fs:11})+tx(18,y+14,t.slice(k+1),{fs:11,c:'var(--mute)'});y+=30}else{s+=rc(2,y-9,10,10,cs[i],{r:2})+tx(18,y,t,{fs:11});y+=16}});
    $('f3Plot').innerHTML=svgW(w,y,s,'Figure 3 session shapes')}
  fit($('f3Plot'),f3);
  // 5. Table 3 dot chart
  let t3m=5;
  function t3(w){const rows=TB.t3.rows.filter(r=>r[t3m]!=='–');const lw=Math.min(230,w*.5),pw=w-lw-50,mx=t3m>=6?(t3m===6?45:90):80,sx=v=>lw+pw*v/mx;let s='';
    for(let v=0;v<=mx;v+=t3m===6?10:20){s+=ln2(sx(v),4,sx(v),rows.length*20+6,'var(--line)')+tx(sx(v),rows.length*20+20,v,{fs:11,a:'middle',c:'var(--mute)'})}
    rows.forEach((r,i)=>{const y=14+i*20,v=n(r[t3m]),meas=/\*/.test(r[t3m])||r[8]!=='synth',same=r[1]==='Qwen3.5-27B',c=r[8]==='ours'?'var(--c3)':r[8]==='teacher'?'var(--c4)':r[8]==='base'?'var(--mute)':same?'var(--c1)':'var(--c2)';
      const nm=r[0].replace(/ \(.*\)/,'');s+=tx(lw-8,y+4,nm.length>34?nm.slice(0,33)+'…':nm,{fs:11.5,a:'end',w:r[8]==='ours'?600:null});
      s+='<circle cx="'+sx(v).toFixed(1)+'" cy="'+y+'" r="5" fill="'+(meas?c:'var(--bg)')+'" stroke="'+c+'" stroke-width="2"/>'+tx(sx(v)+9,y+4,r[t3m].replace('*',''),{fs:11})});
    const lg=legend([['Terminal-Universe-27B','var(--c3)'],['same base model','var(--c1)'],['other base model','var(--c2)'],['teacher','var(--c4)']],4,rows.length*20+38,w-8);
    $('t3Plot').innerHTML=svgW(w,rows.length*20+38+lg.h,s+lg.s,'Table 3 scores');}
  segBind('t3M',m=>{t3m=+m;refit($('t3Plot'))});fit($('t3Plot'),t3);
  // 6. predict reveals
  const sdv=(t,i,j)=>t.sd&&t.sd[i]&&t.sd[i][j]?+t.sd[i][j]:0;
  PRED_REVEAL.pr1=()=>fit($('pr1Plot'),w=>{const t=TB.t4,rows=[];t.rows.forEach((r,i)=>{const c=['var(--dim)','var(--c2)','var(--c3)'][i];rows.push([r[0]+', Claude Code',+r[2],c,r[2]+' ± '+sdv(t,i,2),sdv(t,i,2)]);rows.push([r[0]+', Terminus2',+r[3],c,r[3]+' ± '+sdv(t,i,3),sdv(t,i,3)])});
    $('pr1Plot').innerHTML=hbars(w,rows,{max:62,lw:210,rw:80,ref:47.0,title:'TB2.1 pass rate (%), mean ± run-to-run spread; dashed: base average 47.0'})});
  PRED_REVEAL.pr2=()=>fit($('pr2Plot'),w=>{const t=TB.t10;$('pr2Plot').innerHTML=hbars(w,t.rows.map((r,i)=>[r[0],+r[5],i===0?'var(--dim)':i===1?'var(--c3)':'var(--c1)',r[5]+' ± '+(sdv(t,i,5)/Math.sqrt(6)).toFixed(1),sdv(t,i,5)/Math.sqrt(6)]),{max:62,lw:170,rw:80,ref:53.2,title:'TB2.1 (%), mean ± standard error over 6 runs, 35.1k records each except the base pool'})});
  PRED_REVEAL.pr3=()=>fit($('pr3Plot'),w=>{const rows=[['Base (no SFT)',6.3,'var(--dim)'],['Single-WS',18.4,'var(--c1)'],['Single-WS + Multi-Round',21.0,'var(--c3)'],['… without round verifier',18.8,'var(--c5)'],['Full Mixture',20.1,'var(--c4)']];
    $('pr3Plot').innerHTML=hbars(w,rows.map(r=>[r[0],r[1],r[2],r[1].toFixed(1)]),{max:24,lw:180,rw:50,title:'EvoCode-Bench v2 MT@4 (%)'})});
})();
