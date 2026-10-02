// ---- Tables tab: checks, recount, Tables 1 to 6, 15, 16, 18, inconsistencies ----
(function(){
const PP=window.PAPER,TB=PP.tables,RC=PP.rc;const num=s=>parseFloat(String(s).split('±')[0]);
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const table=(head,rows,cls)=>'<table'+(cls?' class="'+cls+'"':'')+'><thead><tr>'+head.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
const vd=v=>{const c=/^reproduces/.test(v)?'var(--good)':/^does not/.test(v)?'var(--bad)':'var(--c5)';const h=v.split(/[:;(]/)[0];const k=h.replace(/\s+$/,'');return '<span style="color:'+c+';font-weight:600">'+esc(k)+'</span>'+esc(v.slice(k.length))};
function checks(){$('tbCT').innerHTML=table(['Claim','Where','Printed','Recomputed','How','Verdict'],RC.checks.map(c=>[esc(c.claim),esc(c.where),esc(c.printed),esc(c.computed),esc(c.how),vd(c.verdict)]))}
function recount(){const M=v=>(v/1e6).toFixed(2)+'M';const rows=[];
  RC.gpt3_lora.forEach(x=>rows.push(['GPT-3 LoRA '+x.config,x.printed,M(x.computed),Math.abs(parseFloat(x.printed)-x.computed/1e6)<0.05?'yes':Math.abs(parseFloat(x.printed)-Math.floor(x.computed/1e5)/10)<1e-9?'truncated':'<b>no</b>']));
  RC.gpt3_adapterH.forEach(x=>rows.push(['GPT-3 Adapter<sup>H</sup> r = '+x.r,x.printed,M(x.computed),'yes']));
  RC.gpt3_preembed.forEach(x=>rows.push(['GPT-3 PreEmbed l<sub>p</sub> = '+x.lp+', l<sub>i</sub> = '+x.li,x.printed,M(x.computed),Math.abs(parseFloat(x.printed)-x.computed/1e6)<0.05?'yes':'truncated']));
  RC.gpt3_prelayer.forEach(x=>rows.push(['GPT-3 PreLayer l<sub>p</sub> = '+x.lp+', l<sub>i</sub> = '+x.li,x.printed,M(x.computed),'<b>no</b>']));
  RC.others.forEach(x=>rows.push([x.model+' LoRA, r = '+x.r+' on W<sub>q</sub>, W<sub>v</sub> ('+A(x.config_url,'d = '+fmt(x.d)+', '+x.layers+' layers')+')',x.printed,M(x.computed)+(x.with_head?' ('+M(x.with_head)+' with pooler and classifier)':''),Math.abs(parseFloat(x.printed)-x.computed/1e6)<0.05?'yes':'<b>no</b>']));
  $('tbPT').innerHTML=table(['Configuration','Printed','Formula','Match'],rows)}
function t1(W){const L=[['batch 32, 512 tokens',1449.4,1482.0,1492.2],['batch 16, 256 tokens',338.0,354.8,366.3],['batch 1, 128 tokens',19.8,23.9,25.8]];const pl=Math.min(150,W*0.36),pr=96,bh=13;let s='',y=6;
  L.forEach((r,i)=>{s+=tx(4,y+11,r[0],{fs:12,w:600});y+=16;[['Fine-Tune / LoRA',r[1],'var(--c3)'],['Adapter L',r[2],'var(--c2)'],['Adapter H',r[3],'var(--c1)']].forEach(([n,v,c],j)=>{const w=(W-pl-pr)*v/r[3];s+=tx(pl-6,y+bh-2,n,{fs:11,a:'end'})+rc(pl,y,w,bh,c,{r:2})+tx(pl+w+4,y+bh-2,v+' ms'+(j?' ('+(j===1?RC.table1.L[i]:RC.table1.H[i]).toFixed(1).replace(/^/,'+')+'%)':''),{fs:11});y+=bh+4});y+=8});
  s+=tx(4,y+6,'each group scaled to its slowest bar',{fs:11,c:'var(--mute)'});$('tb1Svg').innerHTML=svgW(W,y+12,s,'Table 1 latency')}
const SE=window.LORA_DATA?null:null;
const GD={MNLI:9815,'SST-2':872,MRPC:408,CoLA:1043,QNLI:5463,QQP:40430,RTE:277,'STS-B':1500};const TK=Object.keys(GD);
let t2m='base';
function t2(){const rows=TB['S5.T2'].rows.slice(2);const pick={base:'RoB-base',large:'RoB-large',deb:'DeB-XXL'}[t2m];const R=rows.filter(r=>r[0].startsWith(pick));const showSe=$('tb2Se').checked;
  const ft=R.find(r=>r[0].includes('(FT)'));const head=['Method','# Trainable'].concat(TK,['Avg.']);const out=[];
  R.forEach(r=>{const cells=[esc(r[0]),r[1]].concat(r.slice(2,10).map((c,i)=>{let h=esc(c);if(showSe&&!/CoLA|STS-B/.test(TK[i])){const p=num(c)/100;h+='<br><span class="small mute">SE '+(100*Math.sqrt(p*(1-p)/GD[TK[i]])).toFixed(1)+'</span>'}return h}),[r[10]]);out.push(cells)});
  const lo=R.filter(r=>r[0].includes('LoRA'));lo.forEach(l=>{out.push(['<i>'+esc(l[0])+' − FT</i>',''].concat(l.slice(2,10).map((c,i)=>{const d=num(c)-num(ft[i+2]);return '<b style="color:'+(d>=0?'var(--good)':'var(--bad)')+'">'+(d>=0?'+':'')+d.toFixed(1)+'</b>'}),[(num(l[10])-num(ft[10])>=0?'+':'')+(num(l[10])-num(ft[10])).toFixed(1)]))});
  $('tb2T').innerHTML=table(head,out);
  const rte=RC.rte;$('tb2N').innerHTML=(t2m==='base'?'RoBERTa base: LoRA − FT averages +'+rte.avg_gain.toFixed(2)+' over eight tasks; RTE alone contributes +'+rte.rte_share.toFixed(2)+'. Without RTE LoRA is '+(-rte.gain_without_rte).toFixed(2)+' points behind on average. LoRA started MRPC, RTE and STS-B from its own best MNLI checkpoint ('+A(PP.meta.ax+'#A4.SS1','Appendix D.1')+'); the FT row is the fairseq release\'s single-task fine-tuning. ':'')+'Standard errors: binomial, at the printed accuracy, from the dev-set sizes (MNLI-m 9,815, SST-2 872, MRPC 408, QNLI 5,463, QQP 40,430, RTE 277); CoLA (Matthews) and STS-B (Pearson) are not proportions and get none. ± in the cells is the paper\'s spread over its 5 seeds. * prior work; † the restricted adapter-style setup.';}
function t3(){const R=TB['S5.T3'].rows.slice(2);const head=['Method','# Trainable','BLEU','NIST','MET','ROUGE-L','CIDEr'];
  const grp=[R.filter(r=>r[0].startsWith('GPT-2 M')),R.filter(r=>r[0].startsWith('GPT-2 L'))];const out=[];
  grp.forEach(g=>{const best=[2,3,4,5,6].map(j=>Math.max(...g.map(r=>num(r[j]))));g.forEach(r=>out.push([esc(r[0]),r[1]].concat([2,3,4,5,6].map((j,k)=>num(r[j])===best[k]?'<b>'+esc(r[j])+'</b>':esc(r[j])))))});
  $('tb3T').innerHTML=table(head,out)}
function t4(){const R=TB['S5.T4'].rows.slice(2);const prov={'4.7M':'MNLI from r<sub>v</sub> = 2 (91.7); r<sub>q</sub> = r<sub>v</sub> = 1 gives 91.3','37.7M':'WikiSQL from r<sub>q,k,v,o</sub> = 4 (74.0), MNLI from r<sub>q</sub> = r<sub>v</sub> = 8 (91.6)'};
  $('tb4T').innerHTML=table(['Method','# Trainable','WikiSQL','MNLI-m','SAMSum R1/R2/RL','Where the LoRA cells come from (Table 15)'],R.map(r=>[esc(r[0]),r[1],r[2],r[3],r[4],r[0].includes('LoRA')?prov[r[1]]||'':'']));
  $('tb4N').innerHTML='Stated noise: WikiSQL ±0.5, MNLI-m ±0.1, SAMSum ±0.2 / ±0.2 / ±0.1 ('+A(PP.meta.ax+'#S5.T4','Table 4')+' caption). Against full fine-tuning, LoRA 4.7M: WikiSQL −0.4 (inside the noise), MNLI +2.2, SAMSum +1.8 / +1.8 / +1.4. Fine-tuning trains 175,255.8M parameters.'}
let t5m=0;
function t5(W){const D=RC.table5;const keys=Object.keys(D);const pl=Math.min(120,W*0.32),pr=40,bh=15;const vals=keys.map(k=>D[k][t5m]);const lo=t5m?90.5:69.5,hi=t5m?92:74.5;const lx=v=>pl+(W-pl-pr)*(v-lo)/(hi-lo);
  const best=Math.max(...vals),nz=t5m?0.1:0.5;let s=rc(lx(best-nz),2,lx(best+nz)-lx(best-nz),keys.length*(bh+5)+4,'var(--dim)',{r:0,op:.5}),y=4;
  keys.forEach((k,i)=>{const r=TB['S7.T5'].rows[2][i+1],pr_=TB['S7.T5'].rows[3+t5m][i+1];s+=tx(pl-6,y+bh-3,k.replace(/,/g,', ')+' (r = '+r+')',{fs:11,a:'end'})+rc(pl,y,lx(vals[i])-pl,bh,'var(--c1)',{r:2})+tx(lx(vals[i])+4,y+bh-3,pr_,{fs:11});y+=bh+5});
  [lo,hi].forEach(v=>{s+=tx(lx(v),y+12,String(v),{fs:11,a:'middle',c:'var(--mute)'})});$('tb5Svg').innerHTML=svgW(W,y+18,s,'Table 5')}
function t6(W){const R=TB['S7.T6'].rows;const blk=t5m?R.slice(4,7):R.slice(1,4);const rk=[1,2,4,8,64];const H=200,pl=40,pr=14,pt=10,pb=30;
  const rows=blk.map(r=>{const c=r.length===7?r.slice(1):r;return {n:c[0],v:c.slice(1).map(Number)}});const all=[].concat(...rows.map(r=>r.v));const lo=Math.floor(Math.min(...all)-0.3),hi=Math.ceil(Math.max(...all)+0.3);
  const lx=i=>pl+(W-pl-pr)*i/4,ly=v=>pt+(H-pt-pb)*(1-(v-lo)/(hi-lo));let s='';for(let v=lo;v<=hi;v+=t5m?0.5:1)s+=ln2(pl,ly(v),W-pr,ly(v),'var(--line)')+tx(pl-5,ly(v)+4,String(v),{fs:11,a:'end',c:'var(--mute)'});
  rk.forEach((r,i)=>{s+=tx(lx(i),H-pb+15,'r = '+r,{fs:11,a:'middle',c:'var(--mute)'})});const cs=['var(--c2)','var(--c1)','var(--c3)'];
  rows.forEach((r,j)=>{let d='';r.v.forEach((v,i)=>{d+=(i?'L':'M')+lx(i).toFixed(1)+' '+ly(v).toFixed(1)});s+='<path d="'+d+'" fill="none" stroke="'+cs[j]+'" stroke-width="2"/>';r.v.forEach((v,i)=>{s+='<circle cx="'+lx(i)+'" cy="'+ly(v)+'" r="3" fill="'+cs[j]+'"><title>'+r.n+' r='+rk[i]+': '+v+'</title></circle>'})});
  const lg=legend(rows.map((r,j)=>[r.n.replace(/,/g,', '),cs[j]]),pl,12,W-pl-pr);$('tb6Svg').innerHTML=svgW(W,H+lg.h,lg.s+'<g transform="translate(0,'+lg.h+')">'+s+'</g>','Table 6')}
function t15(){let cur='';const out=TB['A6.T15'].rows.slice(1).map(r=>{if(r.length===5)cur=r[0];const n=r.length===5?r:[cur].concat(r);return [n[0],n[1],n[2],n[3],n[4]]});
  const bw=Math.max(...out.filter(r=>r[0]!=='Fine-Tune').map(r=>+r[3])),bm=Math.max(...out.filter(r=>r[0]!=='Fine-Tune').map(r=>+r[4]));
  $('tb15T').innerHTML=table(['Method','Hyperparameters','# Trainable','WikiSQL','MNLI-m'],out.map(r=>[r[0],r[1],r[2],+r[3]===bw?'<b>'+r[3]+'</b>':r[3],+r[4]===bm?'<b>'+r[4]+'</b>':r[4]]))+'<p class="small mute">Bold: best in the column, computed here ('+A(PP.meta.ax+'#A6.T15','Table 15')+').</p>'}
function t16(W){const D=RC.table16;const xs=['100','1k','10k','392k'];const H=220,pl=40,pr=Math.min(130,W*0.34),pt=10,pb=28,lo=30,hi=95;const lx=i=>pl+(W-pl-pr)*i/3,ly=v=>pt+(H-pt-pb)*(1-(v-lo)/(hi-lo));let s='';
  [40,60,80].forEach(v=>{s+=ln2(pl,ly(v),W-pr,ly(v),'var(--line)')+tx(pl-5,ly(v)+4,v+'%',{fs:11,a:'end',c:'var(--mute)'})});s+=ln2(pl,ly(33.3),W-pr,ly(33.3),'var(--mute)',{da:'2 3'});
  xs.forEach((x,i)=>{s+=tx(lx(i),H-pb+15,x,{fs:11,a:'middle',c:'var(--mute)'})});const cs=['var(--ink)','var(--c2)','var(--c4)','var(--c3)'];const ends=[];
  Object.entries(D).forEach(([n,v],j)=>{let d='';v.forEach((y,i)=>{d+=(i?'L':'M')+lx(i).toFixed(1)+' '+ly(y).toFixed(1)});s+='<path d="'+d+'" fill="none" stroke="'+cs[j]+'" stroke-width="2"/>';v.forEach((y,i)=>{s+='<circle cx="'+lx(i)+'" cy="'+ly(y)+'" r="3" fill="'+cs[j]+'"><title>'+n+' '+xs[i]+': '+y+'</title></circle>'});ends.push({y:ly(v[3]),n:n.replace('GPT-3 (','').replace(')','')+' '+v[3],c:cs[j],how:n})});
  s+=endLabels(ends,W-pr+6,13);
  $('tb16Svg').innerHTML=svgW(W,H,s,'Table 16')}
let t18m=2;
function t18(W){const R=RC.table18;const H=200,pl=48,pr=14,pt=10,pb=30;const v=R.map(r=>r[t18m]);const lo=Math.min(...v),hi=Math.max(...v),pad=(hi-lo)*0.15||0.01;
  const lx=i=>pl+(W-pl-pr)*i/(R.length-1),ly=y=>pt+(H-pt-pb)*(1-(y-lo+pad)/(hi-lo+2*pad));let s='',d='';
  [lo,hi].forEach(y=>{s+=ln2(pl,ly(y),W-pr,ly(y),'var(--line)')+tx(pl-5,ly(y)+4,String(y),{fs:11,a:'end',c:'var(--mute)'})});
  R.forEach((r,i)=>{d+=(i?'L':'M')+lx(i).toFixed(1)+' '+ly(r[t18m]).toFixed(1);if(i%2===0||i===R.length-1)s+=tx(lx(i),H-pb+15,String(r[0]),{fs:11,a:'middle',c:'var(--mute)'})});
  s+='<path d="'+d+'" fill="none" stroke="var(--c1)" stroke-width="2"/>';const bi=t18m===1?v.indexOf(lo):v.indexOf(hi);R.forEach((r,i)=>{s+='<circle cx="'+lx(i)+'" cy="'+ly(r[t18m])+'" r="'+(i===bi?5:3)+'" fill="'+(i===bi?'var(--c2)':'var(--c1)')+'"><title>r = '+r[0]+': '+r[t18m]+'</title></circle>'});
  s+=tx((pl+W-pr)/2,H-3,'rank r',{fs:11,a:'middle',c:'var(--mute)'});$('tb18Svg').innerHTML=svgW(W,H,s,'Table 18')}
function incs(){$('tbIT').innerHTML=table(['What','Printed','Elsewhere in the paper','So'],RC.inconsistencies.map(x=>[esc(x.what),esc(x.printed),esc(x.table15),esc(x.note)]))}
segBind('tb2M',m=>{t2m=m;t2()});$('tb2Se').addEventListener('change',t2);
segBind('tb5M',m=>{t5m=+m;refit($('tb5Svg'));refit($('tb6Svg'))});segBind('tb18M',m=>{t18m=+m;refit($('tb18Svg'))});
onTab('t-tables',()=>{if(!window.__tbDone){window.__tbDone=1;checks();recount();t2();t3();t4();t15();incs()}fit($('tb1Svg'),t1);fit($('tb5Svg'),t5);fit($('tb6Svg'),t6);fit($('tb16Svg'),t16);fit($('tb18Svg'),t18)});
})();
