// ---- Scene, Fig. 3 (2026-11-12, renderer v2): one block's joint graph cut by the partitioner. Every box is one recorded operation
// (window.TCP.aot.joint, 144 ops as AOTAutograd handed them to the partitioner, exp/aot.py): the 56 forward ops in front, the 88 backward
// ops behind, the cut as a glass wall between. Per cut (TCP.aot.block[k]): saved activations rise in orange, height and dot count by
// their bytes, and stream across the wall to their first backward user; recomputed ops turn green and send a thin stream across.
// Steps: #sx-cut; the closed table #tcpp-tbl follows the step. ----
(function(){
  if(!document.getElementById('stg-cut')||!window.S3||!window.TCP)return;const {at,mix}=S3,A=TCP.aot,J=A.joint,TU_=window.TU;
  const KS=[null,'default','mincut_1.0','mincut_0.5','mincut_0.2','mincut_0.0'];
  const fwSet=new Set(A.block.default.fw_names),FW=J.filter(n=>fwSet.has(n[0])),BW=J.filter(n=>!fwSet.has(n[0]));
  const XA=-5,XB=5,ZF=1.5,ZB=-1.5,xf=i=>XA+(XB-XA)*(i+.5)/FW.length,xb=i=>XA+(XB-XA)*(i+.5)/BW.length;
  const fpos={},bpos={};FW.forEach((n,i)=>fpos[n[0]]=i);BW.forEach((n,i)=>bpos[n[0]]=i);
  // the first backward op that reads a value (or the backward op at the same relative place when none reads it by name)
  const user=nm=>{const j=BW.findIndex(n=>n[2].includes(nm));return j>=0?j:Math.round((fpos[nm]||0)/FW.length*(BW.length-1))};
  const MAXB=2097152;
  function per(k){const B=A.block[k],act=B.saved.filter(s=>!s[4]&&!s[5]&&fpos[s[0]]!=null);
    return {B,act,sv:new Map(act.map(s=>[s[0],s[3]])),rc:new Set(B.recomputed)}}
  const PK={};KS.forEach(k=>{if(k)PK[k]=per(k)});
  function draw(R,k,e){const P=R.P;R.grid(-5.6,5.6,-2.2,2.2,.5);
    const cur=KS[k]?PK[KS[k]]:null,prev=k>1&&KS[k-1]?PK[KS[k-1]]:null;
    // the cut: a glass wall between the two rows, from step 2 on
    const wa=at(k,e,1);if(wa>0)R.glass([XA-.2,.01,0],[XB-XA+.4,0,0],[0,.85,0],{c:P.c2,a:wa*.3,nu:18,nv:3,th:.02});
    // forward row: a box per op; saved ones rise by their bytes, recomputed ones turn green
    FW.forEach((n,i)=>{const nm=n[0],x=xf(i);let h=.1,fill=P.paper,a=k===0?Math.max(.35,e):.5;
      if(cur){const sb=cur.sv.get(nm),wasb=prev?prev.sv.get(nm):undefined,h1=sb!=null?.1+.75*Math.sqrt(sb/MAXB):.1,h0=prev?(wasb!=null?.1+.75*Math.sqrt(wasb/MAXB):.1):.1;
        h=h0+(h1-h0)*e;if(sb!=null){fill=P.c2;a=1}else if(cur.rc.has(nm)){fill=mix(P.paper,P.good,.75);a=1}}
      R.box([x,0,ZF],[.13,h,.36],{fill,a,shadow:false,lw:.6})});
    BW.forEach((n,i)=>R.box([xb(i),0,ZB],[.085,.12,.36],{fill:P.paper,a:k===0?Math.max(.35,e):.45,shadow:false,lw:.5}));
    R.label([XA-.2,0,ZF],'forward · '+FW.length+' ops',{mono:true,fs:12,al:'right',dx:-8,grp:'rows'});
    R.label([XA-.2,0,ZB],'backward · '+BW.length+' ops',{mono:true,fs:12,al:'right',dx:-8,grp:'rows'});
    if(k===0){R.flow(FW.map((_,i)=>[xf(i),.2,ZF]).filter((_,i)=>i%4===0),{c:P.acc,r:.055,speed:1.8,a:e});R.flow(BW.map((_,i)=>[xb(BW.length-1-i),.2,ZB]).filter((_,i)=>i%5===0),{c:P.c4,r:.055,speed:1.8,a:e});
      R.label([0,1.25,ZB],'joint graph · '+J.length+' ops',{mono:true,fs:13,b:1,a:e});return}
    // what crosses the wall: saved activations (orange, dots by bytes) and recomputed ops (thin green)
    cur.act.forEach(s=>{const i=fpos[s[0]],h=.1+.75*Math.sqrt(s[3]/MAXB);R.flowArc([xf(i),h+.02,ZF],[xb(user(s[0])),.12,ZB],.45+.3*Math.sqrt(s[3]/MAXB),{c:P.c2,r:.04+.05*Math.sqrt(s[3]/MAXB),n:Math.max(3,Math.round(3+9*Math.sqrt(s[3]/MAXB))),speed:1.2,a:e})});
    [...cur.rc].forEach(nm=>{if(fpos[nm]==null)return;R.flowArc([xf(fpos[nm]),.12,ZF],[xb(user(nm)),.12,ZB],.3,{c:P.good,r:.035,n:3,speed:1,a:e*.7})});
    const B=cur.B,mb=(B.saved_bytes_activations/1e6).toFixed(2)+' MB kept';
    if(R.W<520){R.label([0,1.25,ZB],mb,{mono:true,fs:13,b:1,c:P.ink,a:e,dy:-10});R.label([0,1.25,ZB],B.bw_ops+' backward ops · '+B.recomputed.length+' recomputed',{mono:true,fs:12,c:P.mute,a:e,dy:8})}
    else R.label([0,1.25,ZB],mb+' · '+B.bw_ops+' backward ops · '+B.recomputed.length+' recomputed',{mono:true,fs:13,b:1,c:P.ink,a:e});
  }
  function table(k){const el=document.getElementById('tcpp-tbl');if(!el||!TU_||!KS[k])return;const S=A.block[KS[k]],{esc,comma}=TU_;
    el.innerHTML=TU_.table(['Saved value','Made by','Shape','Bytes','Counted'],S.saved.map(s=>[esc(s[0]),esc(s[1]),s[2]?s[2].join(' x '):'',comma(s[3]),s[4]?'input':s[5]?'view of an input':'yes']));
    const c=document.getElementById('tcpp-tcap');if(c)c.textContent=document.querySelector('#sx-cut>li:nth-child('+(k+1)+') b').textContent.replace(/\.$/,'')}
  const full={cam:[.62,.55],bounds:[[-5.1,0,-1.7],[5.1,1.3,1.7]]};
  S3.stage({id:'stg-cut',list:'sx-cut',fig:'Fig. 3 · one block\'s joint graph, cut five ways',cam:full.cam,bounds:full.bounds,aspect:.47,dur:1400,hold:5000,draw,
    margin:w=>w<520?[16,8,14,8]:[18,14,14,130],onStep:k=>table(Math.max(1,k)),
    view:()=>innerWidth<560?{cam:[1.15,.75],bounds:full.bounds}:full}); // on a phone the two long rows turn into depth, so the ops come out larger
})();
