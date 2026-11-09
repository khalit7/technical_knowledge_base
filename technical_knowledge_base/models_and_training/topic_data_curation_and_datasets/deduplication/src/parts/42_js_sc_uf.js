// ---- Scene (Reading 4, Fig. 2): union-find replayed on the running example's largest MinHash cluster (renderer v2) ----
// window.DP.uf.anim[0]: 25 pages whose extracted text is one cookie notice; run0's 24 union operations in order (band, pair, the parent
// array after each), and each page's true Jaccard with the kept page (jk). Pages stand in a ring in document order, the kept root in the middle;
// candidate pairs are orange chords between the two pages, parent pointers arcs to the root; the 0.8 check is a glass plane.
(function(){
  if(!document.getElementById('stg-uf'))return;const {at,off,lerp,mix}=S3;
  const A=DP.uf.anim[0],n=A.members.length,idx={};A.members.forEach((m,k)=>idx[m]=k);
  const kept=idx[A.kept],ops=A.ops,RR=3.3,HJ=2.2,TH=.8;
  // the stretches of the replay: step 2 plays ops 0..9, step 3 ops 10..18 (the rest of band 1), step 4 the later bands
  const band1=ops.filter(o=>o.b===0).length,SPAN=[[0,0],[0,10],[10,band1],[band1,ops.length]];
  const ring=[];let r=0;for(let k=0;k<n;k++){if(k===kept){ring.push([0,0]);continue}const a=-Math.PI/2-2*Math.PI*r/(n-1);ring.push([RR*Math.cos(a),RR*Math.sin(a)]);r++}
  const pos=k=>[ring[k][0],0,ring[k][1]];
  const low=A.jk.map((j,k)=>k!==kept&&j!=null&&j<TH);
  const minK=A.jk.reduce((b,j,k)=>k!==kept&&j!=null&&(b<0||j<A.jk[b])?k:b,-1);
  // a stretch plays its operations one by one over about 3.6 s after its step begins (the flows keep the stage redrawing); reduced motion shows its end
  let lk=-1,t0=0;const PLAY=3.6;
  function draw(R,k,e){const P=R.P;R.grid(-4.4,4.4,-4.2,4.2,.5);if(k!==lk){lk=k;t0=R.t}const u=S3.RM?1:Math.min(1,(R.t-t0)/PLAY);
    // how many operations have run by now
    let done=0,cur=-1;if(k>=1&&k<=3){const [a,b]=SPAN[k];const t=a+(b-a)*Math.min(1,u*1.08);done=Math.floor(t+1e-9);cur=Math.min(b-1,done);done=Math.min(b,done)}else if(k>=4)done=ops.length;
    const par=done>0?ops[done-1].par.map(x=>idx[x]):[...Array(n).keys()];
    const removed=k>=4,hj=k>=5?(k===5?e:1):0,chk=k===6?e:0;
    for(let q=0;q<n;q++){const p0=pos(q),isK=q===kept,jn=par[q]!==q||isK&&par.some((x,i)=>x===q&&i!==q);
      const hgt=lerp(.14,Math.max(.14,(A.jk[q]==null?1:A.jk[q])*HJ),hj),back=low[q]&&chk>.5;
      let fill=P.paper,a=1;
      if(isK)fill=k>=4?P.good:jn?mix(P.paper,P.c1,.55):P.paper;
      else if(removed){fill=back?mix(P.paper,P.c1,.7):mix(P.paper,P.c2,.7);a=k===4?lerp(1,.55,e):back?1:.5}
      else if(jn)fill=mix(P.paper,P.c1,.35);
      R.box(p0,[.46,isK?Math.max(hgt,.3):hgt,.46],{fill,a,lw:.7})}
    // parent pointers: arcs from each joined page to its parent (the root, after path compression)
    if(k>=1&&k<=4)for(let q=0;q<n;q++){if(par[q]===q)continue;const a0=pos(q),b0=pos(par[q]);R.arc([a0[0],.16,a0[2]],[b0[0],.32,b0[2]],.45,{c:P.c1,w:1.3,a:k===4?1-e:.75})}
    // the current pair: an orange chord between the two pages, and dots flowing from the joining root into the set
    if(cur>=0&&k>=1&&k<=3){const o=ops[cur],ia=idx[o.a],ic=idx[o.c],a0=pos(ia),c0=pos(ic);
      R.line([[a0[0],.2,a0[2]],[c0[0],.2,c0[2]]],{c:P.c2,w:3,dash:[6,4]});
      if(o.j){const ch=idx[o.j[0]],p1=pos(ch),p2=pos(idx[o.j[1]]);R.flowArc([p1[0],.2,p1[2]],[p2[0],.35,p2[2]],.45,{c:P.c2,r:.06,n:6,speed:1.8})}
      R.label([c0[0],.2,c0[2]],'band '+(o.b+1),{mono:true,fs:12,dy:-16,c:P.c2,b:1})}
    // the earlier pair chords, faint: the chain the pairs form around the ring
    if(k>=1&&k<=3)for(let i=0;i<done;i++){if(i===cur)continue;const o=ops[i],a0=pos(idx[o.a]),c0=pos(idx[o.c]);R.line([[a0[0],.17,a0[2]],[c0[0],.17,c0[2]]],{c:P.c2,w:1.2,a:.35})}
    // labels
    R.label(pos(kept),A.hosts[kept].replace(/^www\./,''),{mono:true,fs:12,dy:k>=5?-14-HJ*28:-28,c:k>=4?P.good:P.ink,b:1});
    if(k===0)R.label([0,0,RR],'25 pages · each its own set',{mono:true,fs:12,dy:30,c:P.mute});
    if(k>=1&&k<=3){const sets=new Set(par.map((_,q)=>{let x=q;while(par[x]!==x)x=par[x];return x})).size;R.label([0,0,RR],done+' unions · '+sets+' separate sets',{mono:true,fs:12.5,b:1,dy:30,c:P.ink})}
    if(k===4)R.label([0,0,RR],'kept 1 · removed '+(n-1),{mono:true,fs:12.5,b:1,dy:30,c:P.c2,a:e});
    if(k===5){const p0=pos(minK);R.label([p0[0],A.jk[minK]*HJ,p0[2]],A.hosts[minK]+' · J '+A.jk[minK].toFixed(2),{mono:true,fs:12,dy:-14,c:P.c2,b:1,a:e})}
    if(k===6){R.glass([-RR-.5,TH*HJ,-RR-.5],[2*RR+1,0,0],[0,0,2*RR+1],{c:P.c1,a:.55*e,nu:6,nv:6,th:.02});
      R.label([RR+.5,TH*HJ,RR+.5],'Jaccard 0.8 with the kept page',{al:'left',dx:6,mono:true,fs:12,c:P.c1,a:e,wide:1});
      low.forEach((l,q)=>{if(!l)return;const p0=pos(q);R.label([p0[0],A.jk[q]*HJ,p0[2]],A.hosts[q].replace(/^www\./,'')+' '+A.jk[q].toFixed(2),{mono:true,fs:12,dy:-12,c:P.c1,a:e,grp:'back'})});
      R.label([0,0,RR],'back '+low.filter(Boolean).length+' · removed '+(n-1-low.filter(Boolean).length),{mono:true,fs:12.5,b:1,dy:30,c:P.ink,a:e})}
  }
  const full={cam:[.25,.72],bounds:[[-3.9,0,-3.9],[3.9,.6,3.9]]},tall={cam:[.35,.42],bounds:[[-3.9,0,-3.9],[3.9,HJ,3.9]]};
  S3.stage({id:'stg-uf',list:'sx-uf',fig:'Fig. 2 · union-find on the largest cluster',cam:full.cam,bounds:full.bounds,aspect:.72,dur:1400,hold:5000,draw,
    margin:w=>w<520?[18,10,26,10]:[26,24,34,24],view:k=>k>=5?tall:full});
})();
