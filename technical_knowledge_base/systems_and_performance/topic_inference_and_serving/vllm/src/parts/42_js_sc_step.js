// ---- Scene, section 2 (Fig. 2): one engine step of the recorded prefix-caching-off run, the step that admits C (window.VLS.step, from window.VL_STEP).
// Requests as bars (computed tokens solid, the rest outlined), the 64-token budget as a tray filled in the order the code runs (running first,
// then waiting), the block pool behind it, and the model runner's layers as glass plates the flat batch flows through. Every count and block
// number is the recording's; the layout is schematic. ----
(function(){
  if(!document.getElementById('stg-step')||!window.VLS)return;const {at,off,lerp,mix,rgb}=S3;const T=VLS.step,COL=VLS.COL;
  const Q=T.order,Y=.02,TU=.031,RX0=-7.2,RZ={};Q.forEach((q,i)=>RZ[q]=-1.1+i*.85);
  const BX0=-2.1,BU=.05,BW=T.budget*BU,BZ=0; // the budget tray
  const PX0=-2.0,PZ0=-3.3,CS=.4,bx=id=>PX0+(id%6)*CS,bz=id=>PZ0+Math.floor(id/6)*CS; // the pool, behind the tray
  const LX=[2.3,2.9,3.5,4.1],OX=5.0; // the layers and the outputs
  // where each request's tokens of this step sit in the tray, and which blocks they are written to
  const seg={};{let x=0;Q.forEach(q=>{seg[q]=[x,T.tok[q]];x+=T.tok[q]})}
  const kvBlocks=q=>{const b=T.before[q],bl=T.blocks[q],s=new Set();for(let p=b.done;p<b.done+T.tok[q];p++)s.add(bl[Math.floor(p/T.bs)]);return [...s]};
  const isNew=id=>T.alloc.includes(id);
  function draw(R,k,e){const P=R.P,ph=R.W<520;R.grid(-8,5.8,-3.8,2.2,.5);
    const lab=(show,p,t,o)=>{if(show)R.label(p,t,Object.assign({fs:12.5},o||{}))};
    // the requests: bars of their tokens, computed part solid
    Q.forEach((q,i)=>{const b=T.before[q],c=rgb(COL[q]),z=RZ[q],got=k>=1&&(i<Q.length-1||k>=2)?T.tok[q]:0,grow=(k===1&&q!=='C')||(k===2&&q==='C')?e:1;
      const live=k<=2||k===5?1:.35,len=b.len+(k>=5?T.out[q]:0);
      R.box([RX0+len*TU/2,Y,z],[len*TU,.12,.42],{fill:P.paper,a:live,lw:.6,shadow:false});
      if(b.done>0)R.box([RX0+b.done*TU/2,Y+.12,z],[b.done*TU,.16,.38],{fill:mix(P.paper,c,.55),a:live,lw:.5,shadow:false});
      if(got>0)R.box([RX0+(b.done+got*grow/2)*TU,Y+.12,z],[Math.max(.03,got*grow*TU),.24,.38],{fill:mix(P.paper,P.c5,.75),a:live,ec:P.ink,lw:1.1,shadow:false});
      if(k>=5&&T.out[q])R.box([RX0+(b.len+.5)*TU,Y+.12,z],[TU*1.6,.3,.38],{fill:mix(P.paper,P.good,.7),a:e,ec:P.good,lw:1.2,shadow:false});
      lab(k<=2||k===5,[RX0,Y,z],q,{al:'right',dx:-10,b:1,c:COL[q]});
      const need=b.len-b.done;
      lab(k===0,[RX0+b.len*TU,Y+.1,z],(b.state==='WAIT'?'arrives: ':'')+b.done+' of '+b.len+' computed · needs '+need,{al:'left',dx:10,fs:12,wide:1,c:P.mute});
      if((k===1&&q!=='C')||(k===2&&q==='C'))lab(1,[RX0+b.len*TU,Y+.1,z],'+'+T.tok[q]+(T.kind[q]==='decode'?' (decode)':' (prefill chunk)'),{al:'left',dx:10,b:1,c:P.acc,a:e,wide:1});
      if(k===5)lab(1,[RX0+len*TU,Y+.1,z],T.out[q]?'+1 output token':'mid-prompt: no token',{al:'left',dx:12,b:1,c:T.out[q]?P.good:P.mute,a:e,wide:!T.out[q]})});
    lab(k===0,[RX0-.6,Y+.1,RZ[Q[Q.length-1]]+.5],'waiting',{al:'right',dx:-10,fs:12,c:P.mute,wide:1});lab(k===0,[RX0-.6,Y+.1,RZ[Q[0]]-.5],'running',{al:'right',dx:-10,fs:12,c:P.mute,wide:1});
    // the budget tray: one slot per token
    const ta=k===3||k===4?1:k<=2?.9:.5;R.box([BX0+BW/2,Y,BZ],[BW+.1,.06,.5],{fill:P.paper,a:ta,lw:.8,shadow:false});
    for(let j=0;j<T.budget;j+=8)R.line([[BX0+j*BU,Y+.065,BZ-.25],[BX0+j*BU,Y+.065,BZ+.25]],{c:P.line,w:.6,a:ta*.6});
    Q.forEach((q,i)=>{const [x0,n]=seg[q],show=k>=1&&(i<Q.length-1||k>=2),g=(k===1&&q!=='C')||(k===2&&q==='C')?e:1;if(!show)return;
      R.box([BX0+(x0+n*g/2)*BU,Y+.06,BZ],[Math.max(.04,n*g*BU-.01),.2,.42],{fill:mix(P.paper,rgb(COL[q]),.7),a:ta,lw:.5,shadow:false});
      if((k===1&&q!=='C')||(k===2&&q==='C'))R.flowArc([RX0+(T.before[q].done+T.tok[q]/2)*TU,Y+.35,RZ[q]],[BX0+(x0+n/2)*BU,Y+.3,BZ],.45,{c:COL[q],r:.05,n:Math.max(3,Math.round(n/5)),speed:1.4,a:e});
      lab(k===3&&!ph,[BX0+(x0+n/2)*BU,Y+.26,BZ],q+' '+n,{dy:-10,fs:12,b:1,c:COL[q],a:e})});
    const used=k>=2?T.budget-0:k>=1?Q.slice(0,-1).reduce((s,q)=>s+T.tok[q],0):0,usedN=Q.filter((q,i)=>k>=1&&(i<Q.length-1||k>=2)).reduce((s,q)=>s+T.tok[q],0);
    lab(k>=1&&k<=3,[BX0+BW/2,Y,BZ+.25],'token budget: '+usedN+' of '+T.budget,{dy:16,b:1,c:k>=1&&k<=2?P.acc:P.ink});
    if(k===3){lab(1,[BX0+BW/2,Y,BZ+.25],'one flat batch, positions and block tables attached',{dy:34,b:1,c:P.acc,a:e,wide:1})}
    // the block pool: blocks held after the step; new ones outlined
    const pa=k===1||k===2||k===4?1:.3,pool=k>=4?T.poolAfter:T.poolBefore;
    R.box([PX0+CS*2.5,Y-.001,PZ0+CS*2],[CS*6+.12,.02,CS*5+.12],{fill:mix(P.paper,P.c1,.08),a:pa,lw:.6,shadow:false,dz:300});
    R.box([bx(0),Y,bz(0)],[CS*.8,.02,CS*.8],{fill:P.soft,a:pa*.6,lw:.5,shadow:false});
    const shown=id=>{if(k>=4)return true;if(isNew(id)){const o=T.poolAfter[id-1].owner;return o==='C'?k>=2:k>=1}return true};
    T.poolAfter.forEach(b=>{const held=b.rc>0&&shown(b.id),c=held?rgb(COL[b.owner]):null,nw=isNew(b.id)&&held,g=nw&&((k===1&&b.owner!=='C')||(k===2&&b.owner==='C'))?e:1;
      R.box([bx(b.id),Y,bz(b.id)],[CS*.8,held?.04+.18*g:.04,CS*.8],{fill:held?mix(P.paper,c,.55):P.paper,a:pa,lw:nw?1.5:.5,ec:nw?P.acc:null,shadow:false})});
    lab(k===1||k===2||k===4,[PX0-.2,0,PZ0+CS*2],'block pool (29 usable)',{al:'right',dx:-8,b:1});
    if(k===1||k===2){const ids=T.alloc.filter(id=>(T.poolAfter[id-1].owner==='C')===(k===2));lab(1,[bx(ids[ids.length-1])+.3,Y+.2,bz(ids[ids.length-1])],'new: '+ids.join(', '),{al:'left',dx:10,b:1,c:P.acc,a:e})}
    // the layers: the flat batch flows through them; keys and values go to the blocks
    const la=k>=3?1:.3;LX.forEach(x=>R.glass([x,Y+.05,-.85],[0,0,1.7],[0,1.15,0],{c:P.c1,a:la,nu:6,nv:5}));
    lab(k===3||k===4,[3.2,Y+1.2,-.85],'28 layers (4 drawn)',{dy:-10,fs:12,c:P.mute});
    if(k===3)R.flow([[BX0+BW,Y+.25,BZ],[LX[0]-.1,Y+.5,0]],{c:P.acc,r:.06,n:6,speed:1.5,a:e});
    if(k===4){const pts=[[BX0+BW,Y+.25,BZ]];for(let i=0;i<=16;i++)pts.push([LX[0]-.3+i*.15,Y+.5+.03*Math.sin(i*1.3),0]);R.flow(pts,{c:P.acc,r:.065,n:16,speed:1.6,a:e});
      Q.forEach(q=>kvBlocks(q).forEach(id=>R.flowArc([LX[1],Y+.9,-.5],[bx(id),Y+.25,bz(id)],.8,{c:COL[q],r:.045,n:4,speed:1.1,a:e*.9})));
      lab(1,[PX0+CS*5.5,Y+.1,PZ0+CS*3],'keys and values written',{al:'left',dx:12,b:1,c:P.k,a:e,wide:1})}
    // the outputs: one token for each request whose prompt is complete
    if(k>=5){Q.forEach((q,i)=>{if(!T.out[q])return;const z=-.5+i*.5;R.ball([OX,Y+.5,z],.13,{c:COL[q],a:e});R.flowArc([LX[3]+.1,Y+.6,0],[OX,Y+.5,z],.25,{c:COL[q],r:.045,n:3,speed:1.2,a:e});
      R.flowArc([OX,Y+.5,z],[RX0+(T.before[q].len+.5)*TU,Y+.35,RZ[q]],1.3,{c:P.good,r:.045,n:8,speed:1.6,a:e*.8})});
      lab(1,[OX,Y+.7,-.5],'sampled',{dy:-14,fs:12,c:P.mute,a:e,wide:1})}
  }
  const full={cam:[-.3,.86],bounds:[[-7.8,0,-3.5],[5.4,1.2,1.2]]};
  const st=S3.stage({id:'stg-step',list:'sx-step',fig:'Fig. 2 · one engine step, recorded',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1500,hold:5000,draw,
    view:k=>k===0?{cam:[-.2,.8],bounds:[[-7.8,0,-1.6],[-1.6,.6,1.1]]}:k===1||k===2?{cam:[-.3,.86],bounds:[[-7.8,0,-3.5],[1.4,.6,1.1]]}:
      k===3?{cam:[-.25,.7],bounds:[[-2.4,0,-1.1],[4.6,1.2,1.0]]}:k===4?{cam:[-.3,.8],bounds:[[-2.4,0,-3.5],[4.6,1.2,1.0]]}:full,
    margin:w=>w<520?[14,10,14,10]:[22,24,22,24]});
  (window.VLSTG=window.VLSTG||{})['stg-step']=st;
})();
