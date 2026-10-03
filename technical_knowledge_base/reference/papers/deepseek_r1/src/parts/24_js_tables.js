// ---- Tables tab: the paper's tables, sortable, with differences against a chosen column ----
(function(){
const TB=PAPER.tables,RC=PAPER.rc;
const DEFS=[
 {k:'t3',n:'Table 3: stage by stage',cap:'Table 3 (§4): DeepSeek-R1 at each stage. New in the Nature version.',at:'S3.T3',diff:0,note:()=>'Bold cells: '+RC.bold_t3.bold+', all row maxima; '+RC.bold_t3.small.length+' lead by a point or less ('+RC.bold_t3.small.join('; ')+').'},
 {k:'t8',n:'Table 8: against other models',cap:'Table 8 (Appendix D.2), identical to the January version\'s Table 4. o1-1217\'s numbers are OpenAI\'s own reports.',at:'A4.T8',diff:5},
 {k:'t12',n:'Table 12: against V3',cap:'Table 12 (Appendix E.1): the base, the chat model built on it, R1-Zero and R1.',at:'A5.T12',diff:1},
 {k:'v1t5',n:'Tables 15 and 5 (v1): distillation',cap:'Table 15 (Appendix F) with the January version\'s Table 5 rows for o1-mini and QwQ-32B-Preview. AIME cons@64 is a 64-sample majority vote.',at:'A6.T15',model:true},
 {k:'t16',n:'Table 16: distillation against RL',cap:'Table 16 (Appendix F.1): the same Qwen2.5-32B base, RL from scratch (10K+ steps) against fine-tuning on R1\'s samples.',at:'A6.T16',model:true},
 {k:'t17',n:'Table 17: RL on a pre-o1 base',cap:'Table 17 (Appendix F.1), added at a referee\'s request: Qwen2-Math-7B (August 2024) after about 10,000 RL steps.',at:'A6.T17',model:true},
 {k:'t13',n:'Table 13: fresh competitions',cap:'Table 13 (Appendix E.2): AMC 12 2024 (out of 150), AIME 2025 II (out of 15), USAMO index = AMC + 10 × AIME; 251.5 qualifies.',at:'A5.T13',model:true,extra:true},
 {k:'t14',n:'Table 14: by difficulty',cap:'Table 14 (Appendix E.5): LiveCodeBench pass@1 by difficulty at each stage.',at:'A5.T14',model:true},
 {k:'t4',n:'Table 4: RL data',cap:'Table 4 (Appendix B.3.1). The text adds 8K bug-fixing problems to code and 12K harmlessness questions to general.',at:'A2.T4',model:true},
 {k:'t5',n:'Table 5: SFT data',cap:'Table 5 (Appendix B.3.3): the 800K samples for Dev3 and the distilled models.',at:'A2.T5',model:true},
 {k:'t6',n:'Table 6: distilled models',cap:'Table 6 (Appendix B.4.3): base models and initial learning rates.',at:'A2.T6',model:true},
 {k:'t7',n:'Table 7: cost',cap:'Table 7 (Appendix B.4.4), at $2 per H800 GPU hour.',at:'A2.T7',model:true},
 {k:'t9',n:'Table 9: safety benchmarks',cap:'Table 9 (Appendix D.3.2). In parentheses: the model alone, without DeepSeek\'s risk control system. * rerun by DeepSeek; the rest from HELM.',at:'A4.T9',model:true},
 {k:'t10',n:'Table 10: in-house safety',cap:'Table 10 (Appendix D.3.3): unsafe and rejected shares (%) on 1,120 questions.',at:'A4.T10',model:true},
 {k:'t11',n:'Table 11: jailbreaks',cap:'Table 11 (Appendix D.3.5): unsafe and rejected shares (%) on the original questions and with 2,232 jailbreak templates.',at:'A4.T11',model:true},
 {k:'ver',n:'v1 against v2: R1-Zero',cap:'R1-Zero in the January version (Table 2, against o1) and in the Nature version (Tables 3 and 12).',at:'S3.T3',model:true}];
let cur=0,sortC=-1,sortD=1,diffC=-1;
const chips=$('tbChips');DEFS.forEach((d,i)=>{const b=document.createElement('button');b.textContent=d.n;b.dataset.i=i;if(!i)b.className='on';b.addEventListener('click',()=>{cur=i;sortC=-1;diffC=-1;chips.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));render()});chips.appendChild(b)});
function data(d){if(d.k==='ver'){const v1=TB.v1t2.rows.find(r=>r.model==='DeepSeek-R1-Zero'),z=RC.zero_versions.v2;return {cols:['AIME pass@1','AIME cons@64','MATH-500','GPQA Diamond','LiveCodeBench','Codeforces rating'],rows:[{model:'R1-Zero, January (v1 Table 2)',v:v1.v,n:v1.n},{model:'R1-Zero, Nature (v2 Tables 3, 12)',v:z.map(x=>x==null?'-':String(x)),n:z}].concat(TB.v1t2.rows.filter(r=>r.model!=='DeepSeek-R1-Zero').map(r=>({model:r.model+' (v1 Table 2)',v:r.v,n:r.n})))}}
  const t=TB[d.k];return {cols:t.cols,rows:t.rows.map(r=>({model:r.bench?(r.bench+(r.metric?' ('+r.metric+')':'')):r.model,group:r.group,v:r.v,n:r.n||r.v.map(x=>{const f=parseFloat(String(x).replace(/[^0-9.\-]/g,''));return isNaN(f)?null:f}),bold:r.bold}))}}
function render(){const d=DEFS[cur],D=data(d);$('tbCap').innerHTML=d.cap+' <a href="'+PAPER.meta.ax+'#'+d.at+'" target="_blank" rel="noopener noreferrer">In the paper</a>.';
  const numeric=D.rows.some(r=>r.n&&r.n.some(v=>v!=null));
  $('tbCtl').innerHTML=numeric?'<label class="small">Show as difference from <select id="tbDiff"><option value="-1">(printed values)</option>'+D.cols.map((c,i)=>'<option value="'+i+'"'+(i===diffC?' selected':'')+'>'+c+'</option>').join('')+'</select></label>':'';
  if(numeric)$('tbDiff').addEventListener('change',e=>{diffC=+e.target.value;render()});
  let rows=D.rows.slice();if(sortC>=0)rows.sort((a,b)=>{const x=sortC===0?a.model:(a.n[sortC-1]==null?-1e9:a.n[sortC-1]),y=sortC===0?b.model:(b.n[sortC-1]==null?-1e9:b.n[sortC-1]);return (x>y?1:x<y?-1:0)*sortD});
  let h='<thead><tr><th data-c="0" style="cursor:pointer">'+(d.model?'':'Benchmark')+'</th>'+D.cols.map((c,i)=>'<th class="num" data-c="'+(i+1)+'" style="cursor:pointer">'+c+'</th>').join('')+(d.extra?'<th class="num">index recomputed</th>':'')+'</tr></thead><tbody>';
  let grp=null;rows.forEach(r=>{if(sortC<0&&r.group&&r.group!==grp){grp=r.group;h+='<tr><td colspan="'+(D.cols.length+1)+'" class="small mute" style="padding-top:8px"><b>'+grp+'</b></td></tr>'}
    h+='<tr><td>'+r.model+'</td>'+r.v.map((v,i)=>{let t=v;if(diffC>=0&&i!==diffC&&r.n[i]!=null&&r.n[diffC]!=null){const dd=r.n[i]-r.n[diffC];t='<span style="color:'+(dd>0?'var(--good)':dd<0?'var(--bad)':'var(--mute)')+'">'+(dd>0?'+':'')+(Math.abs(dd)>=100?dd.toFixed(0):dd.toFixed(1))+'</span>'}
      return '<td class="num"'+(r.bold&&r.bold[i]?' style="font-weight:700"':'')+'>'+t+'</td>'}).join('');
    if(d.extra){const x=RC.t13.find(o=>o.model===r.model);h+='<td class="num">'+(x?x.index.toFixed(1)+(x.qualifies?' ✓':''):'')+'</td>'}h+='</tr>'});
  $('tbT').innerHTML=h+'</tbody>';$('tbT').querySelectorAll('th[data-c]').forEach(th=>th.addEventListener('click',()=>{const c=+th.dataset.c;if(sortC===c)sortD=-sortD;else{sortC=c;sortD=c?-1:1}render()}));
  $('tbNote').innerHTML=d.note?d.note():''}
render();
const V={'reproduces':'ok','reproduces (as points)':'ok','reproduces (maths only, as stated)':'ok','close':'mid','derived':'mid','within noise':'mid','cannot be checked':'mid','not like for like':'no','table and text differ':'no','does not add up':'no','text disagrees with itself':'no','text disagrees with table':'no','versions differ':'mid','does not reproduce':'no'};
$('ckList').innerHTML=RC.checks.map(c=>'<li><span class="vd '+(V[c.verdict]||'mid')+'">'+c.verdict+'</span> <b>'+c.claim+'</b> <span class="mute">('+c.where+'; printed: '+c.printed+')</span>: '+c.got+'</li>').join('');
$('figT').innerHTML='<thead><tr><th>Figure</th><th class="num">panel</th><th class="num">PDF page</th><th class="num">ticks x / y</th><th class="num">largest tick residual x / y</th><th class="num">series</th></tr></thead><tbody>'+RC.fig_fits.map(f=>'<tr><td>'+f.fig+'</td><td class="num">'+(f.panel+1)+'</td><td class="num">'+f.page+'</td><td class="num">'+f.x_ticks+' / '+f.y_ticks+'</td><td class="num">'+f.x_resid.toExponential(1)+' / '+f.y_resid.toExponential(1)+(f.y2_resid!=null?' (right axis '+f.y2_resid.toExponential(1)+')':'')+'</td><td class="num">'+f.series+'</td></tr>').join('')+'</tbody>';
})();
