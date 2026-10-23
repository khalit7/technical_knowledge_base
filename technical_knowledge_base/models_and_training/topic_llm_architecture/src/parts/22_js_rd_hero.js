// ---- Reading tab hero: the decoder block as a map, each part a link to the child page that owns it ----
// Static annotated diagram (no motion), drawn at the measured width so labels never shrink or clip.
(function(){
  const host=document.getElementById('rd-hero-svg');if(!host||!window.RD)return;
  const N='https://app.notion.com/p/';
  const P={tok:'3c65c17b0d0d817187bcd94a1b0f15ea',av:'3fd5c17b0d0d8120859ecc2d0236e846',pe:'3c65c17b0d0d81a5b7c9e578fcdfac00',
    lc:'3fd5c17b0d0d81059ee1ce20c0326dc5',ba:'3fd5c17b0d0d8142bc9ecac1fc366966',moe:'3fd5c17b0d0d81fda06bf955af7c2b58',
    nrm:'3fd5c17b0d0d8163b50dc5e9d9240e89',fam:'3fd5c17b0d0d8105b616c17c1439f766'};
  const t=RD.t;
  const link=(id,title,body)=>'<a href="'+N+id+'" target="_blank" rel="noopener noreferrer" aria-label="'+title+'"><title>'+title+'</title>'+body+'</a>';
  // a box: coloured stripe on the left, a bold title, an optional second line, a page name on the right when there is room
  function box(x,y,w,h,c,title,sub,page){
    let g='<rect class="bx" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="7" fill="var(--bg)" stroke="var(--line)"/>'+
      '<rect x="'+x+'" y="'+y+'" width="5" height="'+h+'" rx="2" fill="var('+c+')"/>';
    g+=t(x+13,y+(sub?17:h/2+4.5),title,{fs:13,w:600});
    if(sub)g+=t(x+13,y+33,sub,{fs:11.5,fill:'var(--mute)'});
    if(page)g+=t(x+w-8,y+(sub?17:h/2+4.5),page+' ↗',{fs:11,a:'end',fill:'var(--acc)'});
    return g;
  }
  function chip(x,y,w,c,label,page){
    return '<rect class="bx" x="'+x+'" y="'+y+'" width="'+w+'" height="38" rx="6" fill="var(--soft)" stroke="var(--line)"/>'+
      '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="4" rx="2" fill="var('+c+')"/>'+
      t(x+w/2,y+19,label,{fs:11.5,a:'middle',w:600})+t(x+w/2,y+32,page+' ↗',{fs:11,a:'middle',fill:'var(--acc)'});
  }
  function draw(){
    const W=Math.min(RD.width(host),780),narrow=W<560;
    const rail=22,x0=44,x1=W-4,bw=x1-x0;
    let y=4,g='';
    const arrow=(xa,ya,yb)=>'<line x1="'+xa+'" y1="'+ya+'" x2="'+xa+'" y2="'+(yb-5)+'" stroke="var(--mute)" stroke-width="1.5"/><path d="M'+(xa-4)+' '+(yb-7)+' L'+xa+' '+yb+' L'+(xa+4)+' '+(yb-7)+'" fill="var(--mute)"/>';
    const plus=(yy)=>'<circle cx="'+rail+'" cy="'+yy+'" r="9" fill="var(--bg)" stroke="var(--ink)" stroke-width="1.5"/>'+t(rail,yy+4.5,'+',{fs:14,a:'middle',w:600});
    // input
    g+=link(P.tok,'Tokenizers',box(x0,y,bw,44,'--c1','Tokenizer and embedding',narrow?'text to ids; each id to d numbers':'text cut into ids (V of 100K to 260K); each id looks up d numbers','Tokenizers'));
    y+=44;g+=arrow(x0+bw/2,y,y+22);y+=22;
    // the block frame
    const by=y,inner=[];
    y+=26;
    const yRail0=y;
    // sublayer 1: norm, mixer
    const n1=y;g+=link(P.nrm,'Normalisation, residuals and stability',box(x0,y,bw,30,'--c4','Norm',null,narrow?'Normalisation':'Normalisation, residuals and stability'));
    y+=30;g+=arrow(x0+20,y,y+12);y+=12;
    const m=y,mh=narrow?140:96;
    g+='<rect x="'+x0+'" y="'+y+'" width="'+bw+'" height="'+mh+'" rx="7" fill="var(--bg)" stroke="var(--line)"/><rect x="'+x0+'" y="'+y+'" width="5" height="'+mh+'" rx="2" fill="var(--c2)"/>';
    g+=link(P.av,'Attention variants','<rect class="bx" x="'+(x0+6)+'" y="'+(y+2)+'" width="'+(bw-8)+'" height="40" rx="5" fill="transparent" stroke="transparent"/>'+
      t(x0+13,y+18,'Sequence mixer: attention',{fs:13,w:600})+t(x0+13,y+34,narrow?'reads earlier positions; GQA, MLA, sparse':'each position reads earlier ones: GQA, MQA, MLA, windows, sparse',{fs:11.5,fill:'var(--mute)'})+
      (narrow?'':t(x1-8,y+18,'Attention variants ↗',{fs:11,a:'end',fill:'var(--acc)'})));
    // three chips: position, cache, fixed state
    const cy=y+46,gap=6;
    if(narrow){
      const cw=(bw-13-8-gap)/2;
      g+=link(P.pe,'Positional Encodings',chip(x0+13,cy,cw,'--c5','position: RoPE','Positional'));
      g+=link(P.lc,'Long context',chip(x0+13+cw+gap,cy,cw,'--c6','KV cache grows','Long context'));
      g+=link(P.ba,'Beyond attention',chip(x0+13,cy+44,bw-13-8,'--c3','or a fixed recurrent state (SSM, hybrids)','Beyond attention'));
      g+=link(P.av,'Attention variants',t(x1-8,y+18,'↗',{fs:12,a:'end',fill:'var(--acc)'}));
    }else{
      const cw=(bw-13-8-2*gap)/3;
      g+=link(P.pe,'Positional Encodings',chip(x0+13,cy,cw,'--c5','position: RoPE on Q and K','Positional Encodings'));
      g+=link(P.lc,'Long context',chip(x0+13+cw+gap,cy,cw,'--c6','KV cache grows with context','Long context'));
      g+=link(P.ba,'Beyond attention',chip(x0+13+2*(cw+gap),cy,cw,'--c3','or a fixed recurrent state','Beyond attention'));
    }
    y+=mh;
    const p1=y+16;g+='<path d="M'+(x0+20)+' '+y+' L'+(x0+20)+' '+p1+' L'+(rail+10)+' '+p1+'" fill="none" stroke="var(--mute)" stroke-width="1.5"/>';
    g+='<path d="M'+(rail+10)+' '+(n1+15)+' L'+x0+' '+(n1+15)+'" fill="none" stroke="var(--mute)" stroke-width="1.5"/>';
    inner.push(p1);y=p1+16;
    // sublayer 2: norm, FFN
    const n2=y;g+=link(P.nrm,'Normalisation, residuals and stability',box(x0,y,bw,30,'--c4','Norm',null,narrow?'Normalisation':'Normalisation, residuals and stability'));
    g+='<path d="M'+(rail+10)+' '+(n2+15)+' L'+x0+' '+(n2+15)+'" fill="none" stroke="var(--mute)" stroke-width="1.5"/>';
    y+=30;g+=arrow(x0+20,y,y+12);y+=12;
    g+=link(P.moe,'Mixture of experts',box(x0,y,bw,44,'--c3','Feed-forward: SwiGLU, or MoE',narrow?'each position alone; top k of E experts':'each position on its own; MoE: a router picks k of E experts',narrow?'':'Mixture of experts'));
    if(narrow)g+=link(P.moe,'Mixture of experts',t(x1-8,y+17,'↗',{fs:12,a:'end',fill:'var(--acc)'}));
    y+=44;
    const p2=y+16;g+='<path d="M'+(x0+20)+' '+y+' L'+(x0+20)+' '+p2+' L'+(rail+10)+' '+p2+'" fill="none" stroke="var(--mute)" stroke-width="1.5"/>';
    inner.push(p2);y=p2+14;
    // frame and rail
    const fh=y-by;
    g='<rect x="2" y="'+by+'" width="'+(W-4)+'" height="'+fh+'" rx="10" fill="none" stroke="var(--mute)" stroke-dasharray="5 4"/>'+
      t(x0,by+17,narrow?'× L blocks (32 in Llama 3.1 8B)':'× L identical blocks (32 in Llama 3.1 8B, 61 in DeepSeek-V3)',{fs:12,w:600,fill:'var(--mute)'})+g;
    g+='<line x1="'+rail+'" y1="'+(by-22)+'" x2="'+rail+'" y2="'+(y+22)+'" stroke="var(--ink)" stroke-width="3"/>';
    inner.forEach(v=>{g+=plus(v)});
    g+='<text x="'+(rail-12)+'" y="'+(by+fh/2)+'" font-size="11" fill="var(--mute)" text-anchor="middle" transform="rotate(-90 '+(rail-12)+' '+(by+fh/2)+')">residual stream</text>';
    y+=22;g+=arrow(x0+bw/2,y-22,y);
    // output
    g+=link(P.fam,'Families and objectives',box(x0,y,bw,44,'--c1','Final norm, unembed, softmax',narrow?'next-token probabilities':'one probability per vocabulary entry for the next token',narrow?'Families':'Families and objectives'));
    y+=44;
    const H=y+4;
    host.innerHTML=RD.svg(W,H,g,'The decoder block as a map: tokenizer and embedding, then L blocks of norm, sequence mixer (attention with position and a KV cache, or a recurrent state) and norm, feed-forward or mixture of experts, each added back to the residual stream, then the final norm and unembedding. Each part links to the child page that owns it.');
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();
