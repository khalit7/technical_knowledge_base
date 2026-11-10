// ---- Scene (Fig. 3, media against the window): the 1,048,576-token window of every Gemini 3.x model as a glass plate of 32 x 32 tiles,
// 1,024 tokens each; media tokens are laid on it row by row at the rates in window.GGMED (12_js_media.js), video frames blue, audio green,
// images gold, anything past the window's edge orange. Step 1 is a close-up of the first tile, one token per small cube. ----
(function(){
  if(!document.getElementById('stg-md')||!window.GGMED)return;const {at,off,lerp,mix}=S3,M=GGMED,G3=M.g3,G25=M.g25,WIN=M.WIN;
  const TILE=1024,NR=32,U=.25,X0=-4,Z0=-4,TH=.12,H=3600;
  // what lies on the window at each step: [frames, audio, images] in tokens; step 6 also has the static count as an outline
  const SEGS=[[G3.lo,G3.a,0],[H*G3.lo,H*G3.a,0],[H*G3.hi,H*G3.a,0],[H*G3.lo,H*G3.a,Math.floor((WIN-H*(G3.lo+G3.a))/G3.img)*G3.img],[H*G25.hi,H*G25.a,0],[108000,0,0]];
  const GHOST=1080000,COL=['c1','c3','c5'];
  window.GGMD={SEGS,GHOST,TILE};
  // spans of tiles [row, c0, c1] covering tokens a..b (in tiles, continuous)
  function spans(a,b){const out=[];let t=a;while(t<b-1e-9){const r=Math.floor(t/NR+1e-9),e=Math.min(b,(r+1)*NR);out.push([r,t-r*NR,e-r*NR]);t=e}return out}
  function lay(R,a,b,fill,o){spans(a,b).forEach(([r,c0,c1])=>{const over=r>=NR,w=(c1-c0)*U;if(w<.004)return;
    R.box([X0+(c0+c1)/2*U,.02,Z0+(r+.5)*U],[w-.012,o.h||TH,U*.86],{fill:over?R.P.bad:fill,a:o.a,shadow:false,lw:.6})})}
  // an outline of the tiles a..b (the static count of step 6): one dashed rectangle for the full rows, one for the last partial row
  function ghost(R,n,a){const t=n/TILE,fr=Math.floor(t/NR),rem=t-fr*NR,y=.03+TH,o={fill:R.P.c1,fa:.07,ec:R.P.c1,ea:.95,lw:1.4,dash:[5,4],a};
    const rect=(x0,z0,x1,z1)=>R.quad([[x0,y,z0],[x1,y,z0],[x1,y,z1],[x0,y,z1]],o);
    rect(X0,Z0,X0+NR*U,Z0+Math.min(fr,NR)*U);if(rem>0)rect(X0,Z0+fr*U,X0+rem*U,Z0+(fr+1)*U)}
  const endPt=n=>{const t=n/TILE,r=Math.floor(Math.max(0,t-1e-6)/NR),c=t-r*NR;return [X0+c*U,.02+TH,Z0+(r+.5)*U]};
  const SRC=[X0-1.2,.4,Z0-.3],SW=1.9,SH=1.05;
  function draw(R,k,e,st){const P=R.P;R.grid(-6,7,-6,6,1);
    const pk=st.pk,t=pk===k?1:e,cur=SEGS[k].map((v,i)=>lerp(SEGS[pk][i],v,t));
    // the window: one glass plate, its grid the 1,024 tiles (sorted behind the tokens that lie on it)
    R.glass([X0,0,Z0],[NR*U,0,0],[0,0,NR*U],{c:P.ink,a:.4,nu:NR,nv:NR,th:.02,dz:100});
    // step 1: the first tile up close, one cube per token
    const ca=k===0?(pk===0?1:e):pk===0?1-e:0;
    if(ca>.01){const v=U/32;let j=0;[[G3.lo,'c1'],[G3.a,'c3']].forEach(([n,c])=>{for(let q=0;q<n;q++,j++){const r=Math.floor(j/32),cc=j%32;R.box([X0+(cc+.5)*v,.02,Z0+(r+.5)*v],[v*.8,v*.9,v*.8],{fill:P[c],a:ca,shadow:false,lw:.4})}});
      R.line([[X0,.025,Z0],[X0+U,.025,Z0],[X0+U,.025,Z0+U],[X0,.025,Z0+U],[X0,.025,Z0]],{c:P.ink,w:2,a:ca});
      const fr=[X0+.02,.05,Z0-.16],au=[X0+.16,.05,Z0-.16];
      R.glass(fr,[.13,0,0],[0,.075,0],{c:P.c1,a:ca,nu:4,nv:3,th:.004});R.glass(au,[.07,0,0],[0,.075,0],{c:P.c3,a:ca,nu:5,nv:1,th:.004});
      R.flowArc([fr[0]+.065,.05,Z0-.155],[X0+.08,.03,Z0+.01],.03,{c:P.c1,a:ca,r:.004,n:7,speed:.12});
      R.flowArc([au[0]+.035,.05,Z0-.155],[X0+.17,.03,Z0+.02],.03,{c:P.c3,a:ca,r:.004,n:5,speed:.12});
      const cl=ca>.75?(ca-.75)*4:0; // the close-up's labels are gone by mid-transition
      R.label([fr[0],.1,fr[2]],'1 frame · '+G3.lo+' tokens',{al:'right',dx:-6,fs:12.5,b:1,c:P.c1,a:cl});
      R.label([au[0]+.07,.1,au[2]],'1 s of sound · '+G3.a+' tokens',{al:'left',dx:6,fs:12.5,b:1,c:P.c3,a:cl});
      R.label([X0+U,.025,Z0+U*.75],'one tile · 1,024 tokens',{al:'left',dx:10,fs:12.5,b:1,c:P.ink,a:cl});
      R.label([X0,.025,Z0+U*.5],'95 tokens per second',{al:'right',dx:-10,wide:1,fs:12,mono:true,c:P.mute,a:cl})}
    // steps 2 to 6: the media laid on the window, row by row
    const ma=k===0?(pk===0?0:1-e):pk===0?e:1;
    if(ma>.01){let s=0;cur.forEach((n,i)=>{if(n>0)lay(R,s/TILE,(s+n)/TILE,P[COL[i]],{a:ma});s+=n});
      const ga=k===5?t:pk===5?1-e:0;if(ga>.01)ghost(R,GHOST,ga*ma);
      // the source: tokens stream from it onto the row being filled
      const tot=cur.reduce((a,b)=>a+b,0),fi=k===3?2:0,dst=endPt(Math.min(tot,WIN*1.06));
      R.glass([SRC[0]-SW/2,SRC[1],SRC[2]],[SW,0,0],[0,SH,0],{c:P[COL[fi]],a:ma,nu:4,nv:3,th:.02});
      R.flowArc([SRC[0],SRC[1],SRC[2]],dst,.45,{c:P[COL[fi]],a:ma*.9,r:.05,speed:1.6,n:9});
      // labels, one set per step, the outgoing set gone by mid-transition: what is laid down, then its total
      const la=q=>{const a=k===q?t:pk===q?1-e:0;return a>.5?(a-.5)*2*ma:0};
      const nm=['','one hour of video, default resolution','one hour of video, high resolution','+ '+SEGS[3][2]/G3.img+' images at 1,120 tokens','one hour, Gemini 2.5 rates','agentic: ~108K tokens'];
      for(let q=1;q<6;q++){const a=la(q);if(a<=.01)continue;const n=SEGS[q].reduce((x,y)=>x+y,0),pct=Math.min(n,WIN)/WIN*100;
        R.label([SRC[0]-SW/2,SRC[1]+SH,SRC[2]],nm[q],{al:'left',fs:13,b:1,c:q===3?P.c5:P.c1,a,dy:-34});
        R.label([SRC[0]-SW/2,SRC[1]+SH,SRC[2]],q===5?'outlined: ~1.08M static':fmt(n)+' tokens · '+(q===2?'does not fit':pct.toFixed(1)+'% of the window'),{al:'left',fs:12.5,mono:true,c:q===2?P.bad:P.ink,a,dy:-15});
        if(q===2)R.label([X0+NR*U*.3,.02,Z0+NR*U+.45],'over the window by '+fmt(n-WIN)+' tokens',{al:'left',dx:6,dy:30,fs:12.5,b:1,c:P.bad,a})}
      R.label([X0+NR*U/2,0,Z0+NR*U],'window: 1,048,576 tokens = 32 × 32 tiles of 1,024',{fs:12,dy:22,c:P.mute,a:ma*(k===2||k===5?Math.max(0,1-2*t):(pk===2||pk===5)&&e<1?Math.max(0,2*e-1):1)})}
  }
  const full={cam:[.12,.82],bounds:[[-6,0,-5.2],[4.4,1.5,4.9]]};
  S3.stage({id:'stg-md',list:'sx-md',fig:'Fig. 3 · media against the window, at Gemini\'s published rates',cam:full.cam,bounds:full.bounds,aspect:.66,dur:1600,hold:5200,draw,
    margin:w=>w<520?[14,8,14,8]:[16,16,20,16],
    view:k=>k===0?{cam:[.3,.62],bounds:[[X0-.22,0,Z0-.24],[X0+.42,.16,Z0+.14]]}:full});
})();
