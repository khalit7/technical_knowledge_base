// ---- Chunking workbench (inline in Reading section 1)
(function(){
  const $=id=>document.getElementById(id);
  const docs=RP.D.wb.map(RP.Doc);
  const st={p:0,q:0,strat:'fixed',size:256,over:32,bud:1024,seps:["\n\n","\n",". "," "]};
  const ps=$('rp-wb-paper');ps.innerHTML=docs.map((d,i)=>'<option value="'+i+'">'+RP.esc(d.title)+' ('+d.id+')</option>').join('');
  function fillQ(){$('rp-wb-q').innerHTML=docs[st.p].qs.map((q,i)=>'<option value="'+i+'">'+RP.esc(q.q)+'</option>').join('');st.q=0}
  function chunk(d,strat,size,over){
    if(strat==='fixed')return RP.fixed(d,size,Math.min(over,size-1));
    if(strat==='recursive')return RP.recursive(d,size,Math.min(over,size-1),st.seps);
    if(strat==='sentence')return RP.sentence(d,size);
    if(strat==='structure')return RP.structure(d,size);
    return RP.paragraph(d)}
  function retrieve(d,spans,q,bud){
    const sc=RP.bm25(spans.map(([a,b])=>d.text.slice(a,b)),q.q);
    const order=spans.map((s,i)=>i).sort((a,b)=>sc[b]-sc[a]||a-b);
    const chosen=[];let used=0;
    for(const i of order){const n=d.ntok(spans[i][0],spans[i][1]);if(used+n<=bud){chosen.push(i);used+=n}}
    const cov=Math.max(...q.ev.map(ev=>RP.covered(chosen.map(i=>spans[i]),ev)));
    return {order,chosen,used,cov,found:cov>=0.9}}
  function render(){
    const d=docs[st.p],q=d.qs[st.q];
    const spans=chunk(d,st.strat,st.size,st.over);
    const n=spans.map(([a,b])=>d.ntok(a,b));const srt=[...n].sort((a,b)=>a-b);
    const stored=n.reduce((a,b)=>a+b,0),L=d.starts.length;
    const intactN=d.qs.filter(x=>RP.intact(spans,x)).length;
    const R=retrieve(d,spans,q,st.bud);
    let formula='';
    if(st.strat==='fixed'){const c=st.size,o=Math.min(st.over,st.size-1);const nf=L<=c?1:Math.ceil((L-o)/(c-o));
      formula=RD.stat('Formula n = &lceil;(L &minus; o)/(c &minus; o)&rceil;',nf+(nf===spans.length?' &#10003;':' &#10007;'),'L = '+RP.fmt(L)+', c = '+c+', o = '+o)}
    $('rp-wb-stats').innerHTML=RD.stat('Chunks',spans.length,'paper of '+RP.fmt(L)+' tokens')+
      RD.stat('Tokens per chunk','median '+srt[srt.length>>1]+', max '+srt[srt.length-1],'min '+srt[0])+
      RD.stat('Stored tokens',RP.fmt(stored),(stored/L-1>=0?'+':'')+(100*(stored/L-1)).toFixed(1)+'% against the paper')+formula+
      RD.stat('Evidence intact in one chunk',intactN+' of '+d.qs.length+' questions','this paper')+
      RD.stat('This question',R.found?'found':'not found','evidence covered '+(100*R.cov).toFixed(0)+'%, '+R.chosen.length+' chunks, '+R.used+' tokens');
    $('rp-wb-qtext').innerHTML='<b>Q:</b> '+RP.esc(q.q)+'<br><span class="mute small">Annotators\' answer: '+RP.esc(q.a)+'</span>';
    // ---- document view: cut the text at every boundary
    const cuts=new Set([0,d.text.length]);spans.forEach(([a,b])=>{cuts.add(a);cuts.add(b)});q.ev.forEach(([a,b])=>{cuts.add(a);cuts.add(b)});
    const pts=[...cuts].sort((a,b)=>a-b);const rank={};R.order.forEach((i,r)=>rank[i]=r+1);const sel=new Set(R.chosen);
    const starts={};spans.forEach(([a],i)=>{(starts[a]=starts[a]||[]).push(i)});
    let h='';
    for(let k=0;k<pts.length-1;k++){const a=pts[k],b=pts[k+1];
      (starts[a]||[]).forEach(i=>{h+='<span class="bd'+(rank[i]===1?' top':'')+'" title="chunk '+(i+1)+', BM25 rank '+rank[i]+'">#'+rank[i]+'</span>'});
      const inn=[];spans.forEach(([x,y],i)=>{if(x<=a&&b<=y)inn.push(i)});
      const cls=[];if(inn.length>1)cls.push('ov');else if(inn.length===1)cls.push('c'+(inn[0]%2));
      if(q.ev.some(([x,y])=>x<=a&&b<=y))cls.push('ev');if(inn.some(i=>sel.has(i)))cls.push('sel');
      h+='<span class="'+cls.join(' ')+'">'+RP.esc(d.text.slice(a,b))+'</span>'}
    $('rp-wb-doc').innerHTML=h;
    // ---- all strategies
    const S=[['fixed','fixed windows'],['recursive','recursive'],['sentence','sentences packed'],['structure','paragraphs within sections'],['paragraph','one paragraph']];
    let tb='<thead><tr><th>strategy</th><th class="num">chunks</th><th class="num">median tokens</th><th class="num">stored tokens</th><th class="num">evidence intact</th><th class="num">found within '+st.bud+' tokens</th></tr></thead><tbody>';
    for(const [k,name] of S){const sp=chunk(d,k,st.size,st.over);const nn=sp.map(([a,b])=>d.ntok(a,b)).sort((a,b)=>a-b);
      const it=d.qs.filter(x=>RP.intact(sp,x)).length;const fd=d.qs.filter(x=>retrieve(d,sp,x,st.bud).found).length;
      tb+='<tr'+(k===st.strat?' class="cur"':'')+'><td>'+name+'</td><td class="num">'+sp.length+'</td><td class="num">'+nn[nn.length>>1]+'</td><td class="num">'+RP.fmt(nn.reduce((a,b)=>a+b,0))+'</td><td class="num">'+it+' / '+d.qs.length+'</td><td class="num">'+fd+' / '+d.qs.length+'</td></tr>'}
    $('rp-wb-cmp').innerHTML=tb+'</tbody>';
    $('rp-wb-seps').style.opacity=st.strat==='recursive'?1:.45;
    $('rp-wb-over').disabled=!(st.strat==='fixed'||st.strat==='recursive');
  }
  ps.addEventListener('change',e=>{st.p=+e.target.value;fillQ();render()});
  $('rp-wb-q').addEventListener('change',e=>{st.q=+e.target.value;render();
    const ev=document.querySelector('#rp-wb-doc .ev');if(ev){const box=$('rp-wb-doc');box.scrollTop=Math.max(0,ev.offsetTop-box.offsetTop-40)}});
  RP.seg($('rp-wb-strat'),m=>{st.strat=m;render()});
  [['rp-wb-size','size','rp-wb-sizev'],['rp-wb-over','over','rp-wb-overv'],['rp-wb-bud','bud','rp-wb-budv']].forEach(([id,k,v])=>$(id).addEventListener('input',e=>{st[k]=+e.target.value;$(v).textContent=st[k];render()}));
  $('rp-wb-seps').addEventListener('change',()=>{st.seps=[...$('rp-wb-seps').querySelectorAll('input')].filter(x=>x.checked).map(x=>x.dataset.s);render()});
  fillQ();
  RP.onTab('t-read',render);
})();
