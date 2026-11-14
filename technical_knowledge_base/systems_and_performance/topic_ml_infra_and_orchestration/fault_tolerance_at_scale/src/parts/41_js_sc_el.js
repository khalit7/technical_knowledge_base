// ---- Scene, Fig. 2 (section 5): elastic torchrun on the running example, measured (renderer v2) ----
// Two agents (A, B) of 2 ranks each; the global batch of 32 sequences split across the ranks (8 each, then 16 each at world size 2);
// B killed, the rendezvous (c10d store hosted by agent A) re-forms the group, the job shrinks, then agent C joins and it grows back; last,
// the second run with C waiting as a spare. Times and checkpoint steps from window.FT.fl.elastic and .spare (the root Failure lab's runs el3, el4);
// node and rank positions are schematic.
(function(){
  if(!document.getElementById('stg-el')||!window.FT||!window.FT.fl)return;const {at,lerp,mix}=S3;
  const E=window.FT.fl.elastic,S=window.FT.fl.spare,GB=32;
  const T={shrink:E.starts[1][0]-E.marks.kill_B,grow:E.starts[2][0]-E.marks.start_C,spare:S.starts[1][0]-S.marks.kill_B,
    from1:E.starts[1][2],from2:E.starts[2][2],fromS:S.starts[1][2],w1:E.starts[1][1],w2:E.starts[2][1]};
  window.FT_EL=T;
  const NA=-2.5,NB=2.5,CW=[2.5,0,3.3],ZB=-3.1;
  const rk=(x,j)=>[x+(j?.85:-.85),.2,.1];
  function rows(R,c,n,col,a){for(let i=0;i<n;i++)R.box([c[0],c[1]+.5+i*.055,c[2]],[1.05,.035,.75],{fill:col,a,shadow:false,lw:.5,ea:.4})}
  function draw(R,k,e){const P=R.P,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12},o||{}));R.grid(-6,6,-4,4.4,.5);
    // where node C stands: in front, then in B's place
    const cIn=k===4?e:k===5?(e<.5?0:(e-.5)*2):0,cA=k>=4?1:0,cx=lerp(CW[0],NB,cIn),cz=lerp(CW[2],0,cIn);
    const bDead=k>=1&&k<=3||k===5,bA=k===1?lerp(1,.2,e):k===5?.2*(1-cIn):bDead?.2:k===4?0:1;
    const world=k===3?2:4;
    // the global batch: a glass plate of 32 rows at the back
    R.glass([-3,0.15,ZB],[6,0,0],[0,1.1,0],{c:P.c1,a:.9,nu:GB,nv:1});
    // on a phone the label sits above the plate, clear of the ranks' row counts
    if(R.W<520)lab([0,1.25,ZB],'global batch: '+GB+' sequences',{dy:-10,b:1,c:P.c1});else lab([3,.7,ZB],'global batch: '+GB+' sequences',{al:'left',dx:10,b:1,c:P.c1});
    // nodes and ranks
    const node=(x,z,name,a,col)=>{if(a<=.01)return;R.box([x,0,z],[3.6,.2,2.2],{fill:mix(P.paper,P.ink,.06),a,dz:200});lab([x,.2,z+1.3],name,{dy:14,b:1,a:Math.max(.45,a),c:col||P.ink})};
    node(NA,0,'agent A',1);
    const aFail=k===1;const rankCol=f=>f?mix(P.paper,P.bad,.7):P.acc;
    for(let j=0;j<2;j++)R.box(rk(NA,j),[1.2,.3,.9],{fill:rankCol(aFail&&e>.3),shadow:false});
    if(bA>.01){node(NB,0,k>=1&&k!==4?'agent B (killed)':'agent B',bA,k>=1?P.bad:P.ink);for(let j=0;j<2;j++)R.box(rk(NB,j),[1.2,.3,.9],{fill:k>=1?P.bad:P.acc,a:bA,shadow:false})}
    if(cA&&!(k===5&&e<.02)){const sp=k===5&&cIn<1;node(cx,cz,sp&&k===5?'agent C (spare)':'agent C',1,P.good);
      for(let j=0;j<2;j++)R.box([cx+(j?.85:-.85),.2,cz+.1],[1.2,.3,.9],{fill:cIn>=1?P.acc:mix(P.paper,P.good,.35),shadow:false})}
    // the rows each rank takes, and the batch flowing to it
    const live=[];
    if(k!==1&&k!==2){live.push(rk(NA,0),rk(NA,1));if(world===4){if(k>=4)live.push([cx-.85,.2,cz+.1],[cx+.85,.2,cz+.1]);else live.push(rk(NB,0),rk(NB,1))}}
    if(k===5&&cIn<1)live.length=2; // B lost, C not in yet
    const per=live.length?GB/live.length:0,ra=k===3||k===4||k===5?Math.max(.3,k===5?cIn:e):1;
    live.forEach((p,i)=>{rows(R,p,per,mix(P.paper,P.c1,.55),ra);
      R.flowArc([lerp(-2.6,2.6,(i+.5)/live.length),.6,ZB+.1],[p[0],.55+per*.055,p[2]-.2],.9,{c:P.c1,a:ra*.9,r:.06,n:Math.round(per/2)+2,speed:1.6});
      if(!(R.W<520&&live.length===4&&(i===1||i===2)))lab([p[0]+(i%2?.55:-.55),.55+per*.055,p[2]],per+' rows',{al:i%2?'left':'right',dx:i%2?6:-6,fs:12,b:1,c:P.c1,a:ra})}); // on a phone the two inner counts would collide: each node keeps its outer one
    if(k===1||k===2)[0,1].forEach(j=>rows(R,rk(NA,j),8,mix(P.paper,P.c1,.55),.3));
    // the all-reduce: a ring over the live ranks
    if(live.length>1&&(k===0||k>=3)){const ring=live.map(p=>[p[0],.45,p[2]+.55]);ring.forEach((p,i)=>{const q=ring[(i+1)%ring.length];R.flowArc(p,q,.35,{c:P.c4,a:ra*.8,r:.05,n:5,speed:1.4})})}
    // the rendezvous store on agent A
    const sa=k===2?1:.35;R.box([NA,.2,-.85],[1,.32,.4],{fill:mix(P.paper,P.c5,.55),a:sa,shadow:false});
    if(k===2){R.flowArc([NA,.6,-.85],[NA-1.4,.6,1.2],.6,{c:P.c5,a:e,r:.06,n:5,speed:1.2});lab([NA,.55,-.85],'c10d store',{dy:-12,b:1,c:P.c5,a:e});
      lab([NA,1.9,-.85],'keep-alive 5 s x 3, then last call 30 s',{b:1,c:P.c5,a:e,wide:1})}
    // what each step says, on the stage
    if(k===1){lab([NB,1.2,0],'SIGKILL after step 120',{b:1,c:P.bad,a:e});lab([NA,1.2,0],'all-reduce fails',{b:1,c:P.bad,a:e*(e>.3?1:0)})}
    if(k===3)lab([0,2.5,ZB],'world size '+T.w1+' from step '+T.from1+', '+T.shrink.toFixed(1)+' s after the kill',{b:1,c:P.acc,a:e,wide:1});
    if(k===4)lab([0,2.5,ZB],'world size '+T.w2+' from step '+T.from2+', '+T.grow.toFixed(1)+' s after C started',{b:1,c:P.good,a:e,wide:1});
    if(k===5)lab([0,2.5,ZB],'spare in: from step '+T.fromS+', '+T.spare.toFixed(1)+' s after the kill',{b:1,c:P.good,a:e,wide:1});
  }
  const st=S3.stage({id:'stg-el',list:'sx-el',fig:'Fig. 2 · lose a node, shrink, grow back (measured)',cam:[.14,.66],bounds:[[-5,0,-3.6],[6.5,2.6,4.3]],aspect:.66,dur:1500,hold:5200,draw,
    view:k=>k===2?{cam:[.45,.6],bounds:[[-5,0,-1.6],[1,2,2]]}:innerWidth<520?{cam:[.14,.8],bounds:[[-4.8,0,-3.6],[5.5,2.6,4.3]]}:null, // a phone needs no room for the side label
    margin:w=>w<520?[14,10,14,10]:[18,16,18,18]});
  (window.FTSTG=window.FTSTG||{})['stg-el']=st;
})();
