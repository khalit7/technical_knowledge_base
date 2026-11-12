// ---- Scene, Fig. 3 (section 6): six registrations of mi-tiny-gpt and the one alias that moves (renderer v2) ----
// Each version is a block on the registry plate with its held-out loss as a bar (axis from 2.0, lower is better); the dashed line is the champion's
// loss the next version must beat; the champion flag arcs to a version only when the gate promotes it, and the consumer above reads through the alias.
// Losses, learning rates, splits and the gate's decisions come from window.MP (versions and alias_hist, replayed by src/scripts/gen_data.py).
(function(){
  if(!document.getElementById('stg-reg')||!window.MP)return;const {at,lerp,mix}=S3;
  const M=window.MP,VS=M.versions,AH=M.alias_hist,N=VS.length,runOf=v=>M.runs.find(r=>r.id===v.run);
  const vx=i=>-3.75+i*1.5,BASE=2.0,HS=3.0,hgt=v=>(v.val_loss-BASE)*HS,YP=.3;
  window.MP_REG={n:N,champion:M.champion,hist:AH.map(h=>({v:h.v,promoted:h.promoted,champion:h.champion})),loss:VS.map(v=>v.val_loss.toFixed(4)),lr:VS.map(v=>runOf(v).lr),split:VS.map(v=>runOf(v).split)};
  const champAfter=s=>s===0?null:AH[s-1].champion; // champion after step s (step s registers version s)
  function draw(R,k,e){const P=R.P,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12},o||{}));
    R.grid(-5.5,5.5,-2.5,2.5,.5);
    R.glass([-4.8,YP,-1],[9.6,0,0],[0,0,2],{c:P.c2,a:.45,nu:12,nv:2});
    lab([4.8,YP,-1],'registered model mi-tiny-gpt',{al:'right',dy:-10,c:P.c2,b:1,wide:1});
    const ch=champAfter(k),prev=champAfter(Math.max(0,k-1));
    // versions registered so far
    VS.forEach((v,i)=>{const s=i+1;if(s>k)return;const nw=s===k,a=nw?e:1,isCh=ch===v.v,other=runOf(v).split!==0.9;
      const h=hgt(v)*(nw?e:1),dim=k>=1&&!nw&&!isCh?.5:1;
      R.box([vx(i),YP,0],[.9,.26,.9],{fill:isCh?mix(P.paper,P.c2,.5):P.paper,a:a*dim,shadow:false});
      R.box([vx(i),YP+.26,0],[.42,Math.max(.02,h),.42],{fill:other?mix(P.paper,P.c5,.75):isCh?P.c2:mix(P.paper,P.c1,.6),a:a*dim,shadow:false});
      lab([vx(i),YP+.26+h,0],v.val_loss.toFixed(4),{dy:-11,b:nw||isCh,c:other?P.c5:isCh?P.c2:P.ink,a:a*Math.max(.6,dim)});
      lab([vx(i),YP,.45],'v'+v.v+(other?' (80/20)':''),{dy:13,a:a*Math.max(.6,dim),c:other?P.c5:P.ink})});
    // the bar the next version must beat: the champion's loss before this registration
    if(k>=2){const cv=VS.find(v=>v.v===prev),y=YP+.26+hgt(cv);R.line([[-4.7,y,0],[vx(Math.min(N-1,k-1))+.6,y,0]],{c:P.c2,w:1.4,a:.85,dash:[5,4]});
      lab([-4.7,y,0],'to beat: '+cv.val_loss.toFixed(4),{al:'right',dx:-6,c:P.c2,grp:'bar'})}
    // a registration arrives from the register step
    if(k>=1){const i=k-1,src=[vx(i),YP+.2,2.4];R.flowArc(src,[vx(i),YP+.3,.5],.5,{c:P.c1,a:1-e*.5,r:.07,n:7})}
    // the alias: stays, or arcs to the new version
    const fy=v=>YP+.26+hgt(VS.find(x=>x.v===v))+.8;
    if(ch!=null){let p;if(prev!=null&&prev!==ch){const a=[vx(prev-1),fy(prev),0],b=[vx(ch-1),fy(ch),0];p=R.arcPt(a,b,.6,e);R.arc(a,b,.6,{c:P.c2,w:1.6,t:e,a:.6})}
      else{p=[vx(ch-1),fy(ch),0]}const a=prev==null?e:1;
      R.glow(p,.2,{c:P.c2,a});R.ball(p,.12,{c:P.c2,a});lab(p,'@champion',{dy:-16,b:1,c:P.c2,a});
      // the consumer reads through the alias
      const cons=[0,2.95,-1.4];R.box(cons,[2.2,.42,.7],{fill:mix(P.paper,P.acc,.3),a,shadow:false});lab([cons[0],cons[1]+.42,cons[2]],'models:/mi-tiny-gpt@champion',{dy:-11,c:P.acc,b:1,a});
      R.flowArc([p[0],p[1]+.1,0],[cons[0],cons[1],cons[2]],.35,{c:P.c2,a:a*.85,r:.06,n:7,speed:1.2})}
    if(k===0)lab([0,YP+.6,0],'no versions, no alias',{b:1,c:P.mute,a:e});
    // the gate's verdict for this registration
    if(k>=1){const h=AH[k-1],v=VS[k-1],other=runOf(v).split!==0.9,eq=h.prev&&v.val_loss===VS.find(x=>x.v===h.prev).val_loss;
      const t=h.promoted?(h.prev?'lower: the alias moves':'first version: the alias goes here'):eq?'equal, not lower: stays':other?'not lower: stays (other held-out text)':'not lower: stays';
      lab([vx(k-1),YP+.2,2.4],'register v'+v.v+': '+t,{dy:14,b:1,c:h.promoted?P.good:other?P.c5:P.mute,a:e})}
  }
  const full={cam:[.3,.5],bounds:[[-4.9,0,-1.6],[4.9,3.4,2.5]]};
  const st=S3.stage({id:'stg-reg',list:'sx-reg',fig:'Fig. 3 · six registrations, one alias',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1400,hold:4600,draw,
    view:k=>k===5?{cam:[.35,.45],bounds:[[-1.6,0,-1.6],[3.6,3.4,2.5]]}:full,margin:w=>w<520?[14,10,14,10]:[18,16,16,110]});
  (window.MPSTG=window.MPSTG||{})['stg-reg']=st;
})();
