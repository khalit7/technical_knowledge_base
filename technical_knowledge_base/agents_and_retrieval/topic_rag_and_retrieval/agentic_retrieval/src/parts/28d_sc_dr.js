// ---- Scene: Fig. 4, deep research as context windows (renderer v2). The shape and default budgets of open_deep_research, read at commit 1b7d2e8
// (configuration.py and deep_researcher.py; see the closed block): a supervisor, up to 5 researcher sub-graphs in parallel, each with its own
// window and up to 10 tool calls, every page summarised to about 25-30 percent, findings compressed before they return, up to 6 supervisor rounds.
// Not run here: the counts are the defaults; page and window sizes are illustrative (a page is drawn as one unit, its summary as 0.28). ----
(function(){
  if(!document.getElementById('stg-dr'))return;const {mix}=S3;
  const NR=5,NP=10,XR=i=>(i-2)*1.75,ZL=2.1,ZR=0,ZW=-2.2,PW=.95,SUM=.28;
  function draw(R,k,e){const P=R.P,nar=R.W<520,fa=Math.min(1,e*1.6);R.grid(-5,5,-3.2,3.4,.5);
    const LC=P.c2,RC=P.c4,WC=P.c1;
    // the lead (supervisor) window, front centre
    const la=k===2?.45:1;R.box([0,0,ZL],[3.2,.3,.8],{fill:mix(P.paper,LC,.18),a:la});R.label([0,.3,ZL+.4],'lead (supervisor) · its own window',{fs:12.5,b:1,c:LC,dy:16,a:la});
    if(k===0){R.box([-3.6,0,ZL],[1.2,.3,.8],{fill:P.paper,a:fa});R.label([-3.6,.3,ZL],'question → brief',{fs:12.5,mono:true,dy:-12,c:P.ink,a:fa});
      R.flowArc([-3,.3,ZL],[-1.6,.3,ZL],.4,{c:LC,a:fa,r:.06,n:5})}
    // the researchers: own windows, in parallel
    const ra=k===0?0:k===1?fa:1;
    for(let i=0;i<NR;i++){const x=XR(i),act=k===2||k===1?1:.75;
      R.box([x,0,ZR],[1.45,.26,.8],{fill:mix(P.paper,RC,.15),a:ra*act});
      R.label([x,0,ZR+.4],'researcher '+(i+1),{fs:12,mono:true,c:RC,dy:14,wide:1,a:ra});
      if(k===1)R.flowArc([x*.25,.3,ZL-.4],[x,.26,ZR+.4],.7,{c:LC,a:fa,r:.06,n:5,speed:1.2});
      // up to 10 pages each: read in full in the researcher's window, kept as about 28 percent
      if(k>=2){const pa=k===2?1:.35;for(let j=0;j<NP;j++){const px=x-.6+(j%5)*.3,pz=ZW-Math.floor(j/5)*.45;
          R.box([px,0,pz],[.24,.05+.05*(j%3),.34],{fill:mix(P.paper,WC,.3),a:pa*(k===2?Math.min(1,e*3-j*.15):1)})}
        if(k===2)R.flowArc([x,.12,ZW+.1],[x,.26,ZR-.3],.6,{c:WC,a:.9,r:.055,n:6,speed:1.3});
        const kept=(k===2?e:1)*NP*SUM*.12;R.box([x-.65+kept/2,.26,ZR],[kept,.1,.5],{fill:WC,a:1,shadow:false})}
      // compressed findings return to the lead; the lead never sees the pages
      if(k>=3){const ca=k===3?fa:1;R.flowArc([x,.36,ZR+.3],[x*.3,.3,ZL-.4],.55,{c:RC,a:k===3?ca:.25,r:.06,n:5,speed:1.2});
        R.box([-1.2+i*.6,.3,ZL],[.42,.12,.5],{fill:RC,a:ca,shadow:false})}}
    if(k>=2)R.label([0,0,ZW-.75],'web pages · up to 10 tool calls per researcher',{fs:12.5,mono:true,c:WC,dy:-8,a:k===2?1:.5});
    if(k===2)R.label([0,0,ZR+.4],'each page kept at about 25-30% (the blue bar)',{fs:12.5,b:1,c:WC,dy:34,wide:1,a:e});
    if(k===3)R.label([0,.42,ZL],'compressed findings, with citations',{fs:12.5,b:1,c:RC,dy:-12,a:fa});
    // rounds and the report
    if(k===4){R.box([3.7,0,ZL],[1.3,.4,.9],{fill:P.paper,a:fa});R.label([3.7,.4,ZL],'report with citations',{fs:12.5,b:1,c:P.ink,dy:-12,a:fa});
      R.flowArc([1.6,.3,ZL],[3.05,.3,ZL],.4,{c:LC,a:fa,r:.06,n:5});
      R.label([0,.3,ZL-.4],'up to 6 rounds of ConductResearch',{fs:12.5,mono:true,c:LC,dy:-12,a:fa})}
  }
  S3.stage({id:'stg-dr',list:'sx-dr',fig:'Fig. 4 · open_deep_research at its defaults (not run here)',cam:[0,.85],bounds:[[-4.6,0,-3.1],[4.6,.5,2.9]],aspect:.66,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[18,18,18,18],
    view:k=>k===0?{cam:[0,.8],bounds:[[-4.4,0,1.4],[1.8,.4,2.7]]}:k===2?{cam:[0,.8],bounds:[[-4.6,0,-3.1],[4.6,.5,.6]]}:null});
})();
