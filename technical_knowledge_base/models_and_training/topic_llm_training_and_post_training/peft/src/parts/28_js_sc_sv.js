// ---- Scene (how low is a real update, Fig. 3): the 576 singular values of SmolLM2-135M's real update to layer 14 q_proj as a 24 x 24 field of columns (renderer v2) ----
// Data: PF_DATA.show.sv (delta_probe.py, the singular values of dW = Instruct minus base), tallest first, read row by row from the front-left corner;
// each column's height is sigma squared (its share of the update's squared size), so the lit columns' heights add up to the share a rank-r matrix can hold (show.E).
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-sv')||!window.S3)return;const {at,off,lerp,mix}=S3;
  const D=PF_DATA.show,SV=D.sv,E=D.E,n=SV.length,G=24,r90=E.findIndex(v=>v>=.9)+1;
  const RK=[0,1,16,64,r90],cell=.23,w=cell*.74,HM=1.9,s0=SV[0]*SV[0];
  const pos=i=>[(i%G-(G-1)/2)*cell,(Math.floor(i/G)-(G-1)/2)*-cell]; // x, z: row 0 (the largest 24) at the front
  const pct=r=>(100*E[r-1]).toFixed(r===1?1:0)+'%';
  document.querySelectorAll('[data-sv]').forEach(e=>{const k=e.dataset.sv;e.textContent=k==='r90'?r90:k==='s1'?SV[0].toFixed(2):k==='s0'?D.sv0[0].toFixed(1):pct(+k)});
  function draw(R,k,e){const P=R.P;R.grid(-3.6,3.6,-3.4,3.4,.5);
    const lit=RK[k],prev=RK[Math.max(0,k-1)],cur=k===0?0:Math.round(lerp(prev,lit,k===1?1:e)),acc=mix(P.paper,P.acc,.75);
    for(let i=n-1;i>=0;i--){const [x,z]=pos(i),h=Math.max(.006,SV[i]*SV[i]/s0*HM*(k===0?Math.min(1,e*1.3):1)),on=i<cur;
      R.box([x,0,z],[w,h,w],{fill:on?acc:P.paper,a:on?1:(k===0?1:.55),shadow:false,lw:.5})}
    // the share held by the lit columns, written above the field
    if(k>=1){R.label([0,.05,-(G/2)*cell],'rank '+cur+' · '+pct(Math.max(1,cur))+' of ‖ΔW‖²',{mono:true,fs:14,b:1,c:P.acc,dy:-30})}
    else R.label([0,.05,-(G/2)*cell],'576 singular values of ΔW, tallest first',{mono:true,fs:13.5,b:1,c:P.ink,a:e,dy:-30});
    // the first column and the last, named on the field (side labels, wide screens only)
    const f=pos(0);R.label([f[0],SV[0]*SV[0]/s0*HM,f[1]],'σ₁ = '+SV[0].toFixed(2),{mono:true,fs:12,al:'right',dx:-10,c:P.ink,a:k<=2?1:.6,wide:1});
    const l=pos(n-1);R.label([l[0],0,l[1]],'σ₅₇₆',{mono:true,fs:12,al:'left',dx:10,c:P.mute,a:k===0||k===4?1:.5,wide:1});
  }
  const full={cam:[.35,.72],bounds:[[-3,0,-3.1],[3,1.2,2.9]]},close={cam:[.45,.64],bounds:[[-2.9,0,.2],[1.4,1.9,2.9]]};
  S3.stage({id:'stg-sv',list:'sx-sv',fig:'Fig. 3 · the real update to one query matrix, direction by direction',cam:full.cam,bounds:full.bounds,aspect:.66,dur:1500,hold:4600,draw,
    margin:w=>w<520?[16,10,12,10]:[24,30,16,30]});
})();
