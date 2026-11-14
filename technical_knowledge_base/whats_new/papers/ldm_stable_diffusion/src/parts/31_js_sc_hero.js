// ---- Scene: Fig. 1, the paper's Figure 3 run by the page's own toy (renderer v2: glass plates, flowing dots, camera per step) ----
// Every grid is drawn flat, one tile per number at one cell size, so the 32 x 32 x 3 image and the 8 x 8 x 3 latent are to scale (three channel layers each).
// Data: the toy f = 4 autoencoder encodes a rendered "red circle, top left" (TOY.render, size 6, grain seed 11); the toy latent model's own DDIM chain
// (20 steps, guidance 3, seed 3: the chain the Idea animation replays) starts from its noise, with every cross-attention map kept; tau_theta's three
// token vectors are the real 24 numbers; the decoder output is graded by the page's checker. MACs are counted by the JavaScript as it runs.
(function(){
  if(!document.getElementById('stg-hero')||!window.S3||typeof LDM==='undefined')return;const {at,off,mix}=S3;
  const PR=[0,0,0],SEED=3,S=20,U=.085,GAP=.42,LY=[.1,.1+GAP,.1+2*GAP];
  const XP=-4.3,XE=-2.35,XL=-1.15,XD=2.55,XO=4.3,UN=[[.05,1.05,8,16,'down'],[.65,.65,4,28,'mid'],[1.25,1.05,8,16,'up']],ZT=1.35,TX=[-.15,.6,1.35];
  let D=null;
  function compute(){if(D)return D;const ids=TOY.tokens(...PR),W=LDM.weights('dm_f4'),sc=W.cfg.scale;
    const img=TOY.render({shape:PR[1],size:6,cx:TOY.CEN[PR[2]%3],cy:TOY.CEN[(PR[2]/3)|0],bg:[.82,.81,.8],col:TOY.RGB[PR[0]],seed:11});
    const enc=LDM.aeEncode('ae4',img),z=enc.mu.map(v=>v*sc);
    LDM.resetMacs();const ch=LDM.chain('dm_f4',ids,{S,scale:3,seed:SEED,keepAtt:true}),Z=[Float32Array.from(ch.x)],att=[[0,0,0],[0,0,0],[0,0,0]];let st;
    while((st=ch.next())){Z.push(Float32Array.from(st.x));st.att.forEach((m,l)=>{const a=m.att,n=a.length/3;for(let i=0;i<n;i++)for(let j=0;j<3;j++)att[l][j]+=a[i*3+j]/n/S})}
    const chainMacs=LDM.macs;LDM.resetMacs();const out=LDM.toImage('dm_f4',Z[S]),decMacs=LDM.macs,chk=TOY.check(out),tok=LDM.tau(W,ids);
    const ok=chk.valid&&chk.colour===PR[0]&&chk.shape===PR[1]&&chk.pos===PR[2];
    const pixMacs=((PAPER.rc||{}).toy||{}).pix?PAPER.rc.toy.pix.macs*2*S:null;
    const za=[...z,...Z[S]].map(Math.abs).sort((a,b)=>a-b),zl=za[Math.floor(.9*za.length)];  // colour scale: the 90th percentile of |z|, so most tiles show their sign
    D={img,z,Z,att,out,ok,chk,tok,chainMacs,decMacs,pixMacs,zl,mt:Math.max(...tok.map(v=>Math.max(...v.map(Math.abs))))};
    const put=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
    put('hr-chk',ok?'reads it back as red circle, top left':'reads it as '+(chk.valid?TOY.COL[chk.colour]+' '+TOY.SH[chk.shape]+', '+TOY.POS[chk.pos]:'no clean shape'));
    put('hr-mac',(chainMacs/1e6).toFixed(0)+' million');put('hr-dec',(decMacs/1e6).toFixed(1)+' million');
    if(pixMacs)put('hr-pix',(pixMacs/1e6).toFixed(0)+' million');
    const pc=v=>Math.round(100*v)+'%';put('hr-att',['red','circle','top left'].map((t,j)=>'"'+t+'" '+pc(att[0][j])).join(', '));
    return D}
  // a flat grid layer of n x n tiles at height y, centred on (xc, zc); col(i) gives tile i's colour (row-major)
  function layer(R,xc,zc,y,n,col,a){if(a<=.01)return;const w=n*U,x0=xc-w/2,z0=zc-w/2,G=[];
    for(let r=0;r<=n;r++)for(let c=0;c<=n;c++)G.push(R.p([x0+c*U,y,z0+r*U]));
    const cs=[];for(let i=0;i<n*n;i++)cs.push(col(i));const zz=R.p([xc,y,zc])[2];
    R.q.push({z:zz,f:cx=>{cx.globalAlpha=a;for(let r=0;r<n;r++)for(let c=0;c<n;c++){const p=G[r*(n+1)+c],q=G[r*(n+1)+c+1],s=G[(r+1)*(n+1)+c+1],t=G[(r+1)*(n+1)+c];
      cx.fillStyle=cs[r*n+c];cx.beginPath();cx.moveTo(p[0],p[1]);cx.lineTo(q[0],q[1]);cx.lineTo(s[0],s[1]);cx.lineTo(t[0],t[1]);cx.closePath();cx.fill()}
      cx.globalAlpha=a*.8;cx.strokeStyle='rgba(120,120,120,.8)';cx.lineWidth=.8;const c0=G[0],c1=G[n],c2=G[(n+1)*(n+1)-1],c3=G[n*(n+1)];cx.beginPath();cx.moveTo(c0[0],c0[1]);cx.lineTo(c1[0],c1[1]);cx.lineTo(c2[0],c2[1]);cx.lineTo(c3[0],c3[1]);cx.closePath();cx.stroke()}})}
  const css=c=>'rgb('+c.map(Math.round).join(',')+')';
  const HUE=[[214,48,49],[46,150,72],[52,92,214]];
  // an image tensor (3 x 32 x 32 in [-1, 1]): channel c's layer shades from black (0) to its own hue (1)
  function image(R,xc,img,a){for(let c=0;c<3;c++)layer(R,xc,0,LY[c],32,i=>{const v=Math.max(0,Math.min(1,(img[c*1024+i]+1)/2));return css(HUE[c].map(h=>h*v+18*(1-v)))},a)}
  // a latent (3 x 8 x 8): diverging, orange positive, blue negative, against the paper colour
  function latent(R,xc,z,a){const P=R.P,lim=D.zl;for(let c=0;c<3;c++)layer(R,xc,0,LY[c],8,i=>{const v=Math.max(-1,Math.min(1,z[c*64+i]/lim));return css(mix(P.paper,v>=0?P.c2:P.c1,Math.abs(v)))},a)}
  // a vector as signed bars on a white plinth (the reference look)
  function comb(R,c,vals,m,col,a,hmax,wd){if(a<=.01)return;const nb=vals.length,bw=wd/nb;R.box([c[0],c[1]-.04,c[2]],[wd+.1,.04,.26],{a,shadow:false});
    vals.forEach((v,i)=>{const h=Math.max(.012,Math.abs(v)/m*hmax),bx=c[0]-wd/2+bw*(i+.5);R.box([bx,v>=0?c[1]:c[1]-.04-h,c[2]],[bw*.7,h,.09],{fill:col,a,shadow:false,lw:.6})})}
  function draw(R,k,e){const P=R.P,T=compute();R.grid(-6,6,-2,2.2,.5);
    // 1-2: the image, and the encoder squeezing it
    const ia=k<=1?1:k===2?1-.75*e:k===3?.25*(1-e):k<=5?0:k===6?.25*e:.25;image(R,XP,T.img,ia);   // steps 4 to 6 frame the latent side, so the image leaves rather than sit cut at the edge
    if(k<=1||k>=6)R.label([XP,LY[2]+.15,-1.5],'x · 32 × 32 × 3 = 3,072 numbers',{mono:true,fs:12,c:P.ink,a:k>=6?.6:1,dy:-6});
    if(k===0)['R','G','B'].forEach((t,c)=>R.label([XP-1.36,LY[c],1.36],t,{mono:true,fs:12,b:1,c:HUE[c],al:'right',dx:-6}));
    const ea=k===1?Math.min(1,e*1.6):k>=2?.3:0;
    if(ea>0){R.glass([XE,0,-.75],[0,0,1.5],[0,.95,0],{c:P.c1,a:ea,nu:4,nv:4});R.label([XE,1.05,0],'ℰ',{serif:true,fs:16,b:1,c:P.c1,a:ea,dy:-6})}
    if(k===1)[[-.6,-.6],[.6,-.4],[0,.1],[-.4,.6],[.5,.55]].forEach(([dz,dx],i)=>R.flow([[XP+dx,LY[2]+.05,dz],[XE,.45,dz*.5],[XL,LY[1],dz*.2]],{c:P.c1,a:e,r:.06,speed:1.2,n:7}));
    // the latent: encoded at step 2, replaced by the chain's noise at step 3, denoised at step 5
    const j=k<=3?0:k===4?Math.round(e*S):S,zc=k<=1?T.z:k===2?(e<.5?T.z:T.Z[0]):T.Z[j],la=k===0?0:k===1?e:k===2&&e<.5?1-e:1;
    if(k===2&&e<.5)latent(R,XL,T.z,1-2*e);else latent(R,XL,zc,k===1?e:k===2?2*e-1:1);
    const zl=k===1?'z = ℰ(x) · 8 × 8 × 3 = 192':k===2&&e>=.5||k===3?'z_T · 192 numbers of noise':k===4?'z_t · DDIM step '+j+' of 20':k>=5?'z_0 · 192 numbers':'';
    if(k>=1&&k<=5)R.label([XL,LY[2]+.15,-.5],zl,{mono:true,fs:12,c:P.ink,a:la>.05?1:0,dy:-8});
    // 4: tau_theta's three token vectors
    const ta=k===3?e:k===4?1:k>=5?.25:0,TOK=['red','circle','top left'];
    TX.forEach((x,i)=>{comb(R,[x,.32,ZT],T.tok[i],T.mt,P.k,ta,.28,.6);if(k<=4)R.label([x,0,ZT+.2],TOK[i],{serif:true,fs:13,b:1,c:P.k,a:ta,dy:12})});
    if(ta>0&&k<=4)R.label([TX[0]-.45,.35,ZT],'τθ(y) · 3 × 24',{al:'right',mono:true,fs:12,c:P.k,a:ta,dx:-6,grp:'tk'});
    // 5: the UNet on the small tensor, three cross-attention levels reading the tokens
    const ua=k===4?Math.min(1,e*2):k===3?at(k,e,3)*.4:k>=5?.25:0;
    if(ua>0){UN.forEach(([x,y,n,c,nm])=>{const w=n*U;R.glass([x-w/2,y,-w/2],[w,0,0],[0,0,w],{c:P.c4,a:ua,nu:n,nv:n,th:.03});
        if(k===4)R.label([x,y+.02,w/2],n+' × '+n+' × '+c,{mono:true,fs:12,c:P.c4,a:ua,dy:14,grp:'un'})});
      R.label([UN[1][0],UN[0][1]+.3,-.4],'εθ · UNet',{serif:true,fs:15,b:1,c:P.c4,a:ua,dy:-4})}
    if(k===4){const pts=[[XL,LY[2],0],[UN[0][0],UN[0][1],0],[UN[1][0],UN[1][1],0],[UN[2][0],UN[2][1],0]];
      R.flow(pts,{c:P.c4,a:ua,r:.06,speed:1.1});R.flowArc([UN[2][0],UN[2][1],.1],[XL,LY[2]+.05,.1],.45,{c:P.c4,a:ua*.8,r:.05,speed:1.1,n:6});
      R.flowArc([UN[0][0],UN[0][1]+.02,-.2],[UN[2][0],UN[2][1]+.02,-.2],.35,{c:P.mute,a:ua*.6,r:.04,n:4});
      UN.forEach(([x,y],l)=>TX.forEach((tx,t)=>{const w=T.att[l][t];R.flow([[tx,.5,ZT],[x,y,.2]],{c:P.k,a:ua*(.25+.75*Math.min(1,w*2)),r:.035+.05*w,n:Math.max(2,Math.round(2+w*12)),speed:1.3})}))}
    // 6: the decoder, once
    const da=k===5?Math.min(1,e*1.6):k>=6?.6:0;
    if(da>0){R.glass([XD,0,-.75],[0,0,1.5],[0,.95,0],{c:P.c1,a:da,nu:4,nv:4});R.label([XD,1.05,0],'𝒟',{serif:true,fs:16,b:1,c:P.c1,a:da,dy:-6})}
    if(k===5)[[-.3,0],[.3,.1],[0,-.2]].forEach(([dz])=>R.flow([[XL,LY[1],dz*.3],[XD,.45,dz],[XO,LY[1],dz*3]],{c:P.c1,a:e,r:.06,speed:1.2,n:8}));
    const oa=k===5?e:k>=6?1:0;image(R,XO,T.out,oa);
    if(oa>0)R.label([XO,LY[2]+.15,-1.5],'x̃ = 𝒟(z_0) · '+(T.ok?'✓ ':'✗ ')+'checker',{mono:true,fs:12,c:T.ok?P.good:P.bad,a:oa,dy:-6});
    if(k>=6)R.label([0,1.55,-1],'3,072 → 192 → 20 guided steps on 192 → 3,072',{mono:true,fs:12.5,b:1,c:P.ink,a:e,wide:1})}
  const full={cam:[.28,.6],bounds:[[-5.9,0,-1.6],[5.9,1.6,1.8]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · the paper\'s Figure 3, run by the toy',cam:full.cam,bounds:full.bounds,aspect:.6,dur:2200,hold:4600,draw,
    view:k=>k===0?{cam:[.3,.42],bounds:[[XP-1.5,0,-1.5],[XP+1.5,1.1,1.5]]}:k===1?{cam:[.3,.62],bounds:[[XP-1.5,0,-1.5],[XL+.5,1.1,1.5]]}:k===2?{cam:[.35,.66],bounds:[[XL-.9,0,-.9],[XL+.9,1,.9]]}:
      k<=4?{cam:[.3,.62],bounds:[[XL-.6,0,-.7],[TX[2]+.6,1.5,ZT+.4]]}:k===5?{cam:[.3,.6],bounds:[[XL-.6,0,-1.5],[XO+1.5,1.2,1.5]]}:full,
    margin:w=>w<520?[14,10,14,10]:[16,14,14,16]});
})();
