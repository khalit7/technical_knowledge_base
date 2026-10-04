// ---- Reading: one AIME 2025 problem, four real samples from nine models, graded three ways (before/after by scoring rule) ----
(function(){
  const card=document.getElementById('ai-card');if(!card||!window.MA)return;
  const comp=MA.comps.find(c=>c.k==='aime_2025');const PI=14; // problem 15 (AIME I, problem 15)
  const prob=comp.probs[PI];
  const SHOW=['gpt-4o','o1 (medium)','DeepSeek-R1','Claude-3.7-Sonnet (Think)','o3 (high)','o4-mini (high)','Grok 4','GPT-5 (high)','GPT-5.2 (high)'];
  const LBL={'gpt-4o':'GPT-4o','o1 (medium)':'o1 (medium)','DeepSeek-R1':'DeepSeek-R1','Claude-3.7-Sonnet (Think)':'Claude 3.7 Sonnet (thinking)','o3 (high)':'o3 (high)','o4-mini (high)':'o4-mini (high)','Grok 4':'Grok 4','GPT-5 (high)':'GPT-5 (high)','GPT-5.2 (high)':'GPT-5.2 (high)'};
  const models=SHOW.map(n=>comp.models.find(m=>m.n===n)).filter(Boolean);
  const S=models.map(m=>({m,st:MC.stats(m,comp.n)}));
  const rows=S.map(x=>x.st.D[PI]);
  let mode='p1',cur=0;
  // all samples to this problem, every model in the dataset
  const cnt={};let tot=0;comp.models.forEach(m=>MC.decode(m,comp.n)[PI].forEach(x=>{if(x!==null){cnt[x]=(cnt[x]||0)+1;tot++}}));
  const topWrong=Object.keys(cnt).filter(k=>k!=='0').sort((a,b)=>cnt[b]-cnt[a])[0];
  const ans=x=>x===null?'none':prob.d[x];
  function score(row){const v=row.filter(x=>x!==null),c=v.filter(x=>x===0).length;
    if(mode==='p1')return 100*c/row.length;if(mode==='maj')return 100*MC.majk(row,4);return 100*MC.passk(v.length,c,4)}
  const NAMES={p1:'one sample (pass@1)',maj:'vote of 4 (maj@4)',any:'any of 4 (pass@4)'};
  const CAP=[
    ()=>'AIME 2025 I, problem 15. Nine models from GPT-4o (2024) to GPT-5.2 (December 2025) each answered it four times under MathArena\'s fixed prompt. The answer is an integer from 0 to 999.',
    ()=>'The four parsed final answers of each model, in run order. Before grading, notice how often the same wrong number turns up.',
    ()=>'The key is 735 and grading is exact match on the integer: green right, purple wrong, "none" where no final answer was found. Only GPT-5 (high) and GPT-5.2 (high) ever get it right.',
    ()=>mode==='p1'?'Scored as one sample (the mean of the four): GPT-5 (high) gets 50%, everyone else below GPT-5.2 gets 0.':mode==='maj'?'Scored as a vote of four (the outlined cells win): GPT-5 (high) rises to 100% because 735 is its most common answer, but the shared wrong 147 wins the vote for o1, DeepSeek-R1 and Claude 3.7 Sonnet.':'Scored as any of four: right if any sample is right, which needs an oracle that knows the key. Same two models, now both at 100%.',
    ()=>'Over all 30 problems the same samples give three scores per model; the bold bar is the rule chosen above. Switch rules to see which models move.'];
  function draw(i){cur=i;
    document.getElementById('ai-prob').innerHTML='<span class="plab">AIME 2025 I, problem 15 (MathArena problem '+prob.i+')</span>'+prob.q+(i>=2?' <span class="gold">'+prob.d[0]+'</span>':'');
    let h='<div class="smp hd"><span>Model</span><span>run 1</span><span>run 2</span><span>run 3</span><span>run 4</span><span class="res">score</span></div>';
    S.forEach((x,j)=>{const row=rows[j],win=MC.winners(row);
      h+='<div class="smp"><span class="nm" title="'+RD.esc(x.m.n)+'">'+LBL[x.m.n]+'</span>';
      row.forEach(v=>{let cls='c';if(i<1)cls+=' hide';else if(i>=2)cls+=v===null?' na no':v===0?' ok':' no';
        if(i>=3&&mode==='maj'&&v!==null&&win.indexOf(v)>=0)cls+=' vote';
        h+='<span class="'+cls+'">'+(i<1?'?':ans(v))+'</span>'});
      h+='<span class="res">'+(i>=3?score(row).toFixed(0)+'%':'')+'</span></div>'});
    document.getElementById('ai-rows').innerHTML=h;
    document.getElementById('ai-cap').textContent='Step '+(i+1)+' of 5: '+CAP[i]();
    const shown=rows.reduce((a,r)=>a+r.filter(x=>x!==null).length,0),right=rows.reduce((a,r)=>a+r.filter(x=>x===0).length,0),w147=rows.reduce((a,r)=>a+r.filter(x=>String(x)===topWrong).length,0);
    const mean=i>=3?rows.reduce((a,r)=>a+score(r),0)/rows.length:null;
    document.getElementById('ai-cnt').innerHTML=RD.stat('Answers shown',i>=1?shown+' of 36':'0 of 36','"none" = no parsable answer')+
      RD.stat('Right',i>=2?right:'?','exact match with 735')+RD.stat('Most common wrong answer',i>=1?prob.d[+topWrong]+' (×'+w147+')':'?','here; '+cnt[topWrong]+' of all '+tot+' samples in the dataset')+
      RD.stat('Mean score on this problem',mean==null?'?':mean.toFixed(1)+'%',NAMES[mode]);
    const ex=document.getElementById('ai-exam');
    if(i<4){ex.innerHTML='';return}
    let b='<div class="bars">';
    S.forEach(x=>{const st=x.st,vals={p1:st.p1,maj:st.maj[3],any:st.pk[3]};
      b+='<div class="row hl"><span class="nm">'+LBL[x.m.n]+'</span><span class="track" style="height:21px">'+
        ['p1','maj','any'].map((k,q)=>'<span class="fill" style="top:'+(q*7)+'px;bottom:auto;height:6px;width:'+vals[k]+'%;background:'+(k==='p1'?'var(--c1)':k==='maj'?'var(--c2)':'var(--c3)')+';opacity:'+(k===mode||(mode==='any'&&k==='any')?1:.35)+'"></span>').join('')+
        '</span><span class="val">'+(mode==='p1'?vals.p1:mode==='maj'?vals.maj:vals.any).toFixed(1)+'%</span></div>'});
    b+='</div><p class="note"><span class="sw" style="background:var(--c1)"></span>one sample <span class="sw" style="background:var(--c2)"></span>vote of 4 <span class="sw" style="background:var(--c3)"></span>any of 4, all 30 problems of AIME 2025; value shown for the chosen rule.</p>';
    ex.innerHTML=b;
  }
  const an=RD.anim({card:'ai-card',ctl:'ai-ctl',n:5,draw,ms:3400,label:'AIME step'});
  RD.seg(document.getElementById('ai-mode'),m=>{mode=m;if(cur<3)an.go(3);else draw(cur)});
})();
