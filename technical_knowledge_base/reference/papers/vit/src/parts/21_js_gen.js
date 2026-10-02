// ---- The toy task's image generator. The SAME file runs in the page and, through node, makes the training data (gen_data.js) ----
// A 28x28 grey image holds three outline shapes; two are the same kind. The label is the kind that appears twice.
// Kinds: 0 ring, 1 square, 2 triangle, 3 plus, 4 x. Every image is a pure function of its seed.
(function(root){
const S=28,KINDS=['ring','square','triangle','plus','x'];
function rng(seed){let a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
// draw one shape of kind k with its top-left corner at (x,y), size s (pixels), intensity v, into img (Float32Array S*S)
function put(img,x,y,v){if(x>=0&&y>=0&&x<S&&y<S){const i=y*S+x;if(img[i]<v)img[i]=v}}
function line(img,x0,y0,x1,y1,v){const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0))*2+1;for(let i=0;i<=n;i++){const t=i/n;put(img,Math.round(x0+(x1-x0)*t),Math.round(y0+(y1-y0)*t),v)}}
function shape(img,k,x,y,s,v){const e=s-1,c=e/2;
  if(k===0){const r=c;for(let i=0;i<64;i++){const a=i/64*2*Math.PI;put(img,Math.round(x+c+r*Math.cos(a)),Math.round(y+c+r*Math.sin(a)),v)}}
  else if(k===1){line(img,x,y,x+e,y,v);line(img,x+e,y,x+e,y+e,v);line(img,x+e,y+e,x,y+e,v);line(img,x,y+e,x,y,v)}
  else if(k===2){line(img,x+c,y,x+e,y+e,v);line(img,x+e,y+e,x,y+e,v);line(img,x,y+e,x+c,y,v)}
  else if(k===3){line(img,x+c,y,x+c,y+e,v);line(img,x,y+c,x+e,y+c,v)}
  else{line(img,x,y,x+e,y+e,v);line(img,x+e,y,x,y+e,v)}}
// layout of one image: [{k,x,y,s,v}] for three shapes in non-overlapping boxes (one pixel of gap)
function layout(seed,kinds){const r=rng(seed);let rep,odd;
  if(kinds){rep=null}else{rep=Math.floor(r()*5);odd=(rep+1+Math.floor(r()*4))%5}
  const ks=kinds||[rep,rep,odd];
  if(!kinds){for(let i=2;i>0;i--){const j=Math.floor(r()*(i+1));const t=ks[i];ks[i]=ks[j];ks[j]=t}}
  for(let tries=0;tries<200;tries++){const out=[];let ok=true;
    for(let i=0;i<3&&ok;i++){const s=7+Math.floor(r()*3),x=Math.floor(r()*(S-s+1)),y=Math.floor(r()*(S-s+1));
      for(const o of out){if(x<o.x+o.s+1&&o.x<x+s+1&&y<o.y+o.s+1&&o.y<y+s+1){ok=false;break}}
      out.push({k:ks[i],x,y,s,v:.65+.35*r()})}
    if(ok)return out}
  return null}
function render(L,noiseSeed,noise){const img=new Float32Array(S*S);L.forEach(o=>shape(img,o.k,o.x,o.y,o.s,o.v));
  if(noise){const r=rng(noiseSeed^0x9E3779B9);for(let i=0;i<S*S;i++){img[i]=Math.min(1,Math.max(0,img[i]+(r()-.5)*2*noise))}}
  return img}
const NOISE=.15;
function labelOf(L){const c=[0,0,0,0,0];L.forEach(o=>c[o.k]++);const m=c.indexOf(2);return m}
// sample(seed): {img, label, L}. Seeds below 2^30 are the training stream; the page's own test uses seeds from 2^30 up.
function sample(seed){let L=layout(seed),s2=seed;while(!L){s2=(s2*1103515245+12345)>>>0;L=layout(s2)}return {img:render(L,seed,NOISE),label:labelOf(L),L}}
const api={S,KINDS,rng,layout,render,sample,labelOf,NOISE,shape};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TOYGEN=api;
})(typeof window!=='undefined'?window:globalThis);
