// Reading, rd-unit: one GSM8K problem through lm-eval (requests, filters, metrics) and Inspect (solvers, scorer, events).
// Real data: src/data/runs.json via parts/22_js_data.js (window.HX.runs).
(function(){
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
let mode='lm',it=0,step=0,playing=false,timer=null,onScreen=false;
const STEPS={lm:['Task YAML','Context','Request','Generate','Filters','Metric','Aggregate, write'],
             in:['Sample','system_message','prompt_template','generate()','Output','Scorer','Metrics, log']};
const R=()=>window.HX&&window.HX.runs;
function mark(text,val){const t=esc(text);if(!val||val==='[invalid]')return t;const e=esc(val);const i=t.lastIndexOf(e);return i<0?t:t.slice(0,i)+'<mark>'+e+'</mark>'+t.slice(i+e.length)}
function clip(s,n){s=String(s);return s.length>n?s.slice(0,n)+' ...':s}
function shotsSplit(ctx){const i=ctx.lastIndexOf('Question:');return [ctx.slice(0,i),ctx.slice(i)]}
function fmtB(b){return b>=1024?(b/1024).toFixed(1)+' KB':b+' B'}
function body(){const r=R();const x=r.items[it];const L=x.lm,I=x['in'];const S=r.summary;
  if(mode==='lm'){
    const strict=L['strict-match'],flex=L['flexible-extract'];
    switch(step){
    case 0:return ['lm-eval reads <code>gsm8k.yaml</code> (task version '+esc((S.lm.versions||{}).gsm8k)+') and loads document '+x.id+' from <code>openai/gsm8k</code>. Nothing about this problem is code: the YAML says how to render it.','<span class="role">doc_to_text</span> "Question: {{question}}\\nAnswer:"\n<span class="role">doc_to_target</span> "{{answer}}"\n<span class="role">output_type</span> generate_until\n\n<span class="role">question</span> '+esc(x.question)+'\n<span class="role">gold</span> '+esc(x.gold)];
    case 1:{const p=shotsSplit(L.context);return ['It renders the context: 5 solved problems from the train split (sampled with seed '+esc(S.lm.fewshot_seed)+'), each ending "#### N", then this question. Raw text, no chat template: '+L.prompt_tokens+' tokens.','<span class="fs">'+esc(clip(p[0],2000))+'</span>\n'+esc(p[1])]}
    case 2:return ['It builds a request and queues it with the other nine before the model runs: the backend only has to answer <code>generate_until(context, until)</code>.','Instance(\n  request_type="generate_until",\n  doc_id='+x.id+',\n  arguments=(context['+L.prompt_tokens+' tokens], '+esc(JSON.stringify(L.gen_kwargs))+')\n)\n\n<span class="fs">10 requests built; sent to the hf backend in batches of 1</span>'];
    case 3:return ['The model continues the text greedily until a stop string or 256 new tokens; it wrote '+L.output_tokens+' tokens. The few-shot answers taught it to end with "#### N".',esc(L.output)];
    case 4:return ['Two filter chains run on the same text. <code>strict-match</code>: regex <code>#### (\\-?[0-9\\.\\,]+)</code>, take the first. <code>flexible-extract</code>: the last number-like string. Highlighted: what each read.','<span class="role">strict-match</span> '+esc(strict.filtered)+'\n<span class="role">flexible-extract</span> '+esc(flex.filtered)+'\n\n'+mark(L.output,flex.filtered)];
    case 5:return ['<code>exact_match</code> compares each filtered answer with the gold after removing commas, <code>$</code>, everything up to "#### " and a trailing period.','<span class="role">gold</span> '+esc(x.gold)+'\n<span class="role">strict-match</span> '+esc(strict.filtered)+'  '+(strict.exact_match?'<span class="ok">1</span>':'<span class="no">0</span>')+'\n<span class="role">flexible-extract</span> '+esc(flex.filtered)+'  '+(flex.exact_match?'<span class="ok">1</span>':'<span class="no">0</span>')];
    default:{const res=S.lm.results;return ['Scores are averaged per filter over the 10 problems and written to a results JSON ('+fmtB(S.lm.results_bytes)+': config, versions, seeds, hashes) and, with <code>--log_samples</code>, one JSONL record per problem and filter ('+fmtB(L.record_bytes)+' for this problem: document, full context, raw and filtered responses, doc, prompt and target hashes).','exact_match, strict-match:      '+(+res['exact_match,strict-match']).toFixed(1)+' +/- '+(+res['exact_match_stderr,strict-match']).toFixed(1)+'\nexact_match, flexible-extract:  '+(+res['exact_match,flexible-extract']).toFixed(1)+' +/- '+(+res['exact_match_stderr,flexible-extract']).toFixed(1)+'\n\n<span class="role">prompt_hash</span> '+esc(L.hashes.prompt_hash.slice(0,16))+'...\n<span class="role">doc_hash</span> '+esc(L.hashes.doc_hash.slice(0,16))+'...']}
    }
  } else {
    const sys=I.messages.find(m=>m.role==='system'),usr=I.messages.find(m=>m.role==='user');
    switch(step){
    case 0:return ['inspect_evals\' <code>record_to_sample</code> turns the row into a <code>Sample</code>: input, target (the number after "####") and the worked reasoning kept as metadata.','<span class="role">id</span> '+esc(I.id)+'\n<span class="role">input</span> '+esc(x.question)+'\n<span class="role">target</span> '+esc(x.gold)];
    case 1:return ['Solver 1, <code>system_message</code>: ten solved train problems (random, fixed seed), each ending "ANSWER: N", go into one system message of the <code>TaskState</code>.','<span class="role">system</span> <span class="fs">'+esc(clip(sys?sys.content:'',2000))+'</span>'];
    case 2:return ['Solver 2, <code>prompt_template</code>: the question is wrapped in the instruction to reason step by step and finish with "ANSWER: $ANSWER".','<span class="role">user</span> '+esc(usr?usr.content:'')];
    case 3:return ['Solver 3, <code>generate()</code>: the provider applies Qwen2.5\'s chat template to the messages and calls the model; the call and its settings become a <code>model</code> event. The prompt is '+I.real.input+' tokens; the log records '+I.usage.input+', because the hf provider reports the padded width of the whole batch of ten.','<span class="role">model event</span> hf/local  max_tokens 512  do_sample False\n<span class="role">messages</span> system, user\n<span class="role">usage logged</span> input '+I.usage.input+', output '+I.usage.output+'  (padded batch)\n<span class="role">real</span> input '+I.real.input+', output '+I.real.output+'  (counted by this page with the model tokenizer)'];
    case 4:return ['The output is appended to the state as an assistant message: '+I.real.output+' tokens'+(I.real.output>=512?', cut at the 512-token cap':'')+'. Stop reason in the log: "'+esc(I.stop_reason)+'".',esc(I.output)];
    case 5:return ['Scorer <code>match(numeric=True)</code>: the <b>last number</b> in the whole output, compared numerically with the target. It does not look for the "ANSWER:" line the prompt asked for.','<span class="role">answer read</span> '+esc(I.answer)+'\n<span class="role">target</span> '+esc(x.gold)+'\n<span class="role">value</span> '+(I.score==='C'?'<span class="ok">C (correct)</span>':'<span class="no">I (incorrect)</span>')+'\n\n'+mark(I.output,I.answer)];
    default:{const sc=S['in'].results.scores[0].metrics;const ev={};I.events.forEach(e=>ev[e]=(ev[e]||0)+1);return ['Metrics <code>accuracy</code> and <code>stderr</code> over the 10 samples go into the log header; the sample keeps every message, the output, the score with its explanation, token usage, timing and '+I.events.length+' events ('+fmtB(I.record_bytes)+' for this problem). <code>inspect view</code> renders it.','accuracy '+(+sc.accuracy.value).toFixed(1)+'   stderr '+(+sc.stderr.value).toFixed(2)+'\n\n<span class="role">events</span> '+Object.entries(ev).map(([k,v])=>k+' x'+v).join(', ')]}
    }
  }
}
function meters(){const r=R();const x=r.items[it];const L=x.lm,I=x['in'];
  const vals={lm:[L.prompt_tokens,L.output_tokens,L.record_bytes],in:[I.real.input,I.real.output,I.record_bytes]};
  const show={lm:[1,3,6],in:[3,4,6]}[mode];const cur=vals[mode];
  const names=['Prompt tokens','Output tokens','Kept per problem'];
  return names.map((n,k)=>{const mx=Math.max(vals.lm[k],vals['in'][k]);const on=step>=show[k];const v=on?cur[k]:0;
    const lab=k===2?fmtB(cur[k]):cur[k].toLocaleString('en-GB');
    return '<div class="an-meter"><span>'+n+'</span><span class="track"><span class="fill'+(mode==='in'?' b':'')+'" style="width:'+(v/mx*100).toFixed(1)+'%"></span></span><span class="v">'+(on?lab:'')+'</span></div>'}).join('');}
function draw(){const r=R();if(!r)return;
  const b=body();$('an-cap').innerHTML='<b>Step '+(step+1)+' of 7.</b> '+b[0];$('an-box').innerHTML=b[1];$('an-box').scrollTop=0;
  $('an-pipe').innerHTML=STEPS[mode].map((s,i)=>'<span class="'+(i===step?'on':i<step?'done':'')+'">'+s+'</span>').join('');
  $('an-meters').innerHTML=meters();$('an-scrub').value=step;$('an-play').textContent=playing?'Pause':'Play';
  const x=r.items[it];const L=x.lm,I=x['in'];
  $('an-read').innerHTML='<div class="t">Problem '+(x.id+1)+' in both harnesses</div>lm-eval strict-match read <code>'+esc(L['strict-match'].filtered)+'</code> ('+(L['strict-match'].exact_match?'correct':'wrong')+'), flexible-extract <code>'+esc(L['flexible-extract'].filtered)+'</code> ('+(L['flexible-extract'].exact_match?'correct':'wrong')+'); Inspect read <code>'+esc(I.answer)+'</code> ('+(I.score==='C'?'correct':'wrong')+'); gold '+esc(x.gold)+'. Prompt '+L.prompt_tokens+' against '+I.real.input+' tokens; output '+L.output_tokens+' against '+I.real.output+' tokens. Different prompts, so different outputs: this is the harness choice, not noise.';}
function chips(){const r=R();$('an-items').innerHTML='<span class="small mute" style="align-self:center">GSM8K problem</span>'+r.items.map((x,i)=>'<button data-i="'+i+'"'+(i===it?' class="on"':'')+'>'+(x.id+1)+'</button>').join('')}
function tick(){clearTimeout(timer);if(!playing)return;
  if(!onScreen||$('t-read').hidden){timer=setTimeout(tick,500);return}
  const sp=+$('an-speed').value||1;
  timer=setTimeout(()=>{if(step<6){step++;draw();tick()}else{playing=false;draw()}},2600/sp);}
function init(){if(!R()){$('an-cap').textContent='(run data missing)';return}
  if(init.done){draw();return}init.done=1;
  // default problem: the first where the harnesses' own logged verdicts disagree (picked by rule, not by hand)
  const r=R();const j=r.items.findIndex(x=>(x.lm['flexible-extract'].exact_match?1:0)!==(x['in'].score==='C'?1:0));if(j>=0)it=j;
  chips();
  $('an-items').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;it=+b.dataset.i;step=0;chips();draw()});
  $('an-mode').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.m;step=0;[...$('an-mode').querySelectorAll('button')].forEach(x=>x.classList.toggle('on',x.dataset.m===mode));draw()});
  $('an-play').onclick=()=>{playing=!playing;if(playing&&step>=6)step=0;draw();tick()};
  $('an-prev').onclick=()=>{playing=false;step=Math.max(0,step-1);draw()};
  $('an-next').onclick=()=>{playing=false;step=Math.min(6,step+1);draw()};
  $('an-scrub').oninput=e=>{playing=false;step=+e.target.value;draw()};
  $('an-speed').onchange=()=>tick();
  const S=r.summary;
  $('an-src').innerHTML='Runs by this page on 4 Oct 2026: lm-eval '+esc(S.lm.lm_eval_version)+' (wall time '+S.lm.wall_s+' s for 10 problems), inspect-ai 0.3.276 with inspect_evals 0.23.0 (wall time '+S['in'].wall_s+' s); scripts <code>src/run_harnesses.sh</code> and <code>src/mk_runs.py</code>. The default problem is the first where the two harnesses\' logged verdicts differ.';
  try{new IntersectionObserver(es=>{onScreen=es[0].isIntersecting;if(onScreen&&!reduce&&!init.auto){init.auto=1;playing=true;tick()}},{threshold:0.25}).observe($('an'))}catch(e){onScreen=true}
  draw();}
(window.TAB_RENDER=window.TAB_RENDER||{})['t-read']=(window.TAB_RENDER['t-read']||[]).concat([init]);
})();
