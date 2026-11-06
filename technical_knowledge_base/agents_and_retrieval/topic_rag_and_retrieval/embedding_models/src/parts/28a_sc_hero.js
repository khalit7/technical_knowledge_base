// ---- Scene: Fig. 1, the bi-encoder in one picture (renderer v2). Data: EMB.anim, bge-small on the shortest SciFact test claim and its
// labelled abstract (tokens, the pooled vector's first 16 of 384 numbers divided by its length, the cosine). The document's own numbers were
// not recorded, so its vector is drawn as an empty plinth. Times in the step list are the table's in section 1.
// Steps: the query lane; the document lane through the same glass plates; the cosine; one query against every stored vector. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.EMB||!EMB.anim)return;const {at,mix}=S3;
  const M=EMB.anim.models['bge-small'],nT=M.tokens.length,len=M.length,V=M.pooled.map(v=>v/len),mV=Math.max(...V.map(Math.abs));
  const ZQ=1.15,ZD=-1.15,XT=-3.4,XM=-1.35,XP=-.35,XV=1.35,XC=3.7,YP=.55;
  // a vector as signed bars on a white plinth (the reference scene's comb)
  function comb(R,c,vals,m,col,a,hmax,wd){if(a<=.01)return;const nb=vals.length,bw=wd/nb;
    R.box([c[0],c[1]-.045,c[2]],[wd+.14,.045,.34],{a,shadow:false});
    [-1,1].forEach(sx=>R.box([c[0]+sx*(wd/2),0,c[2]],[.03,c[1]-.05,.03],{a:a*.9}));
    if(vals)vals.forEach((v,i)=>{const h=Math.max(.014,Math.abs(v)/m*hmax),bx=c[0]-wd/2+bw*(i+.5);
      R.box([bx,v>=0?c[1]:c[1]-.045-h,c[2]],[bw*.7,h,.11],{fill:col,a,shadow:false,lw:.7})})}
  const lane=(x0,x1,z,y)=>{const p=[];for(let i=0;i<=24;i++){const t=i/24;p.push([x0+(x1-x0)*t,y,z])}return p};
  function draw(R,k,e){const P=R.P;R.grid(-5.4,5.4,-2.6,2.6,.5);
    const aq=k===0?1:k===1?.3:1,ad=k===0?.2:1,aIdx=k===3?1:0;
    // the query's tokens: the prefix grey, the claim's own tokens white
    const tw=2.1/nT;M.tokens.forEach((t,i)=>{const pre=i>0&&i<=M.n_prompt;R.box([XT-1.05+tw*(i+.5),0,ZQ],[tw*.8,.16,.32],{fill:pre?mix(P.paper,P.mute,.45):P.paper,a:aq})});
    R.label([XT,0,ZQ+.3],'query · '+nT+' tokens',{fs:12.5,b:1,c:P.c2,dy:14,a:aq});
    // the document: a long slab of tokens, read once at indexing
    R.box([XT,0,ZD],[2.1,.16,.42],{fill:mix(P.paper,P.c1,.18),a:Math.max(.2,ad*at(k,e,1))});
    R.label([XT,.2,ZD-.25],'abstract · '+M.n_doc_tokens+' tokens',{fs:12.5,b:1,c:P.c1,dy:-12,a:Math.max(.25,ad*at(k,e,1))});
    // one model, shared: two glass plates spanning both lanes
    [[XM,'transformer'],[XP,'pool + normalise']].forEach(([x,t],i)=>{R.glass([x,.05,-2],[0,0,4],[0,1.15,0],{c:i?P.c5:P.c1,nu:8,nv:4,a:.9});
      R.label([x,1.2,2],t,{fs:12.5,b:1,c:i?P.c5:P.c1,dy:-8,grp:'pl'})});
    R.label([(XM+XP)/2,1.22,-2],'same weights for both',{fs:12,mono:true,c:P.mute,dy:-8,wide:1});
    // the query lane: tokens flow through both plates into one vector
    if(k===0)R.flow(lane(XT+1.1,XV-.95,ZQ,YP),{c:P.c2,a:e,r:.07,speed:1.5});
    comb(R,[XV,YP,ZQ],V,mV,P.c2,(k===0?e:1)*aq,.5,1.7);
    R.label([XV+1,YP,ZQ],'q · 384 numbers',{fs:12.5,mono:true,c:P.c2,al:'left',dx:6,grp:'v',a:k===0?e:aq});
    // the document lane, the same way, into a stored vector (its numbers were not recorded: an empty plinth)
    if(k===1)R.flow(lane(XT+1.1,XV-.95,ZD,YP),{c:P.c1,a:e,r:.07,speed:1.5});
    const nS=k===3?11:1;
    for(let s=0;s<nS;s++){const y=YP+s*.09,a=s===0?at(k,e,1):.5*e;R.box([XV,y-.045,ZD],[1.84,.045,.34],{a,fill:s?mix(P.paper,P.c1,.25):P.paper,shadow:false})}
    if(k>=1)[-1,1].forEach(sx=>R.box([XV+sx*.85,0,ZD],[.03,YP-.05,.03],{a:at(k,e,1)}));
    R.label([XV+1,YP,ZD],k===3?'5,183 stored vectors':'d · stored at indexing',{fs:12.5,mono:true,c:P.c1,al:'left',dx:6,grp:'v',a:at(k,e,1)});
    // the cosine: both vectors meet in one number
    if(k>=2){const a=k===2?e:1,h=M.cos.cls*1.5;
      R.flowArc([XV+.9,YP,ZQ],[XC,h*a,0],.5,{c:P.c2,a,r:.06,speed:1.2});R.flowArc([XV+.9,YP,ZD],[XC,h*a,0],.5,{c:P.c1,a:k===3?.35:a,r:.06,speed:1.2});
      R.box([XC,0,0],[.5,h*a,.5],{fill:P.acc});R.label([XC,h*a,0],'cos '+M.cos.cls.toFixed(3),{fs:13,b:1,c:P.acc,dy:-12})}
    // search: the query against the whole stack
    if(k===3)for(let s=1;s<11;s+=2)R.flowArc([XV,YP+.3,ZQ-.2],[XV,YP+s*.09,ZD+.2],.35+s*.05,{c:P.c2,a:e*.8,r:.045,n:5,speed:1.5});
  }
  const full={cam:[.32,.72],bounds:[[-4.6,0,-2.1],[4.4,1.5,2.1]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one claim and its abstract through bge-small',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1400,hold:4800,draw,
    view:k=>k===0?{cam:[.42,.62],bounds:[[-4.6,0,-.3],[3,1.4,2.1]]}:k===1?{cam:[.25,.62],bounds:[[-4.6,0,-2.1],[3,1.4,.3]]}:full,
    margin:w=>w<520?[14,10,14,10]:[18,16,14,16]});
})();
