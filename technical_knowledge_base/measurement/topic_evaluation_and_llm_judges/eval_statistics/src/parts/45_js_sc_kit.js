// ---- 3D stages (renderer v2): shared layout for the RACE-H question field and the bootstrap clouds (Figs. 1 and 2) ----
// The field: the 400 passages of this page's RACE-H run as a 20 by 20 grid of cells, each passage's questions (1 to 5) as tiles in its cell,
// so the clusters are visible from the start. The clouds: seeded bootstrap rescorings (mulberry32, EST.rng) stacked as balls over a score axis.
window.ESK=(function(){
  const S=window.EST;if(!S||!S.race)return null;
  const cl=S.race.cl,n=cl.length,C=S.race.nc,TS=.085,PX=.105,CX=3*PX+.07,CZ=2*PX+.07,G=20;
  const first=[],pos=[];cl.forEach((c,i)=>{if(i===0||cl[i-1]!==c)first[c]=i});
  for(let i=0;i<n;i++){const c=cl[i],j=i-first[c],gx=c%G,gz=Math.floor(c/G);
    pos.push([(gx-(G-1)/2)*CX+((j%3)-1)*PX,0,(gz-(G-1)/2)*CZ+(Math.floor(j/3)-.5)*PX])}
  const W=G*CX,D=G*CZ;
  // a flat tile on the floor (or at height y); w is its width along x
  function tile(R,p,y,w,c,a,dz){const h=TS/2,x0=p[0]-w/2,x1=p[0]+w/2;R.quad([[x0,y,p[2]-h],[x1,y,p[2]-h],[x1,y,p[2]+h],[x0,y,p[2]+h]],{fill:c,a,edge:false,dz})}
  // stacked balls: each value goes to a bin one ball wide on the axis, dep balls deep (default 3), then upwards
  function pile(vals,X,r,dep){dep=dep||3;const cnt={},out=[];vals.forEach(v=>{const x=X(v),b=Math.round(x/(2*r)),k=cnt[b]=(cnt[b]||0)+1;out.push([b*2*r,r+Math.floor((k-1)/dep)*2*r*.92,((k-1)%dep-(dep-1)/2)*2*r])});return out}
  // an interval as a tinted band on the floor under its cloud, posts at the ends, the half-width written at the right
  function band(R,P,X,c0,hw,z,col,a,txt,lx){const x0=X(c0-hw),x1=X(c0+hw);R.box([(x0+x1)/2,0,z],[x1-x0,.02,.5],{fill:S3.mix(P.paper,col,.28),a:a*.9,shadow:false,edge:false});
    [x0,x1].forEach(x=>R.box([x,0,z],[.04,.22,.5],{fill:S3.mix(P.paper,col,.7),a,shadow:false}));if(txt)R.label([lx==null?x1+.08:lx,.1,z],txt,{al:'left',dx:6,mono:true,fs:12.5,b:1,c:col,a})}
  // a score axis at depth z: line, ticks and their labels
  function axis(R,P,X,lo,hi,step,z,a,fmt){R.line([[X(lo),0,z],[X(hi),0,z]],{c:P.mute,w:1,a});for(let v=lo;v<=hi+1e-9;v+=step){R.line([[X(v),0,z],[X(v),0,z+.12]],{c:P.mute,w:1,a});R.label([X(v),0,z],fmt(v),{fs:12,dy:-11,c:P.mute,a})}}
  const sd=a=>{const m=a.reduce((s,x)=>s+x,0)/a.length;return Math.sqrt(a.reduce((s,x)=>s+(x-m)*(x-m),0)/(a.length-1))};
  return {n,C,cl,pos,TS,W,D,CX,CZ,G,first,tile,pile,band,axis,sd};
})();
