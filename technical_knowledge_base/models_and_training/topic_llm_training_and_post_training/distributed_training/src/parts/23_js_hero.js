// ---- Reading: hero, six ways to cut one step (who holds which piece of the batch and of the model) ----
(function(){
  const els=[...document.querySelectorAll('#heroP [data-hero]')];
  if(!els.length)return;
  const G=['var(--c1)','var(--c2)','var(--c3)','var(--c4)'],REP='var(--dim)';
  const CPG=[0,1,2,3,3,2,1,0];   // Llama 3's load-balanced chunks: rank i takes chunks i and 2c-1-i
  // which GPU holds batch cell (sequence r, chunk c); -1 means every GPU sees it
  function bat(f,r,c){if(f==='TP'||f==='PP')return -1;if(f==='CP')return CPG[c];return r}
  // which GPU holds model slice (layer row r, half 0 = attention / 1 = feed-forward, slice q); -1 = full copy everywhere
  function mod(f,r,h,q){if(f==='DP'||f==='CP')return -1;if(f==='PP')return r>>1;if(f==='EP')return h?q:-1;return q}
  function draw(el){
    const f=el.dataset.hero,w=Math.max(130,RD.width(el)),t=RD.t;
    const bw=Math.floor(w*0.38),cs=Math.max(5,Math.min(10,(bw-8)/8-1.4)),mx=bw+12,mw=w-mx-2,sw=(mw-6)/8,rh=7;
    let s='';const y0=16;
    s+=t(0,11,'batch',{fill:'var(--mute)'})+t(mx,11,'model',{fill:'var(--mute)'});
    for(let r=0;r<4;r++)for(let c=0;c<8;c++){const g=bat(f,r,c),x=c*(cs+1.4),y=y0+r*(cs+1.4);
      s+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+cs.toFixed(1)+'" height="'+cs.toFixed(1)+'" rx="1" fill="'+(g<0?REP:G[g])+'"'+(g<0?'':' fill-opacity="0.85"')+'/>'}
    const by=y0+4*(cs+1.4);
    for(let r=0;r<8;r++){const y=y0+r*(rh+2);
      for(let h=0;h<2;h++)for(let q=0;q<4;q++){const g=mod(f,r,h,q),x=mx+h*(4*sw+6)+q*sw;
        const sh=f==='ZeRO-3';
        s+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+(sw-1).toFixed(1)+'" height="'+rh+'" fill="'+(g<0?REP:G[g])+'" fill-opacity="'+(g<0?1:sh?0.4:0.85)+'"'+(sh?' stroke="'+G[g]+'" stroke-dasharray="2 1.5" stroke-width="0.9"':'')+'/>'}}
    const my=y0+8*(rh+2)+10;
    s+=t(mx,my,'attn',{fill:'var(--mute)'})+t(mx+4*sw+6,my,f==='EP'?'experts':'FFN',{fill:'var(--mute)'});
    const H=Math.max(by,my)+4;
    el.innerHTML=RD.svg(w,H,s,f+': which GPU holds which part of the batch and the model');
  }
  const all=()=>els.forEach(draw);
  RD.onRender(all);RD.onResize(all);all();
})();
