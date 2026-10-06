// ---- Tool call, token by token (t-tok): data HB.tok ----
(function(){
  const H=window.HB,T=H&&H.tok,g=document.getElementById('hbt-grid'); if(!T||!g)return; const esc=RD.esc;
  const toks=T.toks, cuts=T.cuts;
  const M={S:'sys',T:'tools',U:'user',G:'gen',R:'res'};const reg=[...T.reg].map(c=>M[c]);
  const NAMES={sys:'system prompt and markup',tools:'tool definitions',user:'task',gen:'model replies (generated)',res:'tool results'};
  const COL={sys:'var(--mute)',tools:'var(--c5)',user:'var(--c1)',gen:'var(--c3)',res:'var(--c4)'};
  document.getElementById('hbt-leg').innerHTML=Object.keys(NAMES).map(k=>'<span><i style="background:'+COL[k]+'"></i>'+NAMES[k]+'</span>').join('')+'<span><i style="border:2px solid var(--ink)"></i>special token</span>';
  const kEl=document.getElementById('hbt-k');
  function draw(){
    const k=+kEl.value,end=cuts[k-1];document.getElementById('hbt-k-v').textContent=k+' ('+end.toLocaleString()+' tokens)';
    g.innerHTML=toks.map((t,i)=>'<span data-i="'+i+'" class="r-'+reg[i]+(t[0]>=151643?' sp':'')+(i>=end?' after':'')+(cuts.indexOf(i+1)>=0&&i+1<toks.length?' cut':'')+'">'+esc(t[1]).replace(/\n/g,'↵')+'</span>').join('');
    const c={};for(let i=0;i<end;i++)c[reg[i]]=(c[reg[i]]||0)+1;
    document.getElementById('hbt-info').innerHTML=Object.keys(NAMES).map(r=>RD.stat(NAMES[r],(c[r]||0).toLocaleString(),'tokens')).join('');
  }
  g.addEventListener('click',e=>{const s=e.target.closest('span[data-i]');if(!s)return;const i=+s.dataset.i,t=toks[i];
    g.querySelectorAll('.on').forEach(x=>x.classList.remove('on'));s.classList.add('on');
    document.getElementById('hbt-info').insertAdjacentHTML('afterbegin','');
    const inf=document.getElementById('hbt-info');inf.innerHTML=RD.stat('token '+(i+1),'id '+t[0],(t[0]>=151643?'special, ':'')+NAMES[reg[i]])+RD.stat('text',esc(JSON.stringify(t[1])),'as the tokenizer splits it')+inf.innerHTML.split('</div></div>').slice(2).join('</div></div>')});
  kEl.addEventListener('input',draw);draw();
  // stacked bars per call
  const max=cuts[cuts.length-1];
  document.getElementById('hbt-stack').innerHTML=cuts.map((end,j)=>{const c={};for(let i=0;i<end;i++)c[reg[i]]=(c[reg[i]]||0)+1;
    return '<div class="row"><span>call '+(j+1)+'</span><span class="tr" style="width:'+(end/max*100)+'%">'+Object.keys(NAMES).map(r=>'<span style="width:'+((c[r]||0)/end*100)+'%;background:'+COL[r]+'" title="'+NAMES[r]+': '+(c[r]||0)+'"></span>').join('')+'</span><span>'+end.toLocaleString()+'</span></div>'}).join('');
  const nl=T.toks.find(t=>t[1]==='\n\n\n');document.getElementById('hbt-nl').textContent=nl?'id '+nl[0]+' ("\\n\\n\\n")':'';
})();
