// ---- The tables tab: every transcribed table from window.PAPER.tables (mk_tables.py), optionally as differences from the base model,
// and every check of recompute.py (inputs/recompute.json). Nothing here is typed by hand.
(function(){
if(!window.PAPER||!document.getElementById('biTsel'))return;
const T=PAPER.tables,RC=PAPER.rc,AX=PAPER.meta.ax;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const f2=v=>v==null?'–':(+v).toFixed(2),f1=v=>v==null?'–':(+v).toFixed(1);
const sg=(v,d)=>v==null?'–':(v>0?'+':v<0?'−':'')+Math.abs(v).toFixed(d);
const sub=(a,b)=>Math.round((a-b)*100)/100;
const link=(a,t)=>'<a href="'+AX+'#'+a+'" target="_blank" rel="noopener noreferrer">'+t+'</a>';
// each table: rows of [label, values, isBase?, baseValues?] under a header of budgets
function curves(title,blocks,anchor,note,prec){return {title,anchor,note,prec:prec||2,blocks}}
const D=[];
// Table 8
D.push(curves('Table 8: AIME accuracy and mean length behind Fig. 1 (three-seed means)',Object.entries(T.t8).map(([m,o])=>({h:m,budgets:o.budgets,rows:Object.entries(o.rows).flatMap(([c,v])=>[[c==='Base'?'Base, accuracy':c+'-trained, accuracy',v.acc,c==='Base',o.rows.Base.acc],[c==='Base'?'Base, mean length (k)':c+'-trained, mean length (k)',v.len,c==='Base',null]])})),'A4.T8','Trained values average three validation-selected seeds; base values are one evaluation; avg@3 on 60 problems.'));
D.push(curves('Table 9: AIME accuracy after Reasoning Gym training (single runs)',Object.entries(T.t9).map(([m,o])=>({h:m,budgets:o.budgets,rows:Object.keys(o).filter(k=>k!=='budgets').map(k=>[k,o[k],k==='Base',o.Base])})),'A4.T9',''));
D.push(curves('Tables 10 and 11: GPQA-Diamond and LiveCodeBench v6 (single runs)',Object.entries(T.t10).flatMap(([m,o])=>['GPQA','LCB-v6'].map(task=>{const rg=Object.entries(T.t11).find(([k])=>k.startsWith(m));const rows=Object.entries(o[task]).map(([c,v])=>[c==='Base'?'Base':c+'-trained (math)',v,c==='Base',o[task].Base]);if(rg)rows.push([rg[0].split(', ')[1]+'-trained (Reasoning Gym)',rg[1][task],false,o[task].Base]);return {h:m+', '+task,budgets:o.budgets,rows}})),'A4.T10','Reasoning Gym rows from Table 11, compared with the same base row.'));
D.push(curves('Table 3: the ablations (Qwen3.5-4B, 8k cap, AIME avg@16, one run each)',[{h:'Qwen3.5-4B, ± is the 95% interval over 60 problems',budgets:T.t3.budgets,rows:T.t3.rows.map((r,i)=>[r.group+': '+r.variant,r.acc,i===0,T.t3.rows[0].acc,r.ci])}],'S3.T3','The 8k column is the training budget.',1));
D.push(curves('Table 12: truncation rate, % of answers cut off at the budget',Object.entries(T.t12).flatMap(([m,o])=>['AIME','GPQA-Diamond','LiveCodeBench v6'].map(task=>({h:m+', '+task,budgets:o.budgets,rows:Object.entries(o[task]).map(([c,v])=>[c,v,c==='Base',o[task].Base])}))),'A5.T12','Budgets as printed; for Gemma and Nemotron the printed headers run 1k, 2k, 4k, 8k, 16k, 64k although Table 8 evaluates them from 512 to 16k.'));
D.push(curves('Tables 7, 13 and 14: base decoding against base answer forcing at matched total budgets',[['Qwen3.5-4B (Table 7)',T.t7],['Gemma4-E2B (Table 13)',T.t13],['Nemotron-3-Nano-4B (Table 14)',T.t14]].flatMap(([m,o])=>['AIME','GPQA-Diamond','LCB-v6'].map(task=>({h:m+', '+task,budgets:o.cols,rows:[['Total budget (tokens)',o[task].total,true,null,null,0],['Base decoding',o[task].base,true,null],['Answer forcing',o[task].forced,false,o[task].base]]}))),'A3.T7','Columns are the nominal reasoning setting; the total budget adds the answer window. A dash: the paper has no base run at that total budget.'));
D.push(curves('Tables 15 and 16: every seed, AIME accuracy (validation-selected, then final step 300)',[['selected',T.t15],['final',T.t16]].flatMap(([k,o])=>Object.entries(o.rows).map(([c,rs])=>({h:c+' cap, '+k+' checkpoints',budgets:o.budgets,rows:rs.map(r=>['seed '+r.seed+', step '+r.step,r.acc,false,null])}))),'A9.T15','avg@3 on 60 problems; the base rows are in Table 8.'));
D.push({title:'Table 1 and Table 6: lengths and training-set difficulty',anchor:'S2.T1',note:'Table 1: mean AIME output length (k tokens) at each model\'s largest budget, seed mean [min, max]. Table 6: measured with Qwen3.5-4B in thinking mode.',custom:()=>{
  let h='<thead><tr><th>Checkpoint</th><th>At</th><th class="num">Mean length (k)</th><th class="num">Seed min</th><th class="num">Seed max</th></tr></thead><tbody>';
  T.t1.forEach(r=>{h+='<tr><td>'+esc(r.model)+' base</td><td>'+r.at+'</td><td class="num">'+f2(r.base)+'</td><td></td><td></td></tr>';Object.entries(r.trained).forEach(([c,v])=>{h+='<tr><td>'+esc(r.model)+' '+c+'-trained</td><td>'+r.at+'</td><td class="num">'+f2(v[0])+'</td><td class="num">'+f2(v[1])+'</td><td class="num">'+f2(v[2])+'</td></tr>'})});
  h+='<tr><th>Training set (Table 6)</th><th></th><th class="num">Pass rate at 64k</th><th class="num">Truncated at 8k</th><th class="num">Median tokens</th></tr>';
  T.t6.forEach(r=>{h+='<tr><td>'+esc(r.data)+'</td><td></td><td class="num">'+r.pass64k+'%</td><td class="num">'+r.trunc8k+'%</td><td class="num">'+r.median.toLocaleString('en-GB')+'</td></tr>'});
  return h+'</tbody>'}});
const sel=document.getElementById('biTsel'),tab=document.getElementById('biTtab'),dl=document.getElementById('biTdelta'),note=document.getElementById('biTnote');
D.forEach((d,i)=>{const o=document.createElement('option');o.value=i;o.textContent=d.title;sel.appendChild(o)});
function draw(){const d=D[+sel.value];note.innerHTML=link(d.anchor,'In the paper')+'. '+esc(d.note);
  dl.disabled=!!d.custom;if(d.custom){tab.innerHTML=d.custom();return}
  const delta=dl.checked;let h='';
  d.blocks.forEach(b=>{h+='<tbody><tr><th>'+esc(b.h)+'</th>'+b.budgets.map(x=>'<th class="num">'+x+'</th>').join('')+'</tr>';
    b.rows.forEach(([lab,v,isBase,base,ci,prec])=>{const p=prec!=null?prec:d.prec;
      h+='<tr><td>'+esc(lab)+(delta&&!isBase&&base?' <span class="mute">(minus base)</span>':'')+'</td>'+v.map((x,j)=>{let s;
        if(delta&&!isBase&&base&&x!=null&&base[j]!=null)s=sg(sub(x,base[j]),d.prec===1?1:2);else s=x==null?'–':(p===0?(+x).toLocaleString('en-GB'):(+x).toFixed(p));
        if(ci&&!delta)s+=' <span class="mute">±'+ci[j].toFixed(1)+'</span>';return '<td class="num">'+s+'</td>'}).join('')+'</tr>'});
    h+='</tbody>'});
  tab.innerHTML=h}
sel.addEventListener('change',draw);dl.addEventListener('change',draw);
// recompute checks
const verdict=c=>c.ok===null?'derived':c.ok?(c.expect?'agrees':'?'):(c.expect?'differs':'does not reproduce');
const show=v=>Array.isArray(v)?v.map(x=>typeof x==='number'?x:esc(x)).join(', '):(v==null?'':v);
document.getElementById('biRcB').innerHTML=RC.checks.map(c=>'<tr><td>'+esc(c.what)+'</td><td class="num">'+show(c.paper)+'</td><td class="num">'+show(c.ours)+'</td><td>'+verdict(c)+'</td><td>'+link(c.where,c.where)+'</td></tr>').join('');
document.getElementById('biRcSum').textContent=RC.agree+' of '+RC.n+' printed numbers agree; '+RC.documented_disagree+' do not reproduce (shown on the page), and '+RC.derived+' further numbers are derived here.';
const line=document.getElementById('biRcLine');if(line)line.innerHTML=RC.agree+' of '+RC.n+' checks agree, the other '+RC.documented_disagree+' are the slips in the box below; <a href="#" data-tab="t-tables">the tables tab</a>';
if(window.RD&&RD.tabLinks&&line)RD.tabLinks(line);
draw();
})();
