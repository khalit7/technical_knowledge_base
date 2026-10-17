// ---- Encoder comparison tab (t-vecmp) ----
(function(){
  const $=id=>document.getElementById(id),E=RD.esc,U=VEU,D=VE.dense,ORDER=['clip','siglip','dino','dinoreg','mae'],NL=D.layers.length;
  let img=0,layer=NL-1,view='pca',pt=[0.5,0.5];
  const fr={},last={},pc={},nr={},at={};
  ORDER.forEach(w=>{const e=D.enc[w];if(e.frames)fr[w]=U.u8(e.frames);last[w]=U.u8(e.last);pc[w]=U.i8(e.pc8);nr[w]=U.u8(e.normRatio);if(e.att)at[w]=U.u8(e.att)});
  $('vc-img').innerHTML=D.pick.map((k,i)=>'<button data-i="'+i+'"'+(i===img?' class="on"':'')+'>'+E(k)+'</button>').join('');
  $('vc-maps').innerHTML='<div><div class="h">Input (224 px)</div><img id="vc-in" alt="input image"><div class="c">click a map to pick a patch</div></div>'+
    ORDER.map(w=>'<div><div class="h">'+U.ENC[w]+'</div><canvas id="vc-'+w+'" data-w="'+w+'" width="190" height="190"></canvas><div class="c" id="vc-c-'+w+'"></div></div>').join('');
  const allIdx=k=>D.allkeys.indexOf(D.pick[k]);
  function patchAt(g){const x=Math.min(g-1,Math.floor(pt[0]*g)),y=Math.min(g-1,Math.floor(pt[1]*g));return y*g+x}
  function draw(){
    $('vc-in').src=VE.thumbs[D.pick[img]];
    const lv=view==='pca'?D.layers[layer]:12;$('vc-lv').textContent=lv;$('vc-layer').disabled=view!=='pca';
    $('vc-note').textContent=view==='pca'?'DINOv2 with registers: last block only':'this view uses the last block';
    ORDER.forEach(w=>{const e=D.enc[w],g=e.grid,P=g*g,cv=$('vc-'+w),c=$('vc-c-'+w);
      if(view==='pca'){let a,off;if(layer===NL-1||!fr[w]){a=last[w];off=img*P*3}else{a=fr[w];off=((img*NL+layer)*P)*3}
        U.grid(cv,g,k=>[a[off+k*3],a[off+k*3+1],a[off+k*3+2]]);c.textContent=g+' x '+g+(layer<NL-1&&!fr[w]?', last block':'')+', 3 PCs carry '+U.pct(layer<NL-1&&!fr[w]?(e.summary.var3_last_mean):e.var3[img][fr[w]?layer:NL-1],0)}
      else if(view==='sim'){const q=patchAt(g),a=pc[w],base=img*P*8;const sims=new Float32Array(P);let nq=0;
        for(let d=0;d<8;d++)nq+=a[base+q*8+d]**2;
        for(let k=0;k<P;k++){let dot=0,nk=0;for(let d=0;d<8;d++){const v=a[base+k*8+d];dot+=v*a[base+q*8+d];nk+=v*v}sims[k]=dot/Math.sqrt(nq*nk+1e-9)}
        let lo=1;for(const v of sims)lo=Math.min(lo,v);U.grid(cv,g,k=>U.ramp((sims[k]-lo)/(1-lo+1e-9)),q);c.textContent='cosine to the outlined patch (8 PCs; r = '+e.pc8corr.toFixed(2)+' with the full cosines)'}
      else if(view==='norm'){const a=nr[w],ai=allIdx(img),off=ai*P;U.grid(cv,g,k=>U.ramp(Math.min(1,(a[off+k]/10-0.5)/3.5)));
        let mx=0;for(let k=0;k<P;k++)mx=Math.max(mx,a[off+k]/10);c.textContent='norm / median, max '+mx.toFixed(1)+'x'}
      else{if(!at[w]){U.grid(cv,1,()=>[128,128,128]);c.textContent='no [CLS] token: SigLIP pools with its MAP head';return}
        const a=at[w],off=img*P;U.grid(cv,g,k=>U.ramp(a[off+k]/255));c.textContent='last block, [CLS] row, heads averaged'}});
    $('vc-cap').innerHTML={pca:'Each patch token of the chosen block is projected on that block\'s top 3 principal components (per image), shown as red, green and blue. Similar colours mean similar vectors. Components are fitted without high-norm outlier tokens (more than 3 times the median norm), which would otherwise take a component each; signs are aligned block to block so colours do not flip.',
      sim:'Only the 8 leading principal components of the last block\'s unit-length patch tokens are shipped per image (int8), so these cosines approximate the full 768-number ones; the correlation with the full cosines is under each map. Enough to see which encoder finds the matching parts of an object.',
      norm:'Token L2 norm in the last block, divided by the image\'s median patch norm; colour saturates at 4 times. SigLIP 2 shows three bright fixed slots in every image (a fourth on the flat synthetic images); DINOv2 B mild ones; with registers they are gone.',
      att:'Attention of the [CLS] token over the patches in the last block, averaged over the 12 heads and scaled to its maximum. Attention is not an explanation (see the Vision lab), but outlier tokens show up here as bright dots.'}[view]}
  $('vc-img').addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;img=+b.dataset.i;$('vc-img').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));draw()});
  RD.seg($('vc-view'),m=>{view=m;draw()});
  $('vc-layer').addEventListener('input',e=>{layer=+e.target.value;draw()});
  $('vc-maps').addEventListener('click',ev=>{const cv=ev.target.closest('canvas');if(!cv)return;const r=cv.getBoundingClientRect();
    pt=[(ev.clientX-r.left)/r.width,(ev.clientY-r.top)/r.height];if(view!=='sim'){view='sim';$('vc-view').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x.dataset.m==='sim'))}draw()});
  // scoreboard table
  const PR=VE.probes.encoders,ROWS=['clip','siglip','dino_cls','dino_mean','dino_cat','mae_cls','mae_mean'];
  const COLS=[['Dim',r=>r.dim,0],['Probe k=1',r=>r.linear_probe['1'].mean],['Probe k=16',r=>r.linear_probe['16'].mean],['Probe k=500',r=>r.linear_probe['500'].mean],
    ['kNN',r=>r.knn20],['Img to img P@1',r=>r.img2img['p@1']],['P@10',r=>r.img2img['p@10']],['mAP',r=>r.img2img.map],['Text to img P@100',r=>r.txt2img?r.txt2img['p@100']:null]];
  let sortC=3;
  function table(){const rows=ROWS.slice().sort((a,b)=>(COLS[sortC][1](PR[b])??-1)-(COLS[sortC][1](PR[a])??-1));
    const best=COLS.map(c=>Math.max(...ROWS.map(k=>c[1](PR[k])??-1)));
    let h='<table><thead><tr><th>Vector</th>'+COLS.map((c,i)=>'<th class="num sort" data-c="'+i+'">'+c[0]+(i===sortC?' &darr;':'')+'</th>').join('')+'</tr></thead><tbody>';
    rows.forEach(k=>{h+='<tr><td>'+U.ENC[k]+'</td>'+COLS.map((c,i)=>{const v=c[1](PR[k]);return '<td class="num'+(i&&v===best[i]?' best':'')+'">'+(v==null?'<span class="mute">no text tower</span>':i===0?v:U.pct(v))+'</td>'}).join('')+'</tr>'});
    $('vc-table').innerHTML=h+'</tbody></table>';
    $('vc-tnote').innerHTML='Probe: '+E(VE.probes.settings.probe)+'. kNN: '+E(VE.probes.settings.knn)+'. Retrieval: '+E(VE.probes.settings.retrieval)+'; text queries are the 10 class sentences of each model\'s best Vision lab prompt set. CPU float32, '+E(VE.probes.date)+' <span class="meas">measured</span>; script <code>src/runs/probes.py</code>.'}
  $('vc-table').addEventListener('click',ev=>{const th=ev.target.closest('th[data-c]');if(!th)return;sortC=+th.dataset.c;table()});
  // published Table 4
  const T4=[["CLIP","ViT-L/14","WIT-400M",79.8,84.3],["CLIP","ViT-L/14 at 336","WIT-400M",80.5,85.3],["OpenCLIP","ViT-G/14","LAION-2B",83.2,86.2],["EVA-CLIP","ViT-g/14","custom",83.5,86.4],
    ["MAE","ViT-H/14","ImageNet-1k",49.4,76.6],["DINO","ViT-S/8","ImageNet-1k",78.6,79.2],["iBOT","ViT-L/16","ImageNet-22k",72.9,82.3],
    ["DINOv2","ViT-S/14","LVD-142M",79.0,81.1],["DINOv2","ViT-B/14","LVD-142M",82.1,84.5],["DINOv2","ViT-L/14","LVD-142M",83.5,86.3],["DINOv2","ViT-g/14","LVD-142M",83.5,86.5]];
  $('vc-pub').innerHTML='<table><thead><tr><th>Method</th><th>Backbone</th><th>Pre-training data</th><th class="num">kNN</th><th class="num">Linear</th><th class="num">Linear minus kNN</th></tr></thead><tbody>'+
    T4.map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td>'+r[2]+'</td><td class="num">'+r[3].toFixed(1)+'</td><td class="num">'+r[4].toFixed(1)+'</td><td class="num">'+(r[4]-r[3]).toFixed(1)+'</td></tr>').join('')+'</tbody></table>';
  RD.onRender(()=>{draw();table()},'t-vecmp');
  addEventListener('resize',()=>{const t=$('t-vecmp');if(t&&!t.hidden)draw()});
})();
