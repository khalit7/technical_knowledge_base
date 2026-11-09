// ---- Reading section 1, closed block: the 24-token mask explorer and the recorded output of masks.py ----
(function(){
  if(!window.FOD||!document.getElementById('mk-card'))return;
  const D=FOD,esc=FO.esc,t=RD.t,TAB='t-read';
  const P=D.obj.pieces.slice(0,24).map(s=>s.replace(/\n/g,'↵'));const n=P.length;
  let mode='causal',q=10,split=8;
  function can(qq,k){if(mode==='causal')return k<=qq?1:0;if(mode==='bidir')return 1;if(mode==='prefix')return (k<=qq||k<split)?1:0;
    if(qq<split)return k<split?1:0;return k<split?2:(k<=qq?1:0)}
  function scored(i){if(mode==='causal')return i<n-1;if(mode==='bidir')return D.obj.mlm.some(m=>m.pos===i);if(mode==='prefix')return i>=split-1&&i<n-1;return i>=split&&i<n-1}
  function draw(){
    document.getElementById('mk-plab').style.display=(mode==='prefix'||mode==='encdec')?'':'none';
    document.getElementById('mk-pv').textContent=split;
    const el=document.getElementById('mk-toks');
    el.innerHTML=P.map((p,i)=>{const c=can(q,i);return '<span data-i="'+i+'" class="'+(i===q?'q ':'')+(c===2?'cross':c?'see':'no')+(scored(i)?' sc':'')+'">'+esc(p)+'</span>'+((mode==='encdec'||mode==='prefix')&&i===split-1?'<span style="border:0;color:var(--bad)">|</span>':'')}).join('');
    let vis=0;for(let a=0;a<n;a++)for(let b=0;b<n;b++)vis+=can(a,b)?1:0;
    const sc=[...Array(n).keys()].filter(scored).length;
    const cap={causal:['Causal','Query '+q+' reads tokens 0 to '+q+'. Its keys and values never change when later tokens arrive, so a KV cache holds them.'],
      bidir:['Bidirectional','Query '+q+' reads all '+n+' tokens. Scored positions are BERT\'s 15% sample (section 2 uses the same draw).'],
      prefix:['Prefix LM','Tokens 0 to '+(split-1)+' are the prefix and read each other both ways; query '+q+(q<split?' is in the prefix.':' reads the whole prefix and the continuation up to itself.')+' Only the continuation is scored.'],
      encdec:['Encoder-decoder','Tokens 0 to '+(split-1)+' are the encoder input; the rest are decoder outputs. '+(q<split?'Query '+q+' is an encoder position: it reads the input only.':'Query '+q+' is a decoder position: its own outputs causally, the whole input through cross-attention.')]}[mode];
    document.getElementById('mk-cap').innerHTML='<div class="t">'+cap[0]+'</div><p>'+cap[1]+'</p>';
    const cache={causal:'all past K, V',bidir:'nothing (recompute)',prefix:'continuation only; prefix K, V fixed once prompt ends',encdec:'decoder K, V + cross K, V of the input'}[mode];
    document.getElementById('mk-cnt').innerHTML=RD.stat('readable pairs',vis+' / '+(n*n),FO.fmt(vis/(n*n),'pct0')+' of the matrix')+RD.stat('scored positions',sc+' of '+n,'loss terms')+RD.stat('reusable at decode',cache,'');
  }
  document.getElementById('mk-toks').addEventListener('click',e=>{const s=e.target.closest('span[data-i]');if(!s)return;q=+s.dataset.i;draw()});
  RD.seg(document.getElementById('mk-seg'),m=>{mode=m;draw()});
  document.getElementById('mk-p').addEventListener('input',e=>{split=+e.target.value;draw()});
  draw();
  // the mask-swap bars and the attention-on-i+1 bars are steps of the 3D stages Fig. 2 and Fig. 4 since 2026-11-09
  const sw=D.masks.swap,lk=D.masks.leak;
  document.getElementById('mk-out').textContent=['causal','bidir','prefix128'].map(k=>k+' '+JSON.stringify(sw[k])).join('\n')+
    '\nleak step 0 '+lk.curve[0][1]+'\n...\nleak step 149 '+lk.curve[lk.curve.length-1][1]+'\nheld_out_bidir '+lk.held_out_bidir+'  held_out_causal '+lk.held_out_causal+'\nattn_next '+JSON.stringify(lk.attn_next);
})();
