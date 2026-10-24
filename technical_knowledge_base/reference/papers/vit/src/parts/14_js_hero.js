// ---- Hero: pixels to patches to tokens to a class, after the paper's Figure 1 (redrawn), on this page's toy image and toy model ----
(function(){const el=$('heroFig');if(!el||!window.TOYGEN||!window.VIT)return;
  const lab=(x,y,t,o)=>{o=o||{};const fs=o.fs||11.5,w=t.length*fs*.56+8;return rc(o.a==='end'?x-w+4:x-4,y-fs,w,fs+5,'var(--bg)',{r:3})+tx(x,y,t,Object.assign({fs},o))};
  function draw(w){const D=demoSample(),img=D.s.img,url=imgURL(img),narrow=w<520;
    const S=Math.round(Math.min(140,Math.max(92,w*.24))),ps=narrow?22:28,gap=narrow?4:6,step=ps+gap,x1=S+30+step;
    const nfit=Math.max(4,Math.min(12,Math.floor((w-x1-4)/step)));
    const idx=[...Array(nfit-2).keys()].concat([-1,48]); // patches 1..n, an ellipsis, then the last patch (49)
    const y0=22,yP=y0+8,yT=y0+S+40,yE=yT+26+22,hE=46,yH=yE+hE+24;let s='';
    // 1. the image and its 7 x 7 patch grid
    s+=tx(0,12,'1. image, cut into patches',{fs:12,w:600});
    s+='<image href="'+url+'" x="0" y="'+y0+'" width="'+S+'" height="'+S+'" preserveAspectRatio="none" style="image-rendering:pixelated"/>'+gridLines(0,y0,S,7,'var(--acc)',.9)+rc(0,y0,S,S,'none',{s:'var(--line)',r:0});
    s+=ln2(S+6,yP+ps/2,x1-8,yP+ps/2,'var(--mute)',{sw:1.2})+tx(x1-10,yP+ps/2+4,'›',{fs:14,c:'var(--mute)'});
    // the patches in raster order, each cropped from the same image
    const xs=[];idx.forEach((p,i)=>{const x=x1+i*step;xs.push(x);if(p<0){s+=tx(x+ps/2,yP+ps/2+4,'…',{fs:14,a:'middle',c:'var(--mute)'});return}
      const r=Math.floor(p/7),c=p%7;s+='<svg x="'+x+'" y="'+yP+'" width="'+ps+'" height="'+ps+'" viewBox="'+(c*4)+' '+(r*4)+' 4 4" preserveAspectRatio="none"><image href="'+url+'" x="0" y="0" width="28" height="28" preserveAspectRatio="none" style="image-rendering:pixelated"/></svg>'+rc(x,yP,ps,ps,'none',{s:'var(--line)',r:0})});
    s+=tx(x1,yP+ps+16,narrow?'49 patches, raster order':'49 patches of 4 × 4 px, in raster order',{fs:11,c:'var(--mute)'});
    // 2. tokens: class token, then one token per patch with its position
    const xc=x1-step;
    idx.forEach((p,i)=>{if(p<0)return;s+=ln2(xs[i]+ps/2,yP+ps+22,xs[i]+ps/2,yT-2,'var(--line)',{sw:1.2})});
    s+=lab(x1,yT-14,narrow?'2. flatten, × E, + position':'2. flatten each patch, multiply by E, add its position embedding',{fs:12,w:600});
    s+=rc(xc,yT,ps,26,'var(--closed2)',{s:'var(--closed)'})+tx(xc+ps/2,yT+17,'0*',{fs:11,a:'middle',w:600,c:'var(--closed)'});
    idx.forEach((p,i)=>{const x=xs[i];if(p<0){s+=tx(x+ps/2,yT+17,'…',{fs:14,a:'middle',c:'var(--mute)'});return}
      s+=rc(x,yT,ps,26,'var(--acc2)',{s:'var(--acc)'})+tx(x+ps/2,yT+17,String(p+1),{fs:11,a:'middle'})});
    // 3. the encoder
    const xe=xc,we=w-xe-2;[xc].concat(xs.filter((x,i)=>idx[i]>=0)).forEach(x=>{s+=ln2(x+ps/2,yT+26,x+ps/2,yE,'var(--line)',{sw:1.2})});
    s+=rc(xe,yE,we,hE,'var(--soft)',{s:'var(--ink)'})+tx(xe+we/2,yE+19,narrow?'Transformer encoder, L layers':'Standard Transformer encoder, L layers (toy 4, ViT-B 12)',{fs:12.5,a:'middle',w:600})+tx(xe+we/2,yE+36,narrow?'every token attends to all':'pre-LN; every token attends to every other from layer 1',{fs:11,a:'middle',c:'var(--mute)'});
    // 4. the head on the class token
    const lbl=KIND[D.s.label],pr=D.r.probs[D.s.label];
    s+=ln2(xc+ps/2,yE+hE,xc+ps/2,yH,'var(--closed)',{sw:1.8})+rc(xc,yH,92,26,'var(--closed2)',{s:'var(--closed)'})+tx(xc+46,yH+17,'MLP head',{fs:11.5,a:'middle',w:600});
    const ct='3. class: "'+lbl+'" twice (p = '+pr.toFixed(2)+')',fitsRight=xc+124+ct.length*6.9<w;
    if(fitsRight)s+=ln2(xc+96,yH+13,xc+118,yH+13,'var(--mute)')+tx(xc+124,yH+17,ct,{fs:12,w:600});
    else s+=tx(Math.max(0,xc-40),yH+46,ct,{fs:12,w:600});
    el.innerHTML=svgW(w,yH+(fitsRight?32:56),s,'ViT: the image is cut into patches, each patch becomes a token with a position, a class token is prepended, a standard Transformer encoder runs, and a head on the class token predicts the class')}
  fit(el,draw)})();

// ---- Results at a glance: Table 2's gaps to BiT-L, and the pre-training compute, read from PAPER.tables.t2 ----
(function(){const el=$('resFig');if(!el)return;
  const T=PAPER.tables.t2,num=v=>parseFloat(String(v).replace(/[^0-9.\-]/g,'')),kd=v=>num(v)*(/k/.test(v)?1000:1);
  const rows=T.rows.filter(r=>r[0]!=='TPUv3-core-days'),cd=T.rows.find(r=>r[0]==='TPUv3-core-days');
  fit(el,w=>{const narrow=w<520,L=narrow?112:200,R=46,X0=-0.25,X1=1.5,X=v=>L+(w-L-R)*(v-X0)/(X1-X0),rh=24;let s='',y=34;
    s+=tx(0,14,'Accuracy minus BiT-L, points (Table 2)',{fs:12,w:600});
    [0,.5,1,1.5].forEach(v=>{s+=ln2(X(v),y-6,X(v),y+rows.length*rh,v===0?'var(--mute)':'var(--line)',{sw:v===0?1.4:1})+tx(X(v),y+rows.length*rh+14,(v>0?'+':'')+v,{fs:11,a:'middle',c:'var(--mute)'})});
    rows.forEach((r,i)=>{const b=num(r[4]),h=num(r[1])-b,l=num(r[2])-b,yy=y+i*rh;
      s+=tx(L-8,yy+12,narrow?r[0].replace('Oxford-IIIT ','').replace('Oxford ','').replace(' (19 tasks)',''):r[0],{fs:11.5,a:'end'});
      s+=rc(Math.min(X(0),X(h)),yy+2,Math.abs(X(h)-X(0)),13,'var(--acc)',{r:2})+'<circle cx="'+X(l).toFixed(1)+'" cy="'+(yy+8.5)+'" r="4.5" fill="var(--bg)" stroke="var(--c2)" stroke-width="2"/>';
      s+=tx(X(Math.max(h,l,0))+8,yy+12,(h>=0?'+':'')+h.toFixed(2),{fs:11,c:'var(--acc)',w:600})});
    y+=rows.length*rh+40;
    s+=tx(0,y,'Pre-training compute, TPUv3-core-days (log scale)',{fs:12,w:600});y+=14;
    const C=[[T.models[3],cd[4]],[T.models[4],cd[5]],[T.models[0],cd[1]],[T.models[1],cd[2]],[T.models[2],cd[3]]],LX=v=>L+(w-L-R)*Math.log10(v/100)/Math.log10(20000/100);
    C.forEach(([n,v],i)=>{const yy=y+i*rh,vit=n.startsWith('ViT');
      s+=tx(L-8,yy+12,narrow?n.replace(' ResNet152x4','').replace(' EfficientNet-L2','').replace('Noisy Student','Noisy St.'):n,{fs:11.5,a:'end'});
      s+=rc(L,yy+2,LX(kd(v))-L,13,vit?'var(--acc)':'var(--dim)',{r:2})+tx(LX(kd(v))+5,yy+12,v,{fs:11,w:vit?600:null})});
    el.innerHTML=svgW(w,y+C.length*rh+4,s,'Table 2: ViT-H/14 minus BiT-L on seven benchmarks, and pre-training compute')})})();
