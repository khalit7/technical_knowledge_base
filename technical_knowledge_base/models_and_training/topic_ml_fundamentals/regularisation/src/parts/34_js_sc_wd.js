// ---- Scene (section 3, Fig. 3): Adam with L2 in the loss against AdamW, six weights each, on the same noise (renderer v2) ----
// Data: RGW.sim() (26_js_wd_sim.js), checked against torch.optim.Adam and AdamW by check_wd.py: six weights start at 1, each gets pure Gaussian
// noise of standard deviation 1e-4 ... 10 as its gradient (illustrative noise), lr 1e-3, λ = 0.1, 3,000 steps, frames every 100 steps.
// Front row: Adam with L2 in the loss; back row: AdamW (decoupled). The glass sheet is decay alone, (1 − ηλ)^t. Four steps; steps 2 to 4
// play their stretch of frames (0 → 2,000, 0 → 2,000, 2,000 → 3,000) during the step. Flow density on each column is its measured decay rate.
// The step list's numbers are static spans (data-wd) written from the same run; check_stages.mjs compares them.
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-wd')||!window.S3||!window.RGW)return;const {at,off,lerp,mix}=S3;
  const W=RGW.sim(),n=W.sig.length,pure=t=>Math.pow(1-W.lr*W.lam,t),fr=(m,f)=>W.frames[m][Math.max(0,Math.min(30,f))];
  // value at a fractional frame (linear between the recorded frames, every 100 steps)
  const val=(m,i,f)=>{const a=Math.floor(f),b=Math.min(30,a+1),u=f-a;return lerp(fr(m,a)[i],fr(m,b)[i],u)};
  const sigs=['10⁻⁴','10⁻³','10⁻²','10⁻¹','1','10'];
  const F2=v=>v.toFixed(2),FMT={l2q:()=>F2(fr('l2',20)[0]),l2loud:()=>F2(fr('l2',20)[5]),pure2:()=>F2(pure(2000)),aw2lo:()=>F2(Math.min(...fr('adamw',20))),aw2hi:()=>F2(Math.max(...fr('adamw',20))),
    l2mid:()=>F2(fr('l2',20)[3]),pure3:()=>F2(pure(3000)),l2q3:()=>fr('l2',30)[0].toExponential(0).replace('e-','e−'),l2loud3:()=>F2(fr('l2',30)[5]),aw3lo:()=>F2(Math.min(...fr('adamw',30))),aw3hi:()=>F2(Math.max(...fr('adamw',30)))};
  document.querySelectorAll('[data-wd]').forEach(e=>{const f=FMT[e.dataset.wd];if(f)e.textContent=f()});
  window.RG_WD=FMT;
  const XS=1.25,x=i=>(i-(n-1)/2)*XS,ZF=1.1,ZB=-1.1,HT=2.6,BW=.62;
  // the frame shown for row m at step k, progress e
  function frameOf(m,k,e){if(k===0)return 0;if(k===1)return m==='adamw'?20*e:0;if(k===2)return m==='l2'?20*e:20;return 20+10*e}
  function draw(R,k,e){const P=R.P,cL=P.c2,cW=P.c1,cD=P.c3;R.grid(-4.6,4.6,-2.8,2.8,.5);
    const fL=frameOf('l2',k,e),fW=frameOf('adamw',k,e),aL=k===1?.1:1,aW=k===2?.3:1;
    // decay alone, as a glass sheet across both rows at (1 − ηλ)^t, t the back row's step (the front row's in step 3)
    const tD=100*(k===2?fL:fW),yD=HT*pure(tD);
    R.glass([x(0)-.6,yD,ZF+.55],[x(n-1)-x(0)+1.2,0,0],[0,0,ZB-ZF-1.1],{c:cD,a:.42,nu:6,nv:2,th:.01});
    R.label([x(0)-.6,yD,ZB-.55],'decay alone (glass) · '+pure(tD).toFixed(3),{fs:12.5,mono:true,b:1,al:'right',dx:-8,c:cD,grp:'rows'});
    [['l2',ZF,cL,aL,fL],['adamw',ZB,cW,aW,fW]].forEach(([m,zr,col,a,f])=>{
      R.box([0,0,zr],[x(n-1)-x(0)+1.2,.06,.9],{a:a*.9,shadow:false});
      for(let i=0;i<n;i++){const v=val(m,i,f),hgt=Math.max(.02,HT*v);R.box([x(i),.06,zr],[BW,hgt,BW],{fill:mix(P.paper,col,.75),a});
        // values only on the row the step is about (both rows at step 4 would collide: the back row's range is in the step text)
        const lab=(k===1&&m==='adamw')||((k===2||k===3)&&m==='l2');if(lab)R.label([x(i),.06+hgt,zr],v.toFixed(2),{fs:12,mono:true,dy:-10,c:col,b:1,a});
        // the decay at work: dots stream down each column in proportion to how fast it is shrinking now (frames 100 steps apart)
        const moving=(k===1&&m==='adamw')||(k===2&&m==='l2')||k===3;
        if(moving){const g=Math.max(0,val(m,i,Math.max(0,f-1))-val(m,i,f));if(g>.004)R.flow([[x(i),.06+hgt+.9,zr],[x(i),.06+hgt+.05,zr]],{c:col,a:a*Math.min(1,.35+g*6),r:.07,speed:.9,n:Math.max(2,Math.min(9,Math.round(2+g*60))),top:1})}}});
    // σ of each weight's gradient noise, once, under the front row
    for(let i=0;i<n;i++)R.label([x(i),0,ZF+.6],'σ '+sigs[i],{fs:12,mono:true,dy:12,c:P.mute});
    R.label([x(0)-.7,.35,ZF],'Adam, L2 in the loss',{fs:12.5,b:1,al:'right',dx:-8,c:cL,a:Math.max(.45,aL),grp:'rows'});
    R.label([x(0)-.7,.35,ZB],'AdamW, decoupled',{fs:12.5,b:1,al:'right',dx:-8,c:cW,a:Math.max(.45,aW),grp:'rows'});
    R.label([0,HT+.85,ZB-.5],'step '+Math.round(100*(k===2?fL:fW)).toLocaleString('en-GB')+' of 3,000'+(k===1?' · AdamW':k===2?' · Adam with L2':''),{fs:13,mono:true,b:1,c:k===1?cW:k===2?cL:P.ink});
  }
  S3.stage({id:'stg-wd',list:'sx-wd',fig:'Fig. 3 · six weights, pure-noise gradients, decay only',cam:[.42,.36],bounds:[[-4.4,0,-2.2],[4.4,HT+.9,2.2]],aspect:.52,dur:3600,hold:4600,draw,
    view:k=>k===1?{cam:[.32,.32],bounds:[[-4.4,0,-2.4],[4.4,HT+.9,.6]]}:k===2?{cam:[.5,.32],bounds:[[-4.4,0,-.4],[4.4,HT+.9,2.2]]}:null,
    margin:w=>w<520?[16,10,14,10]:[18,16,16,150]});
})();
