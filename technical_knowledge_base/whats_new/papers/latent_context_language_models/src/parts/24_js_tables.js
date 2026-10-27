// ---- The tables tab: Pareto panels rebuilt, Table 6, Figure 4 decoded, ablations, the agent, the data budget ----
(function(){
const PP=window.PAPER,RC=PP.rc,TB=PP.tables,MC=window.LC_MC,MN=window.LC_MN;
const f=v=>parseFloat(String(v).replace('+',''));
const set=(id,h)=>{const e=$(id);if(e)e.innerHTML=h};
set('tbChk',RC.checks_n);set('tbSp',RC.speedups.map(s=>s.computed.toFixed(2)+'x').join(', '));
set('dnr16',RC.fig_vs_table_lclm16.map(x=>({fig1_ruler4k:'RULER 4K',fig5_ruler8k:'RULER 8K',fig5_ruler16k:'RULER 16K',fig1_longbench64k:'LongBench',fig5_longhealth64k:'LongHealth'})[x.panel]+' '+x.fig.toFixed(2)+' against '+x.table.toFixed(2)).join('; '));
const am=RC.fig_vs_table.find(x=>x.panel==='fig5_ruler8k'&&x.method==='AM-Fast'&&x.ratio==='16x');set('dnrAM',am.fig.toFixed(2));
set('dnr33',RC.agent.t7_lclm16_niah_avg.toFixed(2));
const PANEL={fig1_ruler4k:{c:0,ctx:'4k',y:[10,100]},fig5_ruler8k:{c:1,ctx:'8k',y:[10,100]},fig5_ruler16k:{c:2,ctx:'16k',y:[10,100]},fig1_longbench64k:{c:3,ctx:'64k',y:[20,50]},fig5_longhealth64k:{c:5,ctx:'64k',y:[0,90]}};
let PA='fig1_ruler4k';
const SH={'4x':'c','8x':'s','16x':'t'};
const mark=(x,y,sh,c,r)=>{r=r||5;if(sh==='c')return '<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+r+'" fill="'+c+'" stroke="var(--ink)" stroke-width=".7"/>';
  if(sh==='s')return rc(x-r+.5,y-r+.5,2*r-1,2*r-1,c,{r:1,s:'var(--ink)',sw:.7});return '<path d="M'+x.toFixed(1)+','+(y-r-1).toFixed(1)+'L'+(x+r).toFixed(1)+','+(y+r-1).toFixed(1)+'L'+(x-r).toFixed(1)+','+(y+r-1).toFixed(1)+'z" fill="'+c+'" stroke="var(--ink)" stroke-width=".7"/>'};
function pareto(w){const host=$('paSvg');w=w||host.clientWidth;if(!w)return;const P=PANEL[PA],pts=RC.fig4&&PP.rc;
  const D=RC.figs[PA]||[];const H=Math.round(Math.min(360,Math.max(260,w*.6))),pl=40,pr=12,pt=10,pb=34;
  const nc=$('paNC').checked,t6=$('paT6').checked;
  const allx=D.map(d=>d.ttft);const ncT=RC.fig4.ttft.NoCompression[P.ctx];if(nc)allx.push(ncT);
  const x0=Math.min(...allx)/1.5,x1=Math.max(...allx)*1.5,lg=Math.log10;
  const lx=v=>pl+(w-pl-pr)*(lg(v)-lg(x0))/(lg(x1)-lg(x0)),ly=v=>pt+(H-pt-pb)*(1-(v-P.y[0])/(P.y[1]-P.y[0]));
  let s='';for(let v=Math.ceil(P.y[0]/10)*10;v<=P.y[1];v+=10){s+=ln2(pl,ly(v),w-pr,ly(v),'var(--line)')+tx(pl-5,ly(v)+4,v,{fs:11,a:'end',c:'var(--mute)'})}
  [0.01,0.1,1,10,100].forEach(v=>{if(v>=x0&&v<=x1)s+=ln2(lx(v),pt,lx(v),H-pb,'var(--line)')+tx(lx(v),H-pb+15,v+' s',{fs:11,a:'middle',c:'var(--mute)'})});
  s+=tx((pl+w-pr)/2,H-4,'time to first token (log scale)',{fs:11,a:'middle',c:'var(--mute)'});
  const full=f(TB['A7.T6'].rows[0].v[P.c]);s+=ln2(pl,ly(full),w-pr,ly(full),'var(--acc)',{da:'5 3'})+tx(w-pr-4,ly(full)-4,'no compression '+full.toFixed(2),{fs:11,a:'end',c:'var(--acc)'});
  // vertical lines per KV method, LCLM curve
  const by={};D.forEach(d=>{(by[d.method]=by[d.method]||[]).push(d)});
  Object.keys(by).forEach(m=>{const a=by[m];if(m==='LCLM'){const o=['16x','8x','4x'].map(r=>a.find(d=>d.ratio===r)).filter(Boolean);
      s+='<polyline points="'+o.map(d=>lx(d.ttft).toFixed(1)+','+ly(d.ratio==='16x'&&t6?f(TB['A7.T6'].rows.find(r=>r.group==='16x compression'&&r.label.includes('Mean')).v[P.c]):d.acc).toFixed(1)).join(' ')+'" fill="none" stroke="'+MC.LCLM+'" stroke-width="2.4"/>'}
    else{const ys=a.map(d=>ly(d.acc));s+=ln2(lx(a[0].ttft),Math.min(...ys),lx(a[0].ttft),Math.max(...ys),MC[m],{sw:3,op:.45})}});
  D.forEach(d=>{let acc=d.acc;if(d.method==='LCLM'&&d.ratio==='16x'&&t6)acc=f(TB['A7.T6'].rows.find(r=>r.group==='16x compression'&&r.label.includes('Mean')).v[P.c]);
    s+='<g><title>'+MN[d.method]+' '+d.ratio+': '+acc.toFixed(2)+' at '+d.ttft.toFixed(3)+' s</title>'+mark(lx(d.ttft),ly(acc),SH[d.ratio],MC[d.method],d.method==='LCLM'?6:5)+'</g>'});
  if(nc){s+='<g><title>No compression: '+full.toFixed(2)+' at '+ncT.toFixed(3)+' s (Figure 4)</title><circle cx="'+lx(ncT).toFixed(1)+'" cy="'+ly(full).toFixed(1)+'" r="7" fill="none" stroke="var(--acc)" stroke-width="2.4"/></g>'+tx(lx(ncT)+9,ly(full)+15,'uncompressed, '+ncT.toFixed(2)+' s',{fs:11,c:'var(--acc)'})}
  host.innerHTML=svgW(w,H,s,'Accuracy against time to first token');
  const ms=[...new Set(D.map(d=>d.method))];
  $('paLeg').innerHTML=ms.map(m=>'<span><i style="background:'+MC[m]+';height:8px;width:8px;border-radius:50%"></i>'+MN[m]+'</span>').join('')+'<span>circle 4x · square 8x · triangle 16x</span>';
  const sp=RC.speedups.find(x=>x.panel===PA);
  $('paNote').innerHTML='Printed speed-up '+sp.printed+'x is FastKVzip 4x ('+sp.fast_acc.toFixed(2)+') against LCLM 4x ('+sp.lclm_acc.toFixed(2)+'): '+sp.computed.toFixed(2)+'x recomputed. Against the uncompressed decoder at the same length, LCLM 4x is '+sp.lclm_vs_nocomp.toFixed(2)+'x and LCLM 16x '+sp.lclm16_vs_nocomp.toFixed(2)+'x faster; FastKVzip is '+sp.fast_vs_nocomp.toFixed(2)+'x slower than not compressing.'}
segBind('paP',m=>{PA=m;pareto()});['paNC','paT6'].forEach(id=>$(id).addEventListener('change',()=>pareto()));

// ---- Table 6 ----
let T6R='16x compression',T6D='abs',T6S=-1;
function t6(){const T=TB['A7.T6'],full=T.rows[0].v,rows=T.rows.filter(r=>r.group===T6R);
  const best=T.cols.map((c,i)=>Math.max(...rows.map(r=>f(r.v[i]))));
  const R=rows.slice();if(T6S>=0)R.sort((a,b)=>f(b.v[T6S])-f(a.v[T6S]));
  let h='<table><thead><tr><th>Method</th>'+T.cols.map((c,i)=>'<th class="num" data-c="'+i+'" style="cursor:pointer">'+c+(T6S===i?' ▼':'')+'</th>').join('')+'</tr></thead><tbody>';
  h+='<tr class="basec"><td>'+T.rows[0].label+'</td>'+full.map(v=>'<td class="num">'+v+'</td>').join('')+'</tr>';
  R.forEach(r=>{h+='<tr><td>'+r.label+'</td>'+r.v.map((v,i)=>{const d=f(v)-f(full[i]);const b=f(v)===best[i];return '<td class="num"'+(b?' style="font-weight:700"':'')+'>'+(T6D==='abs'?v:'<span class="'+(d>=0?'ok':'no')+'" style="font-weight:'+(b?700:400)+'">'+(d>=0?'+':'')+d.toFixed(2)+'</span>')+'</td>'}).join('')+'</tr>'});
  $('t6Tab').innerHTML=h+'</tbody></table>';
  $('t6Tab').querySelectorAll('th[data-c]').forEach(th=>th.addEventListener('click',()=>{T6S=+th.dataset.c;t6()}))}
segBind('t6R',m=>{T6R=m;t6()});segBind('t6D',m=>{T6D=m;t6()});

// ---- Figure 4 table ----
let F4T='ttft';
function f4t(){const D=F4T==='ttft'?RC.fig4.ttft:RC.fig4.mem,C=['4k','8k','16k','32k','64k','128k','256k','512k','1M'];
  let h='<table><thead><tr><th>Method</th>'+C.map(c=>'<th class="num">'+c.toUpperCase()+'</th>').join('')+'</tr></thead><tbody>';
  const ORD=['NoCompression','LCLM 4x','LCLM 8x','LCLM 16x','SnapKV','SnapKV-SelfStudy','ExpAttn','KVzip','KVzipFast','AM-Fast','AM-Slow'];
  Object.keys(D).sort((a,b)=>ORD.indexOf(a)-ORD.indexOf(b)).forEach(k=>{const base=k.split(' ')[0];h+='<tr><td>'+(MN[base]||k)+(k.includes(' ')?' '+k.split(' ')[1]:'')+'</td>'+C.map(c=>{const v=D[k][c];return '<td class="num">'+(v==null?'':F4T==='ttft'?(v<1?v.toFixed(3):v<10?v.toFixed(2):v.toFixed(1)):v.toFixed(1))+'</td>'}).join('')+'</tr>'});
  $('f4Tab').innerHTML=h+'</tbody></table>'}
segBind('f4tM',m=>{F4T=m;f4t()});

// ---- ablation tables ----
const CAP={'A7.T30':'Mask: 16x, mean pooling, W = 1,024, pre-training LR 1e-5.','A7.T31':'Window: 16x, mean pooling, pre-training LR 1e-6. W16 and W256 are causal, W1024 is bidirectional (the paper\'s own caveat).','A7.T20':'Pooling: W = 1,024, causal, pre-training LR 1e-5, at every ratio.','A7.T26':'Adapter and overlap: 16x, mean, W = 1,024. The only attention-adapter row has overlap 256 and a bidirectional mask; compare it with Bidirectional-MLP-O256.','A7.T32':'Encoder initialisation: 16x, EOS pooling, causal, LR 1e-6.','A5.T4':'Model size at 16x. LongBench here is the en16 and cn5 average weighted by subtask count (recomputed: 37.33); rows other than 0.6B / 4B are printed at one decimal.','A7.T12':'Continual pre-training LR sweep: 16x, bidirectional, MLP, no overlap.','A7.T16':'SFT LR sweep: 16x, causal, MLP, pre-training LR 1e-5. The 3e-5 row is the released configuration\'s row in Table 6.'};
function abl(id){const T=TB[id];$('abCap').innerHTML=CAP[id]+' <a href="'+T.url+'" target="_blank" rel="noopener noreferrer">Source</a>.';
  const best=T.cols.map((c,i)=>Math.max(...T.rows.map(r=>f(r.v[i]))));
  let h='<table><thead><tr><th>Row</th>'+T.cols.map(c=>'<th class="num">'+c+'</th>').join('')+'</tr></thead><tbody>';
  T.rows.forEach(r=>{h+='<tr><td>'+(r.group?r.group.replace(' compression','')+' · ':'')+r.label+'</td>'+r.v.map((v,i)=>'<td class="num"'+(T.rows.length>1&&f(v)===best[i]?' style="font-weight:700"':'')+'>'+v+'</td>').join('')+'</tr>'});
  $('abTab').innerHTML=h+'</tbody></table>'}
segBind('abT',abl);
function lossT(){const L=RC.loss;let h='<table><thead><tr><th>Figure</th><th>Run</th><th class="num">Loss</th></tr></thead><tbody>';
  Object.keys(L).forEach(k=>{L[k].v.forEach(([n,v],i)=>{h+='<tr><td>'+(i===0?L[k].note:'')+'</td><td>'+n+'</td><td class="num">'+v.toFixed(v<1?4:(String(v).length>5?4:3))+'</td></tr>'})});
  $('lossTab').innerHTML=h+'</tbody></table>'}

// ---- Table 33 ----
function t33(){const T=TB['A7.T33'],full=TB['A7.T7'].rows[0].v.slice(0,8);
  let h='<table><thead><tr><th>Row</th>'+T.cols.map(c=>'<th class="num">'+c+'</th>').join('')+'</tr></thead><tbody>';
  T.rows.forEach((r,i)=>{h+='<tr'+(r.label.startsWith('Delta')?' style="color:var(--good)"':'')+'><td>'+(i%3===0?'<b>'+r.group+'</b> · ':'')+r.label.replace('Delta','gain,')+'</td>'+r.v.map(v=>'<td class="num">'+v+'</td>').join('')+'</tr>';
    if(i===2)h+='<tr class="basec"><td>4K · uncompressed (Table 7)</td>'+full.map(v=>'<td class="num">'+v+'</td>').join('')+'<td class="num">'+RC.agent.full_4k_niah_avg.toFixed(2)+'</td></tr>'});
  $('t33Tab').innerHTML=h+'</tbody></table>'}

// ---- Tables 1 to 3 ----
function t1(){const t=TB['S4.T1'];let h='<table><thead><tr><th></th>'+t.stages.map(s=>'<th class="num">'+s+'</th>').join('')+'</tr></thead><tbody>';
  [['Adapter peak LR','adapter_lr'],['Encoder peak LR','encoder_lr'],['Decoder peak LR','llm_lr'],['Encoder tokens (B)','enc_tokens_B'],['Decoder tokens, 16x (B)','llm_tokens_B'],['Total, 16x (B)','total_tokens_B']].forEach(([n,k])=>{h+='<tr><td>'+n+'</td>'+t[k].map(v=>'<td class="num">'+v+'</td>').join('')+'</tr>'});
  h+='<tr class="basec"><td>Sum over stages</td><td class="num" colspan="4">encoder '+RC.tokens.encoder_B.toFixed(2)+'B + decoder '+RC.tokens.decoder_B.toFixed(2)+'B = '+RC.tokens.total_B.toFixed(2)+'B ("over 350B")</td></tr>';
  $('t1Tab').innerHTML=h+'</tbody></table><p class="small mute">All stages: AdamW (0.9, 0.95), 5% warm-up, cosine to 1e-6, 4M-token batches, sequence length 16,384. <a href="'+t.url+'" target="_blank" rel="noopener noreferrer">Table 1</a>.</p>'}
function mix(id){const T=TB[id];let h='<table><thead><tr><th>Data</th><th>Licence</th><th>Description</th>'+T.cols.map(c=>'<th class="num">'+c+'</th>').join('')+'</tr></thead><tbody>';
  T.rows.forEach(r=>{h+='<tr'+(r.group?' class="basec"':'')+'><td>'+r.name+'</td><td>'+(r.lic||'')+'</td><td>'+(r.desc||'')+'</td>'+r.v.map(v=>'<td class="num">'+v+'</td>').join('')+'</tr>'});
  $('mixTab').innerHTML=h+'</tbody></table>'}
segBind('mixT',mix);set('mixSum',RC.mix.pre_B.toFixed(2)+'B');

onTab('t-tables',()=>{fit($('paSvg'),pareto);t6();f4t();abl('A7.T30');lossT();t33();t1();mix('A3.T2')});
})();
