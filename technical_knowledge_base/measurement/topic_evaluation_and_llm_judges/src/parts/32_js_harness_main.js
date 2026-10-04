// Same model, many harnesses: reproduction bars and knobs, published cases, knob table, status.
(function(){
const D=window.HN_DATA;if(!D)return;
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const A=(u,t)=>'<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+t+'</a>';
const f1=x=>(+x).toFixed(1);
const WHO={vendor:['Model developer','w-vendor','var(--c4)'],maint:['Harness or leaderboard maintainer','w-maint','var(--c1)'],indep:['Independent reimplementation','w-indep','var(--c3)'],page:['Computed by this page','w-page','var(--c2)']};
const COND={
 c1:['Original prompt, 5-shot, letter loglikelihood','hendrycks/test; lm-eval mmlu at 5 shots; Open LLM Leaderboard v1'],
 c2:['Original prompt, 0-shot, letter loglikelihood','lm-eval mmlu default (no --num_fewshot)'],
 c10:['HELM-style prompt, 5-shot, letter loglikelihood','"Question:" prefix'],
 c5:['HELM-style prompt, 5-shot, generate, strict','greedy; first character must be the letter'],
 c3:['lm-eval Jan 2023: answer text, acc','commit e47e01b: random shots, text continuations'],
 c4:['lm-eval Jan 2023: answer text, acc_norm','same, divided by characters'],
 c6:['Original prompt, 0-shot, generate, strict','raw completion, no chat template'],
 c7:['Chat template, 0-shot, generate, strict','up to 96 tokens'],
 c8:['Chat template, 0-shot, lenient extraction','"answer is X" or first standalone A to D'],
 c9:['Chat template + "Answer with only the letter."','strict']};
const ORDER=['c1','c2','c10','c5','c3','c4','c6','c7','c8','c9'];
const KN={'c1>c2':'Few-shot count (5 to 0)','c1>c10':'Prompt template (original to HELM-style)','c10>c5':'Scoring: loglikelihood to generative','c3>c4':'Length normalisation (acc to acc_norm)','c1>c3':'Scoring target: letter to answer text (old prompt and random shots come with it)','c6>c7':'Chat template (off to on)','c7>c8':'Answer extraction (strict to lenient)','c7>c9':'Instruction "Answer with only the letter."'};
let hlPair=null;
function repro(){
  const R=D.repro;if(!R){$('hn-repro-meta').textContent='(the reproduction has not been run yet)';return}
  $('hn-nitems').textContent=R.n+' items';$('hn-repro-meta').innerHTML='Qwen2.5-0.5B-Instruct (fp32 on CPU, greedy), the first 8 test questions of each of '+(R.nsubj===57?'the 57 MMLU subjects':'the first '+R.nsubj+' of the 57 MMLU subjects in alphabetical order ('+R.subj0.replace(/_/g,' ')+' to '+R.subj1.replace(/_/g,' ')+'; the run was stopped there to save time and can be extended with the same script)')+' (n = '+R.n+'), run on 4 Oct 2026 with '+'<code>src/harness/repro_mmlu_knobs.py</code>; every number recomputed by <code>recompute.py</code>. A 0.5B model is far from a frontier model, so read the <b>gaps</b>, not the levels.';
  const w=$('hn-bars');
  w.innerHTML=ORDER.map(k=>{const a=R.acc[k];if(!a)return '';const lo=Math.max(0,a[0]-a[1]),hi=Math.min(100,a[0]+a[1]);
    const inv=R.invalid[k]!=null?' <small>'+R.invalid[k]+' of '+R.n+' with no letter found</small>':'';
    return '<div class="row" data-k="'+k+'"><span class="nm">'+COND[k][0]+'<small>'+COND[k][1]+'</small>'+inv+'</span><span class="track" style="height:14px;background:var(--soft);border-radius:3px;position:relative;overflow:hidden"><span style="position:absolute;left:25%;top:0;bottom:0;border-left:1px dashed var(--mute)" title="chance, 25%"></span><span class="fill" style="position:absolute;left:0;top:3px;bottom:3px;width:'+a[0].toFixed(1)+'%;background:var(--c2);border-radius:2px"></span><span style="position:absolute;top:6px;height:2px;left:'+lo.toFixed(1)+'%;width:'+(hi-lo).toFixed(1)+'%;background:var(--ink)"></span></span><span class="val">'+f1(a[0])+'% <span class="mute">±'+f1(a[1])+'</span></span></div>'}).join('')+'<div class="small mute">Dashed line: chance (25%).</div>';
  const kw=$('hn-knobs');
  kw.innerHTML=R.pairs.map((p,i)=>{const key=p.a+'>'+p.b;return '<div class="k" data-p="'+i+'"><span>'+KN[key]+'</span><span class="d" style="color:'+(p.d>=0?'var(--good)':'var(--bad)')+'">'+(p.d>=0?'+':'')+f1(p.d)+' pts</span><span class="s">'+f1(R.acc[p.a][0])+'% to '+f1(R.acc[p.b][0])+'%, ±'+f1(1.96*p.se)+' (paired 95%). Items fixed: '+p.b_only+', broken: '+p.a_only+'.</span></div>'}).join('');
  function hl(){[...w.querySelectorAll('.row')].forEach(r=>r.classList.toggle('hl',hlPair!=null&&(R.pairs[hlPair].a===r.dataset.k||R.pairs[hlPair].b===r.dataset.k)));[...kw.querySelectorAll('.k')].forEach(k=>k.classList.toggle('on',+k.dataset.p===hlPair))}
  kw.onclick=e=>{const k=e.target.closest('.k');if(!k)return;hlPair=+k.dataset.p===hlPair?null:+k.dataset.p;hl()};
  w.onclick=e=>{const r=e.target.closest('.row');if(!r)return;const i=R.pairs.findIndex(p=>p.a===r.dataset.k||p.b===r.dataset.k);hlPair=i<0?null:i;hl()};
  const big=R.pairs.slice().sort((a,b)=>Math.abs(b.d)-Math.abs(a.d));
  const lp=R.letterpos;
  $('hn-repro-read').innerHTML='<div class="t">Reading it</div>The largest single knob here is <b>'+KN[big[0].a+'>'+big[0].b].toLowerCase()+'</b> ('+(big[0].d>=0?'+':'')+f1(big[0].d)+' points); the smallest is '+KN[big[big.length-1].a+'>'+big[big.length-1].b].toLowerCase()+' ('+(big[big.length-1].d>=0?'+':'')+f1(big[big.length-1].d)+'). On the raw prompt this model behaves: the four letters hold on average '+f1(R.mass5)+'% of the next-token probability with five examples ('+f1(R.mass0)+'% with none), and greedy decoding\'s first token is the loglikelihood pick on '+R.agree_top1+' of '+R.n+' items, so raw-prompt generative and loglikelihood scoring barely differ. The gap opens when the same question goes through the chat template: the model explains instead of answering, and the parser decides the score. '+(function(){const z=R.pairs.filter(p=>Math.abs(p.d)<1.96*p.se).length;return z+' of '+R.pairs.length+' knobs have a paired interval that includes zero: at n = '+R.n+' they show no detectable effect on this model, which does not mean none on others (LLaMA-65B lost 14.8 points to the letter-to-text switch).'})()+' Gold letters in this sample: A '+R.gold[0]+', B '+R.gold[1]+', C '+R.gold[2]+', D '+R.gold[3]+'; letters picked by loglikelihood at 5 shots: A '+lp.c1[0]+', B '+lp.c1[1]+', C '+lp.c1[2]+', D '+lp.c1[3]+'; at 0 shots: A '+lp.c2[0]+', B '+lp.c2[1]+', C '+lp.c2[2]+', D '+lp.c2[3]+'.';
}
// ---- published cases
let cur=0,openR=-1;
function caseRender(){
  const C=window.HN_CASES;if(!C)return;const c=C[cur];
  $('hn-cases').innerHTML=C.map((x,i)=>'<button data-c="'+i+'"'+(i===cur?' class="on"':'')+'>'+esc(x.short)+'</button>').join('');
  $('hn-case-take').innerHTML='<b>'+esc(c.bench)+'.</b> '+c.take;
  let groups=[...new Set(c.reads.map(r=>r.group||''))];
  $('hn-case-plot').innerHTML=c.reads.length?groups.map(g=>(g?'<div class="band">'+esc(g)+'</div>':'')+c.reads.map((r,i)=>[r,i]).filter(z=>(z[0].group||'')===g).map(([r,i])=>'<div class="bars"><div class="row'+(i===openR?' hl':'')+'" data-r="'+i+'" style="cursor:pointer"><span class="nm" title="'+esc(r.lab)+'">'+esc(r.lab)+'</span><span class="track"><span class="fill" style="width:'+Math.max(0.6,r.v).toFixed(1)+'%;background:'+WHO[r.who][2]+'"></span></span><span class="val">'+(+r.v).toFixed(r.v%1&&Math.round(r.v*10)!==r.v*10?2:1)+'%</span></div></div>').join('')).join('')+'<div class="small mute">Bars run from 0 to 100%. Click a bar or a card for its settings.</div>':'';
  $('hn-case-reads').innerHTML=c.reads.map((r,i)=>'<div class="hn-read'+(i===openR?' on':'')+'" data-r="'+i+'"><div class="top"><span class="v">'+(+r.v).toFixed(2).replace(/\.?0+$/,'')+'%</span><span>'+esc(r.lab)+'</span><span class="who '+WHO[r.who][1]+'">'+WHO[r.who][0]+'</span><span class="pill">'+esc(r.date)+'</span></div><div class="knob">'+r.knob+'</div>'+(i===openR?'<dl><dt>Harness</dt><dd>'+r.harness+'</dd><dt>Prompt</dt><dd>'+esc(r.prompt)+'</dd><dt>Shots</dt><dd>'+esc(r.shots)+'</dd><dt>Scoring</dt><dd>'+r.scoring+'</dd><dt>Extraction</dt><dd>'+esc(r.extract)+'</dd><dt>Chat template</dt><dd>'+esc(r.chat)+'</dd><dt>Averaging</dt><dd>'+r.norm+'</dd><dt>Source</dt><dd>'+A(r.src,'link')+'</dd></dl>':'')+'</div>').join('');
  let ex='';
  if(c.trace)ex+='<div class="tw"><table class="hn-t"><tbody>'+c.trace.map(t=>'<tr><td>'+esc(t[0])+'</td><td class="mono">'+esc(t[1])+'</td></tr>').join('')+'</tbody></table></div><p class="small mute">Worked example and steps from '+A(window.HN_U.drop,'"Open LLM Leaderboard: DROP deep dive"')+' (Hugging Face, 1 Dec 2023).</p>';
  if(c.id==='l65')ex+='<h3 style="margin-top:14px">The same three implementations reorder eight models</h3><div id="hn-slope"></div><p class="small mute">MMLU accuracy per implementation, from the table in '+A(window.HN_U.blog,'the Hugging Face post')+' (23 Jun 2023); ranks recomputed. '+movers()+'</p>';
  if(c.note)ex+='<div class="co warn"><div class="t">Note</div>'+c.note+'</div>';
  $('hn-case-extra').innerHTML=ex;
  if(c.id==='l65')slope();
}
function movers(){const o=n=>['1st','2nd','3rd'][n-1]||n+'th';const sh=m=>m.replace(/^.*\//,'');return D.blogtab.filter(m=>Math.max(...m.rk)-Math.min(...m.rk)>=2).map(m=>sh(m.m)+' ranks '+o(m.rk[0])+' under the original code, '+o(m.rk[1])+' under HELM and '+o(m.rk[2])+' under the January 2023 harness').join('; ')+'.'}
function slope(){
  const el=$('hn-slope');if(!el)return;const T=D.blogtab;const W=Math.max(300,el.clientWidth||600);
  const cols=[['orig','Original'],['helm','HELM'],['harness',W<520?'Jan 2023':'Harness Jan 2023']];
  const lab=Math.min(150,W*0.36),pad=16,cw=(W-lab-pad*2)/(cols.length-1),H=8*26+40;
  const short=m=>m.replace('togethercomputer/','').replace('tiiuae/','').replace('EleutherAI/','').replace('-INCITE-7B-Base','-7B');
  let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Rank of eight models under three MMLU implementations">';
  cols.forEach((c,j)=>{const x=lab+pad+j*cw;s+='<text x="'+x+'" y="14" font-size="11.5" text-anchor="'+(j===0?'start':j===cols.length-1?'end':'middle')+'" fill="var(--mute)">'+c[1]+'</text>'});
  const y=r=>30+(r-1)*26;
  T.forEach((m,i)=>{const col=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','var(--mute)','var(--ink)'][i];
    let p='';cols.forEach((c,j)=>{const x=lab+pad+j*cw;p+=(j?'L':'M')+x.toFixed(1)+' '+y(m.rk[j])});
    s+='<path d="'+p+'" fill="none" stroke="'+col+'" stroke-width="2" opacity=".85"/>';
    cols.forEach((c,j)=>{const x=lab+pad+j*cw;s+='<circle cx="'+x.toFixed(1)+'" cy="'+y(m.rk[j])+'" r="4" fill="'+col+'"><title>'+esc(short(m.m))+': '+m[c[0]].toFixed(1)+'% (rank '+m.rk[j]+')</title></circle>'});
    s+='<text x="'+(lab+pad-8)+'" y="'+(y(m.rk[0])+4)+'" font-size="11" text-anchor="end">'+esc(short(m.m))+' '+m.orig.toFixed(1)+'</text>';
  });
  s+='</svg>';el.innerHTML=s;
}
// ---- knob table and status
function table(){
  const R=D.repro,N=D.nums,P=(k,lab)=>{if(!R)return '';const p=R.pairs.find(q=>q.a+'>'+q.b===k);return p?'this page'+(lab?' ('+lab+')':'')+': '+(p.d>=0?'+':'')+f1(p.d)+' pts':''};
  const rows=[
   ['Scoring method','Read the probabilities of the options (loglikelihood) or let the model write and parse it (generative). Loglikelihood cannot produce an invalid answer and needs log-probabilities, which most APIs do not expose.',P('c10>c5','loglikelihood to generative')+'; LLaMA-65B: HELM generative 63.7 against original 63.6; Llama 3 8B: 66.76 against 66.70','output type, max new tokens, temperature'],
   ['Scoring target and length normalisation','Score the letter or the answer text; for text, the raw sum or the sum per character or token.',P('c1>c3','letter to text')+', '+P('c3>c4','acc to acc_norm')+'; LLaMA-65B: 48.8 against 63.6 (text against letter)','the continuation strings; acc or acc_norm'],
   ['Prompt template','Instruction line, "Question:" and "Choices:" labels, spacing, option format.',P('c1>c10','original to HELM-style'),'the rendered prompt of one item, verbatim'],
   ['Few-shot count and order','Examples teach the answer format; their order and selection change the score.',P('c1>c2','5 to 0 shots')+'; Inspect, Claude Sonnet 4.5: 36.0 at 0 shots, 54.5 at 5','number of shots, sampler (first n or random), seed'],
   ['Answer extraction and stop sequences','Regex, required format, math parser, where generation stops and how many tokens it may use.',P('c7>c8','strict to lenient')+'; Qwen2.5-72B-Instruct MATH Level 5: '+N.q72[0].toFixed(1)+' to '+N.q72[1].toFixed(1)+' on the same outputs; DROP stopped at "."','parser and its version, stop strings, max tokens, share of answers with nothing extracted'],
   ['Chat template and instructions','Wrap the prompt in the model\'s chat format (and shots as turns) or send raw text; add an "answer with the letter" instruction.',P('c6>c7','template on')+', '+P('c7>c9','plus the instruction'),'template hash, system prompt, shots as turns or not'],
   ['Normalisation and averaging','Mean of subjects or of questions; rescale so that chance is 0.','Llama 3 8B: macro '+N.v1_l3.toFixed(2)+', micro '+N.micro_l3.toFixed(2)+'; Llama 3.1 8B Instruct MMLU-Pro: raw '+N.pro_raw.toFixed(1)+', displayed '+N.pro_norm.toFixed(1),'aggregation and baseline'],
   ['Serving','Weights in fp16 or quantised, API provider, decoding defaults.','Llama 3.1 8B Instruct via Together FP8: HELM '+N.h_l31.toFixed(1)+' against Meta 69.4 (confounded with the chat template and token budget)','deployment, precision, provider']];
  $('hn-knobtab').querySelector('tbody').innerHTML=rows.map(r=>'<tr><td>'+r[0]+'</td><td data-l="What changes">'+r[1]+'</td><td data-l="Measured size">'+r[2]+'</td><td data-l="Log this">'+r[3]+'</td></tr>').join('');
  $('hn-status').innerHTML=[
   '<b>HELM</b>: the claim checks out. The README says "HELM entered maintenance mode on June 1, 2026", and the '+A('https://crfm-helm.readthedocs.io/en/latest/maintenance_mode/','Maintenance Mode Policy')+' says volunteers maintain it on a best-effort basis, no new features will be added, and "no new evaluations will be added to the HELM leaderboards"; scenarios may break as provider APIs change. The code and leaderboards stay available. Last release 0.5.16 (30 Apr 2026). The policy itself points to Evalchemy, Inspect Evals, lighteval, lm-eval-harness and Unitxt as alternatives.',
   '<b>Open LLM Leaderboard</b>: v2 launched in June 2024 ('+A(window.HN_U.v2blog,'blog')+': harder benchmarks, chat templates, scores rescaled to chance); the Space was archived on 13 Mar 2025 (commit "Hasta la vista, leaderboard"); the per-model result files used on this tab remain on the Hub.',
   '<b>lm-eval-harness</b>: active, '+A('https://pypi.org/project/lm-eval/','0.4.13')+' (31 Aug 2026). Its '+A('https://github.com/EleutherAI/lm-evaluation-harness/tree/main/lm_eval/tasks/mmlu','mmlu')+' task scores letters by loglikelihood with the first n dev examples and runs 0-shot unless asked; <code>mmlu_generative</code> generates to the first newline and takes exact match.',
   '<b>Inspect and inspect_evals</b>: active, inspect-ai 0.3.276 (2 Oct 2026); the MMLU eval was last changed on 24 Sep 2026.',
   '<b>lighteval</b>: last release 0.13.0 (24 Nov 2025).'].map(x=>'<li>'+x+'</li>').join('');
}
let done=false;
function init(){
  if(!done){done=true;repro();table();
    $('hn-cases').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;cur=+b.dataset.c;openR=-1;caseRender()});
    const tog=e=>{const r=e.target.closest('[data-r]');if(!r||e.target.closest('a'))return;openR=+r.dataset.r===openR?-1:+r.dataset.r;caseRender()};
    $('hn-case-reads').addEventListener('click',tog);$('hn-case-plot').addEventListener('click',tog);
    let t;addEventListener('resize',()=>{clearTimeout(t);t=setTimeout(()=>{if(!$('t-harness').hidden)slope()},150)});
  }
  caseRender();
}
(window.TAB_RENDER=window.TAB_RENDER||{})['t-harness']=(window.TAB_RENDER['t-harness']||[]).concat([init]);
})();
