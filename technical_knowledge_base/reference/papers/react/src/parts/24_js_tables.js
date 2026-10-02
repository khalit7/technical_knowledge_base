// ---- The tables tab: Table 1 with gaps and standard errors, the three-source conflict, Figure 2 rebuilt,
// Table 2 with the Appendix E.1 examples, Figure 3 rebuilt, Table 3, Table 4 ----
(function(){
const N=500,arrow=s=>s.replace(/ -> /g,' → ');
// Table 1
let t1k='hq';
function drawT1(){const base=$('t1B').value,rows=TB.t1.rows.slice(),b=+rows.find(r=>r.m===base)[t1k];
  if($('t1S').checked)rows.sort((x,y)=>+y[t1k]-+x[t1k]);
  const gs=(a,c)=>Math.sqrt(a/100*(1-a/100)/N+c/100*(1-c/100)/N)*100;
  $('t1T').innerHTML='<thead><tr><th>Method</th><th class="num">'+(t1k==='hq'?'HotpotQA EM':'FEVER acc.')+'</th><th style="width:38%"></th><th class="num">Gap vs '+esc(base)+'</th><th class="num">SE of gap</th><th class="num">z</th></tr></thead><tbody>'+rows.map(r=>{const v=+r[t1k],sota=r.kind==='sota',g=v-b,se=gs(v,b),z=g/se;
    return '<tr'+(r.m===base?' style="background:var(--soft)"':'')+'><td>'+(r.m==='ReAct'?'<b>ReAct</b>':esc(arrow(r.m)))+'</td><td class="num">'+r[t1k]+'</td><td><div class="bars"><div class="track" style="height:12px"><div class="fill" style="width:'+v+'%;background:'+KC[r.kind]+'"></div></div></div></td><td class="num">'+(r.m===base?'':(g>=0?'+':'')+g.toFixed(1))+'</td><td class="num">'+(r.m===base||sota?'':se.toFixed(1))+'</td><td class="num">'+(r.m===base||sota?'':'<span class="'+(Math.abs(z)>=2?'ok':'mute')+'">'+z.toFixed(1)+'</span>')+'</td></tr>'}).join('')+'</tbody>';}
segBind('t1M',m=>{t1k=m;drawT1()});$('t1B').addEventListener('change',drawT1);$('t1S').addEventListener('change',drawT1);
// the three sources
const R5=TB.t5.rows,RM_=TB.readme.rows,t1=m=>TB.t1.rows.find(r=>r.m===m);
$('t5T').innerHTML='<thead><tr><th>ReAct result</th><th class="num">Table 1 / 3 / 4</th><th class="num">Table 5</th><th class="num">README</th></tr></thead><tbody>'+[
  ['PaLM-540B, HotpotQA EM',t1('ReAct').hq,R5[0].palm,RM_[0].hq],['PaLM-540B, FEVER',t1('ReAct').fv,'',RM_[0].fv],['PaLM-540B, ALFWorld %','71 (best of 6)',R5[1].palm,RM_[0].alf],['PaLM-540B, WebShop SR %',TB.t4.rows[1].sr,'',RM_[0].ws],
  ['GPT-3, HotpotQA EM','',R5[0].gpt3,RM_[1].hq],['GPT-3, FEVER','','',RM_[1].fv],['GPT-3, ALFWorld %','',R5[1].gpt3,RM_[1].alf],['GPT-3, WebShop SR %','','',RM_[1].ws]].map(r=>{const vs=r.slice(1).filter(Boolean).map(x=>parseFloat(x)),diff=vs.length>1&&Math.max(...vs)-Math.min(...vs)>0.15;
  return '<tr><td>'+r[0]+'</td>'+r.slice(1).map(x=>'<td class="num'+(diff&&x?' ':'')+'">'+(x?(diff?'<span class="no">'+x+'</span>':x):'<span class="mute">not given</span>')+'</td>').join('')+'</tr>'}).join('')+'</tbody>';
// Figure 2
let f2k='hotpotqa';const F2C={'CoT-SC -> ReAct':'var(--c1)','ReAct -> CoT-SC':'var(--c2)','CoT-SC':'var(--c3)','ReAct':'var(--c5)','CoT':'var(--c4)'};
function drawF2(){const host=$('f2P');fit(host,W=>{const D=RC.fig2[f2k],ks=Object.keys(D),all=ks.flatMap(k=>D[k].map(p=>p[1]));
  const lo=Math.floor(Math.min(...all)-1),hi=Math.ceil(Math.max(...all)+.5),H=Math.min(320,Math.max(230,W*.5)),pl=38,pr=10,pt=10,pb=34;
  const x=v=>pl+(W-pl-pr)*(v)/22,y=v=>pt+(H-pt-pb)*(1-(v-lo)/(hi-lo));let s='';
  const st=hi-lo>12?5:2;for(let v=Math.ceil(lo/st)*st;v<=hi;v+=st){s+=ln2(pl,y(v),W-pr,y(v),'var(--line)');s+=tx(pl-4,y(v)+4,v,{fs:11,a:'end',c:'var(--mute)'})}
  [1,5,10,15,20].forEach(v=>s+=tx(x(v),H-pb+14,v,{fs:11,a:'middle',c:'var(--mute)'}));s+=tx((W+pl)/2,H-4,'CoT-SC samples',{fs:11,a:'middle',c:'var(--mute)'});
  ks.forEach(k=>{const dash=(k==='ReAct'||k==='CoT');s+='<polyline fill="none" stroke="'+F2C[k]+'" stroke-width="2.4"'+(dash?' stroke-dasharray="6 4"':'')+' points="'+D[k].map(p=>x(p[0]).toFixed(1)+','+y(p[1]).toFixed(1)).join(' ')+'"/>';if(!dash)D[k].forEach(p=>s+='<circle cx="'+x(p[0]).toFixed(1)+'" cy="'+y(p[1]).toFixed(1)+'" r="2.2" fill="'+F2C[k]+'"/>')});
  const tk=f2k==='hotpotqa'?'hq':'fv';ks.forEach(k=>{const tv=+t1(k)[tk];s+='<circle cx="'+x(21.6).toFixed(1)+'" cy="'+y(tv).toFixed(1)+'" r="3.5" fill="none" stroke="'+F2C[k]+'" stroke-width="1.6"/>'});
  const L=legend(ks.map(k=>[arrow(k),F2C[k],(k==='ReAct'||k==='CoT')?'5 3':null]).concat([['Table 1 value (ring)','var(--mute)']]),pl,H+16,W-pl);
  host.innerHTML=svgW(W,H+L.h+8,s+L.s,'Figure 2 rebuilt')});
  const tk=f2k==='hotpotqa'?'hq':'fv';
  $('f2T').innerHTML='<thead><tr><th>Method</th><th class="num">1 sample</th><th class="num">5</th><th class="num">21</th><th class="num">Table 1</th><th class="num">Figure minus table</th></tr></thead><tbody>'+Object.keys(RC.fig2[f2k]).map(k=>{const P=RC.fig2[f2k][k],at=n=>P.find(p=>Math.abs(p[0]-n)<.5)[1],d=at(21)-(+t1(k)[tk]);
   return '<tr><td>'+esc(arrow(k))+'</td><td class="num">'+at(1).toFixed(2)+'</td><td class="num">'+at(5).toFixed(2)+'</td><td class="num">'+at(21).toFixed(2)+'</td><td class="num">'+t1(k)[tk]+'</td><td class="num">'+(Math.abs(d)<.15?'<span class="ok">'+(d>=0?'+':'')+d.toFixed(2)+'</span>':'<span class="no">'+(d>=0?'+':'')+d.toFixed(2)+'</span>')+'</td></tr>'}).join('')+'</tbody>'}
segBind('f2M',m=>{f2k=m;refit($('f2P'));drawF2()});
// Table 2 with examples
let t2sel='Failure: Hallucination';
function drawT2(){const R=TB.t2.rows;$('t2T').innerHTML='<thead><tr><th>Type</th><th>Definition</th><th class="num">ReAct</th><th class="num">CoT</th></tr></thead><tbody>'+R.map(r=>{const key=r.grp+': '+r.type.replace(' result','');
  return '<tr data-k="'+esc(key)+'" style="cursor:pointer'+(key===t2sel?';background:var(--acc2)':'')+'" tabindex="0"><td><b>'+r.grp+'</b>: '+esc(r.type)+'</td><td>'+esc(r.def)+'</td><td class="num">'+(r.react==null?'n/a':r.react+'%')+'</td><td class="num">'+(r.cot==null?'n/a':r.cot+'%')+'</td></tr>'}).join('')+'</tbody>';
  $('t2T').querySelectorAll('tr[data-k]').forEach(tr=>{const go=()=>{t2sel=tr.dataset.k;drawT2()};tr.addEventListener('click',go);tr.addEventListener('keydown',e=>{if(e.key==='Enter')go()})});
  const ex=E1[t2sel]||{};$('t2E').innerHTML='<div class="small"><b>'+esc(t2sel)+'</b>: the paper\'s example'+(Object.keys(ex).length>1?'s':'')+' (Appendix E.1)</div>'+Object.entries(ex).map(([m,L])=>'<div class="e1"><div class="small mute"><b>'+m+'</b></div>'+L.map(l=>'<div>'+esc(l)+'</div>').join('')+'</div>').join('')}
const T=RC.t2;$('t2C').innerHTML='Successes add to '+T.success_sum.ReAct+'% (ReAct) and '+T.success_sum.CoT+'% (CoT); failures to <b>'+T.failure_sum.ReAct+'%</b> (ReAct) and '+T.failure_sum.CoT+'% (CoT). With 50 trajectories per cell every share should be a multiple of 2%. CoT\'s columns are; ReAct\'s failure column (47, 23, 0, 29) is not, and <code>recompute.py</code> finds no count from 1 to 60 whose rounded shares give those four numbers and add up. ReAct\'s failure split was probably computed over a different number of trajectories, or misprinted; the paper does not say.';
// Figure 3
const drawF3=()=>f3draw($('f3P'),['prompt','finetune']);
// Table 3
function drawT3(){const v=$('t3R').value,R=TB.t3.rows.filter(r=>v==='all'||(v==='main'?/^(Act|ReAct \(|BUTLER \()/.test(r.m):/^ReAct/.test(r.m))),C=TB.t3.cols.concat(['All']);
  const sh=x=>'background:color-mix(in srgb,var(--acc) '+Math.round(x*.55)+'%,var(--bg))';
  $('t3T').innerHTML='<thead><tr><th>Method</th>'+C.map(c=>'<th class="num">'+c+'</th>').join('')+'</tr></thead><tbody>'+R.map(r=>'<tr><td'+(r.kind==='react'?' style="font-weight:600"':'')+'>'+esc(r.m)+'</td>'+C.map(c=>'<td class="num" style="'+sh(r[c])+(c==='All'?';font-weight:700':'')+'">'+r[c]+'</td>').join('')+'</tr>').join('')+'</tbody>';
  const a=RC.t3;$('t3Avg').textContent='unweighted mean of the six task cells: ReAct best '+a['ReAct (best of 6)'].unweighted_mean_of_tasks+' against All '+a['ReAct (best of 6)'].all+'; Act best '+a['Act (best of 6)'].unweighted_mean_of_tasks+' against '+a['Act (best of 6)'].all+'; BUTLER '+a['BUTLER (best of 8)'].unweighted_mean_of_tasks+' against '+a['BUTLER (best of 8)'].all;}
$('t3R').addEventListener('change',drawT3);
// Table 4
let t4k='sr';const drawT4=()=>hbars($('t4B'),TB.t4.rows.map(r=>({n:r.m,v:+r[t4k],c:KC[r.kind],se:t4k==='sr'&&r.kind!=='human'?seP(+r.sr,500):0,hl:r.m==='ReAct'})),100,v=>v.toFixed(1));segBind('t4M',m=>{t4k=m;drawT4()});
onTab('t-tables',()=>{drawT1();drawF2();drawT2();drawF3();drawT3();drawT4()});
})();
