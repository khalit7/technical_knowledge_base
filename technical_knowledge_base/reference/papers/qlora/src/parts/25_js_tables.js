// ---- Tables tab: claims checked, every table sortable with deltas, figure values ----
(function(){
const P=window.PAPER,RC=P.rc,QD=window.QD;
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
function claims(){const vc=v=>/^reproduces|^consistent/.test(v)?'ok':/does not|suspect|wrong/.test(v)?'no':'';
  $('tbClaims').innerHTML='<thead><tr><th>claim</th><th>where</th><th>paper</th><th>recomputed</th><th>verdict</th></tr></thead><tbody>'+RC.claims.map(c=>'<tr><td>'+esc(c.text)+'</td><td>'+A(P.meta.ax+'#'+anchor(c.where),esc(c.where))+'</td><td>'+esc(c.paper)+'</td><td>'+esc(c.ours)+'<div class="small mute">'+esc(c.how)+'</div></td><td><span class="'+vc(c.verdict)+'">'+esc(c.verdict)+'</span></td></tr>').join('')+
  EXTRA.map(c=>'<tr><td>'+c[0]+'</td><td>'+A(P.meta.ax+'#'+c[5],c[1])+'</td><td>'+c[2]+'</td><td>'+c[3]+'</td><td><span class="'+vc(c[4])+'">'+c[4]+'</span></td></tr>').join('')+'</tbody>'}
const anchor=w=>{const m=w.match(/Table (\d+)/);if(m){const t=P.tables['t'+m[1]];if(t)return t.at}const f=w.match(/Figure (\d)/);if(f)return {1:'S1.F1',2:'S4.F2',3:'S4.F3',4:'A1.F4',6:'A7.F6'}[f[1]]||'S1';const a=w.match(/App(?:endix|\.) ([A-G])/);if(a)return 'A'+('ABCDEFG'.indexOf(a[1])+1);const s=w.match(/§(\d)/);return s?'S'+s[1]:'S1'};
const ev=QD.ev,E=ev.elo;
const EXTRA=[
 ['Elo, GPT-4 judge, OA benchmark (Table 7)','Table 7','GPT-4 1294, ChatGPT 1015, Guanaco 65B 1008, 33B 1002, Vicuna 936, 13B 885, 7B 860','replayed from the released verdicts: '+['gpt4','gpt35','guanaco-65b','guanaco-33b','vicuna-13b','guanaco-13b','guanaco-7b'].map(s=>Math.round(E.elo_gpt4_oa.mean[s])).join(', '),'reproduces (within 2)','S5.T7'],
 ['Elo, GPT-4 judge, Vicuna (Tables 1 and 7)','Table 1','1348, 1022, 992, 974, 966, 916 / 913, 902, 879','replayed: '+['gpt4','guanaco-65b','guanaco-33b','vicuna-13b','gpt35','guanaco-13b','bard','guanaco-7b'].map(s=>Math.round(E.elo_gpt4_vicuna.mean[s])).join(', ')+'; same ranks','reproduces the ranking; GPT-4 itself 27 higher','S1.T1'],
 ['Elo, human raters, Vicuna (Table 7)','Table 7','1176, 1023, 1010 (7B), 1009 (33B), 984, 975, 916, 909','replayed with one match per comparison (majority of 3): '+['gpt4','guanaco-65b','guanaco-7b','guanaco-33b','vicuna-13b','guanaco-13b','gpt35','bard'].map(s=>Math.round(E.elo_human_vicuna.mean[s])).join(', '),'close (within about 20); same top two','S5.T7'],
 ['Elo "95% CI ± 1"','Table 1','± 1','± '+Math.max(...Object.values(E.elo_gpt4_vicuna.ci)).toFixed(1)+' as 1.96 SE over 10,000 orderings; '+Math.round((E.elo_gpt4_vicuna.hi['guanaco-65b']-E.elo_gpt4_vicuna.lo['guanaco-65b'])/2)+' half-width when the 80 prompts are resampled','reproduces, but measures only match order','S1.T1'],
 ['Table 6 order columns from the released scores','Table 6','e.g. Guanaco 65B 96.7 / 101.9','Guanaco 65B '+ev.relative['guanaco-65b'].chatgpt_first.toFixed(1)+' / '+ev.relative['guanaco-65b'].system_first.toFixed(1)+'; every rebuildable row to the printed decimal','reproduces (GPT-4 row columns swapped)','S5.T6'],
 ['Table 6 95% CI','Table 6','± 4.4 for Guanaco 65B','bootstrap over prompts: '+ev.relative['guanaco-65b'].boot_lo.toFixed(1)+' to '+ev.relative['guanaco-65b'].boot_hi.toFixed(1),'similar size (method unstated)','S5.T6'],
 ['GPT-4 against human majority, example level','§5.3','Fleiss κ = 0.25','κ = '+ev.agreement.fleiss_gpt4_vs_majority.toFixed(2),'reproduces','S5.SS3'],
 ['Agreement among human annotators','§6.2','Fleiss κ = 0.42','κ = '+ev.agreement.fleiss_humans.toFixed(2)+' over all 2,240 three-worker comparisons','does not reproduce','S6.SS2'],
 ['System-level rank agreement, humans against GPT-4','§5.3','τ = 0.43, ρ = 0.55','from Table 7\'s own ranks ρ = '+ev.rank_agreement.table7.spearman.toFixed(2)+', τ = '+ev.rank_agreement.table7.kendall.toFixed(2)+'; from our replay ρ = '+ev.rank_agreement.ours.spearman.toFixed(2),'does not reproduce from Table 7','S5.SS3'],
 ['Table 5 against Table 4 (NF4 + DQ, same model and dataset)','Tables 4, 5','one set of runs?','Alpaca 7B 38.8 against 39.0, 13B 47.8 / 47.5, 65B 62.5 / 61.8; FLAN v2 13B 51.4 / 50.7; the other four agree','4 of 8 cells differ, unexplained','S5.T5'],
 ['Factorisation of 1833','§6.1','3 × 17 × 43','3 × 13 × 47 (3 × 17 × 43 = 2,193)','wrong in the paper','S6.SS1'],
 ['Guanaco\'s lawn answer is accurate','§6.1','"tends to be accurate"','its first line says $582, its working gives $558 (correct)','contradicts itself','S6.SS1']];
function tables(){const sel=$('tbSel'),keys=Object.keys(P.tables).filter(k=>P.tables[k].rows);keys.forEach(k=>{const o=document.createElement('option');o.value=k;o.textContent=P.tables[k].title.split(':')[0]+': '+P.tables[k].title.split(':').slice(1).join(':').slice(0,60);sel.appendChild(o)});
  let sortC=-1,sortD=1;
  function refOpts(){const T=P.tables[sel.value],r=$('tbRef');r.innerHTML='<option value="-1">(none)</option>'+T.rows.map((x,i)=>'<option value="'+i+'">'+esc(x[0]+(typeof x[1]==='string'&&x[1]!=='-'&&!/\d\.\d/.test(x[1])&&x[1].length<6?' '+x[1]:''))+'</option>').join('');sortC=-1}
  function draw(){const T=P.tables[sel.value],ref=+$('tbRef').value;let rows=T.rows.map((r,i)=>({r,i}));
    if(sortC>=0)rows.sort((a,b)=>{const x=a.r[sortC],y=b.r[sortC];if(typeof x==='number'&&typeof y==='number')return sortD*(y-x);return sortD*String(x).localeCompare(String(y))});
    $('tbCap').innerHTML=esc(T.title)+'. '+A(P.meta.ax+'#'+T.at,'In the paper');
    $('tbT').innerHTML='<thead><tr>'+T.cols.map((c,j)=>'<th data-c="'+j+'" style="cursor:pointer"'+(j?' class="num"':'')+'>'+esc(c)+(sortC===j?(sortD>0?' ▼':' ▲'):'')+'</th>').join('')+'</tr></thead><tbody>'+rows.map(({r,i})=>'<tr'+(i===ref?' class="hl"':'')+'>'+r.map((v,j)=>{if(j===0)return '<td>'+esc(v)+'</td>';const rv=ref>=0?T.rows[ref][j]:null;const d=(ref>=0&&i!==ref&&typeof v==='number'&&typeof rv==='number')?' <span class="small '+(v-rv>=0?'ok':'no')+'">'+(v-rv>=0?'+':'')+(Math.round((v-rv)*100)/100)+'</span>':'';return '<td class="num">'+(v==null?'-':esc(v))+d+'</td>'}).join('')+'</tr>').join('')+'</tbody>';
    $('tbT').querySelectorAll('th').forEach(th=>th.addEventListener('click',()=>{const c=+th.dataset.c;if(sortC===c)sortD=-sortD;else{sortC=c;sortD=1}draw()}))}
  sel.addEventListener('change',()=>{refOpts();draw()});$('tbRef').addEventListener('change',draw);refOpts();draw()}
function figs(){const F=QD.fig,m=k=>{const v=F.figure2.points[k];return v.map(x=>x.toFixed(2)).join(', ')+' (mean '+(v.reduce((a,b)=>a+b,0)/v.length).toFixed(2)+')'},mem=RC.mem;
  let h='<thead><tr><th>figure</th><th>series</th><th>values</th></tr></thead><tbody>';
  Object.keys(F.figure2.points).forEach(k=>{h+='<tr><td>Figure 2</td><td>'+esc(k)+'</td><td>'+m(k)+'</td></tr>'});
  Object.keys(F.figure4.points).forEach(k=>{const v=F.figure4.points[k];h+='<tr><td>Figure 4</td><td>r = '+k+'</td><td>'+v.length+' points, '+Math.min(...v).toFixed(2)+' to '+Math.max(...v).toFixed(2)+', mean '+(v.reduce((a,b)=>a+b,0)/v.length).toFixed(2)+'</td></tr>'});
  ['7B','13B','33B','65B'].forEach(s=>{const x=mem[s];h+='<tr><td>Figure 6</td><td>LLaMA '+s+' (total '+x.fig6_total_GB+' GB)</td><td>model '+fmt(x.fig6_model_MB,0)+' MB (recount '+fmt(x.base_nf4_dq_MB,0)+'), adapters '+x.fig6_adapters_MB+' MB (recount '+fmt(x.adapters_MB,0)+', ratio '+x.adapters_ratio.toFixed(3)+'), optimizer '+fmt(x.fig6_optimizer_MB,0)+' MB (= '+x.optimizer_over_adapters.toFixed(2)+' × adapters)</td></tr>'});
  $('tbFig').innerHTML=h+'</tbody>'}
onTab('t-tables',()=>{if(!$('tbT').innerHTML){claims();tables();figs()}});
})();
