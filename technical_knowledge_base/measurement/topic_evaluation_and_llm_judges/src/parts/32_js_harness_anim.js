// Same model, many harnesses: one MMLU item read the loglikelihood way, the generative way, or the Jan 2023 answer-text way.
(function(){
const D=window.HN_DATA;if(!D||!D.repro||!D.repro.items||!D.repro.items.length)return;
const R=D.repro,IT=R.items,L='ABCD',VOCAB=151665;
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const vis=t=>JSON.stringify(t).slice(1,-1);   // show a token with its spaces and newlines visible
const pct=x=>(100*x).toFixed(x<0.001?3:1)+'%';
let it=0,mode='ll',shots=5,step=0,playing=false,timer=null,onScreen=false;
const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function lenientM(t){return /answer is[:\s]*\(?([ABCD])\b/i.exec(t)||/\b([ABCD])\b/.exec(t)}
function strict(t){t=t.trim();return t&&L.includes(t[0])&&(t.length===1||!/[A-Za-z0-9]/.test(t[1]))?t[0]:null}
function steps(){return mode==='ll'?4:5}
// ---- item chips and shot toggle
function chips(){
  $('hn-items').innerHTML=IT.map((x,i)=>'<button data-i="'+i+'"'+(i===it?' class="on"':'')+'>Item '+(i+1)+': '+esc(x.s.replace(/_/g,' '))+'</button>').join('')+
   '<span class="seg" style="margin:0 0 0 6px"><button data-sh="5"'+(shots===5&&mode!=='gen'?' class="on"':'')+(mode==='gen'?' disabled':'')+'>5-shot</button><button data-sh="0"'+(shots===0?' class="on"':'')+(mode!=='ll'?' disabled title="this mode was run with one shot setting only"':'')+'>0-shot</button></span>';
}
function itemNote(){
  const x=IT[it],o=x.ok;
  return '';
}
// ---- drawing
function promptHTML(x,st){
  const pick=st.pick,dimOthers=st.dim;
  const opts=x.ch.map((c,i)=>'<span class="opt'+(i===x.g&&st.showGold?' gold':'')+(pick===i?' pick':'')+(dimOthers&&pick!==i?' dim':'')+'">'+L[i]+'. '+esc(c)+'</span>').join('');
  let head,shotTxt;
  if(mode==='txt'){shotTxt='5 dev examples drawn at random, each answered with its text';head='Question: '+esc(x.q)+'\nChoices:\n'}
  else{shotTxt=shots?'5 solved dev examples, in order':'no examples';head=esc(x.q.trim())+'\n'}
  const intro=mode==='txt'?'':'The following are multiple choice questions (with answers) about '+esc(x.s.replace(/_/g,' '))+'.\n\n';
  if(mode==='gen')return '<span class="shots">chat template, no examples</span>\n<span class="mute">&lt;|im_start|&gt;system\nYou are Qwen, created by Alibaba Cloud. You are a helpful assistant.&lt;|im_end|&gt;\n&lt;|im_start|&gt;user</span>\n'+intro+head+opts+'Answer:<span class="mute">&lt;|im_end|&gt;\n&lt;|im_start|&gt;assistant</span>';
  return '<span class="shots">'+shotTxt+'</span>\n'+intro+head+opts+'<span class="tail">Answer:</span>';
}
function distHTML(rows,max){
  return rows.map(r=>'<div class="row'+(r.cls?' '+r.cls:'')+'"><span class="tk">'+esc(r.k)+'</span><span class="track"><span class="fill" style="width:'+Math.max(0.5,100*r.v/max).toFixed(1)+'%"></span></span><span class="val">'+r.t+'</span></div>').join('');
}
function counters(c){
  $('hn-count').innerHTML=c.map(k=>'<div class="stat"><div class="k">'+k[0]+'</div><div class="v">'+k[1]+'</div><div class="d">'+(k[2]||'')+'</div></div>').join('');
}
function draw(){
  const x=IT[it],n=steps();step=Math.min(step,n-1);
  $('hn-scrub').max=n-1;$('hn-scrub').value=step;
  const top=shots?x.c1top:x.c2top,lp=shots?x.c1:x.c2;
  const pl=lp.map(Math.exp),mass=pl.reduce((a,b)=>a+b,0);
  let st={pick:null,dim:false,showGold:false},cap='',dist='',gen='',cnt;
  $('hn-gen-h').style.display=$('hn-gen').style.display=(mode==='ll')?'none':'';
  if(mode==='ll'){
    const win=pl.indexOf(Math.max(...pl)),ok=win===x.g;
    $('hn-dist-h').textContent='Next-token probabilities after "Answer:"';
    if(step===0){cap='<b>Step 1.</b> The harness builds one prompt: the instruction line, '+(shots?'five solved examples':'no examples')+', this question, then "Answer:". One forward pass follows.';dist='<span class="small mute">(waiting for the forward pass)</span>'}
    if(step===1){cap='<b>Step 2.</b> The model returns a probability for every one of Qwen2.5\'s '+VOCAB.toLocaleString('en-US')+' tokens. These are the five most likely.';dist=distHTML(top.map(t=>({k:vis(t[0]),v:Math.exp(t[1]),t:pct(Math.exp(t[1]))})),Math.exp(top[0][1]))}
    if(step>=2){
      const rows=L.split('').map((l,i)=>({k:'" '+l+'"',v:pl[i]/mass,t:pct(pl[i]),cls:step>=3?(i===win?(ok?'win':'lose'):'off'):''}));
      dist=distHTML(rows,Math.max(...pl)/mass);
      cap=step===2?'<b>Step 3.</b> Keep only the four tokens " A" to " D". Together they hold '+pct(mass)+' of the probability; the rest of the vocabulary is ignored, so an invalid answer is impossible. Bars are renormalised to those four.':
        '<b>Step 4.</b> The largest wins: <b>'+L[win]+'</b> ('+pct(pl[win]/mass)+' after renormalising). The gold answer is '+L[x.g]+': <span class="verdict '+(ok?'ok':'no')+'">'+(ok?'scored right':'scored wrong')+'</span>.';
      if(step>=3){st.pick=win;st.dim=true;st.showGold=true}
    }
    cnt=[['Candidates compared','4','the letters only'],['Forward passes','1',''],['Tokens generated','0',''],['Verdict',step>=3?(ok?'right':'wrong'):'...','']];
  }
  if(mode==='gen'){
    const out=x.c7g||'',sl=strict(out),ll=lenientM(out),ok1=sl===L[x.g],ok2=ll&&ll[1]===L[x.g];
    const llp=x.c2.map(Math.exp),llw=llp.indexOf(Math.max(...llp));
    $('hn-dist-h').textContent='What each parser extracts';
    const pr=(nm,v,ok,on)=>'<div class="row'+(on?(ok?' win':' lose'):' off')+'"><span class="tk">'+nm+'</span><span class="track"><span class="fill" style="width:'+(v?100:3)+'%"></span></span><span class="val">'+(v||'none')+'</span></div>';
    dist=step>=2?pr('strict',sl,ok1,true)+(step>=3?pr('lenient',ll&&ll[1],ok2,true):''):'<span class="small mute">(no parser has run yet)</span>';
    if(step>=1){
      if(step>=3&&ll){gen=esc(out.slice(0,ll.index))+'<span class="x">'+esc(out.slice(ll.index,ll.index+ll[0].length))+'</span>'+esc(out.slice(ll.index+ll[0].length))}
      else gen=esc(out);
    }
    if(step===0)cap='<b>Step 1.</b> A chat evaluation wraps the same 0-shot question in the model\'s chat template. Qwen2.5\'s template also inserts a default system line ("You are Qwen ... a helpful assistant") when none is given: a knob nobody set.';
    if(step===1)cap='<b>Step 2.</b> The model writes, greedily, up to 96 tokens. An instruct model tends to explain before (or instead of) answering.';
    if(step===2)cap='<b>Step 3.</b> Strict parser: strip spaces, take the first character if it is a letter A to D standing alone. '+(sl?'It finds <b>'+sl+'</b>.':'It finds <b>nothing</b>, so the item is scored wrong whatever the model knew.');
    if(step===3)cap='<b>Step 4.</b> Lenient parser: "answer is X", otherwise the first standalone capital A to D anywhere. '+(ll?'It finds <b>'+ll[1]+'</b> (highlighted)'+(/^A [a-z]/.test(out.slice(ll.index))?'. That "A" is the article in "'+esc(out.slice(ll.index,ll.index+14).split(' ').slice(0,2).join(' '))+'", not an answer: the parser '+(ll[1]===L[x.g]?'is right by luck.':'is wrong by accident.'):'.'):'It finds nothing either.');
    if(step>=4){cap='<b>Step 5.</b> Gold is '+L[x.g]+'. Strict: <span class="verdict '+(ok1?'ok':'no')+'">'+(ok1?'right':'wrong')+'</span>; lenient: <span class="verdict '+(ok2?'ok':'no')+'">'+(ok2?'right':'wrong')+'</span>; loglikelihood on the raw 0-shot prompt picked '+L[llw]+': <span class="verdict '+(llw===x.g?'ok':'no')+'">'+(llw===x.g?'right':'wrong')+'</span>. Same weights, same question, three verdicts.';st.showGold=true}
    if(step>=2&&(step<3?sl:ll)){st.pick=L.indexOf(step<3?sl:ll[1]);st.dim=true}
    cnt=[['Candidates compared',VOCAB.toLocaleString('en-US'),'per generated token'],['Characters written',step>=1?String(out.length):'0','up to 96 tokens'],['Strict / lenient',step>=3?(sl||'none')+' / '+(ll?ll[1]:'none'):(step>=2?(sl||'none')+' / ...':'...'),''],['Verdict (strict)',step>=4?(ok1?'right':(sl?'wrong':'invalid')):'...','']];
  }
  if(mode==='txt'){
    const s=x.c3.map(v=>v[0]),nrm=x.c3.map(v=>v[0]/v[2]);
    const wa=s.indexOf(Math.max(...s)),wn=nrm.indexOf(Math.max(...nrm));
    $('hn-dist-h').textContent='Log-probability of each answer\'s text (closer to 0 is likelier)';
    const mn=Math.min(...s),rows=(useN)=>x.ch.map((c,i)=>{const v=useN?nrm[i]:s[i];const lo=useN?Math.min(...nrm):mn;return {k:L[i]+' ('+x.c3[i][1]+' tok)',v:(v-lo)+0.05*Math.abs(lo),t:(useN?v.toFixed(3)+'/ch':v.toFixed(1)),cls:(step>=2)?(i===(useN?wn:wa)?((useN?wn:wa)===x.g?'win':'lose'):'off'):''}});
    if(step===0){cap='<b>Step 1.</b> lm-eval-harness as of January 2023 (commit e47e01b): "Question:" and "Choices:" labels, no subject line, and five examples drawn at random whose answers are written out as text, not as letters.';dist='<span class="small mute">(four forward passes follow)</span>'}
    if(step>=1){const r=rows(step>=3);const mx=Math.max(...r.map(z=>z.v));dist=distHTML(r,mx)}
    if(step===1)cap='<b>Step 2.</b> One forward pass per option: the sum of log-probabilities of " "+answer text, token by token. Letters are never scored. Longer answers collect more negative terms.';
    if(step===2){cap='<b>Step 3.</b> "acc": the highest sum wins, <b>'+L[wa]+'</b>.';st.pick=wa;st.dim=true}
    if(step===3){cap='<b>Step 4.</b> "acc_norm": divide each sum by the answer\'s length in characters. Winner: <b>'+L[wn]+'</b>'+(wn!==wa?', a different answer from step 3.':', the same as step 3.');st.pick=wn;st.dim=true}
    if(step>=4){st.showGold=true;st.pick=wa;cap='<b>Step 5.</b> Gold is '+L[x.g]+'. acc: <span class="verdict '+(wa===x.g?'ok':'no')+'">'+(wa===x.g?'right':'wrong')+'</span>; acc_norm: <span class="verdict '+(wn===x.g?'ok':'no')+'">'+(wn===x.g?'right':'wrong')+'</span>. The leaderboard showed acc for MMLU.';dist=distHTML(rows(false),Math.max(...rows(false).map(z=>z.v)))}
    gen=step>=1?x.ch.map((c,i)=>L[i]+': '+esc(vis(' '+c))+' ['+x.c3[i][1]+' tokens, '+x.c3[i][2]+' characters]').join('\n'):'';
    cnt=[['Candidates compared','4','answer texts'],['Forward passes','4','one per option'],['Tokens scored',String(x.c3.reduce((a,v)=>a+v[1],0)),'across the four texts'],['Verdict (acc)',step>=4?(wa===x.g?'right':'wrong'):'...','']];
  }
  $('hn-prompt').innerHTML=promptHTML(x,st);$('hn-dist').innerHTML=dist;$('hn-gen').innerHTML=gen||'<span class="mute">(nothing yet)</span>';
  if(mode==='txt')$('hn-gen-h').textContent='The four continuations scored';else $('hn-gen-h').textContent='Model output';
  $('hn-cap').innerHTML=cap;counters(cnt);
  $('hn-play').textContent=playing?'Pause':'Play';
}
function tick(){clearTimeout(timer);if(!playing)return;
  if(!onScreen||document.getElementById('t-harness').hidden){timer=setTimeout(tick,500);return}
  const sp=+$('hn-speed').value||1;
  timer=setTimeout(()=>{if(step<steps()-1){step++;draw();tick()}else{playing=false;draw()}},2300/sp);
}
function setMode(m){mode=m;if(m==='txt')shots=5;if(m==='gen')shots=0;step=0;[...$('hn-mode').querySelectorAll('button')].forEach(b=>b.classList.toggle('on',b.dataset.m===m));chips();draw()}
function init(){
  if(init.done){draw();return}init.done=1;
  chips();
  $('hn-try').innerHTML='<b>Try:</b> play one item in each mode, then switch items and the shot count.'+(function(){for(let i=0;i<IT.length;i++){const x=IT[i];if(x.ok.c1&&!x.ok.c7)return ' Item '+(i+1)+' is right the loglikelihood way and wrong when generated in chat and parsed strictly.'}return ''})();
  $('hn-items').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;if(b.dataset.i!=null){it=+b.dataset.i}else if(b.dataset.sh!=null){shots=+b.dataset.sh}step=0;chips();draw()});
  $('hn-mode').addEventListener('click',e=>{const b=e.target.closest('button');if(b)setMode(b.dataset.m)});
  $('hn-play').onclick=()=>{playing=!playing;if(playing&&step>=steps()-1)step=0;draw();tick()};
  $('hn-prev').onclick=()=>{playing=false;step=Math.max(0,step-1);draw()};
  $('hn-next').onclick=()=>{playing=false;step=Math.min(steps()-1,step+1);draw()};
  $('hn-scrub').oninput=e=>{playing=false;step=+e.target.value;draw()};
  $('hn-speed').onchange=()=>tick();
  $('hn-anim-src').innerHTML='Model Qwen/Qwen2.5-0.5B-Instruct (fp32, CPU), items from cais/mmlu test, probabilities and generations computed offline by this page on 4 Oct 2026 with <code>src/harness/repro_mmlu_knobs.py</code>. Prompts follow the original MMLU code (as in lm-eval-harness\'s <code>mmlu</code> task today); the chat mode wraps the 0-shot prompt in Qwen2.5\'s own chat template; the answer-text mode follows lm-eval-harness commit e47e01b. Items were picked by rule (first item in the sample showing each behaviour), not by hand.';
  try{new IntersectionObserver(es=>{onScreen=es[0].isIntersecting;if(onScreen&&!reduce&&!init.auto){init.auto=1;playing=true;tick()}},{threshold:0.25}).observe($('hn-s-anim'))}catch(e){onScreen=true}
  draw();
}
(window.TAB_RENDER=window.TAB_RENDER||{})['t-harness']=(window.TAB_RENDER['t-harness']||[]).concat([init]);
})();
