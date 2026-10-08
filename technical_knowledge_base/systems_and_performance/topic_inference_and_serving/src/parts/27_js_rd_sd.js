// ---- Reading tab, section 6: speculative decoding, target alone against draft + verify (before/after animation) ----
(function(){
  const box=document.getElementById('rd-sd-svg');if(!box)return;
  const cap=document.getElementById('rd-sd-cap'),cnt=document.getElementById('rd-sd-cnt');
  const ANS=['The','KV','cache','holds','keys','and','values','for','every','past','token','.'];
  // illustrative passes: draft proposal, how many the target accepts, then the target's own token (null = end of answer)
  const P=[{d:['The','KV','cache','stores'],a:3,t:'holds'},{d:['keys','and','values','of'],a:3,t:'for'},{d:['all','past','tokens','.'],a:0,t:'every'},{d:['past','token','.','It'],a:3,t:null}];
  let mode='off';
  const chip=(w,c,st)=>'<span style="'+(c?'border-color:'+c+';color:'+c+';':'')+(st||'')+'">'+RD.esc(w)+'</span>';
  function lane(lbl,html){return '<div style="display:grid;grid-template-columns:7.2em minmax(0,1fr);gap:6px;align-items:start;margin:4px 0"><div class="small mute">'+lbl+'</div><div class="rd-chips">'+(html||'<span class="small mute" style="border:0;background:none">none</span>')+'</div></div>'}
  function draw(i){
    let out=0,tp=0,dp=0,prop='',t,p;
    if(mode==='off'){out=i;tp=i;
      t=i===0?'The target model alone':(i<12?'Target pass '+i:'Done: 12 passes for 12 tokens');
      p=i===0?'Every token costs one full pass of the big model: a full read of its weights.':(i<12?'One pass, one token: "'+ANS[i-1]+'".':'Twelve full reads of the weights. Switch to the draft to produce the same answer with fewer target passes.');
    }else{
      const k=Math.floor((i+1)/2),verify=i>0&&i%2===0;dp=4*k;tp=Math.floor(i/2);
      let done=0;for(let j=0;j<tp;j++)done+=P[j].a+(P[j].t?1:0);out=done;
      if(i===0){t='Draft k = 4, target verifies';p='A small draft model proposes 4 tokens at a time; the big model checks all 4 in one pass.'}
      else{const q=P[k-1];
        if(!verify){t='Pass '+k+': the draft proposes 4 tokens';p='Four cheap draft steps guess "'+q.d.join(' ')+'". Nothing is accepted yet.';
          prop=q.d.map(w=>chip(w,'var(--c4)')).join('')}
        else{t='Pass '+k+': the target checks all 4 at once';
          p='One target pass scores the 4 guesses together (a tiny prefill). It keeps '+q.a+(q.a===1?' guess':' guesses')+(q.a<4?', rejects the rest from the first mismatch':'')+(q.t?', and adds its own next token "'+q.t+'"':', and the answer ends')+'.'+(i===8?' 12 tokens from 4 target passes: 3 times fewer full reads of the big model, paid for with 16 draft steps and wider verification passes.':'');
          prop=q.d.map((w,j)=>chip(w,j<q.a?'var(--good)':'var(--bad)',j<q.a?'':'text-decoration:line-through;')).join('')+(q.t?chip(q.t,'var(--c1)','font-weight:600;'):'')}
      }
    }
    let html=lane('Answer so far',ANS.slice(0,out).map(w=>chip(w,'var(--c1)')).join(''));
    if(mode==='on')html+=lane('This pass',prop);
    const tb='<div class="rd-chips" style="margin-top:6px">'+Array.from({length:tp},()=>'<span style="background:var(--c1);color:var(--bg);border-color:var(--c1)">target</span>').join('')+Array.from({length:dp},()=>'<span style="opacity:.75">draft</span>').join('')+'</div>';
    box.innerHTML=html+lane('Passes run',tp+dp?tb:'');
    RDX.cap(cap,t,p);
    RDX.cnt(cnt,[['Tokens out',out+' / 12'],['Target passes',tp],['Draft passes',dp],['Tokens per target pass',tp?RDX.nf(out/tp,2):'0']]);
  }
  const A=RD.anim({card:'rd-sd-card',ctl:'rd-sd-ctl',n:13,draw,ms:1100,label:'Speculative decoding step'});
  RD.seg(document.getElementById('rd-sd-mode'),v=>{mode=v;A.reset(v==='off'?13:9);A.play()});
})();
