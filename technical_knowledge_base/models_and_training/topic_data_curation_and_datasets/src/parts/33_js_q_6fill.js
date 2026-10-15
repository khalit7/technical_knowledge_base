// ---- Quality lab: numbers in the prose come from the data (data-q keys), predict-then-reveal questions, one-screen tiles ----
(function(){
  const D=window.QD,Q=window.QL;if(!D||!document.getElementById('t-qual'))return;const S=D.S,P=Q.pct,F=Q.fmt;
  const V={
    keep_edu:()=>F(S.keep_edu)+' ('+P(S.keep_edu_frac)+')',keep_dclm:()=>F(S.keep_dclm)+' ('+P(S.keep_dclm_frac)+')',
    keep_both:()=>F(S.keep_both),keep_either:()=>F(S.keep_either),keep_edu_frac:()=>P(S.keep_edu_frac),keep_dclm_frac:()=>P(S.keep_dclm_frac),
    jacc_published:()=>P(S.jacc_published),spearman_edu_dclm:()=>F(S.spearman_edu_dclm,2),
    top10_jacc:()=>P(S.top10_jacc),top10_overlap:()=>P(S.top10_overlap),fw_top10_jacc:()=>P(S.fw_top10_jacc),
    dclm_cut:()=>S.dclm_cut.toFixed(4),dclm_q10:()=>D.S.dclm_q10.toFixed(4),
    fw50_dclm:()=>P(S.fineweb_rand50k.dclm_pass_docs,0),fwe50_dclm:()=>P(S.fineweb_edu_rand50k.dclm_pass_docs,0),
    dt_flip:()=>F(S.dt_flip),dt_meanabs:()=>S.dt_meanabs.toFixed(3),dt_maxabs:()=>S.dt_maxabs.toFixed(2),dt_keep:()=>F(S.dt_keep),
    own_f1:()=>P(S.own_vs_llama_1500.binary.f1,0),edu_f1:()=>P(S.edu_vs_llama.binary.f1,0),
    annot_sp:()=>F(S.annot_all.spearman_dclm_llama,2),
    lab_both_yes:()=>P(S.labels.both_dropped.yes_share,0),lab_edu_yes:()=>P(S.labels.edu_dropped.yes_share,0),lab_dclm_yes:()=>P(S.labels.dclm_dropped.yes_share,0),
    lab_s4_no:()=>F(S.labels.strata.S4.no),lab_news12:()=>F(S.labels.news_by_stratum.S1+S.labels.news_by_stratum.S2),
    lab_gen5:()=>F(S.labels.gen_like_by_stratum.S5),lab_gen1:()=>F(S.labels.gen_like_by_stratum.S1),
    lab_wrong_news:()=>F(S.labels.both_dropped_yes_formats.news||0),lab_wrong_n:()=>F(Object.values(S.labels.both_dropped_yes_formats).reduce((a,b)=>a+b,0)),
    fwedu_in_run0:()=>F(S.fwedu_in_run0),fwedu_in_run0_edu_ge25:()=>F(S.fwedu_in_run0_edu_ge25),run0_edu_ge25_not_fwedu:()=>F(S.run0_edu_ge25_not_fwedu),
    edu_macro:()=>P(S.edu_vs_llama.binary.macro_f1,0),edu_6macro:()=>P(S.edu_vs_llama.six_class_macro_f1,0),edu_acc6:()=>P(S.edu_vs_llama.six_class_acc,0),
    edu_sp:()=>F(S.edu_vs_llama.spearman,2),own_sp:()=>F(S.own_vs_llama_1500.spearman,2),own_macro:()=>P(S.own_vs_llama_1500.binary.macro_f1,0),
    own_test_f1:()=>P(D.ft.test.f1,0),own_test_prec:()=>P(D.ft.test.precision,0),own_test_rec:()=>P(D.ft.test.recall,0),own_thr:()=>String(D.own_thr),
    own_mb:()=>F(D.ft.model_bytes/1e6,0)+' MB',n_train:()=>F(D.ft.n_train),n_test:()=>F(D.ft.n_test),
    sp_edu_own:()=>F(S.spearman_edu_own,2),sp_dclm_own:()=>F(S.spearman_dclm_own,2),keep_own:()=>F(S.keep_own),
    cc_head:()=>S.ccnet?F(S.ccnet.head):'n/a',cc_mid:()=>S.ccnet?F(S.ccnet.middle):'n/a',cc_tail:()=>S.ccnet?F(S.ccnet.tail):'n/a',
    cc_med:()=>S.ccnet?F(S.ccnet.median_ppl):'n/a',cc_sp_edu:()=>S.ccnet?F(S.ccnet.spearman_edu,2):'n/a',cc_sp_dclm:()=>S.ccnet?F(S.ccnet.spearman_dclm,2):'n/a',
    cc_head_edu:()=>S.ccnet?P(S.ccnet.head_edu_keep):'n/a',cc_tail_edu:()=>S.ccnet?P(S.ccnet.tail_edu_keep):'n/a',
    cc_head_dclm:()=>S.ccnet?P(S.ccnet.head_dclm_keep):'n/a',cc_tail_dclm:()=>S.ccnet?P(S.ccnet.tail_dclm_keep):'n/a',
    nemo_hi_dclm:()=>P(S.nemo_median.high.dclm_pass,0),nemo_mh_dclm:()=>P(S.nemo_median['medium-high'].dclm_pass,0),nemo_m_dclm:()=>P(S.nemo_median.medium.dclm_pass,1),
    nemo_hi_edu:()=>P(S.nemo_median.high.edu_pass,0),nemo_mh_edu:()=>P(S.nemo_median['medium-high'].edu_pass,0),
    nemo_sp:()=>F(S.nemo_spearman,2),
    qw_med:()=>S.qwen?F(S.qwen.median_ppl,1):'n/a',qw_sp_cc:()=>S.qwen?F(S.qwen.spearman_ccnet,2):'n/a',qw_jacc_cc:()=>S.qwen?P(S.qwen.low30_jacc_ccnet,0):'n/a',
    qw_sp_edu:()=>S.qwen?F(S.qwen.spearman_edu,2):'n/a',qw_sp_dclm:()=>S.qwen?F(S.qwen.spearman_dclm,2):'n/a',
    qw_lo_edu:()=>S.qwen?P(S.qwen.low30_edu_keep):'n/a',qw_hi_edu:()=>S.qwen?P(S.qwen.high30_edu_keep):'n/a',
    qw_lo_dclm:()=>S.qwen?P(S.qwen.low30_dclm_keep):'n/a',qw_hi_dclm:()=>S.qwen?P(S.qwen.high30_dclm_keep):'n/a',
    f5_edu:()=>S.fw50k?P(S.fw50k.keep_edu):'n/a',f5_edu_tok:()=>S.fw50k?P(S.fw50k.keep_edu_tokens):'n/a',f5_dclm:()=>S.fw50k?P(S.fw50k.keep_dclm):'n/a',
    f5_both:()=>S.fw50k?F(S.fw50k.both):'n/a',f5_jacc:()=>S.fw50k?P(S.fw50k.jacc_published):'n/a',f5_top10:()=>S.fw50k?P(S.fw50k.top10_jacc):'n/a',f5_sp:()=>S.fw50k?F(S.fw50k.spearman,2):'n/a',
    qw_low12:()=>S.qwen?S.qwen.lowest12[0].toFixed(1)+' to '+S.qwen.lowest12[11].toFixed(1):'n/a',qw_gen_n:()=>S.qwen?F(S.qwen.gen_like_n):'n/a',qw_oth_n:()=>S.qwen?F(S.qwen.other_n):'n/a',
    qw_gen_med:()=>S.qwen?F(S.qwen.gen_like_median,1):'n/a',qw_oth_med:()=>S.qwen?F(S.qwen.other_median,1):'n/a',
    cc_gen_med:()=>S.qwen?F(S.qwen.gen_like_ccnet_median):'n/a',cc_oth_med:()=>S.qwen?F(S.qwen.other_ccnet_median):'n/a',
    repro:()=>S.dclm_repro_maxabs.toExponential(0)
  };
  document.querySelectorAll('#t-qual [data-q]').forEach(el=>{const f=V[el.dataset.q];el.textContent=f?f():'?'});
  document.querySelectorAll('#t-qual [data-qpr]').forEach(pr=>{const ans=pr.querySelector('.ans');pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
    pr.querySelectorAll('.opts button').forEach(x=>x.classList.toggle(x.dataset.r==='1'?'right':'wrong',x===b||x.dataset.r==='1'));ans.hidden=false}))});
  const cfg=document.getElementById('q-ft-cfg');if(cfg){const c=D.ft.best_cfg;cfg.textContent='word n-grams '+c.wordNgrams+', dimension '+c.dim+', '+c.epoch+' epochs, learning rate '+c.lr}
  const one=document.getElementById('q-one');
  if(one)one.innerHTML=[['FineWeb-Edu keeps',V.keep_edu(),'int_score ≥ 3'],['DCLM keeps',V.keep_dclm(),'P(hq) ≥ '+V.dclm_cut()],
    ['kept by both',V.keep_both(),'overlap '+V.jacc_published()+' of the union'],['rank correlation',V.spearman_edu_dclm(),'Spearman, 2,617 documents'],
    ['good text both drop',V.lab_both_yes(),'hand-labelled estimate']].map(a=>'<div class="stat"><div class="k">'+a[0]+'</div><div class="v">'+a[1]+'</div><div class="d">'+a[2]+'</div></div>').join('');
})();
