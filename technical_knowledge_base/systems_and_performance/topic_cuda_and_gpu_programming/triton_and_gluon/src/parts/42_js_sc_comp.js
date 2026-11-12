// ---- Scene, Fig. 3 (section 7): the compiler's stages as stacked glass plates, one operation flowing down through them.
// Triton mode: the tutorial-style matmul's tl.dot compiled for sm_90a; plate depth grows with the stage's line count (window.TGD.main
// 'matmul.sm_90a': TTIR 206, TTGIR 300, LLVM IR 1,696, PTX 1,346 lines, SASS 816 instructions), the operation's name at each level read
// from the IR excerpts in TGD.ir. Gluon mode: the Gluon vector add (TGD.gluon.vadd_stages has no TTIR; its TTGIR layout line is TGD.gluon.vadd_ttgir).
// Explained by #sx-comp and #sx-comp-gl; the chips #comp-mode swap them. ----
(function(){
  if(!document.getElementById('stg-comp')||!window.TGD)return;const {at,off,mix}=S3,D=window.TGD;
  const mm=D.main.find(r=>r.key==='matmul'&&r.target==='sm_90a'),gl=D.gluon;
  const NM=['Python source','TTIR','TTGIR','LLVM IR','PTX','SASS'],LN=[0,mm.ttir_lines,mm.ttgir_lines,mm.llir_lines,mm.ptx_lines,mm.sass_lines];
  const UNIT=['','lines','lines','lines','lines','instructions'];
  const OP=['tl.dot(a, b)','tt.dot','ttng.warp_group_dot','inline PTX (wgmma)','wgmma.mma_async m64n128k16','HGMMA × '+mm.ops.HGMMA];
  const GNM=['Gluon source','no TTIR','TTGIR','LLVM IR','PTX','cubin'],GOP=['gl.BlockedLayout([4], [32], [num_warps], [0])','','#blocked sizePerThread = [4]','','',''];
  window.TG_COMP={lines:LN.slice(1),hgmma:mm.ops.HGMMA,wgmma_ptx:mm.ptxops['wgmma.mma_async'],cp_async:mm.ptxops['cp.async'],ldgsts:mm.ops.LDGSTS,gluon_stages:gl.vadd_stages.slice(),
    gluon_layout:(gl.vadd_ttgir.find(l=>l.startsWith('#blocked'))||'')};
  let mode='tr';
  const Y=i=>(5-i)*.92+.06,DP=i=>i===0?.8:.42*Math.log10(LN[i]),COL=P=>[P.c6,P.c1,P.c2,P.c3,P.c4,P.c5];
  function plate(R,i,a,c,ghost){const d=ghost?.8:DP(i);R.glass([-1.5,Y(i),-d/2],[3,0,0],[0,0,d],{c,a:a*(ghost?.25:.8),nu:ghost?2:8,nv:ghost?1:3,th:.02})}
  function draw(R,k,e){const P=R.P,C=COL(P),lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12.5},o||{}));R.grid(-3,3,-1.6,1.6,.5);
    if(mode==='tr'){
      // the plate this step is about at full strength; those above it receding, those below drawn faintly so the whole stack is there from the start
      for(let i=0;i<6;i++){const a=i===k?(k===0?1:.35+.65*e):i<k?.3:.13;plate(R,i,a,C[i]);
        if(Math.abs(i-k)<=1)lab([-1.5,Y(i),0],NM[i]+(LN[i]?' · '+LN[i].toLocaleString('en-US')+' '+UNIT[i]:''),{al:'right',dx:-10,fs:12.5,b:i===k,c:i===k?P.ink:P.mute,a:i===k?1:.75,grp:'st'})}
      // the operation: flows down from the last plate to this one, then sits on it with its name at this level
      const yk=Y(k);if(k>0)R.flow([[0,Y(k-1)+.05,0],[0,yk+.12,0]],{c:P.acc,a:e,r:.08,n:6,speed:1.2});
      R.box([0,yk+.02,0],[.32,.16,.32],{fill:mix(P.paper,P.acc,.75),a:k===0?1:e,shadow:false});
      lab([0,yk+.18,0],OP[k],{dy:-14,b:1,c:P.acc,a:k===0?1:e});
      // TTGIR: the decisions appear on its plate: num_stages shared buffers for A and B, the #mma accumulator layout
      if(k===2){for(let s=0;s<mm.num_stages;s++){R.glass([.65,yk+.08+s*.09,-.25],[.32,0,0],[0,0,.5],{c:P.c1,a:e,nu:1,nv:2,th:.015});R.glass([1.05,yk+.08+s*.09,-.25],[.32,0,0],[0,0,.5],{c:P.c6,a:e,nu:2,nv:1,th:.015})}
        R.flowArc([.85,yk+.4,0],[.12,yk+.15,0],.15,{c:P.c1,a:e,r:.045,n:5,speed:1});
        lab([1.0,yk,.3],'memdesc<4x128x32xf16>',{dy:20,fs:12,c:P.c1,a:e,wide:1});
        for(let w=0;w<4;w++)R.box([-.95+w*.2,yk+.02,0],[.16,.1,.42],{fill:mix(P.paper,[P.c1,P.c2,P.c4,P.c6][w],.75),a:e,shadow:false,lw:.5});
        lab([-.65,yk,.21],'#mma · 4 warps',{dy:18,fs:12,c:P.mute,a:e,wide:1})}
    }else{
      const stepPlate=[0,2,2,5],cur=stepPlate[k];
      for(let i=0;i<6;i++){const ghost=i===1,live=k===3?i>=3:i===cur,a=ghost?.6:live?(k===0?1:.35+.65*e):i<cur?.3:.13;plate(R,i,a,C[i],ghost);
        if((k===1?i<=2:k===3?i>=2:Math.abs(i-cur)<=1))lab([-1.5,Y(i),0],GNM[i],{al:'right',dx:-10,fs:12.5,b:live,c:live?P.ink:ghost?P.bad:P.mute,a:live?1:.75,grp:'st'})}
      if(k===1){const pts=[];for(let j=0;j<=24;j++){const u=j/24;pts.push([0,Y(0)+(Y(2)-Y(0))*u,-1.1*Math.sin(Math.PI*u)])}R.flow(pts,{c:P.c4,a:e,r:.08,n:8,speed:1.3});
        lab([0,Y(1),-1.1],'skips TTIR',{dy:-12,b:1,c:P.c4,a:e})}
      if(k===3)R.flow([[0,Y(2),0],[0,Y(5)+.1,0]],{c:P.c4,a:e,r:.08,n:12,speed:1.3});
      const yk=Y(k===3?5:cur);R.box([0,yk+.02,0],[.32,.16,.32],{fill:mix(P.paper,P.c4,.75),a:k===0?1:e,shadow:false});
      if(GOP[cur]&&k<3)lab([0,yk+.18,0],GOP[cur],{dy:-14,b:1,c:P.c4,a:k===0?1:e});
      // TTGIR: thread t holds a run of 4 neighbours (threads 0 to 3 drawn, one colour each)
      if(k===2){for(let t=0;t<4;t++)for(let j=0;j<4;j++)R.box([.55+(t*4+j)*.115,yk+.02,.25],[.1,.1,.16],{fill:mix(P.paper,[P.c1,P.c2,P.c4,P.c6][t],.75),a:e,shadow:false,lw:.5});
        lab([1.4,yk,.25],'threads 0 to 3, 4 elements each',{dy:20,fs:12,c:P.mute,a:e,wide:1})}
    }
  }
  const full={cam:[.28,.42],bounds:[[-2.6,0,-1.1],[2.2,4.8,1.1]]};
  const viewTr=k=>({cam:[.28,.5],bounds:[[-2.6,Y(k)-.55,-1],[2.2,Y(k)+.85,1]]});
  const st=S3.stage({id:'stg-comp',list:'sx-comp',fig:'Fig. 3 · one operation down the compiler',cam:full.cam,bounds:full.bounds,aspect:.72,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[18,16,18,16],
    view:k=>mode==='tr'?viewTr(k):k===0?viewTr(0):k===1?{cam:[.55,.35],bounds:[[-2.6,Y(2)-.4,-1.3],[2.2,Y(0)+.6,1]]}:k===2?viewTr(2):{cam:[.28,.42],bounds:[[-2.6,Y(5)-.3,-1],[2.2,Y(2)+.6,1]]}});
  (window.TGSTG=window.TGSTG||{})['stg-comp']=st;
  const chips=document.getElementById('comp-mode');
  if(chips)chips.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b||b.dataset.m===mode)return;mode=b.dataset.m;
    chips.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    document.getElementById('sx-comp').hidden=mode!=='tr';document.getElementById('sx-comp-gl').hidden=mode!=='gl';st.list(mode==='tr'?'sx-comp':'sx-comp-gl')});
})();
