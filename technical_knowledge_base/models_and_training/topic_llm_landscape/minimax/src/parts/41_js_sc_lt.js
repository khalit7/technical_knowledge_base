// ---- Scene (Fig. 3, stg-lt): lightning attention computed in blocks, on the page's four-token toy (scalar q, k, v; the worked example in the text).
// Rows from the back: the masked product of each block (a flat 2 x 2 glass plate, rows queries, columns keys), the tokens (k·v bars), the running
// sum or the carried state, the outputs. Steps: the four tokens; token by token (four dependent steps); cut into blocks of B = 2; block 1's masked
// product (intra-block); only the state S1 crosses the boundary; block 2 = intra-block part + q x S1 (inter-block). Every number is computed below. ----
(function(){
  if(!document.getElementById('stg-lt'))return;const {at,lerp,mix}=S3;
  const q=[1,2,1,3],k=[1,1,2,1],v=[2,1,1,3],kv=k.map((x,i)=>x*v[i]);
  const run=[];kv.reduce((s,x,i)=>(run[i]=s+x),0);const o=q.map((x,i)=>x*run[i]);           // running sums 2,3,5,8; outputs 2,6,5,24
  const blk=i=>i<2?0:1,S1=kv[0]+kv[1];                                                       // the state handed from block 1 to block 2
  const intra=q.map((x,i)=>{let s=0;for(let j=2*blk(i);j<=i;j++)s+=x*kv[j];return s});       // 2,6,2,15
  const inter=q.map((x,i)=>blk(i)?x*S1:0);                                                   // 0,0,3,9
  window.MM_LT={q,k,v,kv,run,o,intra,inter,S1};
  const ZP=-1.75,ZK=-.55,ZS=.55,ZO=1.65,HO=1.5/24,HK=.22,HS=.14,PS=1.2;
  const X=(i,g)=>(i-1.5)*1.25+(blk(i)?1:-1)*.8*g;                    // token x: one row, then two blocks pulled apart (g 0 to 1)
  const XB=b=>(X(2*b,1)+X(2*b+1,1))/2;
  function draw(R,kk,e,st){const P=R.P;R.grid(-5,5,-3.4,2.8,.5);
    const lab=(p,t,o)=>{const s=R.p(p);if(s[0]<-4||s[0]>R.W+4||s[1]<-4||s[1]>R.H+4)return;R.label(p,t,o)};
    const g=kk<2?0:kk===2?e:1,BC=b=>b?P.c3:P.c1,BL=b=>mix(BC(b),P.ink,.25);
    // which block a step is about (the other recedes)
    const cur=i=>kk<=2||(kk===3||kk===4)&&blk(i)===0||kk===5&&blk(i)===1;
    // block trays (from step 3)
    const ta=at(kk,e,2);
    if(ta>.01)[0,1].forEach(b=>{const x0=X(2*b,1)-.6,x1=X(2*b+1,1)+.6,on=kk===2||(b===0&&(kk===3||kk===4))||(b===1&&kk===5);
      R.quad([[x0,0,ZP-PS-.25],[x1,0,ZP-PS-.25],[x1,0,ZO+.55],[x0,0,ZO+.55]],{fill:BC(b),fa:on?.08:.04,ec:BC(b),ea:on?.7:.3,a:ta,dash:[5,4]});
      lab([(x0+x1)/2,0,ZO+.55],'block '+(b+1)+' (tokens '+(2*b+1)+', '+(2*b+2)+')',{fs:12.5,b:1,dy:14,c:BL(b),a:ta*(on?1:.5)})});
    // the four tokens: k·v as a purple bar on a white plinth
    q.forEach((_,i)=>{const x=X(i,g),a=cur(i)?1:.28;
      R.box([x,0,ZK],[.66,.06,.46],{a});R.box([x,.06,ZK],[.34,kv[i]*HK,.28],{fill:P.v,a,lw:.7});
      if(cur(i)){const la=kk===0?Math.max(.3,e):1;lab([x,.06+kv[i]*HK,ZK],'k·v = '+kv[i],{mono:true,fs:12,b:1,dy:-11,c:P.v,a:la});if(kk===0||kk===2||kk===3)lab([x,0,ZK+.23],'t'+(i+1)+' · q = '+q[i],{mono:true,fs:12,dy:11,c:P.ink,a:la})}});
    // the slots still to come (sums, outputs), dashed, so the layout is visible from the first step
    if(kk<=2)q.forEach((_,i)=>{const x=X(i,g),fp=(z,w)=>R.quad([[x-w,0,z-w],[x+w,0,z-w],[x+w,0,z+w],[x-w,0,z+w]],{fill:P.soft,fa:.5,ec:P.line,ea:.9,dash:[4,3]});fp(ZO,.24);if(kk<2)fp(ZS,.24)});
    if(kk===0){lab([X(3,0)+.3,0,ZS],'running sum',{al:'left',dx:10,fs:12,c:P.mute});lab([X(3,0)+.3,0,ZO],'output o',{al:'left',dx:10,fs:12,c:P.mute})}
    // token by token: a running sum handed from token to token (a chain); each output is q × sum
    const ca=kk===1?1:kk===2?1-e:0;
    if(ca>.01){q.forEach((_,i)=>{const x=X(i,g),ar=kk===1?Math.min(1,Math.max(0,e*4-i)):1,h=run[i]*HS;if(ar<=.01)return;
        R.box([x,0,ZS],[.48,h*ar,.48],{fill:mix(P.paper,P.c6,.6),a:ca,lw:.7});lab([x,h*ar,ZS],'sum '+run[i],{mono:true,fs:12,dy:-11,c:mix(P.c6,P.ink,.35),b:1,a:ca*ar});
        R.box([x,0,ZO],[.48,o[i]*HO*ar,.48],{fill:mix(P.paper,P.c2,.6),a:ca,lw:.7});lab([x,o[i]*HO*ar,ZO],'o = '+o[i],{mono:true,fs:12.5,dy:-11,b:1,c:mix(P.c2,P.ink,.2),a:ca*ar});
        R.flow([[x,.3,ZK+.2],[x,.2,ZS-.22]],{c:P.v,a:ca*ar,n:3,r:.06});
        if(i<3&&ar>=1)R.flowArc([x+.24,h*.6,ZS],[X(i+1,g)-.24,run[i+1]*HS*.6,ZS],.3,{c:P.c6,a:ca,n:5,r:.07,speed:1.2})});
      lab([X(3,g)+.3,run[3]*HS*.5,ZS],'4 dependent steps',{al:'left',dx:12,fs:12.5,b:1,c:mix(P.c6,P.ink,.35),a:ca*at(kk,e,1)})}
    // the masked product inside a block: a flat 2 x 2 glass plate behind it, rows = queries, columns = keys; the upper cell is masked
    const plate=(b,a)=>{if(a<=.01)return;const o0=[XB(b)-PS/2,.03,ZP];
      R.glass(o0,[PS,0,0],[0,0,-PS],{c:BC(b),nu:2,nv:2,a,th:.03});
      for(let r=0;r<2;r++)for(let c=0;c<2;c++){const i=2*b+r,j=2*b+c,on=c<=r,cx=o0[0]+(c+.5)*PS/2,cz=ZP-(r+.5)*PS/2,h=PS/4-.05;
        R.quad([[cx-h,.07,cz-h],[cx+h,.07,cz-h],[cx+h,.07,cz+h],[cx-h,.07,cz+h]],{fill:on?P.v:P.soft,fa:on?.4:.6,edge:false,a});
        if(a>.5)lab([cx,.08,cz],on?String(q[i]*kv[j]):'masked',{mono:!!on,fs:12,b:on,c:on?P.ink:P.mute,a})}
      if(a>.5)lab([XB(b),.03,ZP-PS],b?'block 2: the same masked product':'block 1: (q kᵀ ⊙ M) v, both rows at once',{fs:12.5,b:1,dy:-12,c:BL(b),a})};
    plate(0,kk===3?e:kk===4?.25:0);plate(1,kk===5?e:0);
    // outputs in block mode: purple = intra-block part, teal = inter-block part (q × state)
    if(kk>=3)q.forEach((_,i)=>{const b=blk(i),show=b===0?(kk===3?e:1):(kk===5?e:0);if(show<=.01)return;const x=X(i,1),a=cur(i)?1:.3;
      const h1=intra[i]*HO*show,h2=inter[i]*HO*show;
      R.box([x,0,ZO],[.48,Math.max(.004,h1),.48],{fill:mix(P.paper,P.v,.6),a,lw:.7});if(h2>0)R.box([x,h1,ZO],[.48,h2,.48],{fill:mix(P.paper,P.c6,.65),a,lw:.7,shadow:false});
      if(cur(i))lab([x,h1+h2,ZO],'o = '+(inter[i]?intra[i]+' + '+inter[i]+' = ':'')+o[i],{mono:true,fs:12.5,dy:-11,b:1,c:P.ink,a:show});
      if(cur(i)){const r=i%2;R.flow([[XB(b),.12,ZP-(r+.5)*PS/2],[x,.25+h1*.5,ZO-.26]],{c:P.v,a:show,n:6,r:.065,speed:1.3})}});
    // the state: the only thing that crosses the block boundary (a d x d glass plate; d = 1 in the toy)
    const sa=kk===4?e:kk===5?1:0;
    if(sa>.01){const xb=(X(1,1)+X(2,1))/2,s=.62,xs=lerp(XB(0),xb,kk===4?e:1);
      R.glass([xs-s/2,.1,ZS],[s,0,0],[0,s,0],{c:P.c6,nu:1,nv:1,a:sa,th:.08});lab([xs,.1+s,ZS],'S₁ = 2 + 1 = '+S1,{mono:true,fs:13,b:1,dy:-12,c:mix(P.c6,P.ink,.35),a:sa});
      if(kk===4){[0,1].forEach(i=>R.flow([[X(i,1),.3,ZK+.2],[xs,.1+s/2,ZS-.05]],{c:P.v,a:sa,n:4,r:.065}));
        lab([xs,.1,ZS+.1],'all that block 1 hands on',{fs:12.5,dy:16,c:P.mute,a:sa,wide:1})}
      if(kk===5)[2,3].forEach(i=>R.flow([[xb+s/2,.1+s/2,ZS],[X(i,1),.25+intra[i]*HO,ZO-.24]],{c:P.c6,a:e,n:5,r:.07,speed:1.2}))}
    if(kk===5)lab([X(3,1)+.3,o[3]*HO*.6,ZO],'2 block steps, same outputs',{al:'left',dx:12,fs:12.5,b:1,c:P.ink,a:e,wide:1});
  }
  const full={cam:[.28,.72],bounds:[[-3.7,0,-3.1],[3.7,1.1,2.3]]};
  S3.stage({id:'stg-lt',list:'sx-lt',fig:'Fig. 3 · lightning attention on four tokens, B = 2',cam:full.cam,bounds:full.bounds,aspect:.66,dur:1500,hold:5000,draw,
    margin:w=>w<520?[14,8,24,8]:[22,18,28,18],
    view:k=>k<=1?{cam:[.28,.7],bounds:[[-3.3,0,-1.1],[3.3,.45,2.3]]}:k===3?{cam:[.4,.66],bounds:[[-3.8,0,-3.1],[.4,1.0,2.3]]}:k===5?{cam:[.16,.84],bounds:[[-.6,0,-3.1],[4.1,1.3,2.3]]}:full});
})();
