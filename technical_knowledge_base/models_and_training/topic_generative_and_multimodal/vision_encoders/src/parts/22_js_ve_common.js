// ---- Vision encoders page: shared helpers (prefix ve) ----
window.VEU=(function(){
  const u8=s=>{const b=atob(s),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a};
  const i8=s=>new Int8Array(u8(s).buffer);
  const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const dark=()=>!!(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches);
  // sequential ramp (perceptually ordered, readable on light and dark): t in 0..1 -> [r,g,b]
  const STOPS=[[13,8,135],[84,2,163],[139,10,165],[185,50,137],[219,92,104],[244,136,73],[254,188,43],[240,249,33]];
  function ramp(t){t=Math.max(0,Math.min(1,t||0));const x=t*(STOPS.length-1),i=Math.min(STOPS.length-2,Math.floor(x)),f=x-i,a=STOPS[i],b=STOPS[i+1];
    return [a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,a[2]+(b[2]-a[2])*f]}
  // draw a g x g grid of colours (fn(i) -> [r,g,b]) into a canvas at its CSS size
  function grid(cv,g,fn,mark){
    const px=Math.max(1,Math.round((cv.clientWidth||160)*(window.devicePixelRatio||1)));cv.width=px;cv.height=px;
    const c=cv.getContext('2d'),s=px/g;
    for(let i=0;i<g*g;i++){const r=fn(i);c.fillStyle='rgb('+(r[0]|0)+','+(r[1]|0)+','+(r[2]|0)+')';const y=Math.floor(i/g),x=i%g;
      c.fillRect(Math.floor(x*s),Math.floor(y*s),Math.ceil(s)+1,Math.ceil(s)+1)}
    if(mark!=null&&mark>=0){const y=Math.floor(mark/g),x=mark%g;c.strokeStyle='#fff';c.lineWidth=Math.max(1.5,s*0.12);c.strokeRect(x*s+1,y*s+1,s-2,s-2);
      c.strokeStyle='#000';c.lineWidth=1;c.strokeRect(x*s,y*s,s,s)}
  }
  const pct=(x,d)=>(x*100).toFixed(d==null?1:d)+'%';
  const fmt=(x,d)=>Number(x).toLocaleString('en-GB',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  const ENC={clip:'CLIP B/32',siglip:'SigLIP 2 B/16',dino:'DINOv2 B/14',dinoreg:'DINOv2 B/14 + registers',mae:'MAE B/16',
    dino_cls:'DINOv2 B/14 [CLS]',dino_mean:'DINOv2 B/14 mean',dino_cat:'DINOv2 B/14 [CLS]+mean',mae_cls:'MAE B/16 [CLS]',mae_mean:'MAE B/16 mean'};
  const COL={clip:'var(--c1)',siglip:'var(--c2)',dino:'var(--c3)',dino_cls:'var(--c3)',dino_mean:'var(--c3)',dino_cat:'var(--c3)',dinoreg:'var(--c6)',mae:'var(--c4)',mae_cls:'var(--c4)',mae_mean:'var(--c4)'};
  // ViT multiply-accumulates for one R x R image (the page's formula; flops.py checks it against a FLOP counter)
  function macs(R,P,D,L,F,extra,glu){const N=Math.floor(R/P)**2,T=N+(extra||0),m=glu?3:2;
    const patch=N*3*P*P*D,proj=4*T*D*D*L,scores=2*T*T*D*L,mlp=m*T*D*F*L;return {N,T,patch,proj,scores,mlp,total:patch+proj+scores+mlp}}
  // a gallery thumbnail (index into the 1,000-image sprite) as a canvas-free div
  function thumb(i,size,extra){const r=Math.floor(i/40),c=i%40,k=size/28;
    return '<span class="ve-th" '+(extra||'')+' style="width:'+size+'px;height:'+size+'px;background-image:url('+VE.sprite+');background-size:'+(40*28*k)+'px '+(25*28*k)+'px;background-position:-'+(c*28*k)+'px -'+(r*28*k)+'px"></span>'}
  const CLASSES=['T-shirt/top','Trouser','Pullover','Dress','Coat','Sandal','Shirt','Sneaker','Bag','Ankle boot'];
  return {u8,i8,css,dark,ramp,grid,pct,fmt,ENC,COL,macs,thumb,CLASSES};
})();
