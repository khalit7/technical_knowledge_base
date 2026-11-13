// ---- Scene, Fig. 4: the row softmax on its way down the nvcc road, each form a glass plate lit with what its compiler decided.
// Real numbers only: the 32-line source (CSD.src_softmax), the PTX's 245 lines and its four .reg declarations (CSD.ptx_softmax, CSD.ptx_regs),
// ptxas -O0 to -O3 on sm_90a (CSD.ptxas_levels: [level, registers, instruction slots]), the four targets' slots (CSD.sass_check) and
// registers (CSD.sass_regs), and the argument offsets read from the cubins (checked by check/check_embed.py). One cube is one register.
// Steps are explained by #sx-down on the left. ----
(function(){
  if(!document.getElementById('stg-down'))return;const {at,off,lerp,mix}=S3,D=window.CSD;
  const LV={};D.ptxas_levels.forEach(r=>LV[r[0]]=r);
  const TG=[['sm_80',-3.15,'0x170'],['sm_90a',-1.05,'0x220'],['sm_100a',1.05,'0x390'],['sm_120',3.15,'0x390']];
  const slots=t=>D.sass_check['softmax.'+t][0],regs=t=>D.sass_regs[t];
  const TY=[['%p','pred','c5'],['%f','f32','c3'],['%r','b32','c1'],['%rd','b64','c6']];
  const srcLines=D.src_softmax.replace(/\n$/,'').split('\n').length,ptxLines=D.ptx_softmax.length;
  const nvr=TY.reduce((s,t)=>s+D.ptx_regs[t[1]],0);
  const YS=3.1,YP=2.0,YA=.95,PW=30,PITCH=.12,CUBE=.085;
  const colH=n=>n/LV[0][2]*1.1;   // the instruction column: -O0's 792 slots are 1.1 units tall
  // the 230 virtual registers: one row of up to 30 cubes per line, a block of rows per type
  const VR=(()=>{const out=[];let row=0;TY.forEach(([nm,k,c],ti)=>{const n=D.ptx_regs[k],r0=row;for(let i=0;i<n;i++){out.push({x:-1.74+(i%PW)*PITCH,z:-.62+(row+Math.floor(i/PW))*PITCH,c,ti})}
    row+=Math.ceil(n/PW);TY[ti].push((r0+row-1)/2)});return out})();
  function regCubes(R,cx,n,col,a,fadeFrom,fa){for(let i=0;i<n;i++){const x=cx-.75+(i%6)*PITCH,z=-.42+Math.floor(i/6)*PITCH;
    R.box([x,.02,z],[CUBE,CUBE,CUBE],{fill:col,a:i>=fadeFrom?a*fa:a,shadow:false,lw:.6})}}
  function draw(R,k,e){const P=R.P,W=R.W,H=R.H;R.grid(-5,5,-1.6,1.6,.5);
    const lab=(p,t,o)=>{const q=R.p(p);if(q[0]<6||q[0]>W-6||q[1]<6||q[1]>H-6)return;R.label(p,t,o)};
    const dim=.22;
    // 1. the source plate, one grid line per source line
    const aS=k===0?1:dim+.1;
    R.glass([-1.6,YS,-.7],[3.2,0,0],[0,0,1.4],{c:P.c3,a:aS,nu:1,nv:srcLines,th:.03});
    if(k===0)lab([1.6,YS,.7],'softmax.cu · '+srcLines+' lines',{mono:true,fs:12.5,b:1,al:'left',dx:8,c:P.c3,a:k===0?1:.75});
    // 2. the PTX plate and its virtual registers, by type
    const aP=k===0?.14:k===1?Math.max(.14,e):k<=3?.75:dim+.08;
    R.glass([-2.0,YP,-.8],[4.0,0,0],[0,0,1.6],{c:P.c4,a:aP,nu:8,nv:4,th:.03});
    if(k>=1){const show=k===1?e:1;VR.forEach((v,i)=>{const t=Math.min(1,Math.max(0,show*1.25-i/VR.length*.25));if(t<=.01)return;
        R.box([v.x,YP+.03,v.z],[CUBE,CUBE,CUBE],{fill:P[v.c],a:(k===1?t:k<=3?.85:.3),shadow:false,lw:.5})});
      if(k===1)TY.forEach(([nm,kk,c,rm])=>lab([-2.0,YP,-.62+rm*PITCH],nm+' · '+D.ptx_regs[kk],{mono:true,fs:12,al:'right',dx:-6,c:P[c],grp:'ty',a:e}));
      if(k===1)lab([0,YP,.8],'PTX · '+ptxLines+' lines · '+nvr+' virtual registers',{mono:true,fs:12.5,b:1,dy:16,c:P.c4,a:e})}
    if(k===1)R.flowArc([0,YS,0],[0,YP+.15,0],.25,{c:P.c3,r:.07,a:e,n:8});
    // 3. ptxas, between the PTX and the machine code
    const XA=.9,aA=k>=2?1:.14;R.box([XA,YA,0],[1.0,.36,.6],{fill:mix(P.paper,P.c2,.18),a:aA});
    if(k>=2&&k<=3)lab([XA+.5,YA+.36,0],'ptxas -O'+(k===2?'0':'3'),{mono:true,fs:12.5,b:1,al:'left',dx:8,a:1});
    if(k===4)lab([XA+.5,YA+.36,0],'ptxas, once per target',{mono:true,fs:12.5,b:1,al:'left',dx:8});
    if(k>=2){R.flowArc([.4,YP,0],[XA,YA+.36,0],.12,{c:P.c4,r:.06,a:k===4?.5:1,n:5})}
    // 4. the SASS plates: registers as cubes, instruction slots as a column
    TG.forEach(([t,x,off0],j)=>{const main=t==='sm_90a',on=k===4||(main&&k>=2),a=on?1:k>=2?.14:.1;
      R.glass([x-.95,.02,-.7],[1.9,0,0],[0,0,1.4],{c:P.c2,a:a*.9,nu:4,nv:3,th:.03});
      if(!on&&!(main&&k>=2))return;
      let n,nr,fade=99,fa=1;
      if(main&&k===2){n=LV[0][2];nr=LV[0][1]}
      else if(main&&k===3){n=lerp(LV[0][2],LV[3][2],e);nr=LV[0][1];fade=LV[3][1];fa=1-e}
      else{n=slots(t);nr=regs(t)}
      const cA=k===4&&!main?e:1;
      regCubes(R,x,nr,P.c2,cA,fade,fa);
      R.box([x+.55,.02,0],[.34,colH(n),.34],{fill:mix(P.paper,P.c2,.55),a:cA});
      if(k<4){lab([x+.72,.02+colH(n),0],Math.round(n)+' slots',{mono:true,fs:12,al:k===2?'center':'left',dx:k===2?0:6,dy:k===2?-10:0,a:cA,c:P.ink});   // step 3: above the tall bar, clear of ptxas beside it
        lab([x,.02,.7],t+' · '+(k===3?Math.round(lerp(LV[0][1],LV[3][1],e)):nr)+' regs',{mono:true,fs:12.5,b:1,dy:12,c:P.c2})}
      else{lab([x,.02,.7],t,{mono:true,fs:12.5,b:1,dy:12,c:P.c2,a:cA});lab([x,.02,.7],nr+' regs · '+n+' slots',{mono:true,fs:12,dy:28,c:P.ink,a:cA,wide:1});
        lab([x,.02,.7],'ncols: c[0x0]['+off0+']',{mono:true,fs:12,dy:44,c:P.mute,a:e,wide:1})}
      // the code flows from ptxas into this target's plate
      if(on)R.flowArc([XA,YA,0],[x,.12,0],.2,{c:P.c2,r:.06,a:(k===4?e:1)*.9,n:main?7:5})});
  }
  const full={cam:[.18,.5],bounds:[[-4.4,0,-1],[4.4,3.3,1]]};
  const st=S3.stage({id:'stg-down',list:'sx-down',fig:'Fig. 4 · the row softmax on its way down',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,10,14,10]:[20,16,20,16],
    // step 1 frames the source, step 2 looks down on the PTX's registers, steps 3 and 4 follow the code to sm_90a, step 5 the four targets
    view:k=>k===0?{cam:[.18,.6],bounds:[[-2.4,2.2,-1],[3.8,3.3,1]]}:k===1?{cam:[.1,.95],bounds:[[-3.2,1.9,-1],[4.6,3.1,1]]}:k<=3?{cam:[.2,.5],bounds:[[-3.0,0,-1],[3.4,3.45,1]]}:{cam:[.12,.75],bounds:[[-4.3,0,-1],[4.3,1.4,1.2]]}});
  (window.CSSTG=window.CSSTG||{})['stg-down']=st;
})();
