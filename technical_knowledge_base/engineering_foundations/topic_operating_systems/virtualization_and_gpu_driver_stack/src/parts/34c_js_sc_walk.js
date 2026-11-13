// ---- Scene, Fig. 4 (section 4): the two-dimensional page walk of one TLB miss in a VM, every memory reference a glass plate (renderer v2) ----
// Four guest tables (gold, the staircase at the back) and, in front of each and of the data page, a host walk of four stage-2 tables (purple):
// 4 x (4 + 1) + 4 = 24 plates, the (g+1)(h+1)-1 references of the page's derived numbers (VD.der.walk44, walk43, walk33). Table contents are not drawn.
(function(){
  if(!document.getElementById('stg-walk')||!window.VD)return;const {at,mix}=S3;
  const D=VD.der,G=4,HL=4;
  const YD=.75,cx=g=>-4+g*2,gy=g=>1.95-g*.28,hy=h=>1.55-h*.36;
  const refs=[0,5,10,15,20,D.walk44,D.walk44,D.walk43];
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-5.6,5,-2.4,1.8,.5);
    // which column is being walked: 0..3 guest levels at steps 1..4, 4 the data page at step 5
    const cur=k>=1&&k<=5?k-1:-1;
    for(let g=0;g<=G;g++){const x=cx(g),done=k>=6||(cur>=0&&g<cur),act=g===cur,a=k===0?.35:act?1:done?.55:.18;
      // the host walk for this column: four small stage-2 tables, top to bottom; at step 8 the last level fades (2 MiB host pages)
      for(let h=0;h<HL;h++){const ah=k===7&&h===3?.08*(1-e)+.08:a*(act?(at(k,e,k)>h/4?1:.35):1);
        R.glass([x-.45+h*.07,hy(h),.15],[.9,0,0],[0,0,.9],{c:P.c4,a:ah,nu:4,nv:4,th:.03})}
      if(act||k===0&&g===0)R.label([x+.55,hy(0),.6],nar?'host walk':'host walk: 4 reads',{al:'left',fs:12,b:1,dx:6,c:P.c4,a:act?e:.8,grp:'h'});
      if(g<G){R.glass([x-.65,gy(g),-2.0],[1.3,0,0],[0,0,1.3],{c:P.c5,a:act?1:done?.6:k===0?.5:.22,nu:8,nv:8,th:.04});
        R.label([x-.65,gy(g),-1.35],'guest L'+g,{al:'right',fs:12.5,b:1,dx:-6,c:P.c5,a:act||k===0?1:.55,wide:1})}
      else{R.box([x,YD,-1.35],[1,.4,1],{fill:mix(P.paper,P.c3,k>=5?.5:.15),a:k>=5?1:.35,shadow:false});R.label([x,YD+.4,-1.35],'data page',{fs:12.5,b:1,dy:-10,a:k>=5?1:.5})}
      // the read: down the host staircase, then to the guest entry (or the data page)
      if(act){const pts=[];for(let h=0;h<HL;h++)pts.push([x-.0+h*.07,hy(h)+.03,.6]);pts.push(g<G?[x,gy(g)+.03,-1.35]:[x,YD+.2,-1.35]);
        R.flow(pts,{c:g<G?P.c5:P.c3,a:e,r:.075,speed:1.5,n:10});if(g<G)R.glow([x,gy(g),-1.35],.3,{c:P.c5,a:e})}
      // the link from one guest level to the next column: the entry gives the next table's guest-physical address
      if(g<G&&(act&&e>.6||done&&k<6))R.line([[x+.65,gy(g),-1.35],[cx(g+1)-.45,hy(0)+.02,.6]],{c:P.c5,w:1.2,dash:[4,4],a:act?.8:.4})}
    // the TLB and the register in front at the left
    const tl=[-5.2,0,.6];R.box(tl,[.8,.4,.6],{fill:mix(P.paper,P.c2,k===6?.6:.3),a:k===0||k===6?1:.4});R.label([tl[0],.4,tl[2]],k===6?'TLB: one entry, VMID tag':k===0?'TLB: miss':'TLB',{fs:12.5,b:1,dy:-10,c:k===0?P.bad:P.ink});
    if(k===0)R.flowArc([tl[0]+.4,.3,tl[2]],[cx(0),hy(0)+.03,.6],.4,{c:P.c2,a:e,r:.06,n:7});
    if(k===6)R.flowArc([tl[0]+.4,.4,tl[2]],[cx(4),YD+.4,-1.35],1.2,{c:P.c2,a:e,r:.075,speed:2});
    // the count
    const n=k===7?D.walk43:refs[k],CA=k>=1&&k<=5?[cx(k-1)-2.1,2.55,-2]:[-5.5,2.6,-2];
    const q=R.p(CA),dx=18-q[0],dy=22-q[1]; // pinned to the canvas's top-left corner so the count stays put while the camera moves
    R.label(CA,k===0?'every plate: one memory read':'memory references: '+n,{al:'left',fs:13.5,b:1,mono:true,c:P.ink,dx,dy});
    if(k===7)R.label(CA,'2 MiB in both stages: '+D.walk33,{al:'left',fs:12.5,mono:true,dx,dy:dy+20,c:P.mute,a:e});
    if(k===5||k===6)R.label(CA,'without a VM: 4',{al:'left',fs:12.5,mono:true,dx,dy:dy+20,c:P.mute,a:k===5?e:1})
  }
  const full={cam:[.42,.6],bounds:[[-5.6,0,-2.1],[4.8,2.4,1.2]]};
  S3.stage({id:'stg-walk',list:'sx-walk',fig:'Fig. 4 · one TLB miss, two dimensions',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1600,hold:4600,draw,
    view:k=>k>=1&&k<=5?{cam:[.4,.52],bounds:[[cx(k-1)-2.2,0,-2.1],[cx(k-1)+1.8,2.6,1.2]]}:full,
    margin:w=>w<520?[16,8,16,8]:[20,14,20,14]});
})();
