// ---- Reading tab, sections 6 to 9 (prefix pd) ----
(function(){
const P=window.PD,E=RD.esc,$=id=>document.getElementById(id),{f0,pc,bars}=window.PDU;

// 6. binarization animation on real UltraFeedback prompts
(function(){const X=P.pref.ub.examples;let rule='h4';const n=X.length*3;
  const mean=c=>{const v=c.asp.filter(x=>x!=null);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null};
  function pair(e){if(rule==='h4')return e.h4;if(rule==='argilla')return e.argilla;const m=e.comps.map(mean);const ci=m.indexOf(Math.max(...m));const ri=m.indexOf(Math.min(...m));return [ci,ri]}
  function draw(k){const e=X[Math.floor(k/3)],ph=k%3;const [ci,ri]=pair(e);
    $('pd-bin-prompt').innerHTML='<b>Prompt '+(Math.floor(k/3)+1)+' of '+X.length+'</b> (UltraFeedback evol_instruct): '+E(e.prompt);
    $('pd-bin-comp').innerHTML=e.comps.map((c,i)=>{const cls=ph>=1&&i===ci?'ch':ph>=2&&i===ri?'rj':ph>=2?'out':'';
      const m=mean(c);return '<div class="'+cls+'"><div class="h"><span>'+E(c.model||'')+'</span><span>'+f0(c.tok)+' tokens</span></div><div class="h"><span>overall_score '+(c.overall==null?'n/a':c.overall)+'</span><span>mean of aspects '+(m==null?'n/a':m.toFixed(2))+'</span></div>'+
        (cls==='ch'?'<span class="badge" style="color:var(--good)">chosen</span>':cls==='rj'?'<span class="badge" style="color:var(--bad)">rejected</span>':'')+'<div class="t">'+E(c.text)+'</div></div>'}).join('');
    const c=e.comps[ci],r=e.comps[ri];
    const cap=['<div class="t">Four answers from four models, each rated by GPT-4</div><p>overall_score comes from a critique pass; the four aspect ratings (instruction following, honesty, truthfulness, helpfulness) are separate. Lengths in Qwen3 tokens.</p>',
      '<div class="t">The rule picks the chosen answer</div><p>'+E(P.pref.rules[rule]||'')+'.</p>',
      '<div class="t">... and the rejected one: a pair of '+f0(c.tok)+' against '+f0(r.tok)+' tokens</div><p>'+(rule==='h4'&&e.h4[0]!==e.argilla[0]?'The two common rules disagree on this prompt: the mean-of-aspects rule chooses another answer. ':'')+(c.tok>r.tok?'The chosen answer is the longer one.':'The chosen answer is the shorter one.')+'</p>'][ph];
    $('pd-bin-cap').innerHTML=cap}
  const an=RD.anim({card:'pd-bin-card',ctl:'pd-bin-ctl',n,draw,ms:1700,label:'Step'});
  RD.seg($('pd-bin-rule'),m=>{rule=m;an.redraw()})})();

// 6. aspect correlations and length bias across sets
(function(){const r=P.pref.ub.rvl;bars($('pd-asp-bars'),Object.entries(r.aspects).map(([k,v])=>[k.replace('_',' '),v.mean,'var(--c4)',(v.mean>=0?'+':'')+v.mean.toFixed(2)]),{max:0.6});
  const S=P.pref.sets,L=P.pref.label;bars($('pd-len-bars'),P.pref.order.map(k=>[L[k],S[k].chosen_longer_share,S[k].chosen_longer_share>0.5?'var(--c2)':'var(--c1)',pc(S[k].chosen_longer_share,1,0)]),{max:1})})();

// 7. one answer through six extractors
(function(){const C=P.check;const NM={last_number:'Last number (Tulu 3 GSM8K)',tulu_math:'Tulu 3 MATH verifier',minerva:'Minerva sentence (strict)',boxed_exact:'Exact \\boxed{} string',answer_is:'"The answer is"',math_verify:'Math-Verify 0.8.0'};
  const cats=['mv_only','versions','thinking_vs_answer','tulu_only','mcq'];const X=cats.map(c=>C.examples.find(e=>e.cat===c&&/boxed/.test(e.tail))||C.examples.find(e=>e.cat===c)).filter(Boolean);
  let view='answer';const n=X.length*(C.ex.length+1);
  function hl(text,s){if(!s||s[0]==='[')return E(text);const i=text.lastIndexOf(s.slice(0,Math.min(25,s.length)));if(i<0)return E(text);return E(text.slice(0,i))+'<span class="k">'+E(text.slice(i,i+s.length))+'</span>'+E(text.slice(i+s.length))}
  function draw(k){const e=X[Math.floor(k/(C.ex.length+1))],st=k%(C.ex.length+1);const V=view==='answer'?e.v:e.vf;
    const txt=(view==='full'&&e.think_tail?'[... thinking ...] '+e.think_tail+'\n</think>\n\n':'')+e.tail;
    if(st===0){$('pd-ex-cap').innerHTML='<div class="t">Problem '+(Math.floor(k/(C.ex.length+1))+1)+' of '+X.length+'. Label: '+E(e.gold)+'</div><p>'+E(e.problem)+'</p>';$('pd-ex-doc').innerHTML=E(txt)}
    else{const x=C.ex[st-1],v=V[x];$('pd-ex-cap').innerHTML='<div class="t">'+E(NM[x])+': extracts "'+E(v[0])+'", '+(v[1]?'accepted':'rejected')+'</div><p>Label "'+E(e.gold)+'". OpenR1\'s recorded Math-Verify verdict: '+(e.rec_mv?'accepted':'rejected')+(e.llama==null?'':'; Llama judge: '+(e.llama?'accepted':'rejected'))+'.</p>';$('pd-ex-doc').innerHTML=hl(txt,v[0])}
    $('pd-ex-checks').innerHTML=C.ex.map((x,i)=>'<div>'+E(NM[x])+': '+(st>i?(V[x][1]?'<span class="ok">accept</span>':'<span class="no">reject</span>'):'<span class="mute">...</span>')+'</div>').join('')}
  const an=RD.anim({card:'pd-ex-card',ctl:'pd-ex-ctl',n,draw,ms:1500,label:'Step'});
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
  function draw(k){const s=S[k];let tr=0,ms=0;S.slice(0,k+1).forEach(x=>{if(x.trained)tr+=x.chars;else ms+=x.chars});
    $('pd-traj-cap').innerHTML='<div class="t">Turn '+(k+1)+' of '+S.length+': '+(s.role==='ai'?'the agent acts':s.role==='system'?'system prompt':'the environment answers')+(s.trained?' (trained)':' (masked)')+'</div><p>'+(s.role==='ai'?'Its reasoning and one command; these characters get loss.':s.role==='system'?'Tool documentation and rules, the same in every trajectory.':'Command output, file views, test results: the environment\'s text, masked from the loss.')+'</p>';
    $('pd-traj-cnt').innerHTML=RD.stat('Characters trained',f0(tr))+RD.stat('Characters masked',f0(ms))+RD.stat('Share trained',pc(tr,tr+ms||1,0));
    $('pd-traj-doc').innerHTML='<span class="'+(s.trained?'p':'tag')+'">['+E(s.role)+(s.trained?', trained':', masked')+']</span>\n'+E(s.text)}
  RD.anim({card:'pd-traj-card',ctl:'pd-traj-ctl',n:S.length,draw,ms:1800,label:'Turn'})})();

// 9. overlap and contamination
(function(){const q=P.quality;if(!q)return;const ks=Object.keys(q.sets);const N={alpaca:'Alpaca',dolly:'Dolly',tulu3_sft:'Tulu 3 SFT',dolci_sft:'Dolci SFT',ufb_h4:'UF (H4)',ufb_argilla:'UF (Argilla)',tulu3_pref:'Tulu 3 pref',olmo2_pref:'OLMo 2 pref',dolci_dpo:'Dolci DPO',rlvr:'Tulu 3 RLVR',openr1:'OpenR1'};
  $('pd-ov').innerHTML='<table class="hm" style="min-width:760px"><thead><tr><th class="mh">Set (rows)</th>'+ks.map(k=>'<th>'+E(N[k]||k)+'</th>').join('')+'</tr></thead><tbody>'+
    ks.map(a=>'<tr><th class="mh">'+E(N[a]||a)+' <small>'+f0(q.sets[a].rows)+'</small></th>'+ks.map(b=>{if(a===b)return '<td class="na">&middot;</td>';const v=q.overlap[a][b];return '<td'+(v?' style="background:color-mix(in srgb,var(--acc) '+Math.min(60,8+Math.log10(v+1)*15)+'%,transparent)"':'')+'>'+(v?f0(v):'')+'</td>'}).join('')+'</tr>').join('')+'</tbody></table>';
  const c=q.contam||{};const names=Object.keys(c);
  if(!names.length){$('pd-contam').innerHTML='<div class="pend"><b>Scan not recorded yet.</b> <code>python -I -B src/scripts/pd_contam.py</code></div>';return}
  const LB=P.contam_lab||{};const NMc={pd_openr1:'OpenR1-Math, 6k',pd_code:'Code problems (tested), 5k',pd_if_multi:'IF_multi_constraints_upto5, all',pd_dolci_rl:'Dolci-Think-RL-7B, 4k',pd_dolci_sft:'Dolci-Instruct-SFT, 4k',pd_dolci_think:'Dolci-Think-SFT-7B, 3k',pd_tulu3_pref:'Tulu 3 8B preferences, 5k',pd_alpaca:'Alpaca, all'};
  $('pd-contam').innerHTML='<table><thead><tr><th>Set (rows scanned)</th><th class="num">Rows sharing a 13-gram</th><th class="num">Pairs over the 50% rule</th><th class="num">Read: copies (rows)</th><th class="num">Variants</th><th class="num">False alarms</th></tr></thead><tbody>'+
    names.map(k=>{const v=c[k],l=LB[k]||{};return '<tr><td>'+E(NMc[k]||k)+' ('+f0(v.docs)+')</td><td class="num">'+f0(v.any13)+'</td><td class="num">'+f0(v.flag_cov8)+'</td><td class="num">'+f0(l.copy||0)+' ('+f0(l.rows_copy||0)+')</td><td class="num">'+f0((l.variant||0)+(l['same question (common trivia)']||0))+'</td><td class="num">'+f0(l['false alarm']||0)+'</td></tr>'}).join('')+'</tbody></table>'+
    (P.contam_ex||[]).map(e=>'<div class="rd-card"><div class="small"><b>'+E(e.label)+'</b>: '+E(e.bench)+' item '+e.idx+' in '+E(NMc[e.corpus]||e.corpus)+' (coverage '+pc(e.cov8,1,0)+')</div><div class="pd-ex"><div><div class="pd-lab">benchmark item</div><div class="rd-doc">'+E(e.item)+'</div></div><div><div class="pd-lab">training row, matched region</div><div class="rd-doc">'+E(e.excerpt)+'</div></div></div></div>').join('')})();
})();
