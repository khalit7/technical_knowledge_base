// ---- Tab: Today's board, three ways (ids bd-) ----
(function(){
  const D=window.HPD.board,wrap=document.getElementById('bd-wrap'),sel=document.getElementById('bd-cat');
  const NAMES={overall:'Overall',hard_prompts:'Hard prompts',coding:'Coding',math:'Math',creative_writing:'Creative writing',instruction_following:'Instruction following',multi_turn:'Multi-turn',longer_query:'Longer query',expert:'Expert',industry_legal_and_government:'Legal and government',industry_medicine_and_healthcare:'Medicine and healthcare',non_english:'Non-English'};
  const LENS={raw:'without style control',sc:'style control',fact:'factuality-weighted'};
  Object.keys(D.cats).forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=NAMES[c]||c;sel.appendChild(o)});
  let cat='overall',lens='sc';const RH=31;const els={};
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function draw(){
    const C=D.cats[cat],rows=C.rows;
    // order: rows with a value under this lens by score, then the rest
    const have=rows.filter(r=>r[lens]),miss=rows.filter(r=>!r[lens]);
    have.sort((a,b)=>b[lens][0]-a[lens][0]);const order=have.concat(miss);
    let lo=Infinity,hi=-Infinity;have.forEach(r=>{lo=Math.min(lo,r[lens][1]);hi=Math.max(hi,r[lens][2])});
    const pad=(hi-lo)*0.04;lo-=pad;hi+=pad;
    // remove rows of another category
    Object.keys(els).forEach(k=>{if(!rows.find(r=>r.m===k)){els[k].remove();delete els[k]}});
    wrap.style.height=(order.length*RH+4)+'px';
    order.forEach((r,i)=>{
      let el=els[r.m];if(!el){el=document.createElement('div');el.className='bd-row';el.style.top=(i*RH)+'px';wrap.appendChild(el);els[r.m]=el}
      const v=r[lens];const W=300;
      let svg='<svg viewBox="0 0 '+W+' 30" preserveAspectRatio="none" aria-hidden="true">';
      if(v){const x=t=>((t-lo)/(hi-lo))*W;svg+='<line x1="'+x(v[1]).toFixed(1)+'" x2="'+x(v[2]).toFixed(1)+'" y1="15" y2="15" stroke="var(--c1)" stroke-width="2" vector-effect="non-scaling-stroke"/><rect x="'+(x(v[0])-2.5).toFixed(1)+'" y="10" width="5" height="10" rx="1" fill="var(--c1)"/>'}
      svg+='</svg>';
      const sp=r.sp&&r.sp[lens];const mv=(v&&r.sc)?(r.sc[3]-v[3]):null;
      el.innerHTML='<span class="rk">'+(v?v[3]:'-')+'</span><span class="nm" title="'+esc(r.m)+'">'+esc(r.m)+'<small>'+(v?v[0].toFixed(0):'no data')+'</small></span>'+svg+'<span class="spr">'+(sp?sp[0]+' to '+sp[1]:'-')+'</span><span class="mv '+(mv>0?'up':mv<0?'dn':'')+'">'+(mv==null||lens==='sc'?'':mv>0?'&#9650;'+mv:mv<0?'&#9660;'+(-mv):'=')+'</span>';
      requestAnimationFrame(()=>{el.style.top=(i*RH)+'px'});
    });
    const t=have[0];const nTied=have.filter(r=>r.sp&&r.sp[lens]&&r.sp[lens][0]<=2).length;
    document.getElementById('bd-out').innerHTML=RD.stat('Models on this board',C.n_models,NAMES[cat]||cat)+RD.stat('Leader, '+LENS[lens],t?esc(t.m):'-',t?t[lens][0].toFixed(1)+' ('+t[lens][1].toFixed(1)+' to '+t[lens][2].toFixed(1)+')':'')+RD.stat('Models whose spread reaches rank 1 or 2',nTied,'of the 30 shown');
    document.getElementById('bd-note').textContent=lo===Infinity?'':'Axis from '+lo.toFixed(0)+' to '+hi.toFixed(0)+' points. '+(miss.length?miss.length+' of these models have no published '+LENS[lens]+' rating in this category.':'');
  }
  sel.addEventListener('change',()=>{cat=sel.value;Object.keys(els).forEach(k=>{els[k].remove();delete els[k]});draw()});
  RD.seg(document.getElementById('bd-lens'),m=>{lens=m;draw()});
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-board']=window.TAB_RENDER['t-board']||[]).push(draw);
})();
