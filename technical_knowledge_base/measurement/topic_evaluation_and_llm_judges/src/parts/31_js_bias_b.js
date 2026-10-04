// ---- Judge bias lab (t-bias), part b: measured bias rates (one panel per study) and mitigations before and after ----
(function(){
  const {esc,nm,link,onRender}=JB;
  let done=false,cur='pos';
  onRender(function(){ if(done)return; done=true;
    document.querySelectorAll('#jb-seg button').forEach(b=>b.addEventListener('click',()=>{cur=b.dataset.k;
      document.querySelectorAll('#jb-seg button').forEach(x=>x.classList.toggle('on',x===b));rates()}));
    rates();mitig();
  });
  const COL={c:'var(--c3)',f:'var(--c1)',s:'var(--c2)',e:'var(--dim)'};
  const leg=items=>'<div class="jb-leg">'+items.map(([c,t])=>'<span><i style="background:'+c+'"></i>'+t+'</span>').join('')+'</div>';
  const f1=x=>(+x).toFixed(1);
  function panel(title,src,where,setup,body,tag){
    return '<div class="jb-panel"><h4>'+title+(tag?' <span class="tag">'+tag+'</span>':'')+'</h4><p class="src">'+link(src,where)+(setup?'. '+esc(setup.charAt(0).toUpperCase()+setup.slice(1)):'')+'</p>'+body+'</div>';
  }
  function stack(rows,withSplit){
    return rows.map(r=>{const seg=withSplit?[['c',r.c],['f',r.f],['s',r.s],['e',r.e||0]]:[['c',r.c]];
      const tip=withSplit?nm(r.j)+': consistent '+f1(r.c)+'%, first position '+f1(r.f)+'%, second position '+f1(r.s)+'%'+(r.e?', error '+f1(r.e)+'%':''):nm(r.j)+': '+f1(r.c)+'%';
      return '<div class="jb-stk" title="'+esc(tip)+'"><span class="nm">'+esc(nm(r.j))+'</span><span class="bar">'+seg.map(([k,v])=>'<span style="width:'+v+'%;background:'+COL[k]+'"></span>').join('')+'</span><span class="v">'+(r.dp===0?Math.round(r.c):f1(r.c))+'%</span></div>'}).join('');
  }
  function bars(rows,max,col,fmt,ref){
    return rows.map(r=>'<div class="jb-stk"><span class="nm" title="'+esc(r.l)+'">'+esc(r.l)+'</span><span class="bar" style="position:relative"><span style="width:'+(100*r.v/max).toFixed(1)+'%;background:'+(r.col||col)+'"></span>'+
      (ref!=null?'<b style="position:absolute;left:'+(100*ref/max)+'%;top:-2px;bottom:-2px;width:2px;background:var(--ink)"></b>':'')+'</span><span class="v">'+fmt(r.v)+'</span></div>').join('');
  }
  function rates(){
    const D=JB_DATA,box=document.getElementById('jb-rates');let h='';
    if(cur==='pos'){
      h+='<p class="small"><b>Position consistency</b>: the share of pairs that get the same winner in both orders. The rest split into the judge leaning to whichever answer came first or second.</p>'+leg([[COL.c,'same winner both orders'],[COL.f,'leaned to the first position'],[COL.s,'leaned to the second position'],[COL.e,'unparseable output']]);
      D.pos.forEach(p=>{const split=p.rows[0].f!=null;
        h+=panel(p.kind==='pub'?esc(p.src.cite.split(',')[0]):'Recount: '+esc(p.src.cite),p.src,p.where,p.setup,stack(p.rows,split),p.kind==='pub'?'published':'recount from released verdicts')});
      const W=D.wang;
      h+=panel(esc(W.src.cite.split(',')[0]),W.src,W.where,'Vicuna questions; win rate of Vicuna-13B when shown first and when shown second; conflict rate = share of the 80 questions whose verdict changes with the order (a different metric from consistency above, so shown as a table)',
        '<div class="tw"><table><thead><tr><th>Judge</th><th>Pair</th><th class="num">Win rate shown first</th><th class="num">shown second</th><th class="num">Conflict</th></tr></thead><tbody>'+
        W.rows.map(r=>'<tr><td>'+r.j+'</td><td>'+esc(r.pair)+'</td><td class="num">'+f1(r.w1)+'%</td><td class="num">'+f1(r.w2)+'%</td><td class="num">'+esc(r.conflict)+'</td></tr>').join('')+'</tbody></table></div>','published');
      h+='<p class="small">Why the same judge differs between panels: consistency depends on how close the two answers are (Shi et al. find a larger quality gap gives higher consistency). Zheng et al.&rsquo;s Table 2 used two samples of the same model, the hardest case (GPT-4 65.0%); the MT-Bench leaderboard file pits 30 models of very mixed strength against one baseline (83.6%).</p>';
    } else if(cur==='len'){
      const Z=D.length.zheng,A=D.length.alpaca;
      h+=panel(esc(Z.src.cite.split(',')[0]),Z.src,Z.where,'GPT-4 rephrased each numbered list and prepended the copy, adding no information',bars(Z.rows.map(r=>({l:r.j,v:r.v})),100,'var(--bad)',v=>f1(v)+'%'),'published');
      h+=panel('AlpacaEval 2: same model asked to be concise or verbose',A.src,A.where,"judge GPT-4 Turbo (1106), baseline the same model's default answers",
        '<p class="small">Raw win rate against the baseline (judge&rsquo;s preference averaged over 805 instructions), then the length-controlled (LC) win rate.</p>'+
        bars([{l:'Concise, raw',v:A.concise.raw,col:'var(--c2)'},{l:'Verbose, raw',v:A.verbose.raw,col:'var(--c2)'},{l:'Concise, LC',v:A.concise.lc,col:'var(--c3)'},{l:'Verbose, LC',v:A.verbose.lc,col:'var(--c3)'}],100,null,v=>f1(v)+'%',50)+
        '<p class="small mute">Line at 50%: a tie with the baseline. Mean lengths: concise '+A.concise.chars+', verbose '+A.verbose.chars+', baseline '+A.baseline_chars+' characters.</p>','recount and published');
      h+='<p class="small">Length is the bias with the most public data because preference leaderboards correct for it. How LMArena and AlpacaEval control for style, and what that does to rankings, is on {{Human preference and arenas|n:3ef5c17b0d0d814db49ff3b5c9fc3034}}.</p>';
    } else {
      const SP=D.selfp;
      h+='<p class="small"><b>Own-family preference</b> is the hardest bias to measure: a judge may rate its own family higher because those answers really are better. Each study controls for that differently, and none of the three metrics below can share an axis.</p>';
      const mt=SP.mt.rows;
      h+=panel('Recount: MT-Bench, GPT-4 judge against experts',SP.mt.src,'',SP.mt.where,
        leg([['var(--c1)','experts'],['var(--c2)','GPT-4 judge']])+mt.map(r=>'<div class="jb-stk"><span class="nm">'+esc(nm(r.m))+'</span><span>'+
          '<span class="bar" style="height:7px;margin-bottom:2px"><span style="width:'+r.human+'%;background:var(--c1)"></span></span><span class="bar" style="height:7px"><span style="width:'+r.gpt4+'%;background:var(--c2)"></span></span></span><span class="v" style="font-size:11.5px;line-height:1.2">'+f1(r.human)+'<br>'+f1(r.gpt4)+'</span></div>').join('')+
        '<p class="small">GPT-4&rsquo;s own answers: '+f1(mt[0].human)+'% with experts, '+f1(mt[0].gpt4)+'% with GPT-4 judging ('+f1(mt[0].gpt4-mt[0].human)+' points). It also lifts Claude-v1 by '+f1(mt[1].gpt4-mt[1].human)+' points, and the judged verdicts are swap-checked (disagreements count as ties and drop out), which favours clear winners. The paper&rsquo;s own reading: &ldquo;'+esc(SP.zheng.quote)+'&rdquo; ('+link(SP.zheng.src,SP.zheng.where)+').</p>','recount from released verdicts');
      h+=panel(esc(SP.pan.src.cite.split(',')[0]),SP.pan.src,SP.pan.where,'',
        bars(SP.pan.rows.flatMap(r=>[{l:r.j+', XSUM',v:r.xsum,col:'var(--c4)'},{l:r.j+', CNN',v:r.cnn,col:'var(--c6)'}]),1,null,v=>v.toFixed(3),0.5)+
        '<p class="small mute">Line at 0.5: no preference. The study had no human quality ratings, so a score above 0.5 can also mean the judge&rsquo;s own summaries are better; its causal evidence is that fine-tuning for self-recognition raised self-preference linearly.</p>','published');
      const A=SP.ah;
      let t='<div class="tw"><table class="jb-hm"><thead><tr><th style="text-align:left">Judge \\ model</th>'+A.models.map(m=>'<th>'+esc(nm(m))+'</th>').join('')+'<th>Own family</th><th>Others</th></tr></thead><tbody>';
      A.rows.forEach(r=>{t+='<tr><th style="text-align:left">'+esc(nm(r.j))+'</th>'+A.models.map(m=>{const c=r.cells.find(x=>x.m===m);const a=Math.min(1,Math.abs(c.d)/12);
        const bg=c.d>0?'rgba(194,112,58,'+(0.12+0.6*a).toFixed(2)+')':'rgba(47,111,181,'+(0.12+0.6*a).toFixed(2)+')';
        return '<td class="'+(c.fam===r.fam?'own':'')+'" style="background:'+bg+'" title="'+esc(nm(r.j)+' gives '+nm(m)+' '+c.own+'%, the other four average '+c.oth+'%')+'">'+(c.d>0?'+':'')+f1(c.d)+'</td>'}).join('')+
        '<td><b>'+(r.same==null?'none judged':(r.same>0?'+':'')+f1(r.same))+'</b></td><td>'+(r.other>0?'+':'')+f1(r.other)+'</td></tr>'});
      t+='</tbody></table></div>';
      h+=panel('Recount: Arena-Hard, five judges on the same answers',A.src,'',A.where,t+
        '<p class="small">Cells: points of win rate against GPT-4 (0314) (ties count half, both orders), this judge minus the mean of the other four; outlined cells are the judge&rsquo;s own family. GPT-4 Turbo is the clearest case: OpenAI models +'+f1(A.rows.find(r=>r.j==='gpt-4-1106-preview').same)+', the rest '+f1(A.rows.find(r=>r.j==='gpt-4-1106-preview').other)+'. Confounds: the baseline is itself an OpenAI model, and the other four judges are not a neutral reference.</p>','recount from released verdicts');
    }
    box.innerHTML=h;
  }
  function mitig(){
    const M=JB_DATA.mitig;
    document.getElementById('jb-mit').innerHTML=M.map(r=>{
      const max=r.unit==='kappa'?1:r.unit==='failures of 20'?20:(r.unit==='points of win rate'?50:100);
      const xb=100*r.before/max,xa=100*r.after/max,lo=Math.min(xb,xa),hi=Math.max(xb,xa);
      const good=(r.better==='up')===(r.after>r.before);
      const fmt=v=>r.unit==='kappa'?v.toFixed(3):r.unit==='failures of 20'?String(v):f1(v);
      return '<div class="jb-mrow"><div class="h"><b>'+esc(r.t)+'</b>: '+esc(r.what)+'</div>'+
        '<div style="position:relative;height:26px;margin:6px 6px 0"><div style="position:absolute;left:0;right:0;top:11px;height:4px;background:var(--soft);border-radius:2px"></div>'+
        '<div style="position:absolute;left:'+lo+'%;width:'+(hi-lo)+'%;top:11px;height:4px;background:'+(good?'var(--good)':'var(--bad)')+'"></div>'+
        '<div title="before" style="position:absolute;left:'+xb+'%;top:5px;width:14px;height:14px;margin-left:-7px;border-radius:50%;background:var(--bg);border:2px solid var(--mute)"></div>'+
        '<div title="after" style="position:absolute;left:'+xa+'%;top:5px;width:14px;height:14px;margin-left:-7px;border-radius:50%;background:var(--good)"></div></div>'+
        '<div class="s">Before <b>'+fmt(r.before)+'</b> &rarr; after <b>'+fmt(r.after)+'</b> '+esc(r.unit)+' (scale 0 to '+max+'; '+(r.better==='up'?'higher':'lower')+' is better). '+link(r.src,r.where)+'.</div></div>'}).join('');
  }
})();
