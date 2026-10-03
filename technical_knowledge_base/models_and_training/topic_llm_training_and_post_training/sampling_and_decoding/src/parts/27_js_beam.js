// ---- Reading: greedy against beam search on the same GPT-2 prompt, real log-probabilities ----
(function(){
  const B=SD.BEAM,S=B.steps,G=B.greedy;
  const words=B.prompt.split(' ');const tail='… '+words.slice(-22).join(' ');
  // beams after each step: beams[s] = list of {toks, cum} in rank order (s = 0: just the prompt)
  const beams=[[{toks:[],cum:0}]];
  S.forEach((cands,s)=>{const prev=beams[s];const kept=cands.filter(c=>c.kept).sort((a,b)=>a.rank-b.rank);
    beams.push(kept.map(c=>({toks:prev[c.from].toks.concat([c.tok]),cum:c.cum,from:c.from})))});
  const st={m:'greedy'};
  const esc=RD.esc;
  const lp=v=>v.toFixed(2);
  function draw(i){
    document.getElementById('rd-bmCtx').textContent=tail;
    const L=document.getElementById('rd-bmL'),T=document.getElementById('rd-bmT');
    if(st.m==='greedy'){
      const toks=G.slice(0,i).map(g=>g.tok);
      L.innerHTML='<div class="ln"><span class="s">log p '+(i?lp(G[i-1].cum):'0.00')+'</span>'+esc(toks.slice(0,-1).join(''))+(i?'<span class="new">'+esc(toks[toks.length-1])+'</span>':'')+'</div>';
      if(i===0){T.innerHTML='<tr><td class="mute">Press play or step: at each step greedy scores the next tokens and takes the best one.</td></tr>'}
      else{const g=G[i-1];T.innerHTML='<tr><th>Step '+i+': next token</th><th class="num">log p</th><th></th></tr>'+g.alt.map((a,k)=>'<tr class="'+(k===0?'kept':'drop')+'"><td class="tkc"><span class="tk">'+SD.vis(a[0])+'</span></td><td class="num">'+lp(a[1])+'</td><td>'+(k===0?'taken':'never revisited')+'</td></tr>').join('')}
      const cap=i===0?['Greedy decoding','One hypothesis. Each step appends the single most probable token and never looks back.']:
        i===4?['Step 4: "very"','" very" ('+lp(G[3].lp)+') edges out " so" ('+lp(G[3].alt[1][1])+') by 0.02. Greedy commits; whatever follows must live with it.']:
        i===6?['Step 6: done','Six tokens, total log-probability '+lp(G[5].cum)+' (probability '+Math.exp(G[5].cum).toExponential(1)+'). Switch to beam search to see a more probable path greedy could not find.']:
        ['Step '+i+': "'+G[i-1].tok.trim()+'"','The best next token has log-probability '+lp(G[i-1].lp)+'; running total '+lp(G[i-1].cum)+'.'];
      document.getElementById('rd-bmTt').textContent=cap[0];document.getElementById('rd-bmP').textContent=cap[1];
      document.getElementById('rd-bmN').innerHTML=RD.stat('Hypotheses kept','1')+RD.stat('Candidates scored',String(i*3),'3 per step shown')+RD.stat('Total log p',i?lp(G[i-1].cum):'0.00');
    } else {
      const bs=beams[i];
      L.innerHTML=bs.map((b,k)=>'<div class="ln b'+k+'"><span class="s">beam '+(k+1)+' &middot; log p '+lp(b.cum)+'</span>'+esc(b.toks.slice(0,-1).join(''))+(i?'<span class="new">'+esc(b.toks[b.toks.length-1])+'</span>':'')+'</div>').join('');
      if(i===0){T.innerHTML='<tr><td class="mute">Press play or step: at each step every beam is extended by its 3 best tokens, the 9 candidates are ranked by total log-probability, and the best 3 survive.</td></tr>'}
      else{const prev=beams[i-1];const c=S[i-1].slice().sort((a,b)=>b.cum-a.cum);
        T.innerHTML='<tr><th>Beam</th><th>+ token</th><th class="num">step log p</th><th class="num">total</th><th></th></tr>'+c.map(x=>'<tr class="'+(x.kept?'kept':'drop')+'"><td>'+(x.from+1)+'</td><td class="tkc"><span class="tk">'+SD.vis(x.tok)+'</span></td><td class="num">'+lp(x.lp)+'</td><td class="num">'+lp(x.cum)+'</td><td>'+(x.kept?'kept, new beam '+(x.rank+1):'dropped')+'</td></tr>').join('')}
      const note={1:'The three best first tokens become the three beams.',2:'Every beam continues with " I"; the totals keep "and" well ahead.',3:'All three survivors extend beam 1 ("and I ..."): the "but" and "so" branches die out. Beam search often collapses to one prefix like this.',4:'Greedy\'s path "and I was very" scores '+lp(S[3].find(c=>c.tok===' very').cum)+' and is dropped: three other branches score higher. Greedy could not see this because "was" looked best one step earlier.',5:'"had no" followed by " idea" ('+lp(S[4].find(c=>c.tok===' idea').lp)+') overtakes the others: a weak step can pay off when the next token is near-certain.',6:'Best beam: "'+beams[6][0].toks.join('').trim()+'", total '+lp(beams[6][0].cum)+', against greedy\'s '+lp(G[5].cum)+': '+Math.exp(beams[6][0].cum-G[5].cum).toFixed(1)+' times more probable. More probable is not better text: see the 80-token runs below.'};
      document.getElementById('rd-bmTt').textContent=i===0?'Beam search, B = 3':'Step '+i;
      document.getElementById('rd-bmP').textContent=i===0?'Three hypotheses at once, ranked by the sum of their log-probabilities.':note[i];
      document.getElementById('rd-bmN').innerHTML=RD.stat('Hypotheses kept','3')+RD.stat('Candidates scored',String(i*9),'9 per step')+RD.stat('Best total log p',lp(bs[0].cum))+RD.stat('Greedy at this step',i?lp(G[i-1].cum):'0.00');
    }
  }
  const A=RD.anim({card:'rd-bm',ctl:'rd-bmC',n:S.length+1,draw,ms:2600,label:'Step'});
  const el=document.getElementById('rd-bmM');
  el.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));st.m=b.dataset.m;A.reset(S.length+1);A.play()}));
  const v=s=>esc(s).replace(/\n/g,' ↵ ');
  document.getElementById('rd-bmG').innerHTML=v(B.long.greedy);
  document.getElementById('rd-bmB').innerHTML=v(B.long.beam4);
  document.getElementById('rd-bmS').innerHTML=v(B.long.p95);
})();
