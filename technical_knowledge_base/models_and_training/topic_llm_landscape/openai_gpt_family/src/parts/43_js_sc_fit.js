// ---- Scene (Fig. 7, gpt-oss on one card): the model as a tower whose height is bytes (GB, 10^9): one slab per layer for the MoE weights (blue),
// the rest of the model (attention, embeddings, norms, kept in BF16) at the bottom (teal), the KV cache on top (gold); the card's memory is a glass
// plane. Weights and cache are the gpt-oss tab's own functions (OSS.wBytes, OSS.kvSeq in 18_js_oss.js, from config.json); activations and runtime
// overheads are not counted, as on the tab. Steps: BF16 against 80 GB, MXFP4 experts, the cache at 131,072 tokens, the cache without the window
// or GQA (illustrative alternatives, as on the tab), gpt-oss-20b on a 16 GB card. window.OGFIT holds the numbers. ----
window.OGFIT=(function(){
  if(typeof OSS==='undefined'||!OSS.kvSeq)return null;const B=1e9,T=131072,kv=(m,g,w)=>OSS.kvSeq(m,T,{gqa:g,win:w,kvb:2});
  const o={B,T,bf:OSS.wBytes('120b','bf'),mx:OSS.wBytes('120b','mx'),rest:OSS['120b'].rest*2,kv:kv('120b',true,true),kvNoWin:kv('120b',true,false),kvNoGqa:kv('120b',false,true),kvNone:kv('120b',false,false),
    mx20:OSS.wBytes('20b','mx'),rest20:OSS['20b'].rest*2,kv20:kv('20b',true,true)};
  o.left=80*B-o.mx;o.seqs=Math.floor(o.left/o.kv);o.cards=o.bf/(80*B);
  const per20=OSS.kvSeq('20b',T+1,{gqa:true,win:true,kvb:2})-o.kv20;o.tok20=Math.floor((16*B-o.mx20-OSS.kvSeq('20b',128,{gqa:true,win:true,kvb:2})+128*per20)/per20);
  return o})();
(function(){
  if(!document.getElementById('stg-fit')||!window.OGFIT||!window.S3)return;const {lerp,mix}=S3,F=OGFIT,B=F.B;
  // per step: model, expert format, card (GB), scale (world units per GB), which cache bands show
  const ST=[{m:'120b',f:'bf',cap:80,hs:4.2/F.bf*B,kv:0},{m:'120b',f:'mx',cap:80,hs:4.2/F.bf*B,kv:0},{m:'120b',f:'mx',cap:80,hs:3.1/80,kv:1},{m:'120b',f:'mx',cap:80,hs:3.6/((F.mx+F.kvNone)/B),kv:4},{m:'20b',f:'mx',cap:16,hs:3/17.5,kv:1}];
  const TW=1.5,TD=1.1,X0=0;
  const wts=s=>{const S=ST[s],a=OSS[S.m],moe=S.f==='bf'?a.mlp*2:a.mlp*4.25/8;return {L:a.L,rest:a.rest*2/B,moe:moe/B}};
  const kvs=s=>ST[s].m==='20b'?[F.kv20/B]:[F.kv/B,F.kvNoWin/B,F.kvNoGqa/B,F.kvNone/B];
  function draw(R,k,e,st){const P=R.P,pk=st.pk,t=pk===k?1:e;R.grid(-3.6,3.6,-1.6,1.6,.5);
    const la=s=>{const a=k===s?t:pk===s?1-e:0;return a>.5?(a-.5)*2:0};
    // a model swap (step 5) fades one model, its scale and its card out before the other comes in; otherwise scale and card glide
    const swap=ST[pk].m!==ST[k].m,mA=swap?(t<.5?1-2*t:2*t-1):1,s=swap?(t<.5?pk:k):k,W0=wts(swap?s:pk),W1=wts(s);
    const hs=swap?ST[s].hs:lerp(ST[pk].hs,ST[k].hs,t),cap=swap?ST[s].cap:lerp(ST[pk].cap,ST[k].cap,t),capY=cap*hs;
    const rest=lerp(W0.rest,W1.rest,swap?1:t),moe=lerp(W0.moe,W1.moe,swap?1:t),L=W1.L;
    R.box([X0,0,0],[TW,rest*hs,TD],{fill:mix(P.paper,P.c6,.55),a:mA,lw:.6});
    const sh=moe*hs/L;for(let i=0;i<L;i++)R.box([X0,rest*hs+i*sh,0],[TW,sh*.84,TD],{fill:mix(P.paper,P.c1,.42),a:mA,shadow:false,lw:.4});
    const top=(rest+moe)*hs;
    // the cache: as built solid gold; the illustrative alternatives as outlined bands above it
    const kA=s=>ST[s].kv,nk=swap?kA(s):lerp(kA(pk),kA(k),t),K=kvs(s);
    if(nk>.01){const a=Math.min(1,nk)*mA;R.box([X0,top,0],[TW,K[0]*hs,TD],{fill:P.c5,a,shadow:false,lw:.6});
      for(let j=1;j<K.length;j++){const b=Math.max(0,Math.min(1,nk-j+1))*mA;if(b<.01)continue;R.box([X0,top+K[j-1]*hs,0],[TW,(K[j]-K[j-1])*hs,TD],{fill:P.c5,fa:.1,ec:P.c5,ea:.9,lw:1.1,a:b,shadow:false})}
      // tokens arriving, written into the cache
      const fa=lerp(ST[pk].kv===1?1:0,ST[k].kv===1?1:0,t)*mA,IN=[X0+2.3,top+K[0]*hs*.5+.3,-.9];if(fa>.01){R.flow([IN,[X0+TW/2+.05,top+K[0]*hs*.5,-.3]],{c:P.c5,a:fa,r:.06,n:6,speed:1});R.glow(IN,.12,{c:P.ink,a:fa*.5});R.ball(IN,.05,{c:P.ink,a:fa})}}
    // the card's memory as a glass plane
    R.glass([X0-1.5,capY,-1],[3,0,0],[0,0,2],{c:P.c2,a:.8,nu:10,nv:6,th:.02});
    R.label([X0-1.5,capY,0],Math.round(cap)+' GB · one card',{al:'right',dx:-10,fs:12.5,b:1,c:P.c2,grp:'cap'});
    // labels
    const g=v=>(v).toFixed(1)+' GB';let a;
    const side=(y,txt,c,o)=>R.label([X0+TW/2,y,TD/2],txt,Object.assign({al:'left',dx:16,fs:12.5,b:1,mono:true,c},o||{}));
    if((a=la(0))>.01){side(top*.5,'experts, BF16 · '+g(wts(0).moe),P.c1,{a});side(rest*hs*.5,'rest · '+g(wts(0).rest),P.c6,{a,dy:6});R.label([X0,top,-TD/2],g(F.bf/B)+' · '+F.cards.toFixed(1)+' cards of 80 GB',{dy:-14,fs:13,b:1,c:P.bad,a})}
    if((a=la(1))>.01){side((rest*hs+top)/2,'experts, MXFP4 · '+g(wts(1).moe),P.c1,{a,dy:-6});side(rest*hs*.5,'rest, BF16 · '+g(wts(1).rest),P.c6,{a,dy:8});R.label([X0,top,-TD/2],g(F.mx/B)+' · fits',{dy:-14,fs:13,b:1,c:P.good,a})}
    if((a=la(2))>.01){side(top+F.kv/B*hs*.5,'cache, 131,072 tokens · '+(F.kv/B).toFixed(2)+' GB',P.c5,{a});side(top*.5,'weights · '+g(F.mx/B),P.c1,{a});
      R.label([X0-1.5,capY,0],(F.left/B).toFixed(1)+' GB left · room for '+F.seqs+' such sequences',{al:'right',dx:-10,dy:4,fs:12.5,b:1,c:P.good,a,grp:'cap'})}
    if((a=la(3))>.01){const K=kvs(3),nm=['as built','no window','no GQA','neither'];K.forEach((v,j)=>side(top+v*hs-(j?0:v*hs*.5),nm[j]+' · '+v.toFixed(1)+' GB',j?P.mute:P.c5,{a,b:!j,grp:'kv'}))}
    if((a=la(4))>.01){const w=F.mx20/B,c=F.kv20/B;side(top*.5,'gpt-oss-20b weights · '+g(w),P.c1,{a});side(top+c*hs*.5,'cache, 131,072 tokens · '+c.toFixed(2)+' GB',P.c5,{a});
      R.label([X0,top+c*hs,-TD/2],(w+c).toFixed(1)+' GB · '+(w+c-16).toFixed(1)+' GB over',{dy:-14,fs:13,b:1,c:P.bad,a})}
  }
  S3.stage({id:'stg-fit',list:'sx-fit',fig:'Fig. 7 · gpt-oss on one card: weights and cache against its memory',cam:[.5,.3],bounds:[[-3.2,0,-1],[3.4,4.6,1]],aspect:.64,dur:1700,hold:5200,draw,
    margin:w=>w<520?[16,8,14,8]:[22,16,18,16]});
})();
