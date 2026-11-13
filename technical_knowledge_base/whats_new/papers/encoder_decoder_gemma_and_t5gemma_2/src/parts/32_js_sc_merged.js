// ---- Scene (Fig. 2): T5Gemma 2's merged attention (Equations 1 to 5) against separate self- and cross-attention, renderer v2 ----
// The numbers are 13_js_merged.js's (window.MG): one head, d_h = 4, m = 4 decoder tokens, n = 6 encoder tokens, seeded standard-normal weights
// (illustrative inputs; the equations are the paper's). The plate on the floor is the mask: rows are decoder queries, columns the keys.
// The stage follows the widget's row, encoder relevance and weights when the reader changes them.
(function(){
  if(!document.getElementById('stg-mg')||!window.MG)return;const {at,off,lerp,mix}=S3;
  const m=MG.m,n=MG.n,C=.78,GAP=1.2,HB=2.2,ZK=-2.35,X0=-4.0;
  const zr=i=>-1.15+i*C;
  // a vector as signed bars on a white plinth (positive up, negative hanging below), as in the reference scene
  function comb(R,c,vals,mx,col,a,hmax,wd){if(a<=.01)return;const nb=vals.length,bw=wd/nb;
    R.box([c[0],c[1]-.04,c[2]],[wd+.1,.04,.26],{a,shadow:false});
    vals.forEach((v,i)=>{const hg=Math.max(.012,Math.abs(v)/mx*hmax),bx=c[0]-wd/2+bw*(i+.5);R.box([bx,v>=0?c[1]:c[1]-.04-hg,c[2]],[bw*.72,hg,.1],{fill:col,a,shadow:false,lw:.6})})}
  const pct=v=>(100*v).toFixed(v<.095?1:0)+'%';
  function draw(R,k,e){const P=R.P,S=MG.state(),W=S.W,r=S.r,row=S.row,ri=row-1;R.grid(-5.4,5.4,-2.9,1.9,.5);
    // the gap between the self-attention keys and the encoder keys closes at step 4 (the merge)
    const g=k<3?GAP:k===3?GAP*(1-e):0,x=j=>X0+j*C+(j>=m?g:0);
    const mx=Math.max(...W.Q.flat(),...W.Kx.flat(),...W.Kh.flat(),...W.Q.flat().map(v=>-v),...W.Kx.flat().map(v=>-v),...W.Kh.flat().map(v=>-v));
    const selfOn=at(k,e,1),crossOn=at(k,e,2),focusSelf=k===1,focusCross=k===2;
    // the keys: decoder tokens' (orange edge) and the encoder output's (purple), each a 4-number key vector on a plinth
    for(let j=0;j<m+n;j++){const enc=j>=m,a=k===0?1:k===1?(enc?.25:j<row?1:.3):k===2?(enc?1:.25):(enc||j<row?.85:.3);
      comb(R,[x(j),.22,ZK],enc?W.Kh[j-m]:W.Kx[j],mx,enc?mix(P.paper,P.c4,.75):mix(P.paper,P.k,.75),a,.6,C*.74);
      if(j===0||j===m)R.label([x(j)-C*.5,.22,ZK],enc?'encoder output H · 6 keys':'decoder tokens X · 4 keys',{al:'left',dx:-2,dy:-46,fs:12,b:1,c:enc?P.c4:P.k,a:Math.max(.6,a),wide:1})}
    // the queries: one per decoder token, at the left of its row of the mask
    for(let i=0;i<m;i++){const a=i===ri?1:k===0?.8:.3;comb(R,[x(0)-1.25,.22,zr(i)],W.Q[i],mx,mix(P.paper,P.q,.75),a,.5,.7);
      R.label([x(0)-1.65,.1,zr(i)],'token '+(i+1),{al:'right',dx:-6,mono:true,fs:12,c:i===ri?P.q:P.mute,b:i===ri,a:Math.max(.5,a),grp:'q'})}
    // the mask plates: self-attention (causal, 4 × 4) and cross-attention (open, 4 × 6); from step 4 one plate, 4 × 10
    const pa=k===0?.35:1;
    R.glass([x(0)-C/2,.02,zr(0)-C/2],[m*C,0,0],[0,0,m*C],{c:P.acc,a:pa*Math.max(.35,selfOn),nu:m,nv:m,th:.03});
    R.glass([x(m)-C/2,.02,zr(0)-C/2],[n*C,0,0],[0,0,m*C],{c:P.c4,a:pa*Math.max(.35,crossOn),nu:n,nv:m,th:.03});
    for(let i=0;i<m;i++)for(let j=0;j<m;j++)if(j>i){const cx=x(j),cz=zr(i);R.quad([[cx-C*.45,.06,cz-C*.45],[cx+C*.45,.06,cz-C*.45],[cx+C*.45,.06,cz+C*.45],[cx-C*.45,.06,cz+C*.45]],{fill:P.ink,fa:.3,a:pa,edge:false})}
    // the current row's weights as bars on the plate: separate softmaxes (each sums to 1), then one merged softmax
    const t=k<4?0:k===4?e:1;
    for(let j=0;j<row+n;j++){const enc=j>=row,col=enc?j-row+m:j,sep=enc?r.pc[j-row]:r.ps[j],mer=r.pm[j];
      const show=enc?(k>=2?(k===2?e:1):0):(k>=1?(k===1?e:1):0);if(show<=.01)continue;
      const w=lerp(sep,mer,t),hg=Math.max(.015,w*HB*show),c=enc?P.c4:P.acc,dim=(focusSelf&&enc)||(focusCross&&!enc)?.35:1;
      R.box([x(col),.06,zr(ri)],[C*.55,hg,C*.55],{fill:mix(P.paper,c,.35+.65*Math.min(1,w*2)),a:dim,shadow:false,lw:.6});
      if(w>=.005)R.label([x(col),.06+hg,zr(ri)],pct(w),{mono:true,fs:12,dy:-10,c:c,a:dim*show,wide:1})}
    // the query reads its keys: dots stream from the query to each key it may see
    const qp=[x(0)-1.25,.5,zr(ri)];
    // the current row, marked on the plate
    if(k>=1){const z0=zr(ri)-C/2,z1=zr(ri)+C/2,xa=x(0)-C/2,xb=x(m+n-1)+C/2;R.quad([[xa,.045,z0],[xb,.045,z0],[xb,.045,z1],[xa,.045,z1]],{fill:P.q,fa:.14,a:1,ec:P.q,ea:.6,lw:1.2})}
    if(k===1)for(let j=0;j<row;j++)R.flowArc(qp,[x(j),.6,ZK],.5,{c:P.q,a:e*.85,r:.05,speed:1.5,n:6});
    if(k===2)for(let j=m;j<m+n;j++)R.flowArc(qp,[x(j),.6,ZK],.7,{c:P.q,a:e*.85,r:.05,speed:1.5,n:6});
    // labels on the groups
    const mid=(a,b)=>(x(a)+x(b))/2,zl=zr(m-1)+C*.6;
    if(k>=1&&k<4)R.label([mid(0,m-1),0,zl],'self: one softmax over '+row+' keys = 1',{fs:12.5,b:1,c:P.acc,dy:14,a:selfOn*(k===2?.55:1)});
    if(k>=2&&k<4)R.label([mid(m,m+n-1),0,zl],'cross: its own softmax over '+n+' keys = 1',{fs:12.5,b:1,c:P.c4,dy:14,a:crossOn});
    if(k===3)R.label([mid(0,m+n-1),0,zl],'one mask M: causal over decoder keys, open over encoder keys',{fs:12.5,b:1,c:P.ink,dy:34,a:e,wide:1});
    if(k>=4)R.label([mid(0,m+n-1),0,zl],'one softmax over '+(row+n)+' keys = 1 · encoder share '+pct(r.enc),{fs:12.5,b:1,c:P.ink,dy:14,a:k===4?e:1});
    // the output: every visible value streams into z in proportion to its weight
    if(k>=5){const zp=[x(m+n-1)+1.35,.75,zr(ri)];
      for(let j=0;j<row+n;j++){const enc=j>=row,col=enc?j-row+m:j,w=r.pm[j];if(w<.01)continue;
        R.flowArc([x(col),.55,ZK],zp,.6,{c:P.v,a:.25+.75*Math.min(1,w*2.5),r:.04+.06*w,n:Math.max(2,Math.round(3+w*14)),speed:1.2})}
      comb(R,[zp[0],zp[1],zp[2]],r.om,Math.max(...r.om.map(Math.abs),...r.os.map(Math.abs)),mix(P.paper,P.v,.75),e,.4,.6);
      R.label([zp[0],zp[1]+.5,zp[2]],'z, merged · cos '+r.cos.toFixed(2)+' with separate',{fs:12.5,b:1,c:P.v,dy:-6,a:e})}
  }
  const full={cam:[.3,.72],bounds:[[-5.9,0,-2.7],[6.3,1.7,1.3]]};
  const st=S3.stage({id:'stg-mg',list:'sx-mg',fig:'Fig. 2 · merged attention, one head, seeded weights',cam:full.cam,bounds:full.bounds,aspect:.52,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[18,14,18,60],
    // on a phone the labels hide, so the camera looks down from higher and closer, and the wide scene fills more of the card
    view:k=>innerWidth<520?{cam:[.2,1.05],bounds:k===1?[[-5.4,0,-2.8],[.4,1.2,1]]:[[-5.4,0,-2.8],[4.6,1.2,1]]}:k===1?{cam:[.25,.62],bounds:[[-5.9,0,-2.7],[.6,1.7,1.3]]}:full});
  if(st)MG.onChange=()=>st.draw();
})();
