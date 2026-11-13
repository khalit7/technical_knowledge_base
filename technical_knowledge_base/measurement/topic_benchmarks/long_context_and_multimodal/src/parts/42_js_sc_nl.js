// ---- Scene: Fig. 2, NoLiMa (stg-nl, renderer v2). One needle in a haystack of book snippets (one block per 1K tokens, up to 32K), Llama 3.3 70B,
// and five ways of asking for it: Direct, one-hop, two-hop, and the two hop questions with answer options. Each question kind is a row of the bar field
// behind (columns 8K, 16K, 32K, height = accuracy, NoLiMa v3 Table 6 via window.LD.nolima.t6); glass plates are the facts the model must bring itself.
// Shared content words are counted by window.LC_overlap (22_js_read.js, the same rule as recompute.py). ----
(function(){
  if(!document.getElementById('stg-nl')||!window.S3||!window.LD||!window.LC_overlap)return;
  const {mix,lerp,cl}=S3,win=(e,a,b)=>cl((e-a)/(b-a),0,1),T6=LD.nolima.t6,PR=LD.pairs;
  const KIND=[['Direct','Direct'],['One-hop','One-hop'],['Two-hop','Two-hop'],['One-hop, with literal match (MC)','One-hop + options'],['Two-hop, with literal match (MC)','Two-hop + options']];
  const ov={direct:LC_overlap(PR.direct.q,PR.direct.needle),one:LC_overlap(PR.one.q,PR.one.needle),two:LC_overlap(PR.two.q,PR.two.needle)};
  (window.LCS=window.LCS||{}).nl={t6:T6,ov:Object.fromEntries(Object.entries(ov).map(([k,o])=>[k,[o.hits.length,o.qc.length]]))};
  const PIT=.26,XS=-4.4,ZS=1.5,XQ=4.95,FX=[-3.7,-2.5,-1.3],FZ=r=>-.55-r*.72,HS=1.8,LENS=[8,16,32];
  // the haystack's length (blocks of 1K tokens) during a step, and how far each column of a row has risen
  const grow=(e,a)=>e<a[0]?8:e<a[1]?lerp(8,16,win(e,a[0],a[1])):e<a[2]?16:lerp(16,32,win(e,a[2],a[3]));
  function len(k,e){if(k===0)return 8;if(k===1)return grow(e,[.3,.45,.62,.77]);if(k===2)return lerp(32,8,win(e,0,.25));if(k===3)return grow(e,[.15,.35,.55,.75]);if(k===4)return e<.22?lerp(32,8,win(e,0,.2)):grow(e,[.38,.52,.66,.8]);return 32}
  const ON={1:[[.05,.25],[.45,.6],[.77,.95]],3:[[.35,.55],[.75,.95]],4:[[.22,.38],[.52,.66],[.8,.96]]};
  function rise(r,j,k,e){const first=[1,2,4,5,5][r];if(k<first)return 0;
    if(r===1){if(k===2)return j===0?win(e,.25,.5):0;if(k===3)return j===0?1:win(e,...ON[3][j-1]);return 1}
    if(k>first)return 1;if(r>=3)return win(e,.2+j*.15,.45+j*.15);const w=ON[k][j];return win(e,w[0],w[1])}
  const focus=(r,k)=>{const f=[[1],[0],[1],[1],[2],[3,4]][k]||[];return f.indexOf(r)>=0};
  function draw(R,k,e){const P=R.P,L=len(k,e),xN=XS+(L/2)*PIT;
    R.grid(-5.6,5.8,-3.0,2.3,.5);
    // the haystack: 32 blocks drawn faintly, the first L solid; the needle is the raised blue block at mid depth
    for(let i=0;i<32;i++){const on=i+.5<=L;R.box([XS+(i+.5)*PIT,0,ZS],[.22,.2,.8],{fill:on?mix(P.paper,P.soft,.3):P.paper,a:on?1:.16,shadow:on&&i%2===0,lw:.7})}
    R.box([xN,0,ZS],[.22,.42,.8],{fill:P.acc,shadow:false});
    R.label([XS-.1,.1,ZS],'haystack '+Math.round(L)+'K',{al:'right',dx:-6,fs:12.5,b:1,mono:true,c:P.mute,wide:1});
    R.label([xN,0,ZS+.42],'needle: "Actually, Yuki lives next to the Semper Opera House."',{fs:12,dy:16,c:P.acc,b:1,wide:1});
    // the question at the end of the prompt
    const Q=k===0?null:k===1?PR.direct.q:k<=3?PR.one.q:k===4?PR.two.q:PR.two.q+' Options: Yuki, and three other names.';
    R.box([XQ,0,ZS],[.95,.72,.14],{fill:mix(P.paper,P.c2,.35)});R.label([XQ,.72,ZS],'question',{fs:12.5,b:1,dy:-10});
    if(Q)R.label([XQ+.5,0,ZS+.1],'"'+Q+'"',{al:'right',fs:12,dy:36,c:P.c2,wide:1});
    // the facts the model must supply: glass plates above the haystack
    const p1a=k===2?win(e,.1,.4):k===3?1:k===4?1:k===5?.25:0,p2a=k===4?win(e,0,.3):k===5?.25:0;
    const P1=[1.1,1.0,ZS],P2=[3.9,1.55,ZS];
    if(p1a>.01){R.glass([P1[0]-.75,P1[1]-.3,ZS],[1.5,0,0],[0,.6,0],{c:P.c4,a:p1a,nu:5,nv:2});R.label([P1[0],P1[1]+.3,ZS],'Semper Opera House is in Dresden',{fs:12,b:1,c:P.c4,dy:-10,a:p1a,wide:1})}
    if(p2a>.01){R.glass([P2[0]-.6,P2[1]-.3,ZS],[1.2,0,0],[0,.6,0],{c:P.c4,a:p2a,nu:4,nv:2});R.label([P2[0],P2[1]+.3,ZS],'Dresden is in Saxony',{fs:12,b:1,c:P.c4,dy:-10,a:p2a,wide:1})}
    // the question's route to the needle: straight when the words match, through the plates when they do not; fewer dots when it is found less often
    const qp=[XQ-.2,.6,ZS],np=[xN,.45,ZS],cur=k===1?0:k<=3?1:k===4?2:4,j=Math.max(0,Math.min(2,Math.round(Math.log2(L/8)))),acc=k===0?0:T6[KIND[cur][0]][j],dn=Math.max(2,Math.round(acc/9));
    const arc=(a,b,h,m)=>{const pts=[];for(let i=0;i<=m;i++)pts.push(R.arcPt(a,b,h,i/m));return pts};
    if(k===1||k===5)R.flowArc(qp,np,.55,{c:P.c2,n:dn,r:.085,a:.9});
    if(k===2||k===3)R.flow([...arc(qp,[P1[0]+.4,P1[1],ZS],.25,10),...arc([P1[0]-.4,P1[1],ZS],np,.2,14)],{c:P.c2,n:dn,r:.085,a:.9*Math.max(.3,p1a)});
    if(k===4)R.flow([...arc(qp,[P2[0]+.3,P2[1],ZS],.2,8),...arc([P2[0]-.3,P2[1],ZS],[P1[0]+.4,P1[1],ZS],.15,8),...arc([P1[0]-.4,P1[1],ZS],np,.2,14)],{c:P.c2,n:dn,r:.085,a:.9*Math.max(.3,p2a)});
    // the bar field: one row per question kind, one column per length
    LENS.forEach((n,jj)=>R.label([FX[jj],0,FZ(0)+.42],n+'K',{fs:12,mono:true,c:P.mute,dy:12,wide:1}));
    KIND.forEach(([key,name],r)=>{const z=FZ(r),fo=focus(r,k);let any=0;
      LENS.forEach((n,jj)=>{const a=rise(r,jj,k,e);if(a<.05)R.quad([[FX[jj]-.31,.005,z-.25],[FX[jj]+.31,.005,z-.25],[FX[jj]+.31,.005,z+.25],[FX[jj]-.31,.005,z+.25]],{a:.5,ec:P.line,lw:.8,dash:[3,3]});if(a<=0)return;any=1;const v=T6[key][jj],al=fo?1:.32,c=r===0?mix(P.paper,P.good,.5):r>=3?mix(P.paper,P.c2,.45):mix(P.paper,P.c4,r===1?.35:.6);
        R.box([FX[jj],0,z],[.62,Math.max(.01,v/100*HS*a),.5],{fill:c,a:al,shadow:false});
        if(fo)R.label([FX[jj],v/100*HS*a,z],v.toFixed(1)+'%',{mono:true,fs:12.5,b:1,dy:-11,a:Math.min(1,a*1.6),al:r===3?'right':r===4?'left':'center',dx:r===3?-2:r===4?2:0})});
      if(any)R.label([FX[0]-.45,.05,z],name,{al:'right',dx:-6,fs:12,b:fo,grp:'row',a:fo?1:.55,c:fo?P.ink:P.mute,wide:1})});
  }
  const narrow=()=>(document.getElementById('stg-nl').clientWidth||999)<520,full={cam:[.2,.72],bounds:()=>narrow()?[[-4.5,0,-3.8],[5.5,2.0,2.0]]:[[-6.3,0,-3.8],[5.6,2.0,2.0]]};
  S3.stage({id:'stg-nl',list:'sx-nl',fig:'Fig. 2 · NoLiMa, Llama 3.3 70B, one needle, five questions',cam:full.cam,bounds:full.bounds,aspect:.56,dur:2600,hold:4800,draw,
    margin:w=>w<520?[16,8,14,8]:[22,16,48,16],
    view:k=>narrow()&&k===0?{cam:[.55,.9],bounds:[[-4.5,0,.9],[5.5,.8,2.1]]}:null}); // on a phone, step 1 (only the haystack and the question) turns the row into depth so it fills the card
})();
