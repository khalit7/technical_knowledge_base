// Reading section 2: the same 16 tokens decoded under MHA (top, before) and a chosen variant (bottom, after), each token's cache
// entry in one layer drawn to scale (one square = 16 numbers). Moved from the root's Attention lab (32_js_at_2anim.js), adapted to RD.
// Shapes from the topic's src/data/configs.py; tokens are the running sequence (AVR.run_pieces).
(function(){
  if(!window.RD||!window.AVR||!document.getElementById('av-cc-card'))return;
  const $=id=>document.getElementById(id),N=16,L=6,BY=2,CTX=256,HQ=8;
  const toks=AVR.run_pieces.slice(0,N).map(p=>p===''?'<eot>':p);
  const grp=n=>Math.round(n).toLocaleString('en-US');
  function bytes(b){const a=Math.abs(b);if(a>=2**30)return (b/2**30).toFixed(2)+' GiB';if(a>=2**20)return (b/2**20).toFixed(a>=100*2**20?0:1)+' MiB';if(a>=1024)return (b/1024).toFixed(a>=100*1024?0:1)+' KiB';return Math.round(b)+' B'}
  const V={mha:{nm:'MHA',kv:8},gqa4:{nm:'GQA-4',kv:4},gqa2:{nm:'GQA-2',kv:2},mqa:{nm:'MQA',kv:1},mla:{nm:'MLA',lat:64,rope:16},swa:{nm:'Sliding window (8, illustrative)',kv:8,W:8}};
  const nums=v=>v.lat?v.lat+v.rope:2*v.kv*32;
  // one colour per KV head: a muted, evenly weighted set (Tableau 10 order) so eight heads read as a family, not a rainbow
  const hue=g=>['#4e79a7','#f28e2b','#59a14f','#b07aa1','#d4a72c','#76b7b2','#e15759','#9c755f'][g%8];
  let cur='gqa2';
  function panel(v,i,x0,y0,s,lab){
    const cw=4*s,gap=Math.max(3,s),out=[];let h=0;
    out.push(RD.t(x0,y0+12,lab,{fs:12,w:600}));
    const gy=y0+20;
    const rows=v.lat?2:v.kv;
    // empty slots for the tokens still to come, so the panel is laid out at full size from the first step
    for(let j=i+1;j<N;j++)out.push('<rect x="'+(x0+j*(cw+gap))+'" y="'+gy+'" width="'+(cw-1)+'" height="'+(rows*s-1)+'" rx="2" fill="none" stroke="var(--line)" stroke-dasharray="3 3"/>');
    for(let j=0;j<=i;j++){
      const x=x0+j*(cw+gap);const ev=v.W&&j<=i-v.W;
      out.push('<g'+(j===i?' class="rd-new"':v.W&&j===i-v.W?' class="rd-gone"':'')+'>');
      if(v.lat){
        for(let c=0;c<4;c++)out.push('<rect x="'+(x+c*s)+'" y="'+gy+'" width="'+(s-1)+'" height="'+(s-1)+'" rx="1" fill="var(--good)"/>');
        out.push('<rect x="'+x+'" y="'+(gy+s)+'" width="'+(s-1)+'" height="'+(s-1)+'" rx="1" fill="var(--c6)"/>');h=Math.max(h,2*s);
      }else{
        for(let r=0;r<v.kv;r++)for(let c=0;c<4;c++){
          const col=ev?'var(--dim)':hue(r);out.push('<rect x="'+(x+c*s)+'" y="'+(gy+r*s)+'" width="'+(s-1)+'" height="'+(s-1)+'" rx="1" fill="'+col+'"'+(c>=2&&!ev?' fill-opacity=".5"':'')+'/>');
        }
        h=Math.max(h,v.kv*s);
      }
      out.push('</g>');
      if(j===i)out.push('<rect x="'+(x-1.5)+'" y="'+(gy-1.5)+'" width="'+(cw+2)+'" height="'+((v.lat?2:v.kv)*s+2)+'" fill="none" stroke="var(--ink)" stroke-width="1.2" rx="2"/>');
    }
    let ty=gy+Math.max(h,s);
    if(lab.startsWith('Before')&&cw+gap>=40){for(let j=0;j<=i;j++){const p=toks[j].replace(/^ /,'');out.push(RD.t(x0+j*(cw+gap)+cw/2,ty+13,RD.esc(p.length>6?p.slice(0,5)+'.':p),{a:'middle',fs:11,fill:j===i?'var(--ink)':'var(--mute)'}))}ty+=16}
    const qy=ty+10,qs=Math.max(7,Math.min(11,s+3));
    out.push(RD.t(x0,qy+qs-1,'query heads',{fs:11,fill:'var(--mute)'}));
    for(let q=0;q<HQ;q++){const g=v.lat?-1:Math.floor(q/(HQ/v.kv));
      out.push('<circle cx="'+(x0+78+q*(qs+4)+qs/2)+'" cy="'+(qy+qs/2)+'" r="'+(qs/2)+'" fill="'+(g<0?'var(--good)':hue(g))+'"/>')}
    return {svg:out.join(''),h:(qy+qs)-y0};
  }
  function caption(i){
    const v=V[cur],nb=nums(v),tk=RD.esc(toks[i]);
    const now=(n,vv)=>(vv.W?Math.min(n,vv.W):n)*nums(vv)*L*BY;
    let s='<b>Token '+(i+1)+' of '+N+': "'+tk+'".</b> ';
    if(i===0)s+='It is projected to a query, key and value in every layer. Its key and value are written to the cache, because every later token will need them: MHA writes 8 heads x 2 x 32 = <b>512 numbers</b> per layer; '+v.nm+' writes <b>'+nb+'</b>.';
    else if(i===1)s+='The new token computes its own key and value once and appends them. The entries of token 1 are not recomputed: a token\'s keys and values at a layer never change in a causal decoder. Its query is compared with both cached keys.';
    else if(i===2)s+=(v.lat?'Under MLA all 8 query heads read the same latent: the per-head keys and values are rebuilt from it (or absorbed into the query and output projections at decode), so heads stay distinct although only 80 numbers are stored.':v.kv===8?'Under MHA each query head reads its own KV head.':'The dots show the grouping: '+(HQ/v.kv)+' query heads of one colour share one KV head. Queries keep full resolution, only keys and values are shared.');
    else if(v.W&&i>=v.W)s+='The window is full: the oldest entry ("'+RD.esc(toks[i-v.W])+'") is evicted (grey) as the new one arrives. The cache stops growing at '+v.W+' tokens; the cost is that this layer can no longer see "'+RD.esc(toks[i-v.W])+'" at all.';
    else if(i===N-1)s+='After '+N+' tokens MHA holds '+bytes(now(N,V.mha))+' over 6 layers in bf16, '+v.nm+' '+bytes(now(N,v))+'. At the full 256-token context: '+bytes(6144*CTX)+' against '+bytes((cur==='swa'?1536:nb*L*BY)*CTX)+(cur==='swa'?' (trained window 64: 64 of 256 tokens per layer)':'')+'.';
    else s+='Each step adds one column per layer. The cache grows linearly: '+(i+1)+' tokens x '+nb+' numbers x 6 layers x 2 bytes = '+bytes(now(i+1,v))+(v.W?' (capped at '+v.W+' tokens)':'')+'.';
    return s;
  }
  function draw(i){
    const el=$('av-cc-svg'),W=Math.max(300,RD.width(el));
    const s=Math.max(4,Math.min(12,Math.floor((W-6)/(N*5))));
    const p1=panel(V.mha,i,2,0,s,'Before: MHA, 512 numbers per token per layer');
    const p2=panel(V[cur],i,2,p1.h+16,s,'After: '+V[cur].nm+', '+nums(V[cur])+' numbers per token per layer');
    el.innerHTML=RD.svg(W,p1.h+16+p2.h+4,p1.svg+p2.svg,'Cache entries per token, MHA against '+V[cur].nm);
    $('av-cc-cap').innerHTML=caption(i);
    const v=V[cur],n=i+1,mb=n*512*L*BY,vb=(v.W?Math.min(n,v.W):n)*nums(v)*L*BY,at256=cur==='swa'?1536:nums(v)*L*BY;
    $('av-cc-stats').innerHTML=RD.stat('Tokens decoded',n,'"'+RD.esc(toks[i])+'"')+RD.stat('MHA cache now',bytes(mb),'6 layers, bf16')+
      RD.stat(v.nm.split(' (')[0]+' cache now',bytes(vb),Math.round(100*vb/mb)+'% of MHA')+
      RD.stat('Per token, all layers',grp(at256)+' B','MHA 6,144 B'+(cur==='swa'?'; window 64 at context 256':''));
  }
  function legend(){const v=V[cur];
    $('av-cc-leg').innerHTML=(v.lat?'<span><i style="background:var(--good)"></i>latent (64 numbers, 4 squares)</span><span><i style="background:var(--c6)"></i>RoPE key (16 numbers)</span>':'')+
      '<span><i style="background:'+hue(0)+'"></i>key, one colour per KV head</span><span><i style="background:'+hue(0)+';opacity:.5"></i>value</span>'+(v.W?'<span><i style="background:var(--dim)"></i>evicted</span>':'')+'<span>one square = 16 numbers</span>'}
  const an=RD.anim({card:'av-cc-card',ctl:'av-cc-ctl',n:N,draw,ms:1500,label:'Token'});
  RD.seg($('av-cc-seg'),m=>{cur=m;legend();an.reset(N)});
  legend();RD.onResize(()=>an.redraw());
})();
