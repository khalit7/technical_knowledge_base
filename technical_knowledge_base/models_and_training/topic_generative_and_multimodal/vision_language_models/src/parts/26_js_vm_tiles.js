// ---- Reading 2: the same 3:2 photo through SmolVLM's tiling and Qwen3.5's native resolution (moved from the What the model saw tab, 2026-10-24) ----
(function(){
  const V=VM,S=V.D.saw;if(!S||!V.$('vm-saw-anim'))return;
  const IMGS=S.images,AN=S.anim;if(!AN)return;
  let am='smol';
  V.seg(V.$('vm-sa-seg'),[['smol','SmolVLM-500M (tiles)'],['qwen','Qwen3.5-0.8B (native)']],'smol',v=>{am=v;A.reset(5)});
  const afterImg=sm=>{const L=sm.segs.filter(x=>x[0]==='img').pop();return L?L[1]+L[2]:0};
  const ST=['The original','Resize','Cut into patches','Merge into tokens','Into the sequence'];
  function acap(i){const im=IMGS.find(x=>x.key===AN.key)||IMGS[0],sm=im.smol[0],q=(im.qwen||[]).find(x=>x.budget==='native');
    const t=am==='smol'?[im.w+' x '+im.h+' pixels, a 3:2 photo.','Long side to 2,048 (x'+(2048/im.w).toFixed(2)+'), then the short side rounded up to whole 512 tiles: '+sm.resized[1]+' x '+sm.resized[0]+'. The photo is stretched: its shape goes from 1.50 to '+(sm.resized[1]/sm.resized[0]).toFixed(2)+'. A 512 x 512 global view of the whole image is added (squashed to a square).',
        sm.views+' views of 512 x 512, each cut into 32 x 32 patches of 16 pixels: '+V.comma(sm.views*1024)+' patch vectors.','Pixel shuffle: each 4 x 4 block of patches becomes one token, 64 per view: '+V.comma(sm.imgTok)+' image tokens.',
        'Tokens enter as one run per view, each run after a row/column tag; positions are 1-D, one per token: the text after the image starts at position '+V.comma(afterImg(sm))+', '+V.comma(sm.promptTok)+' tokens in all.']:
      [im.w+' x '+im.h+' pixels, a 3:2 photo.',q?'Resized only to multiples of 32: '+q.resized[0]+' x '+q.resized[1]+'. Shape kept (1.50 to '+(q.resized[0]/q.resized[1]).toFixed(2)+'). No tiles, no global view.':'',q?q.thw[1]+' x '+q.thw[2]+' patches of 16 pixels: '+V.comma(q.thw[1]*q.thw[2])+' patch vectors (each patch also spans 2 identical frames).':'',
        q?'Each 2 x 2 block becomes one token: '+(q.thw[1]/2)+' x '+(q.thw[2]/2)+' = '+V.comma(q.imgTok)+' image tokens.':'',q?'Tokens enter as one block with 3-D positions (t, h, w): the text after the image continues at position '+q.posAfter[0]+', the largest image position plus one, not '+V.comma(q.firstIdx+q.imgTok)+'.':''];
    V.$('vm-sa-cap').innerHTML='<div class="t">Step '+(i+1)+' of 5: '+ST[i]+'</div><p>'+t[i]+'</p>';
    const tok=am==='smol'?sm.imgTok:(q?q.imgTok:0);V.$('vm-sa-cnt').innerHTML=RD.stat('Image tokens',i>=3?V.comma(tok):'?','')+RD.stat('Pixels seen',i>=1?(am==='smol'?V.comma(sm.views*512*512):(q?V.comma(q.resized[0]*q.resized[1]):'?')):V.comma(im.w*im.h),'')+RD.stat('Shape kept',i>=1?(am==='smol'?'no':'yes'):'','')}
  function adraw(i){const im=IMGS.find(x=>x.key===AN.key)||IMGS[0],sm=im.smol[0],q=(im.qwen||[]).find(x=>x.budget==='native'),fig=V.$('vm-sa-fig');
    const W=Math.min(V.width(fig),760),H=W<480?250:300,{g}=V.canvas(fig,W,H),mute=V.css('--mute'),acc=V.css('--acc');
    V.img(im.full||im.thumb,img=>{if(!img)return;const maxW=W-16,maxH=H-30;
      if(i===0){const s=Math.min(maxW/im.w,maxH/im.h);g.drawImage(img,8,14,im.w*s,im.h*s);g.fillStyle=mute;g.fillText(im.w+' x '+im.h,8,6);return}
      if(am==='smol'){const rw=sm.resized[1],rh=sm.resized[0],gv=Math.min(90,maxW*0.18),s=Math.min((maxW-gv-16)/rw,maxH/rh),w=rw*s,h=rh*s;g.drawImage(img,8,14,w,h);
        g.drawImage(img,8+w+12,14,gv,gv);g.fillStyle=mute;g.fillText(rw+' x '+rh+' (stretched) + global 512',8,6);
        g.strokeStyle=acc;g.lineWidth=1.5;for(let r=0;r<sm.rows;r++)for(let c=0;c<sm.cols;c++)g.strokeRect(8+c*w/sm.cols,14+r*h/sm.rows,w/sm.cols,h/sm.rows);g.strokeRect(8+w+12,14,gv,gv);
        if(i>=2){const n=i===2?32:8;g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=.5;g.beginPath();for(let r=0;r<sm.rows;r++)for(let c=0;c<sm.cols;c++){const x0=8+c*w/sm.cols,y0=14+r*h/sm.rows,tw=w/sm.cols,tt=h/sm.rows;for(let k=1;k<n;k++){g.moveTo(x0+k*tw/n,y0);g.lineTo(x0+k*tw/n,y0+tt);g.moveTo(x0,y0+k*tt/n);g.lineTo(x0+tw,y0+k*tt/n)}}g.stroke()}
        if(i===4){g.fillStyle=acc;let x=8;const y=H-12;for(let v=0;v<sm.views;v++){g.fillRect(x,y,Math.max(2,(maxW-sm.views*3)/sm.views),8);x+=(maxW)/sm.views}g.fillStyle=mute;g.fillText('the sequence: '+sm.views+' runs of 64 tokens with text tags between',8,y-8)}}
      else if(q){const rw=q.resized[0],rh=q.resized[1],s=Math.min(maxW/rw,maxH/rh),w=rw*s,h=rh*s;g.drawImage(img,8,14,w,h);g.fillStyle=mute;g.fillText(rw+' x '+rh+' (shape kept)',8,6);
        if(i>=2){const gh=i===2?q.thw[1]:q.thw[1]/2,gw=i===2?q.thw[2]:q.thw[2]/2;g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=.5;g.beginPath();for(let k=1;k<gw;k++){g.moveTo(8+k*w/gw,14);g.lineTo(8+k*w/gw,14+h)}for(let k=1;k<gh;k++){g.moveTo(8,14+k*h/gh);g.lineTo(8+w,14+k*h/gh)}g.stroke()}
        if(i===4&&q.pos){g.fillStyle=acc;g.font='11px system-ui';const gw=q.thw[2]/2;[[0,0],[0,gw-1],[q.thw[1]/2-1,0]].forEach(([r,c])=>{const p=q.pos[r*gw+c],rt=c===gw-1;g.textAlign=rt?'right':'left';g.fillText('('+p.join(',')+')',rt?8+w-2:8+c*w/gw+2,14+r*h/(q.thw[1]/2)+8)});g.textAlign='left'}}})}
  const A=RD.anim({card:'vm-saw-anim',ctl:'vm-sa-ctl',n:5,ms:2600,label:'Step',draw:i=>{acap(i);adraw(i)}});
  RD.onResize(()=>A.redraw());
})();
