// ---- Scene: std::vector<int> growing (section 4; renderer v2): each new buffer a new block, the elements flowing across, the old block freed ----
// Sizes and capacities are vector_growth.cpp's recorded output (CT_DATA.growth, libc++); the vector object's size is sizeof (CT_DATA.sizes).
// Where each buffer sits is illustrative: each new buffer is drawn nearer the viewer, wrapped at 8 elements per row, so the moves are visible.
(function(){
  if(!document.getElementById('stg-vec')||!window.CT_DATA)return;const {lerp,mix,cl}=S3;
  const G=CT_DATA.growth.filter(p=>p[0]>0).slice(0,6);   // (size at which a new buffer was allocated, its capacity): 1/1, 2/2, 3/4, 5/8, 9/16, 17/32
  const VB=(CT_DATA.sizes.find(r=>r[0]==='std::vector<int>')||[0,24])[1];
  const NB=G.length,W=8,CW=.44,X0=-1.76,P_AT=3,NRES=G[NB-1][0];   // p = &v[0] is taken at step 4, in the capacity-4 buffer
  // z of each buffer's first row, back to front, then the reserve buffer in the same place as the last one
  const rows=c=>Math.ceil(c/W),Z0=[];{let z=-3.4;G.forEach(g=>{Z0.push(z);z+=rows(g[1])*CW+.55})}
  const at=(j,i)=>[X0+((i%W)+.5)*CW,0,Z0[j]+(Math.floor(i/W)+.5)*CW];
  const VX=-3.9,VZ=-.4;
  function cells(R,j,cap,a,faint){const P=R.P;for(let i=0;i<cap;i++)R.box(at(j,i),[CW*.94,.08,CW*.94],{fill:mix(P.paper,P.line,.5),a,shadow:false,lw:.6,ea:faint?.35:.78})}
  function elem(R,p,v,a,col,lab){const P=R.P;if(a<=.01)return;R.box([p[0],.08,p[2]],[CW*.66,.24,CW*.66],{fill:mix(P.paper,col||P.c1,.6),a,shadow:false,lw:.6});
    if(lab)R.label([p[0],.32,p[2]],String(v),{mono:true,fs:12,dy:-7,a,wide:1})}
  function draw(R,k,e){const P=R.P;R.grid(-5.2,3.6,-3.9,3.9,.5);
    const res=k===7,fade=res?cl(1-2*e,0,1):1,resA=res?cl(2*e-1,0,1):0;
    R.box([VX,0,VZ],[.95,.36,.7],{fill:mix(P.paper,P.acc,.35)});R.label([VX,.38,VZ],'v · '+VB+' B',{mono:true,fs:12.5,b:1,dy:-9});
    const sizeLab=(t,a)=>R.label([VX,0,VZ+.35],t,{mono:true,fs:12.5,dy:18,c:P.acc,b:1,a});
    // buffers: ghosts of those to come (step 1), the live one, the one just freed (labelled), older freed ones faint
    for(let j=0;j<NB;j++){const cap=G[j][1],born=j+1;let a;
      if(k<born)a=.28*fade;else if(k===born)a=fade*(.28+.72*cl(e*2.2,0,1));else a=fade*(k-1>j?.2:1);
      if(a<=.01)continue;cells(R,j,cap,a,k>born&&k-1>j);
      const end=at(j,Math.min(cap,W)-1),lab=k<born?null:k-1===j?'capacity '+cap:k-2===j?'freed · capacity '+cap:null;
      if(lab)R.label([end[0]+CW/2,.08,end[2]],lab,{al:'left',dx:8,fs:12.5,b:k-1===j,c:k-1===j?P.ink:P.mute,a:Math.max(a,.5*fade),wide:k-1!==j})}
    // elements: at step k (1..6) the previous buffer fills to capacity, everything flows into buffer k-1, then the new element lands
    if(k>=1&&k<=6){const j=k-1,size=G[j][0],prev=j>0?G[j-1][0]:0,cap0=j>0?G[j-1][1]:0,lab=G[j][1]<=8;
      const fillT=cl(e*3,0,1),moveT=cl(e*1.8-.6,0,1);
      if(j>0){for(let i=0;i<cap0;i++){if(i>=prev&&fillT<(i-prev+1)/(cap0-prev+.001))continue;elem(R,at(j-1,i),i,fade*(1-moveT*.85),P.c1,cap0<=8&&moveT<.5)}
        if(moveT>0&&moveT<1)for(let i=0;i<cap0;i++){const a0=at(j-1,i),b0=at(j,i);R.flowArc([a0[0],.32,a0[2]],[b0[0],.32,b0[2]],.45,{c:P.c1,a:fade*Math.sin(Math.PI*moveT),r:.05,n:3,speed:1.3})}}
      for(let i=0;i<size;i++){const isNew=i===size-1,a=isNew?cl(e*1.6-.6,0,1):(j===0?1:cl(moveT*1.2,0,1));elem(R,at(j,i),i,fade*a,isNew?P.c2:P.c1,lab)}}
    // the vector points at its live buffer
    if(k>=1&&!res){const j=k-1,t=at(j,0);R.flowArc([VX+.48,.3,VZ],[t[0]-CW/2,.2,t[2]],.5,{c:P.acc,r:.06,n:6,speed:1.2});sizeLab('size '+G[j][0]+' · capacity '+G[j][1],1)}
    else if(k===0)sizeLab('size 0 · capacity 0',1);
    // int* p = &v[0], taken while the capacity is 4; from the next buffer on it points at freed memory
    if(k>=P_AT&&!res){const dang=k>P_AT,a=k===P_AT?cl(e*1.5-.3,0,1):1,t=at(P_AT-1,0),tgt=[t[0],.3,t[2]],src=[X0+W*CW+.5,.95,t[2]-.35];
      R.line([src,tgt],{c:dang?P.bad:P.c5,w:2.2,head:8,a,top:1});R.label(src,dang?'p dangles':'p = &v[0]',{mono:true,fs:12.5,b:1,dy:-8,al:'left',c:dang?P.bad:P.c5,a})}
    // reserve(17): one buffer, filled in place
    if(res){const j=NB-1;for(let i=0;i<NRES;i++)R.box(at(j,i),[CW*.94,.08,CW*.94],{fill:mix(P.paper,P.line,.5),a:resA,shadow:false,lw:.6});
      for(let i=0;i<NRES;i++)elem(R,at(j,i),i,resA*cl(e*2.2-1.1-i*.03,0,1),P.c1,false);
      const t=at(j,0),end=at(j,W-1);R.flowArc([VX+.48,.3,VZ],[t[0]-CW/2,.2,t[2]],.5,{c:P.acc,a:resA,r:.06,n:6,speed:1.2});
      R.label([end[0]+CW/2,.08,end[2]],'reserve('+NRES+'): one buffer',{al:'left',dx:8,fs:12.5,b:1,c:P.acc,a:resA});
      R.label([end[0]+CW/2,.08,end[2]+CW],'nothing moved',{al:'left',dx:8,fs:12.5,c:P.acc,a:resA});sizeLab('size '+NRES,resA)}
  }
  const full={cam:[.42,.78],bounds:[[-4.5,0,-3.6],[3.2,.6,3.9]]};
  S3.stage({id:'stg-vec',list:'sx-vec',fig:'std::vector<int>: size against capacity',cam:full.cam,bounds:full.bounds,aspect:.72,dur:1700,hold:4600,draw,
    view:k=>k<=3?{cam:[.42,.72],bounds:[[-5.1,0,-3.7],[2.2,.6,-.6]]}:full,
    margin:w=>w<520?[20,10,24,10]:[24,96,24,14]});
})();
