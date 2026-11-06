// ---- Scene: multi-head attention at the paper's sizes (512 split into 8 heads of 64), then the toy model's real heads ----
(function(){
  if(!$('stg-mh'))return;const {at,off,lerp,mix}=S3;
  const HC=['#4e79a7','#f28e2b','#59a14f','#b07aa1','#d4a72c','#76b7b2','#e15759','#9c755f'].map(S3.rgb);
  const S='the big dog chased the small cat'.split(' '),n=S.length;
  let HA=null;function heads(){if(HA)return HA;try{const r=TM.translate(TM.load('full'),S);HA=r.enc[1]}catch(e){HA=[0,1,2,3].map(()=>S.map(()=>S.map(()=>1/n)))}return HA}
  const U=1,XS=i=>-4+U*(i+.5);           // slice i of the 512-wide vector: 64 dims per world unit
  function draw(R,k,e){const P=R.P,nar=R.W<620;R.grid(-6,6,-3.4,2.8,.5);
    const pa=k>=4?off(k,e,4):1;          // the paper-size drawing leaves at the last step
    if(pa>0){
      // the 512-wide input vector, then its eight 64-wide slices fanning out into the heads
      const sp=k===0?0:k===1?e:k===2?1:k===3?1-e:0,cat=k>=3?at(k,e,3):0;
      R.box([0,0,2],[8,.32,.55],{fill:mix(P.paper,P.c1,.3),a:pa});R.label([-4,.16,2],'x · 512 numbers',{al:'right',dx:-8,mono:true,fs:12,c:P.c1,a:pa,grp:'r'});
      for(let i=0;i<8;i++){const gx=XS(i)*(1+.32*sp),z=lerp(2,.5,Math.min(1,sp*1.4)),a=pa*(k===0?0:k===1?e:1);
        ['q','k','v'].forEach((r,j)=>R.box([gx,j*.2,z-.25+j*.0],[U*.86,.16,.5],{fill:j===0?HC[i]:mix(P.paper,HC[i],j===1?.6:.35),a:a*(1-cat)}));
        if(k>=1&&k<3)R.label([gx,.62,z],'head '+(i+1),{mono:true,fs:12,a:a,dy:-4,c:HC[i]})}
      if(k>=1&&k<3)R.label([XS(0)*1.32,.3,.5],'q, k, v · 64 each',{al:'right',dx:-8,mono:true,fs:12,c:P.mute,a:pa*(k===1?e:1),grp:'r'});
      // each head's own n × n attention weights
      if(k>=2){const a=pa*(k===2?e:1-cat);for(let i=0;i<8;i++){const gx=XS(i)*1.32,z0=-1.1,sz=.86;R.quad([[gx-sz/2,0,z0-sz/2],[gx+sz/2,0,z0-sz/2],[gx+sz/2,0,z0+sz/2],[gx-sz/2,0,z0+sz/2]],{fill:mix(P.paper,HC[i],.3),a});
        for(let c=1;c<4;c++){const t=-sz/2+sz*c/4;R.line([[gx+t,0,z0-sz/2],[gx+t,0,z0+sz/2]],{c:HC[i],w:.8,a:a*.6});R.line([[gx-sz/2,0,z0+t],[gx+sz/2,0,z0+t]],{c:HC[i],w:.8,a:a*.6})}}
        R.label([XS(0)*1.32-.5,0,-1.1],'n × n weights per head',{al:'right',dx:-8,mono:true,fs:12,c:P.mute,a,grp:'r'})}
      // concatenate back to 512 and project with W_O
      if(k>=3){for(let i=0;i<8;i++){R.box([XS(i),0,-1.9],[U*.98,.28,.5],{fill:HC[i],a:pa*cat})}
        R.box([0,0,-3],[8,.08,.9],{fill:mix(P.paper,P.ink,.12),a:pa*cat});R.box([0,.08,-3],[8,.3,.55],{fill:mix(P.paper,P.c1,.3),a:pa*cat});
        R.label([-4,.14,-1.9],'concat · 8 × 64 = 512',{al:'right',dx:-8,mono:true,fs:12,c:P.mute,a:pa*cat,grp:'r'});R.label([-4,.2,-3],'× Wᴼ (512 × 512) → 512',{al:'right',dx:-8,mono:true,fs:12,c:P.c1,a:pa*cat,grp:'r'})}
    }
    // the toy model's four real heads on one sentence: rows are queries, columns keys, height the weight
    if(k>=4){const H=heads(),a=at(k,e,4),cs=.42,pw=n*cs,gap=.6,x0=-(4*pw+3*gap)/2;
      H.forEach((M,h)=>{const ox=x0+h*(pw+gap),col=HC[h];R.quad([[ox,0,-pw/2],[ox+pw,0,-pw/2],[ox+pw,0,pw/2],[ox,0,pw/2]],{fill:mix(P.paper,col,.12),a});
        M.forEach((row,i)=>row.forEach((w,j)=>{if(w<.02)return;R.box([ox+cs*(j+.5),0,-pw/2+cs*(i+.5)],[cs*.8,w*1.8*a,cs*.8],{fill:mix(P.paper,col,.35+.6*w),a,ea:.5})}));
        R.label([ox+pw/2,0,-pw/2],'head '+(h+1),{mono:true,fs:12.5,b:1,c:col,dy:-18,a})});
      if(!nar||true)S.forEach((w,j)=>R.label([x0+cs*(j+.5),0,n*cs/2],w,{serif:true,fs:12,dy:12+(j%2?13:0),a,wide:1}));
      S.forEach((w,i)=>R.label([x0,0,-pw/2+cs*(i+.5)],w,{serif:true,fs:12,al:'right',dx:-6,a,grp:'q'}));
      R.label([x0+pw/2,0,pw/2],'keys →',{mono:true,fs:12,c:P.mute,dy:44,a,wide:1})}
  }
  S3.stage({id:'stg-mh',list:'sx-mh',fig:'Fig. 4 · eight heads at the base model\'s sizes',cam:[.35,.8],bounds:k=>[[-6.4,0,-3.4],[6.4,1.6,2.6]],draw,dur:1400,hold:2600,aspect:.62});
})();
