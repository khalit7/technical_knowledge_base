// ---- Scene: a classifier written in words (§3.1.2) against a fixed supervised head (renderer v2). Zero-shot: one test photo's embedding in front, the
// classifier's rows (one per class, each the text embedding of "a photo of a {class}") on a glass plate behind it, aligned number by number; dots stream from
// the image into each row in proportion to its probability, and the argmax lifts; then two new sentences make a new classifier. Supervised head: a glass
// plate of 36 unnamed rows learned from labels (drawn, not run: the toy ships no such head). Numbers: the shipped toy CLIP. ----
(function(){
  if(!$('stg-zs')||!window.CS)return;const {at,lerp,mix}=S3;
  const YW=.42,ZI=2.05,XC=-2.6,WD=3.2,XS=2.55,zr=(r,m)=>-1.9+r*(m===2?1.1:.52);
  let mode='zs';
  function image(R,k,e,P,D,feat){CS.card(R,D.ZP.img,[XC,0,ZI],.8,1);
    if(k===0)R.flow([[XC+.38,.33,ZI],[-WD/2-.1,YW+.05,ZI]],{c:P.c1,a:e,r:.06,n:6});
    CS.comb(R,[0,YW,ZI],feat?D.zi.f:D.zi.e,feat?D.mF:D.mE,mix(P.paper,P.c1,.55),k===0?e:1,.34,WD,'x');
    R.label([WD/2+.15,YW,ZI],feat?'features':'image',{al:'left',dx:6,mono:true,fs:12,c:P.c1,grp:'r'})}
  function zs(R,k,e){const P=R.P,D=CS.data();image(R,k,e,P,D,false);
    const two=k===4,set=two?D.Z2:D.Z6,cls=two?D.ZS2:D.ZC,m=cls.length,old=k===4?Math.max(0,1-2*e):1,nu=k===4?Math.max(0,2*e-1):1,a=two?nu:old;
    if(k===4&&old>0)D.ZC.forEach((c,r)=>{R.label([-WD/2-.25,YW,zr(r,6)],'"a photo of a '+c+'"',{al:'right',dx:-6,serif:true,fs:12.5,a:old,grp:'s'});CS.comb(R,[0,YW,zr(r,6)],D.Z6.W[r],D.mE,mix(P.paper,P.c4,.55),old,.2,WD,'x')});
    if(a<=0)return;
    // 2. the classes as sentences; 3. the text encoder (a glass plate) writes one row per sentence
    const sa=k<1?0:k===1?e:a;cls.forEach((c,r)=>R.label([-WD/2-.25,YW,zr(r,m)],'"a photo of a '+c+'"',{al:'right',dx:-6,serif:true,fs:12.5,a:sa,b:k>=3&&r===set.best,c:k>=3&&r===set.best?P.c1:P.ink,grp:'s'}));
    const wa=k<2?0:k===2?e:a;
    if(wa>0){R.glass([-WD/2-.1,YW-.09,zr(0,m)-.3],[WD+.2,0,0],[0,0,zr(m-1,m)-zr(0,m)+.6],{c:P.c4,a:wa,nu:8,nv:m});
      R.label([0,YW,zr(0,m)-.3],'classifier: one row per sentence',{mono:true,fs:12,dy:-16,c:P.c4,a:wa});
      cls.forEach((c,r)=>{CS.comb(R,[0,YW,zr(r,m)],set.W[r],D.mE,mix(P.paper,P.c4,.55),wa,.2,WD,'x');
        if(k===2||k===4&&nu>0)R.flow([[-WD/2-.9,YW+.1,zr(r,m)],[-WD/2+.1,YW+.1,zr(r,m)]],{c:P.c4,a:wa,r:.05,n:3,speed:.9})})}
    // 4. cosine x scale, then softmax: the image streams into every row, more dots where the probability is higher; the largest lifts
    const pa=k<3?0:k===3?e:a;
    if(pa>0)cls.forEach((c,r)=>{const p=set.p[r],b=r===set.best,z=zr(r,m),h=Math.max(.015,p*1.3*pa),lift=b?.3*pa:0;
      if(k===3||k===4)R.flow([[0,YW+.42,ZI-.2],[0,YW+.42,z],[XS-.3,.35,z]],{c:P.c1,a:pa*(.25+.75*Math.min(1,p*2)),r:.04+.05*p,n:Math.max(2,Math.round(3+p*12)),speed:1.5});
      R.box([XS,lift,z],[.42,h,.36],{fill:b?mix(P.paper,P.c1,.85):mix(P.paper,P.c1,.25),a:pa});
      if(b)R.glow([XS,lift+h+.1,z],.4,{c:P.c1,a:pa*.6});
      R.label([XS+.3,lift+h*.5,z],CS.pct(p),{al:'left',dx:4,mono:true,fs:12,b:b,c:b?P.c1:P.mute,a:pa,grp:R.W<520&&b?undefined:'pc'})})}
  function sup(R,k,e){const P=R.P,D=CS.data();image(R,k,e,P,D,true);
    const ha=at(k,e,1),z0=-2.1,z1=1.1;
    if(ha>0){R.glass([-WD/2-.1,YW-.05,z0],[WD+.2,0,0],[0,0,z1-z0],{c:P.mute,a:ha,nu:8,nv:36});
      R.label([0,YW,z0],'36 unnamed rows × 32 weights',{mono:true,fs:12,dy:-14,c:P.mute,a:ha})}
    if(k>=2){const a=at(k,e,2);R.flow([[0,YW+.4,ZI-.2],[0,YW+.4,-.5],[XS-.3,.3,-.5]],{c:P.c1,a:a*(k===2?1:.4),r:.06,n:9,speed:1.4});
      R.glass([XS-.2,.02,z0],[.4,0,0],[0,0,z1-z0],{c:P.mute,a,nu:1,nv:36});const zh=z0+(z1-z0)*(18.5/36);
      R.box([XS,.03,zh],[.4,.12,(z1-z0)/36],{fill:P.c1,a,shadow:false});R.label([XS+.25,.12,zh],'answer: a row index',{al:'left',dx:6,mono:true,fs:12,c:P.c1,a,grp:'r'})}
    if(k>=3){const a=at(k,e,3);R.quad([[-WD/2-.1,YW,z1+.15],[WD/2+.1,YW,z1+.15],[WD/2+.1,YW,z1+.55],[-WD/2-.1,YW,z1+.55]],{ec:P.bad,a,dash:[5,4],lw:1.4,fa:0});
      R.label([-WD/2-.25,YW,z1+.35],'"small or big?": no row for it',{al:'right',dx:-6,mono:true,fs:12,b:1,c:P.bad,a,grp:'s'})}
    if(k>=4){const a=e;for(let s=0;s<5;s++)R.box([-4.3,s*.13,-1],[.7,.11,.7],{fill:mix(P.paper,P.c5,.2+.1*s),a,shadow:s===0});
      R.label([-4.3,.7,-1],'new labelled photos',{mono:true,fs:12,dy:-8,c:P.c5,a});R.flow([[-3.9,.5,-1],[-WD/2,YW+.1,-.5]],{c:P.c5,a,r:.07,n:7,speed:1.2})}}
  function draw(R,k,e){R.grid(-5,4.2,-3,3,.5);if(mode==='zs')zs(R,k,e);else sup(R,k,e)}
  const full={cam:[.1,.78],bounds:[[-3.05,0,-2.4],[3.1,.9,2.6]]};
  const st=S3.stage({id:'stg-zs',list:'sx-zs',fig:'§3.1.2 · a classifier written in words',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1400,hold:5000,draw,
    margin:w=>w<520?[14,10,14,10]:[18,40,14,120],
    onStep:()=>{try{const D=CS.data();$('zs-best').textContent=D.ZC[D.Z6.best]+' with '+CS.pct(D.Z6.p[D.Z6.best]);$('zs-two').textContent=D.ZS2[D.Z2.best]+' with '+CS.pct(D.Z2.p[D.Z2.best])}catch(err){__jsErr('zero-shot: '+err.message)}}});
  segBind('zsM',m=>{mode=m;$('zsM').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));['zs','sup'].forEach(x=>$('sx-'+x).hidden=x!==m);if(st)st.list('sx-'+m)});
})();
