// ---- Scene (Fig. 2, stg-cut): three cuts to what a decoded token reads. One column per release, whole model at a 131,072-token context:
// solid = what one decoded token reads (blue: cache entries, gold: indexer keys), teal glass behind = what the cache stores. Heights in numbers
// from window.DS; the scale changes between steps (geometric glide) so each new column is drawn large, and a column taller than the card is cut
// with its ratio written on it. V4-Pro's column is its 61 layers, CSA and HCA drawn alternating. ----
(function(){
  if(!document.getElementById('stg-cut')||!window.DS)return;const {lerp,mix}=S3,D=DS,C=D.C;
  const ORD=['mha','mla','dsa','v4'],X={mha:-3.3,mla:-1.1,dsa:1.1,v4:3.3},W=.9,ZT=1.55,CAP=4.3;
  // the column each step is scaled to (drawn 3 units tall), and the first step each column appears at
  const REF=['mha','mla','mla','dsa','v4'],H0={mha:3.6,mla:3,dsa:3,v4:2.6},FROM={mha:0,mla:1,dsa:2,v4:3};
  const sc=k=>H0[REF[k]]/C[REF[k]].read;
  const F=v=>v.toLocaleString('en-GB');
  function draw(R,k,e,st){const P=R.P;R.grid(-5,5,-1.6,2.2,.5);
    const a0=sc(st.pk),a1=sc(k),s=e>=1||a0===a1?a1:Math.exp(lerp(Math.log(a0),Math.log(a1),e));
    const ref=C[REF[k]];
    ORD.forEach(id=>{const c=C[id],x=X[id],f=FROM[id];
      // arrival: 0 before its step, eased in on its step; the current column at full strength, the others receding a little
      const ar=k>f?1:k===f?(st.pk>=f?1:e):(st.pk>f?1-e:0);
      // the footprint of a column still to come (so the layout is visible from step 1)
      if(ar<1)R.quad([[x-W/2,0,-W/2],[x+W/2,0,-W/2],[x+W/2,0,W/2],[x-W/2,0,W/2]],{fill:P.soft,fa:.5,ec:P.line,ea:.9,dash:[4,3],a:1-ar});
      if(ar<=.01)return;
      const cur=(k===f)||(k===4&&id==='v4'),fade=cur?1:k===4?.16:.6,a=ar*fade;
      // stored: a teal glass case around the column, as tall as the cache
      const hs=c.stored*s,hsc=Math.min(hs,CAP),GW=W+.22;
      R.box([x,0,0],[GW,hsc,GW],{fill:mix(P.paper,P.c6,.55),fa:.16,ec:P.c6,ea:.85,lw:1,a,shadow:false,dz:-.02});
      // read: stacked boxes, entries blue and indexer keys gold; V4-Pro layer by layer
      let y=0;const put=(h,fill)=>{if(y>=CAP||h<=0)return;const hh=Math.min(h,CAP-y);R.box([x,y,0],[W,Math.max(.004,hh),W],{fill,a,shadow:y===0,lw:.6,ea:.5});y+=hh};
      if(id==='v4'){for(let i=0;i<61;i++){const l=c.layers[i%2?0:1];put((l.read-l.idx)*s,P.c1);put(l.idx*s,P.c5)}}
      else{const l=c.layers[0];put(l.n*(l.read-l.idx)*s,P.c1);put(l.n*l.idx*s,P.c5)}
      const hr=c.read*s,cut=hr>CAP+1e-6;
      if(cut){R.box([x,CAP,0],[W+.06,.05,W+.06],{fill:P.bg,a,shadow:false,edge:false});
        if((id==='mha'&&k<=2)||(id==='mla'&&k===3))R.label([x,CAP,GW/2],'cut: '+Math.round(c.read/ref.read)+'× the '+(REF[k]==='mla'?'MLA':'DSA')+' column',{fs:12,b:1,dy:-14,c:P.mute,a:a,wide:1})}
      // flows: what the token reads streams down to it, blue and gold in proportion
      if(cur&&ar>.3){const top=Math.min(hr,CAP),ib=c.idx/c.read,tk=[x,.22,ZT];
        R.flow([[x,top*.5*(1-ib),W/2+.02],[x,.3,ZT-.3],tk],{c:P.c1,a:ar,r:.07,n:Math.max(2,Math.round(9*(1-ib))),speed:1.1});
        if(ib>.01)R.flow([[x+.18,top*(1-ib/2),W/2+.02],[x+.1,.35,ZT-.3],tk],{c:P.c5,a:ar,r:.07,n:Math.max(2,Math.round(9*ib)),speed:1.1});
        R.glow(tk,.32,{c:P.c2,a:ar*.7});R.ball(tk,.11,{c:P.c2,a:ar});R.label(tk,'one decoded token',{fs:12,dy:18,c:P.c2,a:ar,wide:1})}
      // labels: name under the column, read on its front top, stored on the pane when it differs
      if(k<4||cur)R.label([x,0,W/2+.2],c.name,{fs:12.5,b:cur,dy:14,c:cur?P.ink:P.mute,a:Math.max(.45,ar*fade),wide:cur?0:1});
      if(!cut&&(k<4||cur))R.label([x,Math.min(hr,CAP),GW/2],D.big(c.read)+' read',{mono:true,fs:12,b:1,dy:-14,c:c.idx?P.ink:P.c1,a,al:'center'});
      if(c.stored>c.read*1.01&&cur)R.label([x+GW/2,hsc,GW/2],(hs>CAP?'stored, cut: ':'stored ')+D.big(c.stored),{mono:true,fs:12,b:1,al:'left',dx:8,dy:hs>CAP?14:0,c:mix(P.c6,P.ink,.3),a,wide:1})});
    // step 5: V4-Pro close up, the two layer kinds named
    const la=k===4?e:st.pk===4&&k!==4?1-e:0;
    if(la>.01){const v=C.v4,yc=[(v.layers[1].read)*s,(v.layers[1].read+v.layers[0].read)*s];
      R.label([X.v4+W/2+.11,yc[0]*.5,W/2],'HCA layer · '+F(v.layers[1].read),{al:'left',dx:14,mono:true,fs:12.5,b:1,c:P.c1,a:la,grp:'v4'});
      R.label([X.v4+W/2+.11,yc[0]+(yc[1]-yc[0])*.5,W/2],'CSA layer · '+F(v.layers[0].read),{al:'left',dx:14,dy:-8,mono:true,fs:12.5,b:1,c:mix(P.c5,P.ink,.25),a:la,grp:'v4'})}
  }
  const full={cam:[.32,.36],bounds:[[-4.4,0,-1],[4.4,4.5,1.9]]};
  S3.stage({id:'stg-cut',list:'sx-cut',fig:'Fig. 2 · what one decoded token reads, by release, at 128K',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1700,hold:5200,draw,
    margin:w=>w<520?[14,8,24,8]:[22,16,26,16],
    view:k=>k===0?{cam:[.42,.34],bounds:[[-4.9,0,-1],[-1.7,4.4,1.9]]}:k===4?{cam:[.5,.3],bounds:[[1.0,0,-1],[4.6,4.4,1.9]]}:full});
})();
