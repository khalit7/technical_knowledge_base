// ---- Reading tab, part 1: shared helpers, the tool table, the parallel-calls chart, the tool probe ----
window.HCCR=(function(){
  const D=window.HCC,S=window.HCC_STATIC,esc=RD.esc;
  const run=id=>D.runs.find(r=>r.id===id);
  const fmt=n=>n==null?'n/a':Math.round(n).toLocaleString('en-US');
  const usd=(x,d)=>'$'+x.toFixed(d==null?4:d);
  const cut=(s,n)=>{s=String(s||'');return s.length>n?s.slice(0,n)+' ...':s};
  const callIn=c=>c[0]+c[1]+c[2];
  // one row of the bar charts used in several sections
  const bar=(nm,v,max,col,lab,hl)=>'<div class="row'+(hl?' hl':'')+'"><span class="nm">'+nm+'</span><span class="track"><span class="fill" style="width:'+Math.max(.5,100*v/max).toFixed(2)+'%;background:'+col+'"></span></span><span class="val">'+lab+'</span></div>';
  return {D,S,esc,run,fmt,usd,cut,callIn,bar};
})();

// -- the built-in tool table with category chips --
(function(){
  const {S,esc}=HCCR;const tb=document.querySelector('#hcc-tool-table tbody'),ch=document.getElementById('hcc-tool-chips');if(!tb||!ch)return;
  const cats=[['all','All 46'],['files','Files'],['shell','Shell'],['search','Search'],['web','Web'],['agents','Agents'],['planning','Planning and tasks'],['context','Skills, MCP'],['people','Talking to you'],['session','Session'],['seen','Recorded here']];
  ch.innerHTML=cats.map((c,i)=>'<button data-m="'+c[0]+'"'+(i===0?' class="on"':'')+'>'+c[1]+'</button>').join('');
  function draw(f){
    const rows=S.tools.filter(t=>f==='all'||(f==='seen'?t.s:t.c===f));
    tb.innerHTML=rows.map(t=>'<tr><td><code>'+esc(t.n)+'</code></td><td>'+esc(t.d)+(t.s?'<div class="small" style="color:var(--good)">Recorded: '+esc(t.s)+'</div>':'')+'</td><td>'+(t.p?'yes':'no')+'</td></tr>').join('');
  }
  RD.seg(ch,draw);draw('all');
})();

// -- parallel tool calls: when did each of the three commands run? --
(function(){
  const {run,esc}=HCCR;const box=document.getElementById('hcc-par-svg'),cap=document.getElementById('hcc-par-cap'),seg=document.getElementById('hcc-par-seg');if(!box)return;
  function spans(id){
    const r=run(id);const res=r.ev.filter(e=>e.k==='res'&&!e.p).slice(0,3);
    if(id==='parallel'){ // each command printed its own start and end clock time (seconds modulo 1000)
      const v=res.map(e=>{const m=/([ABC]) ([\d.]+) ([\d.]+)/.exec(e.s);return [m[1],+m[2],+m[3]]});
      const t0=v[0][1];return {rows:v.map(x=>({n:x[0],a:x[1]-t0,b:x[2]-t0})),src:'printed by each command',v};
    }
    const uses=r.ev.filter(e=>e.k==='tool'&&!e.p).slice(0,3);
    const t0=uses[2].t; // the third call was streamed last; execution starts after the whole reply
    return {rows:res.map((e,i)=>({n:'sleep '+(i+1),a:e.t-2-t0,b:e.t-t0})),src:'derived: each result\'s arrival time in the stream, minus the 2 s the command sleeps',v:res.map(e=>e.t)};
  }
  let mode='py';
  function draw(){
    const W=RD.width(box),H=150,L=70,R=16,sp=spans(mode==='py'?'parallel':'parallel2');
    const xmax=Math.max(6.5,Math.max(...sp.rows.map(r=>r.b))+0.3),x=t=>L+(W-L-R)*Math.max(0,t)/xmax;
    let s='';for(let t=0;t<=xmax;t+=1){s+='<line x1="'+x(t)+'" x2="'+x(t)+'" y1="14" y2="'+(H-24)+'" stroke="var(--line)"/>'+RD.t(x(t),H-8,t+' s',{a:'middle',fs:10,fill:'var(--mute)'})}
    sp.rows.forEach((r,i)=>{const y=22+i*34;s+=RD.t(6,y+15,esc(r.n),{fs:12})+'<rect x="'+x(r.a)+'" y="'+y+'" width="'+Math.max(2,x(r.b)-x(r.a))+'" height="22" rx="4" fill="'+(mode==='py'?'var(--c2)':'var(--c3)')+'"/>'+(x(r.b)+44>W-R?RD.t(x(r.b)-4,y+15,(r.b-r.a).toFixed(2)+' s',{a:'end',fs:10.5,fill:'var(--bg)'}):RD.t(x(r.b)+4,y+15,(r.b-r.a).toFixed(2)+' s',{fs:10.5,fill:'var(--mute)'}))});
    box.innerHTML=RD.svg(W,H,s,'Execution time of three tool calls issued in one reply');
    const total=Math.max(...sp.rows.map(r=>r.b))-Math.min(...sp.rows.map(r=>r.a));
    cap.innerHTML=mode==='py'?'Run <code>parallel</code>: three <code>python3 -c</code> scripts that each sleep 2 s and print their start and end time. Times '+sp.src+'. They ran one after another: '+total.toFixed(2)+' s from the first start to the last end, for 6 s of sleeping. <span class="meas">MEASURED</span>':'Run <code>parallel2</code>: three <code>sleep 2</code> calls in one reply. Spans '+sp.src+'. All three ended within '+(Math.max(...sp.v)-Math.min(...sp.v)).toFixed(2)+' s of each other: they ran at the same time. <span class="meas">MEASURED</span>';
  }
  RD.seg(seg,m=>{mode=m;draw()});RD.onRender(draw);RD.onResize(draw);draw();
})();

// -- the tool probe: eighteen recorded calls, one per behaviour --
(function(){
  const {run,esc,fmt,cut,callIn}=HCCR;const r=run('tools');if(!r||!document.getElementById('hcc-probe-card'))return;
  const uses=r.ev.filter(e=>e.k==='tool'),res=r.ev.filter(e=>e.k==='res');
  const CAP=[
    ['Read returns numbered lines','Each line comes back as "number, tab, text". The numbers are for the model: Edit and offset/limit refer to them.'],
    ['A long but small file is cut without a word','3,001 lines, 104 KB, under the 256 KB cap. The harness stopped at line 1,821 by its token cap and told the model nothing: watch the next request jump by about 25,700 tokens.'],
    ['Over 256 KB: a hard error that names the way out','322 KB is refused outright, with instructions to use offset and limit or to search. An error the model can act on.'],
    ['offset and limit read a slice','Exactly three lines from line 100: the cheap way to look inside a large file.'],
    ['A missing file','The error adds the working directory, which helps a model that guessed a relative path.'],
    ['Edit before Read is refused','Haiku 4.5 must read a file before editing it; newer models may skip the read when reading would need no prompt.'],
    ['Read the file','Now the harness knows the model has seen dup.txt.'],
    ['Edit needs a unique match','"x = 1" appears twice; the edit is refused and the message says how to fix it: more context, or replace_all.'],
    ['Write creates a file','A new file needs no prior read.'],
    ['40,000 characters of output','Over the roughly 30,000-character inline ceiling: the harness saves the output to a file and returns its path plus a 2 KB preview, so the model can read on.'],
    ['15,000 characters of stderr, exit 3','A failure keeps at most about 10,000 characters inline and gives no file path.'],
    ['cd','The working directory change is kept for later Bash calls, inside the project.'],
    ['pwd','Shows the cd carried over: /work/textstats.'],
    ['export','Runs, but each Bash call is a new process.'],
    ['A variable in the command','Refused by the permission layer even though echo is allowed: the harness cannot check what $PROBE expands to.'],
    ['A 2 s timeout','The model may set a timeout per call; sleep 5 is killed with exit 143.'],
    ['Grep, content mode','ripgrep under the hood; results as file:line:text, relative to the search path.'],
    ['Glob','File names matching a pattern; capped at 100, newest first.']];
  const box=id=>document.getElementById(id);
  const maxIn=Math.max(...r.calls.map(callIn));
  box('hcc-probe-leg').innerHTML='<span style="--sw:var(--c1)">read from cache</span><span style="--sw:var(--c5)">written to cache</span><span style="--sw:var(--c2)">fresh input</span><span>width: the next request, to the scale of the largest ('+fmt(maxIn)+' tokens)</span>';
  function draw(i){
    const u=uses[i],x=res[i],nx=r.calls[i+1]||r.calls[i],cur=r.calls[i];
    box('hcc-probe-cap').innerHTML='<div class="t">Step '+(i+1)+' of 18: '+CAP[i][0]+'</div><p>'+CAP[i][1]+'</p>';
    box('hcc-probe-call').textContent=u.n+': '+cut(u.s,160);
    const rb=box('hcc-probe-res');rb.className='hcc-res'+(x.e?' err':'');rb.textContent=(x.e?'[is_error] ':'')+cut(x.s,700)+(x.len>700?'\n['+fmt(x.len)+' characters in the real result]':'');
    const w=v=>(100*v/maxIn).toFixed(2)+'%';
    box('hcc-probe-win').innerHTML='<span style="width:'+w(nx[2])+';background:var(--c1)"></span><span style="width:'+w(nx[1])+';background:var(--c5)"></span><span style="width:'+w(nx[0])+';background:var(--c2)"></span>';
    const errs=res.slice(0,i+1).filter(e=>e.e).length;
    box('hcc-probe-stats').innerHTML=RD.stat('Next request',fmt(callIn(nx))+' tok','input of model call '+(i+2))+RD.stat('Added by this step',fmt(callIn(nx)-callIn(cur))+' tok','tool call plus result')+RD.stat('Error results so far',errs+' of '+(i+1),'all sent back to the model');
  }
  RD.anim({card:'hcc-probe-card',ctl:'hcc-probe-ctl',n:uses.length,draw,ms:2600,label:'Probe step'});
})();
