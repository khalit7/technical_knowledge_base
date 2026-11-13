// ---- Scene (conversion): cross-objective training, what 2.5% of pretraining on the other objective buys (renderer v2) ----
// The same six pairs as Fig. 1 (window.ETS from 31_js_sc_suite.js). Outlined bars: the native model's lead over the other kind before conversion;
// solid bars in the converted model's colour: its lead over the converted model after 50B tokens (1B: about 16.7B). Values from Table 9 (PAPER.rc.fig1_data);
// positive up (the native model still ahead), negative hanging below (the converted model ahead).
(function(){
  if(!document.getElementById('stg-conv')||!window.ETS)return;const {at,lerp,mix}=S3;
  const {F1,SZ,NS,X,XE,XD,XL,XR,wOf,topOf,stack,plinth,bar,sgn,YP,ZB,BX,BL,BR,VUP,VDN}=ETS;
  const D=(a,b,t,d)=>F1[t][a].map((v,i)=>+(v-F1[t][b][i]).toFixed(d));
  // [task, label, before (native minus the model it was made from), after (native minus the converted model), decimals]
  const ROWS={1:['mnli','MNLI: encoder lead',D('enc','dec','mnli',1),D('enc','efd','mnli',1),1],
    2:['msmarco','MS MARCO: encoder lead',D('enc','dec','msmarco',2),D('enc','efd','msmarco',2),2],
    4:['gen','generative: decoder lead',D('dec','enc','gen',1),D('dec','dfe','gen',1),1]};
  function draw(R,k,e){const P=R.P;R.grid(XL-1.2,XR+1.2,-2.6,2.6,.5);
    const CE=mix(P.paper,P.c1,.55),CD=mix(P.paper,P.c2,.55),CF=mix(P.paper,P.c3,.6),CG=mix(P.paper,P.c5,.6);
    // the decoders turn into encoders-from-decoders in step 1 and stay so through step 3; the encoders turn into decoders-from-encoders in step 4
    const dT=k===0?e:k<=2?1:k===3?1-e:0,eT=k===3?e:k>=4?1:0;
    const rec=ROWS[k]?.28:1,foc=i=>k===5?(i===NS-1?1:.15):rec;
    for(let i=0;i<NS;i++){stack(R,XE(i),i,mix(CE,CG,eT),foc(i)*(k<=2&&!ROWS[k]?.45:1));stack(R,XD(i),i,mix(CD,CF,dT),foc(i)*(k>=3&&!ROWS[k]?.45:1));
      if(!ROWS[k])R.label([X(i),0,wOf(i)/2+.1],SZ[i],{mono:true,fs:12.5,dy:15,b:1,a:k===5?(i===NS-1?1:.35):1})}
    if(!ROWS[k]&&k<5){R.label([XL-.3,.62,0],eT>.5?'dec-from-enc \u00b7 CLM':'encoder',{al:'right',dx:-6,mono:true,fs:12,c:eT>.5?P.c5:P.c1,grp:'rows'});
      R.label([XL-.3,.3,0],dT>.5?'enc-from-dec \u00b7 MNTP':'decoder',{al:'right',dx:-6,mono:true,fs:12,c:dT>.5?P.c3:P.c2,grp:'rows'})}
    // the 50B tokens of decay data flow into the member being converted
    if(k===0||k===3){const a=Math.min(1,e*1.6),ZS=-1.9,c=k===0?P.c3:P.c5;
      R.box([(XL+XR)/2,0,ZS],[XR-XL+.4,.1,.36],{fill:mix(P.paper,c,.3),a});
      R.label([XL-.3,.05,ZS],'50B tokens = 2.5% \u00b7 '+(k===0?'MNTP':'CLM'),{al:'right',dx:-6,mono:true,fs:12,c,grp:'rows',a});
      for(let i=0;i<NS;i++){const x=k===0?XD(i):XE(i);R.flowArc([x,.11,ZS],[x,topOf(i)+.02,0],.3+topOf(i)*.3,{c,a,r:.06,n:i===NS-1?2:6,speed:1.2})}}
    // before and after: outlined bars (before) beside solid bars (after)
    const row=ROWS[k];
    if(row){const [t,lab,b4,af,d]=row,cA=k===4?P.c5:P.c3,cB=k===4?P.c1:P.c2,g=Math.min(1,e*1.4);plinth(R,1,true);
      for(let i=0;i<NS;i++){bar(R,BX(i)-.25,b4[i]*g,{w:.4,c:mix(P.paper,cB,.4),fa:.3,lw:1.2});
        bar(R,BX(i)+.25,af[i]*g,{w:.4,c:cA,lab:e>.6?sgn(af[i],d):null,b:1,lc:cA})}
      R.label([BL-.1,YP,ZB],lab,{al:'right',dx:-6,mono:true,fs:12,c:P.ink,grp:'bars'});
      R.label([BL-.1,YP-.4,ZB],'outlined before, solid after',{al:'right',dx:-6,mono:true,fs:12,c:P.mute,grp:'bars'})}
    if(k===5){const a=e,i=NS-1;
      R.label([XD(i),topOf(i),0],'pretrained on 667B, not 2T',{mono:true,fs:12.5,b:1,dy:-12,c:P.ink,a,al:'left'});
      R.label([XE(i),topOf(i),0],'converted on about 16.7B',{mono:true,fs:12.5,b:1,dy:-30,c:P.c5,a,al:'right'});
      R.label([X(i),0,wOf(i)/2+.1],'generation gap +6.8',{mono:true,fs:12.5,dy:34,c:P.c5,a})}
  }
  const V0={cam:[.8,.55],bounds:[[XL-.3,0,-2.1],[XR+.3,1.75,.7]]};
  const st=S3.stage({id:'stg-conv',list:'sx-conv',fig:'Conversion \u00b7 what 2.5% of pretraining buys',cam:V0.cam,bounds:V0.bounds,aspect:.48,dur:1400,hold:4800,draw,
    view:k=>k===1||k===2?VUP:k===4?{cam:VUP.cam,bounds:[[BL-.2,YP-.4,ZB-.3],[BR+.2,YP+3.9,ZB+.3]]}:k===5?{cam:[.45,.45],bounds:[[XE(5)-1.4,0,-.8],[XD(5)+1.4,2.2,.8]]}:V0,
    margin:w=>w<520?[14,10,14,10]:[22,14,14,205]});
  window.ETT_CONV=st;
})();
