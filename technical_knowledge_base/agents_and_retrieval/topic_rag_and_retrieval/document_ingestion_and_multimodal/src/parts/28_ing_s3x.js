// ---- Helpers for this page's 3D scenes (on top of the unchanged renderer 25_js_s3.js): a real picture laid on a flat quad, and PDF boxes mapped onto a page plate ----
window.ING3=(function(){
  if(!window.S3)return null;const {add,mul}=S3;
  const cache={},stages=[];
  // an image decoded once; every stage redraws when it arrives
  function img(src){if(!src)return null;let im=cache[src];if(!im){im=new Image();im.onload=()=>{im.ok=1;stages.forEach(s=>{try{s.draw()}catch(e){}})};im.src=src;cache[src]=im}return im.ok?im:null}
  // a picture on a flat quad: corner o0, edge vectors u (image x) and v (image y). Drawn in tiles, each mapped affinely, so perspective barely bends it.
  // o.under: draw it with the floor (a sheet lying on the floor, under everything else); o.a alpha; o.nu, o.nv tiles
  function pic(R,im,o0,u,v,o){o=o||{};const a=o.a==null?1:o.a;if(!im||a<=.01)return;const nu=o.nu||6,nv=o.nv||8,W=im.naturalWidth,H=im.naturalHeight,P=R.P;
    const pts=[];for(let j=0;j<=nv;j++){const row=[];for(let i=0;i<=nu;i++)row.push(R.p(add(add(o0,mul(u,i/nu)),mul(v,j/nv))));pts.push(row)}
    const z=(pts[0][0][2]+pts[nv][nu][2]+pts[0][nu][2]+pts[nv][0][2])/4+(o.dz||0);
    const f=cx=>{cx.save();cx.globalAlpha=a*(P.dark?.82:1);
      for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const p0=pts[j][i],p1=pts[j][i+1],p2=pts[j+1][i];
        cx.save();cx.transform(p1[0]-p0[0],p1[1]-p0[1],p2[0]-p0[0],p2[1]-p0[1],p0[0],p0[1]);
        cx.drawImage(im,i*W/nu,j*H/nv,W/nu,H/nv,0,0,1.025,1.025);cx.restore()}
      // a thin ink rim so the sheet reads as paper on the card
      cx.globalAlpha=a*.7;cx.strokeStyle='rgb('+P.edge.map(Math.round).join(',')+')';cx.lineWidth=1;cx.beginPath();
      [[0,0],[nu,0],[nu,nv],[0,nv]].forEach(([i,j],k)=>{const p=pts[j][i];k?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1])});cx.closePath();cx.stroke();cx.restore()};
    if(o.under)R.under.push(f);else R.q.push({z,f})}
  // a PDF page lying on the floor: page size (points, origin top left) mapped to world x0..x0+w (left to right) and z0..z0+d (top of the page far, bottom near)
  function sheet(pw,ph,x0,z0,w){const s=w/pw,d=ph*s;
    return {w,d,s,x0,z0,
      at:(x,y,h)=>[x0+x*s,h||0,z0+y*s],                                   // a point of the page at height h
      box:(b,h)=>({c:[x0+(b[0]+b[2])/2*s,h||0,z0+(b[1]+b[3])/2*s],s:[Math.max(.02,(b[2]-b[0])*s),.035,Math.max(.02,(b[3]-b[1])*s)]})}}
  return {img,pic,sheet,stages};
})();
