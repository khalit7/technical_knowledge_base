// ---- The tables tab: Table 2 (sortable), the 25 pairs, Table 3, every recomputed check ----
(function(){
const T=PAPER.tables,RC=PAPER.rc;
const NE={'Zebra puzzles':512,'Knights-and-knaves':512,'Knights-and-knaves, Muon':512,'Nim':512,'MBPP+ (held-out 224)':224,'HumanEval+':164,'String manipulation':512,'MATH, level 5':128,'GSM8K':512};
const neOf=r=>r.task.indexOf('MATH, levels')===0?(r.model==='1.7B'?128:512):NE[r.task];
const nOf=r=>r.n.indexOf('/')>=0?r.n.split('/').map(Number):[+r.n,+r.n];
const seOf=r=>{const n=nOf(r),p=0.25/neOf(r);return 100*Math.sqrt(p/n[0]+p/n[1])};
let m2='paper';
function t2(){const rows=T.table2.map((r,i)=>Object.assign({i},r));if(m2==='delta')rows.sort((a,b)=>b.d-a.d);
  $('fcT2b').innerHTML=rows.map(r=>{const se=seOf(r);return '<tr><td>'+r.task+'</td><td>'+r.model+'</td><td class="num">'+r.n+'</td><td class="num">'+r.nearest+'</td><td class="num">'+r.faircast+'</td><td class="num" style="font-weight:600;color:'+(r.d<0?'var(--bad)':Math.abs(r.d)<se?'var(--mute)':'var(--good)')+'">'+r.delta+'</td><td class="num">'+se.toFixed(1)+'</td></tr>'}).join('')}
const sg=$('fcT2M');sg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{sg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});m2=b.dataset.m;t2()}));
t2();
$('fcPTb').innerHTML=T.pairs.map(p=>'<tr><td>'+p.task+'</td><td>'+p.model+'</td><td class="num">'+p.seed+'</td><td>'+(p.opt==='muon'?'Muon':'AdamW')+'</td><td class="num">'+(p.task==='mbppplus'?(p.seed===0?121:224):p.n_eval)+'</td><td class="num">'+p.nearest.toFixed(3)+'</td><td class="num">'+p.faircast.toFixed(3)+'</td><td class="num" style="font-weight:600;color:'+(p.delta<0?'var(--bad)':'var(--ink)')+'">'+(p.delta>0?'+':'')+p.delta.toFixed(1)+'</td></tr>').join('');
$('fcT3xb').innerHTML=T.table3.rows.map(r=>'<tr><td>'+r.arm+'</td>'+r.vals.map(v=>'<td class="num">'+v.toFixed(1)+'</td>').join('')+'</tr>').join('');
const ax=a=>A(PAPER.meta.ax+'#'+a,a.replace(/^S(\d+)\.T(\d+)$/,'Table $2').replace(/^S(\d+)\.SS(\d+)$/,'§$1.$2').replace(/^S(\d+)$/,'§$1'));
$('fcRCb').innerHTML=RC.checks.map(c=>'<tr><td>'+c.name+'<div class="small mute">'+c.how+'</div></td><td>'+ax(c.at)+'</td><td>'+c.paper+'</td><td>'+c.ours+'</td><td style="font-weight:600;color:'+(c.agree?'var(--good)':'var(--bad)')+'">'+(c.agree?'agrees':'differs')+'</td></tr>').join('');
$('fcRcSum').innerHTML='<b>'+RC.agree+' of '+RC.n+'</b> checks agree; the defaults reproduce every Table 2 mean and standard deviation independently, from the released per-pair table.';
$('fcRcBad').innerHTML=RC.checks.filter(c=>!c.agree).map(c=>c.name+': paper '+c.paper+', recomputed '+c.ours+'.').join(' ');
})();
