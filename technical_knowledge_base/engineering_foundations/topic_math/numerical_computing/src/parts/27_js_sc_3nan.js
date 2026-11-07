// ---- Scene: section 10, one NaN through a linear layer Y = XW, its mean loss, one training step and the next forward pass (renderer v2: glass plates for the matrices, flows along the paths the NaN takes) ----
// The matrices are NC_NAN.NS from 25_js_rd_new.js (illustrative values; every cell is the IEEE 754 result of the stated operation). check_page.mjs checks the NaN counts per step.
(function(){
  if(!document.getElementById('stg-nan')||!window.NC_NAN)return;const {at,off,lerp,mix}=S3;
  const NS=NC_NAN.NS,CS=.56,YP=.55,HB=.42;
  // plate origins (left edge x, centre z); a matrix of r rows (along z) and c columns (along x)
  const PX=[-4.3,-1.25,1.55],LX=3.75;
  const cx=(m,j)=>PX[m]+(j+.5)*CS,cz=(r,i)=>(i-(r-1)/2)*CS;
  function plate(R,m,M,name,col,a,o){o=o||{};const P=R.P,r=M.length,c=M[0].length;if(a<=.01)return;
    R.glass([PX[m],YP,cz(r,0)-CS/2],[c*CS,0,0],[0,0,r*CS],{c:col,a:a*.9,nu:c,nv:r,th:.03});
    [-1,1].forEach(s=>R.box([PX[m]+(s<0?.06:c*CS-.06),0,0],[.04,YP,.04],{a:a*.7}));
    M.forEach((row,i)=>row.forEach((v,j)=>{const bad=Number.isNaN(v),hot=o.hot&&o.hot(i,j);
      if(bad){R.box([cx(m,j),YP+.03,cz(r,i)],[CS*.72,.62,CS*.72],{fill:mix(P.paper,P.bad,.75),a,shadow:false,lw:.8});R.glow([cx(m,j),YP+.66,cz(r,i)],.3,{c:P.bad,a:a*.7})}
      else{const h=Math.max(.012,Math.abs(v)*HB);R.box([cx(m,j),v>=0?YP+.03:YP-h,cz(r,i)],[CS*.6,h,CS*.6],{fill:hot?mix(P.paper,col,.7):mix(P.paper,col,.35),a,shadow:false,lw:.6})}}));
    const nn=M.flat().filter(Number.isNaN).length,ph=R.W<520;if(ph)name=name.split(' ')[0];
    R.label([PX[m]+c*CS/2,0,cz(r,r-1)+CS/2+.15],name,{mono:true,fs:12.5,b:1,c:col,dy:14,a:Math.max(.45,a)});R.label([PX[m]+c*CS/2,0,cz(r,r-1)+CS/2+.15],nn+(ph?'/':' of ')+(r*c)+' NaN',{mono:true,fs:12.5,c:nn?P.bad:P.mute,dy:32,a:Math.max(.45,a)})}
  const top=(m,r,i,j,M)=>[cx(m,j),YP+(Number.isNaN(M[i][j])?.66:Math.max(.05,M[i][j]*HB)+.04),cz(r,i)];
  function lossBox(R,v,a,e){const P=R.P,bad=Number.isNaN(v);if(v===undefined){R.box([LX,0,0],[.7,.5,.7],{fill:P.paper,a:a*.5});R.label([LX,.5,0],'loss',{mono:true,fs:12.5,dy:-12,a:a*.6});return}
    R.box([LX,0,0],[.7,.5,.7],{fill:bad?mix(P.paper,P.bad,.75*e):P.paper,a});if(bad)R.glow([LX,.55,0],.45,{c:P.bad,a:a*e*.8});R.label([LX,.5,0],'loss = '+(bad?'NaN':FP.show(v,4)),{mono:true,fs:12.5,b:1,c:bad?P.bad:P.ink,dy:-12,a})}
  function draw(R,k,e){const P=R.P,s=NS[k],[X,M2,M3]=s.m.map(q=>q[1]),[,n2,n3]=s.m.map(q=>q[0]);R.grid(-5,5,-2.4,2.4,.5);
    const cX=P.c1,cW=k===2?P.c4:P.c6,cY=k===2?P.c4:P.c3;
    // composition: the plate each step is about at full strength, the rest receding
    const aX=k===1?.3:1,aW=k===1?.3:1,aY=1;
    plate(R,0,X,'X · tokens × features',cX,aX);
    plate(R,1,M2,k===2?'∂L/∂W = Xᵀ ∂L/∂Y':k===3?'new W':'W',cW,aW);
    plate(R,2,M3,k===2?'∂L/∂Y = 1/9':k===3?'next Y = X · new W':'Y = XW',cY,k===2?.6:aY);
    lossBox(R,k===0?undefined:s.loss,k===2?.4:1,k===1?e:1);
    const f=Math.min(1,e*1.6),ni=1,nk=2; // the NaN sits at token 2 (row 1), feature 3 (column 2)
    if(k===0)for(let j=0;j<3;j++)R.flowArc(top(0,3,ni,nk,X),top(2,3,ni,j,M3),.9+.12*j,{c:P.bad,a:f*.85,r:.06,n:7,speed:1.3});
    if(k===1){for(let i=0;i<3;i++)for(let j=0;j<3;j++){const bad=Number.isNaN(M3[i][j]);R.flowArc(top(2,3,i,j,M3),[LX,.5,0],.45,{c:bad?P.bad:P.c3,a:f*(bad?.9:.45),r:bad?.065:.045,n:bad?6:4,speed:1.2})}}
    if(k===2)for(let j=0;j<3;j++)R.flowArc(top(0,3,ni,nk,X),top(1,4,nk,j,M2),.8+.1*j,{c:P.bad,a:f*.85,r:.06,n:7,speed:1.3});
    if(k===3)for(let i=0;i<3;i++)for(let j=0;j<3;j++)R.flowArc(top(1,4,nk,j,M2),top(2,3,i,j,M3),.6+.08*i,{c:P.bad,a:f*.7,r:.05,n:4,speed:1.2});
  }
  const full={cam:[.16,.72],bounds:[[-4.5,0,-1.3],[4.25,1.3,1.6]]};
  S3.stage({id:'stg-nan',list:'sx-nan',fig:'One NaN through a linear layer and one training step',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1500,hold:5000,draw,
    margin:w=>w<520?[20,8,44,8]:[24,16,56,16]});
})();
