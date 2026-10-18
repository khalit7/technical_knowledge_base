// Attention lab section 2: the same 16 tokens decoded under MHA (top, before) and a chosen variant (bottom, after),
// each token's cache entry in one layer drawn to scale (one square = 16 numbers). Shapes from src/data/configs.py.
(function(){
  const A=window.AT,D=window.ATD;if(!A||!D||!A.$('at-an-card'))return;
  const $=A.$,N=16,L=6,BY=2,CTX=256,HQ=8;
  const toks=D.seq.pieces.slice(0,N).map(p=>p===''?'<eot>':p);
  // per-token-per-layer entry: kv heads (rows of [K K V V], 32 numbers each half) or the MLA latent + rope key
  const V={mha:{nm:'MHA',kv:8},gqa4:{nm:'GQA-4',kv:4},gqa2:{nm:'GQA-2',kv:2},mqa:{nm:'MQA',kv:1},mla:{nm:'MLA',lat:64,rope:16},swa:{nm:'Sliding window (8, illustrative)',kv:8,W:8}};
  const nums=v=>v.lat?v.lat+v.rope:2*v.kv*32;
  const hue=g=>'hsl('+[212,25,140,280,45,185,330,95][g%8]+',55%,52%)';
  let cur='gqa2';
  function panel(v,i,x0,y0,s,lab){
    const cw=4*s,gap=Math.max(3,s),out=[];let h=0;
    out.push(A.t(x0,y0+12,lab,{fs:12,w:600}));
    const gy=y0+20;
    for(let j=0;j<=i;j++){
      const x=x0+j*(cw+gap);const ev=v.W&&j<=i-v.W;
      if(v.lat){
        for(let c=0;c<4;c++)out.push('<rect x="'+(x+c*s)+'" y="'+gy+'" width="'+(s-1)+'" height="'+(s-1)+'" rx="1" fill="var(--c4)"/>');
        out.push('<rect x="'+x+'" y="'+(gy+s)+'" width="'+(s-1)+'" height="'+(s-1)+'" rx="1" fill="var(--c5)"/>');h=Math.max(h,2*s);
      }else{
        for(let r=0;r<v.kv;r++)for(let c=0;c<4;c++){
          const col=ev?'var(--dim)':hue(r);out.push('<rect x="'+(x+c*s)+'" y="'+(gy+r*s)+'" width="'+(s-1)+'" height="'+(s-1)+'" rx="1" fill="'+col+'"'+(c>=2&&!ev?' fill-opacity=".5"':'')+'/>');
        }
        h=Math.max(h,v.kv*s);
      }
      if(j===i)out.push('<rect x="'+(x-1.5)+'" y="'+(gy-1.5)+'" width="'+(cw+2)+'" height="'+((v.lat?2:v.kv)*s+2)+'" fill="none" stroke="var(--ink)" stroke-width="1.2" rx="2"/>');
    }
    // token labels under the columns when there is room
    let ty=gy+Math.max(h,s);
    if(lab.startsWith('Before')&&cw+gap>=40){for(let j=0;j<=i;j++){const p=toks[j].replace(/^ /,'');out.push(A.t(x0+j*(cw+gap)+cw/2,ty+13,A.esc(p.length>6?p.slice(0,5)+'.':p),{a:'middle',fs:11,fill:j===i?'var(--ink)':'var(--mute)'}))}ty+=16}
    // query heads of the newest token, coloured by the KV head each one reads
    const qy=ty+10,qs=Math.max(7,Math.min(11,s+3));
    out.push(A.t(x0,qy+qs-1,'query heads',{fs:11,fill:'var(--mute)'}));
    for(let q=0;q<HQ;q++){const g=v.lat?-1:Math.floor(q/(HQ/v.kv));
      out.push('<circle cx="'+(x0+78+q*(qs+4)+qs/2)+'" cy="'+(qy+qs/2)+'" r="'+(qs/2)+'" fill="'+(g<0?'var(--c4)':hue(g))+'"/>')}
    return {svg:out.join(''),h:(qy+qs)-y0};
  }
  function caption(i){
    const v=V[cur],nb=nums(v),tk=A.esc(toks[i]);
    const now=(n,vv)=>(vv.W?Math.min(n,vv.W):n)*nums(vv)*L*BY;
    let s='<b>Token '+(i+1)+' of '+N+': "'+tk+'".</b> ';
    if(i===0)s+='It is projected to a query, key and value in every layer. Its key and value are written to the cache, because every later token will need them: MHA writes 8 heads x 2 x 32 = <b>512 numbers</b> per layer; '+v.nm+' writes <b>'+nb+'</b>.';
    else if(i===1)s+='The new token computes its own key and value once and appends them. The entries of token 1 are not recomputed: a token\'s keys and values at a layer never change in a causal decoder. Its query is compared with both cached keys.';
    else if(i===2)s+=(v.lat?'Under MLA all 8 query heads read the same latent: the per-head keys and values are rebuilt from it (or absorbed into the query and output projections at decode), so heads stay distinct although only 80 numbers are stored.':v.kv===8?'Under MHA each query head reads its own KV head.':'The dots show the grouping: '+(HQ/v.kv)+' query heads of one colour share one KV head. Queries keep full resolution, only keys and values are shared.');
    else if(v.W&&i>=v.W)s+='The window is full: the oldest entry ("'+A.esc(toks[i-v.W])+'") is evicted (grey) as the new one arrives. The cache stops growing at '+v.W+' tokens; the cost is that this layer can no longer see "'+A.esc(toks[i-v.W])+'" at all.';
    else if(i===N-1)s+='After '+N+' tokens MHA holds '+A.bytes(now(N,V.mha))+' over 6 layers in bf16, '+v.nm+' '+A.bytes(now(N,v))+'. At the full 256-token context: '+A.bytes(6144*CTX)+' against '+A.bytes((cur==='swa'?1536:nb*L*BY)*CTX)+(cur==='swa'?' (trained window 64: 64 of 256 tokens per layer)':'')+'. Section 3 shows what each variant cost in held-out loss on the same budget.';
    else s+='Each step adds one column per layer. The cache grows linearly: '+(i+1)+' tokens x '+nb+' numbers x 6 layers x 2 bytes = '+A.bytes(now(i+1,v))+(v.W?' (capped at '+v.W+' tokens)':'')+'.';
    return s;
  }
  function draw(i){
    const el=$('at-an-svg'),W=Math.max(300,A.width(el));
    const s=Math.max(4,Math.min(10,Math.floor((W-6)/(N*5))));
    const p1=panel(V.mha,i,2,0,s,'Before: MHA, 512 numbers per token per layer');
    const p2=panel(V[cur],i,2,p1.h+16,s,'After: '+V[cur].nm+', '+nums(V[cur])+' numbers per token per layer');
    const H=p1.h+16+p2.h+4;
    el.innerHTML=A.svg(W,H,p1.svg+p2.svg,'Cache entries per token, MHA against '+V[cur].nm);
    $('at-an-cap').innerHTML=caption(i);
    const v=V[cur],n=i+1,mb=n*512*L*BY,vb=(v.W?Math.min(n,v.W):n)*nums(v)*L*BY;
    const at256=cur==='swa'?1536:nums(v)*L*BY;
    $('at-an-stats').innerHTML=A.stat('Tokens decoded',n,'"'+A.esc(toks[i])+'"')+A.stat('MHA cache now',A.bytes(mb),'6 layers, bf16')+
      A.stat(v.nm.split(' (')[0]+' cache now',A.bytes(vb),Math.round(100*vb/mb)+'% of MHA')+
      A.stat('Per token, all layers',A.grp(at256)+' B','MHA 6,144 B'+(cur==='swa'?'; window 64 at context 256':''));
  }
  function legend(){const v=V[cur];
    $('at-an-leg').innerHTML=(v.lat?'<span><i style="background:var(--c4)"></i>latent (64 numbers, 4 squares)</span><span><i style="background:var(--c5)"></i>RoPE key (16 numbers)</span>':'')+
      '<span><i style="background:'+hue(0)+'"></i>key, one colour per KV head</span><span><i style="background:'+hue(0)+';opacity:.5"></i>value</span>'+(v.W?'<span><i style="background:var(--dim)"></i>evicted</span>':'')+'<span>one square = 16 numbers</span>'}
  const an=A.anim({card:'at-an-card',ctl:'at-an-ctl',n:N,draw,ms:1500,label:'Token'});
  A.seg($('at-an-seg'),m=>{cur=m;legend();an.reset(N)});
  legend();A.onResize(()=>an.redraw());
})();
