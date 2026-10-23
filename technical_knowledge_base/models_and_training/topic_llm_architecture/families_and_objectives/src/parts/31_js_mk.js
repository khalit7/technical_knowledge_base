// ---- Reading sections 1 and 3 (moved from the old Mask lab tab): mask swap bars, leak attention bars, the 24-token explorer and recorded output (closed block) ----
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
  // swap bars
  const SW=D.masks.swap;
  function drawSw(){
    const el=document.getElementById('mk-sw-svg'),W=Math.min(FO.W(el),720),rows=[['causal','causal (as trained)'],['bidir','bidirectional'],['prefix128','prefix LM (128)']];
    const lab=W<460?70:90,rh=20,H=rows.length*(2*rh+18)+8,X=v=>lab+(W-lab-50)*v/4.6;let b='',y=4;
    rows.forEach(r=>{b+=t(0,y+12,r[1],{fs:12,w:600});y+=16;[['held_out_first128','first 128','var(--c1)'],['held_out_last128','last 128','var(--c2)']].forEach(f=>{const v=SW[r[0]][f[0]];
      b+=t(lab-6,y+14,f[1],{a:'end',fs:11})+'<rect x="'+lab+'" y="'+(y+3)+'" width="'+Math.max(1,X(v)-lab)+'" height="'+(rh-6)+'" rx="2" fill="'+f[2]+'"/>'+t(X(v)+4,y+14,v.toFixed(3),{fs:11});y+=rh});y+=2});
    b+='<line x1="'+X(SW.causal.held_out)+'" x2="'+X(SW.causal.held_out)+'" y1="0" y2="'+y+'" stroke="var(--good)" stroke-dasharray="3 3"/>';
    el.innerHTML=RD.svg(W,H,b,'loss under swapped masks');
    document.getElementById('mk-sw-cap').innerHTML='<p class="small mute">Held-out loss per token (nats); dashed line: the causal model overall, '+SW.causal.held_out.toFixed(4)+'.</p><p>Bidirectional: '+SW.causal.held_out.toFixed(3)+' becomes '+SW.bidir.held_out.toFixed(3)+'. Prefix 128: the second half stays causal, yet its loss rises from '+SW.causal.held_out_last128.toFixed(3)+' to '+SW.prefix128.held_out_last128.toFixed(3)+'.</p>';
  }
  function drawAt(){
    const el=document.getElementById('mk-at-svg'),W=Math.min(FO.W(el),720),a=D.masks.swap.attn_next_causal_model,b2=D.masks.leak.attn_next,H=178,l=40,bt=26;
    const bw=(W-l-10)/6,Y=v=>10+(H-10-bt)*(1-v/0.25);let b='';
    for(const v of [0,0.1,0.2]){b+='<line x1="'+l+'" x2="'+(W-10)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+t(l-5,Y(v)+4,v.toFixed(1),{a:'end'})}
    for(let i=0;i<6;i++){const x=l+i*bw;b+='<rect x="'+(x+bw*0.15)+'" y="'+Y(a[i])+'" width="'+bw*0.32+'" height="'+(Y(0)-Y(a[i]))+'" fill="var(--c1)"/><rect x="'+(x+bw*0.52)+'" y="'+Y(b2[i])+'" width="'+bw*0.32+'" height="'+(Y(0)-Y(b2[i]))+'" fill="var(--bad)"/>'+t(x+bw/2,H-10,'layer '+(i+1),{a:'middle',fs:11})}
    el.innerHTML=RD.svg(W,H,b,'attention on next position')+'<div class="fo-leg"><span style="--sw:var(--c1)">before: reference, mask removed ('+a[0].toFixed(3)+' in layer 1)</span><span style="--sw:var(--bad)">after 150 leak steps ('+b2[0].toFixed(3)+')</span></div>';
  }
  FO.reg(TAB,()=>{drawSw();drawAt()});
  RD.onResize(()=>{drawSw();drawAt()});
  const sw=D.masks.swap,lk=D.masks.leak;
  document.getElementById('mk-out').textContent=['causal','bidir','prefix128'].map(k=>k+' '+JSON.stringify(sw[k])).join('\n')+
    '\nleak step 0 '+lk.curve[0][1]+'\n...\nleak step 149 '+lk.curve[lk.curve.length-1][1]+'\nheld_out_bidir '+lk.held_out_bidir+'  held_out_causal '+lk.held_out_causal+'\nattn_next '+JSON.stringify(lk.attn_next);
})();
