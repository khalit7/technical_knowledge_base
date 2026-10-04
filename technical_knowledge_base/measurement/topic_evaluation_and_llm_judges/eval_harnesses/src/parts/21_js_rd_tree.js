// Decision tree "which harness for which question" (Reading, rd-choose). Pure data plus a renderer; no network.
(function(){
const T={
 q0:{q:'What are you evaluating?',o:[['A model or checkpoint','q1'],['My application: prompt, model, retrieval and tools together','qa'],['A proprietary model, where neither side may see the other\'s secret','enc']]},
 q1:{q:'Does the eval run tools, model-written code or several turns?',o:[['Yes','agent'],['No, one prompt in and one answer out','q2']]},
 q2:{q:'Do you need the probabilities of given options (a base model, multiple-choice by loglikelihood, perplexity)?',o:[['Yes','ll'],['No, the model writes its answer','q3']]},
 q3:{q:'What matters most?',o:[['Matching published numbers on standard tasks','std'],['Running inside a Hugging Face or nanotron training loop','lev'],['How sensitive the score is to the prompt template','unitxt'],['Reading every transcript when a number moves','insp'],['A reference for multi-metric reporting','helm']]},
 qa:{q:'Do you also need production traces, online scores and human review in one place?',o:[['Yes','bt'],['No, regression tests in CI are enough','pf']]},
 agent:{a:'<b>Inspect</b>, with a Docker or VM-backed sandbox per sample. Start from an existing inspect_evals task if one fits; a new eval lives in your own repository and can be listed in the Inspect Evals Register. Pin: inspect-ai version, the task commit, the sandbox image digest, epochs and reducer, and the model\'s decoding settings.'},
 ll:{a:'<b>lm-evaluation-harness</b> (<code>multiple_choice</code> or <code>loglikelihood_rolling</code> tasks). Inspect\'s <code>target_perplexity()</code> does the same since 0.3.212 but only on its vLLM and SageMaker providers. Pin: lm-eval version and commit, task version, shots and seed, and report <code>acc</code> or <code>acc_norm</code> by name. API models without prompt log-probabilities cannot run these tasks.'},
 std:{a:'<b>lm-evaluation-harness</b>, at the commit and settings of the number you compare with (most model-card numbers and both Open LLM Leaderboards). For OpenAI\'s 2024 to 2025 launch numbers, simple-evals; for HELM leaderboard numbers, HELM\'s run specs. Pin everything in the reproducibility table and say chat template on or off.'},
 lev:{a:'<b>lighteval</b>, which runs on nanotron, accelerate and vLLM and pushes per-sample details to the Hub; its preferred <code>lighteval eval</code> path runs on Inspect where a task supports it. Install from a pinned commit: the last PyPI release (0.13.0) is from November 2025.'},
 unitxt:{a:'<b>Unitxt</b>: one card, many templates and formats, so template variance is part of the result. It also runs inside lm-eval (<code>tasks/unitxt</code>) and HELM (<code>unitxt_scenario</code>).'},
 insp:{a:'<b>Inspect</b>: every model call, state change and score is in the <code>.eval</code> log and <code>inspect view</code> shows it. lm-eval with <code>--log_samples</code> keeps the prompt hash, raw and filtered responses, which is enough for extraction bugs but not for multi-step runs.'},
 helm:{a:'<b>HELM</b>, to read: seven metric families per scenario and per-instance dumps. It is in maintenance mode since 1 June 2026 (no new evaluations on its leaderboards), so run new work elsewhere: its own policy names Evalchemy, Inspect Evals, lighteval, lm-eval-harness and Unitxt.'},
 bt:{a:'<b>Braintrust</b> (commercial) or an open alternative such as Langfuse or Phoenix: offline experiments, versioned datasets, online scoring rules with judge scorers, human review. Calibrate the judges before trusting online scores (LLM-as-judge page).'},
 pf:{a:'<b>promptfoo</b>: a YAML matrix of prompts, providers and test cases with assertions, run in CI; its red-team mode adds adversarial tests. Open source (MIT), owned by OpenAI since the March 2026 deal.'},
 enc:{a:'A <b>confidential-computing enclave</b>, as in Google DeepMind\'s August 2026 double-blind pilot: only scores leave. It is a pilot, and it costs debuggability: nobody can read the transcripts. Details on Topic: benchmarks.'}
};
let path=['q0'];
function render(){
  const el=document.getElementById('dt-root');if(!el)return;
  let h='';
  path.forEach((id,i)=>{const n=T[id];
    if(n.q){const next=path[i+1];
      h+='<div class="dt-q"><div class="qq">'+(i+1)+'. '+n.q+'</div><div class="opts">'+n.o.map(o=>'<button data-from="'+i+'" data-to="'+o[1]+'"'+(next===o[1]?' class="on"':'')+'>'+o[0]+'</button>').join('')+'</div></div>';}
    else h+='<div class="dt-ans">'+n.a+'</div><button data-reset="1">Start again</button>';
  });
  el.innerHTML=h;
}
document.addEventListener('click',e=>{const b=e.target.closest('#dt-root button');if(!b)return;
  if(b.dataset.reset){path=['q0'];render();return}
  const i=+b.dataset.from;path=path.slice(0,i+1);path.push(b.dataset.to);render();});
window.DT_TREE=T;
render();
})();
