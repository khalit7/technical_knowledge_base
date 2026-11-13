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
