// ---- Rerun the tournament: Elo from the released judgments, prompt bootstrap, one ordering traced, Table 6 rebuilt ----
(function(){
const QD=window.QD,QE=window.QE,SN={'gpt4':'GPT-4','guanaco-65b':'Guanaco 65B','guanaco-33b':'Guanaco 33B','vicuna-13b':'Vicuna 13B','gpt35':'ChatGPT','guanaco-13b':'Guanaco 13B','bard':'Bard','guanaco-7b':'Guanaco 7B'};
const PAPERELO={'gpt4|vicuna':{'gpt4':1348,'guanaco-65b':1022,'guanaco-33b':992,'gpt35':966,'vicuna-13b':974,'guanaco-13b':913,'guanaco-7b':879,'bard':902},
 'human|vicuna':{'gpt4':1176,'guanaco-65b':1023,'guanaco-33b':1009,'gpt35':916,'vicuna-13b':984,'guanaco-13b':975,'guanaco-7b':1010,'bard':909},
 'gpt4|oa':{'gpt4':1294,'guanaco-65b':1008,'guanaco-33b':1002,'gpt35':1015,'vicuna-13b':936,'guanaco-13b':885,'guanaco-7b':860}};
const COL={'gpt4':'var(--c4)','guanaco-65b':'var(--c1)','guanaco-33b':'var(--c3)','vicuna-13b':'var(--c5)','gpt35':'var(--c2)','guanaco-13b':'var(--c6)','bard':'var(--mute)','guanaco-7b':'var(--dim)'};
const rank=s=>QD.sysV.indexOf(s);
let last=null,boot=null;
function build(){const [j,b]=$('evJ').value.split('|'),T=QE.tour(),ties=$('evT').value,ord=$('evO').value,cm=$('evC').value==='nocm'&&b==='vicuna',H=$('evH').value;
  const keepQ=i=>!cm||!['coding','math'].includes(QD.cats[i]);const keepO=(a,c)=>ord==='both'||(ord==='strongFirst')===(rank(a)<rank(c));
  const out=[];const push=(q,a,c,sc)=>{if(!keepQ(q)||!keepO(a,c))return;if(sc===.5&&ties==='drop')return;out.push([q,a,c,sc])};
  if(j==='human'){T.H.forEach(([q,a,c,v])=>{if(H==='vote'){for(const ch of v)push(q,a,c,ch==='a'?1:ch==='b'?0:.5)}else{const n={a:0,b:0,t:0};for(const ch of v)n[ch]++;const w=n.a>=2?'a':n.b>=2?'b':'t';push(q,a,c,w==='a'?1:w==='b'?0:.5)}})}
  else{const D=b==='oa'?T.O:T.V;for(const k in D){const [a,c]=k.split('|');D[k].forEach((x,i)=>{if(x===1)push(i,a,c,1);else if(x===2)push(i,a,c,0);else if(x===3)push(i,a,c,.5)})}}
  return {ms:out,nP:b==='oa'?QD.nO:80,key:j+'|'+b}}
function replay(){const B=build(),K=+$('evK').value,n=B.key==='gpt4|oa'?Math.min(200,+$('evN').value):+$('evN').value;const e=QE.elo(B.ms,n,K,(Math.random()*1e9)|0);last={B,e,K,n};boot=null;render()}
function doBoot(){const btn=$('evBoot');btn.disabled=true;btn.textContent='Resampling...';setTimeout(()=>{try{const B=build(),K=+$('evK').value;const oa=B.key==='gpt4|oa';boot=QE.bootElo(B.ms,B.nP,oa?40:100,oa?4:10,K,(Math.random()*1e9)|0);boot.__n=oa?40:100;if(!last||last.B.key!==B.key)last={B,e:QE.elo(B.ms,200,K,7),K,n:200};render()}catch(err){__jsErr(err.message)}btn.disabled=false;btn.textContent='Resample the prompts (100 times)'},20)}
function render(){if(!last)return;const {B,e,K,n}=last,P=PAPERELO[B.key],ss=Object.keys(e).sort((x,y)=>e[y].mean-e[x].mean);
  fit($('evSvg'),W=>{const vals=ss.flatMap(s=>[e[s].mean,P[s]||e[s].mean,boot&&boot[s]?boot[s].lo:e[s].mean,boot&&boot[s]?boot[s].hi:e[s].mean]),lo=Math.floor((Math.min(...vals)-30)/50)*50,hi=Math.ceil((Math.max(...vals)+30)/50)*50;
    const H=ss.length*26+34,lw=96,xs=v=>lw+(W-lw-12)*(v-lo)/(hi-lo);let s='';
    for(let v=lo;v<=hi;v+=50)if((v-lo)%100===0||W>600)s+=ln2(xs(v),8,xs(v),H-22,'var(--line)')+tx(xs(v),H-8,String(v),{fs:11,a:'middle',c:'var(--mute)'});
    ss.forEach((k,i)=>{const y=14+i*26;s+=tx(lw-6,y+5,SN[k],{fs:12,a:'end'});
      if(boot&&boot[k])s+=rc(xs(boot[k].lo),y-4,Math.max(1,xs(boot[k].hi)-xs(boot[k].lo)),8,'var(--acc2)',{r:3});
      if(n>1){const ci=e[k].ci;s+=ln2(xs(e[k].mean-e[k].sd),y,xs(e[k].mean+e[k].sd),y,'var(--acc)',{sw:1,op:.5})}
      s+=ln2(xs(e[k].mean),y-7,xs(e[k].mean),y+7,'var(--acc)',{sw:2.5});
      if(P[k]!=null)s+='<path d="M'+xs(P[k]).toFixed(1)+','+(y-5)+'l5,5l-5,5l-5,-5z" fill="var(--c2)"><title>paper: '+P[k]+'</title></path>'});
    $('evSvg').innerHTML=svgW(W,H,s,'Elo ratings')});
  const md=Math.max(...ss.filter(k=>P[k]!=null).map(k=>Math.abs(e[k].mean-P[k])));
  $('evNote').innerHTML= fmt(B.ms.length,0)+' matches, K = '+K+', '+fmt(n,0)+' random ordering'+(n>1?'s':'')+(B.key==='gpt4|oa'&&+$('evN').value>200?' (capped at 200 for the 38,544 OA matches)':'')+'. Blue tick: mean rating; thin blue line: ± one standard deviation across orderings; orange diamond: the paper (Table 7). '+(boot?'Shaded: 95% interval over '+boot.__n+' resamples of the '+B.nP+' prompts ('+(boot.__n===40?4:10)+' orderings each). ':'Press "Resample the prompts" for the interval the paper\'s ± 1 leaves out. ')+'Largest difference from the paper: '+fmt(md,0)+' points'+(P.gpt4!=null&&e.gpt4?'; '+fmt(Math.max(...ss.filter(k=>k!=='gpt4'&&P[k]!=null).map(k=>Math.abs(e[k].mean-P[k]))),0)+' leaving out GPT-4 itself':'')+'. A single ordering spreads each rating by about '+fmt(ss.reduce((a,k)=>a+e[k].sd,0)/ss.length,0)+' points (thin line), which is why the paper averages 10,000 orderings; with 10,000 the means are recompute_eval.py\'s.';
  $('evTab').innerHTML='<thead><tr><th>system</th><th class="num">ours</th><th class="num">± 1.96 SE over orderings</th><th class="num">SD over orderings</th>'+(boot?'<th class="num">prompt-resampled 95%</th>':'')+'<th class="num">paper</th><th class="num">rank (ours / paper)</th></tr></thead><tbody>'+
    ss.map((k,i)=>{const pr=P[k]!=null?Object.keys(P).sort((x,y)=>P[y]-P[x]).indexOf(k)+1:'';return '<tr><td>'+SN[k]+'</td><td class="num">'+fmt(e[k].mean,0)+'</td><td class="num">'+(n>1?'± '+e[k].ci.toFixed(1):'')+'</td><td class="num">'+(n>1?e[k].sd.toFixed(0):'')+'</td>'+(boot?'<td class="num">'+(boot[k]?fmt(boot[k].lo,0)+' to '+fmt(boot[k].hi,0):'')+'</td>':'')+'<td class="num">'+(P[k]==null?'':P[k])+'</td><td class="num">'+(i+1)+' / '+pr+'</td></tr>'}).join('')+'</tbody>';
  trace()}
function trace(){if(!last)return;const {B,K}=last,ms=B.ms,rnd=mulberry32((Math.random()*1e9)|0),idx=ms.map((_,i)=>i);for(let i=idx.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[idx[i],idx[j]]=[idx[j],idx[i]]}
  const R={},hist={},step=Math.max(1,Math.floor(ms.length/240));let c=0;
  for(const j of idx){const [,a,b,s]=ms[j],ra=R[a]==null?1000:R[a],rb=R[b]==null?1000:R[b],ea=1/(1+10**((rb-ra)/400));R[a]=ra+K*(s-ea);R[b]=rb-K*(s-ea);c++;if(c%step===0||c===ms.length)for(const k in R)(hist[k]=hist[k]||[]).push([c,R[k]])}
  fit($('evTr'),W=>{const H=200,pl=40,pb=24,all=Object.values(hist).flat().map(p=>p[1]),lo=Math.min(...all)-10,hi=Math.max(...all)+10,xs=v=>pl+(W-pl-90)*v/ms.length,ys=v=>8+(H-8-pb)*(1-(v-lo)/(hi-lo));let s='';
    for(let v=Math.ceil(lo/100)*100;v<=hi;v+=100)s+=ln2(pl,ys(v),W-90,ys(v),'var(--line)')+tx(pl-5,ys(v)+4,String(v),{fs:11,a:'end',c:'var(--mute)'});
    const ends=[];for(const k in hist){let p='';hist[k].forEach((q,i)=>{p+=(i?'L':'M')+xs(q[0]).toFixed(1)+','+ys(q[1]).toFixed(1)});s+='<path d="'+p+'" fill="none" stroke="'+COL[k]+'" stroke-width="1.5"/>';ends.push({y:ys(R[k]),n:SN[k]+' '+fmt(R[k],0),c:COL[k],how:'final rating in this ordering'})}
    s+=endLabels(ends,W-86,13)+tx(pl,H-6,'matches played',{fs:11,c:'var(--mute)'});
    $('evTr').innerHTML=svgW(W,H,s,'Elo through one ordering')});
  $('evTrNote').innerHTML='Final ratings in this single ordering differ from the 200-ordering means by up to '+fmt(Math.max(...Object.keys(R).map(k=>Math.abs(R[k]-last.e[k].mean))),0)+' points.'}
['evJ','evK','evN','evT','evO','evC','evH'].forEach(id=>$(id).addEventListener('change',()=>{const oa=$('evJ').value==='gpt4|oa';$('evC').disabled=oa;$('evH').disabled=$('evJ').value!=='human|vicuna';replay()}));
$('evGo').addEventListener('click',replay);$('evBoot').addEventListener('click',doBoot);$('evTrGo').addEventListener('click',trace);

function rel(){const R=QD.ev.relative,T6=PAPER.tables.t6.rows,map={'GPT-4':'gpt4','Bard':'bard','Guanaco 65B':'guanaco-65b','Alpaca 65B':'alpaca-65b','FLAN v2 65B':'flan-65b','Guanaco 33B':'guanaco-33b','Open Assistant 33B':'huggingchat-33b','Alpaca 33B':'alpaca-33b','FLAN v2 33B':'flan-33b','Vicuna 13B':'vicuna-13b','Guanaco 13B':'guanaco-13b','Alpaca 13B':'alpaca-13b','HH-RLHF 13B':'hh-rlhf-13b','Unnatural Instr. 13B':'unnatural-instructions-13b','Chip2 13B':'chip2-13b','Longform 13B':'longform-13b','Self-Instruct 13B':'self-instruct-13b','FLAN v2 13B':'flan-13b','Guanaco 7B':'guanaco-7b','Alpaca 7B':'alpaca-7b','FLAN v2 7B':'flan-7b'};
  const rows=T6.map(r=>{const nm=r[0]+(r[1]!=='-'?' '+r[1]:''),k=map[nm],o=k&&R[k];return {nm,p:r,o,k}});
  fit($('relSvg'),W=>{const lw=150,H=rows.length*18+30,lo=20,hi=125,xs=v=>lw+(W-lw-10)*(v-lo)/(hi-lo);let s='';
    [25,50,75,100,125].forEach(v=>{s+=ln2(xs(v),4,xs(v),H-20,v===100?'var(--mute)':'var(--line)')+tx(xs(v),H-6,v+'%',{fs:11,a:'middle',c:'var(--mute)'})});
    rows.forEach((r,i)=>{const y=12+i*18;s+=tx(lw-6,y+4,r.nm,{fs:11,a:'end'});
      if(r.o){s+=rc(xs(r.o.boot_lo),y-3,xs(r.o.boot_hi)-xs(r.o.boot_lo),6,'var(--acc2)',{r:2})+ln2(xs(r.o.chatgpt_first),y-5,xs(r.o.chatgpt_first),y+5,'var(--c3)',{sw:2})+ln2(xs(r.o.system_first),y-5,xs(r.o.system_first),y+5,'var(--c5)',{sw:2})+'<circle cx="'+xs(r.o.mean_pooled).toFixed(1)+'" cy="'+y+'" r="3.5" fill="var(--acc)"/>'}
      s+='<path d="M'+xs(r.p[6]).toFixed(1)+','+(y-4)+'l4,4l-4,4l-4,-4z" fill="var(--c2)"/>'});
    $('relSvg').innerHTML=svgW(W,H,s,'Table 6 rebuilt')});
  $('relTab').innerHTML='<thead><tr><th>system</th><th class="num">paper: ChatGPT first / system first / mean</th><th class="num">ours: ChatGPT first / system first / pooled</th><th class="num">ours: 95% interval</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+r.nm+'</td><td class="num">'+r.p[4]+' / '+r.p[5]+' / '+r.p[6]+'</td><td class="num">'+(r.o?r.o.chatgpt_first.toFixed(1)+' / '+r.o.system_first.toFixed(1)+' / '+r.o.mean_pooled.toFixed(1):'not released')+'</td><td class="num">'+(r.o?r.o.boot_lo.toFixed(1)+' to '+r.o.boot_hi.toFixed(1):'')+'</td></tr>').join('')+'</tbody>';
  $('relNote').innerHTML='Green tick: ChatGPT\'s answer shown first; yellow tick: the system\'s shown first; blue dot: pooled; shaded: our 95% bootstrap over the 80 prompts (2,000 resamples, recompute_eval.py); orange diamond: the paper\'s Mean. Two departures. The paper\'s GPT-4 row has its two order columns swapped (we get 110.1 with ChatGPT first and 119.4 with GPT-4 first). The paper\'s "Open Assistant 33B" row is identical to Vicuna 13B\'s; the closest released system is "huggingchat-33b", plotted in its place. The released file names of the QLoRA-trained systems state the order backwards; fetch_eval.py decides the order from the answer ids instead.'}

function agree(){const a=QD.ev.agreement,o=QD.ev.order_effect,r=QD.ev.rank_agreement;
  $('agOut').innerHTML=stat('first answer wins (GPT-4, Vicuna pairwise)',fmt(o.first,0),'second wins '+fmt(o.second,0)+', ties '+fmt(o.tie,0))+stat('verdicts that flip when the order is swapped',Math.round(100*o.flipped_decided_pairs/(o.flipped_decided_pairs+o.consistent_decided_pairs))+'%','of '+fmt(o.flipped_decided_pairs+o.consistent_decided_pairs,0)+' prompt and pair cases decided both ways')+stat('humans with each other','κ = '+a.fleiss_humans.toFixed(2),'Fleiss, '+fmt(a.hits,0)+' comparisons of 3 workers; paper 0.42')+stat('GPT-4 with the human majority','κ = '+a.fleiss_gpt4_vs_majority.toFixed(2),'raw agreement '+Math.round(100*a.gpt4_majority_raw_agreement)+'%; paper 0.25')+stat('system ranks, humans against GPT-4','ρ = '+r.ours.spearman.toFixed(2)+', τ = '+r.ours.kendall.toFixed(2),'from our Elo; from Table 7\'s ranks ρ = '+r.table7.spearman.toFixed(2)+', τ = '+r.table7.kendall.toFixed(2)+'; paper 0.55, 0.43');
  $('agNote').innerHTML='Computed from the released files by recompute_eval.py. The example-level GPT-4 to human κ reproduces (0.26 against 0.25). Inter-human agreement does not: we get '+a.fleiss_humans.toFixed(2)+' against the paper\'s 0.42; the paper does not say how ties or the three answer classes were treated, so this may be a different statistic. The rank correlations do not reproduce either from Table 7\'s own ranks (ρ = 0.62, τ = 0.57, not 0.55 and 0.43); with eight systems one swapped pair moves ρ by about 0.05.'}
onTab('t-eval',()=>{if(!last)replay();else render();rel();agree()});
})();
