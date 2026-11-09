// ---- Scene: Fig. 1, lost in the middle (stg-mid, renderer v2). The prompt of Liu et al. as 20 passage tiles in prompt order, the answer passage in blue,
// moved from position 1 to 20; a column at each measured position is the model's accuracy there (Table 6, 20 documents, arXiv 2307.03172v3), the two
// glass planes are its closed-book and oracle scores (Table 1). Step 5 adds every model of Table 6 as one row. Data: window.LD.litm (from data.py). ----
(function(){
  if(!document.getElementById('stg-mid')||!window.S3||!window.LD)return;
  const {mix,lerp,cl}=S3,win=(e,a,b)=>cl((e-a)/(b-a),0,1),L=LD.litm,POS=L.pos,N=20,PIT=.48,X=i=>(i-(N-1)/2)*PIT,HS=2.4,Y0=.06;
  const H=v=>v/100*HS,ZR=r=>1.3-r*1.15,MX=5.55;
  const rows=L.rows.map(([m,v,cb,or])=>({m,v,cb,or,spread:+(Math.max(...v)-Math.min(...v)).toFixed(1),below:POS.filter((p,i)=>v[i]<cb)}));
  (window.LCS=window.LCS||{}).mid={rows,pos:POS};
  // where the answer passage is during a step: steps 2 and 3 slide it through two measured positions each
  const gold=(k,e)=>{const ix=POS.map(p=>p-1);if(k===0)return ix[0];if(k===1)return e<.5?lerp(ix[0],ix[1],win(e,0,.4)):lerp(ix[1],ix[2],win(e,.5,.9));if(k===2)return e<.5?lerp(ix[2],ix[3],win(e,0,.4)):lerp(ix[3],ix[4],win(e,.5,.9));return ix[4]};
  // how far each measured column has risen: column j appears when the passage reaches it
  const rise=(j,k,e)=>{const at=[[0,0],[1,0],[1,1],[2,0],[2,1]][j];if(j===0)return k===0?win(e,.1,.6):1;if(k<at[0])return 0;if(k>at[0])return 1;return at[1]===0?win(e,.3,.5):win(e,.8,1)};
  function draw(R,k,e){const P=R.P,r0=rows[0],g=gold(k,e),rowsA=k===4?win(e,.1,.7):0;
    R.grid(-5.4,6.4,-4.2,2.2,.5);
    // the other models (step 5): one row each, tiles flat, columns at the measured positions, orange where below that model's closed-book score
    if(rowsA>.01)R.label([X(0)-.4,.1,ZR(0)],rows[0].m+' · spread '+rows[0].spread.toFixed(1),{al:'right',dx:-6,fs:12,mono:true,grp:'row',a:rowsA,b:1});
    rows.forEach((r,ri)=>{if(ri===0)return;const a=rowsA;if(a<=.01)return;const z=ZR(ri);
      R.quad([[X(0)-.22,.01,z-.3],[X(N-1)+.22,.01,z-.3],[X(N-1)+.22,.01,z+.3],[X(0)-.22,.01,z+.3]],{fill:mix(P.paper,P.soft,.5),a:a*.8,ea:.4});
      POS.forEach((p,j)=>{const v=r.v[j],c=v<r.cb?mix(P.paper,P.bad,.75):mix(P.paper,P.c1,.35);R.box([X(p-1),0,z],[.3,Math.max(.01,H(v)*a),.3],{fill:c,a,shadow:false})});
      R.label([X(0)-.4,.1,z],r.m+' · spread '+r.spread.toFixed(1),{al:'right',dx:-6,fs:12,mono:true,grp:'row',a,c:r.m.startsWith('Claude')?P.acc:P.ink})});
    // the front row: GPT-3.5-Turbo's prompt
    const z=ZR(0),fa=k===4?1-.35*rowsA:1;
    for(let i=0;i<N;i++){const isG=Math.abs(i-g)<.5,c=isG?P.acc:P.paper;R.box([X(i),0,z],[.4,Y0,.7],{fill:c,a:fa,shadow:i%2===0})}
    // the answer passage, sliding: a raised blue tile riding over the row
    R.box([X(0)+g*PIT,Y0,z],[.4,.05,.7],{fill:P.acc,a:fa,shadow:false});
    if(k<4)R.label([X(0)+g*PIT,Y0,z+.36],'answer passage',{fs:12,b:1,c:P.acc,dy:16});
    POS.forEach((p,j)=>{const a=rise(j,k,e);R.label([X(p-1),0,z+.36],String(p),{fs:12,mono:true,c:P.mute,dy:k<4?34:16,a:k===0&&j>0?.5:1});if(a<=0)return;
      const v=r0.v[j],low=k>=3&&v<r0.cb,cur=k<3&&Math.abs((p-1)-g)<.5,c=low?mix(P.paper,P.bad,(k===3?e:1)*.8):cur?mix(P.paper,P.acc,.55):mix(P.paper,P.c1,.35);
      R.box([X(p-1),Y0,z],[.36,Math.max(.01,H(v)*a),.36],{fill:c,a:fa,shadow:false});
      if(k!==3||low)R.label([X(p-1),Y0+H(v)*a,z],v.toFixed(1)+'%',{mono:true,fs:12.5,b:cur||low,dy:-11,a:Math.min(1,a*1.5)*(1-rowsA),c:low?P.bad:P.ink})});
    // the model at the end of the prompt, with the answer flowing to it from wherever it sits (more dots where it is found more often)
    R.box([MX,0,z],[.8,.55,.7],{fill:mix(P.paper,P.ink,.08),a:fa});R.label([MX,.55,z],'model',{fs:12.5,b:1,dy:-10,a:fa});
    if(k<3){const v=r0.v[Math.min(4,Math.round(g/4.75))],gp=[X(0)+g*PIT,Y0+.06,z],dens=Math.max(3,Math.round(v/8));R.flowArc(gp,[MX-.4,.3,z],.55,{c:P.acc,n:dens,r:.06,a:.9})}
    // closed-book and oracle, as glass planes over the row (step 4); they stay faint behind the other models in step 5
    const pa=k===3?win(e,0,.6):k===4?1-rowsA:0;
    [[r0.cb,'closed-book (no passages) '+r0.cb.toFixed(1)+'%',P.bad],[r0.or,'oracle (answer passage only) '+r0.or.toFixed(1)+'%',P.good]].forEach(([v,t,c])=>{if(pa<=.01)return;
      R.glass([X(0)-.3,Y0+H(v),z-.42],[X(N-1)-X(0)+.6,0,0],[0,0,.84],{c,a:pa,nu:20,nv:1,th:.01});R.label([X(0)-.3,Y0+H(v),z+.42],t,{al:'right',dx:-6,fs:12.5,b:1,c,a:pa,grp:'pl'})});
  }
  const near={cam:[.22,.72],bounds:[[-5.0,0,.7],[6.1,2.25,1.9]]};
  S3.stage({id:'stg-mid',list:'sx-mid',fig:'Fig. 1 · GPT-3.5-Turbo, 20 passages, the answer moved',cam:near.cam,bounds:near.bounds,aspect:.5,dur:2400,hold:4600,draw,
    margin:w=>w<520?[16,8,14,8]:[22,16,14,16],
    view:k=>{const L=(document.getElementById('stg-mid').clientWidth||999)<520?-5.0:-8.6;return k===4?{cam:[.25,.98],bounds:[[L,0,-4.7],[6.1,2.3,1.9]]}:k===3?{cam:[.22,.72],bounds:[[L,0,.7],[6.1,2.3,1.9]]}:null}});
})();
