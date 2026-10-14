// ---- Query-rewrite lab (t-rpqr)
(function(){
  const $=id=>document.getElementById(id);
  const Q=RP.D.qr;if(!Q||!Q.claims)return;
  const st={q:0,m:null,showR:false};const H=27;
  $('rp-qr-q').innerHTML=Q.claims.map((c,i)=>'<option value="'+i+'">'+RP.esc(c.q)+'</option>').join('');
  function methods(){return Object.keys(Q.claims[st.q].lists).filter(k=>k!=='original')}
  function segs(){const ms=methods();if(!ms.includes(st.m))st.m=ms[0];
    $('rp-qr-m').innerHTML=ms.map(m=>'<button data-m="'+m+'"'+(m===st.m?' class="on"':'')+'>'+RP.esc(m)+'</button>').join('')}
  const rk=(l,rel)=>{for(let i=0;i<l.length;i++)if(rel.includes(l[i][0]))return i+1;return null};
  function render(){
    const C=Q.claims[st.q],T=Q.titles,rel=C.rel,O=C.lists.original,R=C.lists[st.m];
    $('rp-qr-qt').innerHTML='<b>Claim:</b> '+RP.esc(C.q);
    const ro=rk(O,rel),rr=rk(R,rel);
    $('rp-qr-stats').innerHTML=RD.stat('Relevant abstract, original claim',ro?'rank '+ro:'not in top 10','bge-small')+
      RD.stat('Relevant abstract, '+RP.esc(st.m),rr?'rank '+rr:'not in top 10',ro&&rr?(rr<ro?'moved up '+(ro-rr):rr>ro?'moved down '+(rr-ro):'same rank'):'')+
      RD.stat('Overlap of the two top 10s',O.filter(x=>R.some(y=>y[0]===x[0])).length+' of 10','');
    const io={},ir={};O.forEach((x,i)=>io[x[0]]=i+1);R.forEach((x,i)=>ir[x[0]]=i+1);
    const show=st.showR?R:O,other=st.showR?io:ir;
    const docs=[...new Set(O.map(x=>x[0]).concat(R.map(x=>x[0])))];
    const pos={};show.forEach((x,i)=>pos[x[0]]=i);let extra=show.length;docs.forEach(d=>{if(!(d in pos))pos[d]=extra++});
    const sc={};show.forEach(x=>sc[x[0]]=x[1]);
    const el=$('rp-qr-list');el.style.height=(docs.length*H+2)+'px';
    const have={};el.querySelectorAll('.rp-row').forEach(r=>have[r.dataset.d]=r);
    const same=Object.keys(have).length===docs.length&&docs.every(d=>have[d]);
    if(!same)el.innerHTML=docs.map(d=>'<div class="rp-row'+(rel.includes(d)?' rel':'')+'" data-d="'+d+'"><span class="r"></span><span class="tt" title="'+RP.esc(T[d]||d)+'">'+RP.esc(T[d]||d)+'</span><span class="s"></span><span class="o"></span></div>').join('');
    el.querySelectorAll('.rp-row').forEach(e=>{const d=e.dataset.d,i=pos[d],inn=d in sc;e.style.top=(i*H)+'px';e.classList.toggle('gone',!inn);
      e.querySelector('.r').textContent=inn?i+1:'';e.querySelector('.s').textContent=inn?(+sc[d]).toFixed(3):'';
      e.querySelector('.o').textContent=(st.showR?'o':'r')+(other[d]||'–')});
    $('rp-qr-showing').textContent='Showing: '+(st.showR?st.m:'original claim')+' (faded rows are only in the other list)';
    $('rp-qr-go').innerHTML=st.showR?'&#9664; Back to the original':'&#9654; Animate original &#8594; rewrite';
    $('rp-qr-gen').textContent=C.texts[st.m]||'(no generated text: the claim and the HyDE passage vectors are averaged)';
  }
  function dec(){const D=Q.decomp||[];if(!D.length){$('rp-qr-dec').innerHTML='<tr><td>not run yet</td></tr>';return}
    $('rp-qr-dec').innerHTML='<thead><tr><th>question</th><th>type</th><th>sub-questions written by the generator</th></tr></thead><tbody>'+
      D.map(x=>'<tr><td>'+RP.esc(x.question)+'</td><td>'+x.type+'</td><td>'+x.subs.map(RP.esc).join('<br>')+'</td></tr>').join('')+'</tbody>'}
  $('rp-qr-q').addEventListener('change',e=>{st.q=+e.target.value;st.showR=false;segs();$('rp-qr-list').innerHTML='';render()});
  $('rp-qr-m').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st.m=b.dataset.m;st.showR=false;segs();$('rp-qr-list').innerHTML='';render()});
  $('rp-qr-go').addEventListener('click',()=>{st.showR=!st.showR;render()});
  segs();
  RP.onTab('t-rpqr',()=>{render();dec()});
})();
