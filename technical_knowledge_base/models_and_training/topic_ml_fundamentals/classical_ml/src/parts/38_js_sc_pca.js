// ---- Scene (9 PCA, Fig. 4): PCA on three real wine measurements, found, turned onto its axes and flattened onto the top two (renderer v2) ----
// The 178 wines of UCI Wine (scikit-learn load_wine), three of the 13 measurements: flavanoids, total phenols and OD280/OD315, the three that
// weigh most in the first component of the standardised 13 (Fig. 5's data). Each is standardised; the components are this page's ML.pca
// (Jacobi; explained-variance ratios equal scikit-learn's to 1e-15 on the 13). Step 5 turns the cloud by the rotation whose rows are the
// components, so PC1, PC2 and PC3 become the axes; step 6 drops PC3. The step list's numbers are written here from the same fit.
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-pc')||!window.S3||!window.ML||!window.CD)return;const {lerp,mix}=S3;
  const W=CD.wine,FI=[6,5,11],NM=['flavanoids','total phenols','OD280/OD315'];
  const X3=W.X.map(r=>FI.map(j=>r[j])),n=X3.length;
  const mu=[0,1,2].map(j=>X3.reduce((a,r)=>a+r[j],0)/n),sd=[0,1,2].map(j=>Math.sqrt(X3.reduce((a,r)=>a+(r[j]-mu[j])**2,0)/n));
  const Z=X3.map(r=>r.map((v,j)=>(v-mu[j])/sd[j]));
  const pc=ML.pca(X3,true),C=pc.comps.map(c=>c.slice());
  // world frame after the turn: x = PC1, y = PC3 (up), z = PC2; make it a proper rotation (determinant +1) by choosing PC3's sign
  const det=m=>m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1])-m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0])+m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
  let M=[C[0],C[2],C[1]];if(det(M)<0){C[2]=C[2].map(v=>-v);M=[C[0],C[2],C[1]]}
  // axis and angle of M, for a true rotation in between (Rodrigues)
  const tr=M[0][0]+M[1][1]+M[2][2],TH=Math.acos(Math.max(-1,Math.min(1,(tr-1)/2)));
  let AX=[M[2][1]-M[1][2],M[0][2]-M[2][0],M[1][0]-M[0][1]];{const l=Math.hypot(...AX)||1;AX=AX.map(v=>v/l)}
  function rot(v,t){const a=TH*t,c=Math.cos(a),s=Math.sin(a),k=AX,d=k[0]*v[0]+k[1]*v[1]+k[2]*v[2],x=[k[1]*v[2]-k[2]*v[1],k[2]*v[0]-k[0]*v[2],k[0]*v[1]-k[1]*v[0]];
    return [0,1,2].map(i=>v[i]*c+x[i]*s+k[i]*d*(1-c))}
  const S=.7,YC=1.9,w=v=>[v[0]*S,YC+v[1]*S,v[2]*S];
  const pct=v=>(100*v).toFixed(1)+'%';
  {const set=(k,v)=>document.querySelectorAll('[data-pc="'+k+'"]').forEach(e=>e.textContent=v);set('r1',pct(pc.ratio[0]));set('r2',pct(pc.ratio[1]));set('r3',pct(pc.ratio[2]));set('r12',pct(pc.ratio[0]+pc.ratio[1]));set('n',String(n))}
  const cols=P=>[P.c1,P.c2,P.c3];
  function draw(R,k,e){const P=R.P,K=cols(P);R.grid(-3,3,-3,3,.5);
    // where each wine is: feature axes (steps 1-4), turning (5), PC axes and flattened (6)
    const t5=k<4?0:k===4?e:1,t6=k<5?0:e;
    const at=z=>{const r=rot(z,t5);return w([r[0],r[1]*(1-t6),r[2]])};
    // the three feature axes, fading as the cloud turns away from them
    const fa=k<4?1:k===4?1-e:0;
    if(fa>.01)[0,1,2].forEach(j=>{const u=[0,0,0];u[j]=3.3;const a=w(u.map(v=>-v)),b=w(u);R.line([a,b],{c:P.mute,w:1.2,a:.6*fa,head:6});R.label(b,NM[j],{mono:true,fs:12,c:P.mute,a:fa,al:'left',dx:6,grp:'ax'})});
    // the principal axes: drawn through the centre, as long as two standard deviations along each; they turn with the cloud
    const arrows=[[0,1,'PC1'],[1,2,'PC2'],[2,3,'PC3']];
    arrows.forEach(([j,s0,nm])=>{if(k<s0)return;const a=k===s0?e:1,L=3*Math.sqrt(pc.vals[j]),c=[P.acc,P.c4,P.c5][j],dir=C[j],r=v=>rot(v,t5),flat=j===2&&k>=5?1-e:1;
      if(flat<=.01)return;const p0=at(dir.map(v=>-v*L*a)),p1=at(dir.map(v=>v*L*a));
      R.line([p0,p1],{c,w:3,a:a*flat,head:9,top:1});R.label(p1,nm+' · '+pct(pc.ratio[j]),{mono:true,fs:12.5,b:1,c:mix(P.ink,c,.7),a:a*flat,al:'left',dx:8,dy:-4,grp:'ax'})});
    // the best-fitting plane, spanned by PC1 and PC2 through the centre (steps 3 onwards); it turns with the cloud and ends on the floor of the PC frame
    if(k>=2){const a=k===2?e:1,L1=2.2*Math.sqrt(pc.vals[0])*1.05,L2=2.2*Math.sqrt(pc.vals[1])*1.25,u=C[0].map(v=>v*2*L1),v=C[1].map(v=>v*2*L2),o=C[0].map((x,i)=>-x*L1-C[1][i]*L2);
      const ow=at(o),uw=at(o.map((x,i)=>x+u[i])),vw=at(o.map((x,i)=>x+v[i]));
      R.glass(ow,[uw[0]-ow[0],uw[1]-ow[1],uw[2]-ow[2]],[vw[0]-ow[0],vw[1]-ow[1],vw[2]-ow[2]],{c:P.acc,a:(k===5?.55:.35)*a,nu:6,nv:4,th:.01})}
    // the wines; in step 6 each drops onto the plane along its PC3 (a short flow on the longest drops shows the move)
    const ba=k>=1&&k<=3?.45:.95;Z.forEach((z,i)=>{const p=at(z),c=K[W.y[i]];R.ball(p,.065,{c,a:ba})});
    if(k===5&&e<1){Z.forEach((z,i)=>{if(i%6)return;const r=rot(z,1),a=w(r),b=w([r[0],0,r[2]]);if(Math.abs(r[1])>.35)R.flow([a,b],{c:K[W.y[i]],r:.04,n:2,speed:.9,a:.8})})}
    if(k===5)R.label(w([2.6,0,2.4]),'PC1 + PC2 keep '+pct(pc.ratio[0]+pc.ratio[1]),{fs:12.5,b:1,c:mix(P.ink,P.acc,.6),a:e,al:'left',dx:6});
  }
  const full={cam:[-.9,.5],bounds:[[-2.2,.2,-2.2],[2.2,3.6,2.2]]};
  S3.stage({id:'stg-pc',list:'sx-pc',fig:'Fig. 4 · PCA on three wine measurements',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1700,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[18,150,18,18],
    view:k=>k===5?{cam:[.25,1.12],bounds:[[-2.6,1.6,-2.2],[2.6,2.2,2.2]]}:full});
})();
