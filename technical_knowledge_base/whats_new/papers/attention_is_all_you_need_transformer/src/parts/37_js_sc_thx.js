// ---- Scene: Then and now. One decoder layer of the 2017 base model becomes a 2026 decoder-only block, one sourced change per step (renderer v2) ----
// The layer is drawn as its stack of sub-layers, bottom to top in the order data flows; each step changes one part and the rest recedes.
// Every count is computed here from the formulas under the step list (d = 512, heads of 64), as the old 2D morph did.
(function(){
  if(!document.getElementById('stg-thx'))return;const {at,off,lerp,mix}=S3;
  // the design after each step (the step list in 06_then.html explains each one)
  const C=[{enc:1,cross:1,pre:0,rms:0,rope:0,glu:0,kv:8,bias:1}];
  [{enc:0,cross:0},{pre:1},{rms:1},{rope:1},{glu:1},{kv:2},{bias:0},{}].forEach(ch=>C.push(Object.assign({},C[C.length-1],ch)));
  const d=512,dh=64,fmt=v=>Math.round(v).toLocaleString('en-GB');
  function count(c){const att=kv=>2*d*d+2*d*kv*dh+(c.bias?2*d+2*kv*dh:0),ffn=c.glu?3*d*1365+(c.bias?2*1365+d:0):2*d*2048+(c.bias?2048+d:0),nrm=c.rms?d:2*d;
    const layer=att(c.kv)+ffn+(c.cross?att(8)+nrm:0)+2*nrm;return {layer,enc:c.enc?att(8)+ffn+2*nrm:0,kv:2*c.kv*dh,nrm}}
  // the numbers under each step of the list, recounted from that step's design
  [...document.querySelectorAll('#sx-thx .thn')].forEach((el,k)=>{const c=C[k],n=count(c),p=k?count(C[k-1]):null,dl=p?n.layer-p.layer:0;
    el.innerHTML='<br><span class="mono small">'+fmt(n.layer)+' parameters per decoder layer'+(k&&dl?' ('+(dl>0?'+':'−')+fmt(Math.abs(dl))+')':'')+(c.enc?'; encoder layer '+fmt(n.enc):'')+'; KV cache '+fmt(n.kv)+' numbers per token per layer; positions enter '+(c.rope?'inside every attention':'once, at the input')+'</span>'});
  // geometry: one decoder layer as a stack of slabs (x across, y up, z depth)
  const W=2.6,D=1.3,G=.3,XE=-3.3,EW=1.2,XR=W/2+.34,SH=.4;
  function lay(c){const L=[['emb',.26]];
    if(!c.pre){L.push(['attn',SH],['na',.1]);if(c.cross)L.push(['cross',SH],['nc',.1]);L.push(['ffn',SH],['nf',.1])}
    else L.push(['na',c.rms?.06:.1],['attn',SH],['nf',c.rms?.06:.1],['ffn',SH],['fn',c.rms?.06:.1]);
    L.push(['head',.26]);let y=0;const o={};L.forEach(([k,h])=>{o[k]={y,h};y+=h+G});o.top=y-G;
    const blk=c.pre?['na','ffn']:['attn','nf'];o.b0=o[blk[0]].y;o.b1=o[blk[1]].y+o[blk[1]].h;return o}
  // which parts each step is about; everything else recedes
  const HL=[null,{enc:1,cross:1,nc:1},{na:1,nf:1,fn:1,res:1},{na:1,nf:1,fn:1,nc:1},{emb:1,attn:1,rope:1},{ffn:1},{attn:1,heads:1},{bias:1},null];
  const A=(key,k)=>!HL[k]||HL[k][key]?1:k===4||k===6?.14:.3;
  function draw(R,k,e){const P=R.P,c1=C[k],c0=C[Math.max(0,k-1)],u=k===0?1:e,L0=lay(c0),L1=lay(c1);
    R.grid(-4.6,3,-1.9,1.9,.5);
    const fa=key=>k===0?A(key,0):lerp(A(key,k-1),A(key,k),e);
    // a part's place, morphing from the last design to this one; parts that come or go fade
    const part=key=>{const a=L0[key],b=L1[key];if(!a&&!b)return null;if(a&&b)return {y:lerp(a.y,b.y,u),h:lerp(a.h,b.h,u),a:1,sw:c0.pre!==c1.pre&&(key==='na'||key==='nf')?Math.sin(Math.PI*u):0};
      return b?{y:b.y,h:b.h,a:u,sw:0}:{y:a.y,h:a.h,a:1-u,sw:0}};
    const nm=c=>c.rms?'RMSNorm':'LayerNorm',normFill=t=>mix(P.paper,t?P.c5:P.mute,t?.38:.22);
    const rmsT=c0.rms===c1.rms?c1.rms:u,biasA=c0.bias===c1.bias?c1.bias:1-u,ropeA=c0.rope===c1.rope?c1.rope:u,gluT=c0.glu===c1.glu?c1.glu:u,kvT=c0.kv===c1.kv?(c1.kv<8?1:0):u;
    const lab=(y,t,col,a)=>R.label([XR+.25,y,0],t,{al:'left',dx:8,mono:true,fs:12,c:col,a,grp:'L'});
    const studs=[];// bias studs: [x,y,z]
    // token embedding, with the sinusoids drawn on its front edge until RoPE moves positions inside attention
    {const p=part('emb'),a=fa('emb');R.box([0,p.y,0],[W,p.h,D],{fill:mix(P.paper,P.c5,.3),a});
      const sa=a*(1-ropeA);if(sa>.01){const pts=[];for(let i=0;i<=60;i++){const x=-W/2+.12+(W-.24)*i/60;pts.push([x,p.y+p.h+.07+.05*Math.sin(i/60*Math.PI*6),D/2])}R.line(pts,{c:P.c5,w:2,a:sa})}
      lab(p.y+p.h/2,'token embedding'+(ropeA<.5?' + sinusoids':''),P.c5,a)}
    // norms: LayerNorm (gain and bias) becomes RMSNorm (gain only, drawn thinner); pre-LN swings each one out and down past its sub-layer
    ['na','nc','nf','fn'].forEach(key=>{const p=part(key);if(!p)return;const a=fa(key)*p.a,z=p.sw*1.25;
      R.box([0,p.y,z],[W*.96,p.h,D*.96],{fill:normFill(rmsT>.5),a});if(key!=='fn')studs.push([[W/2-.22,p.y+p.h,-D/2+.2+z],a]);
      lab(p.y+p.h/2,(key==='fn'?'final ':(c1.pre?'':'add & '))+nm(rmsT>.5?{rms:1}:{}),rmsT>.5?P.c5:P.mute,a)});
    // attention: a slab with its heads standing on it, query heads in front, key-value heads behind
    {const p=part('attn'),a=fa('attn'),top=p.y+SH;R.box([0,p.y,0],[W,SH,D],{fill:mix(P.paper,P.c1,.34),a});studs.push([[W/2-.22,top,-D/2+.2],a]);
      const ha=Math.max(a,fa('heads')),hx=i=>-W/2+.45+i*(W-.9)/7,zq=.38,zk=-.36;
      for(let i=0;i<8;i++){R.box([hx(i),top,zq],[.17,.24,.17],{fill:mix(P.paper,P.q,.75),a:ha,shadow:false});
        const g=Math.floor(i/4),gx=(hx(4*g)+hx(4*g+3))/2,x=lerp(hx(i),gx,kvT),ka=ha*(i%4===0?1:1-kvT);
        R.box([x,top,zk],[.17+.2*kvT*(i%4===0),.24,.17+.1*kvT*(i%4===0)],{fill:mix(P.paper,P.k,.75),a:ka,shadow:false})}
      // grouped-query attention: every query head reads its group's shared key-value head
      if(c1.kv<8&&k>=6){const fa2=k===6?Math.min(1,e*1.4):.6*ha;for(let i=0;i<8;i++){const g=Math.floor(i/4),gx=(hx(4*g)+hx(4*g+3))/2;R.flowArc([hx(i),top+.26,zq],[gx,top+.26,zk],.18,{c:P.q,a:fa2,r:.04,n:4,speed:.8})}}
      // RoPE: each query and key rotated by an angle set by its position, inside every attention
      if(ropeA>.01)for(let i=0;i<8;i++){[[hx(i),zq],[lerp(hx(i),(hx(4*Math.floor(i/4))+hx(4*Math.floor(i/4)+3))/2,kvT),zk]].forEach(([x,z],j)=>{if(j&&i%4&&kvT>.5)return;const r=.15,pts=[];for(let s=0;s<=20;s++){const t=s/20*Math.PI*1.6+.4;pts.push([x+r*Math.cos(t),top+.3,z+r*Math.sin(t)])}
          R.line(pts,{c:P.acc,w:1.6,a:ha*ropeA,head:5})})}
      lab(p.y+SH/2,((k===0||e>=.5?c1:c0).cross?'masked':'causal')+' self-attention'+(ropeA>.5?' + RoPE':''),P.c1,a)}
    // cross-attention and the encoder that feeds it (gone at step 2)
    {const p=part('cross');if(p){const a=fa('cross')*p.a;R.box([0,p.y,0],[W,SH,D],{fill:mix(P.paper,P.c4,.32),a});studs.push([[W/2-.22,p.y+SH,-D/2+.2],a]);lab(p.y+SH/2,'cross-attention · k, v from the encoder',P.c4,a);
      const ea=fa('enc')*p.a,eh=L0.b1;R.box([XE,0,0],[EW,eh,D],{fill:mix(P.paper,P.c4,.18),a:ea});
      R.label([XE,eh,0],'Encoder × 6',{fs:13,serif:true,b:1,dy:-14,a:ea});
      R.flow([[XE+EW/2,p.y+SH/2,0],[-W/2,p.y+SH/2,0]],{c:P.c4,a:ea*.9,r:.06,speed:.9})}}
    // the FFN: its hidden layer drawn in depth (inner size 2,048 against 512); SwiGLU splits it into a gate and an up projection, each 1,365 deep
    {const p=part('ffn'),a=fa('ffn'),d0=D*2048/1280,d1=D*1365/1280;
      if(gluT<1)R.box([0,p.y,0],[W,SH,d0],{fill:mix(P.paper,P.c3,.34),a:a*(1-gluT)});
      if(gluT>0)[-1,1].forEach(s=>R.box([s*W*.26,p.y,0],[W*.46,SH,d1],{fill:mix(P.paper,P.c3,s<0?.5:.3),a:a*gluT}));
      if(gluT>.5)R.ball([0,p.y+SH/2,d1/2+.05],.07,{c:P.c3,a:a*gluT});
      studs.push([[W/2-.22,p.y+SH,-D/2+.2],a]);
      lab(p.y+SH/2,gluT>.5?'FFN, SwiGLU · 3 matrices, inner 1,365':'FFN, ReLU · 2 matrices, inner 2,048',P.c3,a)}
    // the output projection
    {const p=part('head'),a=fa('head');R.box([0,p.y,0],[W,p.h,D],{fill:mix(P.paper,P.c2,.22),a});lab(p.y+p.h/2,'linear + softmax',P.c2,a)}
    // biases: a small stud on every projection and on every LayerNorm, until step 8 removes them all
    const ba=biasA*(HL[k]&&HL[k].bias?1:Math.max(.35,fa('bias')));studs.forEach(([q,a0])=>{R.box(q,[.13,.13,.13],{fill:mix(P.paper,P.ink,.18),a:Math.min(a0+(k===7?1:0),1)*ba,shadow:false});if(k===7)R.glow([q[0],q[1]+.07,q[2]],.3,{c:P.bad,a:(1-e)*.9})});
    // the residual path: post-LN adds then normalises after each sub-layer; pre-LN keeps one clean stream from input to output
    {const ra=fa('res'),post=1-(c0.pre===c1.pre?c1.pre:u),pre=1-post;
      if(post>.01)[['attn','na'],['cross','nc'],['ffn','nf']].forEach(([s,n])=>{const ps=part(s),pn=part(n);if(!ps||!pn)return;const a=ra*post*Math.min(ps.a,pn.a),y0=ps.y-.05,y1=pn.y+pn.h/2;
        const pts=[[W/2,y0,0],[XR,y0,0],[XR,y1,0],[W/2*.96,y1,0]];R.line(pts,{c:P.acc,w:1.8,a:a*.8,head:6});R.flow(pts,{c:P.acc,a,r:.05,speed:.7,n:4})});
      if(pre>.01){const pe=part('emb'),pf=part('fn'),y0=pe.y+pe.h,y1=pf.y+pf.h/2,a=ra*pre;R.line([[XR,y0,0],[XR,y1,0],[W/2*.96,y1,0]],{c:P.acc,w:2.2,a:a*.85,head:6});R.flow([[XR,y0,0],[XR,y1,0]],{c:P.acc,a,r:.06,speed:.8});
        [['na','attn'],['nf','ffn']].forEach(([n,s])=>{const pn=part(n),ps=part(s);R.line([[XR,pn.y+pn.h/2,0],[W/2*.96,pn.y+pn.h/2,0]],{c:P.acc,w:1.4,a:a*.7,head:5});R.line([[W/2,ps.y+SH*.8,0],[XR,ps.y+SH*.8,0]],{c:P.acc,w:1.4,a:a*.7,head:5});R.ball([XR,ps.y+SH*.8,0],.06,{c:P.acc,a})})}}
    // the repeated block and the count
    {const b0=lerp(L0.b0,L1.b0,u),b1=lerp(L0.b1,L1.b1,u),x=-W/2-.3;R.line([[x+.12,b0,D/2],[x,b0,D/2],[x,b1,D/2],[x+.12,b1,D/2]],{c:P.mute,w:1.3,a:.8});
      R.label([x,(b0+b1)/2,D/2],'× N',{mono:true,fs:12,al:'right',dx:-6,c:P.mute});
      const n=count(k===0||e>=.5?c1:c0);R.label([0,lerp(L0.top,L1.top,u)+.05,-D/2],fmt(n.layer)+' parameters per layer',{mono:true,fs:12.5,b:1,dy:-16});
      lab(L1.attn.y+SH+.3,'heads: 8 query, '+(kvT>.5?2:8)+' KV · cache '+fmt(n.kv)+' / token',P.k,Math.max(fa('attn'),fa('heads')))}
  }
  const full={cam:[.5,.36],bounds:[[-3.9,0,-1.1],[1.9,4.7,1.1]]},near={cam:[.55,.36],bounds:[[-1.8,0,-1.1],[1.9,3.8,1.1]]};
  S3.stage({id:'stg-thx',list:'sx-thx',fig:'Then and now · one decoder layer, 2017 to 2026',cam:full.cam,bounds:full.bounds,aspect:.9,dur:1500,hold:5200,draw,
    margin:w=>w<520?[22,10,12,10]:[24,215,14,14],
    // the encoder leaves at step 2; from then on the camera keeps to the decoder layer
    view:k=>k===0?full:k===4||k===6?{cam:[.75,.62],bounds:[[-1.6,.55,-1],[1.9,1.75,1]]}:near});
})();
