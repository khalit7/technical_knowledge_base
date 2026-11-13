// ---- Scene, Fig. 4: shared memory as 32 bank columns. One warp's access lands on them; each distinct word a bank must deliver is a cube,
// stacked by pass, so a conflict is a tower that the bank serves one layer per cycle. Blue cubes fit within the ideal number of passes
// (bytes requested / 128), orange ones are extra, as in the bank widget below. Every count comes from the page's bank model
// (window.MHM.banks, checked against code/reference.py). Steps: #sx-bank. ----
(function(){
  if(!document.getElementById('stg-bank'))return;const {mix}=S3,M=window.MHM;
  const CASES=[{mode:'stride',w:4,s:1},{mode:'col',layout:'plain',c:0},{mode:'col',layout:'pad',c:0},{mode:'col',layout:'xor',c:0},{mode:'stride',w:16,s:8},{mode:'stride',w:16,s:9}];
  const RES=CASES.map(c=>M.banks(c));
  const BP=.28,bx=b=>(b-15.5)*BP,CU=.15,YL=.95,ZL=-1.5;
  function draw(R,k,e){const P=R.P,r=RES[k];R.grid(-5.4,5.4,-2.4,1.6,.5);
    // the 32 banks: a base slab each
    for(let b=0;b<32;b++)R.box([bx(b),0,0],[BP*.82,.06,.34],{fill:mix(P.paper,P.c3,.35),shadow:false,lw:.6});
    R.label([bx(0),0,.17],'bank 0',{mono:true,fs:12,dy:18,c:P.c3,wide:1});R.label([bx(31),0,.17],'bank 31',{mono:true,fs:12,dy:18,c:P.c3,wide:1});
    // the warp's 32 lanes, behind and above
    for(let l=0;l<32;l++)R.box([bx(l),YL,ZL],[BP*.6,.14,.14],{fill:mix(P.paper,P.c2,.75),shadow:false,lw:.5});
    R.label([bx(31)+.2,YL+.07,ZL],'32 lanes',{mono:true,fs:12,al:'left',dx:8,c:P.c2,wide:1});
    // the words each bank must deliver, one layer per pass; the layers rise one after another as the step plays
    const shown=Math.max(1,Math.ceil(r.passes*e));
    r.bankWords.forEach((ws,b)=>ws.forEach((w,j)=>{if(j>=shown)return;const extra=j>=r.ideal;
      R.box([bx(b),.06+j*CU,0],[BP*.72,CU*.88,.3],{fill:extra?P.c2:mix(P.paper,P.c1,.75),shadow:false,lw:.5})}));
    // the data moves from the banks to the lanes that asked: one stream per lane, from the bank holding its word
    r.laneWords.forEach((ws,l)=>{if(l%2&&k!==1)return;const b=ws[0]%32;R.flow([[bx(b),.1+CU,.1],[bx(l),YL-.02,ZL]],{c:P.c1,a:.6*e,r:.045,n:2,speed:1.1})});
    // the verdict over the busiest bank
    const top=r.passes,bb=r.counts.indexOf(top);
    R.label([R.W<520?1.2:0,YL+.14,ZL],top+(top===1?' pass':' passes')+(r.ideal>1?' · ideal '+r.ideal:'')+(top>r.ideal?' · '+top/r.ideal+'-way conflict':''),{mono:true,fs:13,b:1,dy:R.W<520?-40:-34,c:r.passes>r.ideal?P.c2:P.c1,a:e});
  }
  // tall towers (steps 2 and 5) need a taller frame; flat layouts lean in close
  const tall=k=>RES[k].passes*CU+.3;
  const st=S3.stage({id:'stg-bank',list:'sx-bank',fig:'Fig. 4 · one warp on 32 banks',cam:[.12,.42],bounds:[[-4.7,0,-1.6],[4.7,1.4,.4]],aspect:.5,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[22,90,22,16],
    view:k=>({cam:tall(k)>2?[.12,.3]:[.3,1.0],   // the flat steps look down at an angle, so the strip fills more of the card
     bounds:[[-4.7,0,-1.6],[4.7,Math.max(1.1,tall(k)),.4]]})});
  (window.MHSTG=window.MHSTG||{})['stg-bank']=st;
})();
