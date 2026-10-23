// Reading tab figures added on 2026-10-23 (teaching contract): hero, embedding, one-head stepper, head split, FFN to scale,
// pre-norm block, shifted targets, KV-cache before/after stepper, one block's matrices to scale.
// Numbers: TZD (recorded runs) and fact placeholders filled at build time by fill.py from page_text.json; nothing is invented.
(function(){
  if(!window.TZD||!window.RD)return;
  const D=window.TZD,$=id=>document.getElementById(id),esc=RD.esc,T=RD.t;
  const num=s=>+String(s).replace(/,/g,'');
  const f0=n=>Math.round(n).toLocaleString('en-US');
  // wrap a string to lines of at most n characters
  function wrap(s,n){const w=String(s).split(' '),out=[];let l='';w.forEach(x=>{if(l&&(l+' '+x).length>n){out.push(l);l=x}else l=l?l+' '+x:x});if(l)out.push(l);return out}
  const rect=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(0,w).toFixed(1)+'" height="'+Math.max(0,h).toFixed(1)+'" rx="'+(o.rx==null?5:o.rx)+'" fill="'+(o.fill||'none')+'"'+(o.op!=null?' fill-opacity="'+o.op+'"':'')+' stroke="'+(o.stroke||'var(--line)')+'"'+(o.sw?' stroke-width="'+o.sw+'"':'')+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+'/>'};
  const line=(x1,y1,x2,y2,o)=>{o=o||{};return '<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="'+(o.stroke||'var(--mute)')+'" stroke-width="'+(o.sw||1.4)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+(o.arrow?' marker-end="url(#tz-ar)"':'')+'/>'};
  const defs='<defs><marker id="tz-ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--mute)"/></marker></defs>';
  const ablv=k=>{const a=D.abl.find(x=>x.key===k);return a?a.val.toFixed(3):'n/a'};
  const piece=i=>i===0?'<|endoftext|>':(D.pieces[i]||'').replace(/\n/g,'↵');

  // ---------------------------------------------------------------- hero: the tiny GPT end to end
  function hero(){
    const host=$('tz-hero');if(!host)return;
    const W=Math.min(RD.width(host),700),narrow=W<520,cw=narrow?6.1:6.3;
    const fx=2,fw=W-4,sx=22,bx=narrow?52:64,bw=W-bx-4;
    let g=defs,y=4;
    // a box: title, detail lines, ablation tags (orange); returns its height
    function box(x,w,o){
      const n=Math.floor((w-14)/cw);let ls=[];
      wrap(o.title,n).forEach(s=>ls.push([s,'t']));(o.lines||[]).forEach(l=>wrap(l,n).forEach(s=>ls.push([s,'d'])));(o.tags||[]).forEach(l=>wrap(l,n).forEach(s=>ls.push([s,'a'])));
      const h=10+ls.length*15;
      let b=rect(x,y,w,h,{fill:'var('+o.col+')',op:0.13,stroke:'var('+o.col+')'});
      ls.forEach((l,i)=>{b+=T(x+8,y+17+i*15,esc(l[0]),{fs:l[1]==='t'?12:11,w:l[1]==='t'?600:null,fill:l[1]==='a'?'var(--bad)':l[1]==='d'?'var(--mute)':null})});
      g+='<a href="#'+o.sec+'" aria-label="'+esc(o.title)+'">'+b+'</a>';return h}
    const arrow=()=>{g+=line(W/2,y,W/2,y+14,{arrow:true});y+=16};
    y+=box(fx,fw,{sec:'tz-s1',col:'--c5',title:'Token ids of the running sequence',lines:['(1, 256) = (B, T)']});arrow();
    y+=box(fx,fw,{sec:'tz-s2',col:'--c5',title:'Embedding: token table plus position table',lines:['4,096 x 256 = 1,048,576 and 256 x 256 = 65,536 parameters; (1, 256) to (1, 256, 256) = (B, T, D)'],tags:['without positions: '+ablv('nopos')]});arrow();
    // the block frame with the residual stream
    const fy=y;y+=24;
    function sub(o){
      const top=y,h0=box(bx,bw,o),bot=top+h0;
      // branch: stream to a LayerNorm pill to the box; return: box to the add on the stream
      const by=top+13,pw=26,px=sx+(bx-sx-pw)/2;
      g+=line(sx,by,px,by)+rect(px,by-8,pw,16,{fill:'var(--c4)',op:0.25,stroke:'var(--c4)',rx:4})+T(px+pw/2,by+4,'LN',{a:'middle',fs:11})+line(px+pw,by,bx-1,by,{arrow:true});
      const ry=bot-9;g+=line(bx,ry,sx+8,ry,{arrow:true})+'<circle cx="'+sx+'" cy="'+ry+'" r="7" fill="var(--bg)" stroke="var(--ink)" stroke-width="1.4"/>'+T(sx,ry+4,'+',{a:'middle',fs:12,w:600});
      y=bot+12;return ry}
    sub({sec:'tz-s3',col:'--c1',title:'Attention: 8 heads of hd = 32',lines:['q, k, v, o: 4 x 256 x 256 = 262,144 parameters','scores (1, 8, 256, 256); out (1, 256, 256)'],tags:['without attention: '+ablv('noattn')+' (the bigram floor)','one head: '+ablv('1head')+', seed 1: '+ablv('1head_s1')]});
    sub({sec:'tz-s5',col:'--c3',title:'Feed-forward: 256 to 1,024 to 256, GELU',lines:['2 x 256 x 1,024 = 524,288 parameters, each position on its own'],tags:['without the FFN: '+ablv('noffn')+' (also 54% fewer parameters)']});
    const tl=wrap('Residual stream (1, 256, 256): without the residual sum '+ablv('noresid')+' (unigram level), without the norms '+ablv('nonorm'),Math.floor((fw-16)/cw));
    tl.forEach((l,i)=>{g+=T(fx+8,y+8+i*14,esc(l),{fs:11,fill:'var(--bad)'})});y+=tl.length*14+4;
    g+=rect(fx,fy,fw,y-fy,{stroke:'var(--mute)',dash:'5 4',rx:8})+T(fx+8,fy+16,narrow?'Block x 6 (L), 786,944 parameters each':'Block x 6 (L), 786,944 parameters each: the stream runs straight through',{fs:11.5,w:600});
    g+=line(sx,fy+22,sx,y-tl.length*14-8,{stroke:'var(--ink)',sw:2.2});
    y+=2;arrow();
    y+=box(fx,fw,{sec:'tz-s6',col:'--c4',title:'Final LayerNorm',lines:['256 gains']});arrow();
    y+=box(fx,fw,{sec:'tz-s7',col:'--c5',title:'Unembedding: the token table again (tied)',lines:['0 new parameters; (1, 256, 256) to logits (1, 256, 4,096) = (B, T, V)']});arrow();
    y+=box(fx,fw,{sec:'tz-s7',col:'--c6',title:'Cross-entropy against the next token',lines:['untrained [[f:loss0|f3]], next to ln 4,096 = 8.318; trained [[f:loss_trained|f3]] nats per token']});
    host.innerHTML=RD.svg(W,y+4,g,'The tiny GPT end to end with shapes, parameters and ablation results');
  }

  // ---------------------------------------------------------------- embedding: two lookups and a sum
  function emb(){
    const host=$('tz-emb');if(!host)return;
    const W=Math.min(RD.width(host),700),narrow=W<520;
    const lab=narrow?64:92,cell=Math.max(5,Math.min(11,Math.floor((W-lab-40)/3/12))),n=12,vw=n*cell,gap=(W-lab-3*vw)/3;
    const xs=[lab,lab+vw+gap,lab+2*(vw+gap)];
    // the same token row twice; two different position rows; the sums differ
    const tok=[.6,-.2,.9,.1,-.7,.3,.5,-.4,.2,.8,-.1,.4],p20=[.3,.5,-.6,.2,.1,-.8,.4,.6,-.3,.1,.7,-.2],p25=[-.5,.2,.4,-.7,.6,.1,-.3,.2,.8,-.4,.1,.5];
    const col=v=>v>=0?'var(--c1)':'var(--c2)';
    function vec(x,y,vals){let b='';vals.forEach((v,i)=>{b+=rect(x+i*cell,y,cell-1,cell*1.6,{fill:col(v),op:Math.min(.9,.15+Math.abs(v)*.7),stroke:'none',rx:1})});return b}
    let g=defs,y=16;
    g+=T(xs[0],y,'token " R" (row of 4,096 x 256)',{fs:11,fill:'var(--mute)'})+T(xs[1],y,'position row',{fs:11,fill:'var(--mute)'})+T(xs[2],y,'sum: what block 1 reads',{fs:11,fill:'var(--mute)'});
    if(narrow){g='';y=16;g+=defs+T(xs[0],y,'token " R"',{fs:11,fill:'var(--mute)'})+T(xs[1],y,'position',{fs:11,fill:'var(--mute)'})+T(xs[2],y,'sum',{fs:11,fill:'var(--mute)'})}
    [[20,p20],[25,p25]].forEach(([pos,pv],r)=>{
      const yy=y+12+r*(cell*1.6+20);
      g+=T(4,yy+cell*1.2,'position '+pos,{fs:11,w:600});
      g+=vec(xs[0],yy,tok)+T(xs[0]+vw+gap/2,yy+cell*1.2,'+',{a:'middle',fs:14,w:600})+vec(xs[1],yy,pv)+T(xs[1]+vw+gap/2,yy+cell*1.2,'=',{a:'middle',fs:14,w:600})+vec(xs[2],yy,tok.map((v,i)=>v+pv[i]));
    });
    const yb=y+12+2*(cell*1.6+20);
    g+=T(xs[0],yb+4,'identical rows (difference 0.0)',{fs:11,fill:'var(--c1)'});
    g+=T(W-4,yb+4,'cosine 0.433',{a:'end',fs:11,fill:'var(--c1)'});
    const nt=wrap('Colours are illustrative (12 of 256 numbers); the two measured facts are the labels.',Math.floor((W-8)/6.2));
    nt.forEach((l,i)=>{g+=T(4,yb+22+i*14,l,{fs:11,fill:'var(--mute)'})});
    host.innerHTML=RD.svg(W,yb+22+nt.length*14,g,'The same token at positions 20 and 25 gives the same token row but different sums');
  }

  // ---------------------------------------------------------------- one head: score, mask, softmax, mix, edit test (stepper)
  const ATT_CAP=[
    ['1. Scores','Every query against every key: q<sub>i</sub>&middot;k<sub>j</sub> / &radic;hd, a (T, T) matrix; row i is token i against every token. Computed for all pairs, future included.'],
    ['2. Mask','Scores above the diagonal (key later than query) are set to minus infinity. Nothing is removed from the computation; the softmax will turn them into exact zeros.'],
    ['3. Softmax per row','Each row becomes weights that sum to 1 (measured: max |sum &minus; 1| = 2.4e-07); weights above the diagonal are exactly 0 (measured max 0.0). Row 0 has a single entry, so its weight is exactly 1.'],
    ['4. Mix the values','Output y<sub>i</sub> = &Sigma;<sub>j&le;i</sub> w<sub>ij</sub> v<sub>j</sub>: a weighted sum of the values of token i and the tokens before it (row 6 highlighted). The shape is (T, hd).'],
    ['5. Edit a later token','Change token 8: rows 0 to 7 read nothing from it, so their outputs cannot move. Measured on the running sequence: changing token 200 moves outputs 0 to 199 by exactly 0.0 and outputs 200 to 255 by up to 4.1e-04. One forward pass is therefore T valid next-token examples.']];
  function att(){
    const host=$('tz-att-svg');if(!host)return;
    const n=10;let st=0;
    function draw(i){
      st=i;const W=Math.min(RD.width(host),640),narrow=W<520,lab=narrow?62:84,c=Math.max(18,Math.min(30,Math.floor((W-lab-46)/n)));
      const x0=lab,y0=22;let g='';
      for(let j=0;j<n;j++)g+=T(x0+j*c+c/2,y0-8,j,{a:'middle',fs:11,fill:'var(--mute)'});
      g+=T(x0+n*c+6,y0-8,'keys',{fs:11,fill:'var(--mute)'});
      for(let r=0;r<n;r++){
        const lbl=r===0?'EOT':(piece(r).trim()||'␣');g+=T(x0-6,y0+r*c+c/2+4,esc(r+' '+(lbl.length>(narrow?6:9)?lbl.slice(0,narrow?6:9):lbl)),{a:'end',fs:11});
        for(let j=0;j<n;j++){
          const fut=j>r,x=x0+j*c,y=y0+r*c;let fill='var(--c1)',op=.22,txt='';
          if(i>=1&&fut){fill='var(--dim)';op=.5;txt=i===1?'−∞':'0'}
          if(i>=2&&!fut){op=.45;if(r===0)txt='1'}
          if(i===3){if(r===6&&!fut)op=.85;else if(!fut)op=.18}
          if(i===4){if(r<8&&!fut)op=.35;if(j===8&&!fut){fill='var(--bad)';op=.7}if(r>=8&&!fut&&j!==8){fill='var(--bad)';op=.35}}
          g+=rect(x+1,y+1,c-2,c-2,{fill,op,stroke:'none',rx:2});
          if(txt&&c>=20)g+=T(x+c/2,y+c/2+4,txt,{a:'middle',fs:11,fill:'var(--ink)'});
        }
        if(i>=2&&i<=3)g+=T(x0+n*c+6,y0+r*c+c/2+4,'Σ = 1',{fs:11,fill:'var(--mute)'});
        if(i===4)g+=T(x0+n*c+6,y0+r*c+c/2+4,r<8?'same':'moves',{fs:11,fill:r<8?'var(--good)':'var(--bad)'});
      }
      g+=T(4,y0-8,'queries',{fs:11,fill:'var(--mute)'});
      host.innerHTML=RD.svg(W,y0+n*c+6,g,'Causal attention weights for the first ten tokens, step '+(i+1));
      $('tz-att-cap').innerHTML='<div class="t">'+ATT_CAP[i][0]+' <span class="mute small">(step '+(i+1)+' of 5)</span></div><p>'+ATT_CAP[i][1]+'</p>';
    }
    RD.anim({card:'tz-att',ctl:'tz-att-ctl',n:5,draw,ms:2600,label:'Attention step'});
    RD.onResize(()=>draw(st));
  }

  // ---------------------------------------------------------------- many heads: split, attend, merge
  function heads(){
    const host=$('tz-heads');if(!host)return;
    const W=Math.min(RD.width(host),700),x0=4,bw=W-8,H=8,cols=['--c1','--c2','--c3','--c4','--c5','--c6','--c1','--c2'];
    let g=defs,y=4;const lh=14;
    function label(s){wrap(s,Math.floor(bw/6.2)).forEach(l=>{y+=lh;g+=T(x0,y,esc(l),{fs:11})});y+=5}
    function bar(gapw,mono){const sw=(bw-gapw*(H-1))/H;for(let h=0;h<H;h++){const x=x0+h*(sw+gapw);g+=rect(x,y,sw,18,{fill:'var('+(mono?'--mute':cols[h])+')',op:mono?.3:.45,stroke:'none',rx:2});if(sw>26&&!mono)g+=T(x+sw/2,y+13,'h'+h,{a:'middle',fs:11})}y+=18}
    function arrow(){g+=line(W/2,y+2,W/2,y+14,{arrow:true});y+=14}
    label('att.q(x): one (D, D) matmul computes all 8 heads’ queries, (1, 256, 256) = (B, T, D)');bar(0);arrow();
    label('.view(B, T, H, hd): split the 256 numbers into 8 heads of 32, (1, 256, 8, 32)');bar(6);arrow();
    label('.transpose(1, 2): heads before T, 8 independent (T, hd) problems, (1, 8, 256, 32)');
    {const sw=(bw-7*6)/8,sh=Math.min(54,sw*1.4);for(let h=0;h<H;h++){const x=x0+h*(sw+6);g+=rect(x,y,sw,sh,{fill:'var('+cols[h]+')',op:.35,stroke:'none',rx:2});if(sw>34)g+=T(x+sw/2,y+sh/2+4,'T x 32',{a:'middle',fs:11})}y+=sh}
    arrow();
    label('q @ k.transpose(-2, -1): 8 score matrices, (1, 8, 256, 256); mask, softmax, times v: (1, 8, 256, 32)');
    {const sw=(bw-7*6)/8,sh=Math.min(sw,48);for(let h=0;h<H;h++){const x=x0+h*(sw+6);g+=rect(x,y,sw,sh,{fill:'var('+cols[h]+')',op:.2,stroke:'var('+cols[h]+')',rx:2})+'<path d="M'+(x+1).toFixed(1)+','+(y+1).toFixed(1)+' L'+(x+1).toFixed(1)+','+(y+sh-1).toFixed(1)+' L'+(x+sw-1).toFixed(1)+','+(y+sh-1).toFixed(1)+' z" fill="var('+cols[h]+')" fill-opacity=".45"/>'}y+=sh}
    arrow();
    label('merge: .transpose(1, 2).reshape(B, T, D), heads side by side again, (1, 256, 256)');bar(0);arrow();
    label('att.o(y): W_o (D, D) mixes the heads, (1, 256, 256)');bar(0,true);
    host.innerHTML=RD.svg(W,y+4,g,'Shapes of one attention layer: split into heads, attend, merge');
  }

  // ---------------------------------------------------------------- FFN: two matrices or three, to scale
  const FFN={
    gelu:{mats:[['W_up','(1,024, 256)'],['W_down','(256, 1,024)']],r:4,flow:'x (D) to W_up (F = 1,024) to GELU to W_down (D)',p:'2 x 256 x 1,024 = 524,288 = 8 D²',
      cap:'The file’s FFN: two matrices of D x 4D. Every position goes through it on its own, so the hidden activation is (1, 256, 1,024) = (B, T, F).'},
    swi:{mats:[['W_g','(704, 256)'],['W_u','(704, 256)'],['W_d','(256, 704)']],r:2.75,flow:'x to W_g and W_u (F = 704), SiLU(gate) x up, to W_d (D)',p:'3 x 256 x 704 = 540,672 = 8.25 D² (3.1% more)',
      cap:'Config(swiglu=True): three matrices at F = 8/3 D, rounded up to a multiple of 32 (704), so the area stays within 3.1% of the GELU MLP (dashed outline).'},
    llama:{mats:[['gate','(14,336, 4,096)'],['up','(14,336, 4,096)'],['down','(4,096, 14,336)']],r:3.5,flow:'the same SwiGLU, at F = 14,336 = 3.5 D',p:'3 x 4,096 x 14,336 = 176,160,768 = 10.5 D²',
      cap:'Llama 3.1 8B, drawn in units of its own D = 4,096: three matrices of 3.5 D, 10.5 D² in all, wider than the equal-parameter 8/3 rule (config.json).'}};
  let ffnMode='gelu';
  function ffn(){
    const host=$('tz-ffn');if(!host)return;
    const W=Math.min(RD.width(host),700),narrow=W<520,m=FFN[ffnMode];
    const u=Math.min(narrow?26:34,(W-30)/(3*3.5+0.6)),gap=8;let g='',x=4,y=18;
    g+=T(4,12,esc(m.flow),{fs:11,fill:'var(--mute)'});
    // the GELU MLP's total area (8 D squared) as a dashed reference strip
    const refw=8*u+gap;
    m.mats.forEach(([nm,sh],i)=>{const w=m.r*u;g+=rect(x,y+8,w,u,{fill:'var(--c3)',op:.45,stroke:'var(--c3)',rx:2})+T(x+4,y+8+u+14,nm,{fs:11,w:600})+T(x+4,y+8+u+28,sh,{fs:11,fill:'var(--mute)'});x+=w+gap});
    g+=rect(4,y+u+48,refw,6,{fill:'none',stroke:'var(--mute)',dash:'4 3',rx:1})+T(4+refw+6,y+u+55,'8 D²',{fs:11,fill:'var(--mute)'});
    g+=T(4,y+u+76,esc(m.p),{fs:11.5,w:600});
    host.innerHTML=RD.svg(W,y+u+84,g,'Feed-forward weight matrices drawn to scale in units of D');
    $('tz-ffn-cap').textContent=m.cap+' Each bar is one weight matrix, height D and length F, so area is parameters.';
  }

  // ---------------------------------------------------------------- the pre-norm block
  function blk(){
    const host=$('tz-blk');if(!host)return;
    const W=Math.min(RD.width(host),700),narrow=W<520,sx=24,bx=narrow?70:86,bw=narrow?W-bx-4:Math.min(250,W*.36),ax=narrow?bx:bx+bw+14,aw=narrow?W-bx-4:W-ax-4;
    const nch=Math.floor(aw/6.1);let g=defs,y=6;
    function note(s,yy,x){const ls=wrap(s,nch);ls.forEach((l,i)=>{g+=T(x==null?ax:x,yy+i*14,esc(l),{fs:11,fill:'var(--mute)'})});return ls.length*14}
    y+=note('from the previous block: x (1, 256, 256); in block 1 the embeddings, standard deviation 0.02',y+10,narrow?sx+14:sx+14)+8;
    const st=y;
    function sub(name,par,notes,col){
      const top=y+8,h=40;
      g+=line(sx,top+12,bx-30,top+12)+rect(bx-30,top+4,24,16,{fill:'var(--c4)',op:.25,stroke:'var(--c4)',rx:4})+T(bx-18,top+16,'LN',{a:'middle',fs:11})+line(bx-6,top+12,bx-1,top+12,{arrow:true});
      g+=rect(bx,top,bw,h,{fill:'var('+col+')',op:.13,stroke:'var('+col+')'})+T(bx+8,top+17,name,{fs:12,w:600})+T(bx+8,top+32,par,{fs:11,fill:'var(--mute)'});
      const ry=top+h+14;g+=line(bx+bw/2,top+h,bx+bw/2,ry)+line(bx+bw/2,ry,sx+8,ry,{arrow:true})+'<circle cx="'+sx+'" cy="'+ry+'" r="7" fill="var(--bg)" stroke="var(--ink)" stroke-width="1.4"/>'+T(sx,ry+4,'+',{a:'middle',fs:12,w:600});
      let ny=narrow?ry+16:top+10,nh=0;notes.forEach(s=>{nh+=note(s,ny+nh)+2});
      y=Math.max(ry+10,narrow?ny+nh:top+nh)+6}
    sub('attention','262,144 parameters',['LN: a unit-scale copy, 256 gains','W_o initialised at 0.02 / √(2L)','at initialisation |block(x) − x| / |x| = [[f:block_rel|f2]]: the first sublayers are not small corrections'],'--c1');
    sub('feed-forward','524,288 parameters',['W_down initialised at 0.02 / √(2L), the other matrix that writes into the stream'],'--c3');
    g+=line(sx,st,sx,y,{stroke:'var(--ink)',sw:2.2,arrow:true});
    y+=4;y+=note('to the next block, same shape (1, 256, 256). Trained, the traced token’s norm grows from 1.3 to 65.5 over the 6 blocks (root Block lab), so a final LayerNorm comes before the output layer.',y+12,sx+14)+6;
    host.innerHTML=RD.svg(W,y,g,'A pre-norm block: the residual stream with two branches that add back');
  }

  // ---------------------------------------------------------------- targets shifted by one
  function shift(){
    const host=$('tz-shift');if(!host)return;
    const W=Math.min(RD.width(host),700),lab=W<520?52:66;let g=defs,x=lab,ws=[],i=0;
    while(i<14){const w=Math.max(26,piece(i).length*6.6+10);if(x+w>W-4)break;ws.push(w);x+=w+4;i++}
    const n=ws.length,y1=8,y2=62;
    g+=T(4,y1+16,'input t',{fs:11,fill:'var(--mute)'})+T(4,y2+16,'target',{fs:11,fill:'var(--mute)'});
    x=lab;for(let k=0;k<n;k++){const w=ws[k];
      g+=rect(x,y1,w,22,{fill:'var(--c5)',op:.18,stroke:'var(--c5)',rx:3})+T(x+w/2,y1+15,esc(piece(k)),{a:'middle',fs:11});
      g+=rect(x,y2,w,22,{fill:'var(--c6)',op:.18,stroke:'var(--c6)',rx:3})+T(x+w/2,y2+15,esc(piece(k+1)),{a:'middle',fs:11});
      g+=line(x+w/2,y1+23,x+w/2,y2-2,{arrow:true});
      if(k+1<n)g+=line(x+w+4+ws[k+1]/2-4,y1+24,x+w/2+4,y2-3,{stroke:'var(--c6)',sw:1,dash:'3 3'});
      x+=w+4}
    const nl=wrap('position t is scored on token t + 1 (dashed: each target is the next input)',Math.floor((W-8)/6.2));
    nl.forEach((l,k)=>{g+=T(4,y2+42+k*14,l,{fs:11,fill:'var(--mute)'})});
    host.innerHTML=RD.svg(W,y2+48+nl.length*14,g,'Inputs and targets: the targets are the inputs shifted by one');
  }

  // ---------------------------------------------------------------- KV cache: recompute against keep (before/after stepper)
  const NMM=num('[[f:matmul_params|i]]'),L=6,DM=256,P0=30,NG=10;
  let kvMode=0,kvA=null;
  function kvAt(i,mode){ // tokens through the model and FLOPs at step i (0 = prefill)
    const t=P0+i;
    if(i===0)return {through:P0,fl:2*NMM*P0+4*L*DM*P0*(P0+1)/2};
    if(mode===0)return {through:t,fl:2*NMM*t+4*L*DM*t*(t+1)/2};
    return {through:1,fl:2*NMM+4*L*DM*t};
  }
  function kv(i){
    const host=$('tz-kv-svg');if(!host)return;
    const W=Math.min(RD.width(host),700),n=P0+NG,c=Math.max(5,(W-8)/n),t=P0+i;let g='',y=16;
    g+=T(4,y-4,'tokens in the context (30 prompt + 10 generated)',{fs:11,fill:'var(--mute)'});
    for(let k=0;k<n;k++){const x=4+k*c,have=k<t,isNew=i>0&&k===t-1;
      const through=i===0?k<P0:(kvMode===0?k<t:isNew);
      g+=rect(x,y,c-1,14,{fill:have?(through?'var(--c2)':'var(--c1)'):'var(--soft)',op:have?(through?.75:.3):1,stroke:isNew?'var(--ink)':'none',rx:1})}
    y+=34;g+=T(4,y-4,kvMode===1?'KV cache, per layer (K and V for each token, 6 layers)':'no cache: keys and values are recomputed from scratch',{fs:11,fill:'var(--mute)'});
    for(let k=0;k<n;k++){const x=4+k*c,inC=kvMode===1&&k<t;g+=rect(x,y,c-1,14,{fill:inC?'var(--c3)':'var(--soft)',op:inC?.6:1,stroke:'none',rx:1})}
    y+=24;g+=T(4,y+6,'orange: tokens through the model this step; outlined: the new token',{fs:11,fill:'var(--mute)'});
    host.innerHTML=RD.svg(W,y+12,g,'Tokens processed per generation step with and without a KV cache');
    const now=kvAt(i,kvMode);let tot=0,other=0;for(let k=0;k<=i;k++){tot+=kvAt(k,kvMode).fl;other+=kvAt(k,1-kvMode).fl}
    $('tz-kv-cnt').innerHTML=RD.stat('Through the model now',now.through+(now.through===1?' token':' tokens'),i===0?'prefill':'generating token '+(t))+RD.stat('FLOPs this step',(now.fl/1e9).toFixed(2)+' G','derived')+RD.stat('FLOPs so far',(tot/1e9).toFixed(2)+' G',(kvMode?'without a cache: ':'with a cache: ')+(other/1e9).toFixed(2)+' G')+RD.stat('Cache held (bf16)',kvMode?f0(t*2*L*DM*2)+' B':'none',kvMode?'2 x L x D x 2 bytes x '+t+' tokens':'');
    const cap=i===0?'Prefill: the 30 prompt tokens go through in one forward pass, the same either way. '+(kvMode?'Their keys and values are kept: per layer K is (1, 8, 30, 32) = (B, H, t, hd), and V the same.':'Nothing is kept but the logits.'):
      kvMode===0?'Token '+t+': without a cache the whole prefix of '+t+' tokens goes through again, every step a little longer; the total grows with the square of the length.':
      'Token '+t+': only the new token goes through; its query reads the '+t+' cached keys and values in each layer, and its own key and value are appended.';
    $('tz-kv-cap').innerHTML='<p>'+cap+'</p>';
  }

  // ---------------------------------------------------------------- one block's matrices to scale (units of D squared)
  const MAT={
    tiny:{att:[['q',1,1],['k',1,1],['v',1,1],['o',1,1]],ffn:[['up',1,4],['down',1,4]],
      cap:'The tiny GPT: W<sub>q</sub>, W<sub>k</sub>, W<sub>v</sub>, W<sub>o</sub> are (256, 256), four squares of D<sup>2</sup>; the FFN’s up (1,024, 256) and down (256, 1,024) are four squares each. 4 + 8 = 12 D<sup>2</sup> = 786,432, plus 512 norm gains: [[f:p_block|i]] per block.'},
    llama:{att:[['q',1,1],['k',1,.25],['v',1,.25],['o',1,1]],ffn:[['gate',1,3.5],['up',1,3.5],['down',1,3.5]],
      cap:'Llama 3.1 8B in units of its own D = 4,096: q and o are D x D, but k and v are (1,024, 4,096), a quarter each, because 8 key-value heads serve 32 query heads (GQA); the SwiGLU FFN is three matrices of 3.5 D. 2.5 + 10.5 = 13.0 D<sup>2</sup> = 218,103,808, plus 8,192 norm gains: 218,112,000 (the predict below).'}};
  let matMode='tiny';
  function mat(){
    const host=$('tz-mat');if(!host)return;
    const W=Math.min(RD.width(host),700),u=Math.min(46,(W-34)/10.9),gap=6,m=MAT[matMode];let g='',y=4;
    function row(items,col,title){g+=T(4,y+12,title,{fs:11,fill:'var(--mute)'});y+=18;let x=4;items.forEach(([nm,h,w])=>{const ww=w*u,hh=h*u;g+=rect(x,y,ww,hh,{fill:'var('+col+')',op:.4,stroke:'var('+col+')',rx:2})+T(x+Math.min(ww/2,ww-4),y+hh/2+4,nm,{a:ww<22?'end':'middle',fs:11});x+=ww+gap});y+=u+8}
    row(m.att,'--c1','attention: q, k, v, o');row(m.ffn,'--c3','feed-forward');
    host.innerHTML=RD.svg(W,y,g,'One block’s weight matrices drawn to scale');
    $('tz-mat-cap').innerHTML=m.cap+' One square is D<sup>2</sup> parameters.';
  }

  function all(){hero();emb();heads();ffn();blk();shift();mat();if(kvA)kv(kvA.i)}
  att();
  if($('tz-kv-svg')){kvA=RD.anim({card:'tz-kv',ctl:'tz-kv-ctl',n:NG+1,draw:kv,ms:1500,label:'Generation step'});
    RD.seg($('tz-kv-seg'),m=>{kvMode=+m;kvA.reset(NG+1)})}
  if($('tz-ffn-seg'))RD.seg($('tz-ffn-seg'),m=>{ffnMode=m;ffn()});
  if($('tz-mat-seg'))RD.seg($('tz-mat-seg'),m=>{matMode=m;mat()});
  RD.onRender(all);RD.onResize(all);all();
})();
