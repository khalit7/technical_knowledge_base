// ---- Tab: What the model saw (explorer + same-image animation) ----
(function(){
  const V=VM,S=V.D.saw;if(!S||!V.$('t-vmsaw'))return;
  const TAB='t-vmsaw';
  const IMGS=S.images;let ii=0,setk='s0',sel=null;
  const NAMES={p01_cat:'cat 512 x 512',chelsea_native:'chelsea 451 x 300',rocket_native:'rocket 640 x 427',receipt_tall:'receipt 400 x 1,000'};
  function settings(){const im=IMGS[ii],o=[];im.smol.forEach((s,k)=>o.push(['s'+k,'SmolVLM '+s.name]));(im.qwen||[]).forEach((q,k)=>o.push(['q'+k,'Qwen3.5 '+(q.budget==='native'?'native':'max '+q.budget)]));return o}
  function cur(){const im=IMGS[ii];return setk[0]==='s'?{m:'smol',s:im.smol[+setk.slice(1)]}:{m:'qwen',s:(im.qwen||[])[+setk.slice(1)]}}
  // picker
  V.$('vm-saw-pick').innerHTML=IMGS.map((im,k)=>'<button data-i="'+k+'" class="'+(k?'':'on')+'" title="'+V.esc(NAMES[im.key]||im.key)+'" aria-label="'+V.esc(NAMES[im.key]||im.key)+'"><img alt="" src="'+im.thumb+'"></button>').join('');
  V.$('vm-saw-pick').onclick=e=>{const b=e.target.closest('button');if(!b)return;ii=+b.dataset.i;V.$('vm-saw-pick').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    if(!cur().s)setk='s0';sel=null;segs();draw()};
  function segs(){V.seg(V.$('vm-saw-set'),settings(),setk,v=>{setk=v;sel=null;draw()})}
  let hits=[],shade=false;
  const shEl=V.$('vm-saw-shade');if(shEl)V.seg(shEl,[['0','Plain views'],['1','Shade high-norm tokens']],'0',v=>{shade=v==='1';draw()});
  function region(c,t){// token t -> [x0,y0,x1,y1] in original pixels
    const im=IMGS[ii],W=im.w,H=im.h;
    if(c.m==='smol'){const s=c.s,v=t.view,n=s.views;let fx0=0,fy0=0,fw=1,fh=1;
      if(s.rows&&v<n-1){const r=Math.floor(v/s.cols),cc=v%s.cols;fx0=cc/s.cols;fy0=r/s.rows;fw=1/s.cols;fh=1/s.rows}
      return [W*(fx0+fw*t.tc/8),H*(fy0+fh*t.tr/8),W*(fx0+fw*(t.tc+1)/8),H*(fy0+fh*(t.tr+1)/8)]}
    const q=c.s,gh=q.thw[1]/2,gw=q.thw[2]/2;return [W*t.tc/gw,H*t.tr/gh,W*(t.tc+1)/gw,H*(t.tr+1)/gh]}
  function stats(c){const im=IMGS[ii];let a;
    if(c.m==='smol'){const s=c.s,rs=s.resized,str=s.rows?(rs[1]/rs[0])/(im.w/im.h):512/512/(im.w/im.h);
      a=[['Views',s.views+(s.rows?' ('+s.rows+' x '+s.cols+' tiles + global)':' (one 512 view)'),'512 x 512 each'],['Image tokens',V.comma(s.imgTok),'64 per view'],['Prompt tokens',V.comma(s.promptTok),'chat template included'],
        ['Shape change',(Math.abs(str-1)<0.005?'none':(str>1?'wider ':'taller ')+'x'+(str>1?str:1/str).toFixed(2)),'aspect ratio seen / original'],['Last position',V.comma(s.promptTok-1),'1-D: one per token']]}
    else{const q=c.s,rs=q.resized,str=(rs[0]/rs[1])/(im.w/im.h);
      a=[['Resized to',rs[0]+' x '+rs[1],'multiples of 32'],['Image tokens',V.comma(q.imgTok),(q.thw[1]/2)+' x '+(q.thw[2]/2)+' (2 x 2 merged)'],['Prompt tokens',V.comma(q.promptTok),'chat template included'],
        ['Shape change',(Math.abs(str-1)<0.005?'none':'x'+(str>1?str:1/str).toFixed(3)),'aspect ratio seen / original'],['Last position',V.comma(q.lastPos),'3-D: image advances by its side']]}
    V.$('vm-saw-stats').innerHTML=a.map(x=>RD.stat(x[0],x[1],x[2])).join('')}
  function draw(){const c=cur(),im=IMGS[ii],fig=V.$('vm-saw-fig');if(!c.s)return;stats(c);
    const W=Math.min(V.width(fig),900),narrow=W<560;const ow=Math.min(narrow?W-8:Math.min(300,W*0.36),(narrow?300:400)*im.w/im.h),oh=ow*im.h/im.w;
    hits=[];const tokArea=narrow?W-8:W-ow-24,ox=4,oy=18,tx=narrow?4:ow+20,ty=narrow?oy+oh+26:18;
    // layout of the views
    let boxes=[],th=0;
    if(c.m==='smol'){const s=c.s;if(s.rows){const gs=Math.min(tokArea*0.62/s.cols,(narrow?260:330)/s.rows),gv=Math.min(tokArea-s.cols*gs-14,gs*1.6);
        for(let v=0;v<s.views-1;v++){const r=Math.floor(v/s.cols),cc=v%s.cols;boxes.push({v,x:tx+cc*gs,y:ty+r*gs,s:gs-3})}
        const gx=tx+s.cols*gs+10;boxes.push({v:s.views-1,x:gx,y:ty,s:Math.max(60,gv)});th=Math.max(s.rows*gs,gv+16)}
      else{const gs=Math.min(tokArea,240);boxes.push({v:0,x:tx,y:ty,s:gs});th=gs}}
    else{const q=c.s,rw=q.resized[0],rh=q.resized[1],sc=Math.min(tokArea/rw,(narrow?380:420)/rh);boxes.push({v:0,x:tx,y:ty,w:rw*sc,h:rh*sc});th=rh*sc}
    const H=Math.max(oy+oh,ty+th)+(narrow?14:24);const {g}=V.canvas(fig,W,H);const ink=V.css('--ink'),mute=V.css('--mute'),acc=V.css('--acc');
    g.fillStyle=mute;g.fillText('original '+im.w+' x '+im.h,ox,8);g.fillText(c.m==='smol'?'the views SmolVLM receives':'the image Qwen3.5 receives ('+c.s.resized[0]+' x '+c.s.resized[1]+')',tx,narrow?ty-8:8);
    V.img(im.full||im.thumb,img=>{if(img)g.drawImage(img,ox,oy,ow,oh);
      if(sel){const r=region(c,sel);g.strokeStyle=acc;g.lineWidth=2;g.strokeRect(ox+r[0]/im.w*ow,oy+r[1]/im.h*oh,Math.max(2,(r[2]-r[0])/im.w*ow),Math.max(2,(r[3]-r[1])/im.h*oh));g.lineWidth=1}});
    if(c.m==='smol'){const s=c.s;boxes.forEach(b=>{V.img(s.thumbs[b.v],img=>{if(img)g.drawImage(img,b.x,b.y,b.s,b.s);const cs=b.s/8,pr=s.patch&&s.patch[b.v];
        for(let tr=0;tr<8;tr++)for(let tc=0;tc<8;tc++){const k=tr*8+tc,rr=pr?pr[k]:1;if(shade&&rr>2.5){g.globalAlpha=Math.min(.75,(rr-2)/4);g.fillStyle=V.heat((rr-1)/4);g.fillRect(b.x+tc*cs,b.y+tr*cs,cs,cs);g.globalAlpha=1}
          hits.push({x:b.x+tc*cs,y:b.y+tr*cs,w:cs,h:cs,view:b.v,tr,tc,k})}
        g.strokeStyle='rgba(255,255,255,.45)';g.lineWidth=.5;g.beginPath();for(let k=1;k<8;k++){g.moveTo(b.x+k*cs,b.y);g.lineTo(b.x+k*cs,b.y+b.s);g.moveTo(b.x,b.y+k*cs);g.lineTo(b.x+b.s,b.y+k*cs)}g.stroke();
        if(sel&&sel.view===b.v){g.strokeStyle=acc;g.lineWidth=2;g.strokeRect(b.x+sel.tc*cs,b.y+sel.tr*cs,cs,cs);g.lineWidth=1}
        if(s.rows&&b.v===s.views-1){g.fillStyle=mute;g.fillText('global',b.x,b.y+b.s+9)}})})}
    else{const q=c.s,b=boxes[0],gh=q.thw[1]/2,gw=q.thw[2]/2,cw=b.w/gw,chh=b.h/gh;V.img(q.picture,img=>{if(img)g.drawImage(img,b.x,b.y,b.w,b.h);
        for(let tr=0;tr<gh;tr++)for(let tc=0;tc<gw;tc++){const k=tr*gw+tc,rr=q.tokRatio?q.tokRatio[k]:1;if(shade&&rr>2.5){g.globalAlpha=Math.min(.75,(rr-2)/4);g.fillStyle=V.heat((rr-1)/4);g.fillRect(b.x+tc*cw,b.y+tr*chh,cw,chh);g.globalAlpha=1}
          hits.push({x:b.x+tc*cw,y:b.y+tr*chh,w:cw,h:chh,view:0,tr,tc,k})}
        if(cw>3){g.strokeStyle='rgba(255,255,255,.4)';g.lineWidth=.5;g.beginPath();for(let k=1;k<gw;k++){g.moveTo(b.x+k*cw,b.y);g.lineTo(b.x+k*cw,b.y+b.h)}for(let k=1;k<gh;k++){g.moveTo(b.x,b.y+k*chh);g.lineTo(b.x+b.w,b.y+k*chh)}g.stroke()}
        if(sel){g.strokeStyle=acc;g.lineWidth=2;g.strokeRect(b.x+sel.tc*cw,b.y+sel.tr*chh,cw,chh);g.lineWidth=1}})}
    info(c);strip(c);
    V.$('vm-saw-note').innerHTML=c.m==='smol'?'SmolVLM-500M-Instruct, '+c.s.name+'. Tiles are cut from the image after it is resized to whole 512-pixel tiles; each tile and the global view are 512 x 512 for the encoder (shown at 96 pixels).':
      'Qwen3.5-0.8B, '+(c.s.budget==='native'?'the processor&#8217;s own limits':'pixels fixed at '+c.s.budget+' x 32 x 32')+'. The picture is rebuilt from the flattened patches in pixel_values, which checks the 2 x 2 window order used here.'}
  function info(c){const el=V.$('vm-saw-info');if(!sel){el.innerHTML='Click a token on any view.';return}const im=IMGS[ii],r=region(c,sel).map(Math.round);
    if(c.m==='smol'){const s=c.s,seg=s.segs.filter(x=>x[0]==='img')[sel.view],pos=seg?seg[1]+sel.k:'?',pr=s.patch?s.patch[sel.view][sel.k]:null,tk=s.tok?s.tok[sel.view][sel.k]:null;
      const vn=s.rows&&sel.view<s.views-1?'tile row '+(Math.floor(sel.view/s.cols)+1)+', column '+(sel.view%s.cols+1):(s.rows?'global view':'the single view');
      el.innerHTML='<b>'+vn+'</b>, token row '+(sel.tr+1)+', column '+(sel.tc+1)+' of 8 x 8. Covers original pixels x '+r[0]+' to '+r[2]+', y '+r[1]+' to '+r[3]+'. Sequence index and 1-D position <b>'+pos+'</b>. Encoder: largest patch-norm ratio among its 16 patches <b>'+(pr==null?'n/a':pr.toFixed(1))+'</b>; projected token norm / median <b>'+(tk==null?'n/a':tk.toFixed(2))+'</b>.'}
    else{const q=c.s,gw=q.thw[2]/2,p=q.pos&&q.pos[sel.k];el.innerHTML='<b>Token '+(sel.k+1)+' of '+V.comma(q.imgTok)+'</b>, merged-grid row '+(sel.tr+1)+', column '+(sel.tc+1)+' of '+(q.thw[1]/2)+' x '+gw+
      '. Covers original pixels x '+r[0]+' to '+r[2]+', y '+r[1]+' to '+r[3]+'. Sequence index <b>'+(q.firstIdx+sel.k)+'</b>; position (t, h, w) <b>('+(p?p.join(', '):'?')+')</b>. Encoder: largest patch-norm ratio among its 4 patches <b>'+(q.tokRatio?q.tokRatio[sel.k].toFixed(1):'n/a')+'</b>.'}}
  function strip(c){const fig=V.$('vm-saw-strip'),W=Math.min(V.width(fig),900),{g}=V.canvas(fig,W,34);let segsA;
    if(c.m==='smol')segsA=c.s.segs.map(x=>[x[0],x[2],x[3]]);else{const q=c.s;segsA=[['txt',q.firstIdx,''],['img',q.imgTok,''],['txt',q.promptTok-q.firstIdx-q.imgTok,'']]}
    const tot=segsA.reduce((a,x)=>a+x[1],0);let x=4;const w=W-8;segsA.forEach(s=>{const ww=Math.max(1,s[1]/tot*w);g.fillStyle=s[0]==='img'?V.css('--acc'):V.css('--c4');g.fillRect(x,6,ww-(ww>3?1:0),14);x+=ww});
    g.fillStyle=V.css('--mute');g.fillText(V.comma(tot)+(W<560?' tokens: blue image, purple text':' tokens to scale: image tokens in blue, text and tags in purple'),4,29);
    const seqTxt=c.m==='smol'?c.s.segs.map(x=>x[0]==='img'?'<b>&lt;image&gt;x'+x[2]+'</b>':V.esc(x[3])).join(''):V.esc(c.s.prompt||'').replace(/&lt;\|image_pad\|&gt;x(\d+)/,'<b>&lt;|image_pad|&gt;x$1</b>');
    V.$('vm-saw-seq').innerHTML=seqTxt}
  V.$('vm-saw-fig').addEventListener('click',e=>{const r=e.currentTarget.querySelector('canvas').getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
    const h=hits.find(t=>x>=t.x&&x<t.x+t.w&&y>=t.y&&y<t.y+t.h);if(h){sel=h;draw()}});
  segs();V.onRender(draw,TAB);addEventListener('resize',()=>{if(!V.$(TAB).hidden)draw()});
})();
