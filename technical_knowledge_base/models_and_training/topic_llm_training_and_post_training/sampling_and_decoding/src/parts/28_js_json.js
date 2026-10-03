// ---- Reading: unconstrained against grammar-constrained decoding, real Qwen2.5-0.5B-Instruct steps ----
(function(){
  const J=SD.JSONC,V=J.vocab;
  const st={m:'free'};
  const steps=()=>st.m==='free'?J.free_steps:J.steps;
  const esc=RD.esc;
  function parse(s){try{JSON.parse(s);return true}catch(e){return false}}
  function draw(i){
    const S=steps(),s=S[i];
    const out=s.prefix,pick=s.pick==='<end>'?'':s.pick;
    document.getElementById('rd-jsCtx').innerHTML='<span class="q">User: '+esc(J.request)+'</span>\nAssistant: '+esc(out)+'<span class="nw">'+(s.pick==='<end>'?'[end]':esc(pick)||' ')+'</span>';
    const mx=Math.max(...s.top.map(t=>t.p));
    let h='<div class="hd">token</div><div class="hd">model probability'+(st.m==='con'?' (masked tokens struck)':'')+'</div><div class="hd v">p</div>';
    s.top.forEach(t=>{
      const masked=st.m==='con'&&!t.ok, isPick=t.t===s.pick;
      const mark=s.valid===false&&st.m==='free'?'':(t.ok?' ✓':' ✗');
      h+='<div class="nm'+(masked?' cut':'')+(isPick?' pick':'')+'"><span class="tk">'+SD.vis(t.t)+'</span>'+(st.m==='free'&&s.valid===false?'':'<span class="small" style="color:var('+(t.ok?'--good':'--bad')+')">'+mark+'</span>')+'</div><div class="tr"><div class="g" style="width:'+(t.p*100).toFixed(1)+'%"></div><div class="f" style="width:'+(masked?0:t.p*100).toFixed(1)+'%"></div>'+(masked?'<span class="x">masked</span>':'')+'</div><div class="v">'+SD.fmtP(t.p)+'</div>';
    });
    document.getElementById('rd-jsL').innerHTML=h;
    const last=i===S.length-1;
    let t,p;
    if(st.m==='free'){
      if(i===0){t='Step 0: the model\'s favourite is a Markdown fence';p='Unconstrained greedy takes "```" at '+SD.fmtP(s.pick_p)+'. A JSON grammar would allow only '+s.n_allowed+' of '+SD.fmtN(V)+' tokens here, holding '+SD.fmtP(s.mass_allowed)+' of the mass. From this token on, no continuation can be a bare JSON object.'}
      else if(last){t='Step '+i+': end';p='The output above looks right to a person, but JSON.parse '+(parse(out)?'accepts':'rejects')+' it: the fences around the object are not JSON. A strict parser downstream fails; a lenient one has to strip them.'}
      else{t='Step '+i+': '+SD.vis(s.pick);p='The model follows its own habit (Markdown fences, two-space indentation) at '+SD.fmtP(s.pick_p)+'. The output already broke the grammar at step 0, so the ticks no longer apply.'}
    } else {
      if(i===0){t='Step 0: mask, then choose';p='Only '+s.n_allowed+' tokens can start the object; they hold '+SD.fmtP(s.mass_allowed)+' of the model\'s probability. The mask removes "```" ('+SD.fmtP(s.top[0].p)+') and greedy takes the best allowed token, "'+SD.vis(s.pick)+'", the model\'s rank '+s.pick_rank+'.'}
      else if(s.mass_allowed<0.05&&!last){t='Step '+i+': the grammar overrules the model';p='The model wants "'+SD.vis(s.top[0].t)+'" ('+SD.fmtP(s.top[0].p)+') to indent by two spaces; the toy grammar allows at most two whitespace characters in a row and "↵␣" already used them. Allowed tokens hold '+SD.fmtP(s.mass_allowed)+'; the pick "'+SD.vis(s.pick)+'" had '+(s.pick_p<0.001?(s.pick_p*100).toFixed(4)+'%':SD.fmtP(s.pick_p))+'. A whitespace rule decided the tokenisation.'}
      else if(s.n_allowed>1000){t='Step '+i+': inside a string';p='Within the name almost anything is allowed ('+SD.fmtN(s.n_allowed)+' tokens); the model writes "'+SD.vis(s.pick)+'" at '+SD.fmtP(s.pick_p)+'. The mask costs nothing here.'}
      else if(last){t='Step '+i+': end';p='The grammar allows the end token only once the object is complete. The output above: JSON.parse '+(parse(out)?'accepts it':'rejects it')+'. Same model, same weights; only the mask differed.'}
      else{t='Step '+i+': '+SD.vis(s.pick);p=s.n_allowed+' tokens allowed, holding '+SD.fmtP(s.mass_allowed)+' of the probability; the pick had '+SD.fmtP(s.pick_p)+'.'}
    }
    document.getElementById('rd-jsTt').textContent=t;document.getElementById('rd-jsP').textContent=p;
    document.getElementById('rd-jsN').innerHTML=RD.stat('Allowed tokens',st.m==='free'&&s.valid===false?'n/a':SD.fmtN(s.n_allowed),'of '+SD.fmtN(V))+
      RD.stat('Probability on allowed',st.m==='free'&&s.valid===false?'n/a':SD.fmtP(s.mass_allowed),'model\'s own mass')+
      RD.stat('Picked token',SD.fmtP(s.pick_p),'rank '+s.pick_rank)+
      RD.stat('Tokens so far',String(i),last?(parse(out)?'valid JSON':'not JSON'):'');
  }
  const A=RD.anim({card:'rd-js',ctl:'rd-jsC',n:J.free_steps.length,draw,ms:1700,label:'Step'});
  const el=document.getElementById('rd-jsM');
  el.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));st.m=b.dataset.m;A.reset(steps().length);A.play()}));
})();
