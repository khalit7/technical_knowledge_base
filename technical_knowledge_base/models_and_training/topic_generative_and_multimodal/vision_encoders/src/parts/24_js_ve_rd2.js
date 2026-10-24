// ---- Reading, section 3: scoreboard bars, layer-wise probe chart, the layer-by-layer patch-feature animation ----
(function(){
  const $=id=>document.getElementById(id),E=RD.esc,U=VEU,PR=VE.probes.encoders;
  // scoreboard
  (function(){const el=$('ve-board');if(!el)return;const seg=$('ve-board-m'),bars=$('ve-board-bars');let m='lp16';
    const ROWS=['clip','siglip','dino_cls','dino_mean','dino_cat','mae_cls','mae_mean'];
    const GET={lp1:r=>r.linear_probe['1'].mean,lp16:r=>r.linear_probe['16'].mean,lp500:r=>r.linear_probe['500'].mean,knn:r=>r.knn20,p10:r=>r.img2img['p@10'],map:r=>r.img2img.map};
    const NOTE={lp1:'linear probe, 1 labelled image per class (mean of 5 draws)',lp16:'linear probe, 16 labelled images per class (mean of 5 draws)',lp500:'linear probe, 500 per class',knn:'weighted 20-nearest-neighbour vote over 5,000 labelled images',p10:'image to image: share of the 10 nearest test images with the query\'s class',map:'image to image: mean average precision over all 9,999 other test images'};
    function draw(){const vals=ROWS.map(k=>GET[m](PR[k])),mx=1;
      bars.innerHTML=ROWS.map((k,i)=>'<div><span class="nm">'+U.ENC[k]+'</span><span class="tr"><span style="width:'+(vals[i]/mx*100)+'%;background:'+U.COL[k]+'"></span></span><span class="v">'+U.pct(vals[i])+'</span></div>').join('')+
        '<p class="small mute" style="margin:6px 0 0">'+NOTE[m]+'; tested on all 10,000 Fashion-MNIST test images; chance 10% <span class="meas">measured</span></p>'}
    RD.seg(seg,v=>{m=v;draw()});draw()})();
  // layer-wise probe
  (function(){const el=$('ve-layers');if(!el)return;const L=VE.layer,ORDER=['clip','siglip','dino','mae'].filter(w=>L[w]);
    function draw(){const W=RD.width(el),H=240,l=40,r=12,t=12,b=34,X=i=>l+i/12*(W-l-r),lo=0.1,hi=0.95,Y=v=>t+(hi-v)/(hi-lo)*(H-t-b);
      let s='';[0.1,0.3,0.5,0.7,0.9].forEach(v=>{s+='<line x1="'+l+'" y1="'+Y(v)+'" x2="'+(W-r)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(l-4,Y(v)+4,Math.round(v*100)+'%',{a:'end',fill:'var(--mute)',fs:10.5})});
      for(let i=0;i<=12;i+=2)s+=RD.t(X(i),H-b+15,i,{a:'middle',fill:'var(--mute)',fs:10.5});
      s+=RD.t((l+W-r)/2,H-4,'block (0 = patch embedding plus positions)',{a:'middle',fill:'var(--mute)',fs:10.5});
      ORDER.forEach(w=>{const a=L[w].per_layer_mean_patch;let d='';a.forEach((v,i)=>{d+=(i?'L':'M')+X(i).toFixed(1)+' '+Y(Math.max(lo,v)).toFixed(1)});
        s+='<path d="'+d+'" fill="none" stroke="'+U.COL[w]+'" stroke-width="2.2"/>';
        a.forEach((v,i)=>{s+='<circle cx="'+X(i)+'" cy="'+Y(Math.max(lo,v))+'" r="2.6" fill="'+U.COL[w]+'"><title>'+U.ENC[w]+', block '+i+': '+U.pct(v)+'</title></circle>'});
        const pv=L[w].pooled_output;s+='<line x1="'+(W-r-10)+'" y1="'+Y(pv)+'" x2="'+(W-r)+'" y2="'+Y(pv)+'" stroke="'+U.COL[w]+'" stroke-width="4"/>'});
      el.innerHTML=RD.svg(W,H,s,'Linear probe accuracy by block')+'<div class="leg">'+ORDER.map(w=>'<span style="--sw:'+U.COL[w]+'">'+U.ENC[w]+'</span>').join('')+'<span style="--sw:var(--mute)">ticks at the right edge: the pooled output each model normally returns</span></div>'}
    RD.onRender(draw);RD.onResize(draw);draw()})();

  // ---- same image, four encoders, layer by layer ----
  (function(){const card=$('ve-la');if(!card)return;const D=VE.dense,ORDER=['clip','siglip','dino','mae'];let img=0;
    const fr={};ORDER.forEach(w=>fr[w]=U.u8(D.enc[w].frames));
    const chips=$('ve-la-img'),maps=$('ve-la-maps'),cap=$('ve-la-cap'),cnt=$('ve-la-cnt');
    chips.innerHTML=D.pick.map((k,i)=>'<button data-i="'+i+'"'+(i===img?' class="on"':'')+'>'+E(k)+'</button>').join('');
    maps.innerHTML='<div class="rd-gen"><div class="h">Input</div><img id="ve-la-in" alt="input image" style="width:100%;max-width:168px;aspect-ratio:1;border-radius:4px;display:block;margin:0 auto"><div class="c">224 px</div></div>'+
      ORDER.map(w=>'<div class="rd-gen"><div class="h">'+U.ENC[w]+'</div><canvas id="ve-la-'+w+'" width="160" height="160"></canvas><div class="c" id="ve-la-c-'+w+'"></div></div>').join('');
    const NL=D.layers.length;
    const CAP=['Block 0, the patch embedding plus positions. SigLIP 2\'s map is a smooth gradient across the grid: its position vectors dominate the tokens here (its block-0 probe reaches only about 20%, chart above). DINOv2\'s follows pixel content patch by patch; MAE\'s already looks like a blurred copy of the picture.',
      'Block 2: the layout of the picture appears in every model; colours still follow brightness and colour more than meaning.',
      'Block 4: regions of similar texture share a colour; in SigLIP 2 and DINOv2 the object starts to separate from the background.',
      'Block 6: DINOv2 and SigLIP 2 separate the object cleanly; DINOv2 starts to colour its parts (on the cat: eyes, nose and fur get different colours).',
      'Block 8: DINOv2 colours object parts consistently (eyes, nose, fur; the puppy against the grass). In SigLIP 2 single saturated patches can appear near the corners: its high-norm tokens (section 3), left out of the fit but still drawn.',
      'Block 10: SigLIP 2\'s background turns speckled while the object stays; its patch tokens are being reshaped for the pooled output. DINOv2\'s map stays clean. MAE\'s stays smooth and close to the picture\'s own colours and edges, the mark of a pixel-reconstruction objective.',
      'Block 12, the last: what a dense head or a VLM projector reads by default. DINOv2 gives the cleanest part map, as its dense-probe scores predict; SigLIP 2\'s map is noisy, the object only faintly visible on some images; CLIP\'s 7 &times; 7 grid is too coarse to show shape at all.'];
    function draw(i){$('ve-la-in').src=VE.thumbs[D.pick[img]];
      ORDER.forEach(w=>{const e=D.enc[w],g=e.grid,P=g*g,off=((img*NL+i)*P)*3,a=fr[w];
        U.grid($('ve-la-'+w),g,k=>[a[off+k*3],a[off+k*3+1],a[off+k*3+2]]);
        $('ve-la-c-'+w).textContent=g+' x '+g+', 3 PCs carry '+U.pct(e.var3[img][i],0)});
      cap.innerHTML='<div class="t">Block '+D.layers[i]+' of 12</div><p>'+CAP[i]+'</p>';
      cnt.innerHTML=RD.stat('Block',D.layers[i]+' / 12','')+RD.stat('Image',E(D.pick[img]),'')+RD.stat('Patches drawn','49, 196, 256, 196','CLIP, SigLIP 2, DINOv2, MAE')}
    const A=RD.anim({card:'ve-la',ctl:'ve-la-ctl',n:NL,draw,ms:1700,label:'Block'});
    chips.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;img=+b.dataset.i;chips.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));A.redraw()});
    RD.onResize(()=>A.redraw())})();
})();
