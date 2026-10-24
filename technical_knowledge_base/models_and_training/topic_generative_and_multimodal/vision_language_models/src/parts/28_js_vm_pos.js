// ---- Reading 2a: the same 16 x 16 image tokens under 1-D positions and under M-RoPE (static before/after).
// Numbers: Qwen3.5's own get_rope_index on the 512 x 512 cat (out/qwen_saw.json: image_pos_thw, pos_text_after); the 1-D column is k, k+1, ... from the same start ----
(function(){
  const V=VM,el=V.$('vm-pos');if(!el)return;
  const im=(V.D.saw&&V.D.saw.images||[]).find(x=>x.key==='p01_cat');
  const q=im&&(im.qwen||[]).find(x=>x.budget==='256');
  const start=q?q.firstIdx:4,n=16,after3=q?q.posAfter:[20,20,20],T=RD.t;
  function panel(x0,y0,pw,mode){let b='';const s=Math.min(9,(pw-24)/n),gx=x0+(pw-s*n)/2,gy=y0+40;
    b+=T(x0+pw/2,y0+12,mode==='1d'?'1-D: one position per token':'3-D M-RoPE: (t, h, w)',{a:'middle',w:600,fs:12});
    for(let r=0;r<n;r++)for(let c=0;c<n;c++)b+='<rect x="'+(gx+c*s).toFixed(1)+'" y="'+(gy+r*s).toFixed(1)+'" width="'+(s-1).toFixed(1)+'" height="'+(s-1).toFixed(1)+'" fill="var(--acc)" opacity="'+(r===0&&c===0||r===n-1&&c===n-1?1:0.45)+'"/>';
    const lab=mode==='1d'?[String(start),String(start+n-1),String(start+n*(n-1)),String(start+n*n-1)]:
      ['('+start+', '+start+', '+start+')','('+start+', '+start+', '+(start+n-1)+')','('+start+', '+(start+n-1)+', '+start+')','('+start+', '+(start+n-1)+', '+(start+n-1)+')'];
    b+=T(gx,gy-6,lab[0]);b+=T(gx+s*n,gy-6,lab[1],{a:'end'});b+=T(gx,gy+s*n+13,lab[2]);b+=T(gx+s*n,gy+s*n+13,lab[3],{a:'end'});
    const nx=mode==='1d'?String(start+n*n):'('+after3.join(', ')+')';
    b+=T(x0+pw/2,gy+s*n+32,'next text token: '+nx,{a:'middle',w:600});
    b+=T(x0+pw/2,gy+s*n+48,'the image used '+(mode==='1d'?n*n:after3[0]-start)+' positions',{a:'middle',w:600,fill:mode==='1d'?'var(--bad)':'var(--good)'});
    return [b,gy+s*n+56-y0]}
  function draw(){const W=Math.min(RD.width(el),760),wide=W>=560;let b='',H;
    if(wide){const pw=(W-16)/2,[a,h]=panel(0,0,pw,'1d'),[c]=panel(pw+16,0,pw,'3d');b=a+c+'<line x1="'+(pw+8)+'" x2="'+(pw+8)+'" y1="4" y2="'+(h-4)+'" stroke="var(--line)"/>';H=h}
    else{const [a,h]=panel(0,0,W,'1d'),[c,h2]=panel(0,h+10,W,'3d');b=a+c;H=h+10+h2}
    el.innerHTML=RD.svg(W,H,b,'The same 256 image tokens use 256 positions with 1-D RoPE and 16 with M-RoPE')}
  RD.onRender(draw);RD.onResize(draw);draw();
})();
