// ---- Scene: Fig. 2, an edit applied to a file, five ways (renderer v2). The file and its lines are illustrative (twelve lines lying on
// the floor, the edit's target at lines 7 and 8); every count drawn comes from the Edit format bench (HB.bench, first attempts). ----
(function(){
  if(!document.getElementById('stg-edit')||!window.HB||!HB.bench)return;const {at,mix,lerp}=S3;
  const B=HB.bench,tasks=B.tasks;
  const res=(m,t,f,ap)=>{const r=(B.runs[m][t]||{})[f];return r?r[0].res[ap||B.primary[f]]:null};
  const ok=(m,f,ap)=>Object.keys(B.runs[m]).filter(t=>{const r=res(m,t,f,ap);return r&&r[1]}).length;
  const applied=(m,f,ap)=>Object.keys(B.runs[m]).filter(t=>{const r=res(m,t,f,ap);return r&&r[0]}).length;
  const nT=m=>Object.keys(B.runs[m]).length;
  const hn='haiku_nothink',sn='sonnet_nothink',lo='local_t0';
  const C={exH:ok(hn,'exact'),exS:ok(sn,'exact'),udRef:nT(hn)-applied(hn,'udiff'),udRec:ok(hn,'udiff','udiff_recount'),
    aiApp:applied(lo,'udiff','udiff_aider'),aiOk:ok(lo,'udiff','udiff_aider'),nLo:nT(lo)};
  const w8=B.runs[hn].t08,wTok=w8.whole[0].out,oth=['exact','sr','udiff','patch'].map(f=>w8[f][0].out),oMin=Math.min(...oth),oMax=Math.max(...oth);
  const L=12,LW=[2.3,1.6,2.6,2.0,1.2,2.4,2.2,1.8,2.5,1.4,2.1,1.7],TG=[6,7],DUP=2,WR=3,FX=.2,DZ=.34,z=i=>(i-(L-1)/2)*DZ;
  const RX=-3.2,VX=3.6,fmt=n=>Math.round(n).toLocaleString('en-GB');
  function line(R,i,fill,a,h){R.box([FX-1.25+LW[i]/2,0,z(i)],[LW[i],h||.09,DZ*.62],{fill,a,shadow:false,lw:.6})}
  function draw(R,k,e){const P=R.P,nar=R.W<520,fa=Math.min(1,e*1.6),done=Math.min(1,Math.max(0,e*1.8-.6));R.grid(-4.4,4.4,-2.6,2.6,.5);
    const base=mix(P.paper,P.mute,.18),newC=mix(P.paper,P.good,.55),badC=mix(P.paper,P.bad,.55),ambC=mix(P.paper,P.c5,.6);
    // the model's reply: a glass plate
    R.glass([RX,.1,-1],[0,0,2],[0,1.3,0],{c:P.c2,a:1,nu:4,nv:6});R.label([RX,1.4,0],k===2?'reply: a unified diff':k===3?'reply: the whole file':k===4?'reply: a diff, 4B model':'reply: old → new string',{fs:12.5,b:1,c:P.c2,dy:-10});
    // the file's lines; the target lines take the step's colour
    for(let i=0;i<L;i++){let f=base,a=1,h=.09;
      const tgt=TG.includes(i);
      if(k===0&&tgt){f=mix(base,newC,done);h=lerp(.09,.16,done)}
      if(k===1&&(tgt||i===DUP)){f=mix(base,badC,fa)}
      if(k===2){const body=i>=5&&i<=9;if(body)f=mix(base,e<.55?badC:newC,fa)}
      if(k===3){f=mix(base,newC,Math.min(1,Math.max(0,e*1.6-i*.06)))}
      if(k===4&&i===WR)f=mix(base,ambC,fa);
      line(R,i,f,a,h)}
    R.label([FX-1.25,0,z(0)-.25],'the file',{fs:12.5,b:1,al:'left',c:P.ink,dy:-6});
    // the verifier: the tests the harness runs after the edit
    const va=k===4?1:.22;R.glass([VX,.05,-1.6],[0,0,3.2],[0,1.0,0],{c:P.good,a:va,nu:3,nv:4});R.label([VX,1.05,-1.6],'tests',{fs:12.5,b:1,c:P.good,dy:-10,a:Math.max(.45,va)});
    const end=i=>[FX-1.25+LW[i]*.5,.12,z(i)];
    if(k===0){R.flow([[RX,.7,0],end(TG[0])],{c:P.c2,a:fa,r:.07,speed:1.3,n:7});
      R.label([FX+1.4,.12,z(TG[1])],'found once → replaced',{fs:12.5,b:1,al:'left',dx:8,c:P.good,a:fa});
      R.label([FX+1.4,.12,z(TG[1])+.6],nar?'Haiku '+C.exH+'/13':'Haiku '+C.exH+' of 13 · Sonnet '+C.exS+' of 13',{fs:12,mono:true,al:'left',dx:8,c:P.mute,a:done})}
    if(k===1){[DUP,TG[0]].forEach(i=>R.flow([[RX,.7,0],end(i)],{c:P.c2,a:fa,r:.07,speed:1.3,n:6}));
      R.label([FX+1.4,.12,(z(DUP)+z(TG[0]))/2],'found twice → refused, with a message',{fs:12.5,b:1,al:'left',dx:8,c:P.bad,a:fa});
      R.label([RX,0,1],'illustrative',{fs:12,mono:true,c:P.mute,dy:16,a:fa})}
    if(k===2){const zA=z(5)-.15,zB=e<.55?z(8)+.15:z(9)+.15;R.glass([FX-1.35,.18,zA],[2.8,0,0],[0,0,zB-zA],{c:e<.55?P.bad:P.good,a:fa*.9,nu:6,nv:e<.55?4:5});
      R.flow([[RX,.7,0],[FX-1.3,.3,z(7)]],{c:P.c2,a:fa,r:.07,speed:1.3,n:6});
      R.label([FX-1.35,.18,zA],'@@ -13,4 +13,5 @@',{mono:true,fs:12.5,b:1,al:'left',dy:-10,c:P.ink,a:fa});
      R.label([FX+1.5,.18,z(7)],e<.55?'header says 4 old lines, body has 5: git apply refused '+C.udRef+' of 13':'--recount ignores the counts: '+C.udRec+' of 13 applied',{fs:12.5,b:1,al:'left',dx:8,c:e<.55?P.bad:P.good,a:fa,wide:1})}
    if(k===3){for(let i=0;i<L;i++)R.flow([[RX,.3+i*.08,-.9+i*.16],end(i)],{c:P.c2,a:fa*.85,r:.055,speed:1.4,n:4});
      R.label([FX+1.4,.12,z(3)],fmt(wTok)+' output tokens, against '+oMin+' to '+oMax,{fs:12.5,b:1,al:'left',dx:8,c:P.ink,a:fa,wide:1});
      R.label([FX+1.4,.12,z(8)],'every line rewritten: CRLF became LF',{fs:12.5,al:'left',dx:8,c:P.c5,a:done,wide:1})}
    if(k===4){R.flow([[RX,.7,0],end(WR)],{c:P.c2,a:fa,r:.07,speed:1.3,n:6});
      for(let i=0;i<L;i++)if(i%2===0)R.flow([end(i),[VX,.3,z(i)]],{c:P.good,a:done*.8,r:.05,speed:1.4,n:3});
      R.label([FX+1.4,.12,z(WR)],nar?'applied in the wrong place':'lenient applier: applied '+C.aiApp+' of '+C.nLo+', '+(C.aiApp-C.aiOk)+' of them wrong',{fs:12.5,b:1,al:'left',dx:8,c:P.c5,a:fa});
      R.label([VX,0,1.6],'only the check catches it',{fs:12.5,b:1,c:P.good,dy:16,a:done})}
  }
  const full={cam:[.28,.78],bounds:[[-3.6,0,-2.3],[4.0,1.5,2.3]]};
  S3.stage({id:'stg-edit',list:'sx-edit',fig:'Fig. 2 · one edit, five ways to apply it',cam:full.cam,bounds:full.bounds,aspect:.58,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,10,14,10]:[18,14,14,14]});
})();
