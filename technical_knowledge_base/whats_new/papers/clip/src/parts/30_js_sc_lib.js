// ---- CLIP scenes (renderer v2): the toy CLIP's real numbers on the page's toy web, and a few drawing helpers shared by the three stages ----
// CS.data(): four pairs from the toy web (the same four the objective has always used), their embeddings, the 4 x 4 logits, both softmaxes and the
// symmetric loss; one test photo and six classes for zero-shot, and two new classes (small or big). Everything is computed once by CLIP (22_js_clip.js).
(function(){
  if(!window.S3||!window.CLIP||!document.querySelector('[id^="stg-"]'))return;
  const CS={};let D=null;
  const lse=v=>{const m=Math.max(...v);return m+Math.log(v.reduce((s,x)=>s+Math.exp(x-m),0))};
  CS.data=function(){if(D)return D;
    const OBS=[0,2,8,13].map(k=>pair(SEED_PAGE+k)),n=OBS.length;
    const I=OBS.map(p=>CLIP.image(p.img,'s'+p.seed)),T=OBS.map(p=>CLIP.text(p.cap));
    const L=I.map(a=>T.map(b=>CLIP.scale*CLIP.dot(a.e,b.e)));
    const row=L.map(r=>CLIP.softmax(r)),colT=L[0].map((_,j)=>CLIP.softmax(L.map(r=>r[j]))),col=L.map((r,i)=>r.map((_,j)=>colT[j][i]));
    let li=0,lt=0;for(let i=0;i<n;i++){li+=lse(L[i])-L[i][i];lt+=lse(L.map(r=>r[i]))-L[i][i]}li/=n;lt/=n;
    // zero-shot: the first test photo (from the page's seeds) that the toy classifies correctly among all 36 classes, as the old animation chose it
    const W36=CLIP.classifier(CLASSES,['a photo of a {}']);let ZP=null;
    for(let k=60;k<200&&!ZP;k++){const p=pair(SEED_PAGE+k,{style:0,size:1}),e=CLIP.image(p.img,'s'+p.seed).e,sc=W36.map(r=>CLIP.dot(r,e));if(sc.indexOf(Math.max(...sc))===labelOf(p.a))ZP=p}
    if(!ZP)ZP=pair(SEED_PAGE+60,{style:0});
    const za=ZP.a,Cn=TG.COLOURS,Sh=TG.SHAPES;
    const ZC=[nameOf(za),Cn[za.colour]+' '+Sh[(za.shape+1)%6],Cn[za.colour]+' '+Sh[(za.shape+3)%6],Cn[(za.colour+1)%6]+' '+Sh[za.shape],Cn[(za.colour+3)%6]+' '+Sh[za.shape],Cn[(za.colour+2)%6]+' '+Sh[(za.shape+2)%6]];
    const ZS2=['small '+Sh[za.shape],'big '+Sh[za.shape]];
    const zi=CLIP.image(ZP.img,'s'+ZP.seed);
    const zcls=cls=>{const W=CLIP.classifier(cls,['a photo of a {}']),lg=W.map(r=>CLIP.scale*CLIP.dot(r,zi.e)),p=CLIP.softmax(lg);return {W,lg,p,best:p.indexOf(Math.max(...p))}};
    const Z6=zcls(ZC),Z2=zcls(ZS2);
    const mE=Math.max(...I.concat(T).map(x=>Math.max(...Array.from(x.e).map(Math.abs))),...Array.from(zi.e).map(Math.abs),...Z6.W.concat(Z2.W).map(r=>Math.max(...Array.from(r).map(Math.abs))));
    const mF=Math.max(...Array.from(zi.f).map(Math.abs));
    const mL=Math.max(...L.flat().map(Math.abs));
    // the captioning side: each caption's tokens as the toy text side sees them (words outside the vocabulary are <unk>), then <eos>
    const caps=OBS.map(p=>p.cap.split(/\s+/).filter(Boolean).concat(['<eos>']));
    const toks=caps.reduce((a,c)=>a+c.length,0);
    const lm=RUN('lm'),lmLoss=lm&&lm.loss.length?lm.loss[lm.loss.length-1][1]:null;   // nats per token at the end of training, from its log
    return D={OBS,n,I,T,L,row,col,li,lt,loss:(li+lt)/2,mL,mE,mF,ZP,ZC,ZS2,zi,Z6,Z2,caps,toks,lmLoss,V:TG.VOCAB.length}};
  // words the picture can predict (colour, shape, size, place, style); the rest of a caption is phrasing
  CS.ABOUT=new Set([].concat(TG.SHAPES,TG.COLOURS,['big','large','small','little','tiny','left','right','middle','drawing','sketch','drew','photo','picture']));
  // a vector as signed bars on a white plinth (positive up, negative hanging below), laid along x or along z
  CS.comb=function(R,c,vals,m,col,a,hmax,wd,ax){if(a<=.01)return;const P=R.P,nb=vals.length,bw=wd/nb,z=ax==='z';
    R.box([c[0],c[1]-.045,c[2]],z?[.3,.045,wd+.12]:[wd+.12,.045,.3],{a,shadow:false});
    if(c[1]>.12)[-1,1].forEach(s=>R.box(z?[c[0],0,c[2]+s*wd/2]:[c[0]+s*wd/2,0,c[2]],[.03,c[1]-.05,.03],{a:a*.9,shadow:false}));
    vals.forEach((v,i)=>{const h=Math.max(.012,Math.abs(v)/m*hmax),o=-wd/2+bw*(i+.5),y=v>=0?c[1]:c[1]-.045-h;
      R.box(z?[c[0],y,c[2]+o]:[c[0]+o,y,c[2]],z?[.1,h,bw*.7]:[bw*.7,h,.1],{fill:col||P.paper,a,shadow:false,lw:.6})})};
  // a toy-web picture standing on the floor at c (centre of its bottom edge), s wide, facing +z, in a thin white frame
  const icv=new WeakMap();
  function cvOf(img){let c=icv.get(img);if(c)return c;const S=TG.S;c=document.createElement('canvas');c.width=S;c.height=S;const x=c.getContext('2d'),d=x.createImageData(S,S);
    for(let i=0;i<S*S;i++){d.data[4*i]=img[3*i]*255;d.data[4*i+1]=img[3*i+1]*255;d.data[4*i+2]=img[3*i+2]*255;d.data[4*i+3]=255}x.putImageData(d,0,0);icv.set(img,c);return c}
  CS.card=function(R,img,c,s,a){if(a<=.01)return;R.box([c[0],c[1]-.04,c[2]-.05],[s+.08,s+.08,.05],{a});
    const p0=R.p([c[0]-s/2,c[1]+s,c[2]]),p1=R.p([c[0]+s/2,c[1]+s,c[2]]),p3=R.p([c[0]-s/2,c[1],c[2]]),z=R.p([c[0],c[1]+s/2,c[2]])[2]-.05,cv=cvOf(img),S=cv.width;
    R.q.push({z,f:cx=>{cx.save();cx.globalAlpha=a;cx.imageSmoothingEnabled=false;cx.transform((p1[0]-p0[0])/S,(p1[1]-p0[1])/S,(p3[0]-p0[0])/S,(p3[1]-p0[1])/S,p0[0],p0[1]);cx.drawImage(cv,0,0);cx.restore()}})};
  // a short text tag on a flat white tile (a caption or a prompt)
  CS.tag=function(R,c,w,text,a,o){o=o||{};if(a<=.01)return;R.box(c,[w,.1,.36],{a,fill:o.fill});if(text)R.label([c[0],.1,c[2]],text,Object.assign({mono:true,fs:12,a},o.lab||{}))};
  CS.pct=v=>(v*100).toFixed(v>.995||v<.005?1:0)+'%';
  window.CS=CS;
})();
