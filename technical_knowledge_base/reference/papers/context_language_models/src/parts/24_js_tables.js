// ---- Tables tab: transcribed tables, decoded figures and every recomputation check ----
(function(){
if(!window.PAPER||!$('t-tables'))return;
const TB=PAPER.tables,RC=PAPER.rc;
const th=(c,i)=>'<th'+(i?' class="num"':'')+'>'+c+'</th>',td=(c,i,cls)=>'<td'+(i?' class="num'+(cls?' '+cls:'')+'"':'')+'>'+c+'</td>';
function simple(id,T,hl){const el=$(id);if(!el)return;el.innerHTML='<thead><tr>'+T.cols.map(th).join('')+'</tr></thead><tbody>'+T.rows.map((r,ri)=>'<tr>'+r.map((c,i)=>td(hl?hl(ri,i,c):c,i)).join('')+'</tr>').join('')+'</tbody>';
  const n=$(id+'n');if(n)n.innerHTML=T.note+' '+PAPER_AX(T.at)}
const PAPER_AX=at=>'<a href="'+PAPER.meta.ax+'#'+at+'" target="_blank" rel="noopener noreferrer">In the paper</a>.';
const ok=RC.checks.filter(c=>c.ok).length;
$('tbRepro').innerHTML=ok+' of '+RC.checks.length+' checks against printed numbers reproduce (all listed at the bottom of this tab): Appendix C\'s constants and Figure 16\'s three turns from Eq. 7 to 9, independently; every percentage of the abstract from the figures\' decoded points and printed labels; Figure 19\'s bottom row against Figure 5, circle for circle. The Summary, MEM1 and CLM circles of Figure 5 land on the numbers the text prints, which also confirms the label assignment there.';
const rp=RC.replay.res;$('tbRp').textContent=(100*(1-rp.clm.pflops_std/rp.summary.pflops_std)).toFixed(1)+'% fewer FLOPs than Summary at its defaults';
// Figures 5 and 19
const M7=['CLM','Summary','MEM1','Self-Compact','ACM','RLM','Base'],BN={bcp:'BrowseComp-Plus',tb21:'TerminalBench 2.1',tblite:'TBLite'};
let f5m='abs';
function f5(){const rows=[];
  [['27b','Qwen3.6-27B',TB.f5],['9b','Qwen3.5-9B',TB.f19]].forEach(([k,lab,T])=>{rows.push('<tr><th colspan="4" style="text-align:left">'+lab+(k==='27b'?' (Figure 5)':' (Figure 19, top row)')+'</th></tr>');
    M7.forEach(m=>{const cells=Object.keys(BN).map(b=>{const v=T.data[b][m],c=T.data[b].CLM;if(!v)return '<span class="mute">not run</span>';
      if(f5m==='abs')return v[0].toFixed(1)+'% <span class="mute">('+(v[1]===null?'past 3':v[1].toFixed(2))+')</span>'+(T.amb[b].indexOf(m)>=0?' <span class="mute" title="label could be swapped with its neighbour">*</span>':'');
      if(m==='CLM')return '<span class="mute">reference</span>';const d=v[0]-c[0],dp=(v[1]===null||c[1]===null)?null:v[1]-c[1];
      return '<span class="'+(d>0?'no':'')+'">'+(d>=0?'+':'')+d.toFixed(1)+' pt</span> <span class="mute">('+(dp===null?'n/a':(dp>=0?'+':'')+dp.toFixed(2)+' PF')+')</span>'});
      rows.push('<tr>'+td(m,0)+cells.map((c,i)=>td(c,1)).join('')+'</tr>')})});
  $('tbF5').innerHTML='<thead><tr>'+th('Method',0)+Object.values(BN).map((b,i)=>th(b,1)).join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody>';
  $('tbF5n').innerHTML=TB.f5.note+' '+TB.f19.note+' * marks a label that could be swapped with its neighbour. In "difference from CLM", a positive gap (in orange) means the baseline beats CLM.'}
segBind('tbFM',m=>{f5m=m;f5()});f5();
simple('tbT1',TB.t1,(ri,i,c)=>{if(!i)return c;const col=TB.t1.rows.map(r=>+r[i]),b=TB.t1.better[i]>0?Math.max(...col):Math.min(...col);return +c===b?'<b>'+c+'</b>':c});
simple('tbT2',TB.t2);simple('tbF8',TB.f8);simple('tbF28',TB.f28);simple('tbF9',TB.f9);
(function(){const T=TB.scr;simple('tbSCR',T);$('tbSCRn').innerHTML+=' Figure 11: accuracy '+T.extra[0][1]+'% (standard) and '+T.extra[0][2]+'% (SCR); empirical PFLOPs per question '+T.extra[1][1]+' and '+T.extra[1][2]+'.'})();
// Figure 2 heatmap
let f2t='needle';
function f2(){const D=TB.f2.data[f2t],ms=['CLM','RLM','Self-Compact','ACM','Summary','Context Folding','Base'].filter(m=>D[m]);
  const lv=D[ms[0]].map(p=>p[0]);
  const col=v=>'color-mix(in srgb, var(--c1) '+Math.round(v*80)+'%, var(--bg))';
  $('tbF2').innerHTML='<thead><tr><th>Method</th>'+lv.map((p,i)=>{const exact=[0.25,0.5,1,2,4,8,16,24].indexOf(p)>=0;return '<th class="num">'+(exact?'':'~')+p+'×</th>'}).join('')+'</tr></thead><tbody>'+
    ms.map(m=>'<tr><th class="mh">'+m+'</th>'+D[m].map(p=>'<td class="v" style="background:'+col(p[1])+(p[1]>0.6?';color:#fff':'')+'">'+p[1].toFixed(2)+'</td>').join('')+'</tr>').join('')+'</tbody>';
  $('tbF2n').innerHTML='Accuracy (0 to 1) by context pressure. '+TB.f2.note+' '+PAPER_AX(TB.f2.at)}
segBind('tbF2M',m=>{f2t=m;f2()});f2();
// all checks
$('tbChk').innerHTML='<thead><tr><th>Check</th><th class="num">Computed</th><th class="num">Printed</th><th>Where</th><th>Verdict</th></tr></thead><tbody>'+
  RC.checks.map(c=>'<tr><td>'+c.name+'</td><td class="num">'+(Array.isArray(c.got)?c.got.join(' to '):typeof c.got==='boolean'?(c.got?'same':'differs'):c.got)+'</td><td class="num">'+(typeof c.printed==='boolean'?'same':c.printed)+'</td><td>'+c.where+'</td><td>'+(c.ok?'<span class="ok">reproduces</span>':'<span class="no">does not reproduce</span>')+'</td></tr>').join('')+'</tbody>';
})();
