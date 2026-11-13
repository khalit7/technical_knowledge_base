// ---- Scene: the routing analysis (Section 5) as bar fields (renderer v2) ----
// Steps 1 to 4: 20 consecutive held-out code tokens through the toy's 4 layers (ROUTES.main.samples.github[0], tokens 53 to 72, from analyse.py):
// one bar per token and layer, coloured by its first-choice expert, height its gate weight (decoded from the 0.05-wide bins analyse.py stores).
// Step 5: the toy's Table 5 on all held-out text (ROUTES.main.rep: measured and shuffled-order repeat rates, 4 domains by 4 layers).
// Step 6: Mixtral's Table 5 as printed (PAPER.tables.t5) with each subset's usage-adjusted baseline (PAPER.rc.t5_first_usage_baseline, from decoded Figure 9).
(function(){
  if(!document.getElementById('stg-route'))return;const {at,off,lerp,mix,cl}=S3;
  const RT=window.ROUTES.main,SM=RT.samples.github[0],A=53,N=20,LAY=[0,1,2,3];
  const e1=(l,i)=>+SM.e1[l][A+i],w1=(l,i)=>.5+(+SM.w1[l][A+i]+.5)/20;
  const tok=i=>{const t=SM.t[A+i];return t.indexOf('\n')>=0?'↵'+'·'.repeat(t.replace(/\n/g,'').length):t.replace(/^ /,'·')};
  // tokens whose repeats the third step links: "loop" (3 times) and "_" (3 times)
  const GR=[[3,17,19],[2,13,16]],HL=new Set(GR.flat());
  const XS=.52,x=i=>(i-(N-1)/2)*XS,ZL=[2.1,.7,-.7,-2.1],HB=1.0,FOCUS=2;
  const pairs=l=>{const r=[];for(let i=1;i<N;i++)if(e1(l,i)===e1(l,i-1))r.push(i);return r};
  // the toy's Table 5 (all held-out text) and Mixtral's (as printed)
  const DOM=['github','gutenberg','wikipedia','dm_math'],DN=['code','novels','Wikipedia','maths'],XD=[-3.3,-1.1,1.1,3.3],HT=2.6,HM=4;
  const T5=window.PAPER.tables.t5,UB=window.PAPER.rc.t5_first_usage_baseline,ML=[0,15,31],ZM=[1.7,0,-1.7],XM=j=>(j-3.5)*1.15;
  const SHORT={'ArXiv':'ArXiv','DM Mathematics':'DM Maths','Github':'GitHub','Gutenberg':'Gutenberg','PhilPapers':'PhilPapers','PubMed Abstracts':'PubMed','StackExchange':'StackEx.','Wikipedia (en)':'Wikipedia'};
  const mxRate=(r,li)=>parseFloat(T5.rows[r][1+li])/100;
  let EC=null,lastP=null;
  function cols(P){if(P!==lastP){const cs=getComputedStyle(document.body);EC=[0,1,2,3,4,5,6,7].map(i=>S3.rgb(cs.getPropertyValue('--e'+i).trim()||'#888'));lastP=P}return EC}
  function draw(R,k,e){const P=R.P,E=cols(P);
    // steps 1 to 4: the token field; it fades out fully during the first half of step 5 before the tables appear
    const fa=k<4?1:k===4?cl(1-e*2,0,1):0;
    if(fa>0){R.grid(-5.6,5.6,-2.8,3,.5);
      LAY.forEach(l=>{const grow=l===0?(k===0?e:1):(k===0?0:k===1?cl(e*3-(l-1),0,1):1);if(grow<=0)return;
        const rowA=(k===3||k===4)&&l!==FOCUS?.2:1;
        for(let i=0;i<N;i++){const h=w1(l,i)*HB*grow,ca=k===2&&!HL.has(i)?.22:rowA;
          R.box([x(i),0,ZL[l]],[.36,Math.max(.01,h),.5],{fill:E[e1(l,i)],a:ca*fa,shadow:false,lw:.7})}
        R.label([x(0)-.3,.15,ZL[l]],'layer '+l,{al:'right',dx:-6,mono:true,fs:12,c:l===FOCUS&&k>=3?P.ink:P.mute,a:Math.max(.35,rowA*grow)*fa,grp:'row'})});
      // token labels along the front, staggered in two rows; on a phone only the linked tokens keep theirs
      for(let i=0;i<N;i++){const hl=k===2&&HL.has(i);R.label([x(i),0,ZL[0]+.32],tok(i),{mono:true,fs:12,dy:i%2?28:13,b:hl,c:hl?P.ink:P.mute,a:(k===2&&!hl?.4:1)*fa,wide:hl?0:1})}
      // step 3: the same token gets the same expert (arcs between its occurrences where they agree)
      if(k===2){GR.forEach(g=>LAY.forEach(l=>{for(let j=1;j<g.length;j++){const a=g[j-1],b=g[j];if(e1(l,a)!==e1(l,b))continue;
        const pa=[x(a),w1(l,a)*HB+.03,ZL[l]],pb=[x(b),w1(l,b)*HB+.03,ZL[l]],hh=.3+.025*(b-a);
        R.arc(pa,pb,hh,{c:E[e1(l,a)],w:2,t:e});R.flowArc(pa,pb,hh,{c:E[e1(l,a)],a:e,r:.05,n:6,speed:1.1})}}))}
      // step 4: consecutive repeats at layer 2 (streams from each token to the next when both pick the same expert)
      if(k===3||(k===4&&fa>0)){const pr=pairs(FOCUS),aa=(k===3?e:1)*fa;
        pr.forEach(i=>{const pa=[x(i-1),w1(FOCUS,i-1)*HB+.03,ZL[FOCUS]],pb=[x(i),w1(FOCUS,i)*HB+.03,ZL[FOCUS]];
          R.arc(pa,pb,.2,{c:E[e1(FOCUS,i)],w:2,t:aa});R.flowArc(pa,pb,.2,{c:E[e1(FOCUS,i)],a:aa,r:.045,n:4,speed:.9})});
        R.label([0,1.5,ZL[FOCUS]],'layer 2: '+pr.length+' of '+(N-1)+' neighbours repeat',{mono:true,fs:13,b:1,c:P.ink,a:aa,dy:-6})}}
    // step 5: the toy's Table 5, measured (bars) against shuffled order (dark slabs), the glass plane at 12.5%
    if(k===4&&e>.5){const a=cl(e*2-1,0,1);tableToy(R,a,P,E)}
    // step 6: Mixtral's Table 5 against usage-adjusted baselines
    if(k===5){const a1=cl(1-e*2,0,1),a2=cl(e*2-1,0,1);if(a1>0)tableToy(R,a1,P,E);if(a2>0)tableMx(R,a2,P)}}
  // a baseline drawn as a dark ring around a bar at height y
  function ring(R,c,w,d,y,a,P){const x0=c[0]-w/2,x1=c[0]+w/2,z0=c[2]-d/2,z1=c[2]+d/2;R.line([[x0,y,z0],[x1,y,z0],[x1,y,z1],[x0,y,z1],[x0,y,z0]],{c:P.ink,w:2.4,a})}
  function plane(R,P,a,x0,x1,z0,z1,lab,H){const y=.125*H;R.glass([x0,y,z1],[x1-x0,0,0],[0,0,z0-z1],{c:P.c1,a:a*.45,nu:8,nv:4});
    R.label([x1,y,z1],lab,{al:'left',dx:6,mono:true,fs:12,c:P.c1,a})}
  function tableToy(R,a,P,E){R.grid(-4.8,4.8,-2.8,3,.5);
    DOM.forEach((d,j)=>{LAY.forEach(l=>{const r=RT.rep[d][l],z=ZL[l];
      R.box([XD[j],0,z],[.8,Math.max(.01,r.first*HT),.8],{fill:mix(P.paper,P.c4,.55),a,shadow:false});
      ring(R,[XD[j],0,z],1.0,1.0,r.first_shuf*HT,a,P)});
      R.label([XD[j],0,ZL[0]+.5],DN[j],{mono:true,fs:12.5,dy:13,c:P.ink,a})});
    LAY.forEach(l=>R.label([XD[0]-.6,.15,ZL[l]],'layer '+l,{al:'right',dx:-6,mono:true,fs:12,c:P.mute,a,grp:'row'}));
    plane(R,P,a,-4.4,4.4,-2.7,2.7,'12.5%',HT)}
  function tableMx(R,a,P){R.grid(-5,5,-2.4,2.6,.5);
    T5.rows.forEach((row,j)=>{ML.forEach((L,li)=>{const v=mxRate(j,li),u=UB[String(L)][row[0]],z=ZM[li];
      R.box([XM(j),0,z],[.7,v*HM,.7],{fill:mix(P.paper,P.c2,.55),a,shadow:false});
      ring(R,[XM(j),0,z],.9,.9,u*HM,a,P)});
      R.label([XM(j),0,ZM[0]+.5],SHORT[row[0]]||row[0],{mono:true,fs:12,dy:j%2?28:13,c:P.ink,a,wide:1})});
    ML.forEach((L,li)=>R.label([XM(0)-.5,.15,ZM[li]],'layer '+L,{al:'right',dx:-6,mono:true,fs:12,c:P.mute,a,grp:'row'}));
    plane(R,P,a,-4.6,4.6,-2.3,2.3,'12.5%',HM)}
  const full={cam:[-.15,.72],bounds:[[-5.4,0,-2.4],[5.4,1.1,2.9]]};
  const st=S3.stage({id:'stg-route',list:'sx-route',fig:'Routing · a toy on held-out code, then Table 5',cam:full.cam,bounds:full.bounds,aspect:.55,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,10,14,10]:[16,14,14,70],
    // step 1 frames layer 0 alone, step 4 moves in close on layer 2; steps 5 and 6 frame the two tables
    view:k=>k===0?{cam:[-.12,.55],bounds:[[-5.4,0,1.6],[5.4,1.1,2.9]]}:k===3?{cam:[-.08,.38],bounds:[[-5.4,0,-1.3],[5.4,1.5,-.1]]}:k===4?{cam:[-.25,.6],bounds:[[-4.6,0,-2.6],[4.9,2,3]]}:k===5?{cam:[-.25,.6],bounds:[[-4.8,0,-2.1],[5.1,1.2,2.6]]}:full});
  window.__routeScene={pairs:pairs(FOCUS).length,n:N,tokens:[...Array(N)].map((_,i)=>SM.t[A+i]),e1,w1,stage:st};
})();
