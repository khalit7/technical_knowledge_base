// ---- Scene: the hero, the paper's Figure 1 in 3D (renderer v2). Training: four real pairs of the toy web, their embeddings, the 4 x 4 grid of logits on a
// glass plate between the image-embedding column and the caption-embedding row, and the symmetric loss pulling the diagonal up. Test: one new photo against
// six sentences, the argmax lifting. Every bar is the shipped toy CLIP's output. ----
(function(){
  if(!$('stg-hero')||!window.CS)return;const {at,lerp,mix}=S3;
  const CSZ=1,xs=j=>(j-1.5)*CSZ,zs=i=>(i-1.5)*CSZ,YM=.55,YP=.32,XI=-3.15,ZT=-3.15,XC=-4.5,ZC=-4.25,XS6=j=>(j-2.5)*.74;
  function draw(R,k,e){const P=R.P,D=CS.data(),n=D.n;R.grid(-5.5,3,-5,2.6,.5);
    const tr=k<4?1:k===4?Math.max(0,1-2*e):0,te=k===4?Math.max(0,2*e-1):k>4?1:0;
    if(tr>0){
      // 1. the pairs: pictures on the left, caption tiles at the back
      D.OBS.forEach((p,i)=>{CS.card(R,p.img,[XC,0,zs(i)],.62,tr);R.label([XC-.42,.3,zs(i)],'I'+(i+1),{al:'right',dx:-4,mono:true,fs:12,b:1,a:tr,grp:'img'})});
      D.OBS.forEach((p,j)=>{CS.tag(R,[xs(j),0,ZC],.74,'T'+(j+1),tr,{lab:{dy:-9,b:1}})});
      // 2. two encoders: each picture and each caption becomes 32 signed numbers; dots stream from the input into its embedding
      const ea=tr*at(k,e,1);
      if(k===1){D.OBS.forEach((_,i)=>{R.flow([[XC+.36,.3,zs(i)],[XI-.62,YP+.05,zs(i)]],{c:P.c1,a:e,r:.06,n:4});R.flow([[xs(i),.12,ZC+.2],[xs(i),YP+.05,ZT-.62]],{c:P.c4,a:e,r:.06,n:4})})}
      D.I.forEach((x,i)=>CS.comb(R,[XI,YP,zs(i)],x.e,D.mE,mix(P.paper,P.c1,.55),ea,.42,1.3,'x'));
      D.T.forEach((x,j)=>CS.comb(R,[xs(j),YP,ZT],x.e,D.mE,mix(P.paper,P.c4,.55),ea,.42,1.3,'z'));
      if(k>=1){R.label([XI,YP+.5,zs(0)-.5],'image embeddings',{mono:true,fs:12,c:P.c1,a:ea,grp:'hd'});R.label([xs(1.5),YP+.95,ZT-.55],'caption embeddings',{mono:true,fs:12,dy:-12,c:P.c4,a:ea,grp:'hd'})}
      // 3. the similarity grid on a glass plate; dots stream along every row from its image and down every column from its caption
      const ga=tr*at(k,e,2);
      if(ga>0){R.glass([-2,YM,-2],[4,0,0],[0,0,4],{c:P.c5,a:ga,nu:4,nv:4});
        if(k===2)for(let i=0;i<n;i++){R.flow([[XI+.62,YP+.1,zs(i)],[1.9,YM+.08,zs(i)]],{c:P.c1,a:e*.9,r:.055,n:7,speed:1.4});R.flow([[xs(i),YP+.1,ZT+.62],[xs(i),YM+.08,1.9]],{c:P.c4,a:e*.9,r:.055,n:7,speed:1.4})}
        for(let i=0;i<n;i++)for(let j=0;j<n;j++){const lg=D.L[i][j],pm=(D.row[i][j]+D.col[i][j])/2,d=i===j;
          const h0=Math.abs(lg)/D.mL*1.15,h1=pm*1.5,t=k<3?0:k===3?e:1,h=Math.max(.015,lerp(h0,h1,t)*(k===2?e:1)),neg=lg<0&&t<.5;
          const fill=t>0?(d?mix(P.paper,P.good,.35+.5*t):mix(P.paper,P.c5,.25)):(lg>=0?mix(P.paper,P.c5,.55):mix(P.paper,P.c5,.2));
          R.box([xs(j),neg?YM-h:YM,zs(i)],[.46,h,.46],{fill,a:ga*(t>0&&!d?1-.5*t:1),shadow:false});
          if(k>=3&&d){R.label([xs(j),YM+h,zs(i)],CS.pct(pm),{mono:true,fs:12,dy:-10,b:1,c:P.good,a:ga*t});
            if(k===3)R.flow([[xs(j),YM+h+.05,zs(i)],[xs(j),YM+h+.55,zs(i)]],{c:P.good,a:e,r:.05,n:3,speed:.8})}
          if(k===3&&!d&&pm<.5)R.line([[xs(j),YM+h+.42,zs(i)],[xs(j),YM+h+.08,zs(i)]],{c:P.c2,w:1.6,head:6,a:e*.7})}
        R.label(k>=3?[0,YM,2.25]:[2.1,YM,-2],k>=3?'softmax, rows and columns':'logits = cos × scale',{al:k>=3?'center':'left',dx:k>=3?0:6,dy:k>=3?16:0,mono:true,fs:12,c:k>=3?P.good:P.c5,a:ga,grp:'hd'})}
    }
    if(te>0){
      // 5. test: one new photo, six classes written as sentences, embedded once by the text encoder
      CS.card(R,D.ZP.img,[XC,0,0],.7,te);R.label([XC,.85,0],'new image',{mono:true,fs:12,dy:-6,a:te,c:P.mute});
      CS.comb(R,[XI,YP,0],D.zi.e,D.mE,mix(P.paper,P.c1,.55),te,.42,1.3,'x');
      D.ZC.forEach((c,j)=>{CS.tag(R,[XS6(j),0,ZC],.64,null,te);R.label([XS6(j),YM,.4],c,{mono:true,fs:12,dy:14,a:te,c:j===D.Z6.best&&k>=5?P.c1:P.ink,b:j===D.Z6.best&&k>=5,wide:j===D.Z6.best?0:1});
        CS.comb(R,[XS6(j),YP,ZT],D.Z6.W[j],D.mE,mix(P.paper,P.c4,.55),te,.42,1.3,'z');
        if(k===4)R.flow([[XS6(j),.12,ZC+.2],[XS6(j),YP+.05,ZT-.62]],{c:P.c4,a:te,r:.05,n:4})});
      R.label([XS6(0)-.5,.12,ZC],'"a photo of a …"',{al:'right',dx:-6,mono:true,fs:12,c:P.mute,a:te,grp:'hd'});
      // 6. one row of the grid: the image against every sentence, then the softmax; the largest lifts
      const sa=at(k,e,5);
      if(sa>0){R.glass([XS6(0)-.37,YM,-.37],[6*.74,0,0],[0,0,.74],{c:P.c5,a:sa,nu:6,nv:1});
        if(k===5)R.flow([[XI+.62,YP+.1,0],[XS6(5)+.3,YM+.08,0]],{c:P.c1,a:e,r:.06,n:9,speed:1.4});
        D.Z6.p.forEach((p,j)=>{const b=j===D.Z6.best,lift=b?.25*sa:0,h=Math.max(.015,p*1.05*sa);
          R.box([XS6(j),YM+lift,0],[.44,h,.44],{fill:b?mix(P.paper,P.c1,.85):mix(P.paper,P.c1,.25),a:sa,shadow:false});
          if(b){R.glow([XS6(j),YM+lift+h+.12,0],.45,{c:P.c1,a:sa*.6});R.label([XS6(j),YM+lift+h,0],CS.pct(p),{mono:true,fs:12.5,dy:-12,b:1,c:P.c1,a:sa})}})}
    }
  }
  const train={cam:[.34,.68],bounds:[[-5,0,-4.5],[2.2,1.7,2.1]]},test={cam:[.3,.6],bounds:[[-5,0,-4.6],[2.2,1.8,1]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · learn by matching pairs, classify by matching sentences',cam:train.cam,bounds:train.bounds,aspect:.62,dur:1400,hold:5200,draw,
    view:k=>k>=4?test:train,margin:w=>w<520?[14,10,14,10]:[18,14,14,60],
    onStep:()=>{try{const D=CS.data();$('hr-caps').innerHTML=D.OBS.map((p,j)=>'<b>T'+(j+1)+'</b> "'+p.cap+'"').join(', ');$('hr-loss').textContent=D.loss.toFixed(3);
      $('hr-zs').textContent=D.ZC[D.Z6.best]+' with '+CS.pct(D.Z6.p[D.Z6.best])}catch(err){__jsErr('hero: '+err.message)}}});
})();
