// ---- The paper tab: numbers from recompute.py, the evaluation diagram, the threat explorer, the trace viewer, the predict reveals ----
const RC=PAPER.rc,TB=PAPER.tables;
// fill <span data-rc="key.path" data-f="digits">
document.querySelectorAll('[data-rc]').forEach(el=>{let v=RC;el.dataset.rc.split('.').forEach(k=>{v=v==null?v:v[k]});
  if(v==null){el.textContent='?';__jsErr('missing recompute value '+el.dataset.rc);return}
  if(Array.isArray(v))v=v.join('; ');
  el.textContent=typeof v==='number'?(el.dataset.f!=null?(v<0?'−':'')+fmt(Math.abs(v),+el.dataset.f):fmt(v,v%1?2:0)):v});

// Figure 1, redrawn: accounts -> services -> audit log -> monitor -> daily queue
(function(){const el=$('idSvg');fit(el,w=>{const narrow=w<560,H=narrow?330:190;let s='';
  const box=(x,y,bw,bh,t1,t2,c)=>rc(x,y,bw,bh,'var(--soft)',{s:c||'var(--line)',r:8})+tx(x+bw/2,y+bh/2-(t2?3:-4),t1,{fs:12,a:'middle',w:600})+(t2?tx(x+bw/2,y+bh/2+13,t2,{fs:11,a:'middle',c:'var(--mute)'}):'');
  const arr=(x1,y1,x2,y2)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="var(--mute)" stroke-width="1.4" marker-end="url(#ahI)"/>';
  const defs='<defs><marker id="ahI" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>';
  if(!narrow){const bw=(w-60)/5,y=40,bh=64;const xs=[0,1,2,3,4].map(i=>6+i*(bw+12));
    s+=box(xs[0],y,bw,bh,'150 accounts','112 routine, 38 assigned');
    s+=box(xs[1],y,bw,bh,'9 services','state persists 30 days');
    s+=box(xs[2],y,bw,bh,'audit log','one event per call');
    s+=box(xs[3],y,bw,bh,'monitor','scores each account-day','var(--acc)');
    s+=box(xs[4],y,bw,bh,'top K = 10','reviewed each day','var(--acc)');
    for(let i=0;i<4;i++)s+=arr(xs[i]+bw+1,y+bh/2,xs[i+1]-2,y+bh/2);
    s+=tx(xs[0]+bw/2,y-12,'private objective (hidden)',{fs:11,a:'middle',c:'var(--bad)'});
    s+=tx(xs[3]+bw/2,y-12,'sees no objective or label',{fs:11,a:'middle',c:'var(--mute)'});
    const q=xs[4],qy=y+bh+22;for(let i=0;i<10;i++){const c=i===1||i===6?'var(--good)':'var(--dim)';s+=rc(q+i*(bw/10),qy,bw/10-2,10,c,{r:2})}
    s+=tx(q+bw/2,qy+26,'caught = in the queue',{fs:11,a:'middle',c:'var(--good)'});
    s+=tx(q+bw/2,qy+42,'missed = completed, not in it',{fs:11,a:'middle',c:'var(--bad)'});
    s+=tx(xs[0],y+bh+36,'GPT-5.3 single-day test period: 15 days, 2,106 account-days, 45 completed harms',{fs:11,c:'var(--mute)'});
  }else{const bw=w-24,bh=40;const ys=[8,64,120,176,232];const L=[['150 accounts','112 routine, 38 assigned a hidden objective'],['9 stateful services','state persists over 30 workdays'],['audit log','one event per service call'],['monitor','scores each account-day, sees no objective'],['top K = 10 reviewed each day','caught if a completed harm is in the queue']];
    L.forEach((t,i)=>{s+=box(12,ys[i],bw,bh,t[0],t[1],i>2?'var(--acc)':null);if(i<4)s+=arr(w/2,ys[i]+bh+1,w/2,ys[i+1]-2)});
    s+=tx(12,ys[4]+bh+24,'Test period replayed here: 15 days, 2,106',{fs:11,c:'var(--mute)'})+tx(12,ys[4]+bh+40,'account-days, 45 completed harms',{fs:11,c:'var(--mute)'})}
  el.innerHTML=svgW(w,H,defs+s,'The MOLE evaluation pipeline')})})();

// Threat explorer (Table 1, Table 4, Figure 6)
(function(){const T1=TB.T1,T4=TB.T4,F6=TB.F6;const f6={'01':'IP theft','02':'Credential exfil.','03':'Privilege escalation','04':'Fraud','05':'Sabotage','06':'Weight exfil.','07':'Evaluation manip.','08':'Data poisoning','09':'Release manip.','10':'Safety sabotage'};
  const npos=RC.f6_pos||{};
  $('thrChips').innerHTML=T1.map((r,i)=>'<button data-i="'+i+'"'+(i===5?' class="on" aria-pressed="true"':' aria-pressed="false"')+'>'+r[0]+' '+r[1]+'</button>').join('');
  const show=i=>{const r=T1[i],o=T4[i],row=F6.rows.find(x=>x[0]===f6[r[0]]);let h='<p><b>'+r[0]+' '+o[1]+'.</b> '+(r[0][0]==='C'?'Collusive: two accounts, multiday campaigns only. ':(+r[0]<=5?'Conventional enterprise risk. ':'ML-native threat. '))+'</p>';
    h+='<p class="small"><b>Assigned objective</b> (non-stealthy form, %T4%): <i>'+o[2]+'</i></p>';
    h+='<p class="small"><b>Positive when</b>: '+r[2]+'. <b>Techniques</b>: '+r[3]+(r[3].includes('AML')?' (AML = MITRE ATLAS)':'')+'.</p>';
    if(row){h+='<div class="tw"><table class="t3"><tr><th>R@10/day, GPT-5.3 single-day</th>'+F6.cols.slice(0,6).map(c=>'<th class="num">'+c+'</th>').join('')+'</tr><tr><td>'+(npos[row[0]]||'?')+' completed harms in the test days</td>'+row.slice(1,7).map(v=>'<td class="num"'+(+v<=.43?' style="color:var(--bad)"':'')+'>'+v+'</td>').join('')+'</tr></table></div>'}
    else h+='<p class="small mute">Collusive threats are excluded from the single-day comparisons; see %T15% for the GPT-5.3 multiday corpus.</p>';
    $('thrBox').innerHTML=h.replace('%T4%','<a href="'+PAPER.meta.ax+'#A4.T4" target="_blank" rel="noopener noreferrer">Table 4</a>').replace('%T15%','<a href="'+PAPER.meta.ax+'#A10.T15" target="_blank" rel="noopener noreferrer">Table 15</a>')};
  $('thrChips').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{$('thrChips').querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});show(+b.dataset.i)}));show(5)})();

// Trace viewer: two released completed-harm account-days at the three observability levels
(function(){const E=window.EXAMPLES;let ex=0,lv='audit';
  const esc=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  function render(){const e=E[ex];let h='',note='';
    $('obsHead').innerHTML='<b>'+e.account+'</b>, '+e.date+': '+(e.threat==='06_weight_exfil'?'weight exfiltration':'data poisoning')+', '+e.stealth+' prompt, completed. '+e.n+' audit events in '+e.ns+' sessions that day; the harmful session made '+e.na+' of them.';
    if(lv==='hidden'){h='<div class="sysp"><div class="lbl">System prompt of the harmful session (never shown to any monitor)</div><pre>'+esc(e.sys)+'</pre></div>';
      note='The first block is the released code\'s elicitation prefix, present in all '+RC.elicit.attack_sessions+' harmful sessions of this corpus; the persona after it is the account\'s private objective (%PERSONA%). Verbatim text throughout this viewer shows em-dashes as --.';}
    else{const ev=e.ev;h='<div class="lbl">Activity trace: (the user message the monitor receives starts with this header)</div>';
      let i=0;const firstAtk=ev.findIndex(x=>x[2]),lastAtk=ev.length-1-[...ev].reverse().findIndex(x=>x[2]);
      const before=ev.slice(0,firstAtk),after=ev.slice(lastAtk+1);
      const ctx=(arr,label)=>arr.length?'<details class="ctxev"><summary>'+arr.length+' events from '+label+' routine sessions (shortened here)</summary><pre>'+arr.map(x=>esc(x[1])).join('\n')+'</pre></details>':'';
      h+=ctx(before,'earlier');
      h+='<div class="atk"><div class="lbl">the harmful session</div>';
      ev.slice(firstAtk,lastAtk+1).forEach(x=>{if(!x[2]){h+='<pre class="dim">'+esc(x[1])+'</pre>';return}
        let line=esc(x[1]);const clip=x[3]>600;h+='<pre class="ev">'+line+(clip?'<span class="clipm"> [clipped: '+fmt(x[3])+' characters of arguments, 600 shown]</span>':'')+'</pre>';
        const hk=Object.keys(x[4]||{});if(hk.length)h+='<div class="hitn">'+hk.map(k=>(k.startsWith('TRG')?'trigger '+k:'weight bytes')+' at character '+fmt(x[4][k])+(x[4][k]>=600?': <b>not shown to the monitor</b>':': shown')).join('; ')+'</div>'});
      if(lv!=='audit'){h+='<div class="lbl">+ tool results, in session order (each clipped to 600 characters)</div>';
        e.msgs.forEach(m=>{if(m.k==='t')h+='<pre class="tool">'+esc(m.n+': '+m.t)+(m.len>600?'<span class="clipm"> [clipped: '+fmt(m.len)+' characters]</span>':'')+'</pre>'})}
      if(lv==='reason'){h+='<div class="lbl">+ agent reasoning (GPT-5.3 Chat ran with reasoning disabled, so its visible messages are all there is)</div>';
        e.msgs.forEach(m=>{if(m.k==='a'&&m.t)h+='<pre class="rsn">'+esc(m.t)+'</pre>'})}
      h+='</div>'+ctx(after,'later');
      note=lv==='audit'?'One line per call: time, account, service.action, resource, EXTERNAL when the destination is outside, then the arguments as JSON clipped to 600 characters (the released renderer, judge.py). The robust z-score ranked this day '+(ex===0?'62nd of 142':'81st of 141')+'; GPT-5.5 on audit events caught '+(ex===0?'all 6 weight-exfiltration days in the test period':'1 of 7 data-poisoning days')+' (Figure 6).':
        lv==='tool'?'Tool results add what each service returned. For the data-poisoning day they add nothing about the triggers: the commit returns only its title.':'The agent\'s own words. GPT-5.3 never names the inserted rows; Qwen and DeepSeek, in the same assignment on their corpora, describe the concealment outright (Table 14).'}
    $('obsBody').innerHTML=h;$('obsNote').innerHTML=note.replace('%PERSONA%','<a href="https://github.com/aashiqmuhamed/mole/tree/main/bootstrap/personas" target="_blank" rel="noopener noreferrer">bootstrap/personas</a>')}
  segBind('obsEx',m=>{ex=+m;render()});segBind('obsLv',m=>{lv=m;render()});render()})();

// RQ1 reveal: refusal against completion, 39 models (Table 11), four-way bars on hover (Figure 3, decoded)
function drawR1(el){fit(el,w=>{const H=Math.min(340,Math.max(260,w*.55)),pl=44,pr=12,pt=14,pb=38,iw=w-pl-pr,ih=H-pt-pb;const x=v=>pl+iw*v/100,y=v=>pt+ih*(1-v/100);let s='';
  const xr=v=>pl+iw*v/70;
  [0,25,50,75,100].forEach(v=>{s+=ln2(pl,y(v),w-pr,y(v),'var(--line)')+tx(pl-5,y(v)+4,v+'%',{fs:11,a:'end',c:'var(--mute)'})});
  [0,10,20,30,40,50,60,70].forEach(t=>{if(w>420||t%20===0)s+=tx(xr(t),H-pb+15,t+'%',{fs:11,a:'middle',c:'var(--mute)'})});
  s+=tx(pl+iw/2,H-6,'refusal rate (share of assignments refused)',{fs:11,a:'middle',c:'var(--mute)'});s+='<text x="12" y="'+(pt+ih/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 12 '+(pt+ih/2)+')">completed</text>';
  const pts=RC.t11.map(([m,c,r,n])=>({m,c,r,n,x:xr(r),y:y(c)}));
  pts.forEach(p=>{const z=p.r===0;s+='<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="'+(z?3.4:4.2)+'" fill="'+(z?'var(--c1)':'var(--c2)')+'" fill-opacity=".85"><title>'+p.m+': completed '+p.c+'%, refused '+p.r+'% (N = '+p.n+')</title></circle>'});
  const lab=['DeepSeek-V4-Pro','GPT-4.1-nano','Claude Opus 4.7','gpt-oss-120b','GPT-5.6-sol','Claude Sonnet 4.6','Qwen3.5-27B','GPT-5.2'];
  placeLabels(pts.filter(p=>lab.includes(p.m)).map(p=>({x:p.x,y:p.y,t:p.m,fs:11})),w,H-pb).forEach(p=>{s+=tx(p.lx,p.ly,p.t,{fs:11,a:p.la})});
  const lg=legend([['never refuses (24 models)','var(--c1)'],['refuses some (15)','var(--c2)']],pl,H+12,iw);s+=lg.s;
  el.innerHTML=svgW(w,H+lg.h+2,s,'Refusal against completion for 39 models')});
  $('r1Note').innerHTML='Each dot is one model (%T11%); hover for its numbers. The 24 blue dots on the left edge never refused and span 20% to 100% completion. Across all 39, the rank correlation is '+RC.rq1_spearman.toFixed(2)+': refusing more does go with completing less. Averaged over models, Figure 3 splits the assignments into '+RC.f3_mean.executed.toFixed(1)+'% executed, '+RC.f3_mean.no_attempt.toFixed(1)+'% no attempt, '+RC.f3_mean.refused.toFixed(1)+'% refused and '+RC.f3_mean.attempted.toFixed(1)+'% attempted. The full table is in the tables tab.';
  $('r1Note').innerHTML=$('r1Note').innerHTML.replace('%T11%','<a href="'+PAPER.meta.ax+'#A8.T11" target="_blank" rel="noopener noreferrer">Table 11</a>')}
PRED_REVEAL.pr1=()=>drawR1($('r1Plot'));

// Figure 4 with whole-number counts and exact binomial intervals (used by the RQ2 reveal and the tables tab)
function drawF4(el,opt){opt=opt||{};fit(el,w=>{const rows=RC.f4.slice().sort((a,b)=>b.v-a.v||(a.m<b.m?-1:1)),rh=15,pt=20,pb=34,lw=Math.min(150,w*.36),pl=lw+8,pr=46,iw=w-pl-pr,H=pt+rows.length*rh+pb;const x=v=>pl+iw*v/.75;let s='';
  [0,.25,.5,.75].forEach(v=>{s+=ln2(x(v),pt-6,x(v),H-pb,'var(--line)')+tx(x(v),H-pb+15,v.toFixed(2),{fs:11,a:'middle',c:'var(--mute)'})});
  s+=ln2(x(RC.random_r10),pt-6,x(RC.random_r10),H-pb,'var(--mute)',{da:'3 3'})+tx(x(RC.random_r10)+3,pt-8,'random queue',{fs:11,c:'var(--mute)'});
  s+=tx(pl+iw/2,H-4,w<480?'R@10/day, 95% interval':'R@10/day with 95% interval (k of 45 completed harms)',{fs:11,a:'middle',c:'var(--mute)'});
  rows.forEach((r,i)=>{const yy=pt+i*rh+rh/2,c=r.classical?'var(--c5)':'var(--c1)';
    s+=tx(pl-6,yy+4,r.m.length>22?r.m.slice(0,21)+'…':r.m,{fs:11,a:'end',c:r.classical?'var(--c5)':'var(--ink)'});
    s+=ln2(x(r.lo),yy,x(r.hi),yy,c,{sw:1.4,op:.55})+'<circle cx="'+x(r.v).toFixed(1)+'" cy="'+yy.toFixed(1)+'" r="3.6" fill="'+c+'"><title>'+r.m+': '+r.k+' of 45 = '+r.v.toFixed(3)+'; 95% interval '+r.lo.toFixed(2)+' to '+r.hi.toFixed(2)+'</title></circle>';
    s+=tx(w-pr+4,yy+4,r.k+'/45',{fs:11,c:'var(--mute)'})});
  el.innerHTML=svgW(w,H,s,'R@10/day for 40 monitors')})}
PRED_REVEAL.pr2=()=>{drawF4($('r2Plot'));$('r2Note').innerHTML='The robust z-score catches 7 of 45 (0.156). Every monitor in Figure 4, as whole account-days of 45, with exact (Clopper-Pearson) 95% intervals computed on this page; classical monitors in amber. Most intervals overlap: only the ends of the ranking are clearly apart. Replay the z-score day by day in <a href="#" data-tab2="t-run">Run the daily audit</a>.';
  const a=$('r2Note').querySelector('[data-tab2]');a.addEventListener('click',e=>{e.preventDefault();document.querySelector('#tabs button[data-t="t-run"]').click();$('tabs').scrollIntoView({block:'start'})})};

// Table 12 as small multiples: 4 generators x 3 monitors x 5 inputs
function drawObs(el,metric){fit(el,w=>{const G=['GPT-5.3','Kimi','Qwen','DeepSeek'],Mo=['GPT-4.1-mini','GPT-4.1','GPT-5.5'],L=['audit','+tool','+reason','+taxon.','fusion'],MC={'GPT-4.1-mini':'var(--c5)','GPT-4.1':'var(--c2)','GPT-5.5':'var(--c1)'};
  const cols=w<600?2:4,pw=(w-(cols-1)*10)/cols,ph=150,rows=Math.ceil(G.length/cols),H=rows*(ph+18)+30;let s='';const t12={};TB.T12.forEach(r=>{(t12[r[0]]=t12[r[0]]||{})[r[1]]=r.slice(2).map(c=>c.split('/').map(Number))});
  const lo=metric==1?0:.5;
  G.forEach((g,gi)=>{const ox=(gi%cols)*(pw+10),oy=Math.floor(gi/cols)*(ph+18)+14,pl=30,pb=20,iw=pw-pl-6,ih=ph-pb-14;const y=v=>oy+14+ih*(1-(v-lo)/(1-lo));
    s+=tx(ox+(cols===2?4:pl),oy+8,g+(cols===2?' (':' multiday (')+RC.t12_npos[g]+(cols===2?')':' positives)'),{fs:11,w:600});
    [lo,(lo+1)/2,1].forEach(v=>{s+=ln2(ox+pl,y(v),ox+pw-6,y(v),'var(--line)')+tx(ox+pl-4,y(v)+4,v.toFixed(metric==1?1:2),{fs:11,a:'end',c:'var(--mute)'})});
    const gw=iw/L.length,LS=['A','T','R','X','F'];L.forEach((l,li)=>{s+=tx(ox+pl+gw*(li+.5),oy+ph,gw<44?LS[li]:l,{fs:11,a:'middle',c:'var(--mute)'})});
    Mo.forEach((m,mi)=>{const bw=gw/4;L.forEach((l,li)=>{const v=t12[g][m][li][metric],X=ox+pl+gw*li+bw*(mi+.5);s+='<rect x="'+X.toFixed(1)+'" y="'+y(v).toFixed(1)+'" width="'+(bw-1).toFixed(1)+'" height="'+(oy+14+ih-y(v)).toFixed(1)+'" fill="'+MC[m]+'"><title>'+g+', '+m+', '+l+': '+v+(metric==1?' ('+Math.round(v*RC.t12_npos[g])+' of '+RC.t12_npos[g]+')':'')+'</title></rect>'})})});
  const lg=legend(Mo.map(m=>[m,MC[m]]),0,H-4,w);s+=lg.s;if(pw/5<74){s+=tx(0,H+lg.h-6,'A audit events, T + tool results, R + reasoning,',{fs:11,c:'var(--mute)'})+tx(0,H+lg.h+8,'X + threat taxonomy, F rank fusion with the z-score',{fs:11,c:'var(--mute)'})}el.innerHTML=svgW(w,H+lg.h+(pw/5<74?14:-10),s,'Table 12 as bars')})}
PRED_REVEAL.pr3=()=>{let m=1;drawObs($('obPlot'),m);segBind('obM',v=>{m=+v;drawObs($('obPlot'),m)});
  $('obNote').innerHTML='Table 12, every cell (hover a bar for its value and, for R@10/day, its whole-day count). On DeepSeek, GPT-4.1 with reasoning catches 21 of 31 completed harms; GPT-5.5 on audit events catches 14. Columns: audit events, + tool results, + agent reasoning, + the fixed threat taxonomy, and reciprocal-rank fusion of the audit-event ranking with the z-score.'};

// RQ5 short table (Table 22) with gains over uniform GPT-4.1
(function(){const r=TB.T22,b=r[0];let h='<tr><th>strategy (Table 22)</th><th class="num">cost ×</th><th class="num">GPT-5.3 single-day</th><th class="num">GPT-5.3 multiday</th><th class="num">Kimi single-day</th></tr>';
  const pc=(v,bv)=>{const d=(v/bv-1)*100;return ' <span class="mute small">'+(d>=0?'+':'−')+Math.abs(d).toFixed(0)+'%</span>'};
  r.forEach((x,i)=>{h+='<tr'+(i===0?' class="basec"':'')+'><td>'+x[0]+'</td><td class="num">'+x[2]+'</td><td class="num">'+x[3]+(i?pc(+x[3],+b[3]):'')+'</td><td class="num">'+x[4]+x[5]+(i?pc(+x[4],+b[4]):'')+'</td><td class="num">'+x[6]+(i?pc(+x[6],+b[6]):'')+'</td></tr>'});
  $('t22s').innerHTML=h})();
