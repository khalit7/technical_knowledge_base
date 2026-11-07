// ---- Scene, Fig. 2 (section 2): a context switch on Linux v5.10 arm64, what is saved where, one step per stage of __schedule (renderer v2) ----
// Structure from the v5.10 source (core.c context_switch, switch_mm_irqs_off, switch_to; entry.S cpu_switch_to); the cost in step 6 is window.SC_DATA.ctx.pipe (measured).
(function(){
  if(!document.getElementById('stg-sw')||!window.SC_DATA)return;const {at,off,lerp,mix,cl}=S3,D=window.SC_DATA;
  const pv=D.ctx.pipe,mn=Math.min(...pv),mxv=Math.max(...pv),sm=document.getElementById('sc-sw-meas');if(sm)sm.textContent=mn.toFixed(2)+' to '+mxv.toFixed(2);
  const XA=-3.3,XB=3.3,ZU=-1.35,ZK=0,ZS=1.35,BW=2,BD=.95,BH=.36;
  const ROW=[['u','user code and data',ZU],['k','kernel stack (user regs)',ZK],['s','task_struct: saved regs',ZS]];
  // which boxes are lit at each step (thread A or B, row)
  const LIT=[['Au'],['Ak'],['Bs'],[],['As','Bs'],['Bk','Bu']];
  function draw(R,k,e){const P=R.P,CA=P.c1,CB=P.c3;R.grid(-5.5,5.5,-2.6,2.6,.5);
    const own=(x,y,t)=>mix(x,y,cl(t,0,1));
    // the two threads' memory: user code, kernel stack, saved registers
    [['A',XA,CA],['B',XB,CB]].forEach(([nm,x,c])=>{
      R.label([x,0,ZU-BD/2],'thread '+nm,{fs:13.5,b:1,c,dy:-30});
      ROW.forEach(([r,lab,z])=>{const lit=LIT[k].includes(nm+r);
        R.box([x,0,z],[BW,BH,BD],{fill:mix(P.paper,c,lit?.55:.18),a:lit?1:.55,ec:lit?c:undefined,lw:lit?1.6:.9});
        R.label([x+(nm==='A'?-1:1)*BW/2,BH/2,z],lab,{fs:12,c:lit?P.ink:P.mute,b:lit,al:nm==='A'?'right':'left',dx:nm==='A'?-8:8,grp:'rows'})})});
    // the CPU: its registers belong to whoever runs; the MMU above it walks one address space
    const regB=k<4?0:k===4?e:1,mmuB=k<3?0:k===3?e:1;
    const regC=own(CA,CB,regB),mmuC=own(CA,CB,mmuB);
    R.box([0,0,0],[1.9,.55,1.3],{fill:mix(P.paper,regC,.45),ec:regC,lw:1.4});
    R.label([0,.55,.65],'CPU registers: '+(regB>.5?'B':'A'),{fs:12.5,b:1,c:regC,dy:16});
    R.glass([-.95,1.25,-.65],[1.9,0,0],[0,0,1.3],{c:mmuC,a:1,nu:4,nv:3});
    R.label([0,1.25,-.65],'MMU: page tables '+(mmuB>.5?'B':'A'),{fs:12.5,b:1,c:mmuC,dy:-10});
    const cpu=[0,.45,0],box=(x,z)=>[x,BH,z];
    if(k===0){R.flowArc(box(XA,ZU),cpu,.8,{c:CA,r:.07,n:8,speed:1.1,a:e});R.flowArc(cpu,box(XA,ZU),.5,{c:CA,r:.05,n:5,speed:.9,a:e*.6})}
    if(k===1){R.flowArc(cpu,box(XA,ZK),.6,{c:CA,r:.08,n:8,speed:1.2,a:e});R.label(box(XA,ZK),'user registers saved here',{fs:12.5,b:1,c:CA,dy:-26,al:'center',a:e,wide:1})}
    if(k===2){R.glow(box(XB,ZS),.9,{c:CB,a:e});R.flowArc(box(XB,ZS),cpu,1.2,{c:CB,r:.05,n:5,speed:.8,a:e*.5});
      R.label([0,2.5,0],'next = B (least virtual runtime)',{fs:13,b:1,c:CB,a:e})}
    if(k===3){R.glow([0,1.25,0],.8,{c:CB,a:e*.8});R.label([0,1.25,.65],'ASID tag: no TLB flush',{fs:12.5,c:P.mute,dy:18,a:e,wide:1})}
    if(k===4){R.flowArc(cpu,box(XA,ZS),.7,{c:CA,r:.08,n:8,speed:1.2});R.flowArc(box(XB,ZS),cpu,.7,{c:CB,r:.08,n:8,speed:1.2,a:e});
      R.label([0,2.5,0],'cpu_switch_to: x19 to x28, fp, sp, lr',{fs:12.5,mono:true,c:P.ink,a:e})}
    if(k===5){R.flowArc(box(XB,ZK),cpu,.6,{c:CB,r:.07,n:6,speed:1.1});R.flowArc(cpu,box(XB,ZU),.8,{c:CB,r:.07,n:8,speed:1.1,a:e});
      R.label([0,2.5,0],'measured: '+mn.toFixed(2)+' to '+mxv.toFixed(2)+' us per switch',{fs:13,b:1,c:P.acc,a:e})}
  }
  const full={cam:[.0,.72],bounds:[[-4.4,0,-1.9],[4.4,2.4,1.9]]};
  S3.stage({id:'stg-sw',list:'sx-sw',fig:'Fig. 2 · one context switch, v5.10 arm64',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1300,hold:4600,draw,
    // the pick, the MMU and the register swap happen in the CPU: the camera moves in on it
    view:k=>(k===2||k===3)&&innerWidth>=560?{cam:[.25,.6],bounds:[[-2.2,0,-1.2],[4.4,2,1.9]]}:full,
    margin:w=>w<520?[16,10,16,10]:[18,110,18,110]});
})();
