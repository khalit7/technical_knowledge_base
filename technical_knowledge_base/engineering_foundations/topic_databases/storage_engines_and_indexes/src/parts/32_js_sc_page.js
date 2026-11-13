// ---- Scene, Fig. 2 (section 1): page 0 of messages to scale, from pageinspect (SE.m1.page0_header, page0_items), renderer v2 ----
// The 8,192 bytes are drawn as 8 rows of 1,024 (row 0 at the back): the header and line pointers grow forward from byte 0,
// the tuples backward from byte 8,192, and the free space is what is left between lower and upper. Every offset and length is the measured one.
(function(){
  if(!document.getElementById('stg-page')||!window.SE)return;const {at,off,lerp,mix}=S3;
  const M=SE.m1,H=(M.page0_header&&M.page0_header[0])||M.page0_header,IT=M.page0_items,PS=8192,RW=1024,X0=-5,XW=10/RW,ZR=r=>-1.95+r*.56;
  const LO=H.lower,UP=H.upper,NI=IT.length,T1=IT.find(t=>t.lp===1);
  const xz=b=>[X0+(b%RW)*XW,ZR(Math.floor(b/RW))];
  // a byte range as boxes, split where it wraps to the next row
  function seg(R,b0,b1,h,o){while(b0<b1){const r=Math.floor(b0/RW),e=Math.min(b1,(r+1)*RW),x0=X0+(b0-r*RW)*XW,x1=X0+(e-r*RW)*XW;
      R.box([(x0+x1)/2,.04,ZR(r)],[Math.max(.012,(x1-x0)-.008),h,.4],Object.assign({shadow:false,lw:.55},o));b0=e}}
  function draw(R,k,e){const P=R.P;R.grid(-6,6,-2.6,2.6,.5);
    for(let r=0;r<8;r++){for(let j=0;j<16;j++)R.box([X0+.3125+j*.625,0,ZR(r)],[.625,.035,.44],{fill:mix(P.paper,P.line,.35),a:1,shadow:false,lw:.35,ea:.35});
      R.label([X0,0,ZR(r)],(r*RW).toLocaleString('en-US'),{al:'right',dx:-8,mono:true,fs:12,c:P.mute,grp:'b'})}
    R.label([X0+10,0,ZR(7)],'8,192',{al:'left',dx:8,mono:true,fs:12,c:P.mute,wide:1});
    const focus=k===4||k===5||k===6,dim=focus?.35:1;
    // the header (24 bytes)
    const ha=at(k,e,1);seg(R,0,24,.3,{fill:mix(P.paper,P.c4,.7),a:ha});
    if(k===1){R.glow([X0+.12,.3,ZR(0)],.5,{c:P.c4,a:e*.7});R.label([X0+.12,.34,ZR(0)],'header · 24 bytes',{fs:12.5,b:1,c:P.c4,a:e,dy:-14})}
    // line pointers, 4 bytes each, growing forward
    const np=k<2?0:k===2?Math.round(NI*e):NI;
    for(let i=0;i<np;i++)seg(R,24+i*4,28+i*4,.18,{fill:i===0&&k>=5?P.acc:mix(P.paper,P.c1,.6),a:i===0&&k>=5?1:dim,lw:.4});
    if(k===2)R.label([X0+(24+np*4)*XW,.2,ZR(0)],'lower = '+(24+np*4),{fs:12.5,b:1,c:P.c1,dy:-16});
    // tuples, placed backward from the end in slot order
    const nt=k<3?0:k===3?Math.round(NI*e):NI;
    IT.slice(0,nt).forEach((t,i)=>{const sel=t.lp===1&&k>=5;if(sel&&k===6)return;seg(R,t.lp_off,t.lp_off+t.lp_len,.22,{fill:sel?P.acc:mix(P.paper,i%2?P.c3:P.c6,.45),a:sel?1:dim})});
    if(k===3){const last=IT[Math.max(0,nt-1)],p=xz(last.lp_off);R.label([p[0],.24,p[1]],'upper = '+last.lp_off,{fs:12.5,b:1,c:P.c3,dy:-16})}
    // free space between lower and upper
    if(k>=4){const a=k===4?e:.6,x0=X0+LO*XW,x1=X0+UP*XW;R.quad([[x0,.05,ZR(0)-.22],[x1,.05,ZR(0)-.22],[x1,.05,ZR(0)+.22],[x0,.05,ZR(0)+.22]],{fill:mix(P.paper,P.bad,.25),ec:P.bad,a,dash:[4,3]});
      if(k===4){R.glow([(x0+x1)/2,.1,ZR(0)],.6,{c:P.bad,a:e*.6});R.label([(x0+x1)/2,.1,ZR(0)],'free · '+(UP-LO)+' bytes',{fs:12.5,b:1,c:P.bad,dy:-18,a:e})}}
    // a ctid: line pointer 1 holds the tuple's offset and length
    if(k===5){const a=[X0+26*XW,.2,ZR(0)],p=xz(T1.lp_off+T1.lp_len/2),b=[p[0],.24,p[1]];R.flowArc(a,b,1.3,{c:P.acc,a:e,r:.07});R.arc(a,b,1.3,{c:P.acc,w:1.6,t:e,a:.6});
      R.label(a,'line pointer 1',{fs:12.5,b:1,c:P.acc,dy:-16});R.label(b,'(0,1): offset '+T1.lp_off+', '+T1.lp_len+' bytes',{fs:12.5,b:1,c:P.acc,dy:-18,a:e})}
    // inside the tuple: a 24-byte header, then the row's data
    if(k===6){const hb=T1.t_hoff||24;seg(R,T1.lp_off,T1.lp_off+hb,.34,{fill:P.c2,a:1});seg(R,T1.lp_off+hb,T1.lp_off+T1.lp_len,.22,{fill:mix(P.paper,P.acc,.55),a:1});
      const ph=xz(T1.lp_off+hb/2),pd=xz(T1.lp_off+hb+(T1.lp_len-hb)/2);
      R.label([ph[0],.38,ph[1]],'header: xmin '+T1.t_xmin+', xmax '+T1.t_xmax+', t_ctid '+T1.t_ctid,{al:'right',fs:12.5,b:1,c:P.c2,dx:-4,dy:-28});
      R.label([pd[0],.24,pd[1]],'data: '+(T1.lp_len-hb)+' bytes',{fs:12.5,b:1,c:P.acc,dy:-14})}
  }
  const full={cam:[.08,.95],bounds:[[-5.3,0,-2.3],[5.3,.4,2.3]]};
  S3.stage({id:'stg-page',list:'sx-page',fig:'Fig. 2 · page 0 of messages, to scale',cam:full.cam,bounds:full.bounds,aspect:.4,dur:1500,hold:4600,draw,
    margin:w=>w<520?[16,8,14,8]:[22,56,16,56],
    view:k=>k===6?{cam:[.1,.9],bounds:[[.6,0,.4],[5.3,.5,2.4]]}:full});
})();
