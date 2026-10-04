// Tab "Inside a run log": the real files written by lm-eval and Inspect, as a clickable tree with notes.
(function(){
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
let mode='lmres',sel=null;
// notes keyed by path suffix (most specific first match wins)
const NOTES={
 lmres:{
  'results':'Aggregated metrics per task and filter: <code>exact_match,strict-match</code> and its <code>_stderr</code> are separate keys. Always quote the filter with the number.',
  'configs':'The fully rendered task config (YAML plus defaults) as it ran: prompt templates, filters, generation kwargs, metadata version. Diff this between two runs before diffing scores.',
  'versions':'The task version from its metadata (GSM8K 3.0). A version bump means the prompt or scoring changed.',
  'n-shot':'Shots actually used per task.',
  'n-samples':'Original size of the test split and how many were evaluated (<code>--limit 10</code> here).',
  'config':'Model, model arguments, batch size, device, limit, and the four seeds (Python, NumPy, torch, few-shot).',
  'git_hash':'The harness commit, when run from a git checkout. Null here because lm-eval was installed from PyPI: then <code>lm_eval_version</code> is the only code pin.',
  'lm_eval_version':'Package version of the harness.',
  'transformers_version':'The backend library version; generation behaviour changes between versions.',
  'task_hashes':'A hash per task of its samples, to check two runs used the same items.',
  'chat_template':'The chat template applied, if any; null because this run sent raw text (no <code>--apply_chat_template</code>).',
  'chat_template_sha':'Hash of the chat template; null for the same reason.',
  'system_instruction':'System prompt added with <code>--system_instruction</code>; none here.',
  'fewshot_as_multiturn':'Whether shots were sent as chat turns.',
  'total_evaluation_time_seconds':'Wall time of the evaluation.',
  'pretty_env_info':'Torch, CUDA, OS and library versions of the machine.',
  'model_dtype':'Precision the weights were loaded in.',
  'tokenizer_eos_token':'Tokenizer special tokens; a wrong EOS changes where generation stops.',
  'date':'Unix time of the run.'},
 lmsmp:{
  'doc':'The dataset row as loaded.',
  'target':'What the metric compares against: here the full worked answer; the metric strips everything up to "#### ".',
  'arguments':'The request: the full context string (5 shots plus the question) and the generation kwargs. This is the prompt as sent, verbatim.',
  'resps':'The raw model output, before any filter.',
  'filtered_resps':'What this record\'s filter extracted from the output: "[invalid]" means the regex found nothing, which scores as wrong.',
  'filter':'Which filter chain this record belongs to; the same problem appears once per filter.',
  'metrics':'Metrics computed on this record.',
  'doc_hash':'Hash of the document; compare across runs to confirm the same item.',
  'prompt_hash':'Hash of the rendered context; if two runs differ here, the prompt changed (shots, template, chat template).',
  'target_hash':'Hash of the target.',
  'exact_match':'The per-sample score for this filter.'},
 inhdr:{
  'version':'Log format version.',
  'status':'success, error or cancelled. A partial run is still a valid log.',
  'eval':'The run\'s identity: task, task version and arguments, model, model arguments and generate config, dataset (name, location, sample ids), packages, and the git revision when run from a repository.',
  'task_args':'Arguments the task was called with (fewshot, seed, ...); defaults recorded too.',
  'model_args':'Provider arguments: here the model path, device, dtype and <b>do_sample False</b>, which had to be passed because the hf provider samples by default.',
  'packages':'Exact versions of inspect_ai and the package holding the task.',
  'dataset':'Dataset name, location and the ids of the samples run.',
  'plan':'The solver chain as run, with each solver\'s parameters (system_message with the shots, prompt_template, generate) and the generate config.',
  'results':'Scorer, metrics (accuracy, stderr) and how many samples completed.',
  'stats':'Start and end times and token usage per model.',
  'reductions':'Per-sample scores after epoch reduction (one epoch here).'},
 insmp:{
  'id':'A stable id derived from the question text (create_stable_id), so the same item keeps its id across dataset orderings.',
  'input':'The sample input as created by record_to_sample.',
  'target':'The number after "####".',
  'messages':'The full conversation after all solvers: system (10 shots), user (template), assistant (output).',
  'output':'The model output with its stop reason and token usage: the place to check truncation.',
  'scores':'The scorer\'s value (C or I), the answer it read and its explanation (here the whole output).',
  'metadata':'The worked reasoning kept from the dataset row.',
  'events_data':'Messages and calls stored once and referenced from events (input_refs).','attachments':'Long strings (the shots, the output) stored once by content hash and referenced as attachment://...','events':'Everything that happened, timed: spans for each solver and the scorer, state changes, the model call with its full input and config, the score. Click an event in the list to read it.',
  'model_usage':'Input and output tokens for this sample.',
  'total_time':'Seconds for this sample, including waiting; working_time excludes waiting.',
  'working_time':'Seconds spent working on this sample.'}
};
function data(){const L=window.HX&&window.HX.logs;if(!L)return null;return {lmres:L.lm_results,lmsmp:L.lm_sample,inhdr:L.in_header,insmp:L.in_sample}[mode]}
function note(path){const N=NOTES[mode];for(let i=path.length-1;i>=0;i--){if(N[path[i]])return [path[i],N[path[i]]]}return null}
function tree(o,path,depth,out){
  const pad=d=>'<span class="ind" style="width:'+(d*1.2)+'em"></span>';
  if(o&&typeof o==='object'){
    const ent=Array.isArray(o)?o.map((v,i)=>[i,v]):Object.entries(o);
    ent.forEach(([k,v])=>{const p=path.concat([String(k)]);const id=p.join('/');const isObj=v&&typeof v==='object';
      const n=note(p);const key=isNaN(+k)?esc(k):'['+k+']';
      out.push('<div>'+pad(depth)+(n||!isNaN(+k)?'<span class="k'+(sel===id?' sel':'')+'" data-p="'+esc(id)+'">'+key+'</span>':'<span class="mute">'+key+'</span>')+': '+(isObj?(Array.isArray(v)?'<span class="mute">['+v.length+']</span>':''):'<span class="v">'+esc(JSON.stringify(v))+'</span>')+'</div>');
      if(isObj&&depth<5&&!(mode==='insmp'&&k==='events'))tree(v,p,depth+1,out);
      if(mode==='insmp'&&k==='events')out.push('<div>'+pad(depth+1)+'<span class="mute">('+v.length+' events: see the list on the right)</span></div>');
    });
  }
  return out;}
function events(){const L=window.HX.logs;if(mode!=='insmp'){$('lg-ev').innerHTML='';return}
  const ev=L.in_sample.events||[];const t0=ev.length&&ev[0].timestamp?Date.parse(ev[0].timestamp):0;
  $('lg-ev').innerHTML='<div class="small mute" style="margin-top:6px">Events of this sample ('+ev.length+'), seconds from the first</div>'+ev.map((e,i)=>{const dt=e.timestamp&&t0?((Date.parse(e.timestamp)-t0)/1000).toFixed(1):'';
    const s=e.event==='model'?'input by reference '+esc(JSON.stringify(e.input_refs||[]))+', output '+esc(((e.output||{}).usage||{}).output_tokens||'')+' tokens (logged)':e.event==='score'?'value '+esc((e.score||{}).value)+', answer '+esc((e.score||{}).answer):e.name?esc(e.name):e.event==='state'?esc((e.changes||[]).map(c=>c.path).join(' ').slice(0,60)):'';
    return '<div class="ev'+(sel==='ev'+i?' sel':'')+'" data-e="'+i+'"><span class="t">'+dt+'</span><span class="ty">'+esc(e.event)+'</span><span class="s">'+s+'</span></div>'}).join('');}
function render(){const d=data();if(!d){$('lg-tree').textContent='(log data missing)';return}
  const F=window.HX.logs.files;$('lg-file').innerHTML=esc(F[mode]);
  $('lg-tree').innerHTML=tree(d,[],0,[]).join('');events();}
function init(){if(!window.HX||!window.HX.logs)return;
  if(!init.done){init.done=1;
    $('lg-mode').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.m;sel=null;[...$('lg-mode').querySelectorAll('button')].forEach(x=>x.classList.toggle('on',x.dataset.m===mode));$('lg-note').innerHTML='Click a field name on the left.';render()});
    $('lg-tree').addEventListener('click',e=>{const k=e.target.closest('.k');if(!k)return;sel=k.dataset.p;const p=sel.split('/');const n=note(p);
      let v=data();p.forEach(x=>{v=v==null?v:v[x]});const pre=JSON.stringify(v,null,1)||'';
      $('lg-note').innerHTML='<b>'+esc(p.join(' > '))+'</b><br>'+(n?n[1]:'An element of '+esc(p.slice(0,-1).join(' > '))+'.')+'<div class="ex-out" style="margin-top:6px;max-height:160px">'+esc(pre.slice(0,1200))+(pre.length>1200?' ...':'')+'</div>';render()});
    $('lg-ev').addEventListener('click',e=>{const r=e.target.closest('.ev');if(!r)return;const i=+r.dataset.e;sel='ev'+i;const ev=window.HX.logs.in_sample.events[i];
      const N={span_begin:'A span opens: solvers, the scorer and the sample itself are spans, so the viewer can fold them.',span_end:'A span closes.',sample_init:'The sample is created: input, target, metadata and the initial state.',state:'A solver changed the TaskState; the change is stored as a JSON patch.',model:'A model call: tools, generate config, the output with usage and stop reason, and timing. The input messages are not repeated: <code>input_refs</code> points at messages stored once per sample in <code>events_data</code>, whose long texts sit in <code>attachments</code> by hash, which is how the log stays small enough for long agent runs.',score:'The scorer ran: value, answer, explanation.'};
      const pre=JSON.stringify(ev,null,1);$('lg-note').innerHTML='<b>event '+i+': '+esc(ev.event)+'</b><br>'+(N[ev.event]||'')+'<div class="ex-out" style="margin-top:6px;max-height:200px">'+esc(pre.slice(0,1500))+(pre.length>1500?' ...':'')+'</div>';events()});
    const S=window.HX.runs&&window.HX.runs.summary;
    $('lg-src').innerHTML='Files from runs by this page on 4 Oct 2026 (<code>src/run_harnesses.sh</code>), stored shortened in <code>src/data/</code>: lm-eval results '+(S?(S.lm.results_bytes/1024).toFixed(1)+' KB':'')+' and samples '+(S?(S.lm.samples_bytes/1024).toFixed(1)+' KB':'')+' for 10 problems; Inspect JSON log '+(S?(S['in'].log_bytes/1024).toFixed(1)+' KB':'')+' (Inspect\'s default <code>.eval</code> format is compressed, "typically 1/8 the size" of JSON by its docs).';
  }
  render();}
(window.TAB_RENDER=window.TAB_RENDER||{})['t-logs']=(window.TAB_RENDER['t-logs']||[]).concat([init]);
})();
