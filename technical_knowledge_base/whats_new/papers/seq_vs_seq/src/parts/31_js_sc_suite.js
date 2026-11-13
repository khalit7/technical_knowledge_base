// ---- Scene (Fig. 1, the hero): the Ettin suite to scale, and where each side wins (renderer v2: stacks, flowing data, signed bars on a white plinth) ----
// Six pairs from Table 1 as recounted in recompute.py (PAPER.rc.params): one slab per layer, slab width and depth proportional to the hidden size.
// Each pair side by side: encoder left, decoder right. The bars are encoder minus decoder at each size from Table 9 (PAPER.rc.fig1_data), in points:
// standing up when the encoder leads, hanging below the plinth when the decoder leads. Shared helpers are exported as window.ETS for 32_js_sc_conv.js.
(function(){
  if(!window.PAPER||!window.S3)return;const {at,lerp,mix}=S3;
  const RC=PAPER.rc,PR=RC.params,F1=RC.fig1_data,SZ=PAPER.tables.T1.sizes,NS=PR.length;
  // layout: the pairs side by side from left to right, the encoder (left) and decoder (right) of a pair 0.1 apart, 0.55 between pairs
  const HMAX=Math.max(...PR.map(p=>p.hidden)),LH=.058,WS=1.08/HMAX,IN=.1,GP=.6;
  const wOf=i=>Math.max(.13,PR[i].hidden*WS),topOf=i=>.02+PR[i].layers*LH;
  const XC=[];{let x=0;PR.forEach((_,i)=>{const w=wOf(i);XC.push(x+w+IN/2);x+=2*w+IN+GP});const m=(XC[0]+XC[NS-1])/2;XC.forEach((v,i)=>XC[i]=v-m)}
  const X=i=>XC[i],XE=i=>XC[i]-wOf(i)/2-IN/2,XD=i=>XC[i]+wOf(i)/2+IN/2,XL=XE(0)-wOf(0)/2,XR=XD(NS-1)+wOf(NS-1)/2;
  // one model: a slab per layer (to scale in layers and hidden size)
  function stack(R,x,i,fill,a){if(a<=.01)return;const w=wOf(i),n=PR[i].layers;
    for(let l=0;l<n;l++)R.box([x,.02+l*LH,0],[w,LH*.74,w],{fill,a,shadow:l===0,lw:.55})}
  // a row of signed bars on a raised white plinth in front of the stacks, one column per size at even spacing: v in points (one scale for every task),
  // positive up, negative hanging below; the size names sit on the plinth's front edge
  const YP=3.8,ZB=1.5,SC=.45,BX=i=>(i-(NS-1)/2)*1.8,BL=BX(0)-.75,BR=BX(NS-1)+.75;
  function plinth(R,a,sizes){if(a<=.01)return;const P=R.P;R.box([0,YP-.05,ZB],[BR-BL,.05,.44],{a,shadow:false});
    [BL+.05,BR-.05].forEach(x=>R.box([x,0,ZB],[.04,YP-.05,.04],{a:a*.9}));
    if(sizes)for(let i=0;i<NS;i++)R.label([BX(i),YP-.05,ZB+.22],SZ[i],{mono:true,fs:12,b:1,c:P.mute,dy:4,a})}
  function bar(R,x,v,o){const a=o.a==null?1:o.a;if(a<=.01)return;const h=Math.max(.012,Math.abs(v)*SC),wd=o.w||.5;
    R.box([x,v>=0?YP:YP-.05-h,ZB],[wd,h,.3],{fill:o.c,a,fa:o.fa,shadow:false,lw:o.lw||.8});
    if(o.lab)R.label([x,v>=0?YP+h:YP-.05-h,ZB],o.lab,{mono:true,fs:12.5,dy:v>=0?-10:16,b:o.b,c:o.lc||o.c,a})}
  // camera views for the bar steps: up for leads that stand, down for leads that hang
  const VUP={cam:[.18,.18],bounds:[[BL-.2,YP-.35,ZB-.3],[BR+.2,YP+1.75,ZB+.3]]},VDN={cam:[.18,.18],bounds:[[BL-.2,YP-4.05,ZB-.3],[BR+.2,YP+.5,ZB+.3]]};
  const sgn=(v,d)=>(v>0?'+':v<0?'\u2212':'')+Math.abs(v).toFixed(d);
  window.ETS={PR,F1,SZ,NS,X,XE,XD,XL,XR,LH,wOf,topOf,stack,plinth,bar,sgn,YP,ZB,SC,BX,BL,BR,VUP,VDN};
  if(!document.getElementById('stg-suite'))return;
  // the three tasks of Figure 1: encoder minus decoder at each size
  const TASKS=[['mnli','MNLI accuracy',1],['msmarco','MS MARCO nDCG@10',2],['gen','generative average',1]];
  const gap=t=>F1[t].enc.map((v,i)=>+(v-F1[t].dec[i]).toFixed(TASKS.find(x=>x[0]===t)[2]));
  const G=TASKS.map(([t])=>gap(t));
  function draw(R,k,e){const P=R.P;R.grid(XL-1.2,XR+1.2,-2.6,2.6,.5);
    const CE=mix(P.paper,P.c1,.55),CD=mix(P.paper,P.c2,.55);
    // composition: the stacks are the subject of steps 1, 2 and 6; during the result steps they recede behind the bars
    const rec=k>=2&&k<=4?.28:1,grow=k===0?e:1;
    for(let i=0;i<NS;i++){const ea=k===5?(i===3||i===4?1:.16):rec,da=k===5?(i===4||i===5?1:.16):rec;
      stack(R,XE(i),i,CE,ea*Math.min(1,grow*1.3));stack(R,XD(i),i,CD,da*Math.min(1,grow*1.3));
      if(k<2||k===5)R.label([X(i),0,wOf(i)/2+.1],SZ[i],{mono:true,fs:12.5,dy:15,b:1,a:k===5?(i>=3?1:.35):1});
      if(k===0&&i>=2)R.label([X(i),topOf(i),0],PR[i].layers+' \u00d7 '+PR[i].hidden,{mono:true,fs:12,dy:-10,c:P.mute,a:grow,wide:1})}
    if(k<=1){R.label([XL-.3,.62,0],'encoder \u00b7 both ways \u00b7 MLM',{al:'right',dx:-6,mono:true,fs:12,c:P.c1,grp:'rows'});
      R.label([XL-.3,.3,0],'decoder \u00b7 left only \u00b7 CLM',{al:'right',dx:-6,mono:true,fs:12,c:P.c2,grp:'rows'})}
    // step 2: one stream of tokens, in one order, feeds both members of every pair (the 1B pair got a third of it)
    if(k===1){const a=Math.min(1,e*1.5),ZS=-1.9;R.box([(XL+XR)/2,0,ZS],[XR-XL+.4,.12,.42],{fill:mix(P.paper,P.ink,.14),a});
      R.label([XL-.3,.06,ZS],'2T tokens \u00b7 one batch order',{al:'right',dx:-6,mono:true,fs:12,c:P.ink,grp:'rows',a});
      for(let i=0;i<NS;i++){const n=i===NS-1?3:8,src=[X(i),.13,ZS];
        R.flowArc(src,[XE(i),topOf(i)+.02,0],.35+topOf(i)*.3,{c:P.c1,a:a*.9,r:.06,n,speed:1.1});
        R.flowArc(src,[XD(i),topOf(i)+.02,0],.35+topOf(i)*.3,{c:P.c2,a:a*.9,r:.06,n,speed:1.1})}
      R.label([X(NS-1),.12,ZS],'1B: 667B',{mono:true,fs:12,dy:-12,c:P.mute,a})}
    // steps 3 to 5: encoder minus decoder for one task at a time; the bars morph from the last task's values
    if(k>=2&&k<=4){const ti=k-2,prev=k===2?G[0].map(()=>0):G[ti-1];plinth(R,k===2?Math.min(1,e*2):1,true);
      for(let i=0;i<NS;i++){const v=lerp(prev[i],G[ti][i],e),pos=G[ti][i]>=0;
        bar(R,BX(i),v,{c:pos?P.c1:P.c2,lab:e>.6?sgn(G[ti][i],TASKS[ti][2]):null,b:1})}
      R.label([BL-.1,YP,ZB],TASKS[ti][1],{al:'right',dx:-6,mono:true,fs:12,c:P.ink,grp:'bars'});
      R.label([BL-.1,YP-.4,ZB],'encoder \u2212 decoder',{al:'right',dx:-6,mono:true,fs:12,c:P.mute,grp:'bars'})}
    if(k===5){const a=e,s=[[XE(3),3,F1.mnli.enc[3],P.c1,-10],[XD(4),4,F1.mnli.dec[4],P.c2,-28],[XE(4),4,F1.mnli.enc[4],P.c1,-10],[XD(5),5,F1.mnli.dec[5],P.c2,-10]];
      s.forEach(([x,i,v,c,dy])=>R.label([x,topOf(i),0],v.toFixed(1),{mono:true,fs:12.5,b:1,dy,c,a}));
      R.flowArc([XE(4),topOf(4)+.1,0],[XD(5),topOf(5)+.1,0],.5,{c:P.c1,a:a*.9,r:.065,n:9,speed:1});
      R.flowArc([XE(3),topOf(3)+.1,0],[XD(4),topOf(4)+.1,0],.4,{c:P.c1,a:a*.6,r:.055,n:6,speed:1});
      R.label([XD(4),0,wOf(5)/2+.3],'on MNLI, beats a decoder 2.7\u00d7 its size',{mono:true,fs:12.5,b:1,c:P.c1,a,dy:34})}
  }
  const V0={cam:[.8,.48],bounds:[[XL-.3,0,-.7],[XR+.3,1.75,.7]]},V1={cam:[.8,.55],bounds:[[XL-.3,0,-2.1],[XR+.3,1.75,.7]]};
  S3.stage({id:'stg-suite',list:'sx-suite',fig:'The suite \u00b7 six exact pairs, to scale',cam:V0.cam,bounds:V0.bounds,aspect:.48,dur:1400,hold:4800,draw,
    view:k=>k===0?V0:k===1?V1:k===2||k===3?VUP:k===4?VDN:{cam:[.4,.42],bounds:[[XE(3)-.5,0,-.7],[XD(5)+.7,2.3,1.2]]},
    margin:w=>w<520?[14,10,14,10]:[22,14,14,205]});
})();
