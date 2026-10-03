// ---- The paper tab: architecture table, tier-shift chart, Figure 2 rebuilt, Qwen3-4B bars, Table 22 stages ----
(function(){
const P=window.PAPER,TB=P.tables,RC=P.rc,FG=P.figs;
const num=s=>{if(s==null)return null;const m=String(s).replace(/,/g,'').match(/^-?\d+(\.\d+)?/);return m?+m[0]:null};
window.Q3=window.Q3||{};Q3.num=num;
// architecture table from recompute.py's config recount
(function(){const el=$('archT');if(!el)return;let h='';
  RC.arch.forEach(a=>{h+='<tr><td>'+a.model+'</td><td class="num">'+a.L+'</td><td class="num">'+a.hq+' / '+a.hkv+'</td><td class="num">'+(a.E?a.E+' / '+a.k:'dense')+'</td><td class="num">'+a.total.toFixed(2)+'B'+(a.E?' ('+a.active.toFixed(2)+'B active)':'')+'</td><td class="num">'+a.kv_kib_per_token+' KiB</td></tr>'});
  el.innerHTML=h})();

// tier shift: wins out of 15 for each Qwen3 base against the next Qwen2.5 size up
function drawTier(w){const el=$('tierC');const rows=RC.tier,rh=30,pl=w<560?110:230,W=w,H=rows.length*rh+40,x=v=>pl+(W-pl-30)*v/15;let s='';
  for(let v=0;v<=15;v+=5){s+=ln2(x(v),10,x(v),H-26,'var(--line)')+tx(x(v),H-10,v,{fs:11,a:'middle',c:'var(--mute)'})}s+=tx(x(7.5),H-10,'7.5',{fs:11,a:'middle',c:'var(--mute)'});
  s+=ln2(x(7.5),10,x(7.5),H-26,'var(--mute)',{da:'3 3'})+tx(x(7.5),H-26+11,'',{fs:11});
  rows.forEach((r,i)=>{const y=14+i*rh;s+=tx(pl-8,y+14,w<560?r.qwen3.replace('Qwen3-','')+' vs '+r.qwen25.replace('Qwen2.5-','2.5-'):r.qwen3+' vs '+r.qwen25,{fs:12,a:'end'});
    s+=rc(x(0),y+3,x(r.win)-x(0),rh-12,'var(--acc)')+rc(x(r.win),y+3,x(r.win+r.tie+r.loss)-x(r.win),rh-12,'var(--line)');
    s+=tx(x(r.win)+4,y+15,r.win+' won',{fs:11,c:'var(--ink)'})});
  s+=tx(pl,H-10,'',{});el.innerHTML=svgW(W,H,s,'Benchmarks won by each Qwen3 base model against the next Qwen2.5 size up')+'<p class="small mute" style="margin:4px 0 0">Blue: benchmarks the Qwen3 model wins; grey: the larger Qwen2.5 model wins or ties. Dashed: half of 15.</p>'}
onTab('t-read',()=>fit($('tierC'),drawTier));

// Figure 2 rebuilt
const BK=FG.budget_k,NAMES={AIME24:'AIME\'24',AIME25:'AIME\'25',LCB:'LiveCodeBench v5',GPQA:'GPQA-Diamond'};
let bm='AIME24';
function drawBud(w){const F=FG[bm],v=RC.fig_vs[bm],bi=+$('budB').value;const W=w,H=Math.min(300,Math.max(230,w*.55)),pl=44,pr=16,pt=16,pb=42;
  const ys=F.thinking.concat([F.non_thinking,v.table11]),lo=Math.floor((Math.min(...ys)-3)/5)*5,hi=Math.ceil((Math.max(...ys)+2)/5)*5;
  const X=i=>pl+(W-pl-pr)*i/5,Y=val=>pt+(H-pt-pb)*(1-(val-lo)/(hi-lo));let s='';
  for(let t=lo;t<=hi;t+=(hi-lo>30?10:5)){s+=ln2(pl,Y(t),W-pr,Y(t),'var(--line)')+tx(pl-6,Y(t)+4,t,{fs:11,a:'end',c:'var(--mute)'})}
  BK.forEach((k,i)=>{s+=tx(X(i),H-pb+16,k+'K',{fs:11,a:'middle',c:'var(--mute)'})});
  s+=tx((pl+W-pr)/2,H-6,'thinking budget (tokens, log scale)',{fs:11,a:'middle',c:'var(--mute)'});
  s+=ln2(pl,Y(F.non_thinking),W-pr,Y(F.non_thinking),'var(--bad)',{da:'5 4',sw:1.6})+tx(W-pr,Y(F.non_thinking)-5,'non-thinking '+F.non_thinking.toFixed(1),{fs:11,a:'end',c:'var(--bad)'});
  let d='';F.thinking.forEach((val,i)=>{d+=(i?'L':'M')+X(i).toFixed(1)+','+Y(val).toFixed(1)});s+='<path d="'+d+'" fill="none" stroke="var(--acc)" stroke-width="2"/>';
  F.thinking.forEach((val,i)=>{s+='<circle cx="'+X(i)+'" cy="'+Y(val)+'" r="'+(i===bi?6:4)+'" fill="var(--acc)"'+(i===bi?' stroke="var(--ink)" stroke-width="1.5"':'')+'/>'});
  const dx=X(5),dy=Y(v.table11);s+='<path d="M'+dx+','+(dy-6)+'L'+(dx+6)+','+dy+'L'+dx+','+(dy+6)+'L'+(dx-6)+','+dy+'Z" fill="none" stroke="var(--ink)" stroke-width="1.5"/>';
  s+=tx(dx-9,dy+(v.table11>F.thinking[5]?-8:16),'Table 11: '+v.table11,{fs:11,a:'end'});
  $('budSvg').innerHTML=svgW(W,H,s,'Figure 2 rebuilt: '+NAMES[bm]+' against the thinking budget');
  const sc=F.thinking[bi],gain=sc-F.non_thinking,prev=bi?F.thinking[bi-1]:null;
  $('budBv').textContent=BK[bi]+'K tokens';
  $('budOut').innerHTML=stat(NAMES[bm]+' at '+BK[bi]+'K',sc.toFixed(1),'pass@1, thinking mode')+stat('Over non-thinking','+'+gain.toFixed(1),'points ('+F.non_thinking.toFixed(1)+' without thinking)')+stat(bi?'From '+BK[bi-1]+'K':'Budget doubled',bi?((sc-prev>=0?'+':'')+(sc-prev).toFixed(1)):'n/a',bi?'points for twice the tokens':'the smallest budget plotted')}
const budRender=()=>fit($('budSvg'),drawBud);
onTab('t-read',budRender);
segBind('budM',m=>{bm=m;$('budM').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));refit($('budSvg'))});
$('budB').addEventListener('input',()=>refit($('budSvg')));

// Qwen3-4B against Qwen2.5-72B-Instruct (predict reveal)
function rowsOf(t){const o={};TB[t].groups.forEach(g=>g.rows.forEach(r=>o[r.b]=r));return o}
const colOf=(t,name)=>TB[t].cols.findIndex(c=>c.name.indexOf(name)===0);
function drawB4(w){const T14=rowsOf('T14'),T17=rowsOf('T17'),T18=rowsOf('T18'),c72=colOf('T14','Qwen2.5-72B'),c17=colOf('T17','Qwen3-4B'),c18=colOf('T18','Qwen3-4B');
  const scale=b=>/AlignBench|WritingBench/.test(b)?10:/CodeForces/.test(b)?1/25:1;
  const bs=Object.keys(T14).filter(b=>T17[b]&&T18[b]);const rh=19,pl=Math.min(170,w*.38),W=w,H=bs.length*rh+44,mid=pl+(W-pl-10)/2,R=40,x=v=>mid+(W-pl-10)/2*Math.max(-1,Math.min(1,v/R));
  let s=tx(x(-R),12,'72B-Instruct ahead',{fs:11,c:'var(--mute)'})+tx(x(R),12,'Qwen3-4B ahead',{fs:11,a:'end',c:'var(--mute)'});
  s+=ln2(mid,18,mid,H-24,'var(--mute)');let wt=0,wn=0;
  bs.forEach((b,i)=>{const y=22+i*rh,k=scale(b),base=num(T14[b].v[c72])*k,dt=num(T17[b].v[c17])*k-base,dn=num(T18[b].v[c18])*k-base;wt+=dt>0;wn+=dn>0;
    s+=tx(pl-6,y+12,b.replace(' (Rating / Percentile)','').replace(' strict prompt','').replace(' 14 languages',''),{fs:11,a:'end'});
    s+=rc(Math.min(mid,x(dt)),y+2,Math.abs(x(dt)-mid),6,'var(--acc)',{r:1})+rc(Math.min(mid,x(dn)),y+9,Math.abs(x(dn)-mid),6,'var(--bad)',{r:1})});
  const L=legend([['Qwen3-4B thinking: wins '+wt+' of '+bs.length,'var(--acc)'],['non-thinking: wins '+wn+' of '+bs.length,'var(--bad)']],8,H-6,W-16);
  $('b4C').innerHTML=svgW(W,H+L.h,s+L.s,'Qwen3-4B minus Qwen2.5-72B-Instruct per benchmark')}
PRED_REVEAL['pr-4b']=()=>fit($('b4C'),drawB4);

// Table 22: stage effects, as changes in points on one shared axis
let stm='t';
function drawSt(w){const rows=TB.T22.rows.filter(r=>r.v.length===5),rh=26,pl=Math.min(150,w*.32),W=w,H=rows.length*rh+30;
  const ch=r=>{const v=r.v.map(num);return stm==='t'?[v[1]-v[0],v[3]-v[1]]:[v[4]-v[2]]};
  const lo=-5,hi=16,x=v=>pl+(W-pl-50)*(v-lo)/(hi-lo);let s='';
  for(let t=-5;t<=15;t+=5){s+=ln2(x(t),6,x(t),H-22,t===0?'var(--mute)':'var(--line)')+tx(x(t),H-8,(t>0?'+':'')+t,{fs:11,a:'middle',c:'var(--mute)'})}
  rows.forEach((r,i)=>{const y=8+i*rh,c=ch(r);s+=tx(pl-6,y+13,r.b.replace(' 2024-11-25','').replace(' strict prompt',''),{fs:11,a:'end'});
    c.forEach((d,k)=>{const col=d>=0?(k===0&&stm==='t'?'var(--c1)':'var(--c6)'):'var(--bad)';s+=rc(Math.min(x(0),x(d)),y+3+k*(stm==='t'?9:0),Math.max(1.5,Math.abs(x(d)-x(0))),stm==='t'?8:12,col,{r:1})});
    const tot=c.reduce((a,b)=>a+b,0);s+=tx(W-4,y+13,(tot>=0?'+':'')+tot.toFixed(1),{fs:11,a:'end',c:tot>=0?'var(--ink)':'var(--bad)'})});
  const tf=TB.T22.rows.find(r=>r.b.indexOf('ThinkFollow')===0);
  const L=legend(stm==='t'?[['stage 2 → 3','var(--c1)'],['stage 3 → 4','var(--c6)'],['a fall','var(--bad)']]:[['stage 3 → 4','var(--c6)'],['a fall','var(--bad)']],8,H+12,W-16);
  $('stSvg').innerHTML=svgW(W,H+L.h+8,s+L.s,'Table 22: changes in Qwen3-32B scores by stage, in points')+'<p class="small mute" style="margin:2px 0 0">Change in points; right-hand number: total from stage '+(stm==='t'?'2':'3')+' to 4. ThinkFollow*: stage 3 '+tf.v[1]+', stage 4 '+num(tf.v[2])+' (one score for both modes).</p>'}
onTab('t-read',()=>fit($('stSvg'),drawSt));
segBind('stM',m=>{stm=m;$('stM').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));refit($('stSvg'))});
})();
