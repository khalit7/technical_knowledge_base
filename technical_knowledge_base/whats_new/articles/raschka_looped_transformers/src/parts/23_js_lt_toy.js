// ---- The widget: passes and cache arrangement on Nanbeige4.2-3B's config; what it costs and how deep a hidden path can get. ----
// A widget, not an animation (no autoplay): two segmented controls, an SVG redrawn at the card's width, and a stat row.
// All numbers come from window.ARTICLE.recompute (src/recompute.py); check_page.mjs compares the stat row with that file.
(function(){
  if(!window.RD||!window.ARTICLE||!ARTICLE.recompute||!document.getElementById('lt-toysvg'))return;
  const $=id=>document.getElementById(id), t=RD.t, R=ARTICLE.recompute, L=R.config.num_hidden_layers, T=4;
  let r=2, mode='per';
  const fmt=n=>n.toLocaleString('en-GB');
  const NAME={per:'a cache per pass',first:'one cache, written by pass 1',rec:'recurrent: every pass reads the last pass'};
  function line(x1,y1,x2,y2,c,w,op,dash,mk){return '<path d="M'+x1+' '+y1+' L'+x2+' '+y2+'" fill="none" stroke="'+c+'" stroke-width="'+w+'" stroke-opacity="'+op+'"'+(dash?' stroke-dasharray="4 3"':'')+(mk?' marker-end="url(#'+mk+')"':'')+'/>'}
  function draw(){
    const el=$('lt-toysvg'), W=RD.width(el), nar=W<460;
    const row=R.rows.find(x=>x.r===r&&x.mode===mode);
    const lab=nar?40:54, top=22, bot=34, colW=nar?26:34;
    const stackH=Math.min(200,Math.max(130,r*30)), ph=stackH/r;
    const xs=[...Array(T)].map((_,i)=>lab+10+i*((W-lab-20-colW)/(T-1)));
    const yb=top+stackH, H=yb+bot;
    let s='';
    // pass labels at the left
    for(let j=0;j<r;j++){if(r>4&&j>0&&j<r-1)continue;s+=t(lab,yb-(j+0.5)*ph+4,(nar?'p':'pass ')+(j+1),{fs:12,a:'end',fill:'var(--mute)'})}
    // cross-token cache edges, drawn first (under the stacks)
    for(let i=0;i<T-1;i++){
      const xa=xs[i]+colW, xb=xs[i+1];
      for(let j=0;j<r;j++){
        const yb_=yb-(j+0.5)*ph;
        if(mode==='per') s+=line(xa,yb_,xb-2,yb_,'var(--c1)',1.3,0.75,false,'lt-a1');
        else if(mode==='first') s+=line(xa,yb-0.5*ph,xb-2,yb_,'var(--c1)',1.2,j===0?0.8:0.45,false,'lt-a1');
        else s+=line(xa,yb-(r-0.5)*ph,xb-2,yb_,j===0?'var(--c2)':'var(--c1)',j===0?2:1.1,j===0?0.95:0.4,false,j===0?'lt-a2':'lt-a1');
      }
      // the written token: from the top of token i to the bottom of token i+1
      s+='<path d="M'+(xs[i]+colW/2)+' '+(top-2)+' C'+(xs[i]+colW/2)+' '+(top-16)+' '+(xs[i+1]+colW/2)+' '+(yb+22)+' '+(xs[i+1]+colW/2)+' '+(yb+3)+'" fill="none" stroke="var(--mute)" stroke-width="1.3" stroke-dasharray="4 3" stroke-opacity=".9"/>';
    }
    // the stacks: one bar per pass, each bar the same 22 blocks
    xs.forEach((x,i)=>{for(let j=0;j<r;j++){const y=yb-(j+1)*ph;s+='<rect x="'+x+'" y="'+(y+1)+'" width="'+colW+'" height="'+(ph-2)+'" rx="3" fill="var(--c3)" fill-opacity="'+(j===0?0.85:0.5)+'"/>'}
      s+=t(x+colW/2,yb+16,(nar?'t':'token ')+(i+1),{fs:12,a:'middle',fill:'var(--mute)'})});
    // the longest hidden path
    const px=x=>x+colW/2;
    let p='';
    if(mode==='rec'&&r>1){p='M'+px(xs[0])+' '+(yb-2);xs.forEach((x,i)=>{p+=' L'+px(x)+' '+(top+ph*0.5);if(i<T-1)p+=' L'+(xs[i+1]+colW*0.2)+' '+(yb-0.5*ph)+' L'+px(xs[i+1])+' '+(yb-0.5*ph)})}
    else p='M'+px(xs[T-1])+' '+(yb-2)+' L'+px(xs[T-1])+' '+(top+2);
    s+='<path d="'+p+'" fill="none" stroke="var(--c2)" stroke-width="3" stroke-linejoin="round" stroke-opacity=".9"/>';
    const defs='<defs><marker id="lt-a1" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8z" fill="var(--c1)"/></marker><marker id="lt-a2" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="var(--c2)"/></marker></defs>';
    el.innerHTML=RD.svg(W,H,defs+s,'Four tokens, each run through '+r+' passes of the same '+L+' blocks; arrows show which pass reads the keys each earlier token wrote ('+NAME[mode]+'); the thick line is the longest path that never passes through a written token');
    // the numbers
    const gb=x=>(x/1e9).toFixed(2)+' GB', gib=x=>(x/2**30).toFixed(1)+' GiB';
    const st=[
      ['weights (bf16)', gb(row.weights_bytes), r>1?'unlooped, same depth: '+gb(row.distinct_weights_bytes):'no looping'],
      ['compute per token', (row.flops_per_token/1e9).toFixed(1)+' GFLOP', 'matrix work, grows with passes'],
      ['KV cache per token', fmt(row.kv_bytes_per_token/1024)+' KiB', gib(row.kv_bytes_128k)+' at 128K tokens'],
      ['hidden depth, 1 token', fmt(row.depth_one_token), 'block applications'],
      ['hidden depth, 1,000 tokens', fmt(row.depth_1000_tokens), mode==='rec'&&r>1?'grows with the answer':'bounded, whatever the length']
    ];
    $('lt-toyout').innerHTML=st.map(x=>'<div class="stat"><div class="k">'+x[0]+'</div><div class="v">'+x[1]+'</div><div class="d">'+x[2]+'</div></div>').join('');
    $('lt-mode').textContent=NAME[mode]; $('lt-rv').textContent=r;
  }
  RD.seg($('lt-r'),m=>{r=+m;draw()});
  RD.seg($('lt-m'),m=>{mode=m;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
