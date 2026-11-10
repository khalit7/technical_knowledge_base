// ---- Scene, Fig. 3 (section 5): sixteen float16 numbers summed three ways (renderer v2).
// The numbers stand in a row in front (2,048 tall and orange, fifteen near 1). Left to right and atomics feed one running total; every
// addition streams a number into it and rounds it to float16, and a row of red columns behind records what has been lost so far.
// The pairwise tree builds its levels backwards over the floor, children streaming into each partial sum. All values come from the
// page's float16 model (window.PCSUM, built in 29_js_rd_num.js; the model matches PyTorch's casts bit for bit, check/check_js.mjs).
// The steps are #sx-sum-seq, #sx-sum-pair and #sx-sum-atom on the left; long replays are grouped into stretches of five additions. ----
(function(){
  if(!document.getElementById('stg-sum')||!window.PCSUM)return;const {mix}=S3,f=MC.fmtN,$=id=>document.getElementById(id),SM=window.PCSUM;
  let mode='seq',seed=7,ops=SM.build('seq');
  const XS=.6,lx=j=>(j-7.5)*XS,ZL=1.35,ACC=[0,0,-.55],ZH=-1.85,fv=v=>v>=100?f(v,0):f(v,2);
  // how many additions are done at step k (e: the step's progress): stretches of five for one running total, one tree level per step
  function done(k,e){if(mode==='pair'){const L=Math.min(k,4);return ops.filter(o=>o.lev<L||(o.lev===L&&e>=.35)).length}
    if(k===0)return 0;if(k>=4)return 15;return 5*(k-1)+Math.max(1,Math.min(5,Math.ceil(e*5)))}
  function draw(R,k,e){const P=R.P;R.grid(-6,6,-2.8,2.6,.5);const n=done(k,e),used=new Set();ops.slice(0,n).forEach(o=>o.ids.forEach(j=>used.add(j)));
    const cur=n?ops[n-1]:null,curIds=new Set(cur&&mode!=='pair'?[cur.k]:cur?cur.ids:[]);
    // the sixteen numbers
    SM.X.forEach((v,j)=>{const big=j===0,h=big?.6:.2,on=curIds.has(j)&&k>0&&k<4,a=on?1:used.has(j)&&mode!=='pair'?.35:1;
      R.box([lx(j),0,ZL],[.46,h,.46],{fill:big?mix(P.paper,P.c2,.7):mix(P.paper,P.c1,on?.75:.35),a});if(on)R.glow([lx(j),h+.05,ZL],.4,{c:big?P.c2:P.c1,a:.6});
      R.label([lx(j),0,ZL+.3],big?'2,048':f(v,2),{mono:true,fs:12,c:big?P.c2:P.ink,dy:j%2?27:12,wide:1,a:Math.max(.55,a)})});
    if(mode==='atom'&&ops.length)ops[0].ord.forEach((j,r)=>R.label([lx(j),j===0?.6:.2,ZL],'#'+(r+1),{mono:true,fs:12,c:P.mute,dy:-12,wide:1}));
    if(mode==='pair'){
      // the tree: level L sits L steps further back, each node as wide as the numbers under it
      ops.slice(0,n).forEach((o,i)=>{const span=Math.pow(2,o.lev),x=lx(o.pos*span)-XS/2+span*XS/2,z=ZL-o.lev*.82,y=0,wd=span*XS-.14,nw=o.lev===Math.min(k,4),a=nw?Math.min(1,(e-.35)/.4+(k>o.lev?1:0)):.55,lost=Math.abs(o.ex-o.v)>.05;
        R.box([x,y,z],[wd,.18,.5],{fill:mix(P.paper,lost?P.bad:P.acc,lost?.35:.3),a:Math.max(.2,Math.min(1,a))});
        const kids=o.lev===1?o.ids.map(j=>[lx(j),.2,ZL]):ops.filter(q=>q.lev===o.lev-1&&q.ids.every(j=>o.ids.includes(j))).map(q=>{const s2=Math.pow(2,q.lev);return [lx(q.pos*s2)-XS/2+s2*XS/2,.18,ZL-q.lev*.82]});
        if(nw)kids.forEach(c=>R.flowArc(c,[x,.18,z],.28,{c:P.acc,a:.9,r:.05,n:4,speed:1}));
        if(nw||k>=4&&o.lev===4)R.label([x,.18,z],fv(o.v),{mono:true,fs:12.5,b:1,c:lost?P.bad:P.acc,dy:-11,wide:o.lev===1?1:0})});
      if(k>=4)R.label([0,.18,ZL-4*.82],'exact '+f(SM.exact,2),{mono:true,fs:12.5,c:P.mute,dy:-30})
    }else{
      // one running total, rounded to float16 after every addition
      const v=cur?cur.v:SM.X[ops[0]?ops[0].ord[0]:0],ex=cur?cur.ex:v;
      R.box(ACC,[1.7,.45,.9],{fill:mix(P.paper,P.acc,.3)});
      R.label([ACC[0],.45,ACC[2]],'running total '+fv(v),{mono:true,fs:13,b:1,c:P.acc,dy:-14});
      if(cur&&k>0&&k<4)R.flowArc([lx(cur.k),.22,ZL],[ACC[0],.45,ACC[2]],.75,{c:cur.k===0?P.c2:P.c1,a:1,r:.07,n:7,speed:1.4});
      // what has been lost after each addition (exact sum of the same numbers minus the rounded total), one column per addition
      ops.slice(0,n).forEach((o,i)=>{const l=o.ex-o.v,h=Math.max(.015,Math.abs(l)*.34),now=i===n-1;
        R.box([(i-7)*XS,0,ZH],[.34,h,.34],{fill:mix(P.paper,l>0?P.bad:P.good,.65),a:now||k>=4?1:.55})});
      if(n)R.label([(-7)*XS-.4,0,ZH],'lost so far',{al:'right',mono:true,fs:12.5,c:P.bad,grp:'h'});
      if(k>=4){const o=ops[ops.length-1];R.label([7*XS,Math.abs(o.ex-o.v)*.34,ZH],'lost '+f(o.ex-o.v,2),{mono:true,fs:12.5,b:1,c:P.bad,dy:-12});
        R.label([ACC[0],.45,ACC[2]],'exact '+f(SM.exact,2),{mono:true,fs:12.5,c:P.mute,dy:-32})}
    }
  }
  function readout(k){const n=done(k,1),o=n?ops[n-1]:null,L=ops[ops.length-1];
    $('rd-sum-cnt').innerHTML=RD.stat('Result so far',o?fv(o.v):'2,048',o&&mode!=='pair'?fv(o.a)+' + '+f(o.b,2)+' = '+f(o.a+o.b,2)+', rounded to float16':'float16')+RD.stat('Exact sum of all 16',f(SM.exact,4),'float64')+
      RD.stat('Final result',k>=4?fv(L.v):'...',k>=4?'error '+f(L.v-SM.exact,3):'')+(mode==='atom'?RD.stat('Order seed',String(seed),'"Another run" draws a new order'):'')}
  const full={cam:[.08,.74],bounds:[[-5.0,0,-2.2],[5.0,.9,1.9]]};
  const st=S3.stage({id:'stg-sum',list:'sx-sum-seq',fig:'Fig. 3 · the same sixteen numbers, three orders',cam:full.cam,bounds:full.bounds,aspect:.46,dur:2600,hold:4200,draw,
    margin:w=>w<520?[14,10,12,10]:[20,16,16,110],onStep:k=>{try{readout(k)}catch(err){}}});
  (window.PCSTG=window.PCSTG||{})['stg-sum']=st;
  const L={seq:'sx-sum-seq',pair:'sx-sum-pair',atom:'sx-sum-atom'};
  RD.seg($('rd-sum-mode'),v=>{mode=v;ops=SM.build(v,seed);Object.keys(L).forEach(m=>$(L[m]).hidden=m!==v);$('rd-sum-again').hidden=v!=='atom';st.list(L[v])});
  $('rd-sum-again').onclick=()=>{seed++;ops=SM.build('atom',seed);st.list(L.atom)};
})();
