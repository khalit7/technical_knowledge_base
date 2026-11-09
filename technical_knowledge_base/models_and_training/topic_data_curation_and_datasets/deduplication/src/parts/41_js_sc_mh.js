// ---- Scene (Reading 3, Fig. 1): MinHash and LSH on two real pages of the running example (renderer v2) ----
// Every number is datatrove 0.10.1's own signer on the pair (window.DP.mhdemo): the shingle sets, the first 8 hash functions'
// values per shingle (f8, thousandths of the range), each page's 112 minimums (sigf, ten-thousandths), equality per slot and per band.
// Steps: two shingle sets as tile rows, Jaccard, hash 1 and its minimums, hashes 2 to 8 replayed, the two 112-value signatures
// as glass plates (14 bands x 8), the bands, and the bucket an equal band lands in.
(function(){
  if(!document.getElementById('stg-mh'))return;const {at,off,lerp,mix}=S3;
  const D=DP.mhdemo,U=DPU;let key='forum',L=null;
  // the columns: A-only shingles, then the shared ones, then B-only, so a shared shingle stands in one column in both rows
  function lay(){const p=D.pairs[key],A=p.docs[0],B=p.docs[1],sb=new Set(B.shingles),sa=new Set(A.shingles);
    const cols=[];A.shingles.forEach((s,i)=>{if(!sb.has(s))cols.push({s,a:i,b:-1})});A.shingles.forEach((s,i)=>{if(sb.has(s))cols.push({s,a:i,b:B.shingles.indexOf(s)})});
    B.shingles.forEach((s,i)=>{if(!sa.has(s))cols.push({s,a:-1,b:i})});
    const n=cols.length,W=10.6,pitch=W/n;cols.forEach((c,i)=>c.x=-W/2+pitch*(i+.5));
    const oa=A.shingles.length-p.inter,ob=B.shingles.length-p.inter;
    return L={p,A,B,cols,pitch,oa,ob,n}}
  const ZA=2.3,ZB=.5,ZP=-1.2,PX=1.75,CW=.36,RH=.2,Y0=.3,HB=1.5;
  const px=(side,c)=>side*PX+(c-3.5)*CW,py=b=>Y0+(13-b)*RH;   // plate cell: column c of 8 (a row of a band), band b of 14 (band 1 on top)
  function hashH(f,doc,i){return doc.f8[f][i]/1000*HB}
  // step 4 replays hashes 2 to 8 one by one over about 3.5 s after the step begins (the flows keep the stage redrawing); reduced motion shows the end
  let lk=-1,t0=0;
  function draw(R,k,e){const P=R.P,T=L||lay(),p=T.p,A=T.A,B=T.B;R.grid(-6,6,-2.4,2.6,.5);if(k!==lk){lk=k;t0=R.t}const u=S3.RM?1:Math.min(1,(R.t-t0)/3.5);
    const rowA=k>=4?(k===4?1-e:0):1;
    // 1 and 2: the shingle tiles; shared columns rise at step 2 and stay raised a little
    const lift=k===1?.28*e:k>=2&&k<4?.28:k>=4?.28*(k===4?1-e:0):0;
    // hash bars: function 1 at step 3; functions 2 to 8 replayed during step 4
    const fi=k===2?0:k===3?Math.min(7,1+Math.floor(u*7.999)):-1,ha=k===2?e:k===3?1:k===4?1-e:0;
    T.cols.forEach(c=>{const sh=c.a>=0&&c.b>=0,tile=[T.pitch*.78,.06,.6];
      [[c.a,A,ZA],[c.b,B,ZB]].forEach(([i,doc,z])=>{if(i<0)return;const y=sh?lift:0;
        const fill=sh?mix(P.paper,P.c1,k>=1?.55:.4):P.paper;R.box([c.x,y,z],tile,{fill,a:rowA,shadow:y<.05,lw:.6});
        if(fi>=0&&ha>.01){const f=k===3?fi:0,h=Math.max(.012,hashH(f,doc,i)),mn=doc.argmin8[f]===i;
          R.box([c.x,y+.06,z],[T.pitch*.6,h,.26],{fill:mn?P.c2:mix(P.paper,P.ink,.05),a:ha*rowA*(mn?1:.5),shadow:false,lw:.4});
          if(mn)R.glow([c.x,y+.12,z],.32,{c:P.c2,a:ha*.8})}})});
    // row labels: A under the front row, B over the back row, the shared count between them (steps 1 and 2 only)
    if(k<=1){const x0=T.cols[0].x-T.pitch/2,xb=T.cols[T.oa].x-T.pitch/2,a0=T.oa,a1=T.oa+p.inter-1,g=(T.cols[a0].x+T.cols[a1].x)/2;
      R.label([x0,0,ZA+.3],(R.W<520?'A · '+A.shingles.length+' shingles':'A · '+A.host+' · '+A.shingles.length+' shingles'+(T.oa?', '+T.oa+' only in A':'')),{al:'left',mono:true,fs:12,dy:16,c:P.ink});
      R.label([xb,0,ZB-.3],(R.W<520?'B · '+B.shingles.length+' shingles':'B · '+B.host+' · '+B.shingles.length+' shingles'+(T.ob?', '+T.ob+' only in B':'')),{al:'left',mono:true,fs:12,dy:-14,c:P.ink});
      R.label([g,lift+.06,(ZA+ZB)/2],k===1?'J = '+p.inter+' shared / '+p.union+' in all = '+p.j.toFixed(3):p.inter+' shared',{mono:true,fs:k===1?14:12.5,b:1,c:P.c1})}
    // the minimum's shingle
    if(fi>=0&&ha>.3){const f=k===3?fi:0,ia=A.argmin8[f],c=T.cols.find(x=>x.a===ia),same=p.eq[f];
      R.label([0,0,ZA+.3],R.W<520?'hash '+(f+1)+' of 112 · '+(same?'minimums equal':'minimums differ'):'hash '+(f+1)+' of 112 · '+(same?'both minimums: ':'A’s minimum: ')+'“'+A.shingles[ia]+'”',{mono:true,fs:12.5,dy:18,c:P.c2,a:ha,b:1});
      if(!same){const ib=B.argmin8[f];R.label([0,0,ZA+.3],'B’s minimum: “'+B.shingles[ib]+'”',{mono:true,fs:12.5,dy:38,c:P.c2,a:ha,wide:1})}}
    // the two signatures: glass plates of 8 x 14 cells, a cell standing out by its minimum's value
    const pa=k<2?0:k===2?e*.6:k===3?.75:1,filled=k<2?0:k===2?(e>.6?1:0):k===3?1+Math.min(7,Math.floor(u*7.999)):112;
    const fullA=k>=4?1:.75;
    [[-1,A,P.c1],[1,B,P.c1]].forEach(([side,doc])=>{
      R.glass([side*PX-4*CW,Y0,ZP],[8*CW,0,0],[0,14*RH,0],{c:P.c1,a:pa*.8,nu:8,nv:14});
      if(pa>.3)R.label([side*PX,Y0+14*RH,ZP],(side<0?'A':'B')+'’s signature',{mono:true,fs:12,dy:-12,c:P.ink,a:pa,wide:1});
      for(let s=0;s<filled;s++){const b=Math.floor(s/8),c=s%8,eq=p.eq[s];let ba=fullA;
        if(k>=5){const bm=p.bands[b];ba=bm?1:.28}
        const d=.04+Math.min(.5,doc.sigf[s]/700*.5);
        R.box([px(side,c),py(b)+.03,ZP+.05+d/2],[CW*.78,RH*.7,d],{fill:eq?mix(P.paper,P.c1,.6):mix(P.paper,P.c2,.75),a:ba,shadow:false,lw:.5})}});
    // flows: each page's minimum goes to its signature slot (hash 1 at step 3, the current hash during step 4)
    if(fi>=0&&ha>.3&&k<=3){const f=k===3?fi:0,b=Math.floor(f/8),c=f%8;
      [[A,ZA,-1],[B,ZB,1]].forEach(([doc,z,side])=>{const i=doc.argmin8[f],col=T.cols.find(x=>(side<0?x.a:x.b)===i);
        R.flowArc([col.x,.3,z],[px(side,c),py(b)+.1,ZP+.2],.9,{c:P.c2,a:ha*.9,r:.06,n:7,speed:1.6})})}
    // 5: the estimate
    if(k===4){const ne=p.eq.reduce((a,b)=>a+b,0);R.label([0,Y0,ZP+.4],R.W<520?ne+'/112 equal · est. '+p.est.toFixed(3):ne+' of 112 equal · estimate '+p.est.toFixed(3)+' · true J '+p.j.toFixed(3),{mono:true,fs:12.5,b:1,dy:20,c:P.ink,a:e})}
    // 6 and 7: bands; an equal band's values hash to the same bucket, drawn between the two plates at that band's height
    if(k>=5){const mb=p.bands.map((v,i)=>v?i:-1).filter(i=>i>=0),bu=k===6?e:0;
      if(k===5)R.label([0,Y0,ZP+.4],mb.length?(mb.length===1?'band '+(mb[0]+1)+': all 8 equal':mb.length+' of 14 bands: all 8 equal'):'no band has all 8 equal',{mono:true,fs:12.5,b:1,dy:20,c:P.c1,a:e});
      mb.forEach((b,j)=>{const y=py(b)+.03,bx=[0,y-.02,ZP+.15];
        if(k===5&&mb.length<=3)R.label([PX+4*CW,y+RH*.35,ZP],'band '+(b+1),{al:'left',dx:8,mono:true,fs:12,c:P.c1,b:1,a:e});
        if(k===6){R.box(bx,[.62,RH*.9,.4],{fill:mix(P.paper,P.c3,.45),a:bu,shadow:false});
          [-1,1].forEach(side=>R.flow([[side*(PX-4*CW*.2),y+RH*.35,ZP+.25],[side*.32,y+RH*.35,ZP+.25]],{c:P.c1,a:bu,r:.05,n:5,speed:1.2}))}});
      if(k===6){const pr=U.P(p.j,14,8);R.label([0,Y0,ZP+.4],mb.length?(R.W<520?'candidate pair · P = ':'same bucket: a candidate pair · P = 1−(1−J⁸)¹⁴ = ')+U.pct(pr):'no shared bucket: not a candidate',{mono:true,fs:12.5,b:1,dy:20,c:P.c3,a:e});
        if(mb.length&&mb.length<=3)R.label([0,py(mb[0])+RH,ZP],'bucket',{mono:true,fs:12,dy:-10,c:P.c3,a:e})}}
  }
  // the step list's numbers follow the chosen pair
  function texts(){const T=L||lay(),p=T.p,A=T.A,B=T.B,mb=p.bands.map((v,i)=>v?i+1:0).filter(Boolean),pr=U.P(p.j,14,8),ne=p.eq.reduce((a,b)=>a+b,0);
    const v={ha:A.host,hb:B.host,na:A.shingles.length,nb:B.shingles.length,i:p.inter,u:p.union,oa:T.oa,ob:T.ob,j:p.j.toFixed(3),m1:A.shingles[A.argmin8[0]],
      e8:p.eq.slice(0,8).reduce((a,b)=>a+b,0),e:ne,est:p.est.toFixed(3),se:Math.sqrt(p.j*(1-p.j)/112).toFixed(3),
      bands:mb.length===0?'no band does':mb.length===1?'only band '+mb[0]+' does':mb.length+' of the 14 bands do ('+mb.join(', ')+')',
      bk:mb.length===1?'band '+mb[0]+'’s bucket':mb.length+' buckets, one per equal band',p:U.pct(pr),
      luck:key==='forum'?': this pair, below the 0.75 target, was unlucky, and run0 did remove one of the two pages':': a pair this similar is a candidate almost every time'};
    document.querySelectorAll('#sx-mh [data-mh]').forEach(s=>{s.textContent=v[s.dataset.mh]})}
  const full={cam:[0,.62],bounds:[[-5.6,0,-1.3],[5.6,1.6,2.5]]};
  const rows={cam:[0,1.12],bounds:[[-5.6,0,.3],[5.6,.4,2.5]]},plates={cam:[0,.2],bounds:[[-3.2,.1,-1.3],[3.2,3.2,-.4]]};
  const st=S3.stage({id:'stg-mh',list:'sx-mh',fig:'Fig. 1 · MinHash and LSH on two real pages',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:4800,draw,
    margin:w=>w<520?[16,10,14,10]:[24,16,30,16],
    view:k=>k<=1?rows:k===2||k===3?full:plates});
  RD.seg(document.getElementById('dp-mh-pair'),m=>{key=m;L=null;texts();st.draw()});
  texts();
})();
