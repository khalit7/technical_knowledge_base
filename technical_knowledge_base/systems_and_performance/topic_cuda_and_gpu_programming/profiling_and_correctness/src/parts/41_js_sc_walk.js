// ---- Scene, Fig. 2 (section 4): one Nsight Compute report read top-down, before and after the fix (renderer v2).
// Two rows of columns, the slow kernel in front and NVIDIA's fixed kernel behind: duration, the two Speed of Light numbers under a glass
// ceiling at 100% of peak, and the metric of the section the numbers point to. The rule's estimated speedup is a purple ghost of the
// duration it predicts, set against the real one. Every number is read from NVIDIA's six sample reports (NCU.pairData, ncu --import
// output in PCD.ncu); the steps are #sx-wk-0 to #sx-wk-2 on the left. ----
(function(){
  if(!document.getElementById('stg-walk')||!window.NCU)return;const {at,mix}=S3,f=MC.fmtN,$=id=>document.getElementById(id);
  let k0=0,D=NCU.pairData(0);
  const FIX=['3 doubles, not 1 double3','tile[32][33]','float, not double'];
  // one group of columns per metric along the floor, the slow kernel (orange) left of NVIDIA's fixed kernel (green) in each group
  const GX={d:-3.4,c:-.6,m:1.4,x:3.6},OFF=.5,HM=2.2,CW=.78,XG=GX.d+OFF+.78;
  const dus=v=>v>=1000?f(v,0)+' µs':f(v,2)+' µs';
  function draw(R,k,e,st){const P=R.P,B=P.c2,A=P.c3,GH=P.c4;R.grid(-6,6,-2.6,2.6,.5);
    // cf: 1 in the close-up on the duration (last step); everything else fades out there so nothing is cut at the card's edge
    const isC=j=>j===0||j===6,cf=isC(k)?(isC(st.pk)?1:e):(isC(st.pk)?1-e:0),far=Math.pow(1-cf,3);
    const ev=D.p.ev,emax=Math.max(D.eb,D.ea,ev.short==='sectors per request'?D.eb:100),dmax=Math.max(D.db,D.da);
    // which columns the step is about (the rest recede)
    const focus=[['d'],['c','m'],['x'],['d','g'],['x'],['d','c','m','x'],['d','g']][k];
    const fa=c=>(focus.includes(c)?1:.28)*(c==='d'||c==='g'?1:far);
    const col=(x,v,mx,c,a,lab,grow,w)=>{const h=Math.max(.02,v/mx*HM*grow);R.box([x,0,0],[w||CW,h,CW],{fill:mix(P.paper,c,.72),a});
      if(lab&&a>.5)R.label([x,h,0],lab,{mono:true,fs:12.5,b:1,c,dy:-12,a:Math.min(1,a*Math.max(.3,grow))})};
    // the slots still to come, drawn faintly so the layout is there from the first step
    [['c',1],['m',1],['x',2]].forEach(([g,s0])=>[-OFF,OFF].forEach((o,j)=>{if(k<(j?5:s0))R.box([GX[g]+o,0,0],[CW,.02,CW],{fill:P.paper,a:.5*far,shadow:false})}));
    if(k<5)R.box([GX.d+OFF,0,0],[CW,.02,CW],{fill:P.paper,a:.5,shadow:false});
    // the slow kernel: duration from step 1, Speed of Light from step 2, the evidence metric from step 3
    col(GX.d-OFF,D.db,dmax,B,fa('d'),dus(D.db),k===0?e:1);
    if(k>=1){const g=k===1?e:1;col(GX.c-OFF,D.cb,100,B,fa('c'),f(D.cb,1)+'%',g);col(GX.m-OFF,D.mb,100,B,fa('m'),f(D.mb,1)+'%',g)}
    if(k>=2)col(GX.x-OFF,D.eb,emax,B,fa('x'),ev.fmt(D.eb),k===2?e:1);
    // the glass ceiling over the two Speed of Light groups: 100% of each unit's peak
    if(k>=1&&far>.02){const a=(k===1?e:fa('c')>.5?1:.3)*far;R.glass([GX.c-1.05,HM,-.6],[GX.m-GX.c+2.1,0,0],[0,0,1.2],{c:P.c1,a,nu:6,nv:2,th:.02});
      R.label([(GX.c+GX.m)/2,HM,-.6],'100% of peak',{mono:true,fs:12.5,c:P.c1,dy:-10,a})}
    // the rule's estimate: a purple ghost of the duration it predicts for the fixed kernel
    if(k>=3&&D.est!=null){const g=k===3?e:1,h=Math.max(.02,D.db*(1-D.est/100)/dmax*HM),a=fa('g');R.box([XG,0,0],[.6,h,CW],{fill:mix(P.paper,GH,.55),a:a*g,fa:.55,shadow:false});
      if(a>.5)R.label([XG,h,0],'estimate '+dus(D.db*(1-D.est/100)),{al:'left',mono:true,fs:12.5,b:1,c:GH,dx:-10,dy:-12,a:a*g})}
    if(k===3&&D.est==null)R.label([XG,0,0],'no estimate given',{al:'left',mono:true,fs:12.5,b:1,c:GH,dx:-10,dy:-14,a:e});
    // change one thing: the fix flows from the evidence to the fixed kernel's place beside it
    if(k===4){const x0=GX.x-OFF,x1=GX.x+OFF,y0=D.eb/emax*HM;R.flowArc([x0,y0+.05,0],[x1,.1,0],.7,{c:P.acc,a:Math.min(1,e*1.5),r:.08,n:8,speed:1.2});
      R.label([GX.x,0,.95],FIX[k0],{mono:true,fs:13,b:1,c:P.acc,dy:28,a:e})}
    // the fixed kernel, profiled again
    if(k>=5){const g=k===5?e:1;col(GX.d+OFF,D.da,dmax,A,k===6?1:fa('d'),dus(D.da),g);
      col(GX.c+OFF,D.ca,100,A,fa('c'),f(D.ca,1)+'%',g);col(GX.m+OFF,D.ma,100,A,fa('m'),f(D.ma,1)+'%',g);col(GX.x+OFF,D.ea,emax,A,fa('x'),ev.fmt(D.ea),g)}
    // names: the metric under each group, which column is which under the duration
    [['d','duration'],['c','compute (SM)'],['m','memory'],['x',ev.short]].forEach(([g,n],i)=>{R.label([GX[g],0,.95],n,{mono:true,fs:12,c:P.mute,dy:8,wide:1,a:i===0?1:far})});
    R.label([GX.d-OFF,0,.45],'before',{mono:true,fs:12,b:1,c:B,dy:6,wide:1});R.label([GX.d+OFF,0,.45],'after',{mono:true,fs:12,b:1,c:A,dy:6,a:k>=5?1:.4,wide:1});
  }
  const full={cam:[.18,.42],bounds:[[-4.4,0,-.7],[4.6,2.5,1.3]]};
  const st=S3.stage({id:'stg-walk',list:'sx-wk-0',fig:'Fig. 2 · one report, read top-down',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1400,hold:4800,draw,
    // the last step moves in close on the duration: estimate against the clock
    view:k=>k===6||k===0?{cam:[.3,.4],bounds:[[-4.4,0,-.7],[-1.4,2.5,1.2]]}:full,
    margin:w=>w<520?[16,10,12,10]:[22,16,16,16]});
  (window.PCSTG=window.PCSTG||{})['stg-walk']=st;
  RD.seg($('rd-walk-mode'),v=>{k0=+v;D=NCU.pairData(k0);[0,1,2].forEach(i=>$('sx-wk-'+i).hidden=i!==k0);st.list('sx-wk-'+k0)});
})();
