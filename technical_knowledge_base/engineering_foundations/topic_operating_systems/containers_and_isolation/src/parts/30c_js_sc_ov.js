// ---- Scene, Fig. 3 (section 3): overlayfs as stacked glass plates: two image layers, the writable upper layer, the merged view (renderer v2) ----
// Data: the measured copy-up times (window.CT_DATA.copyup) and the create time parsed from image.txt; layer sizes from docker history (image.txt).
(function(){
  if(!document.getElementById('stg-ov')||!window.CT_DATA)return;const {at,off,lerp,lerp3,mix,cl}=S3,D=window.CT_DATA;
  const cu=D.copyup,mt=/create a new file: ([\d.]+) ms/.exec(D.image_txt),tnew=mt?mt[1]:'?';
  const YB=0,YV=1.0,YU=2.0,YM=3.05,X0=-3,W=6,Z0=-1.35,DZ=2.7; // plates: base, venv, upper, merged
  const FL=-1.85,FM=0,FN=1.85; // file columns: libtorch_cpu.so, /etc/motd, /work/new.txt
  function plate(R,y,c,a,nm){R.glass([X0,y,Z0],[W,0,0],[0,0,DZ],{c,a,nu:6,nv:3,th:.03})}
  function file(R,x,y,s,o){R.box([x,y,0],s,Object.assign({shadow:false},o))}
  function draw(R,k,e){const P=R.P;R.grid(-4.5,4.5,-2.4,2.4,.5);
    const lab=(y,t,c,b)=>R.label([X0,y,DZ/2+Z0],t,{al:'right',dx:-8,fs:12.5,b:b?1:0,c,grp:'lay'});
    // plates, bottom to top
    plate(R,YB,P.c5,.75);plate(R,YV,P.c1,.75);plate(R,YU,P.c2,k===0?.55:.85);plate(R,YM,P.c3,.85);
    lab(YB,'image layer: Debian base, 139 MB',P.c5);lab(YV,'image layer: venv and PyTorch, 853 MB',P.c1);lab(YU,'upper: writable, this container',P.c2,k>0);lab(YM,'merged: the container\'s /',P.c3,1);
    // files in the image layers
    file(R,FL,YV+.03,[1.15,.62,.9],{fill:mix(P.paper,P.c1,.35)});R.label([FL,YV+.65,0],'libtorch_cpu.so · 264 MB',{fs:12,mono:true,dy:-10,c:P.c1});
    file(R,FM,YB+.03,[.6,.3,.5],{fill:mix(P.paper,P.c5,.4)});R.label([FM,YB+.33,0],'/etc/motd',{fs:12,mono:true,dy:-10,c:P.c5});
    // the merged view: what the container sees, and where each name comes from
    const libUp=k>=1,motdGone=k>=3,nw=k>=4;
    file(R,FL,YM+.03,[.8,.18,.6],{fill:mix(P.paper,P.c3,.35),a:.9});
    file(R,FM,YM+.03,[.5,.18,.4],{fill:mix(P.paper,P.c3,.35),a:k===3?1-e*.85:motdGone?.15:.9});
    if(nw)file(R,FN,YM+.03,[.5,.18,.4],{fill:mix(P.paper,P.c3,.35),a:k===4?e:.9});
    // reads: each merged name is served by the topmost layer that has it
    if(k===0){R.flow([[FL,YV+.65,0],[FL,YM,0]],{c:P.c1,r:.06,n:6,speed:.8,a:e});R.flow([[FM,YB+.33,0],[FM,YM,0]],{c:P.c5,r:.06,n:8,speed:.8,a:e});
      R.label([FN,YM+.2,0],'reads come from the topmost layer',{fs:12.5,b:1,c:P.c3,dy:-12,a:e,wide:1})}
    // copy-up: the whole file streams into the upper layer
    if(libUp){const g=k===1?cl(e*1.3,0,1):1;file(R,FL,YU+.03,[1.15,.62*g,.9],{fill:mix(P.paper,P.c2,.4),a:k===1?Math.max(.2,g):k===2?1:.6});
      if(k===1){R.flow([[FL-.3,YV+.65,0],[FL-.3,YU+.03,0]],{c:P.c2,r:.075,n:9,speed:1.2,a:e});R.flow([[FL+.3,YV+.65,0],[FL+.3,YU+.03,0]],{c:P.c2,r:.075,n:9,speed:1.2,a:e});
        R.label([FL,YU+.7,0],'copy-up: whole file · '+cu[0].toFixed(1)+' ms',{al:'left',dx:46,fs:12.5,b:1,c:P.c2,dy:-6,a:e})}
      if(k>=1)R.flow([[FL,YU+.65,0],[FL,YM,0]],{c:P.c2,r:.05,n:4,speed:.8,a:k<=2?1:.35})}
    if(k===2){R.flow([[FL+.9,YM+.6,.2],[FL+.3,YU+.66,.2]],{c:P.c2,r:.06,n:3,speed:.7,a:e});R.label([FL,YU+.7,0],'second write · '+cu[1].toFixed(1)+' ms, to the copy',{al:'left',dx:46,fs:12.5,b:1,c:P.c2,dy:-6,a:e})}
    // delete: a whiteout in the upper layer hides the name
    if(motdGone){file(R,FM,YU+.03,[.6,.22,.5],{fill:mix(P.paper,P.bad,.25),ec:P.bad,lw:1.4,a:k===3?e:.8});
      if(k===3){R.flow([[FM,YB+.33,0],[FM,YU-.02,0]],{c:P.c5,r:.06,n:6,speed:.8,a:1-e*.6});R.glow([FM,YU,0],.4,{c:P.bad,a:e});
        R.label([FM,YU+.25,0],'whiteout · c 0, 0',{al:'left',dx:30,fs:12.5,b:1,c:P.bad,a:e,dy:-6});R.label([FM,YM+.2,0],'rm /etc/motd: hidden',{fs:12.5,b:1,c:P.bad,dy:-12,a:e,wide:1})}}
    // create: straight into the upper layer, no copy
    if(nw){file(R,FN,YU+.03,[.6,.3,.5],{fill:mix(P.paper,P.c2,.45),a:k===4?e:.8});
      if(k===4){R.flow([[FN+.5,YM+.6,0],[FN,YU+.33,0]],{c:P.c2,r:.06,n:4,speed:.8,a:e});R.flow([[FN,YU+.33,0],[FN,YM,0]],{c:P.c2,r:.05,n:4,speed:.8,a:e});
        R.label([FN,YU+.33,0],'/work/new.txt · '+tnew+' ms',{fs:12.5,mono:true,b:1,c:P.c2,dy:-12,a:e})}}
  }
  const full={cam:[-.42,.3],bounds:[[-3.1,0,-1.4],[3.1,3.3,1.4]]};
  S3.stage({id:'stg-ov',list:'sx-ov',fig:'Fig. 3 · layers, copy-up and a whiteout',cam:full.cam,bounds:full.bounds,aspect:.72,dur:1500,hold:4800,draw,
    margin:w=>w<520?[16,8,16,8]:[18,16,18,230]});
})();
