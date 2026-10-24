// ---- Text filled from the recorded data: the real video prompt (section 5). Since 2026-10-24 every measured number in the prose is
// written in the HTML and checked against out/*.json by runs/check_data.py, so the ledger check can see it ----
(function(){
  const V=VM,R=V.D.runs||{};
  const v=R.qwen&&R.qwen.video;V.TXT.video_prompt=v?V.esc(v.prompt_example):'<i>(measurement pending)</i>';
})();
