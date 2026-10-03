// ---- Reading, soft targets: real Qwen2.5-0.5B-Instruct logits at any temperature (exact for the top 40, binned tail) ----
(function(){
  const $=id=>document.getElementById(id);if(!$('dk'))return;
  const L=DS.logits,P=L.prompts;let cur=0;
  const NAMES={capital:'The capital',times:'7 times 8',animal:'Favourite animal',code:'Python loop'};
  $('dkP').innerHTML=P.map((p,i)=>'<button data-i="'+i+'"'+(i===0?' class="on"':'')+'>'+NAMES[p.k]+'</button>').join('');
  $('dkP').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;cur=+b.dataset.i;
    [...$('dkP').children].forEach(x=>x.classList.toggle('on',x===b));draw()});
  const show=t=>'"'+t.replace(/\n/g,'\\n').replace(/ /g,'\u2423')+'"';
  function dist(p,T){
    // log-sum-exp over the exact top tokens and the binned tail (bin centres times counts)
    const tz=p.top.map(a=>a[1]/T);const cz=p.tail.map(b=>(p.lo+(b[0]+0.5)*L.bw)/T);
    let m=Math.max(...tz,...cz),s=0;tz.forEach(z=>s+=Math.exp(z-m));p.tail.forEach((b,i)=>s+=b[1]*Math.exp(cz[i]-m));
    const lz=m+Math.log(s);const top=tz.map(z=>Math.exp(z-lz));
    let H=0;top.forEach(q=>{if(q>0)H-=q*Math.log2(q)});p.tail.forEach((b,i)=>{const q=Math.exp(cz[i]-lz);if(q>0)H-=b[1]*q*Math.log2(q)});
    const tailMass=1-top.reduce((a,b)=>a+b,0);
    return {top,H,tailMass};
  }
  function draw(){
    const T=Math.pow(2,+$('dkT').value),K=+$('dkK').value,p=P[cur];
    $('dkTv').textContent=T.toFixed(2);$('dkKv').textContent=K;
    $('dkPrompt').innerHTML='Prompt: <span class="mono">'+RD.esc(show(p.text))+'</span> → next token';
    const d=dist(p,T);
    let h='';for(let i=0;i<K;i++){const q=d.top[i];
      h+='<div class="dk-row"><span class="nm" title="'+RD.esc(show(p.top[i][0]))+'">'+RD.esc(show(p.top[i][0]))+'</span><span class="tr"><span class="f" style="width:'+(q*100).toFixed(2)+'%"></span>'+(i===0?'<span class="h" style="width:100%"></span>':'')+'</span><span class="v">'+(q>=0.001?PF.pct(q,1):q.toExponential(1))+'</span></div>'}
    $('dkBars').innerHTML=h;
    const r21=Math.exp((p.top[1][1]-p.top[0][1])/T);
    $('dkO').innerHTML=RD.stat('Top token, '+RD.esc(show(p.top[0][0])),PF.pct(d.top[0],1),'hard label: 100%')+
      RD.stat('Mass on every other token',PF.pct(1-d.top[0],1),'what a hard label throws away')+
      RD.stat('Second / first',r21>=0.01?r21.toFixed(3):r21.toExponential(1),'exp((z₂ − z₁) / T)')+
      RD.stat('Entropy',d.H.toFixed(2)+' bits','2^H = '+Math.pow(2,d.H).toFixed(1)+' tokens\' worth');
    $('dkNote').innerHTML='Logits from <a href="'+L.url+'" target="_blank" rel="noopener noreferrer">'+L.model+'</a> (vocabulary '+PF.comma(L.vocab)+'), plain-text prompt, float32 on CPU. The top 40 logits are exact; the other '+PF.comma(L.vocab-40)+' are kept as a histogram with '+L.bw+'-logit bins, which moves the softmax normaliser by at most '+p.err.toExponential(1)+' (measured for T from 0.25 to 10 in real_logits.py). Defaults reproduce the model\'s own probabilities by construction.';
  }
  $('dkT').addEventListener('input',draw);$('dkK').addEventListener('input',draw);
  RD.onRender(draw);draw();
})();
// ---- Reading, predict then reveal ----
(function(){
  document.querySelectorAll('.pred').forEach(pr=>{
    pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      if(pr.classList.contains('done'))return;pr.classList.add('done');
      pr.querySelectorAll('.opts button').forEach(x=>{if(x.dataset.right)x.classList.add('right');else if(x===b)x.classList.add('wrong')});
    }));
  });
})();
