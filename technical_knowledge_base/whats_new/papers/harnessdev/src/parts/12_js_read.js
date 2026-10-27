// ---- The paper tab, part 1: roles diagram, the six modules, distance to the human references ----
const PT=window.PAPER.tables,RC=window.PAPER.rc,DV=RC.derived;
const CR=['Opus 4.8','GPT-5.5','Gemini 3.1 Pro','DeepSeek V4 Pro','Qwen 3.7 Max','Seed 2.0 Pro'];
const CCOL={'Opus 4.8':'var(--c2)','GPT-5.5':'var(--c4)','Gemini 3.1 Pro':'var(--c1)','DeepSeek V4 Pro':'var(--c6)','Qwen 3.7 Max':'var(--c3)','Seed 2.0 Pro':'var(--c5)'};
const BM=[['swe','SWE-Pro'],['term','Terminal-Bench 2.1'],['mle','MLE-bench'],['eq','EQ-Bench3'],['bc','BrowseComp']];
const rowOf=(t,n)=>PT[t].rows.find(r=>r.row===n);
const REF={swe:['Public coding-agent setup','Claude Fable 5',true],term:['OpenAI agent setup','GPT-5.6 Sol',true],mle:['MLEvolve','Gemini 3.1',false],eq:['Kimi Writer','Opus 4.8',false],bc:['OpenAI browsing stack','GPT-5.6 Sol',true]};

// roles: who builds, who runs, who scores
(function(){const host=$('rolesSvg');if(!host)return;let mode='self';
  const M={self:{c:['Creator L<tspan font-size="11" dy="3">C</tspan>','Opus 4.8, in Claude Code'],h:['Harness H, frozen','built by that creator'],e:['Executor L<tspan font-size="11" dy="3">E</tspan> = L<tspan font-size="11" dy="3">C</tspan>','the same Opus 4.8'],cap:'<b>Self-Eval</b>: the creator runs its own harness (L<sub>E</sub> = L<sub>C</sub>). This is how a user would deploy it, and it measures the whole creator and harness system: harness design, executor capability and the fit between them («Table 3|ax:S4.T3»).'},
    uni:{c:['Creator L<tspan font-size="11" dy="3">C</tspan>','any of the six'],h:['Harness H, frozen','built by that creator'],e:['Executor L<tspan font-size="11" dy="3">E</tspan>','always Gemini 3.1 Pro'],cap:'<b>Unified-Eval</b>: one fixed executor, Gemini 3.1 Pro, runs every creator\'s harness, so differences between harnesses are not differences between executors («Table 4|ax:S4.T4»). Gemini\'s own harness is the control, and it is the one harness here fitted to its executor.'},
    hum:{c:['No creator','engineers built it'],h:['Human-engineered harness','e.g. OpenAI agent setup'],e:['Its own paired model','e.g. GPT-5.6 Sol'],cap:'<b>Human reference</b>: the best public system-level result the authors could verify per benchmark («Table 9|ax:A2.T9»). Both the harness and the model differ from the creators\' runs, so it is a distance to a mature system, not a paired control («Appendix D.1|ax:A4.SS1»).'}};
  function draw(w){const m=M[mode],wide=w>=620;const bw=wide?Math.min(170,(w-60)/4):Math.min(200,(w-30)/2),bh=58;
    const pos=wide?[[0,0],[1,0],[2,0],[3,0]]:[[0,0],[1,0],[0,1],[1,1]];const gx=wide?(w-4*bw)/3:(w-2*bw),gy=34;
    const P=pos.map(([i,j])=>[i*(bw+gx),j*(bh+gy)+6]);const H=(wide?bh:2*bh+gy)+14;
    const cls=['boxa','box','boxc','box'],tt=[m.c,m.h,m.e,['Evaluator J','fixed per benchmark']];
    let s='';P.forEach(([x,y],i)=>{const hum=mode==='hum'&&i===0;s+=rc(x,y,bw,bh,hum?'var(--soft)':(i===0?'var(--acc2)':i===2?'var(--open2)':'var(--soft)'),{s:hum?'var(--dim)':'var(--line)',da:hum?'4 3':null,r:7});
      s+=tx(x+bw/2,y+24,tt[i][0],{a:'middle',fs:13,w:600,c:hum?'var(--mute)':null})+tx(x+bw/2,y+43,tt[i][1],{a:'middle',fs:11.5,c:'var(--mute)'})});
    const head=(x1,y1,x2,y2)=>{const a=Math.atan2(y2-y1,x2-x1),l=8;return '<path d="M'+x2.toFixed(1)+','+y2.toFixed(1)+'L'+(x2-l*Math.cos(a-.45)).toFixed(1)+','+(y2-l*Math.sin(a-.45)).toFixed(1)+'L'+(x2-l*Math.cos(a+.45)).toFixed(1)+','+(y2-l*Math.sin(a+.45)).toFixed(1)+'Z" fill="var(--mute)"/>'};
    const line=(x1,y1,x2,y2)=>ln2(x1,y1,x2,y2,'var(--mute)',{sw:1.4})+head(x1,y1,x2,y2);
    const arr=(a,b)=>{const [x1,y1]=P[a],[x2,y2]=P[b];return y1===y2?line(x1+bw+3,y1+bh/2,x2-4,y2+bh/2):line(x1+bw/2,y1+bh+3,x2+bw/2,y2-4)};
    s+=arr(0,1)+(wide?arr(1,2):line(P[1][0]+bw/2,P[1][1]+bh+3,P[2][0]+bw-10,P[2][1]-4))+arr(2,3);
    host.innerHTML=svgW(w,H,s,'Who builds, who runs and who scores the harness');}
  const cap=()=>{$('rolesCap').innerHTML=M[mode].cap.replace(/«([^|«»]+)\|ax:([^»]+)»/g,(a,t,u)=>A(PAPER.meta.ax+'#'+u,t))};
  segBind('rolesM',m=>{mode=m;refit(host);cap()});cap();fit(host,draw)})();

// the six modules: what the seed has, what the 18 created code harnesses ended up with
(function(){const host=$('modSvg');if(!host)return;let mode='seed';
  const ROWS=[['E','Execution loop','none: one non-acting pass, then stop',18,'18 of 18 have an explicit loop'],
    ['T','Tools','passive primitives (paths, files, search, process), no tool policy',13,'complete in 13 of 18'],
    ['C','Context','none',null,'not reported separately for code'],
    ['S','State and memory','none',1,'11 define a State class; 1 can save state; 1 checkpoints; 0 checkpoint events in 26,679 runs'],
    ['L','Lifecycle and recovery','none: no retry, recovery or stop rule',13,'complete in 13 of 18'],
    ['V','Verification','audit writers only, no verifier',15,'complete in 15 of 18, mostly syntactic']];
  function draw(w){const narrow=w<560,lw=narrow?0:150,rh=narrow?62:34,H=ROWS.length*rh+8;const x0=lw+30,bw=w-x0-4;let s='';const fit2=(t,room)=>t.length*11*.56>room?t.slice(0,Math.floor(room/(11*.56))-1)+'…':t;
    ROWS.forEach((r,i)=>{const y=i*rh+4;s+=rc(0,y+(narrow?0:4),24,24,'var(--acc2)',{r:5})+tx(12,y+(narrow?17:21),r[0],{a:'middle',fs:13,w:700});
      s+=tx(32,y+(narrow?17:21),r[1],{fs:12.5,w:narrow?600:400});
      const bx=narrow?30:x0,bww=narrow?w-34:bw,by=narrow?y+25:y+8,bh=narrow?12:18;
      s+=rc(bx,by,bww,bh,'var(--soft)',{s:'var(--line)',r:3});
      const lab=mode==='built'?(r[3]!=null?r[3]+'/18: ':'')+r[4]:r[2];
      if(mode==='built'&&r[3]!=null)s+=rc(bx,by,Math.max(4,bww*r[3]/18),bh,r[0]==='S'?'var(--bad)':'var(--good)',{r:3,op:.85});
      if(narrow)s+=tx(bx,by+bh+15,fit2(lab,bww),{fs:11,c:mode==='built'?'var(--ink)':'var(--mute)'});
      else{const fill=mode==='built'&&r[3]!=null?bww*r[3]/18:0,inside=fill>lab.length*11*.56+12;
        s+=tx(inside?bx+6:bx+fill+6,by+bh/2+4,fit2(lab,inside?fill-12:bww-fill-12),{fs:11,c:inside?'#fff':(mode==='built'?'var(--ink)':'var(--mute)')})}});
    host.innerHTML=svgW(w,H,s,'The six harness modules')}
  const cap=()=>{$('modCap').innerHTML=mode==='seed'?'What the seed provides for each job: none of them as working policy, so it scores zero everywhere and the creator must add all six («Appendix C.1»).':'Counts over the 18 Creation code harnesses (six creators, three each), from §4.2 and Figure 5. Bars show complete implementations; state is the gap.';$('modCap').innerHTML=$('modCap').innerHTML.replace('«Appendix C.1»',A(PAPER.meta.ax+'#A3.SS1','Appendix C.1'))};
  segBind('modM',m=>{mode=m;refit(host);cap()});cap();fit(host,draw)})();

// distance to the human references (Figure 4), in the reveal of the first prediction
(function(){let mode='self';const host=$('gapPlot');if(!host)return;
  function draw(w){const hum=rowOf('T3','Human reference');const T=mode==='self'?'T3':'T4';const narrow=w<520;
    const lw=narrow?92:120,x0=lw,x1=w-(narrow?78:64),mx=150,sx=v=>x0+(x1-x0)*Math.min(v,mx)/mx;const gh=24,bh=13,gap=4;let s='',y=6;
    BM.forEach(([k,n])=>{const ref=REF[k];s+=tx(0,y+13,n,{fs:13,w:700})+tx(narrow?0:150,y+(narrow?28:13),'ref '+hum[k+'_p']+(ref[2]?'*':'')+': '+ref[0]+' + '+ref[1],{fs:11,c:'var(--mute)'});y+=narrow?36:gh;
      const top=y;CR.forEach(c=>{const r=rowOf(T,c),v=r[k],p=100*v/hum[k];s+=tx(lw-6,y+bh-2,c.replace(' Pro','').replace(' Max',''),{fs:11,a:'end'});
        s+=rc(x0,y,sx(p)-x0,bh,CCOL[c],{r:2,op:.9})+tx(sx(p)+4,y+bh-2,fmt(p,0)+'% ('+r[k+'_p']+(r[k+'_f']||'')+')',{fs:11,c:'var(--mute)'});y+=bh+gap});
      s+=ln2(sx(100),top-3,sx(100),y,'var(--ink)',{da:'4 3',sw:1.2});y+=10});
    s+=tx(sx(100),y+10,'100% = reference',{fs:11,a:'middle',c:'var(--mute)'});
    host.innerHTML=svgW(w,y+16,s,'Each creator as a percentage of the human reference')}
  segBind('gapM',m=>{mode=m;refit(host)});
  PRED_REVEAL.pr1=()=>fit(host,draw)})();
