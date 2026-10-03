// ---- Tab: Vocabulary size (timeline, embedding share, calculator, tokens saved) ----
(function(){
  const {esc,fmt,TK,SHORT,LAB}=TKV,V=TD.voc,$=id=>document.getElementById(id);
  const FAMC={OpenAI:'var(--c2)','GPT-2':'var(--c2)','gpt-oss':'var(--c2)',Llama:'var(--c1)',Gemma:'var(--c3)',Qwen:'var(--c4)',DeepSeek:'var(--c6)',Mistral:'var(--c5)',Kimi:'var(--ib)'};
  const famc=f=>FAMC[f]||'var(--mute)';
  const fam=f=>FAMC[f]?(f==='GPT-2'||f==='gpt-oss'?'OpenAI':f):'Other';
  let sel=V.findIndex(r=>r.m.startsWith('Qwen3.5-9B'));
  const t0=Date.UTC(2018,6,1),t1=Date.UTC(2026,11,1),ts=d=>Date.UTC(+d.slice(0,4),+d.slice(5,7)-1,+d.slice(8,10));
  const ex=n=>n>=1e9?(n/1e9).toFixed(n>=1e11?0:1)+'B':(n/1e6).toFixed(1)+'M';
  function drawT(){const el=$('vtPlot'),W=RD.width(el),H=Math.round(Math.min(360,Math.max(240,W*0.5))),ml=46,mr=10,mt=10,mb=26;
    const x=t=>ml+(W-ml-mr)*(t-t0)/(t1-t0),ly=v=>Math.log(v),y=v=>mt+(H-mt-mb)*(1-(ly(v)-ly(25000))/(ly(300000)-ly(25000)));
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Vocabulary size by date">';
    [32000,50000,100000,128000,200000,256000].forEach(v=>{s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/><text x="'+(ml-4)+'" y="'+(y(v)+4)+'" text-anchor="end" font-size="10.5" fill="var(--mute)">'+(v/1000)+'K</text>'});
    for(let yr=2019;yr<=2026;yr++){const xx=x(Date.UTC(yr,0,1));s+='<line x1="'+xx+'" x2="'+xx+'" y1="'+mt+'" y2="'+(H-mb)+'" stroke="var(--line)"/><text x="'+xx+'" y="'+(H-8)+'" text-anchor="middle" font-size="10.5" fill="var(--mute)">'+(W<420&&yr%2?'':yr)+'</text>'}
    V.forEach((r,i)=>{const cx=x(ts(r.date)),cy=y(r.V),on=i===sel;
      s+='<circle data-i="'+i+'" cx="'+cx.toFixed(1)+'" cy="'+cy.toFixed(1)+'" r="'+(on?7:5)+'" fill="'+famc(r.fam)+'" fill-opacity="'+(r.P==null&&r.d==null?0.25:0.85)+'" stroke="'+(on?'var(--ink)':famc(r.fam))+'" stroke-width="'+(on?2:1.2)+'" style="cursor:pointer"><title>'+esc(r.m)+': '+fmt(r.V)+'</title></circle>'});
    const r=V[sel];if(r){const cx=x(ts(r.date)),cy=y(r.V),lab=r.m+' '+fmt(r.V);const right=cx<W*0.62;
      s+='<text x="'+(right?cx+10:cx-10)+'" y="'+(cy-9)+'" text-anchor="'+(right?'start':'end')+'" font-size="11.5" font-weight="600">'+esc(lab)+'</text>'}
    el.innerHTML=s+'</svg>';
    $('vtLeg').innerHTML=['OpenAI','Llama','Gemma','Qwen','DeepSeek','Mistral','Kimi','Other'].map(f=>'<span><i style="display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:4px;background:'+({OpenAI:'var(--c2)',Other:'var(--mute)'}[f]||famc(f))+'"></i>'+f+'</span>').join('')+'<span class="mute">pale: closed (no config)</span>';
    drawD()}
  function drawD(){const r=V[sel];if(!r)return;const emb=r.d?r.V*r.d*(r.tie?1:2):null;
    $('vtCardD').innerHTML='<h3>'+esc(r.m)+'</h3><dl class="kv"><dt>Vocabulary</dt><dd>'+fmt(r.V)+'</dd><dt>Tokenizer</dt><dd>'+esc(r.alg)+'</dd><dt>Date</dt><dd>'+r.date+(r.dsrc?' (<a href="'+r.dsrc+'" target="_blank" rel="noopener noreferrer">source</a>)':' (repository created)')+'</dd>'+
      (r.d?'<dt>Hidden width</dt><dd>'+fmt(r.d)+'</dd><dt>Embeddings tied</dt><dd>'+(r.tie?'yes':'no')+'</dd><dt>Embedding parameters</dt><dd>'+fmt(r.V)+' × '+fmt(r.d)+(r.tie?'':' × 2')+' = '+ex(emb)+'</dd>':'')+
      (r.P?'<dt>All parameters</dt><dd>'+ex(r.P)+' ('+(100*emb/r.P).toFixed(1)+'% embeddings)</dd>':'')+
      (r.repo?'<dt>Config</dt><dd><a href="https://huggingface.co/'+r.repo+'/blob/main/config.json" target="_blank" rel="noopener noreferrer">'+esc(r.repo)+'</a></dd>':'')+'</dl>'}
  $('vtPlot').addEventListener('click',e=>{const c=e.target.closest('circle');if(!c)return;sel=+c.dataset.i;drawT();hiRow()});
  $('vtTab').innerHTML='<table class="wide"><thead><tr><th>Model</th><th>Date</th><th class="num">Vocabulary</th><th>Tokenizer</th><th>Source</th></tr></thead><tbody>'+V.map((r,i)=>'<tr data-i="'+i+'" style="cursor:pointer"><td>'+esc(r.m)+'</td><td>'+r.date+'</td><td class="num">'+fmt(r.V)+'</td><td>'+esc(r.alg)+'</td><td>'+(r.repo?'<a href="https://huggingface.co/'+r.repo+'/blob/main/config.json" target="_blank" rel="noopener noreferrer">config</a>':'')+(r.dsrc?(r.repo?', ':'')+'<a href="'+r.dsrc+'" target="_blank" rel="noopener noreferrer">date</a>':'')+'</td></tr>').join('')+'</tbody></table>';
  $('vtTab').addEventListener('click',e=>{const tr=e.target.closest('tr[data-i]');if(!tr||e.target.closest('a'))return;sel=+tr.dataset.i;drawT();hiRow()});
  function hiRow(){$('vtTab').querySelectorAll('tr[data-i]').forEach(t=>t.style.background=+t.dataset.i===sel?'var(--hl)':'')}

  // embedding share
  const E=V.filter(r=>r.P&&r.d).map(r=>({m:r.m,fam:r.fam,P:r.P,e:r.V*r.d*(r.tie?1:2),tie:r.tie})).sort((a,b)=>a.P-b.P);
  $('veBars').innerHTML='<div class="bars">'+E.map(r=>'<div class="row'+(r.m==='Gemma 3 270M'?' hl':'')+'"><span class="nm" title="'+esc(r.m)+'">'+esc(r.m)+' <span class="mute">'+ex(r.P)+'</span></span><span class="track"><span class="fill" style="width:'+(100*r.e/r.P).toFixed(1)+'%;background:'+famc(r.fam)+'"></span></span><span class="val">'+(100*r.e/r.P).toFixed(1)+'%</span></div>').join('')+'</div>';

  // calculator: vocabulary slider on a log scale from 16K to 300K
  const vOf=p=>Math.round(Math.exp(Math.log(16000)+(Math.log(300000)-Math.log(16000))*p/100));
  const pOf=v=>Math.round(100*(Math.log(v)-Math.log(16000))/(Math.log(300000)-Math.log(16000)));
  let Vc=262144;$('vcV').value=pOf(Vc);
  function calc(fromSlider){if(fromSlider)Vc=vOf(+$('vcV').value);const d=+$('vcD').value,R=Math.max(0,+$('vcR').value||0)*1e6,t=$('vcT').checked;
    const e=Vc*d*(t?1:2),tot=e+R;$('vcVv').textContent=fmt(Vc);
    $('vcOut').innerHTML=RD.stat('Embedding parameters',ex(e),fmt(Vc)+' × '+d+(t?'':' × 2'))+RD.stat('Whole model',ex(tot))+RD.stat('Share in embeddings',(100*e/tot).toFixed(1)+'%')+
      RD.stat('Bytes for the table in BF16',ex(2*e).replace('B',' GB').replace('M',' MB'),'2 bytes per parameter')}
  $('vcV').addEventListener('input',()=>calc(true));['vcD','vcR','vcT'].forEach(id=>$(id).addEventListener('input',()=>calc(false)));
  calc(false);

  // tokens saved
  const FL=TD.fl,ix=Object.fromEntries(TK.map((k,i)=>[k,4+i])),nV=Object.fromEntries(TD.tok.map(t=>[t.k,t.n]));
  $('vsL').innerHTML='<option value="all">All 204 languages</option><option value="noeng">All except English</option>'+FL.map(r=>'<option value="'+r[0]+'"'+(r[0]==='eng_Latn'?'':'')+'>'+esc(r[1])+'</option>').join('');
  function drawS(){const el=$('vsPlot'),W=RD.width(el),H=Math.round(Math.min(320,Math.max(230,W*0.45))),ml=42,mr=12,mt=12,mb=30,L=$('vsL').value;
    const tot=k=>L==='all'?FL.reduce((s,r)=>s+r[ix[k]],0):L==='noeng'?FL.reduce((s,r)=>s+(r[0]==='eng_Latn'?0:r[ix[k]]),0):FL.find(r=>r[0]===L)[ix[k]];
    const eng=k=>FL.find(r=>r[0]==='eng_Latn')[ix[k]];
    const ser=[['sel',k=>tot(k)/tot('gpt2'),'var(--c1)',L==='all'?'All 204 languages':L==='noeng'?'All except English':FL.find(r=>r[0]===L)[1]],['eng',k=>eng(k)/eng('gpt2'),'var(--c2)','English']];
    const ys=ser.flatMap(([,f])=>TK.map(f));const ymax=Math.max(1.1,...ys)*1.05,ymin=0;
    const x=v=>ml+(W-ml-mr)*(Math.log(v)-Math.log(28000))/(Math.log(300000)-Math.log(28000)),y=v=>mt+(H-mt-mb)*(1-(v-ymin)/(ymax-ymin));
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Tokens relative to GPT-2 against vocabulary size">';
    const step=ymax>3?1:ymax>1.6?0.25:0.2;for(let v=0;v<=ymax;v+=step){s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/><text x="'+(ml-4)+'" y="'+(y(v)+4)+'" text-anchor="end" font-size="10.5" fill="var(--mute)">'+v.toFixed(2).replace(/0$/,'')+'</text>'}
    (W<480?[32000,50000,100000,200000]:[32000,50000,100000,150000,200000,250000]).forEach(v=>{s+='<text x="'+x(v)+'" y="'+(H-10)+'" text-anchor="middle" font-size="10.5" fill="var(--mute)">'+(v/1000)+'K</text>'});
    ser.forEach(([id,f,col,name])=>{TK.forEach(k=>{const cx=x(nV[k]),cy=y(f(k));s+='<circle cx="'+cx.toFixed(1)+'" cy="'+cy.toFixed(1)+'" r="5" fill="'+col+'"><title>'+esc(name+', '+LAB[k]+': '+f(k).toFixed(3))+'</title></circle>';
      if(id==='sel'&&(W>520||['gpt2','cl100k','o200k','gemma3','llama2'].includes(k))){const rt=cx>W-70;s+='<text x="'+(rt?cx-6:cx+6)+'" y="'+(cy-6)+'" text-anchor="'+(rt?'end':'start')+'" font-size="10.5" fill="var(--mute)">'+SHORT[k]+'</text>'}})});
    el.innerHTML=s+'</svg><div class="hmleg"><span><i style="display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:4px;background:var(--c1)"></i>'+esc(ser[0][3])+'</span><span><i style="display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:4px;background:var(--c2)"></i>English</span><span class="mute">y: tokens ÷ GPT-2\'s tokens for the same text; x: tokenizer entries, log scale</span></div>';
    const a=tot('gemma3')/tot('gpt2'),b=eng('gemma3')/eng('gpt2');
    $('vsNote').innerHTML='Gemma 3\'s 262K vocabulary needs '+(100*a).toFixed(0)+'% of GPT-2\'s tokens for this text and '+(100*b).toFixed(0)+'% for English. Not a controlled experiment: each tokenizer was trained on different data, by different rules (Llama 2\'s 32K SentencePiece splits digits and adds a leading space, which is why it sits above GPT-2 on English). It shows what the deployed tokenizers do, not what vocabulary size alone does.'}
  $('vsL').addEventListener('change',drawS);
  const all=()=>{drawT();hiRow();drawS()};
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-voc']=[all];
  addEventListener('resize',()=>{if(!$('t-voc').hidden)all()});
  all();
})();
