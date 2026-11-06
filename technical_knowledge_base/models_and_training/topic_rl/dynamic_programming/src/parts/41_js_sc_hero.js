// ---- Scene: the hero (renderer v2: few large objects per step, flows where value moves, glass for the model, camera per step).
// Steps 1 to 4: one optimality backup of Class 3 in Silver's student MDP (gamma 1, the optimal values of its successors), the camera close on it;
// the model's P(s' | Pub) is a glass plate, the successors' values stream through it into the Pub, then Study's 10 streams into Class 3.
// Steps 5 to 7: the same backup on every cell of Silver's 4 x 4 shortest-path grid at once, after 1, 3 and 6 synchronous sweeps (the page's engine);
// the cells that just became exact (the front) are fed by streams from their neighbour one move closer to the goal ----
(function(){
  if(!document.getElementById('stg-hero')||!window.DPS)return;const {at,off,lerp,mix}=S3,D=window.DPE,G=window.DPS;
  const w=D.W.silver,F=[D.init(w)];for(let k=0;k<6;k++)F.push(D.sweep(w,F[k],1,'vi',null,false).V);
  const dist=c=>-F[6][c];                             // after 6 sweeps the values are minus the distance to the goal
  const HS=.17,GS=.3;                                  // tree: world height per unit of value; grid: per move still to pay
  const ROOT=[-6.3,0,.1],STU=[-7.5,0,1.5],PUB=[-4.3,0,1.3],SUC=[[-5.5,0,-1.5],[-4.3,0,-1.5],[-3.1,0,-1.5]],SV=[6,8,10],PR=[.2,.4,.4],ZM=-.55;
  const gx=c=>1.6+w.cells[c][0]*1.0,gz=c=>-1.5+w.cells[c][1]*1.0;
  const SHOW=[0,0,0,0,1,3,6];                          // which sweep the grid shows at each step
  // the front at a step: cells exactly SHOW[k] moves from the goal, each with the neighbours one move closer that feed it
  const front=k=>{const d=SHOW[k],out=[];if(!d)return out;for(let c=0;c<w.n;c++){if(w.term[c]||dist(c)!==d)continue;
    const [x,y]=w.cells[c],src=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>w.id[(x+dx)+','+(y+dy)]).filter(s=>s!=null&&dist(s)===d-1);out.push([c,src])}return out};
  function draw(R,k,e){const P=R.P;R.grid(-8.2,6,-2.6,2.8,.5);
    // the backup: full strength for steps 1 to 4, gone once the grid takes over
    const ta=k<4?1:k===4?off(k,e,4):0;
    if(ta>0){const lab=(p,t,o)=>R.label([p[0],0,p[2]+.4],t,Object.assign({fs:13,b:1,dy:13,a:ta},o||{}));
      const stuA=ta*(k===1||k===2?.3:1),sucA=ta*(k===0?.2:k===3?.25:1);
      // Class 3 and its two actions
      R.line([[ROOT[0],.02,ROOT[2]],[STU[0],.02,STU[2]]],{c:k===3?P.acc:P.mute,w:k===3?2.6:1.4,a:ta});
      R.line([[ROOT[0],.02,ROOT[2]],[PUB[0],.02,PUB[2]]],{c:P.mute,w:1.4,a:ta*(k===3?.4:1)});
      R.box(ROOT,[.9,.2,.9],{fill:mix(P.paper,P.acc,k===3?.4:.15),a:ta});lab(ROOT,'Class 3',{fs:13.5});
      R.label([(ROOT[0]+STU[0])/2-.15,0,(ROOT[2]+STU[2])/2],'study',{fs:12,mono:1,c:P.mute,al:'right',dx:-6,a:ta});
      R.label([(ROOT[0]+PUB[0])/2,0,(ROOT[2]+PUB[2])/2-.1],'pub',{fs:12,mono:1,c:P.mute,dy:-8,a:ta});
      const rv=k===3?e:0;if(k===3){R.box([ROOT[0],.2,ROOT[2]],[.46,10*HS*rv,.46],{fill:P.acc,a:ta});
        R.label([ROOT[0],.2+10*HS*rv,ROOT[2]],'max(10, 9.4) = 10',{fs:13,b:1,c:P.acc,dy:-12,a:ta*rv});
        // the backup pulls the better action's value into Class 3; the Pub's 9.4 streams faintly, it loses
        R.flowArc([STU[0],10*HS+.05,STU[2]],[ROOT[0],.25+10*HS*rv,ROOT[2]],.6,{c:P.acc,a:ta,r:.085,n:9,speed:1.3});
        R.flowArc([PUB[0],9.4*HS+.05,PUB[2]],[ROOT[0]+.1,.25,ROOT[2]],.5,{c:P.mute,a:ta*.5,r:.05,n:4,speed:1})}
      // Study: +10 and the episode ends
      R.box(STU,[.7,10*HS,.7],{fill:k===3?mix(P.paper,P.acc,.6):mix(P.paper,P.c3,.5),a:stuA});lab(STU,'Study',{a:Math.max(.45,stuA)});
      R.label([STU[0],10*HS,STU[2]],'+10, ends',{fs:12.5,b:1,c:k===3?P.acc:P.ink,dy:-11,a:Math.max(.45,stuA)});
      // the model: P(s' | Pub) as a glass plate standing between the Pub and the cells chance sends you to
      const ma=ta*(k===0?.25:k===3?.25:1);
      R.glass([SUC[0][0]-.6,.08,ZM],[SUC[2][0]-SUC[0][0]+1.2,0,0],[0,.62,0],{c:P.c4,a:ma,nu:3,nv:1});
      PR.forEach((p,i)=>R.label([SUC[i][0],.7,ZM],'p '+p,{fs:12.5,b:1,mono:1,c:P.c4,a:ma,dy:-2}));
      R.label([SUC[2][0]+.6,.62,ZM],'model P(s′ | Pub)',{fs:12.5,b:1,al:'left',dx:6,c:P.c4,a:ma,wide:1});
      // the successors: their optimal values rise at step 2
      const a1=k===0?0:k===1?e:1;
      SUC.forEach((p,i)=>{R.box(p,[.62,Math.max(.03,SV[i]*HS*a1),.62],{fill:mix(P.paper,P.c1,.35+.08*i),a:sucA});
        R.label([p[0],0,p[2]-.3],'Class '+(i+1),{fs:12.5,dy:-4,a:Math.max(.3,sucA)});
        if(a1>0)R.label([p[0],SV[i]*HS*a1,p[2]],String(SV[i]),{fs:13,b:1,mono:1,dy:-11,a:sucA*a1});
        // value moves into the Pub, through the model, in proportion to the probability
        if(k===1||k===2)R.flowArc([p[0],SV[i]*HS*a1+.05,p[2]],[PUB[0]+(i-1)*.12,9.4*HS+.1,PUB[2]],.5,{c:P.c1,a:(k===1?e:1),r:.05+.08*PR[i],n:Math.round(3+PR[i]*14),speed:1.2})});
      // the Pub: +1, then its value stacked piece by piece (0.2 x 6, 0.4 x 8, 0.4 x 10) at step 3
      const seg=[[1,P.c3],[PR[0]*SV[0],P.c1],[PR[1]*SV[1],P.c1],[PR[2]*SV[2],P.c1]];let y=0;
      seg.forEach(([v,c],i)=>{const h=v*HS*(k>=2?(k===2?Math.min(1,Math.max(0,e*4-(i-1))):1):(i===0?1:0));
        if(h>.005)R.box([PUB[0],y,PUB[2]],[.7,h,.7],{fill:mix(P.paper,c,i===0?.5:.3+.12*i),a:ta*(k===3?.5:1)});y+=h});
      lab(PUB,'Pub');
      R.label([PUB[0],y,PUB[2]],k<2?'+1, then chance':'9.4',{fs:13,b:1,dy:-11,a:ta*(k===3?.6:1),c:k===2?P.c1:P.ink});
      if(k===2)R.label([PUB[0],0,PUB[2]+.4],'1 + 0.2×6 + 0.4×8 + 0.4×10 = 9.4',{fs:12.5,b:1,mono:1,dy:32,c:P.c1,a:e,wide:1})}
    if(k<4)return;
    // the grid: every cell backed up at once; bar height is -V, the moves still to pay
    const ga=k===4?at(k,e,4):1,cur=F[SHOW[k]],prev=F[SHOW[k-1]],fr=front(k),fc=fr.map(x=>x[0]);
    for(let c=0;c<w.n;c++){const X=gx(c),Z=gz(c);
      if(w.term[c]){G.bar(R,X,Z,.03,{fill:mix(P.paper,P.c3,.6),a:ga});R.label([X,.05,Z],'goal',{fs:12.5,b:1,a:ga});continue}
      const v=lerp(-prev[c],-cur[c],e),h=v*GS,on=fc.indexOf(c)>=0;
      G.bar(R,X,Z,h,{fill:on?mix(P.paper,P.c2,.3+.4*e):G.tint(P,P.c1,v/6),a:ga});
      R.label([X,Math.max(.03,h),Z],String(-Math.round(v)).replace('-','−'),{fs:12.5,mono:1,dy:-9,a:ga,b:on})}
    // the front: value streams in from the neighbour one move closer to the goal
    fr.forEach(([c,src])=>src.forEach(s=>R.flowArc([gx(s),w.term[s]?.06:-cur[s]*GS+.05,gz(s)],[gx(c),-cur[c]*GS*e+.06,gz(c)],.45,{c:P.c2,a:ga*e,r:.07,n:6,speed:1.1})));
    R.label([gx(15)+.55,0,gz(15)+.3],'after '+SHOW[k]+' sweep'+(SHOW[k]>1?'s':''),{fs:13.5,b:1,al:'left',dx:6,dy:8,a:ga})}
  const BT=[[-8.2,0,-1.9],[-2.2,1.9,2.1]],BG=[[1,0,-2],[5.3,1.9,2]];
  const st=S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one backup, then the same backup on every cell',cam:[.22,.7],aspect:.62,
    bounds:[[-8,0,-2.1],[5.3,1.9,2.6]],draw,dur:1400,hold:4600,
    // the camera: close on the backup for steps 1 to 4, then glides to the grid
    view:k=>k<4?{cam:[.24,.68],bounds:BT}:{cam:[.32,.78],bounds:BG}});
  // size the card now, so the first ResizeObserver notification finds its final height
  if(st)st.draw();
})();
