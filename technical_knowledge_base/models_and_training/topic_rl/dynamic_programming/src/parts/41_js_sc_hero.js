// ---- Scene: the hero. Left, one optimality backup of Class 3 in Silver's student MDP (gamma 1, the optimal values of its successors);
// right, the same backup applied to every cell of Silver's 4 x 4 shortest-path grid at once, after 1, 3 and 6 synchronous sweeps (the page's engine) ----
(function(){
  if(!document.getElementById('stg-hero')||!window.DPS)return;const {at,lerp,mix}=S3,D=window.DPE,G=window.DPS;
  const w=D.W.silver,F=[D.init(w)];for(let k=0;k<6;k++)F.push(D.sweep(w,F[k],1,'vi',null,false).V);
  const HS=.15,GS=.27;                                // tree: world height per unit of value; grid: per move still to pay
  const ROOT=[-6.7,0,-1.7],STU=[-4.8,0,.1],PUB=[-3.5,0,0],SUC=[[-2.5,0,1.5],[-1.4,0,1.5],[-.3,0,1.5]],SV=[6,8,10],PR=[.2,.4,.4];
  const gx=c=>1.3+w.cells[c][0]*.95,gz=c=>-1.45+w.cells[c][1]*.95;
  const SHOW=[0,0,0,0,1,3,6];                          // which sweep the grid shows at each step
  function draw(R,k,e){const P=R.P,ph=R.W<520;R.grid(-7.4,5,-2.4,2.4,.5);
    const ta=ph?(k<4?1:0):k<4?1:k===4?lerp(1,.16,e):.16;           // the tree fades once the grid takes over
    const base=(p,t,o)=>R.label([p[0],0,p[2]+.32],t,Object.assign({fs:12.5,b:1,dy:13,a:ta},o||{}));
    // the tree: Class 3 at the back, its two actions in the middle, the Pub's three successors at the front
    R.line([[ROOT[0],.02,ROOT[2]],[STU[0],.02,STU[2]]],{c:k>=3?P.acc:P.mute,w:k>=3?2.6:1.4,a:ta});
    R.line([[ROOT[0],.02,ROOT[2]],[PUB[0],.02,PUB[2]]],{c:P.mute,w:1.4,a:ta});
    R.box(ROOT,[1,.22,.8],{fill:mix(P.paper,P.acc,k>=3?.45:.15),a:ta});base([ROOT[0],0,ROOT[2]+.1],'Class 3',{fs:13});
    const rv=at(k,e,3);if(rv>0){R.box([ROOT[0],.22,ROOT[2]],[.5,10*HS*rv,.5],{fill:P.acc,a:ta});
      R.label([ROOT[0],.22+10*HS*rv,ROOT[2]],k===3&&!ph?'max(10, 9.4) = 10':'V = 10',{fs:12.5,b:1,c:P.acc,dy:-11,a:ta*rv});
      if(k===3)R.arc([STU[0],10*HS,STU[2]],[ROOT[0]-.25,.22+10*HS*rv,ROOT[2]],.5,{c:P.acc,w:2,t:e,head:6,top:1})}
    // Study: +10 and the episode ends
    R.box(STU,[.62,10*HS,.62],{fill:k>=3?P.acc:mix(P.paper,P.c3,.5),a:ta});base(STU,'Study');
    R.label([STU[0],10*HS,STU[2]],ph?'+10':'+10, ends',{fs:12.5,b:k>=3,c:k>=3?P.acc:P.ink,dy:-11,a:ta});
    // Pub: +1, then chance to Class 1, 2 or 3; its value is built as a stack at step 3
    const a1=at(k,e,1),a2=at(k,e,2);
    SUC.forEach((p,i)=>{R.box(p,[.56,SV[i]*HS*Math.max(a1,.02),.56],{fill:mix(P.paper,P.c1,.35+.05*i),a:ta*(k>=1?1:.25)});
      R.label([p[0],SV[i]*HS*a1,p[2]],(ph?'C'+(i+1)+' ':'Class '+(i+1)+': ')+SV[i],{fs:12,dy:-11,a:ta*a1});
      base(p,'p '+PR[i],{fs:12,b:0,mono:1,c:P.mute,a:ta*a1});
      if(k>=1)R.arc([PUB[0],.1,PUB[2]+.3],[p[0],SV[i]*HS+.05,p[2]],.5,{c:P.mute,w:1.3,a:ta*.8,t:k===1?e:1})});
    // the stack: reward 1, then 0.2 x 6, 0.4 x 8, 0.4 x 10
    const seg=[[1,P.c3],[PR[0]*SV[0],P.c1],[PR[1]*SV[1],P.c1],[PR[2]*SV[2],P.c1]];let y=0;
    seg.forEach(([v,c],i)=>{const h=v*HS*(k>=2?Math.min(1,Math.max(0,a2*4-(i-1))):(i===0?1:0));
      if(h>.005)R.box([PUB[0],y,PUB[2]],[.62,h,.62],{fill:mix(P.paper,c,i===0?.5:.3+.12*i),a:ta});y+=h});
    base(PUB,'Pub');
    R.label([PUB[0],y,PUB[2]],k<2?'+1':'9.4',{fs:12.5,b:1,dy:-11,a:ta,c:k>=3?P.mute:P.ink});
    // the grid: faint until step 4, then the values after 1, 3 and 6 sweeps (bar height = -V, the moves still to pay)
    if(ph&&k<4)return;                                  // a phone frames only the backup until step 5
    const ga=k<4?.3:k===4?lerp(.3,1,e):1,cur=F[SHOW[k]],prev=F[SHOW[Math.max(0,k-1)]];
    for(let c=0;c<w.n;c++){const X=gx(c),Z=gz(c);
      if(w.term[c]){G.bar(R,X,Z,.03,{fill:mix(P.paper,P.c3,.6),a:Math.max(ga,.5)});R.label([X,.05,Z],'goal',{fs:12,b:1,dy:0,a:Math.max(ga,.6)});continue}
      const v=k>=4?lerp(-prev[c],-cur[c],e):0,h=v*GS;
      G.bar(R,X,Z,h,{fill:G.tint(P,P.c1,v/6),a:ga});
      if(k>=4)R.label([X,h,Z],String(-Math.round(v)).replace('-','−'),{fs:12,mono:1,dy:-9,a:ga,wide:1})}
    R.label([gx(15)+.5,0,gz(15)+.2],k>=4?'after '+SHOW[k]+' sweep'+(SHOW[k]>1?'s':''):'every cell, at once',{fs:12.5,b:1,al:'left',dx:6,dy:8,c:k>=4?P.ink:P.mute})}
  const st=S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one backup, then the same backup on every cell',cam:[.22,.74],aspect:.52,
    // on a phone the camera frames the half in use: the backup for steps 1 to 4, the grid after
    bounds:st=>{const h=document.getElementById('stg-hero');return h&&h.clientWidth<520?(st.k<4?[[-7.3,0,-2.1],[.3,1.9,2]]:[[.8,0,-1.9],[4.9,1.7,1.9]]):[[-7.3,0,-2.1],[4.9,1.9,2.1]]},draw,dur:1300,hold:4400});
  // size the card now, so the first ResizeObserver notification finds its final height
  if(st)st.draw();
})();
