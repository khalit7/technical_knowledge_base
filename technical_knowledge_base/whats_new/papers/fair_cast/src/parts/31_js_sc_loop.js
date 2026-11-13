// ---- Scene: Fig. 1, the RL loop of the paper's Figure 2 (renderer v2: glass plates for the two weight copies, flowing dots on every path data takes) ----
// Round-to-nearest (today) against Fair Cast. Measured values only from the page: 0.4 to 0.5% of served weights change per step under
// round-to-nearest, 2 to 15% under Fair Cast (§3, §9); mean per-token |log ratio| visible about 0.01, hidden 0.10 to 0.16 on MATH and
// about 0.45 on knights-and-knaves, Fair Cast about 0.01 (§4, Figure 4c; Qwen3-1.7B, eta = 1e-6). Stream densities are schematic.
(function(){
  if(!document.getElementById('stg-loop'))return;const {mix}=S3;
  let M='rtn';
  // stations: back row master, export, served copy; front row trainer and sampler; the update returns along the left edge (clockwise seen from above)
  const XB=-3.4,XC=3.4,ZB=-1.7,ZF=1.7,PW=1.6,PH=1.35;
  const MAS=[XB,0,ZB],EXP=[0,0,ZB],CPY=[XC,0,ZB],SMP=[XC,0,ZF],TRN=[0,0,ZF];
  const RB=[-1.5,0,.35],RV=[1.5,0,.35]; // the two ratio plinths in the middle: hidden (left, master against copy), visible (right, trainer against sampler)
  const LS=2.6; // bar height per unit of |log ratio|
  function plate(R,c,col,a,lab,la){R.glass([c[0]-PW/2,.08,c[2]],[PW,0,0],[0,PH,0],{c:col,a,nu:8,nv:7});
    R.box([c[0],0,c[2]+.02],[PW+.14,.08,.34],{a,shadow:true});
    if(la)R.label([c[0],PH+.12,c[2]],lab,{fs:13,b:1,c:col,a:Math.max(.4,a),dy:-10})}
  function draw(R,k,e){const P=R.P,fc=M==='fc',rc=fc?P.c1:P.c2;
    R.grid(-5.2,5.2,-3,3.2,.5);
    // the fp32 master and the bf16 served copy, both weight matrices: glass plates
    plate(R,MAS,P.ink,k===0||k===4?1:.45,'fp32 master θ',1);
    plate(R,CPY,rc,k>=1&&k<=2||k===4?1:.45,'served copy q (bf16)',k>=1);
    // the export (the box Fair Cast changes) and the trainer's forward pass (the other one)
    R.box(EXP,[1.5,.5,.8],{fill:mix(P.paper,rc,k===1?.5:.25),a:k===1?1:.55});
    if(k>=1)R.label([EXP[0],.5,EXP[2]],fc?'export: stochastic rounding':'export: round to nearest',{fs:12.5,b:1,c:rc,dy:-14,a:k===1?1:.6});
    R.box(TRN,[1.6,.5,.85],{fill:fc?mix(P.paper,P.c1,k===3?.5:.25):P.paper,a:k===3||k===4?1:k<2?.15:.55});
    if(k>=2)R.label([TRN[0],0,TRN[2]+.43],fc?'trainer: forward on q, gradient to θ':'trainer: forward on bf16 of θ',{fs:12.5,b:1,c:fc?P.c1:P.ink,dy:15,a:k===3||k===4?1:.6});
    // the sampler: a group of 8 rollouts drawn from q
    for(let i=0;i<8;i++)R.box([SMP[0]-.7+i*.2,0,SMP[2]],[.14,.3+.4*((i*37)%11)/10,.7],{fill:mix(P.paper,rc,.18),a:k===2||k===3?1:k<2?.15:.45,lw:.6,shadow:i===0});
    if(k>=2)R.label([SMP[0],0,SMP[2]+.36],'rollouts sampled from q',{fs:12.5,b:1,dy:15,a:k===2||k===3?1:.6});
    // flows: the path data takes in each step; the export stream is thin under round-to-nearest (0.4 to 0.5% of weights change), dense under Fair Cast
    const ex=fc?{n:16,r:.08}:{n:2,r:.05};
    if(k>=1){const a=k===1?Math.min(1,e*1.6):.35;R.flow([[MAS[0]+PW/2+.05,.45,ZB],[EXP[0]-.75,.28,ZB]],{c:P.ink,a,n:7,r:.065,speed:1.2});
      R.flow([[EXP[0]+.75,.28,ZB],[CPY[0]-PW/2-.05,.45,ZB]],Object.assign({c:rc,a,speed:1.2},ex))}
    if(k===1)R.label([1.2,0,ZB+.4],fc?'2 to 15% of weights change per step':'0.4 to 0.5% of weights change per step',{fs:12.5,b:1,c:rc,a:e,dy:16});
    if(k>=2){const a=k===2?Math.min(1,e*1.6):.35;R.flow([[CPY[0],.3,ZB+.3],[SMP[0],.3,ZF-.4]],{c:rc,a,n:9,r:.07,speed:1.2})}
    if(k>=3){const a=k===3?Math.min(1,e*1.6):.35;R.flow([ [SMP[0]-.85,.3,ZF],[TRN[0]+.85,.3,ZF]],{c:P.c5,a,n:8,r:.07,speed:1.2});
      // what the trainer reads: under Fair Cast the exact served copy (a stream from q); today a bf16 cast of theta (a dashed link from the master)
      if(fc)R.flowArc([CPY[0]-.5,1,ZB],[TRN[0]+.4,.5,ZF],.8,{c:P.c1,a:a*.9,n:12,r:.06,speed:1.3});
      else R.arc([MAS[0]+.5,1,ZB],[TRN[0]-.4,.5,ZF],.6,{c:P.mute,w:1.5,dash:[5,4],a:k===3?e:.35})}
    if(k>=4){const a=Math.min(1,e*1.6);R.flow([[TRN[0]-.85,.3,ZF],[XB,.3,ZF],[XB,.3,ZB+.35]],{c:P.ink,a,n:12,r:.07,speed:1.3});
      R.label([XB,.3,ZF],'update lands on θ',{fs:12.5,b:1,c:P.ink,a,dy:16,wide:1})}
    // the two ratios, as bars on white plinths: mean per-token |log rho| (Figure 4c)
    if(k>=3){const av=S3.at(k,e,3);R.box([RV[0],0,RV[2]],[1.4,.12,.6],{a:av});R.box([RV[0],.12,RV[2]],[.36,.01*LS+.03,.32],{fill:P.good,a:av});
      R.label([RV[0],0,RV[2]+.3],'visible ratio ≈ 0.01',{fs:12.5,b:1,c:P.good,dy:15,a:av});
      R.line([[RV[0]+.4,.13,RV[2]-.3],[CPY[0]-.4,.13,ZB+.4]],{c:P.good,w:1.4,dash:[5,4],a:av*.7});R.line([[RV[0]+.4,.13,RV[2]+.3],[TRN[0]+.7,.13,ZF-.45]],{c:P.good,w:1.4,dash:[5,4],a:av*.7})}
    if(k>=4){const ah=S3.at(k,e,4),red=fc?P.good:P.bad;R.box([RB[0],0,RB[2]],[1.4,.12,.6],{a:ah});
      R.line([[RB[0]-.4,.13,RB[2]-.3],[MAS[0]+.5,.13,ZB+.4]],{c:red,w:1.4,dash:[5,4],a:ah*.7});R.line([[RB[0]+.4,.13,RB[2]-.3],[CPY[0]-.5,.13,ZB+.4]],{c:red,w:1.4,dash:[5,4],a:ah*.7});
      if(fc){R.box([RB[0],.12,RB[2]],[.36,.01*LS+.03,.32],{fill:P.good,a:ah});R.label([RB[0],0,RB[2]+.3],'hidden ratio ≈ 0.01',{fs:12.5,b:1,c:P.good,dy:15,a:ah})}
      else{[[-.3,.16,'MATH 0.10 to 0.16'],[.3,.45,'knights ≈ 0.45']].forEach(([dx,v,t],i)=>{const h=v*LS*ah;R.box([RB[0]+dx,.12,RB[2]],[.3,Math.max(.02,h),.3],{fill:P.bad,a:ah});
          R.label([RB[0]-.5,.12+h,RB[2]],t,{fs:12,b:1,c:P.bad,al:'right',dx:-4,grp:'hid',a:ah})});
        R.label([RB[0],0,RB[2]+.3],'hidden ratio: never computed',{fs:12.5,b:1,c:P.bad,dy:15,a:ah})}}
  }
  const full={cam:[.16,.6],bounds:[[-4.4,0,-2.1],[4.4,1.5,2.3]]};
  const stg=S3.stage({id:'stg-loop',list:'sx-loop-rtn',fig:'Fig. 1 · the RL loop and its two ratios',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1400,hold:4800,draw,
    margin:w=>w<520?[16,8,22,8]:[24,14,30,14],
    // step 1 moves in close on the master; step 2 along the export path; the others show the whole loop
    view:k=>k===0?{cam:[.35,.5],bounds:[[-4.5,0,-2.4],[-1.6,1.6,-.9]]}:k===1?{cam:[.12,.55],bounds:[[-4.4,0,-2.4],[4.4,1.6,-.6]]}:full});
  const seg=document.getElementById('fcLoopM');
  seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    M=b.dataset.m;['rtn','fc'].forEach(m=>document.getElementById('sx-loop-'+m).hidden=m!==M);stg.list('sx-loop-'+M)}));
  window.FC_LOOP=()=>({M,st:stg.st});
})();
