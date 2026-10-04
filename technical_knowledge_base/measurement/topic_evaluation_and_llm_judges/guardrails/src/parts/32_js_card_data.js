// ---- Guard model scorecards: published numbers, transcribed (see src/inputs/research_guard_models.md for every table) ----
// Row: [model, benchmark, task, metric, value (percent), runner kind, runner, source key, note]
// runner kind: own (the model's makers), rival (a competitor re-ran it), copied (a competitor's table quoting another paper),
// indep (no vendor), page (this page's run). Values are as published, on a 0 to 100 scale.
window.SC=(function(){
  const S={
    qwen:['Qwen3Guard technical report, Tables 2, 3 (Oct 2025)','https://arxiv.org/abs/2510.14276'],
    mis:['Shieldstral 1.0 3B model card (Mistral, Aug 2026)','https://huggingface.co/mistralai/Shieldstral-1.0-3B'],
    sg:['ShieldGemma report, Table 1 (Google, Jul 2024)','https://arxiv.org/abs/2407.21772'],
    ibm:['Granite Guardian paper, Tables 6, 7 (IBM, Dec 2024)','https://arxiv.org/abs/2412.07724'],
    wg:['WildGuard paper, Table 3 (AI2, Jun 2024)','https://arxiv.org/abs/2406.18495'],
    aeg:['Aegis 2.0 paper, Table 3 (NVIDIA, Jan 2025)','https://arxiv.org/abs/2501.09004'],
    oss:['gpt-oss-safeguard technical report, Table 2 (OpenAI, Oct 2025)','https://cdn.openai.com/pdf/08b7dee4-8bc6-4955-a219-7793fb69090c/Technical_report__Research_Preview_of_gpt_oss_safeguard.pdf'],
    gb:['GuardBench leaderboard results (Bassani and Sanchez; last updated Nov 2025)','https://huggingface.co/datasets/AmenRa/guardbench-results'],
    lg31:['Llama Guard 3 1B model card (Meta)','https://github.com/meta-llama/PurpleLlama/blob/main/Llama-Guard3/1B/MODEL_CARD.md'],
    lg38:['Llama Guard 3 8B model card (Meta)','https://github.com/meta-llama/PurpleLlama/blob/main/Llama-Guard3/8B/MODEL_CARD.md'],
    lg4:['Llama Guard 4 12B model card (Meta)','https://github.com/meta-llama/PurpleLlama/blob/main/Llama-Guard4/12B/MODEL_CARD.md'],
    gg41:['Granite Guardian 4.1 8B model card (IBM, Apr 2026)','https://huggingface.co/ibm-granite/granite-guardian-4.1-8b'],
    nem3:['Nemotron-3-Content-Safety model card (NVIDIA, Mar 2026)','https://huggingface.co/nvidia/Nemotron-3-Content-Safety'],
    nem35:['Nemotron-3.5-Content-Safety model card (NVIDIA, Jun 2026)','https://huggingface.co/nvidia/Nemotron-3.5-Content-Safety'],
    apr:['AprielGuard model card (ServiceNow, Nov 2025)','https://huggingface.co/ServiceNow-AI/AprielGuard'],
    pg2:['Llama Prompt Guard 2 model card (Meta, Apr 2025)','https://github.com/meta-llama/PurpleLlama/blob/main/Llama-Prompt-Guard-2/86M/MODEL_CARD.md'],
    pint:['PINT benchmark README (Lakera)','https://github.com/lakeraai/pint-benchmark'],
    page:['This page: Pipeline lab runs (Oct 2026)','#t-pipe']
  };
  const R=[];
  const add=(src,kind,runner,bench,task,metric,rows,note)=>rows.forEach(([m,v,n])=>R.push([m,bench,task,metric,v,kind,runner,src,n||note||'']));
  // ---- ToxicChat, prompt F1
  add('qwen','rival','Qwen','ToxicChat','prompt','F1',[['Llama Guard 3 8B',53.8],['Llama Guard 4 12B',51.3],['WildGuard 7B',70.8],['ShieldGemma 9B',69.4],['ShieldGemma 27B',72.9],['NemoGuard 8B',75.6],['PolyGuard-Qwen 7B',71.5]]);
  add('qwen','own','Qwen','ToxicChat','prompt','F1',[['Qwen3Guard 0.6B (strict)',65.1],['Qwen3Guard 0.6B (loose)',77.7],['Qwen3Guard 4B (strict)',69.5],['Qwen3Guard 4B (loose)',82.8],['Qwen3Guard 8B (strict)',68.9],['Qwen3Guard 8B (loose)',82.8]]);
  add('mis','rival','Mistral','ToxicChat','prompt','F1',[['gpt-oss-safeguard 20B',79.8,'reasoning effort high'],['Qwen3Guard 8B (strict/loose average)',75.6,'average of strict and loose'],['Nemotron 3.5 Content Safety 4B',72.2],['Llama Guard 4 12B',51.0],['ShieldGemma 9B',62.4,'threshold 0.5']]);
  add('mis','own','Mistral','ToxicChat','prompt','F1',[['Shieldstral 3B',84.1,'threshold 0.5']]);
  add('sg','own','Google','ToxicChat','prompt','F1',[['ShieldGemma 2B',70.4],['ShieldGemma 9B',69.4],['ShieldGemma 27B',72.9]],'optimal F1: threshold tuned per dataset');
  add('sg','copied','Google','ToxicChat','prompt','F1',[['Llama Guard 7B',61.6],['Llama Guard 2 8B',47.1],['WildGuard 7B',70.8],['OpenAI Moderation API',25.4],['GPT-4',68.3]],'copied from Inan et al. and Ghosh et al., not re-run');
  add('ibm','rival','IBM','ToxicChat','prompt','F1',[['Llama Guard 7B',59.6],['Llama Guard 2 8B',47.2],['Llama Guard 3 1B',45.3],['Llama Guard 3 8B',54.2],['ShieldGemma 2B',18.1,'default threshold'],['ShieldGemma 9B',18.1,'default threshold'],['ShieldGemma 27B',17.7,'default threshold']]);
  add('ibm','own','IBM','ToxicChat','prompt','F1',[['Granite Guardian 3.0 2B',36.8],['Granite Guardian 3.0 8B',64.9]]);
  add('ibm','rival','IBM','ToxicChat','prompt','AUC',[['Llama Guard 7B',95.5],['Llama Guard 2 8B',87.6],['Llama Guard 3 1B',81.0],['Llama Guard 3 8B',86.5],['ShieldGemma 2B',81.1],['ShieldGemma 9B',85.1],['ShieldGemma 27B',88.0]]);
  add('ibm','own','IBM','ToxicChat','prompt','AUC',[['Granite Guardian 3.0 2B',86.5],['Granite Guardian 3.0 8B',94.0]]);
  add('wg','rival','AI2','ToxicChat','prompt','F1',[['Llama Guard 7B',61.6],['Llama Guard 2 8B',47.1],['Aegis-Guard-D',70.0],['Aegis-Guard-P',73.0],['OpenAI Moderation API',25.4],['GPT-4',68.3]]);
  add('wg','own','AI2','ToxicChat','prompt','F1',[['WildGuard 7B',70.8]]);
  add('oss','own','OpenAI','ToxicChat','prompt','F1',[['gpt-oss-safeguard 120B',79.3],['gpt-oss-safeguard 20B',79.9]],'short hand-written prompt adapted from OpenAI policies');
  add('oss','rival','OpenAI','ToxicChat','prompt','F1',[['gpt-5-thinking',81.0],['gpt-oss-120b',76.7],['gpt-oss-20b',75.9]]);
  add('gg41','own','IBM','ToxicChat','prompt','F1',[['Granite Guardian 3.1 8B',73],['Granite Guardian 3.2 5B',73],['Granite Guardian 3.3 8B',76,'non-thinking'],['Granite Guardian 4.1 8B',78,'non-thinking']]);
  add('apr','own','ServiceNow','ToxicChat','prompt','F1',[['AprielGuard 8B',73]]);
  // ---- OpenAI Moderation, prompt F1
  add('qwen','rival','Qwen','OpenAI Moderation','prompt','F1',[['Llama Guard 3 8B',79.5],['Llama Guard 4 12B',73.5],['WildGuard 7B',72.1],['ShieldGemma 9B',82.1],['ShieldGemma 27B',80.5],['NemoGuard 8B',81.0],['PolyGuard-Qwen 7B',74.1]]);
  add('qwen','own','Qwen','OpenAI Moderation','prompt','F1',[['Qwen3Guard 0.6B (strict)',66.5],['Qwen3Guard 0.6B (loose)',77.6],['Qwen3Guard 8B (strict)',68.8],['Qwen3Guard 8B (loose)',81.3]]);
  add('mis','rival','Mistral','OpenAI Moderation','prompt','F1',[['gpt-oss-safeguard 20B',84.0],['Qwen3Guard 8B (strict/loose average)',74.7],['Nemotron 3.5 Content Safety 4B',74.7],['Llama Guard 4 12B',73.9],['ShieldGemma 9B',78.6]]);
  add('mis','own','Mistral','OpenAI Moderation','prompt','F1',[['Shieldstral 3B',81.4]]);
  add('sg','own','Google','OpenAI Moderation','prompt','F1',[['ShieldGemma 2B',81.2],['ShieldGemma 9B',82.1],['ShieldGemma 27B',80.5]],'optimal F1: threshold tuned per dataset');
  add('ibm','rival','IBM','OpenAI Moderation','prompt','F1',[['Llama Guard 3 1B',68.6],['Llama Guard 3 8B',79.2],['ShieldGemma 2B',24.5,'default threshold'],['ShieldGemma 27B',22.7,'default threshold']]);
  add('ibm','own','IBM','OpenAI Moderation','prompt','F1',[['Granite Guardian 3.0 8B',74.5]]);
  add('aeg','rival','NVIDIA','OpenAI Moderation','prompt','F1',[['OpenAI Moderation API',78.9,'in-domain for the API'],['Llama Guard 2 8B',75.9],['Llama Guard 3 1B',37.4],['Llama Guard 3 8B',78.8]]);
  add('aeg','copied','NVIDIA','OpenAI Moderation','prompt','F1',[['WildGuard 7B',72.1,'from the WildGuard paper']]);
  add('aeg','own','NVIDIA','OpenAI Moderation','prompt','F1',[['Llama 3.1 AegisGuard',77.0]]);
  add('oss','own','OpenAI','OpenAI Moderation','prompt','F1',[['gpt-oss-safeguard 120B',82.9],['gpt-oss-safeguard 20B',82.9]],'evaluated with OpenAI internal policies (in-domain)');
  // ---- WildGuardTest, prompt F1
  add('qwen','rival','Qwen','WildGuardTest','prompt','F1',[['Llama Guard 3 8B',76.4],['Llama Guard 4 12B',73.0],['WildGuard 7B',88.9],['ShieldGemma 9B',54.2],['ShieldGemma 27B',54.3],['NemoGuard 8B',81.6],['PolyGuard-Qwen 7B',88.1]]);
  add('qwen','own','Qwen','WildGuardTest','prompt','F1',[['Qwen3Guard 0.6B (strict)',87.7],['Qwen3Guard 0.6B (loose)',85.1],['Qwen3Guard 8B (strict)',88.9],['Qwen3Guard 8B (loose)',85.6]]);
  add('mis','rival','Mistral','WildGuardTest','prompt','F1',[['gpt-oss-safeguard 20B',87.3],['Qwen3Guard 8B (strict/loose average)',88.2],['Nemotron 3.5 Content Safety 4B',84.4],['Llama Guard 4 12B',74.3],['ShieldGemma 9B',46.0,'threshold 0.5']]);
  add('mis','own','Mistral','WildGuardTest','prompt','F1',[['Shieldstral 3B',88.1]]);
  add('aeg','rival','NVIDIA','WildGuardTest','prompt','F1',[['OpenAI Moderation API',12.1],['Llama Guard 2 8B',70.4],['Llama Guard 3 1B',47.2],['Llama Guard 3 8B',76.8]]);
  add('aeg','copied','NVIDIA','WildGuardTest','prompt','F1',[['WildGuard 7B',88.9,'in-domain for WildGuard']]);
  add('aeg','own','NVIDIA','WildGuardTest','prompt','F1',[['Llama 3.1 AegisGuard',82.1]]);
  add('wg','own','AI2','WildGuardTest','prompt','F1',[['WildGuard 7B',88.9]]);
  add('wg','rival','AI2','WildGuardTest','prompt','F1',[['Llama Guard 7B',56.0],['Llama Guard 2 8B',70.9],['Aegis-Guard-D',78.5],['OpenAI Moderation API',12.1],['GPT-4',87.9]]);
  add('nem35','own','NVIDIA','WildGuardTest','prompt','F1',[['Nemotron 3.5 Content Safety 4B',85]],'harmful F1');
  // ---- XSTest responses, response F1 (harmful answer detection)
  add('qwen','rival','Qwen','XSTest responses','response','F1',[['Llama Guard 3 8B',89.8],['Llama Guard 4 12B',88.9],['WildGuard 7B',94.7],['ShieldGemma 9B',86.3],['ShieldGemma 27B',83.0],['NemoGuard 8B',86.2],['PolyGuard-Qwen 7B',63.4]]);
  add('qwen','own','Qwen','XSTest responses','response','F1',[['Qwen3Guard 0.6B (strict)',89.7],['Qwen3Guard 0.6B (loose)',91.3],['Qwen3Guard 8B (strict)',92.1],['Qwen3Guard 8B (loose)',93.7]]);
  add('wg','own','AI2','XSTest responses','response','F1',[['WildGuard 7B',94.7]]);
  add('wg','rival','AI2','XSTest responses','response','F1',[['Llama Guard 7B',82.0],['Llama Guard 2 8B',90.8],['Aegis-Guard-D',52.8],['MD-Judge',90.4],['OpenAI Moderation API',46.6],['GPT-4',91.3]]);
  add('aeg','rival','NVIDIA','XSTest responses','response','F1',[['OpenAI Moderation API',55.8],['Llama Guard 2 8B',90.8],['Llama Guard 3 1B',24.5],['Llama Guard 3 8B',90.4]]);
  add('aeg','own','NVIDIA','XSTest responses','response','F1',[['Llama 3.1 AegisGuard',88.3]]);
  add('mis','rival','Mistral','XSTest responses','response','F1',[['gpt-oss-safeguard 20B',93.8],['Qwen3Guard 8B (strict/loose average)',92.9],['Nemotron 3.5 Content Safety 4B',86.9],['Llama Guard 4 12B',89.0],['ShieldGemma 9B',80.6]],'"XSTest Harm"');
  add('mis','own','Mistral','XSTest responses','response','F1',[['Shieldstral 3B',93.5]],'"XSTest Harm"');
  add('nem3','own','NVIDIA','XSTest responses','response','F1',[['Nemotron 3 Content Safety 4B',85]],'harmful F1');
  add('nem35','own','NVIDIA','XSTest responses','response','F1',[['Nemotron 3.5 Content Safety 4B',87]],'harmful F1');
  add('lg31','own','Meta','XSTest responses','response','F1',[['Llama Guard 3 8B',88.4],['Llama Guard 3 1B',82.1],['Llama Guard 3 1B int4',73.7],['GPT-4',89.5]]);
  add('ibm','own','IBM','XSTest responses','response','F1',[['Granite Guardian 3.0 8B',84.9]],'XSTEST_RH');
  add('ibm','rival','IBM','XSTest responses','response','F1',[['Llama Guard 3 8B',90.4],['ShieldGemma 27B',79.2]],'XSTEST_RH');
  // ---- XSTest false-positive rate (over-blocking), response
  add('lg31','own','Meta','XSTest responses','response','FPR',[['Llama Guard 3 8B',4.4],['Llama Guard 3 1B',6.8],['Llama Guard 3 1B int4',15.2],['GPT-4',12.8]]);
  add('apr','own','ServiceNow','XSTest responses','response','FPR',[['AprielGuard 8B',1]],'xstest-response');
  // ---- HarmBench, response F1
  add('qwen','rival','Qwen','HarmBench','response','F1',[['Llama Guard 3 8B',84.5],['Llama Guard 4 12B',83.3],['WildGuard 7B',86.3],['ShieldGemma 9B',60.4],['ShieldGemma 27B',62.9],['NemoGuard 8B',81.4],['PolyGuard-Qwen 7B',71.1]]);
  add('qwen','own','Qwen','HarmBench','response','F1',[['Qwen3Guard 0.6B (strict)',85.0],['Qwen3Guard 8B (strict)',87.2]]);
  add('mis','rival','Mistral','HarmBench','response','F1',[['gpt-oss-safeguard 20B',88.2],['Qwen3Guard 8B (strict/loose average)',86.8],['Nemotron 3.5 Content Safety 4B',85.3],['Llama Guard 4 12B',82.8],['ShieldGemma 9B',52.3]]);
  add('mis','own','Mistral','HarmBench','response','F1',[['Shieldstral 3B',87.0]]);
  add('wg','rival','AI2','HarmBench','response','F1',[['Llama Guard 7B',52.0],['Llama Guard 2 8B',77.8],['GPT-4',86.1]]);
  add('wg','own','AI2','HarmBench','response','F1',[['WildGuard 7B',86.3]]);
  // ---- GuardBench (independent), English prompts aggregate F1
  add('gb','indep','GuardBench','GuardBench, English prompts','prompt','F1',[['Granite Guardian 3.0 8B',90.3],['Granite Guardian 3.1 8B',90.1],['Granite Guardian 3.2 5B',88.0],['WildGuard 7B',87.1],['Llama 3.1 NemoGuard 8B',84.1],['Llama Guard 2 8B',82.8],['Llama Guard 3 8B',82.5],['Llama Guard 7B',81.6],['Llama Guard 3 1B',80.9],['ShieldGemma 2B',77.8],['ShieldGemma 9B',75.5]],'aggregate over its English prompt datasets; leaderboard not updated since Nov 2025');
  add('gb','indep','GuardBench','GuardBench, English responses','response','F1',[['Granite Guardian 3.0 8B',83.7],['Granite Guardian 3.1 8B',85.9],['Granite Guardian 3.2 5B',85.5],['WildGuard 7B',86.9],['Llama 3.1 NemoGuard 8B',67.1],['Llama Guard 2 8B',77.6],['Llama Guard 3 8B',77.5],['Llama Guard 7B',67.4],['Llama Guard 3 1B',77.3],['ShieldGemma 2B',67.8],['ShieldGemma 9B',62.5]],'aggregate over its English response datasets');
  // ---- Meta's internal sets (not comparable across cards)
  add('lg38','own','Meta','Meta internal (Llama Guard 3 set)','response','F1',[['Llama Guard 3 8B',93.9],['Llama Guard 2 8B',87.7],['GPT-4 (zero-shot)',80.5]],'internal English test set, MLCommons taxonomy');
  add('lg4','own','Meta','Meta internal (Llama Guard 4 set)','response','F1',[['Llama Guard 4 12B',61],['Llama Guard 3 8B',53,'implied by the card\'s +8 point delta']],'a different internal set from Llama Guard 3\'s card');
  // ---- Injection and jailbreak detectors
  add('pg2','own','Meta','Meta private jailbreak set','prompt','Recall at 1% FPR',[['Prompt Guard 2 86M',97.5],['Prompt Guard 2 22M',88.7],['Prompt Guard 1 86M',21.2]]);
  add('pint','own','Lakera','PINT (prompt injection)','prompt','PINT score',[['Lakera Guard',95.22]],'private set; Lakera runs the benchmark and makes this product');
  add('pint','rival','Lakera','PINT (prompt injection)','prompt','PINT score',[['AWS Bedrock Guardrails',89.24],['Azure AI Prompt Shield',89.12],['ProtectAI DeBERTa v2',79.14],['Prompt Guard 2 86M',78.76],['Google Model Armor',70.07],['Aporia Guardrails',66.44],['Prompt Guard 1 86M',61.82]],'private set; tested May to Aug 2025');
  return {S,R};
})();
