// ---- Vision lab: one image as patches, a sequence and tokens (CLIP B/32 against SigLIP 2 B/16 on the same input) ----
(function(){
  const V=window.VS,D=V.D,$=V.$;if(!$('vs-pa'))return;
  const i8=s=>{const b=atob(s),a=new Int8Array(b.length);for(let i=0;i<b.length;i++)a[i]=(b.charCodeAt(i)<<24)>>24;return a};
  const M={};['clip','siglip'].forEach(w=>{const m=D.models[w];M[w]={m,pos:i8(m.pos),tok:i8(m.tok),att:i8(m.pool_att)}});
  const NAME={clip:'CLIP ViT-B/32',siglip:'SigLIP 2 B/16'};
  const st={w:'clip',img:0,sel:null,tw:1,raf:0,prev:-1};
  const imgs=D.patch_uris.map(u=>{const im=new Image();im.src=u;im.onload=()=>A&&A.redraw();return im});
  const IMGNAME=['tabby cat (p01)','cat with a DOG sticker (s04)','triangle and circle (s02)','generated stop sign (g05)','Fashion-MNIST test image 0 (ankle boot), 28 px upscaled'];
  const sel=$('vs-pa-img');sel.innerHTML=IMGNAME.map((n,i)=>'<option value="'+i+'">'+n+'</option>').join('');
  sel.addEventListener('change',()=>{st.img=+sel.value;A.redraw()});
  V.seg($('vs-pa-m'),[['clip','CLIP ViT-B/32 (patch 32)'],['siglip','SigLIP 2 B/16 (patch 16)']],'clip',v=>{st.w=v;st.sel=null;A.redraw()});
  const cv=$('vs-pa-c'),ctx=cv.getContext('2d');
  const STEPS=[
    ['The input','The processor resizes the image to 224 &#215; 224 and normalises each colour channel. The model sees 224 &#215; 224 &#215; 3 = <b>150,528 numbers</b>; nothing about objects yet.'],
    ['Cut into patches',null],
    ['A sequence',null],
    ['Flatten each patch',null],
    ['One matrix makes a token',null],
    ['Add where it came from',null],
    ['Prepend a summary token, or not',null],
    ['Twelve layers, then pool',null]];
  function cap(i,m,g,n){const ps=m.ps,np=3*ps*ps;
    switch(i){
    case 1:return 'A square grid of '+ps+' &#215; '+ps+'-pixel patches: 224 / '+ps+' = '+g+' per side, so <b>'+n+' patches</b>. A smaller patch means more, finer tokens: SigLIP 2 B/16 cuts the same image into 4 times as many as CLIP B/32.';
    case 2:return 'The patches are laid out in reading order (left to right, top to bottom) as a sequence of '+n+', exactly as words are for a language model. The grid is gone: from here the transformer sees a list.';
    case 3:return 'Each patch is unrolled into one long vector of '+ps+' &#215; '+ps+' &#215; 3 = <b>'+V.comma(np)+' numbers</b> (the stripe below is the selected patch&#8217;s pixels, in order).';
    case 4:return 'Every patch vector is multiplied by the same learned matrix of '+V.comma(m.check.width)+' &#215; '+V.comma(np)+' (the <dfn>patch embedding</dfn>, '+V.comma(m.check.patch_embedding_params)+' parameters'+(m.check.conv_has_bias?' with its bias':', no bias')+'), giving one '+m.check.width+'-number token per patch. Each column shows the first 16 of the 768 numbers of a real token (blue positive, orange negative).';
    case 5:return 'A learned <dfn>position embedding</dfn> (one vector per slot) is added to each token so the model can tell where a patch was. Colour: cosine similarity of the selected patch&#8217;s position vector to every other slot, from the real '+(st.w==='clip'?'CLIP':'SigLIP 2')+' weights. Nobody told the model the grid is 2-D: slots in the same row or column and near neighbours ended up similar because it helped. Click or tap a patch.';
    case 6:return st.w==='clip'?'CLIP prepends one extra learned token, <dfn>[CLS]</dfn>, whose output will summarise the image: <b>50 tokens</b>. Every attention layer compares every token with every other: 50 &#215; 50 = <b>2,500 scores</b> per head.':'SigLIP 2 adds no [CLS] token: <b>196 tokens</b>, 196 &#215; 196 = <b>38,416 attention scores</b> per head per layer, 15 times CLIP B/32&#8217;s 2,500 for the same picture.';
    case 7:return (st.w==='clip'?'After 12 transformer layers the [CLS] output is normalised and projected to a <b>512</b>-number image embedding. Heat: how much [CLS] attends to each patch in the last layer (mean of 12 heads; uniform would be 2% each). On the DOG image its largest weight, 12%, is on the patch holding the word: the model is reading.':'After 12 layers an attention-pooling head (a learned query, the MAP head) averages the patch outputs into one <b>768</b>-number image embedding. Heat: the weight that query gives each patch (mean over heads; uniform would be 0.5% each). It puts 30% to 45% of its weight on the same four slots in every image here, whatever they show. That fits a known ViT habit of using a few low-information tokens for internal bookkeeping (Darcet et al. 2023, linked below); it is a reading of these weights, not a measured cause.')+' Attention weights are a hint, not an explanation of the decision.';}
    return STEPS[i][1]}
  function layout(Wd,g){
    const S=Math.min(Math.round(Wd*0.5),250),gap=14;
    const n=g*g,pad=4,avail=Wd-pad*2;
    const c=Math.max(9,Math.min(26,Math.floor(avail/Math.min(n,49))-2));
    const per=Math.max(1,Math.floor(avail/(c+2)));const rows=Math.ceil(n/per);
    const tokH=Math.round(c*2.2);
    return {S,gap,c,per,rows,tokH,seqY:S+gap+18,H:S+gap+18+rows*(c+tokH+6)+8,Wd};
  }
  function draw(i){
    const m=M[st.w].m,g=m.grid,n=g*g,ps=m.ps;const Wd=V.width(cv.parentElement);
    const L=layout(Wd,g);const dpr=window.devicePixelRatio||1;
    cv.width=Wd*dpr;cv.height=L.H*dpr;cv.style.width=Wd+'px';cv.style.height=L.H+'px';ctx.setTransform(dpr,0,0,dpr,0,0);
    const ink=V.css('--ink'),mute=V.css('--mute'),acc=V.css('--acc'),line=V.css('--line'),bad=V.css('--bad');
    ctx.clearRect(0,0,Wd,L.H);ctx.font='12px ui-sans-serif,-apple-system,Segoe UI,Helvetica,Arial,sans-serif';
    const im=imgs[st.img];const ok=im.complete&&im.naturalWidth>0;
    if(st.sel==null)st.sel=Math.floor(g/2)*g+Math.floor(g/2);
    const cs=L.S/g;
    // image panel
    if(ok){ctx.globalAlpha=(i===5||i===7)?0.35:1;ctx.drawImage(im,0,0,L.S,L.S);ctx.globalAlpha=1}
    ctx.strokeStyle=line;ctx.strokeRect(0.5,0.5,L.S-1,L.S-1);
    if(i>=1){ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineWidth=1;
      for(let k=1;k<g;k++){ctx.beginPath();ctx.moveTo(k*cs,0);ctx.lineTo(k*cs,L.S);ctx.stroke();ctx.beginPath();ctx.moveTo(0,k*cs);ctx.lineTo(L.S,k*cs);ctx.stroke()}}
    if(i===5){const P=M[st.w].pos;let lo=1e9,hi=-1e9;for(let j=0;j<n;j++)if(j!==st.sel){const v=P[st.sel*n+j];lo=Math.min(lo,v);hi=Math.max(hi,v)}
      for(let j=0;j<n;j++){const v=j===st.sel?1:(P[st.sel*n+j]-lo)/Math.max(1,hi-lo);ctx.fillStyle=V.seq(v);ctx.globalAlpha=.85;ctx.fillRect((j%g)*cs,Math.floor(j/g)*cs,cs,cs)}ctx.globalAlpha=1;
      st.posRange=[lo/100,hi/100]}
    if(i===7){const a=M[st.w].att,K=m.pool_keys.length;const row=D.keys.indexOf(D.patch_images[st.img]);const r=row<0?K-1:row;
      for(let j=0;j<n;j++){const v=Math.max(0,a[r*n+j])/127;ctx.fillStyle='rgba(194,112,58,'+(0.08+0.85*v).toFixed(3)+')';ctx.fillRect((j%g)*cs,Math.floor(j/g)*cs,cs,cs)}}
    if(i>=3){ctx.strokeStyle=bad;ctx.lineWidth=2;ctx.strokeRect((st.sel%g)*cs+1,Math.floor(st.sel/g)*cs+1,cs-2,cs-2);ctx.lineWidth=1}
    // right of the image: the selected patch enlarged and its flattened stripe (step 3), or the counters
    const rx=L.S+12,rw=Wd-rx;
    if(rw>90&&ok){
      const big=Math.min(rw-4,L.S*0.55,120);const sx=(st.sel%g)*(224/g),sy=Math.floor(st.sel/g)*(224/g);
      if(i>=3){ctx.imageSmoothingEnabled=false;ctx.drawImage(im,sx,sy,224/g,224/g,rx,0,big,big);ctx.imageSmoothingEnabled=true;
        ctx.fillStyle=mute;ctx.fillText('patch '+(st.sel+1)+' of '+n,rx,big+14)}
      if(i===3){// the stripe: every pixel of the patch in reading order, R, G, B interleaved shown as colour
        const tmp=document.createElement('canvas');tmp.width=ps;tmp.height=ps;const tc=tmp.getContext('2d');tc.drawImage(im,sx,sy,224/g,224/g,0,0,ps,ps);
        let px;try{px=tc.getImageData(0,0,ps,ps).data}catch(e){px=null}
        if(px){const y0=big+24,hh=Math.min(16,L.S-y0-20),cnt=ps*ps,wpx=rw-4;
          for(let k=0;k<cnt;k++){ctx.fillStyle='rgb('+px[4*k]+','+px[4*k+1]+','+px[4*k+2]+')';ctx.fillRect(rx+k*wpx/cnt,y0,Math.max(1,wpx/cnt+.5),hh)}
          ctx.fillStyle=mute;ctx.fillText(V.comma(3*cnt)+' numbers',rx,y0+hh+14)}}
    }
    // the sequence
    const seqOn=i>=2,c=L.c,y0=L.seqY;
    if(seqOn){ctx.fillStyle=mute;ctx.fillText(i>=6&&st.w==='clip'?'sequence: [CLS] + '+n+' patch tokens':'sequence: '+n+' tokens, read left to right, top to bottom',0,y0-6);
      const tw=st.tw;
      for(let j=0;j<n;j++){const col=j%L.per,row=Math.floor(j/L.per);
        const tx=4+col*(c+2),ty=y0+row*(c+L.tokH+6);
        const gx=(j%g)*cs,gy=Math.floor(j/g)*cs;
        const x=gx+(tx-gx)*tw,y=gy+(ty-gy)*tw,s=cs+(c-cs)*tw;
        if(ok&&i<4)ctx.drawImage(im,(j%g)*(224/g),Math.floor(j/g)*(224/g),224/g,224/g,x,y,s,s);
        if(i>=4){const T=M[st.w].tok,sc=m.tok_scale;let mx=0;for(let d=0;d<16;d++)mx=Math.max(mx,Math.abs(T[(st.img*n+j)*16+d]));
          const hh=(c+L.tokH)/16;for(let d=0;d<16;d++){ctx.fillStyle=V.div(T[(st.img*n+j)*16+d]/Math.max(1,mx));ctx.fillRect(tx,ty+d*hh,c,hh+.4)}
          if(i===5){const P=M[st.w].pos,v=j===st.sel?1:(P[st.sel*n+j]/100-st.posRange[0])/Math.max(.01,st.posRange[1]-st.posRange[0]);ctx.fillStyle=V.seq(v);ctx.fillRect(tx,ty+c+L.tokH-4,c,4)}}
        if(j===st.sel&&i>=3){ctx.strokeStyle=bad;ctx.lineWidth=2;ctx.strokeRect(tx-1,ty-1,c+2,(i>=4?c+L.tokH:c)+2);ctx.lineWidth=1}}
    }
    // counters
    const np=3*ps*ps,seqN=st.w==='clip'?n+1:n;
    $('vs-pa-out').innerHTML=V.stat('Patches',i>=1?String(n):'&#8211;',g+' &#215; '+g+' of '+ps+' px')+
      V.stat('Numbers per patch',i>=3?V.comma(np):'&#8211;','3 &#215; '+ps+' &#215; '+ps)+
      V.stat('Tokens into layer 1',i>=6?String(seqN):(i>=4?String(n):'&#8211;'),st.w==='clip'&&i>=6?'patches + [CLS]':'patches')+
      V.stat('Attention scores per head',i>=6?V.comma(seqN*seqN):'&#8211;','per layer, 12 heads &#215; 12 layers');
    $('vs-pa-cap').innerHTML='<b>Step '+(i+1)+' of 8: '+STEPS[i][0]+'.</b> '+cap(i,m,g,n);
  }
  function drawT(i){
    if(i===2&&st.prev===1&&!V.RM){cancelAnimationFrame(st.raf);const t0=performance.now();
      const f=t=>{st.tw=Math.min(1,(t-t0)/700);st.tw=st.tw<.5?2*st.tw*st.tw:1-Math.pow(-2*st.tw+2,2)/2;draw(i);if(t-t0<700)st.raf=requestAnimationFrame(f)};st.raf=requestAnimationFrame(f)}
    else{st.tw=1;draw(i)}st.prev=i}
  cv.addEventListener('click',e=>{const r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
    const m=M[st.w].m,g=m.grid,n=g*g,L=layout(V.width(cv.parentElement),g);
    if(x<L.S&&y<L.S){st.sel=Math.floor(y/(L.S/g))*g+Math.floor(x/(L.S/g))}
    else if(y>=L.seqY){const col=Math.floor((x-4)/(L.c+2)),row=Math.floor((y-L.seqY)/(L.c+L.tokH+6)),j=row*L.per+col;if(col>=0&&col<L.per&&j>=0&&j<n)st.sel=j;else return}
    else return;
    if(A.i<3)A.go(5);else A.redraw()});
  const A=V.anim({card:'vs-pa',ctl:'vs-pa-ctl',n:8,draw:drawT,ms:2600,label:'Patch animation step'});
  addEventListener('resize',()=>{if(cv.offsetParent)A.redraw()});
})();
