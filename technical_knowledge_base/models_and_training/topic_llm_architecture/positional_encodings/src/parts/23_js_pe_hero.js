// ---- Reading: the hero figure. One pair rotated (left) and the tiny GPT's 16 RoPE pairs as clocks, fast and slow, at distance 300 (right) ----
// Static: computed from the tiny GPT's config (head 32, base 10,000, trained length 256) with window.ROPE, nothing moves.
(function(){
  const $=id=>document.getElementById(id);if(!$('pe-hero')||!window.PE_DATA||!window.ROPE)return;
  const RD=window.RD,RO=window.ROPE,P=window.PE_DATA.presets.tiny,DIST=300;
  const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim()||'#888';
  const inv=RO.baseInv(P.base,P.dim),seen=RO.seenArc(P),TAU=2*Math.PI;
  const wl=f=>{const w=TAU/f;return w<10?w.toFixed(1):w<1000?String(Math.round(w)):(w/1000).toFixed(w<9500?1:0)+'K'};
  function pairPanel(x0,y0,w,h){const R=Math.min(70,h/2-24,w/2-40),cx=x0+w/2,cy=y0+h/2+6,a=1.5,b=2.5;let g='';
    g+=RD.t(x0+w/2,y0+12,'one pair, θ = 0.5, m = 3, n = 5',{a:'middle',fill:'var(--mute)'});
    g+='<circle cx="'+cx+'" cy="'+cy+'" r="'+R+'" fill="none" stroke="var(--line)"/>';
    const pt=t=>[cx+R*Math.cos(t),cy-R*Math.sin(t)],arc=(r,t0,t1)=>{let d='';for(let i=0;i<=20;i++){const t=t0+(t1-t0)*i/20;d+=(i?'L':'M')+(cx+r*Math.cos(t)).toFixed(1)+' '+(cy-r*Math.sin(t)).toFixed(1)}return d};
    g+='<path d="'+arc(R*0.32,0,a)+'" fill="none" stroke="var(--mute)" stroke-dasharray="2 2"/>';
    g+='<path d="'+arc(R*0.55,a,b)+'" fill="none" stroke="'+css('--acc')+'" stroke-width="2.5"/>';
    const [qx,qy]=pt(a),[kx,ky]=pt(b);
    g+='<line x1="'+cx+'" y1="'+cy+'" x2="'+qx.toFixed(1)+'" y2="'+qy.toFixed(1)+'" stroke="'+css('--c1')+'" stroke-width="2.5"/>';
    g+='<line x1="'+cx+'" y1="'+cy+'" x2="'+kx.toFixed(1)+'" y2="'+ky.toFixed(1)+'" stroke="'+css('--c2')+'" stroke-width="2.5"/>';
    g+=RD.t(qx+5,qy+4,'q at m = 3',{fill:css('--c1'),w:600});
    g+=RD.t(kx-5,ky-4,'k at n = 5',{a:'end',fill:css('--c2'),w:600});
    g+=RD.t(cx+8,cy-R*0.42,'gap (n − m)θ',{fill:css('--acc'),w:600});
    g+=RD.t(cx,cy+R+18,'q · k = cos((n − m)θ) = 0.5403',{a:'middle',fill:'var(--ink)'});
    return g}
  function clocks(x0,y0,w){const rows=[[0,7],[7,16]],cols=9,cw=w/cols,r=Math.max(11,Math.min(19,cw/2-5)),rowH=2*r+44;let g='',y=y0;
    rows.forEach(([i0,i1],k)=>{g+=RD.t(x0,y+12,k?'slow pairs 7 to 15: only a wedge seen, red past 256':'fast pairs 0 to 6: a full turn within 256 tokens',{fill:k?css('--bad'):'var(--ink)',w:600});
      for(let i=i0;i<i1;i++){const cx=x0+(i-i0+.5)*cw,cy=y+22+r,s=seen[i],full=s>=TAU-1e-9,ang=(DIST*inv[i])%TAU,bad=!full&&ang>s*(1+1e-9);
        g+='<circle cx="'+cx.toFixed(1)+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="var(--line)" stroke-width="1.4"/>';
        if(full)g+='<circle cx="'+cx.toFixed(1)+'" cy="'+cy+'" r="'+(r-2)+'" fill="'+css('--c1')+'" opacity=".2"/>';
        else{const x2=cx+(r-2)*Math.cos(s),y2=cy-(r-2)*Math.sin(s);g+='<path d="M'+cx.toFixed(1)+' '+cy+'L'+(cx+r-2).toFixed(1)+' '+cy+'A'+(r-2)+' '+(r-2)+' 0 '+(s>Math.PI?1:0)+' 0 '+x2.toFixed(2)+' '+y2.toFixed(2)+'Z" fill="'+css('--good')+'" opacity=".3"/>'}
        g+='<line x1="'+cx.toFixed(1)+'" y1="'+cy+'" x2="'+(cx+r*Math.cos(ang)).toFixed(2)+'" y2="'+(cy-r*Math.sin(ang)).toFixed(2)+'" stroke="'+(bad?css('--bad'):css('--c1'))+'" stroke-width="2.2" stroke-linecap="round"/>';
        g+=RD.t(cx,cy+r+13,wl(inv[i]),{a:'middle',fill:'var(--mute)'})}
      y+=rowH});
    return {g,h:y-y0}}
  function draw(){const el=$('pe-hero'),W=RD.width(el),wide=W>=640;let g='',H;
    if(wide){const lw=230,c=clocks(lw+16,4,W-lw-16);H=Math.max(c.h+8,230);g=pairPanel(0,0,lw,H)+c.g+'<line x1="'+(lw+6)+'" x2="'+(lw+6)+'" y1="8" y2="'+(H-8)+'" stroke="var(--line)"/>'}
    else{const ph=200,c=clocks(0,ph+6,W);H=ph+6+c.h+4;g=pairPanel(0,0,W,ph)+c.g}
    el.innerHTML=RD.svg(W,H,g,'RoPE: one pair rotated, and the tiny GPT\'s 16 pairs as clocks, fast and slow, at distance 300')}
  RD.onRender(draw);RD.onResize(draw);draw();
})();
