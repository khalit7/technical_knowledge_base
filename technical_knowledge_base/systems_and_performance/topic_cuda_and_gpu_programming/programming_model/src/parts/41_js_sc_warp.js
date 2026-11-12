// ---- Scene, Fig. 2 (section 3): a 256-thread block cut into 8 warps by linear thread id (each warp an 8 x 4 tile of its 32 lanes), then one
// warp's issue slots in time order, left to right: one instruction for all 32 lanes, a divergent branch if (lane < 16) A else B whose two paths
// issue one after the other with half the lanes masked off in each, and the reconverged warp. Lanes 0 to 15 are the tile's back two rows.
// The branch is an illustrative input (the rule is the guide's; no timing is measured). Steps are explained by #sx-warp on the left. ----
(function(){
  if(!document.getElementById('stg-warp'))return;const {at,off,mix}=S3;
  const TAB=['#4e79a7','#f28e2b','#59a14f','#b07aa1','#d4a72c','#76b7b2','#e15759','#9c755f'].map(S3.rgb);
  const CS=.3,TW=8*CS,TD=4*CS,lane=(l,cx,cz)=>[cx+((l%8)-3.5)*CS,0,cz+(Math.floor(l/8)-1.5)*CS];
  const WX=w=>((w%4)-1.5)*(TW+.45),WZ=w=>w<4?-.85:.85;          // block view: warps 0 to 3 at the back, 4 to 7 in front
  const SX=s=>(s-1.5)*(TW+.55);                                 // issue slots 1 to 4, left to right in time order
  window.PM_WARP={warps:256/32,slots:4,activeA:16,activeB:16};
  function draw(R,k,e){const P=R.P,H=P.acc,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12.5},o||{}));R.grid(-6,6,-2.6,2.6,.5);
    // 1. the block: 8 warps of 32 lanes; fades out fully before the warp's issue slots appear
    const aB=k===0?1:k===1?Math.max(0,1-2.2*e):0;
    if(aB>0){for(let w=0;w<8;w++){const hi=w===1&&k===1,cx=WX(w),cz=WZ(w);
        for(let l=0;l<32;l++)R.box(lane(l,cx,cz),[.23,.2,.23],{fill:mix(P.paper,TAB[w],.55),a:aB*(k===1&&!hi?.5:1),shadow:false,lw:.5});
        lab([cx,0,cz+(w<4?-TD/2-.05:TD/2+.05)],'warp '+w+' · '+(32*w)+' to '+(32*w+31),{dy:w<4?-12:14,fs:12,c:P.ink,a:aB})}
      lab([0,0,2.05],'blockDim.x = 256 · warp w = threads 32w to 32w + 31',{dy:20,b:1,a:aB,wide:1})}
    // 2 to 5. warp 1's issue slots: lit lanes execute, masked lanes wait (drawn flat); slots still to come are faint outlines
    const aS=k===1?Math.max(0,2.2*e-1.2):k>1?1:0;
    if(aS>0){const SL=[['y = a * x','all 32 lanes',()=>true,P.c1],['path A','lanes 0 to 15',l=>l<16,P.c2],['path B','lanes 16 to 31',l=>l>=16,P.c6],['reconverged','all 32 lanes',()=>true,P.c1]];
      SL.forEach(([nm,sub,act,col],s)=>{const cx=SX(s),now=s===k-1,done=s<k-1,future=s>k-1,t=now?(k===1?aS:e):1;
        for(let l=0;l<32;l++){const p=lane(l,cx,0),on=act(l)&&!future;
          if(on)R.box(p,[.23,.36*t,.23],{fill:mix(P.paper,col,now?.65:.45),a:aS*(now?1:.75)*Math.max(.05,t),shadow:false,lw:.5});
          else R.box(p,[.23,.03,.23],{fill:P.paper,a:aS*(future?.25:.6),shadow:false,lw:.4})}
        if(now)for(let l=0;l<32;l+=3)if(act(l)){const p=lane(l,cx,0);R.flow([[p[0],1.25,p[2]],[p[0],.42,p[2]]],{c:col,a:aS*.85,r:.05,n:3,speed:1})}
        lab([cx,0,TD/2+.05],nm,{dy:14,b:1,c:future?P.mute:col,a:aS*(future?.5:1),fs:12.5});
        if(!future)lab([cx,0,TD/2+.05],sub,{dy:30,fs:12,c:P.mute,a:aS*(now?1:.7),wide:1})});
      lab([SX(1.5),0,-TD/2-.05],'if (lane < 16)',{dy:-14,b:1,a:k>=2?(k===2?e:1):0});
      R.line([[SX(0)-TW/2,.01,-TD/2-.35],[SX(3)+TW/2,.01,-TD/2-.35]],{c:P.mute,w:1.5,head:7,a:aS*.8});
      lab([SX(0)-TW/2,0,-TD/2-.35],'issue slots, in time order',{al:'left',dy:-12,fs:12,c:P.mute,a:aS,wide:1});
      if(k===4)R.line([[SX(1)-TW/2,.02,TD/2+.2],[SX(2)+TW/2,.02,TD/2+.2]],{c:H,w:3,a:e})}
  }
  const vB={cam:[.1,.82],bounds:[[-5.6,0,-2.2],[5.6,.3,2.4]]},vS={cam:[.1,.62],bounds:[[-5.6,0,-1.4],[5.6,1.2,1.4]]};
  const st=S3.stage({id:'stg-warp',list:'sx-warp',fig:'Fig. 2 · a block in warps, a branch in a warp',cam:vB.cam,bounds:vB.bounds,aspect:.5,dur:1500,hold:4600,draw,
    margin:w=>w<520?[14,10,14,10]:[24,16,34,16],view:k=>k===0?vB:vS});
  (window.PMSTG=window.PMSTG||{})['stg-warp']=st;
})();
