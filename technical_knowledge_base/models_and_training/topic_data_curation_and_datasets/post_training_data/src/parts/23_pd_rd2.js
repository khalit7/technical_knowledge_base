// ---- Reading tab, sections 5 to 8 (prefix pd) ----
(function(){
const P=window.PD,E=RD.esc,$=id=>document.getElementById(id),{f0,pc,bars}=window.PDU;

// 6. binarization: now the 3D stage Fig. in section 5 (28_js_sc_pref.js)

// 6. aspect correlations and length bias across sets
(function(){const r=P.pref.ub.rvl;bars($('pd-asp-bars'),Object.entries(r.aspects).map(([k,v])=>[k.replace('_',' '),v.mean,'var(--c4)',(v.mean>=0?'+':'')+v.mean.toFixed(2)]),{max:0.6});
  const S=P.pref.sets,L=P.pref.label;bars($('pd-len-bars'),P.pref.order.map(k=>[L[k],S[k].chosen_longer_share,S[k].chosen_longer_share>0.5?'var(--c2)':'var(--c1)',pc(S[k].chosen_longer_share,1,0)]),{max:1})})();

// 7. one answer through six extractors
(function(){const C=P.check;const NM={last_number:'Last number (Tulu 3 GSM8K)',tulu_math:'Tulu 3 MATH verifier',minerva:'Minerva sentence (strict)',boxed_exact:'Exact \\boxed{} string',answer_is:'"The answer is"',math_verify:'Math-Verify 0.8.0'};
  const cats=['mv_only','versions','thinking_vs_answer','tulu_only','mcq'];const X=cats.map(c=>C.examples.find(e=>e.cat===c&&/boxed/.test(e.tail))||C.examples.find(e=>e.cat===c)).filter(Boolean);
  let view='answer';
  function hl(text,s){if(!s||s[0]==='[')return E(text);const i=text.lastIndexOf(s.slice(0,Math.min(25,s.length)));if(i<0)return E(text);return E(text.slice(0,i))+'<span class="k">'+E(text.slice(i,i+s.length))+'</span>'+E(text.slice(i+s.length))}
  // one step per answer (the long-replay rule): a forward step reveals the six verdicts one after another
  function draw(k){const e=X[k],V=view==='answer'?e.v:e.vf,fwd=$('pd-ex-card').classList.contains('rd-fwd')&&!RD.RM;
    const txt=(view==='full'&&e.think_tail?'[... thinking ...] '+e.think_tail+'\n</think>\n\n':'')+e.tail;
    $('pd-ex-prob').innerHTML='<b>Answer '+(k+1)+' of '+X.length+'. Label: '+E(e.gold)+'.</b> '+E(e.problem.length>240?e.problem.slice(0,240)+' ...':e.problem)+' <span class="mute">OpenR1\'s recorded Math-Verify verdict: '+(e.rec_mv?'accepted':'rejected')+(e.llama==null?'':'; Llama judge: '+(e.llama?'accepted':'rejected'))+'.</span>';
    $('pd-ex-doc').innerHTML=hl(txt,V.math_verify[0]);
    $('pd-ex-checks').innerHTML=C.ex.map((x,i)=>'<div'+(fwd?' class="rd-new" style="animation-delay:'+(300+i*450)+'ms"':'')+'>'+E(NM[x])+': <code>'+E(V[x][0])+'</code> '+(V[x][1]?'<span class="ok">accept</span>':'<span class="no">reject</span>')+'</div>').join('')}
  const n=X.length;
  const an=RD.anim({card:'pd-ex-card',ctl:'pd-ex-ctl',n,draw,ms:6000,label:'Answer',list:'sx-ex'});
  RD.seg($('pd-ex-view'),m=>{view=m;an.redraw()});
  const a=C.answer.ok;bars($('pd-ck-bars'),C.ex.map(x=>[NM[x],a[x],x==='math_verify'||x==='tulu_math'?'var(--good)':'var(--acc)',pc(a[x],C.n,0)]).concat([['Recorded Math-Verify (Feb 2025)',a.rec_mv,'var(--c4)',pc(a.rec_mv,C.n,0)]]),{max:C.n})})();

// 7. pass-rate distribution (OLMo 3 RL, every row) and code mutation
(function(){const h=P.rl_hist;if(h){const lab=['under 1','1 to under 2','2 to under 3','3 to under 4','4 to 5'];const hist=h.hist;
  // HF histogram bins of total_correct_rollouts are 0.5 wide: [0,0.5) [0.5,1) ... merge pairs into k of 8
  const k=[];for(let i=0;i<hist.length;i+=2)k.push(hist[i]+(hist[i+1]||0));
  bars($('pd-pr-bars'),k.map((v,i)=>[lab[i]+' of 8 correct',v,i===0?'var(--bad)':'var(--acc)',f0(v)]))}
  const c=P.code;if(!c){$('pd-mut-stats').innerHTML='<div class="pend"><b>Run not recorded yet.</b> <code>python -I -B src/scripts/pd_code.py 300 50</code></div>';return}
  $('pd-mut-stats').innerHTML=RD.stat('Problems sampled',f0(c.n),'gold passes its tests in '+f0(c.gold_pass))+RD.stat('Mutants run',f0(c.mutants))+RD.stat('Survived every test',f0(c.survived),pc(c.survived,c.mutants,0)+' of mutants')+RD.stat('Problems with a survivor',f0(c.problems_with_survivor),pc(c.problems_with_survivor,c.gold_pass,0)+' of problems')+RD.stat('Problems with one test only',f0(c.one_test),'of '+f0(c.file_rows)+' in the file');
  const K={cmp:'flip a comparison',const:'constant + 1',arith:'swap + and -',minmax:'swap min and max'};
  bars($('pd-mut-bars'),Object.entries(c.by_kind).map(([k,v])=>[K[k]||k,v[1]/v[0],'var(--c2)',v[1]+' of '+v[0]]),{max:1});
  const bt=c.by_ntests;$('pd-mut-note').innerHTML='Problems with at least one surviving mutant, by number of tests in the dataset: '+['1','2-5','6-20','21+'].filter(k=>bt[k]).map(k=>k+' tests: '+bt[k][1]+' of '+bt[k][0]).join('; ')+'. A survivor is either a weak test suite or an equivalent mutant (a change that does not alter behaviour); src/notes/code_survivors.md reads them.'})();

// 8. environments
(function(){const e=P.env;$('pd-env-stats').innerHTML=RD.stat('Repositories',f0(e.gym.repos)+' / '+f0(e.reb.repos),'SWE-Gym / SWE-rebench')+RD.stat('Files changed by the fix',f0(e.gym.files['0.5'])+' / '+f0(e.reb.files['0.5']),'median')+
  RD.stat('FAIL_TO_PASS tests',f0(e.gym.f2p['0.5'])+' / '+f0(e.reb.f2p['0.5']),'median; p90 '+f0(e.gym.f2p['0.9'])+' / '+f0(e.reb.f2p['0.9']))+RD.stat('PASS_TO_PASS tests',f0(e.gym.p2p['0.5'])+' / '+f0(e.reb.p2p['0.5']),'median')+
  RD.stat('Issue length',f0(e.gym.problem_tok['0.5'])+' / '+f0(e.reb.problem_tok['0.5']),'median Qwen3 tokens')+RD.stat('Newest task',e.gym.years[e.gym.years.length-1][0]+' / '+e.reb.years[e.reb.years.length-1][0],'creation year')})();
(function(){const T=P.env.traj;if(!T)return;const S=T.steps;
  // 13 turns in five explained stretches (the long-replay rule): system prompt, task, turns 3 to 6, 7 to 10, 11 to 13
  const G=[[0,1],[1,2],[2,6],[6,10],[10,13]];
  function draw(k){const [a,b]=G[k],fwd=$('pd-traj-card').classList.contains('rd-fwd')&&!RD.RM;let tr=0,ms=0;S.slice(0,b).forEach(x=>{if(x.trained)tr+=x.chars;else ms+=x.chars});
    $('pd-traj-cnt').innerHTML=RD.stat('Characters trained',f0(tr))+RD.stat('Characters masked',f0(ms))+RD.stat('Share trained',pc(tr,tr+ms||1,0));
    $('pd-traj-doc').innerHTML=S.slice(a,b).map((s,j)=>'<div'+(fwd?' class="rd-new" style="animation-delay:'+(j*700)+'ms"':'')+'><span class="'+(s.trained?'p':'tag')+'">[turn '+(a+j+1)+', '+E(s.role)+(s.trained?', trained':', masked')+', '+f0(s.chars)+' characters]</span>\n'+E(s.text)+'</div>').join('\n')}
  RD.anim({card:'pd-traj-card',ctl:'pd-traj-ctl',n:G.length,draw,ms:6000,label:'Stretch',list:'sx-traj'})})();

// 9. overlap and contamination
(function(){const q=P.quality;if(!q)return;const ks=Object.keys(q.sets);const N={alpaca:'Alpaca',dolly:'Dolly',tulu3_sft:'Tulu 3 SFT',dolci_sft:'Dolci SFT',ufb_h4:'UF (H4)',ufb_argilla:'UF (Argilla)',tulu3_pref:'Tulu 3 pref',olmo2_pref:'OLMo 2 pref',dolci_dpo:'Dolci DPO',rlvr:'Tulu 3 RLVR',openr1:'OpenR1'};
  $('pd-ov').innerHTML='<table class="hm" style="min-width:760px"><thead><tr><th class="mh">Set (rows)</th>'+ks.map(k=>'<th>'+E(N[k]||k)+'</th>').join('')+'</tr></thead><tbody>'+
    ks.map(a=>'<tr><th class="mh">'+E(N[a]||a)+' <small>'+f0(q.sets[a].rows)+'</small></th>'+ks.map(b=>{if(a===b)return '<td class="na">&middot;</td>';const v=q.overlap[a][b];return '<td'+(v?' style="background:color-mix(in srgb,var(--acc) '+Math.min(60,8+Math.log10(v+1)*15)+'%,transparent)"':'')+'>'+(v?f0(v):'')+'</td>'}).join('')+'</tr>').join('')+'</tbody></table>';
  const c=q.contam||{};const names=Object.keys(c);
  if(!names.length){$('pd-contam').innerHTML='<div class="pend"><b>Scan not recorded yet.</b> <code>python -I -B src/scripts/pd_contam.py</code></div>';return}
  const LB=P.contam_lab||{};const NMc={pd_openr1:'OpenR1-Math, 6k',pd_code:'Code problems (tested), 5k',pd_if_multi:'IF_multi_constraints_upto5, all',pd_dolci_rl:'Dolci-Think-RL-7B, 4k',pd_dolci_sft:'Dolci-Instruct-SFT, 4k',pd_dolci_think:'Dolci-Think-SFT-7B, 3k',pd_tulu3_pref:'Tulu 3 8B preferences, 5k',pd_alpaca:'Alpaca, all'};
  $('pd-contam').innerHTML='<table><thead><tr><th>Set (rows scanned)</th><th class="num">Rows sharing a 13-gram</th><th class="num">Pairs over the 50% rule</th><th class="num">Read: copies (rows)</th><th class="num">Variants</th><th class="num">False alarms</th></tr></thead><tbody>'+
    names.map(k=>{const v=c[k],l=LB[k]||{};return '<tr><td>'+E(NMc[k]||k)+' ('+f0(v.docs)+')</td><td class="num">'+f0(v.any13)+'</td><td class="num">'+f0(v.flag_cov8)+'</td><td class="num">'+f0(l.copy||0)+' ('+f0(l.rows_copy||0)+')</td><td class="num">'+f0((l.variant||0)+(l['same question (common trivia)']||0))+'</td><td class="num">'+f0(l['false alarm']||0)+'</td></tr>'}).join('')+'</tbody></table>';
  $('pd-contam-ex').innerHTML=(P.contam_ex||[]).map(e=>'<div class="rd-card"><div class="small"><b>'+E(e.label)+'</b>: '+E(e.bench)+' item '+e.idx+' in '+E(NMc[e.corpus]||e.corpus)+' (coverage '+pc(e.cov8,1,0)+')</div><div class="pd-ex"><div><div class="pd-lab">benchmark item</div><div class="rd-doc">'+E(e.item)+'</div></div><div><div class="pd-lab">training row, matched region</div><div class="rd-doc">'+E(e.excerpt)+'</div></div></div></div>').join('')})();
})();
