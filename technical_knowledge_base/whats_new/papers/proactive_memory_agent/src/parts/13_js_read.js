// ---- The paper tab: the one-step animation, Table 1 and 2 charts, the predict reveals ----
const P=window.PAPER,RC=P.rc,TB=P.tables,CPT=RC.chars_per_token.median;
// wrap text into lines of at most maxW pixels (estimate: 0.56 em per character, 0.61 em in monospace)
function wrapT(t,maxW,fs,mono){const cw=fs*(mono?.61:.56),n=Math.max(8,Math.floor(maxW/cw)),out=[];
  t.split('\n').forEach(par=>{let line='';par.split(' ').forEach(wd=>{if(!line)line=wd;else if((line+' '+wd).length<=n)line+=' '+wd;else{out.push(line);line=wd}
    while(line.length>n){out.push(line.slice(0,n));line=line.slice(n)}});out.push(line)});return out}
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
// horizontal bars: rows [{n, v, c, t (value label), da}], scale max
function hbars(w,rows,max,o){o=o||{};const lw=Math.min(o.lw||170,Math.floor(w*.42)),rh=o.rh||22,h=rows.length*rh+(o.axis?22:6),x0=lw+6,bw=w-x0-60;let s='';
  rows.forEach((r,i)=>{const y=i*rh+3,v=Math.max(0,r.v);
    wrapT(r.n,lw-4,12).slice(0,1).forEach(l=>{s+=tx(lw,y+13,esc(l),{fs:12,a:'end',c:r.dim?'var(--mute)':null,w:r.b?600:null})});
    s+=rc(x0,y+2,bw*v/max,rh-8,r.c,{r:2,op:r.op,da:r.da,s:r.da?'var(--mute)':null});
    const xe=x0+bw*v/max,tw=String(r.t).length*12*.58;s+=xe+5+tw>w?tx(Math.max(x0+tw+4,xe-4),y+13,r.t,{fs:12,a:'end',c:'var(--bg)',w:600}):tx(xe+5,y+13,r.t,{fs:12,c:'var(--ink)'})});
  if(o.ref!=null){const x=x0+bw*o.ref/max;s+=ln2(x,0,x,rows.length*rh+2,'var(--ink)',{da:'4 3',sw:1.3});if(o.refl)s+=tx(Math.min(x,w-4),rows.length*rh+15,o.refl,{fs:11,a:x>w-120?'end':'middle',c:'var(--mute)'})}
  return svgW(w,h+(o.ref!=null?6:0),s,o.label||'bar chart')}

// ---------- One memory step, five ways (real step from the sqlite-with-gcov trace) ----------
(function(){
  const REM='The memory bank records that `gcov` is not a separate package, it comes bundled with `gcc`. The command `apt-get install -y gcc make gcov` failed specifically because of the "gcov" part. You just need to run `apt-get install -y gcc make` (without gcov) and gcov will be available automatically.';
  const BANK=[['K','Task: compile SQLite in /app/sqlite with gcov, add to PATH; tarball in /app/vendor; no network'],['K','Source tree in /app/sqlite/sqlite: autosetup configure; Makefile.linux-generic as fallback'],['P','Extracting creates a nested /app/sqlite/sqlite directory'],['P','configure failed: "No working C compiler found"; install gcc first'],['P','"gcov" is not a separate package; it comes with gcc (new this step)']];
  const BANK_TOK=Math.round(1265/CPT),REM_TOK=Math.round(REM.length/CPT),PROMPT=3871;
  const T2=Object.fromEntries(TB.T2.rows.map(r=>[r[0],r]));
  const M={
    full:{nm:'Proactive memory',p1:['SAVE_PROCEDURAL: "gcov" is not a separate package, it comes with gcc','UPDATE_STATUS (private): retry with apt-get install -y gcc make'],bank:1,
      p2:'INJECT. The real decision at this step; this run stayed silent at 7 of its 10 memory steps.',add:REM_TOK,text:REM,ill:0,row:'+ Full memory agent (ours)',ph:'1 and 2'},
    bank:{nm:'Full-bank context',p1:['Same Phase 1 edits as the full agent'],bank:1,p2:'No decision. The whole bank (the private status excluded) goes into every call.',add:BANK_TOK,text:BANK.map(b=>'['+b[0]+'] '+b[1]).join('\n'),ill:1,row:'+ Full-bank context',ph:'1 only'},
    always:{nm:'Always inject',p1:['Same Phase 1 edits as the full agent'],bank:1,p2:'Must inject: silence is not an option. Here that matches the real reminder; at the 7 steps where the real agent stayed silent, it would still add one.',add:REM_TOK,text:REM,ill:1,row:'+ Always inject',ph:'1 and 2, forced'},
    noinj:{nm:'Injection-only (no bank)',p1:['Skipped: no bank is kept'],bank:0,p2:'Guidance or silence, judged from the 8-step window alone. The error is on screen, so advice like the real reminder is likely; nothing older can be cited.',add:REM_TOK,text:'(advice drawn from the window, like the reminder above, but with nothing from earlier steps)',ill:1,row:'+ Injection-only (no bank)',ph:'2 only'},
    mem0:{nm:'Mem0',p1:['Mem0 ADD: the new messages are written to its store'],bank:0,p2:'No decision. The top 10 hits of a vector plus BM25 search for the current context are returned.',add:BANK_TOK,text:'(up to 10 retrieved records; Mem0\'s record lengths are not reported, so the bar uses the bank\'s size)',ill:1,row:'+ Mem0',ph:'Mem0 write and search'},
    base:{nm:'No memory',p1:['No memory agent'],bank:0,p2:'Nothing runs.',add:0,text:'',ill:0,row:'Sonnet 4.5 baseline',ph:'none'}};
  const steps=m=>{const x=M[m];return [
    {t:'The action agent acts',c:'Turn 3 of the memory run: Sonnet 4.5 runs <code>apt-get install -y gcc make gcov</code> and apt answers <code>E: Unable to locate package gcov</code>. The error is on screen, in the actor\'s own context.'},
    {t:'Phase 1: edit the bank',c:m==='base'?'There is no memory agent in the baseline.':m==='noinj'?'Injection-only skips Phase 1: there is no bank, only the recent window.':m==='mem0'?'Mem0 writes the new messages to its store through ADD; there is no structured status, knowledge and procedural bank.':'The memory agent (Opus 4.6) returns tool calls: a procedural entry for the failure and a private status note. The bank now holds 2 knowledge and 3 procedural entries.'},
    {t:'Phase 2: decide',c:x.p2},
    {t:'What turn 4\'s call carries',c:m==='base'?'The actor\'s next prompt is unchanged: 3,871 tokens, all of it the transcript so far.':'Added to the actor\'s 3,871-token prompt: about '+x.add+' tokens'+(x.ill?' (<span class="ill">illustrative</span>)':' (the real reminder)')+'. In the real run the actor\'s next analysis already reads "the install failed because gcov is not a separate package", so whether it needed telling cannot be seen from the trace.'},
    {t:'Score on τ²-Bench (Table 2)',c:m==='base'?'Sonnet 4.5 alone: 55.0% task-weighted, 57.5% macro.':x.nm+': '+T2[x.row][7].toFixed(1)+'% task-weighted, '+T2[x.row][6].toFixed(1)+'% macro, against 55.0% and 57.5% for Sonnet alone. Table 2 runs on τ²-Bench, not on this Terminal-Bench task.'}]};
  const modes={};Object.keys(M).forEach(m=>modes[m]=steps(m));
  function box(x,y,w,h,title,lines,o){o=o||{};let s=rc(x,y,w,h,o.f||'var(--soft)',{s:o.s||'var(--line)',r:6,da:o.da});s+=tx(x+10,y+17,title,{fs:12,w:600,c:o.tc});
    lines.forEach((l,i)=>{s+='<text x="'+(x+10)+'" y="'+(y+35+i*15)+'" font-size="12"'+(o.mono?' font-family="ui-monospace,Menlo,monospace"':'')+(l.c?' fill="'+l.c+'"':'')+'>'+esc(l.t)+'</text>'});return s}
  function draw(m,k,e,w){const x=M[m],pad=0,W=w,narrow=W<560;let s='',y=0;const op=i=>i<k?1:i===k?Math.max(.12,e):.12;
    // A: the action agent
    const cmd=['$ apt-get install -y gcc make gcov','E: Unable to locate package gcov'];const la=cmd.flatMap(c=>wrapT(c,W-20,12,true));
    const ha=26+la.length*15+8;s+=G(1,box(0,y,W,ha,'Action agent (Sonnet 4.5), turn 3',la.map((t,i)=>({t,c:i>=la.length-1&&t.indexOf('E:')===0?'var(--bad)':null})),{mono:1}));y+=ha+10;
    // B: Phase 1 and the bank
    const off=m==='base'||m==='noinj';const p1=x.p1.flatMap(t=>wrapT(t,(narrow?W:W*.5-6)-20,12));
    const bl=x.bank?BANK.flatMap(b=>wrapT('['+b[0]+'] '+b[1],(narrow?W:W*.5-6)-20,12)):['(no bank)'];
    const hb1=26+p1.length*15+8,hb2=26+bl.length*15+8;let sb='';
    if(narrow){sb+=box(0,y,W,hb1,'Phase 1: edit the bank',p1.map(t=>({t})),{tc:off?'var(--mute)':null,da:off?'4 3':null});sb+=box(0,y+hb1+8,W,hb2,'Memory bank after Phase 1',bl.map(t=>({t,c:t.indexOf('(new this step)')>=0||t.indexOf('[P] "gcov"')===0?'var(--c3)':null})),{da:x.bank?null:'4 3'});y+=hb1+hb2+18}
    else{const hh=Math.max(hb1,hb2);sb+=box(0,y,W*.5-6,hh,'Phase 1: edit the bank',p1.map(t=>({t})),{tc:off?'var(--mute)':null,da:off?'4 3':null});sb+=box(W*.5+6,y,W*.5-6,hh,'Memory bank after Phase 1',bl.map(t=>({t,c:t.indexOf('[P] "gcov"')===0?'var(--c3)':null})),{da:x.bank?null:'4 3'});y+=hh+10}
    s+=G(op(1),sb);
    // C: Phase 2
    const p2=wrapT(x.p2,W-20,12);const hc=26+p2.length*15+8;
    s+=G(op(2),box(0,y,W,hc,'Phase 2: decide',p2.map(t=>({t})),{f:m==='full'?'var(--acc2)':'var(--soft)',s:m==='full'?'var(--acc)':'var(--line)'}));y+=hc+10;
    // D: next call, tokens to scale
    const dl=wrapT('Turn 4 prompt, to scale: '+fmt(PROMPT)+' tokens of transcript'+(x.add?' + '+x.add+' added':''),W-4,12);let sd=dl.map((t,i)=>tx(0,y+13+i*15,t,{fs:12,w:600})).join('');y+=(dl.length-1)*15;
    const bw=W-4,tot=PROMPT+Math.max(x.add,0),sc=bw/(PROMPT+BANK_TOK);
    sd+=rc(0,y+20,PROMPT*sc,16,'var(--dim)',{r:2});if(x.add)sd+=rc(PROMPT*sc,y+20,Math.max(2,x.add*sc),16,x.ill?'var(--c5)':'var(--c1)',{r:2});
    let yy=y+46;if(x.text){const tl=wrapT(x.text,W-20,12).slice(0,9);sd+=rc(0,yy,W,tl.length*15+12,'var(--bg)',{s:x.ill?'var(--c5)':'var(--c1)',r:6,da:x.ill?'4 3':null});tl.forEach((t,i)=>{sd+=tx(10,yy+18+i*15,esc(t),{fs:12})});yy+=tl.length*15+18}
    s+=G(op(3),sd);y=yy+4;
    // E: Table 2 scores
    const rows=[{n:'Sonnet 4.5 alone',v:55.0,c:'var(--dim)',t:'55.0%'}];if(m!=='base')rows.push({n:x.nm,v:+T2[x.row][7],c:'var(--c1)',t:T2[x.row][7].toFixed(1)+'%',b:1});if(m!=='full')rows.push({n:'Proactive memory',v:61.2,c:'var(--c1)',t:'61.2%',op:.45,dim:1});
    const lw=Math.min(170,Math.floor(W*.42)),x0=lw+6,bww=W-x0-60;let se=tx(0,y+13,'τ²-Bench, task-weighted pass@1 (Table 2)',{fs:12,w:600});
    rows.forEach((r,i)=>{const yr=y+22+i*22;se+=tx(lw,yr+13,esc(r.n),{fs:12,a:'end',c:r.dim?'var(--mute)':null,w:r.b?600:null});se+=rc(x0,yr+2,bww*r.v/70,14,r.c,{r:2,op:r.op});se+=tx(x0+bww*r.v/70+5,yr+13,r.t,{fs:12})});
    s+=G(op(4),se);y+=26+rows.length*22;
    return svgW(W,y+4,s,'One memory step under '+x.nm)}
  function counters(m,k,e){const x=M[m];return stat('Added to turn 4\'s prompt',k>=3?(x.add?'≈ '+x.add+' tokens':'0'):'…',k>=3&&x.ill?'illustrative':k>=3&&x.add?'real reminder, '+REM.length+' characters':'')+
    stat('Memory phases run',x.ph,m==='full'?'two Opus calls, each with bank and window':'')+
    stat('τ²-Bench task-weighted',k>=4?(m==='base'?'55.0%':T2[x.row][7].toFixed(1)+'%'):'…',k>=4?'Table 2; baseline 55.0%':'')}
  makeAnim({id:'tl',modes,mode:'full',draw,counters,dur:3200});
})();

// ---------- Table 1 chart ----------
(function(){let unit='pct';const el=$('t1Svg');
  function draw(w){const rows=[];RC.t1.forEach(r=>{const lab=(r.bench.indexOf('Terminal')===0?'Terminal-Bench':'τ² '+r.split)+', '+r.actor;
    const vb=unit==='pct'?100*r.kb/r.n:r.kb,vm=unit==='pct'?100*r.km/r.n:r.km,f=v=>unit==='pct'?v.toFixed(1)+'%':String(v);
    rows.push({n:lab,v:vb,c:'var(--dim)',t:f(vb)+(unit==='k'?' of '+r.n:'')});rows.push({n:'',v:vm,c:r.actor.indexOf('Sonnet')===0?'var(--c1)':'var(--c4)',t:f(vm)+'  ('+(r.net>=0?'+':'')+r.net+' tasks)'})});
    el.innerHTML=hbars(w,rows,unit==='pct'?100:120,{lw:190,rh:19,label:'Table 1 bars'})}
  segBind('t1M',m=>{unit=m;refit(el)});fit(el,draw)})();

// predict: Sonnet + memory against Opus alone
PRED_REVEAL['pr-opus']=()=>{const el=$('opSvg');fit(el,w=>{let s='';const sets=[['Terminal-Bench 2.0',[['Sonnet 4.5 alone',37.6,'var(--dim)'],['Opus 4.6 alone',43.5,'var(--c4)'],['Sonnet 4.5 + Opus memory',45.9,'var(--c1)'],['Opus 4.6 + Opus memory',45.9,'var(--c4)']]],['τ²-Bench (task-weighted)',[['Sonnet 4.5 alone',55.0,'var(--dim)'],['Opus 4.6 alone',66.2,'var(--c4)'],['Sonnet 4.5 + Opus memory',61.8,'var(--c1)'],['Opus 4.6 + Opus memory',68.7,'var(--c4)']]]];
  el.innerHTML=sets.map(([t,r])=>'<div class="small" style="font-weight:600;margin-top:6px">'+t+'</div>'+hbars(w,r.map(x=>({n:x[0],v:x[1],c:x[2],t:x[1].toFixed(1)+'%',b:x[0].indexOf('+ Opus memory')>0&&x[0].indexOf('Sonnet')===0,op:x[0].indexOf('Opus 4.6 +')===0?.55:1})),100,{lw:180})).join('')})};

// ---------- Table 2 chart ----------
(function(){let mm='macro';const el=$('t2Svg');
  function draw(w){const full1=RC.full_t1_vs_t2.solved_t1;const rows=RC.t2.map((r,i)=>{const v=mm==='macro'?r.macro:mm==='micro'?r.micro:r.solved;
    return {n:r.v.replace('+ ','').replace(' (ours)','').replace(' (no bank)',''),v:v,c:i===0?'var(--dim)':i===1?'var(--c1)':'var(--c6)',t:mm==='k'?String(r.solved):v.toFixed(1)+'%',b:i===1}});
    const ref=mm==='macro'?null:mm==='micro'?100*full1/278:full1;el.innerHTML=hbars(w,rows,mm==='k'?200:70,{lw:160,ref,refl:ref==null?'':'same agent, Table 1 run: '+(mm==='k'?full1:(100*full1/278).toFixed(1)+'%'),label:'Table 2 bars'})}
  segBind('t2M',m=>{mm=m;refit(el)});fit(el,draw)})();

// predict: always inject
PRED_REVEAL['pr-always']=()=>{const el=$('awSvg');fit(el,w=>{const t=RC.t2,f=RC.full_t1_vs_t2;const d=['Airline (50)','Retail (114)','Telecom (114)'];
  let rows=[];d.forEach((nm,j)=>{rows.push({n:nm+': selective, T2',v:t[1].k[j],c:'var(--c1)',t:String(t[1].k[j])});rows.push({n:'selective, T1',v:f.t1[j],c:'var(--c1)',t:String(f.t1[j]),op:.5,dim:1});rows.push({n:'always inject',v:t[3].k[j],c:'var(--c6)',t:String(t[3].k[j])})});
  rows.push({n:'All 278: selective, T2',v:t[1].solved,c:'var(--c1)',t:String(t[1].solved),b:1});rows.push({n:'selective, T1',v:f.solved_t1,c:'var(--c1)',t:String(f.solved_t1),op:.5,dim:1});rows.push({n:'always inject',v:t[3].solved,c:'var(--c6)',t:String(t[3].solved),b:1});
  el.innerHTML='<p class="small mute" style="margin:6px 0 2px">Tasks solved; "T1" is the same selective agent as run for Table 1.</p>'+hbars(w,rows,200,{lw:170,rh:19,label:'always inject against selective'})})};

// predict: how often does it speak (the released traces)
PRED_REVEAL['pr-rate']=()=>{const el=$('rtSvg'),TT=RC.traces,tot=RC.traces_total,LC={recall:'var(--c3)',diagnose:'var(--c2)',check:'var(--c4)'};
  fit(el,w=>{let s='',y=0;const names=Object.keys(window.TRACES);const lw=Math.min(190,w*.45);
    names.forEach(nm=>{const tr=window.TRACES[nm].t,n=tr.length,cw=Math.min(14,(w-lw-10)/31);
      s+=tx(lw-6,y+12,nm,{fs:12,a:'end'});tr.forEach((x,i)=>{s+=rc(lw+i*cw,y+2,cw-2,13,x.i?LC[x.l]:'var(--bg)',{r:2,s:x.i?null:'var(--mute)',sw:.8})});
      s+=tx(lw+n*cw+4,y+12,x0(TT[nm].inject)+'/'+n,{fs:11,c:'var(--mute)'});y+=20});
    function x0(v){return String(v)}
    const lg=legend([['recall',LC.recall],['diagnose',LC.diagnose],['check',LC.check],['silent','var(--mute)','2 2']],0,y+14,w);s+=lg.s;el.innerHTML=svgW(w,y+lg.h+8,s,'reminders by step')});
  $('rtTxt').innerHTML='It injects at <b>'+tot.inject+' of '+tot.triggers+'</b> memory steps ('+Math.round(100*tot.inj_rate)+'%), from 1 of 8 in <code>hf-model-inference</code> to 28 of 31 in <code>git-multibranch</code>. Each square is one memory step, in order; filled squares are reminders, coloured by this page\'s reading of what they say ('+tot.lab_recall+' recall, '+tot.lab_diagnose+' diagnose, '+tot.lab_check+' check). The selective agent on these tasks is closer to "always inject" than to "mostly silent", which may be why the two score alike in Table 2. Step through them in the <a href="#" data-tab="t-run">Replay tab</a>.';
  $('rtTxt').querySelector('a[data-tab]').addEventListener('click',e=>{e.preventDefault();document.querySelector('#tabs button[data-t=t-run]').click()})};

// ---------- Table 3 ----------
$('t3b').innerHTML=TB.T3.rows.map(r=>'<tr><td><b>'+r[0]+'</b></td><td>'+r[1]+'</td><td>'+r[2]+'</td></tr>').join('');

// ---------- Table 4 (SETA and transfer) ----------
(function(){const el=$('t4Svg');fit(el,w=>{const r=TB.T5.rows;const rows=r.map((x,i)=>({n:x[0],v:x[1],c:i===0?'var(--dim)':i===1?'var(--bad)':'var(--c1)',t:x[1].toFixed(3)+' · '+x[2]+' solved'}));
  el.innerHTML='<div class="small" style="font-weight:600">SETA validation, average verifier reward (Table 4, left)</div>'+hbars(w,rows,1,{lw:180})+
  '<div class="small" style="font-weight:600;margin-top:6px">Terminal-Bench 2.0, held out (Table 4, right)</div>'+hbars(w,[{n:'Qwen3.5-122B-A10B alone',v:37.6,c:'var(--dim)',t:'37.6% (32 of 85)'},{n:'+ trained Qwen3.5-27B memory',v:41.1,c:'var(--c1)',t:'41.1% (35 of 85)'}],100,{lw:180})})})();
