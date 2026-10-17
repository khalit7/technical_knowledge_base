// ---- Shared helpers for this page (all tabs): formatting, the FLOPs formula, derived values, data-ld spans, predict cards ----
window.LDU=(function(){
  const L=window.LD;
  const int=n=>Math.round(n).toLocaleString('en-US');
  const fx=(n,d)=>Number(n).toFixed(d);
  const M=n=>fx(n/1e6,1)+'M';
  const B=n=>fx(n/1e9,n>=1e10?1:2)+'B';
  const P=n=>n>=1e9?B(n):M(n);
  const FL=n=>n>=1e15?fx(n/1e15,2)+' PFLOP':n>=1e12?fx(n/1e12,n>=1e14?0:2)+' TFLOP':n>=1e9?fx(n/1e9,1)+' GFLOP':fx(n/1e6,1)+' MFLOP';
  const pct=(x,d)=>fx(100*x,d==null?0:d)+'%';
  const byKey={};(L.arch||[]).forEach(m=>byKey[m.key]=m);
  // FLOPs of one denoiser pass: exact quadratic in image tokens N and text tokens T (fitted to the meta-device counts)
  function flops(key,N,T){const f=L.flops[key];if(!f)return NaN;if(T==null)T=f.T;const k=f.fit;return k[0]+k[1]*N+k[2]*T+k[3]*N*N+k[4]*N*T+k[5]*T*T}
  // image tokens (transformer) or latent positions (U-Net) for a W x H image
  function tokens(key,W,H){const f=L.flops[key];const s=f.f*(f.p||1);return Math.floor(W/s)*Math.floor(H/s)}
  function grid(key,res,T){const f=L.flops[key];T=T==null?f.T:T;return f.grid.find(g=>g[0]===res&&g[1]===T)}
  // derived values used in the prose (data-ld="a.b.c")
  const D={te:L.te||{},tiny:{},cost:{},xm:{}};
  if(L.tiny){D.tiny.floor=L.tiny.floor}
  const g5=grid('sd15',512),g20=grid('sd15',2048);
  if(g5)D.cost.sd15_attn512=g5[3]/g5[2];if(g20)D.cost.sd15_attn2048=g20[3]/g20[2];
  Object.entries(L.xa||{}).forEach(([k,v])=>{const m=v.mass['16']||{};D.xm[k]={start16:m.start,words16:m.words,end16:m.end_and_padding}});
  function get(path){return path.split('.').reduce((o,k)=>o==null?o:o[k],D)}
  function fmt(v,f){if(v==null||Number.isNaN(v))return '?';switch(f){case 'f6':return fx(v,6);case 'f2':return fx(v,2);case 'f1':return fx(v,1);
    case 'pct0':return pct(v,0);case 'pct1':return pct(v,1);case 'int':return int(v);case 'g':return String(v);default:return String(v)}}
  function fill(root){(root||document).querySelectorAll('[data-ld]').forEach(el=>{el.textContent=fmt(get(el.dataset.ld),el.dataset.f)})}
  // predict-then-reveal cards: answers are set by setAns(id, html) before the click
  const ANS={};
  function setAns(id,h){ANS[id]=h}
  function wirePredicts(){document.querySelectorAll('.ldp .pr').forEach(pr=>{const o=pr.querySelector('.opts');if(!o||o.dataset.w)return;o.dataset.w=1;
    o.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
      pr.querySelectorAll('.opts button').forEach(x=>{x.classList.toggle('right',x.dataset.ok==='1');if(x===b&&x.dataset.ok!=='1')x.classList.add('wrong')});
      const a=pr.querySelector('.ans');a.innerHTML=ANS[pr.id]||'';a.hidden=false})})}
  // a horizontal bar list: rows [{name, v, label, color, hl}]
  function bars(el,rows,max){max=max||Math.max(...rows.map(r=>r.v));
    el.innerHTML=rows.map(r=>'<div class="'+(r.hl?'hl':'')+'"><span class="nm">'+r.name+'</span><span class="tr"><span style="width:'+Math.max(0.5,100*r.v/max).toFixed(2)+'%;'+(r.color?'background:'+r.color:'')+'"></span></span><span class="v">'+r.label+'</span></div>').join('')}
  const CAT={conv:['Convolutions (ResNet blocks)','var(--c5)'],attn_img:['Attention, image stream','var(--c1)'],attn_txt:['Attention, text stream','var(--c6)'],
    cross:['Cross-attention','var(--c4)'],mlp_img:['MLP, image stream','var(--c3)'],mlp_txt:['MLP, text stream','#7fa98a'],mod:['Modulation (adaLN, time injection)','var(--c2)'],embed:['Embeddings and heads','var(--dim)']};
  const CATS=['conv','attn_img','cross','attn_txt','mlp_img','mlp_txt','mod','embed'];
  function b64u8(s){const b=atob(s);const a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a}
  // a colour ramp for attention maps (dark blue to yellow), alpha for overlays
  function ramp(t){t=Math.max(0,Math.min(1,t));const c=[[13,8,135],[126,3,168],[204,71,120],[248,149,64],[240,249,33]];const x=t*4,i=Math.min(3,Math.floor(x)),f=x-i;
    return c[i].map((v,j)=>Math.round(v+(c[i+1][j]-v)*f))}
  // draw an image dimmed, then an attention map (side x side, 0..255) on top, upscaled smoothly, alpha by value
  function overlay(c,img,map,side,alpha){const W=c.width,H=c.height,x=c.getContext('2d');x.clearRect(0,0,W,H);
    if(img){x.globalAlpha=0.55;x.drawImage(img,0,0,W,H);x.globalAlpha=1}
    const t=document.createElement('canvas');t.width=side;t.height=side;const tx=t.getContext('2d'),id=tx.createImageData(side,side);
    for(let i=0;i<side*side;i++){const v=map[i]/255,[r,g,b]=ramp(v);id.data[4*i]=r;id.data[4*i+1]=g;id.data[4*i+2]=b;id.data[4*i+3]=Math.round(255*alpha*Math.pow(v,0.8))}
    tx.putImageData(id,0,0);x.imageSmoothingEnabled=true;x.drawImage(t,0,0,W,H)}
  return {L,int,fx,M,B,P,FL,pct,byKey,flops,tokens,grid,D,get,fmt,fill,setAns,wirePredicts,bars,CAT,CATS,b64u8,ramp,overlay};
})();
