// ---- Section 2: soft-divergence rates printed on van Hasselt et al. (2018) Figure 2 ----
// (The w, 2w and Baird drawings that lived in 24_js_tr.js moved to Model-free prediction and control on 2026-10-24.)
(function(){
  // soft-divergence rates printed on van Hasselt et al. (2018) Figure 2
  RD.bars(document.getElementById('vb-sd'),[
    {nm:'Q-learning',note:'online network bootstraps',v:61,lab:'61%',col:'var(--c2)'},
    {nm:'Inverse double Q',note:'double, online bootstrap',v:33,lab:'33%',col:'var(--c5)'},
    {nm:'Target Q-learning',note:'DQN\'s target',v:14,lab:'14%',col:'var(--c1)'},
    {nm:'Double Q-learning',note:'Double DQN\'s target',v:10,lab:'10%',col:'var(--c3)'}],{lo:0,hi:100});
})();
