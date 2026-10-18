// ---- Reading: one sentence at five granularities (bars to scale in UTF-8 bytes) ----
(function(){
  const {pieces,esc,te,chips}=TKV, EX=TD.ex;
  const LANGS=[['eng_Latn','English'],['fra_Latn','French'],['rus_Cyrl','Russian'],['zho_Hans','Chinese'],['hin_Deva','Hindi'],['tam_Taml','Tamil'],['mya_Mymr','Burmese']];
  let cur='eng_Latn',open='o200k';
  const box=document.getElementById('granLang'),rowsEl=document.getElementById('granRows'),txt=document.getElementById('granText');
  box.innerHTML=LANGS.map(([c,n])=>'<button data-c="'+c+'"'+(c===cur?' class="on"':'')+'>'+n+'</button>').join('');
  box.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;cur=b.dataset.c;box.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));draw()});
  function segs(text,kind){
    if(kind==='w'){const m=text.match(/\s*\S+/gu)||[];return m.map(s=>({s,n:te.encode(s).length}))}
    if(kind==='c')return Array.from(text,s=>({s,n:te.encode(s).length}));
    if(kind==='b')return Array.from(te.encode(text),x=>({hex:x.toString(16).padStart(2,'0'),n:1}));
    return pieces(text,EX[cur].t[kind]).filter((p,i)=>!(i===0&&p.s===' '&&EX[cur].t[kind][0]==='+'))}
  function draw(){
    const e=EX[cur],tb=te.encode(e.text).length,eb=te.encode(EX.eng_Latn.text).length;
    txt.innerHTML='<b>'+esc(e.name)+'</b>: '+esc(e.text)+' <span class="mute">('+tb+' bytes'+(cur!=='eng_Latn'?', English '+eb:'')+')</span>';
    const R=[['w','Words','split at spaces'],['c','Characters','code points'],['b','UTF-8 bytes','what ByT5 reads'],['gpt2','GPT-2 tokens','r50k_base, 2019'],['o200k','GPT-4o tokens','o200k_base, 2024']];
    rowsEl.innerHTML=R.map(([k,n,s])=>{const p=segs(e.text,k);
      return '<div class="trow" data-k="'+k+'" style="cursor:pointer"><div class="nm">'+n+'<small>'+s+'</small></div><div><div class="strip">'+p.map(x=>'<span style="flex:'+x.n+' 0 0" title="'+esc(x.s!=null?x.s:x.hex)+'"></span>').join('')+'</div>'+
        (open===k?chips(p.map(x=>x.s!=null?x:{hex:x.hex,n:x.n})):'')+'</div><div class="n">'+p.length+'</div></div>'}).join('')+
      '<p class="small mute">Click a row to see its pieces. Bars share one scale: the full width is this sentence\'s bytes.</p>';
  }
  rowsEl.addEventListener('click',e=>{const r=e.target.closest('.trow');if(!r)return;open=open===r.dataset.k?null:r.dataset.k;draw()});
  draw();
})();
