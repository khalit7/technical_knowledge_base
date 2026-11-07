// ---- Shared by the two 3D stages (renderer v2, 2026-11-07): rows of 30 losses as bars, a value axis at the front with a
// histogram of means, and the bracket that marks one standard error. Every number comes from SD (sims.py, mk_stage.py). ----
window.STS=(function(){
  if(!window.S3||!window.SD)return null;const {mix}=S3;
  // the three words of the tiny model and their colours (cat teal, dog gold, sat purple); the statistic is the page's blue, the truth green
  const WORD=['cat','dog','sat'],wc=(P,i)=>[P.c6,P.c5,P.c4][i];
  const wordOf=v=>v<.9?0:v<1.9?1:2;           // losses 0.408, 1.408, 2.408 nats
  // a row of bars on a thin white plinth: xs centres, vals heights (world units), cols colours, alpha per bar
  function row(R,xs,hs,z,o){const a=o.a==null?1:o.a;if(a<=.01)return;const bw=o.bw||.15,x0=xs[0]-bw,x1=xs[xs.length-1]+bw,grow=o.grow==null?1:o.grow;
    R.box([(x0+x1)/2,0,z],[x1-x0,.03,.3],{a:a*.9,shadow:false,lw:.6});
    xs.forEach((x,i)=>{const ai=a*(o.ai?o.ai[i]:1);if(ai<=.01)return;const h=Math.max(.012,hs[i]*(o.gi?o.gi(i):grow));
      R.box([x,.03,z],[bw,h,.18],{fill:o.cols[i],a:ai,shadow:false,lw:.6})})}
  // the front histogram: [value, count] pairs at X(value); s scales a count to a height
  function hist(R,H,X,z,s,o){const a=o.a==null?1:o.a;if(a<=.01)return;const g=o.grow==null?1:o.grow;
    H.forEach(([v,c])=>{if(!c)return;R.box([X(v),0,z+(o.dz||0)],[o.bw,Math.max(.012,c*s*g),o.d||.34],{fill:o.c,a,fa:o.fa,shadow:false,lw:.6,ea:o.ea})})}
  // a bracket of one standard error either side of the centre, at height y over the front axis
  function bracket(R,X,c,se,y,z,o){const a=o.a==null?1:o.a;if(a<=.01)return;const P=R.P,l=X(c-se),r=X(c+se),col=o.c||P.acc;
    R.line([[l,y,z],[r,y,z]],{c:col,w:2.6,a,top:1});[l,r].forEach(x=>R.line([[x,y-.1,z],[x,y+.1,z]],{c:col,w:2.2,a,top:1}));
    if(o.text)R.label([r,y,z],o.text,{al:'left',dx:8,mono:true,fs:12.5,b:1,c:col,a})}
  // a vertical marker for the truth on the front axis
  function truth(R,x,z0,z1,h,o){const P=R.P,a=o.a==null?1:o.a;if(a<=.01)return;R.line([[x,.01,z0],[x,.01,z1]],{c:P.good,w:2,a,dash:[5,4]});R.line([[x,0,z1],[x,h,z1]],{c:P.good,w:2,a,dash:[5,4],top:1});
    if(o.text)R.label([x,h,z1],o.text,{dy:-10,mono:true,fs:12.5,b:1,c:P.good,a})}
  // value ticks under the front axis
  function ticks(R,X,vals,z,a,fmt){const P=R.P;if(a<=.01)return;R.line([[X(vals[0]),0,z],[X(vals[vals.length-1]),0,z]],{c:P.mute,w:1.2,a:a*.7});
    vals.forEach(v=>R.label([X(v),0,z],fmt?fmt(v):String(v),{dy:15,mono:true,fs:12,c:P.mute,a}))}
  return {WORD,wc,wordOf,row,hist,bracket,truth,ticks,mix};
})();
