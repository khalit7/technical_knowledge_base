// ---- The paper tab: Table 1 bars, Figures 4 and 5, the grading replay and scatter, alpha, results explorer, pairs, cost ----
const TB=PAPER.tables, RC=PAPER.rc;
const pc=s=>parseFloat(String(s).replace('%',''));
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function seg2(id,cb){const el=$(id);if(!el)return;el.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{el.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});cb(b.dataset.m)}))}
// horizontal grouped bars: rows [{n, vals:[...]}], series [{n,c}], x range [a,b], refs [{v,t}]
function hbars(w,rows,series,xr,refs,fmtv){const pl=Math.min(150,Math.max(96,w*.28)),pr=44,bh=10,gap=8,gh=series.length*bh+gap,top=34,H=top+rows.length*gh+26;
  const X=v=>pl+(w-pl-pr)*(v-xr[0])/(xr[1]-xr[0]);let s='';
  const lg=legend(series.map(x=>[x.n,x.c]),pl,14,w-pl);s+=lg.s;const top2=top+Math.max(0,lg.h-18);
  const Y=i=>top2+i*gh;const H2=top2+rows.length*gh+26;
  for(let v=xr[0];v<=xr[1]+1e-9;v+=(xr[1]-xr[0])/5){s+=ln2(X(v),top2-4,X(v),H2-22,'var(--line)')+tx(X(v),H2-8,fmtv?fmtv(v,1):fmt(v,0),{fs:11,a:'middle',c:'var(--mute)'})}
  (refs||[]).forEach(r=>{s+=ln2(X(r.v),top2-6,X(r.v),H2-22,'var(--mute)',{da:'4 3'})+tx(X(r.v)+3,top2-8+(r.dy||0),r.t,{fs:11,c:'var(--mute)'})});
  rows.forEach((r,i)=>{s+=tx(pl-6,Y(i)+series.length*bh/2+4,r.n,{fs:11.5,a:'end'});
    r.vals.forEach((v,j)=>{if(v==null)return;const y=Y(i)+j*bh;s+=rc(X(xr[0]),y,X(v)-X(xr[0]),bh-2,series[j].c,{r:2})+tx(X(v)+3,y+bh-2.5,fmtv?fmtv(v):fmt(v,1),{fs:11,c:'var(--mute)'})})});
  return svgW(w,H2,s,'bar chart')}

// Table 1 (predict reveal)
let t1m='g';
function drawT1(){const el=$('t1Bars');fit(el,w=>{const t=TB.t1[t1m==='g'?'vs_gpt4o':'vs_claude'];
  el.innerHTML=hbars(w,t.map(r=>({n:r[0],vals:r.slice(1).map(pc)})),[{n:'Direct',c:'var(--c5)'},{n:'Own analysis (CoT)',c:'var(--c2)'},{n:"GPT-4o's analysis",c:'var(--c1)'}],[0,80],[{v:60.7,t:'GPT-4o vs Claude 60.7%'}],(v,ax)=>fmt(v,ax?0:1)+'%')})}
PRED_REVEAL['pr-t1']=drawT1;seg2('t1M',m=>{t1m=m;refit($('t1Bars'))});

// Figures 4 and 5
let fbm='pos';
function drawFB(){const el=$('fbSvg');fit(el,w=>{const D=REL.fig[fbm],names=Object.keys(D),cols=['var(--c3)','var(--c5)','var(--c4)','var(--c2)','var(--c1)'];
  const pl=40,pr=8,pt=10,H=250,pb=40;const lg=legend(names.map((n,i)=>[n,cols[i]]),pl,pt+10,w-pl-pr);const top=pt+lg.h+6;
  const X=i=>pl+(w-pl-pr)*(i+.5)/7,Y=v=>top+(H-top-pb)*(1-v/0.8),bw=Math.max(3,(w-pl-pr)/7*0.8/names.length);let s=lg.s;
  [0,.2,.4,.6,.8].forEach(v=>{s+=ln2(pl,Y(v),w-pr,Y(v),'var(--line)')+tx(pl-5,Y(v)+4,fmt(v*100,0)+'%',{fs:11,a:'end',c:'var(--mute)'})});
  for(let i=0;i<7;i++){s+=tx(X(i),H-pb+16,String(i+1),{fs:11,a:'middle',c:'var(--mute)'});
    names.forEach((n,j)=>{const v=D[n][i],x=X(i)-bw*names.length/2+j*bw;s+=rc(x,Y(v),bw-1,Y(0)-Y(v),cols[j],{r:1})+'<title>'+n+': '+fmt(v*100,1)+'%</title>'})}
  s+=tx((pl+w-pr)/2,H-6,fbm==='pos'?(w<560?'Position of the checklist item':'Position of the checklist item (earlier answers forced to Yes or to No)'):'Number of samples',{fs:11,a:'middle',c:'var(--mute)'});
  el.innerHTML=svgW(w,H,s,'Figure '+(fbm==='pos'?5:4)+' rebuilt')})}
seg2('fbM',m=>{fbm=m;refit($('fbSvg'))});onTab('t-read',drawFB);

// Replay a real grading
let rq=0,rj='p3',rs='soft';
const SAM=REL.samples;
const tagShort=t=>({'Information seeking':'Who is that YouTuber?','Creative Writing':'Two new stanzas','Data Analysis':'XPS results','Math':'A modular arithmetic proof'})[t]||t;
function itemScore(p){return rs==='soft'?p:(p>0.5?1:0)}
function drawRpl(){const S=SAM[rq],P=S[rj],ok=P.map(x=>x!=null);const v=P.map(x=>x==null?null:itemScore(x));const vv=v.filter(x=>x!=null);
  const mean=vv.reduce((a,b)=>a+b,0)/vv.length,score=9*mean+1;
  let h='<div class="cols2"><div><div class="small mute">Query ('+esc(S.tag)+')</div><div class="sent" style="display:block;white-space:pre-wrap;font-size:13.5px">'+esc(S.q)+'</div></div>';
  h+='<div><details class="mist"><summary>Llama 3 8B\'s answer ('+fmt(S.resp.length)+' characters)</summary><div class="b" style="white-space:pre-wrap">'+esc(S.resp)+'</div></details>';
  h+='<details class="mist"><summary>GPT-4o\'s grade: <b>'+S.g+'</b> of 10, and its analysis</summary><div class="b"><p><b>Strengths.</b> '+esc(S.gs)+'</p><p><b>Weaknesses.</b> '+esc(S.gw)+'</p></div></details></div></div>';
  h+='<div class="small mute" style="margin-top:8px">GPT-4o\'s checklist for this query, and the '+(rj==='p3'?'Qwen2.5-3B':'Qwen2.5-0.5B')+' judge\'s answer to each item, asked separately:</div><div class="bars">';
  S.ck.forEach((c,i)=>{const p=P[i];const val=p==null?'missing':rs==='soft'?fmt(p,2):(p>0.5?'Yes':'No');const w=p==null?0:(rs==='soft'?p:(p>0.5?1:0))*100;
    h+='<div class="row" style="grid-template-columns:minmax(0,1fr) minmax(60px,26%) 4.2em"><div class="nm" style="white-space:normal;line-height:1.3">'+(i+1)+'. '+esc(c)+'</div><div class="track"><div class="fill" style="width:'+w.toFixed(1)+'%;background:'+(rs==='soft'?'var(--c1)':(p>0.5?'var(--good)':'var(--bad)'))+'"></div>'+(rs==='soft'?'<div style="position:absolute;left:50%;top:0;bottom:0;border-left:1px dashed var(--mute)"></div>':'')+'</div><div class="val">'+val+'</div></div>'});
  const pv=P.filter(x=>x!=null),soft=9*pv.reduce((a,b)=>a+b,0)/pv.length+1,hard=9*pv.filter(x=>x>0.5).length/pv.length+1;
  h+='</div><div class="out">'+stat('RocketEval score',fmt(score,1)+' / 10','9 × mean of '+vv.length+' items + 1')+stat("GPT-4o's grade",S.g+' / 10','CoT judge, released')+stat(rs==='soft'?'With hard Yes/No instead':'With probabilities instead',fmt(rs==='soft'?hard:soft,1)+' / 10','same answers, other reading')+'</div>';
  $('rplBody').innerHTML=h}
(function(){const bar=$('rplQ');bar.innerHTML=SAM.map((s,i)=>'<button data-i="'+i+'"'+(i===0?' class="on"':'')+'>'+tagShort(s.tag)+'</button>').join('');
  bar.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{bar.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));rq=+b.dataset.i;drawRpl()}));
  seg2('rplJ',m=>{rj=m;drawRpl()});seg2('rplS',m=>{rs=m;drawRpl();refit($('scSvg'))});drawRpl()})();
// scatter of all released gradings
let scj=1;
(function(){const el=$('scJ');el.innerHTML=REL.judges.map((j,i)=>'<button data-m="'+i+'"'+(i===scj?' class="on" aria-pressed="true"':' aria-pressed="false"')+'>'+j.judge+' on '+j.model+'</button>').join('');seg2('scJ',m=>{scj=+m;refit($('scSvg'));scStats()})})();
function scStats(){const r=RC.judges[scj];$('scOut').innerHTML=stat('Correlation with GPT-4o, probabilities',fmt(r.r_soft,2),'Pearson, '+fmt(r.n)+' responses')+stat('Correlation, hard Yes/No',fmt(r.r_hard,2),'same items, token instead of probability')+stat('Items between 0.3 and 0.7',fmt(100*r.mid,0)+'%','how often the judge hedges')+stat('Mean score',fmt(r.mean_soft,1)+' against '+fmt(r.mean_g,1),"this judge's scale against GPT-4o's")}
function drawSc(){const el=$('scSvg');fit(el,w=>{const J=REL.judges[scj],H=Math.min(300,Math.max(220,w*.5)),pl=40,pr=10,pt=10,pb=34;
  const X=v=>pl+(w-pl-pr)*(v-1)/9,Y=v=>pt+(H-pt-pb)*(1-(v-0.5)/10);const rnd=mulberry32(7);let s='';
  for(let v=1;v<=10;v++){s+=ln2(X(v),pt,X(v),H-pb,'var(--line)')+tx(X(v),H-pb+14,String(v),{fs:11,a:'middle',c:'var(--mute)'})}
  [1,4,7,10].forEach(v=>{s+=tx(pl-5,Y(v)+4,String(v),{fs:11,a:'end',c:'var(--mute)'})});
  const col=rs==='soft'?'var(--c1)':'var(--c2)';
  J.rows.forEach(r=>{const x=rs==='soft'?r[0]:r[1],y=r[2]+(rnd()-.5)*.7;s+='<circle cx="'+X(x).toFixed(1)+'" cy="'+Y(y).toFixed(1)+'" r="2" fill="'+col+'" opacity=".4"/>'});
  s+=tx((pl+w-pr)/2,H-4,J.judge+' score of '+J.model+"'s answers ("+(rs==='soft'?'probabilities':'hard Yes/No')+')',{fs:11,a:'middle',c:'var(--mute)'});
  s+='<text x="12" y="'+((pt+H-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 12 '+((pt+H-pb)/2)+')">GPT-4o grade</text>';
  el.innerHTML=svgW(w,H,s,'scatter')})}
onTab('t-read',()=>{drawSc();scStats()});

// alpha widget
const AL=Array(10).fill(8);
const alpha=L=>{const c={};L.forEach(x=>c[x]=(c[x]||0)+1);let H=0;Object.values(c).forEach(n=>{const p=n/L.length;H-=p*Math.log(p)});return H/Math.log(10)};
function drawAl(){$('alLab').innerHTML=AL.map((v,i)=>'<button data-i="'+i+'" title="Training model '+(i+1)+': click to raise its grade">'+v+'</button>').join('');
  $('alLab').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{const i=+b.dataset.i;AL[i]=AL[i]%10+1;drawAl()}));
  const a=alpha(AL);$('alOut').innerHTML=stat('α for these ten grades',fmt(a,2),'entropy / ln 10')+stat('Score',fmt(1-a,2)+' × mean + '+fmt(a,2)+' × trees','Eq. 4')+stat('Distinct grades',String(new Set(AL).size),'of 10 models');
  const el=$('alHist');fit(el,w=>{const h=REL.alpha.hist,H=170,pl=40,pr=8,pt=12,pb=34,mx=Math.max(...h);const X=i=>pl+(w-pl-pr)*i/10,Y=v=>pt+(H-pt-pb)*(1-v/mx);let s='';
    [0,100,200].forEach(v=>{if(v<=mx)s+=ln2(pl,Y(v),w-pr,Y(v),'var(--line)')+tx(pl-5,Y(v)+4,String(v),{fs:11,a:'end',c:'var(--mute)'})});
    h.forEach((v,i)=>{s+=rc(X(i)+1,Y(v),X(1)-X(0)-2,Y(0)-Y(v),(a>=i/10&&(a<(i+1)/10||(i===9&&a>=1)))?'var(--c2)':'var(--c1)',{r:1})+'<title>α '+fmt(i/10,1)+' to '+fmt((i+1)/10,1)+': '+v+' queries</title>'});
    for(let i=0;i<=10;i+=2)s+=tx(X(i),H-pb+14,fmt(i/10,1),{fs:11,a:'middle',c:'var(--mute)'});
    s+=tx((pl+w-pr)/2,H-4,'α on the 1,015 WildBench queries (yours in orange)',{fs:11,a:'middle',c:'var(--mute)'});el.innerHTML=svgW(w,H,s,'alpha histogram')})}
PRED_REVEAL['pr-alpha']=()=>{drawAl();
  const dist=REL.alpha.distinct,ks=Object.keys(dist).map(Number),tot=ks.reduce((a,k)=>a+dist[k],0);let rnd=mulberry32(11);
  $('alR').onclick=()=>{let u=rnd()*tot,k=ks[0];for(const kk of ks){u-=dist[kk];if(u<=0){k=kk;break}}
    const vals=[];while(vals.length<k){const g=3+Math.floor(rnd()*7);if(!vals.includes(g))vals.push(g)}for(let i=0;i<10;i++)AL[i]=i<k?vals[i]:vals[Math.floor(rnd()*k)];drawAl()};
  $('alS').onclick=()=>{AL.fill(8);drawAl()};$('alU').onclick=()=>{for(let i=0;i<10;i++)AL[i]=i+1;drawAl()}};

// Results explorer: Table 3 (Spearman) or Table 2 (agreement), baseline -> Ours (Unsup.), Sup. marker
let resm='list',resb='cot';
function drawRes(){const el=$('resSvg');fit(el,w=>{const L=resm==='list';const T=L?TB.t3:TB.t2;const bi={cot:0,direct:1,fixed:2}[resb];
  const val=(r,k)=>{const v=L?r[1+2*k+1]:r[1+k];return v==null||v==='-'?null:(L?parseFloat(v):pc(v))};
  const rows=T.rows.filter(r=>val(r,3)!=null);const pl=Math.min(130,Math.max(92,w*.26)),pr=14,pt=50,rh=19,H=pt+rows.length*rh+30;
  const xr=L?[-0.4,1]:[20,70];const X=v=>pl+(w-pl-pr)*(Math.max(xr[0],v)-xr[0])/(xr[1]-xr[0]);let s='';
  const ticks=L?[-0.4,0,0.4,0.8,1]:[20,30,40,50,60,70];ticks.forEach(v=>{s+=ln2(X(v),pt-6,X(v),H-24,'var(--line)')+tx(X(v),H-10,L?fmt(v,1):v+'%',{fs:11,a:'middle',c:'var(--mute)'})});
  const refs=L?[{v:0.979,t:'GPT-4o 0.979'},{v:0.949,t:'Prometheus 0.949',dy:-13}]:[{v:64.7,t:'humans 64.7%'},{v:66.6,t:'GPT-4o 66.6%',dy:-13},{v:33.3,t:'random 33.3%'},{v:59.6,t:'GPT-4 single 59.6%',dy:-26}];
  refs.forEach(r=>{const xx=X(r.v),wt=r.t.length*6.2,an=xx+wt/2>w-2?'end':xx-wt/2<pl?'start':'middle';s+=ln2(xx,pt-4,xx,H-24,'var(--mute)',{da:'4 3'})+tx(an==='end'?Math.min(xx+4,w-2):xx,pt-10+(r.dy||0),r.t,{fs:11,a:an,c:'var(--mute)'})});
  rows.forEach((r,i)=>{const y=pt+i*rh+rh/2,b=val(r,bi),u=val(r,3),sp=val(r,4);s+=tx(pl-6,y+4,r[0],{fs:11.5,a:'end'});
    if(b!=null){s+=ln2(X(b),y,X(u),y,'var(--dim)',{sw:3})+'<circle cx="'+X(b).toFixed(1)+'" cy="'+y+'" r="4" fill="var(--c2)"><title>'+resb+': '+b+'</title></circle>'}
    if(sp!=null)s+='<rect x="'+(X(sp)-3.5).toFixed(1)+'" y="'+(y-3.5)+'" width="7" height="7" fill="none" stroke="var(--c3)" stroke-width="1.6"><title>Sup.: '+sp+'</title></rect>';
    s+='<circle cx="'+X(u).toFixed(1)+'" cy="'+y+'" r="4.5" fill="var(--c1)"><title>Ours (Unsup.): '+u+'</title></circle>'});
  const lg=legend([[{cot:'CoT',direct:'Direct',fixed:'Fixed checklist'}[resb],'var(--c2)'],['RocketEval (Unsup.)','var(--c1)'],['RocketEval (Sup.)','var(--c3)']],pl,14,w-pl-pr);s+=lg.s;
  el.innerHTML=svgW(w,H,s,'results');
  $('resNote').innerHTML=(L?'Spearman correlation with Arena Elo of the 12-model ranking on WildBench, Table 3. Dots: the baseline and RocketEval (Unsup.); squares: RocketEval (Sup.).':'Agreement with MT-Bench human votes, ties included (random is 33.3%), Table 2.')+' Judges without a RocketEval run (Llama-3-70B, Qwen2-72B, GPT-4o) appear only as reference lines or in the tables tab.'})}
seg2('resM',m=>{resm=m;refit($('resSvg'))});seg2('resB',m=>{resb=m;refit($('resSvg'))});onTab('t-read',drawRes);

// discordant pairs (predict reveal)
PRED_REVEAL['pr-pairs']=()=>{const el=$('pairsGrid');fit(el,w=>{const D=RC.t3_discordant;const items=[['GPT-4o (CoT)',D['GPT-4o'][0]],['Mistral-Nemo (Ours)',D['Mistral-Nemo'][3]],['Llama-3-8B (Ours)',D['Llama-3-8B'][3]],['Gemma-2-2B (Ours)',D['Gemma-2-2B'][3]],['Prometheus-7B-v2.0',D['Prometheus-7B-v2.0'][0]],['Qwen2-72B (CoT)',D['Qwen2-72B'][0]],['Gemma-2-2B (CoT)',D['Gemma-2-2B'][0]]];
  const cols=Math.max(11,Math.min(22,Math.floor((w-150)/14))),cs=Math.min(13,(w-150)/cols),rowsN=Math.ceil(66/cols),rh=rowsN*(cs+1)+8,H=items.length*rh+6;let s='';
  items.forEach(([n,d],k)=>{const y0=k*rh+4;s+=tx(140,y0+rowsN*(cs+1)/2+4,n+': '+fmt(d,d%1?1:0),{fs:11.5,a:'end'});
    for(let i=0;i<66;i++){const x=148+(i%cols)*(cs+1),y=y0+Math.floor(i/cols)*(cs+1);s+=rc(x,y,cs,cs,i<Math.round(d)?'var(--c2)':'var(--soft)',{r:1,s:'var(--line)',sw:.5})}});
  el.innerHTML=svgW(w,H,s,'discordant pairs');})};

// Cost calculator (Table 4 formula)
let cpm='batch';
const CO=RC.cost;
function costRows(){const b=cpm==='batch';const ck=b?CO.ck:CO.std.ck;return [
  {n:'GPT-4o, CoT',c:'var(--c2)',x:0,p:b?CO.g4o:CO.std.g4o},{n:'GPT-4o-mini, CoT',c:'var(--c5)',x:0,p:b?CO.mini:CO.std.mini},
  {n:'Llama-3-70B',c:'var(--c4)',x:ck,p:3760*1.44/3600},{n:'Llama-3-8B',c:'var(--c3)',x:ck,p:685*.36/3600},{n:'Gemma-2-2B',c:'var(--c1)',x:ck,p:248*.36/3600},{n:'Qwen2.5-1.5B',c:'var(--c6)',x:ck,p:165*.36/3600}]}
function drawCost(){const N=Math.round(10**(+$('cN').value/10));$('cNv').textContent=fmt(N);const R=costRows();
  const el=$('cSvg');fit(el,w=>{const H=260;const f=logFrame({W:w,H,pl:52,pr:Math.min(120,w*.3),pt:12,pb:34,x:[1,1e4],y:[0.01,1e5],yt:[[0.01,'$0.01'],[1,'$1'],[100,'$100'],[1e4,'$10k']],xt:[[1,'1'],[10,'10'],[100,'100'],[1000,'1k'],[1e4,'10k']],xl:'runs N (log)'});
    let s=f.s;const ends=[];R.forEach(r=>{let d='';for(let i=0;i<=40;i++){const n=10**(i/10),c=r.x+n*r.p;d+=(i?'L':'M')+f.lx(n).toFixed(1)+','+f.ly(c).toFixed(1)}s+='<path d="'+d+'" fill="none" stroke="'+r.c+'" stroke-width="2"/>';ends.push({y:f.ly(r.x+1e4*r.p),n:r.n,c:r.c,how:r.n})});
    s+=ln2(f.lx(N),12,f.lx(N),H-34,'var(--mute)',{da:'4 3'});s+=endLabels(ends,w-Math.min(120,w*.3)+4,13);el.innerHTML=svgW(w,H,s,'cost against runs')});
  $('cOut').innerHTML=R.map(r=>stat(r.n,usd(r.x+N*r.p),r.x?'checklists '+usd(r.x)+' + '+usd(r.p,3)+' a run':usd(r.p,3)+' a run')).join('');
  const g=R[0],gm=R[4],mini=R[1];$('cNote').innerHTML='At N = '+fmt(N)+', Gemma-2-2B costs '+fmt((g.x+N*g.p)/(gm.x+N*gm.p),0)+' times less than GPT-4o. RocketEval with Gemma-2-2B undercuts GPT-4o-mini with CoT from N = '+Math.ceil(gm.x/(mini.p-gm.p))+'. Defaults reproduce Table 4 independently for five of six rows (GPT-4o-mini within 2%); the Llama-3-70B line uses the printed 3,760 s, which gives $1.50 a run where the printed totals imply $1.22 (see the tables tab). '+(cpm==='std'?'Standard prices: gpt-4o-2024-08-06 at $2.50 / $10.00 and gpt-4o-mini at $0.15 / $0.60 per million tokens (archived OpenAI pricing page, 8 September 2024); the checklists are repriced the same way.':'Batch API prices as in the paper: half the standard ones.')}
$('cN').addEventListener('input',drawCost);seg2('cP',m=>{cpm=m;drawCost()});onTab('t-read',drawCost);
