// ---- Reading section 8: summary table of the measured samples ----
(function(){
  const M=window.PC&&PC.measured,el=document.getElementById('pc-ms-tab');if(!M||!el)return;
  const esc=RD.esc,S=M.samples,pct=x=>(100*x).toFixed(1)+'%';
  el.innerHTML='<table><thead><tr><th>Sample</th><th class="num">Docs</th><th class="num">Median chars</th><th class="num">Chars per GPT-2 token</th><th>Top language</th><th class="num">Pass Gopher quality</th><th class="num">Mean edu score</th></tr></thead><tbody>'+
    M.order.map(k=>{const s=S[k],l=(s.lang_top||[])[0];return '<tr><td>'+esc(s.label)+'</td><td class="num">'+s.n.toLocaleString('en-US')+'</td><td class="num">'+s.chars.p50.toLocaleString('en-US')+'</td><td class="num">'+s.cpt.gpt2.toFixed(2)+'</td><td>'+(l?esc(l[0])+' '+pct(l[1]):'')+'</td><td class="num">'+pct(s.pass.gopher_quality)+'</td><td class="num">'+(s.edu?s.edu.mean.toFixed(2):'')+'</td></tr>'}).join('')+'</tbody></table>';
})();
// ---- Reading section 2: the same text counted with four tokenizers ----
(function(){
  const M=window.PC&&PC.measured,el=document.getElementById('pc-tok');if(!M||!el)return;
  const esc=RD.esc,S=M.samples,T=[['gpt2','GPT-2'],['neox','GPT-NeoX'],['olmo2','OLMo 2'],['qwen3','Qwen3']],COL=['var(--c1)','var(--c6)','var(--c3)','var(--c2)'];
  let mx=0;M.order.forEach(k=>T.forEach(([t])=>{mx=Math.max(mx,S[k].cpt[t])}));
  el.innerHTML='<div class="pc-leg">'+T.map((t,i)=>'<span><i style="background:'+COL[i]+'"></i>'+t[1]+'</span>').join('')+'</div>'+
    M.order.map(k=>'<div style="display:grid;grid-template-columns:minmax(0,11em) minmax(0,1fr);gap:8px;align-items:center;margin:5px 0;font-size:12.5px"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+esc(S[k].label)+'">'+esc(S[k].label)+'</span><span>'+T.map(([t],i)=>'<span style="display:flex;align-items:center;gap:4px;height:6px;margin:1px 0"><span style="height:5px;border-radius:2px;background:'+COL[i]+';width:'+(100*S[k].cpt[t]/mx).toFixed(1)+'%"></span><span style="font-size:10px;color:var(--mute);line-height:1">'+(i===0||i===3?S[k].cpt[t].toFixed(2):'')+'</span></span>').join('')+'</span></div>').join('');
  document.getElementById('pc-tok-cap').innerHTML='Characters per token, GPT-2 and Qwen3 values printed. Rows near equal (English web text) barely change with the tokenizer; French, code, maths, PDFs and the Pile\'s mixture change most. The {{Corpus comparer|#t-pccmp}} tab has the full table.';
  RD.tabLinks(document.getElementById('pc-tok-cap'));
})();
