// ---- Scene: Fig. 2, who writes each piece at five positions on the ownership axis (renderer v2). The nine pieces and who owns each at each
// position are window.AFOWN (23_js_afread_a.js, this page's reading of each library's documentation, also printed as the closed table under the
// step list). Each step is one position: the pieces that change hands glide from one zone to the next with a stream behind them. ----
(function(){
  if(!document.getElementById('stg-own'))return;const {mix,lerp}=S3;
  const ZX={you:-2.3,lib:.55,ven:3.4},DZ=.56;
  const SH=['loop','tool schemas','order of steps','saved state','pause for a human','compaction','built-in tools','permissions, sandbox','where it runs'];
  function draw(R,k,e){const P=R.P,O=window.AFOWN;if(!O)return;const nar=R.W<520,n=O.pieces.length,fa=Math.min(1,e*1.6);
    const z=j=>(j-(n-1)/2)*DZ;R.grid(-5.6,4.8,-2.9,2.9,.5);
    const C={you:mix(P.paper,P.c1,.55),lib:mix(P.paper,P.ink,.3),ven:mix(P.paper,P.c4,.55)};
    // the three zones on the floor
    [['you',nar?'you':'you write it',P.c1],['lib',nar?'library':'the library provides it',P.mute],['ven',nar?'vendor':'the vendor runs it',P.c4]].forEach(([w,t,c])=>{
      R.quad([[ZX[w]-.95,.002,z(0)-.38],[ZX[w]+.95,.002,z(0)-.38],[ZX[w]+.95,.002,z(n-1)+.38],[ZX[w]-.95,.002,z(n-1)+.38]],{fill:mix(P.paper,c,.12),a:.8,dz:1000});
      R.label([ZX[w],0,z(0)-.4],t,{fs:12.5,b:1,c,dy:-8})});
    const cur=O.pos[k],prev=O.pos[Math.max(0,k-1)];
    O.pieces.forEach((p,j)=>{const w1=cur.c[j][0],w0=k>0?prev.c[j][0]:w1,moved=w0!==w1,x=lerp(ZX[w0],ZX[w1],moved?e:1),zz=z(j);
      R.box([x,0,zz],[1.6,.34,.4],{fill:C[w1===w0||e>.5?w1:w0],a:moved||k===0?1:.55,lw:moved?1.4:.8,ec:moved?P.acc:null});
      if(moved)R.flowArc([ZX[w0],.3,zz],[x,.36,zz],.45,{c:w1==='you'?P.c1:w1==='ven'?P.c4:P.acc,a:fa*(1-e*.4),r:.055,n:5,speed:1.2});
      R.label([-3.35,.17,zz],SH[j],{fs:12,al:'right',dx:-6,c:moved?P.acc:P.ink,b:moved,grp:'rows'})});
    // the position, as a label over the zones
    R.label([.55,.4,z(n-1)+.45],(k+1)+'. '+cur.n,{fs:13.5,b:1,c:P.acc,dy:18})
  }
  const host=document.getElementById('stg-own');
  S3.stage({id:'stg-own',list:'sx-own',fig:'Fig. 2 · who writes each piece, position by position',cam:[.05,1.0],bounds:()=>host.clientWidth<520?[[-3.4,0,-2.6],[4.4,.5,2.9]]:[[-5.3,0,-2.6],[4.4,.5,2.9]],aspect:.66,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,10,14,10]:[16,14,22,16]});
})();
