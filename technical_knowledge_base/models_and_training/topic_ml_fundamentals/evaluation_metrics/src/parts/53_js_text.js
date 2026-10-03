// ---- Text metrics lab (ids tx-) ----
(function(){
  const $=id=>document.getElementById(id),F=RD.f,esc=RD.esc;if(!$('t-text'))return;
  const T=EM.text;$('tx-R').value=T.ref;$('tx-C').value=T.cands.find(c=>c.key==='para').text;
  $('tx-P').innerHTML=T.cands.map(c=>'<button data-k="'+c.key+'">'+esc(c.label)+'</button>').join('');
  function live(){const R=$('tx-R').value,C=$('tx-C').value;
    if(!R.trim()||!C.trim()){$('tx-O').innerHTML='<p class="small mute">Type a reference and a candidate.</p>';$('tx-W').innerHTML='';return}
    const b=MX.bleu(C,R),ch=MX.chrf(C,R),r1=MX.rougeN(C,R,1),r2=MX.rougeN(C,R,2),rl=MX.rougeL(C,R),rs=MX.rougeS(C,R),me=MX.meteor(C,R);
    const pre=T.cands.find(c=>c.text===C.trim())&&R.trim()===T.ref?T.cands.find(c=>c.text===C.trim()):null;
    const rowsH=[['BLEU',F(b.score,1)+' / 100','p1 to p4: '+b.prec.map(v=>F(v,1)).join(', ')+'%; BP '+F(b.bp,3)+' (candidate '+b.h.length+', reference '+b.r.length+' tokens)'],
      ['chrF',F(ch.score,1)+' / 100','mean character n-gram precision '+F(ch.ap,3)+', recall '+F(ch.ar,3)+' over orders 1 to 6; &beta; = 2'],
      ['ROUGE-1',F(r1.f,3),'P '+F(r1.p,3)+', R '+F(r1.r,3)+' ('+r1.m+' shared words)'],
      ['ROUGE-2',F(r2.f,3),'P '+F(r2.p,3)+', R '+F(r2.r,3)+' ('+r2.m+' shared bigrams)'],
      ['ROUGE-L',F(rl.f,3),'P '+F(rl.p,3)+', R '+F(rl.r,3)+'; LCS "'+esc(rl.pairs.map(([i])=>rl.ht[i]).join(' '))+'"'],
      ['ROUGE-S*',F(rs.f,3),'skip-bigrams, any gap: '+rs.m+' shared; P '+F(rs.p,3)+', R '+F(rs.r,3)+' <i class="nl u">from the paper, no library check</i>'],
      ['METEOR',F(me.score,3),me.m+' aligned words ('+me.matches.filter(x=>x[2]==='stem').length+' by stem), '+me.chunks+' chunk'+(me.chunks===1?'':'s')+'; F<sub>mean</sub> '+F(me.fmean,3)+', penalty '+F(me.pen,3)+(pre?'; with WordNet (NLTK): '+F(pre.lib.metwn,3):'')],
      ['BERTScore F1',pre?F(pre.bs.F,3)+' raw, '+F(pre.bs.Fr,3)+' rescaled':'<span class="mute">presets only</span>',pre?'P '+F(pre.bs.P,3)+', R '+F(pre.bs.R,3)+' (roberta-large, layer 17)':'needs a 355M-parameter encoder; pick a preset with the original reference']];
    $('tx-O').innerHTML='<table class="mt"><thead><tr><th>Metric</th><th class="num">Score</th><th>What it counted</th></tr></thead><tbody>'+rowsH.map(r=>'<tr><td>'+r[0]+'</td><td class="num">'+r[1]+'</td><td class="small">'+r[2]+'</td></tr>').join('')+'</tbody></table>';
    // word view: which candidate words count for BLEU unigrams and for METEOR
    const cls=b.h.map(()=>'');const rc=new Map();b.r.forEach(w=>rc.set(w,(rc.get(w)||0)+1));b.h.forEach((w,i)=>{if(rc.get(w)>0){cls[i]='m1';rc.set(w,rc.get(w)-1)}});
    const mc=me.H.map(()=>'off');me.matches.forEach(([i,,tag])=>{mc[i]=tag==='exact'?'m1':'m2'});
    $('tx-W').innerHTML='<div class="ph">Candidate tokens credited by BLEU\'s unigram precision (blue)</div><div class="toks">'+b.h.map((w,i)=>'<span class="'+cls[i]+'">'+esc(w)+'</span>').join('')+'</div><div class="ph">Aligned by METEOR (blue exact, green stem; faded: unaligned)</div><div class="toks">'+me.H.map((w,i)=>'<span class="'+mc[i]+'">'+esc(w)+'</span>').join('')+'</div>'}
  function all(){const cols=[['BLEU',c=>c.lib.bleu,1,100],['chrF',c=>c.lib.chrf,1,100],['ROUGE-1',c=>c.lib.r1,3,1],['ROUGE-2',c=>c.lib.r2,3,1],['ROUGE-L',c=>c.lib.rl,3,1],['METEOR',c=>c.lib.met,3,1],['METEOR + WordNet',c=>c.lib.metwn,3,1],['BERTScore F1',c=>c.bs.F,3,1],['BERTScore rescaled',c=>c.bs.Fr,3,1]];
    let h='<table class="mt"><thead><tr><th>Candidate</th>'+cols.map(c=>'<th class="num">'+c[0]+'</th>').join('')+'</tr></thead><tbody>';
    T.cands.forEach(c=>{h+='<tr><td title="'+esc(c.text)+'">'+esc(c.label)+'<div class="small mute" style="font-weight:400">'+esc(c.text)+'</div></td>';
      cols.forEach(([n,f,dp,sc])=>{const vals=T.cands.filter(x=>x.key!=='copy').map(f),mn=Math.min(...vals),mx=Math.max(...vals),v=f(c),a=c.key==='copy'?0:(v-mn)/(mx-mn||1);
        h+='<td class="num" style="background:color-mix(in srgb,var(--c1) '+(c.key==='copy'?0:Math.round(8+50*a))+'%,transparent)">'+F(v,dp)+'</td>'});h+='</tr>'});
    $('tx-A').innerHTML=h+'</tbody></table>'}
  $('tx-P').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;$('tx-R').value=T.ref;$('tx-C').value=T.cands.find(c=>c.key===b.dataset.k).text;live()});
  let t;['tx-R','tx-C'].forEach(id=>$(id).addEventListener('input',()=>{clearTimeout(t);t=setTimeout(live,120)}));
  live();all();
})();
