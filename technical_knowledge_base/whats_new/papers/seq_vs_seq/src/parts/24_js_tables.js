// ---- Tables tab: every table sortable, deltas, the Table 8 column check ----
(function(){
const P=window.PAPER,T=P.tables,RC=P.rc,AX=P.meta.ax;
const num=v=>{const x=parseFloat(String(v).replace(/,/g,''));return isNaN(x)?null:x};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const pm=v=>String(v).replace(' $\\pm$ ',' ± ');
// render: cols [{k,label,num}], rows [{...}], sort state on the element
function table(el,cols,rows,opt){opt=opt||{};const st=el.__st||(el.__st={k:null,dir:-1});
  let rs=rows.slice();if(st.k!=null){const c=cols.find(c=>c.k===st.k);rs.sort((a,b)=>{const x=c.num?num(a[st.k]):a[st.k],y=c.num?num(b[st.k]):b[st.k];if(x==null)return 1;if(y==null)return -1;return (x<y?-1:x>y?1:0)*st.dir})}
  let h='<table><thead><tr>'+cols.map(c=>'<th class="'+(c.num?'num ':'')+'srt" data-k="'+c.k+'" role="button" tabindex="0" title="Sort">'+c.label+(st.k===c.k?(st.dir>0?' ▲':' ▼'):'')+'</th>').join('')+'</tr></thead><tbody>';
  const mixed=rows.some(r=>!/ettin/i.test(r.name||''))&&rows.some(r=>/ettin/i.test(r.name||''));let lastG=null;rs.forEach(r=>{if(st.k==null&&r.g&&r.g!==lastG){h+='<tr><td colspan="'+cols.length+'" class="mute small">'+esc(r.g)+'</td></tr>';lastG=r.g}
    h+='<tr'+(mixed&&/ettin/i.test(r.name||'')?' style="background:var(--acc2)"':'')+'>'+cols.map((c,ci)=>'<td class="'+(c.num?'num':'')+'"'+(ci===0?' style="white-space:nowrap"':'')+(r['_c_'+c.k]?' style="'+r['_c_'+c.k]+'"':'')+'>'+(r[c.k]==null?'':r['_h_'+c.k]||esc(r[c.k]))+'</td>').join('')+'</tr>'});
  el.innerHTML=h+'</tbody></table>';
  el.querySelectorAll('th.srt').forEach(th=>{const go=()=>{const k=th.dataset.k;if(st.k===k)st.dir=st.dir===-1?1:(st.k=null,-1);else{st.k=k;st.dir=-1}table(el,cols,rows,opt)};th.addEventListener('click',go);th.addEventListener('keydown',e=>{if(e.key==='Enter')go()})})}
function rowsOf(t,extra){return t.rows.map(r=>{const o={name:r.name,g:r.g};t.cols.forEach((c,i)=>o['c'+i]=r.v[i]);if(extra)extra(o,r);return o})}
const colsOf=t=>[{k:'name',label:'Model'}].concat(t.cols.map((c,i)=>({k:'c'+i,label:esc(c),num:true})));
function deltas(t,rows,on){if(!on)return rows;const byG={};rows.forEach(r=>(byG[r.g]=byG[r.g]||[]).push(r));
  return rows.map(r=>{const o=Object.assign({},r);if(!/ettin/i.test(r.name))return o;t.cols.forEach((c,i)=>{const others=byG[r.g].filter(x=>!/ettin/i.test(x.name)).map(x=>num(x['c'+i])).filter(v=>v!=null);if(!others.length)return;const d=num(r['c'+i])-Math.max(...others);o['_h_c'+i]=esc(r['c'+i])+' <span class="small" style="color:'+(d>=0?'var(--good)':'var(--bad)')+'">('+(d>=0?'+':'')+d.toFixed(1)+')</span>'});return o})}
// ---- checks list ----
(function(){const b=$('chkB');if(!b)return;const p=RC.params,ok=p.every(x=>Math.abs(x.total_M-parseFloat(x.printed[0]))<0.06);
  const r=[
  ['Parameter counts (Table 11) from the released configurations',(ok?'all six sizes reproduce total, embedding and non-embedding counts to the printed 0.1M, independently':'mismatch')+'; each pair\'s configurations differ only in the causal flags'],
  ['Averages: Table 4 (10 tasks), Table 7 (GLUE, 8 tasks), Table 8',(RC.avg_bad.avg_T4.length+RC.avg_bad.avg_T7.length+RC.avg_bad.avg_T8.length)+' of '+(RC.avg_T4.length+RC.avg_T7.length+RC.avg_T8.length)+' rows differ from the mean of their printed columns by more than 0.05; all within 0.08 (rounding of the inputs)'],
  ['Table 9 against Figure 1 (decoded from the SVG)','largest difference '+RC.fig1_vs_T9_maxdiff+': identical'],
  ['Table 8 against Table 4, decoder rows',RC.sciq_siqa.all_swapped?'all six decoder rows carry Table 4\'s SciQ and SIQA values under swapped headers (the decoder-from-encoder rows too: a 17M model cannot score 70.9 on three-way Social IQA)':'not swapped'],
  ['Table 2 sums','pretraining '+RC.mix_totals.sums[0]+'B, mid-training '+RC.mix_totals.sums[1]+'B, decay '+RC.mix_totals.sums[2]+'B (printed totals match; text: 1.7T, 250B, 50B); pretraining shares sum to '+RC.mix_totals.pct_sums[0]+'%'],
  ['Checkpoints','236 × 8.5B = '+fmt(RC.checkpoints.tokens_B)+'B tokens, the whole 2T run'],
  ['Cross-objective share','50B / 2T = 2.5%; the 1B: 16.7B / 667B = 2.5%'],
  ['LLM2Vec\'s MNTP budget (the paper: "around 10B")','at most 1,000 × 32 × 512 = 16.4M tokens from its own configuration; Ettin\'s 50B is about '+fmt(RC.llm2vec.ratio_50B)+' times that'],
  ['Largest size ratio a native model wins at (Table 9)','MNLI '+RC.size_ratio.mnli_enc_vs_dec.ratio+'x, MS MARCO '+RC.size_ratio.msmarco_enc_vs_dec.ratio+'x, generative '+RC.size_ratio.gen_dec_vs_enc.ratio+'x: not "an order of magnitude"'],
  ['Figure 2 (decoded)','shares are whole numbers of 240 sentences; encoders choose neutral pronouns more often only up to 150M, and male pronouns more often than decoders at 400M and 1B'],
  ['Noise (derived)','MNLI dev (9,815): standard error '+RC.noise.mnli_se_at_89+' per model, '+RC.noise.mnli_diff_se+' per difference; MS MARCO dev (6,980 queries): at most '+RC.noise.marco_se_bound+' and '+RC.noise.marco_diff_se_bound+'; ten-task generative average: about '+RC.noise.gen_avg_se_1b]];
  b.innerHTML=r.map(x=>'<tr><td>'+x[0]+'</td><td>'+x[1]+'</td></tr>').join('')})();
function t3(){table($('t3T'),colsOf(T.T3),deltas(T.T3,rowsOf(T.T3),$('t3D').value==='best'))}
function t4(){table($('t4T'),colsOf(T.T4),deltas(T.T4,rowsOf(T.T4),$('t4D').value==='best'))}
function t8(){const fix=$('t8R').value==='fix',sz=$('t8S').value,c=T.T8.cols,si=c.indexOf('SIQA'),sc=c.indexOf('SciQ');
  let rows=rowsOf(T.T8,(o,r)=>{const dec=/ettin[-–]+dec/i.test(r.name);if(fix&&dec){o['c'+si]=r.v[sc];o['c'+sc]=r.v[si];o['_c_c'+si]=o['_c_c'+sc]='background:var(--hl)'}});
  if(sz!=='all')rows=rows.filter(r=>r.name.toLowerCase().replace('–','-').endsWith('-'+sz.toLowerCase()));
  table($('t8T'),colsOf(T.T8),rows);
  const a=RC.sciq_siqa.at400;$('t8N').innerHTML=fix?'Highlighted cells are swapped back. At 400M: SciQ decoder '+a.dec_SciQ+' against encoder '+a.enc_SciQ+'; Social IQA decoder '+a.dec_SIQA+' against encoder '+a.enc_SIQA+'; ARC (unaffected) encoder '+a.enc_ARC+' against decoder '+a.dec_ARC+'.':'As printed: the decoder rows would score 71 to 93 on Social IQA, a three-way task (chance 33%), while every encoder row scores 34 to 46.'}
function t9(){const t=T.T9;table($('t9T'),colsOf(t),rowsOf(t))}
function t5(){table($('t5T'),colsOf(T.T5),rowsOf(T.T5))}
function t67(){const k=$('t67S').value,t=T[k];table($('t67T'),colsOf(t),rowsOf(t));$('t67N').innerHTML=k==='T7'?'Avg is the mean of the eight tasks (recomputed: within 0.08 of every printed value). DeBERTa-v2-XXL ran 300+ GPU hours before it was excluded for size (over 1.5B), so its row is incomplete.':'Mean (Task) averages tasks, Mean (Type) averages the seven task types. DeBERTa-v2-XXL needed a lower learning rate to converge.'}
function t10(){const t=T.T10;table($('t10T'),[{k:'name',label:'Model'}].concat(t.cols.map((c,i)=>({k:'c'+i,label:(i<4?'All: ':'Gotcha: ')+c,num:true}))),t.rows.map(r=>{const o={name:r.name,g:r.g};r.v.forEach((v,i)=>o['c'+i]=pm(v));return o}))}
function t2(){const t=T.T2;table($('t2T'),[{k:'cat',label:'Category'},{k:'name',label:'Dataset'}].concat(t.cols.map((c,i)=>({k:'c'+i,label:c,num:true}))),t.rows.map(r=>{const o={cat:r.cat,name:r.name};r.v.forEach((v,i)=>o['c'+i]=v);return o}).concat([{cat:'',name:'Total',c0:t.total[0],c1:t.total[1],c2:t.total[2],c3:t.total[3],c4:t.total[4],c5:t.total[5]}]))}
function t11(){const t=T.T11,rc={};RC.params.forEach(p=>rc['Ettin-'+(p.size==='1b'?'1B':p.size)]=p);
  table($('t11T'),[{k:'name',label:'Model'},{k:'c0',label:'Total (printed)',num:true},{k:'c1',label:'Embedding',num:true},{k:'c2',label:'Non-embedding',num:true},{k:'r',label:'Recounted total / non-embedding',num:true}],
    rowsOf(t,(o,r)=>{const p=rc[r.name];if(p)o.r=p.total_M.toFixed(1)+'M / '+p.nonembed_M.toFixed(1)+'M'}))}
function t12(){const el=$('t12T');el.innerHTML='<table><tbody>'+T.T12.rows.map(r=>'<tr><td>'+esc(r[0])+'</td><td>'+esc(r[1])+'</td></tr>').join('')+'</tbody></table>'}
let done=false;onTab('t-tables',()=>{if(done)return;done=true;t3();t4();t8();t9();t5();t67();t10();t2();t11();t12()});
$('t3D').addEventListener('change',t3);$('t4D').addEventListener('change',t4);$('t8R').addEventListener('change',t8);$('t8S').addEventListener('change',t8);$('t67S').addEventListener('change',()=>{$('t67T').__st=null;t67()});
})();
