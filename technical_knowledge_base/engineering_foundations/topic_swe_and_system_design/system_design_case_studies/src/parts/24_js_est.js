// ---- Live estimate tables: the same formulas as recompute.py (est_spec.json), evaluated in the page ----
window.EST=(function(){
  const S=window.EST_SPEC,C=S.consts;
  const FN={ceil:Math.ceil,max:Math.max,min:Math.min,log2:Math.log2};
  const cache={};
  function compile(e,keys){const k=e+'|'+keys.join(',');if(!cache[k])cache[k]=new Function(...Object.keys(C),...Object.keys(FN),...keys,'return ('+e+');');return cache[k]}
  function evaluate(d,vals){const sp=S.designs[d];const keys=sp.inputs.map(i=>i.k);
    const args=[...Object.values(C),...Object.values(FN),...keys.map(k=>vals[k])];const out={};
    sp.rows.forEach(r=>{out[r.k]=compile(r.e,keys)(...args);if(r.cap)out[r.k+'__cap']=compile(r.cap,keys)(...args)});return out}
  function defaults(d){const v={};S.designs[d].inputs.forEach(i=>v[i.k]=i.v);return v}
  function fv(r,x){if(r.pct)return RD.fmt(x*100,1)+'%';return RD.fmt(x)}
  const SRC={bitly2014:'High Scalability on Bitly, 2014',hs2013:'High Scalability on Twitter, 2013',stripe_gist:'Stripe gist, 2017',ml_sd:'ML system design, section 1',oai_emb:'OpenAI docs',pgvector:'pgvector README'};
  // scale: input keys multiplied by the "x10 traffic" button
  function mount(id,d,scale){
    const sp=S.designs[d],el=document.getElementById(id);let vals=defaults(d);
    el.innerHTML='<div class="t">Back-of-the-envelope estimate</div>'+
      '<div class="seg" id="'+id+'-seg"><button data-m="1" class="on">Defaults</button><button data-m="10">10&times; the traffic</button><button data-m="100">100&times;</button></div>'+
      '<div class="tw"><table><thead><tr><th>Quantity</th><th class="num">Value</th><th>How</th></tr></thead><tbody id="'+id+'-tb"></tbody></table></div>'+
      '<details class="mist"><summary>Inputs (change any of them)</summary><div class="b"><div class="inp" id="'+id+'-in"></div>'+
      '<p class="small mute">Inputs marked <span class="ill">illustrative</span> are assumptions you would state aloud in an interview; the others are sourced. Formulas checked in src/recompute.py.</p></div></details>';
    const tb=document.getElementById(id+'-tb'),inp=document.getElementById(id+'-in');
    function inputs(){inp.innerHTML=sp.inputs.map(i=>'<label>'+RD.esc(i.l)+(i.ill?' <span class="ill">illustrative</span>':i.src?' <span class="mute">('+RD.esc(SRC[i.src]||i.src)+')</span>':'')+
      '<br><input type="number" data-k="'+i.k+'" value="'+vals[i.k]+'" min="'+i.min+'" max="'+i.max+'" step="any" style="width:100%" aria-label="'+RD.esc(i.l)+'"></label>').join('')}
    function table(){const o=evaluate(d,vals);
      tb.innerHTML=sp.rows.map(r=>{const v=o[r.k];let cls='',extra='';
        if(r.cap){const c=o[r.k+'__cap'];const over=v>c;cls=over?' class="over"':'';extra='<br><span class="small '+(over?'':'mute')+'" style="'+(over?'color:var(--bad)':'')+'">'+(over?'Over ':'Under ')+RD.esc(r.capl)+' ('+RD.fmt(c)+')</span>'}
        return '<tr'+cls+'><td>'+RD.esc(r.l)+extra+'</td><td class="num">'+fv(r,v)+'</td><td class="small mute">'+RD.esc(r.f)+'</td></tr>'}).join('')}
    inputs();table();
    inp.addEventListener('input',e=>{const t=e.target;if(!t.dataset.k)return;const x=parseFloat(t.value);if(isFinite(x)&&x>=0){vals[t.dataset.k]=x;table()}});
    RD.seg(document.getElementById(id+'-seg'),m=>{vals=defaults(d);(scale||[]).forEach(k=>vals[k]=vals[k]*(+m));inputs();table()});
    return {evaluate:()=>evaluate(d,vals)};
  }
  return {mount,evaluate,defaults};
})();
