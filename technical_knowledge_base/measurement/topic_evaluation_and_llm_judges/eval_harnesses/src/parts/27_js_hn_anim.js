// Moved from the parent topic's tab "Same model, many harnesses" on 2026-10-24 (32_js_harness_anim.js); Reading section 2, Fig. 3.
// 2026-11-09: driven by RD.anim with a step list per mode on the left (sxl-hn-ll, -gen, -txt); the caption under the figure keeps only this item's numbers.
// Same model, many harnesses: one MMLU item read the loglikelihood way, the generative way, or the Jan 2023 answer-text way.
(function(){
const D=window.HN_DATA;if(!D||!D.repro||!D.repro.items||!D.repro.items.length)return;
const R=D.repro,IT=R.items,L='ABCD',VOCAB=151665;
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const vis=t=>JSON.stringify(t).slice(1,-1);   // show a token with its spaces and newlines visible
const pct=x=>(100*x).toFixed(x<0.001?3:1)+'%';
let it=0,mode='ll',shots=5,step=0,A=null;
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
  const top=shots?x.c1top:x.c2top,lp=shots?x.c1:x.c2;
  const pl=lp.map(Math.exp),mass=pl.reduce((a,b)=>a+b,0);
  let st={pick:null,dim:false,showGold:false},cap='',dist='',gen='',cnt;
  $('hn-gen-h').style.display=$('hn-gen').style.display=(mode==='ll')?'none':'';
  if(mode==='ll'){
    const win=pl.indexOf(Math.max(...pl)),ok=win===x.g;
    $('hn-dist-h').textContent='Next-token probabilities after "Answer:"';
    if(step===0){cap=(shots?'5-shot':'0-shot')+' prompt for item '+(it+1)+'; one forward pass follows.';dist='<span class="small mute">(waiting for the forward pass)</span>'}
    if(step===1){cap='Most likely next token: '+esc(vis(top[0][0]))+' ('+pct(Math.exp(top[0][1]))+').';dist=distHTML(top.map(t=>({k:vis(t[0]),v:Math.exp(t[1]),t:pct(Math.exp(t[1]))})),Math.exp(top[0][1]))}
    if(step>=2){
      const rows=L.split('').map((l,i)=>({k:'" '+l+'"',v:pl[i]/mass,t:pct(pl[i]),cls:step>=3?(i===win?(ok?'win':'lose'):'off'):''}));
      dist=distHTML(rows,Math.max(...pl)/mass);
      cap=step===2?'The four letters hold '+pct(mass)+' of the probability on this item; bars are renormalised to them.':
        'Winner <b>'+L[win]+'</b> ('+pct(pl[win]/mass)+' after renormalising); gold '+L[x.g]+': <span class="verdict '+(ok?'ok':'no')+'">'+(ok?'scored right':'scored wrong')+'</span>.';
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
    if(step===0)cap='Item '+(it+1)+', 0-shot, in Qwen2.5\'s chat template with its default system line: a knob nobody set.';
    if(step===1)cap='It wrote '+out.length+' characters.';
    if(step===2)cap='Strict parser: '+(sl?'it finds <b>'+sl+'</b>.':'it finds <b>nothing</b>, so the item is scored wrong.');
    if(step===3)cap='Lenient parser: '+(ll?'it finds <b>'+ll[1]+'</b> (highlighted)'+(/^A [a-z]/.test(out.slice(ll.index))?'. That "A" is the article in "'+esc(out.slice(ll.index,ll.index+14).split(' ').slice(0,2).join(' '))+'", not an answer: the parser '+(ll[1]===L[x.g]?'is right by luck.':'is wrong by accident.'):'.'):'it finds nothing either.');
    if(step>=4){cap='Gold is '+L[x.g]+'. Strict: <span class="verdict '+(ok1?'ok':'no')+'">'+(ok1?'right':'wrong')+'</span>; lenient: <span class="verdict '+(ok2?'ok':'no')+'">'+(ok2?'right':'wrong')+'</span>; loglikelihood on the raw 0-shot prompt picked '+L[llw]+': <span class="verdict '+(llw===x.g?'ok':'no')+'">'+(llw===x.g?'right':'wrong')+'</span>. Same weights, same question, three verdicts.';st.showGold=true}
    if(step>=2&&(step<3?sl:ll)){st.pick=L.indexOf(step<3?sl:ll[1]);st.dim=true}
    cnt=[['Candidates compared',VOCAB.toLocaleString('en-US'),'per generated token'],['Characters written',step>=1?String(out.length):'0','up to 96 tokens'],['Strict / lenient',step>=3?(sl||'none')+' / '+(ll?ll[1]:'none'):(step>=2?(sl||'none')+' / ...':'...'),''],['Verdict (strict)',step>=4?(ok1?'right':(sl?'wrong':'invalid')):'...','']];
  }
  if(mode==='txt'){
    const s=x.c3.map(v=>v[0]),nrm=x.c3.map(v=>v[0]/v[2]);
    const wa=s.indexOf(Math.max(...s)),wn=nrm.indexOf(Math.max(...nrm));
    $('hn-dist-h').textContent='Log-probability of each answer\'s text (closer to 0 is likelier)';
    const mn=Math.min(...s),rows=(useN)=>x.ch.map((c,i)=>{const v=useN?nrm[i]:s[i];const lo=useN?Math.min(...nrm):mn;return {k:L[i]+' ('+x.c3[i][1]+' tok)',v:(v-lo)+0.05*Math.abs(lo),t:(useN?v.toFixed(3)+'/ch':v.toFixed(1)),cls:(step>=2)?(i===(useN?wn:wa)?((useN?wn:wa)===x.g?'win':'lose'):'off'):''}});
    if(step===0){cap='Item '+(it+1)+' as the January 2023 harness wrote it.';dist='<span class="small mute">(four forward passes follow)</span>'}
    if(step>=1){const r=rows(step>=3);const mx=Math.max(...r.map(z=>z.v));dist=distHTML(r,mx)}
    if(step===1)cap='The four answer texts are '+x.c3.map(v=>v[1]).join(', ')+' tokens long.';
    if(step===2){cap='acc picks <b>'+L[wa]+'</b>.';st.pick=wa;st.dim=true}
    if(step===3){cap='acc_norm picks <b>'+L[wn]+'</b>'+(wn!==wa?', a different answer from step 3.':', the same as step 3.');st.pick=wn;st.dim=true}
    if(step>=4){st.showGold=true;st.pick=wa;cap='Gold is '+L[x.g]+'. acc: <span class="verdict '+(wa===x.g?'ok':'no')+'">'+(wa===x.g?'right':'wrong')+'</span>; acc_norm: <span class="verdict '+(wn===x.g?'ok':'no')+'">'+(wn===x.g?'right':'wrong')+'</span>. The leaderboard showed acc for MMLU.';dist=distHTML(rows(false),Math.max(...rows(false).map(z=>z.v)))}
    gen=step>=1?x.ch.map((c,i)=>L[i]+': '+esc(vis(' '+c))+' ['+x.c3[i][1]+' tokens, '+x.c3[i][2]+' characters]').join('\n'):'';
    cnt=[['Candidates compared','4','answer texts'],['Forward passes','4','one per option'],['Tokens scored',String(x.c3.reduce((a,v)=>a+v[1],0)),'across the four texts'],['Verdict (acc)',step>=4?(wa===x.g?'right':'wrong'):'...','']];
  }
  $('hn-prompt').innerHTML=promptHTML(x,st);$('hn-dist').innerHTML=dist;$('hn-gen').innerHTML=gen||'<span class="mute">(nothing yet)</span>';
  if(mode==='txt')$('hn-gen-h').textContent='The four continuations scored';else $('hn-gen-h').textContent='Model output';
  $('hn-cap').innerHTML=cap;counters(cnt);
}
// the step list on the left follows the mode: one ol.sx per mode, swapped (and replayed) when the reader changes mode, item or shot count
function lists(){['ll','gen','txt'].forEach(m=>{const el=$('sxl-hn-'+m);if(el)el.hidden=m!==mode})}
function setMode(m){mode=m;if(m==='txt')shots=5;if(m==='gen')shots=0;step=0;[...$('hn-mode').querySelectorAll('button')].forEach(b=>b.classList.toggle('on',b.dataset.m===m));chips();lists();A.reset(steps(),'sxl-hn-'+m)}
function init(){
  if(init.done){A.redraw();return}init.done=1;
  chips();lists();
  // RD.anim (skill template): plays by itself once half in view, pauses off screen, stops for good on a reader control or at the last step
  A=RD.anim({card:'hn-s-anim',ctl:'hn-ctl',n:steps(),list:'sxl-hn-'+mode,ms:4200,label:'Step',draw:i=>{step=i;draw()}});
  $('hn-try').innerHTML='<b>Predict:</b> in the chat mode, will the strict parser find a letter? Then step through each mode, switch items and the shot count.'+(function(){for(let i=0;i<IT.length;i++){const x=IT[i];if(x.ok.c1&&!x.ok.c7)return ' Item '+(i+1)+' is right the loglikelihood way and wrong when generated in chat and parsed strictly.'}return ''})();
  $('hn-items').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;if(b.dataset.i!=null){it=+b.dataset.i}else if(b.dataset.sh!=null){shots=+b.dataset.sh}step=0;chips();A.reset(steps())});
  $('hn-mode').addEventListener('click',e=>{const b=e.target.closest('button');if(b)setMode(b.dataset.m)});
  $('hn-anim-src').innerHTML='Model Qwen/Qwen2.5-0.5B-Instruct (fp32, CPU), items from cais/mmlu test, probabilities and generations computed offline by this page on 4 Oct 2026 with <code>src/spread/repro_mmlu_knobs.py</code>. Prompts follow the original MMLU code (as in lm-eval-harness\'s <code>mmlu</code> task today); the chat mode wraps the 0-shot prompt in Qwen2.5\'s own chat template; the answer-text mode follows lm-eval-harness commit e47e01b. Items were picked by rule (first item in the sample showing each behaviour), not by hand.';
}
(window.TAB_RENDER=window.TAB_RENDER||{})['t-read']=(window.TAB_RENDER['t-read']||[]).concat([init]);
})();
