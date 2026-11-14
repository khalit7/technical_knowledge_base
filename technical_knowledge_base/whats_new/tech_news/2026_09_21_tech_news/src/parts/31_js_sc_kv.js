// ---- Scene: DeepSeek V4-Flash's KV cache against V4.1-Flash's, by layer, token and entry size (renderer v2) ----
// The three axes are the three factors of zartbot's formula, total = bytes per entry x tokens / m x storing layers: layers run left to
// right, a 16-token window of the sequence runs front to back, and each stored entry is a box whose height is its bytes (main entry,
// with the indexer key on top). Numbers from the issue's own sources (zartbot's breakdown, the V4.1-Flash model card): V4-Flash
// 21 CSA layers at m = 4 (584 + 68 B) and 20 HCA layers at m = 128 (584 B); V4.1-Flash 40 layers, KV source layers 2, 8, 14 and 20,
// m = 2 on the encoder sources and 1 on the decoder source, FP4 main entries of 288 B. Illustrative: the 16-token window, the order
// of CSA and HCA layers in V4-Flash (grouped by kind) and which later layer reads which source (the nearest one before it).
(function(){
  if(!document.getElementById('stg-kv'))return;const {at,lerp,mix}=S3;
  const HS=.002,MAIN=584,FP4=288,IDX=68,TOK=16,ZT=t=>-2.1+t*.28,BW=.22,BD=.2;
  const x4=i=>-6.3+i*.3+(i>=21?.5:0);             // V4-Flash: 21 CSA layers, then 20 HCA layers (grouped by kind)
  const x41=l=>-6.15+l*.3+(l>=20?.4:0);           // V4.1-Flash: encoder layers 0 to 19, decoder layers 20 to 39
  const SRC=[2,8,14,20],srcOf=l=>l<2?-1:SRC.filter(s=>s<=l).pop();
  const TOT=['3,514','652','1,630','890'];
  // the token slots at which a layer with ratio m writes an entry inside the window (an entry is written when its m tokens are in)
  const slots=m=>{const r=[];for(let t=m-1;t<TOK;t+=m)r.push(t);return r};
  function entry(R,x,t,main,a,cm,ci){if(a<=.01)return;const hm=main*HS;
    R.box([x,0,ZT(t)],[BW,hm,BD],{fill:cm,a,shadow:false,lw:.6});R.box([x,hm,ZT(t)],[BW,IDX*HS,BD],{fill:ci,a,shadow:false,lw:.6})}
  function draw(R,k,e){const P=R.P;R.grid(-7,7,-2.6,2.6,.5);
    const cm=mix(P.paper,P.c1,.45),c4=mix(P.paper,P.c3,.55),ci=P.c2;
    const oldA=k===0?1:k===1?Math.max(0,1-2*e):0,newA=k===0?0:k===1?Math.max(0,2*e-1):1;
    // V4-Flash: every layer its own cache
    if(oldA>0){
      for(let i=0;i<41;i++){const x=x4(i);R.box([x,0,0],[.24,.012,4.5],{fill:i<21?mix(P.paper,P.c1,.15):P.paper,a:oldA*.8,shadow:false,lw:.4});
        if(i<21)slots(4).forEach(t=>entry(R,x,t,MAIN,oldA,cm,ci))}
      R.label([x4(10),(MAIN+IDX)*HS+.15,-2.1],'21 CSA layers · one 652 B entry per 4 tokens',{mono:true,fs:12,a:oldA,dy:-6,grp:'top'});
      R.label([x4(31),.05,-2.1],'20 HCA layers · one 584 B entry per 128 tokens',{mono:true,fs:12,c:P.mute,a:oldA,dy:-14,grp:'top'});
    }
    // V4.1-Flash: four source layers store, the later layers read theirs
    if(newA>0){
      const m=l=>k===1?4:(l<20?2:1),mPrev=l=>k===2?4:m(l),main=k<3?MAIN:lerp(MAIN,FP4,e),col=k<3?cm:mix(cm,c4,e);
      for(let l=0;l<40;l++){const x=x41(l),s=SRC.includes(l);
        R.box([x,0,0],[.24,.012,4.5],{fill:s?mix(P.paper,P.c1,.2):l<2?P.soft:P.paper,a:newA*(l<2?.5:.8),shadow:false,lw:.4});
        if(s){const old=slots(mPrev(l));slots(m(l)).forEach(t=>entry(R,x,t,main,newA*(old.includes(t)?1:(k===2?e:1)),col,ci))}
        else if(l>=2){const sx=x41(srcOf(l)),top=(main+IDX)*HS;   // the reuse: the source's cache streams to the layer that reads it
          const A0=[sx,top+.05,ZT(TOK-1)],B0=[x,.04,ZT(TOK-1)],hh=.35+.03*Math.abs(l-srcOf(l)),aa=newA*(k===1?1:.55);
          R.line(Array.from({length:17},(_,i)=>R.arcPt(A0,B0,hh,i/16)),{c:P.c1,w:1,a:aa*.35}); // a faint track, so the dots read as arcs
          R.flowArc(A0,B0,hh,{c:P.c1,a:aa,r:.045,n:7,speed:1})}}
      SRC.forEach(s=>R.label([x41(s),((k<3?MAIN:main)+IDX)*HS+.05,ZT(0)],'layer '+s,{mono:true,fs:12,b:1,c:P.c1,a:newA,dy:-10,grp:'src'}));
      R.label([x41(9.5),0,2.45],'encoder · layers 0 to 19',{mono:true,fs:12,c:P.mute,a:newA,dy:14,grp:'half'});
      R.label([x41(29.5),0,2.45],'decoder · layers 20 to 39',{mono:true,fs:12,c:P.mute,a:newA,dy:14,grp:'half'});
    }
    R.label([-6.5,0,ZT(TOK-1)],'token 16',{mono:true,fs:12,c:P.mute,al:'right',dx:-4,wide:1});
    R.label(R.W<520?[2.6,1.95,-2.4]:[3.9,1.5,-2.4],TOT[k]+' bytes per token',{mono:true,fs:14,b:1,dy:-4});
  }
  // a phone looks down more steeply, so the rows in depth spread over the taller card
  const ph=()=>innerWidth<520,full={cam:[.38,.62],bounds:[[-6.9,0,-2.5],[6.4,1.6,2.6]]};
  S3.stage({id:'stg-kv',list:'sx-kv',fig:'Fig. · KV cache by layer, token and entry size',cam:full.cam,bounds:full.bounds,aspect:.43,dur:1500,hold:5200,draw,
    // steps 3 and 4 are about the four source columns: the camera drops a little lower so their heights read
    view:k=>ph()?{cam:[.9,.75],bounds:full.bounds}:k>=2?{cam:[.3,.5],bounds:[[-6.6,0,-2.4],[6.2,1.6,2.6]]}:full,
    margin:w=>w<520?[14,10,14,10]:[22,14,16,14]});
})();
