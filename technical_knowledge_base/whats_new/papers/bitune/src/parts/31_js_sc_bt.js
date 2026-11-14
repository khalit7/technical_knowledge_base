// ---- Scene: Bitune's prefill against the standard one, on this page's trained toy, computed live (renderer v2: glass plates, flowing dots, camera per step) ----
// The fixed example prompt "<bos> Eve Max Ada Xan Ivy ? chess" (only Ada is in the chess club) through the shipped seed-0 models of 22_js_model.js:
// LoRA (one causal pass) and Bitune (a causal pass with the default adapter, a bidirectional pass with its own adapter, the caches mixed per block).
// Every bar, weight and probability is BT.run's output; nothing is precomputed.
(function(){
  if(!document.getElementById('stg-bt')||!window.BT)return;const {at,off,lerp,mix}=S3;
  const V=BT.vocab,P0=BT.p0,C0=BT.c0,L=BT.cfg.L,H=BT.cfg.h;
  // the example: the first member of the chess club and four non-members, chosen once so the page always tells the same story
  const club=V.indexOf('chess'),NP=C0-P0;let mem=-1;const non=[];
  for(let p=0;p<NP;p++){if(BT.member(club-C0,p)){if(mem<0)mem=p}else non.push(p)}
  const ppl=[non[3],non[11],mem,non[20],non[7]],ids=[1,...ppl.map(p=>P0+p),BT.IDX['?'],club],T=ids.length,lab=ids.map(i=>V[i].replace('<bos>','bos'));
  const MI=1+ppl.indexOf(mem),CH=T-1,QM=T-2,BL=1; // the member's position, "chess", "?", and the block shown up close (block 2: the first whose K, V can carry bidirectional context)
  let D=null,MODE='bitune';
  const avgH=A=>A[0].map((r,i)=>r.map((_,j)=>{let s=0;for(let h=0;h<H;h++)s+=A[h][i][j];return s/H}));
  function data(){if(D)return D;const r={lora:BT.run('lora',ids),bitune:BT.run('bitune',ids)};
    const one=R=>({att:R.passes.map(p=>avgH(p.att[0])),probs:ppl.map(p=>R.steps[0].probs[P0+p]),ans:R.answer,next:R.steps[1].tok,alpha:R.alpha,
      // how much the answer token reads each prompt token, averaged over blocks and heads (the density of its flows)
      read:ids.map((_,j)=>{let s=0;for(let l=0;l<L;l++)for(let h=0;h<H;h++)s+=R.steps[0].att[l][h][0][j];return s/L/H}),
      kc:R.passes[0].kv[BL].K[MI],kb:R.passes[1]?R.passes[1].kv[BL].K[MI]:null,km:R.kv[BL].K[MI]});
    return D={lora:one(r.lora),bitune:one(r.bitune)}}
  const C=.7,xs=(cx,j)=>cx+(j-(T-1)/2)*C,ZB=-6.2,zr=i=>ZB+(i+.5)*C,ZF=ZB+T*C,ZC=.5,ZT=2.4,ZK=3.7,ZA=4.6,ZP=6.2;
  const pcx=m=>m==='lora'?[0]:[-3.3,3.3];
  // a vector as signed bars on a white plinth (positive up, negative hanging below), the every-joule look of the reference scene
  function comb(R,c,vals,m,col,a,hmax,wd){if(a<=.01)return;const nb=vals.length,bw=wd/nb;
    R.box([c[0],c[1]-.045,c[2]],[wd+.14,.045,.3],{a,shadow:false});
    vals.forEach((v,i)=>{const hg=Math.max(.012,Math.abs(v)/m*hmax),bx=c[0]-wd/2+bw*(i+.5);R.box([bx,v>=0?c[1]:c[1]-.045-hg,c[2]],[bw*.72,hg,.1],{fill:col,a,shadow:false,lw:.6})})}
  // one pass: a glass plate on the floor (rows: query tokens, back to front; columns: the tokens they read), the mask's blocked cells shaded, real attention as bars
  function plate(R,cx,att,causal,col,a,hl){if(a<=.01)return;const P=R.P,x0=xs(cx,0)-C/2;
    R.glass([x0,.02,ZB],[T*C,0,0],[0,0,T*C],{c:col,a,nu:T,nv:T,th:.04});
    for(let i=0;i<T;i++)for(let j=0;j<T;j++){const cx0=xs(cx,j),cz=zr(i);
      if(causal&&j>i){R.quad([[cx0-C*.45,.07,cz-C*.45],[cx0+C*.45,.07,cz-C*.45],[cx0+C*.45,.07,cz+C*.45],[cx0-C*.45,.07,cz+C*.45]],{fill:P.ink,fa:hl&&j===CH&&i>0&&i<QM?.5:.3,a,edge:false});continue}
      const w=att[i][j];if(w<.02)continue;const hg=w*1.25,strong=hl&&(j===CH||j===QM)&&i>0&&i<QM;
      R.box([cx0,.06,cz],[C*.5,hg,C*.5],{fill:mix(P.paper,col,strong?1:.25+.75*Math.min(1,w*1.5)),a:a*(hl&&!strong?.55:1),shadow:false,lw:.6})}
    if(hl)for(let i=0;i<T;i++)R.label([xs(cx,0)-C*.6,.05,zr(i)],lab[i],{al:'right',dx:-4,mono:true,fs:12,c:i===MI?P.good:P.mute,a,grp:'r'+cx})}
  // a KV cache: one entry per token and block, the blocks stacked
  function cache(R,cx,z,colOf,a,n){if(a<=.01)return;for(let j=0;j<(n||T);j++)for(let l=0;l<L;l++)R.box([xs(cx,j),l*.27,z],[C*.62,.21,.42],{fill:mix(R.P.paper,colOf(l,j),.62),a,shadow:l===0,lw:.6})}
  function draw(R,k,e){const P=R.P,d=data()[MODE],bi=MODE==='bitune',CAU=P.c2,BID=P.c1;R.grid(-7,7,-6.8,6.6,.5);
    const ks=bi?{pass1:1,pass2:2,cache:3,mix:4,close:5,ans:6}:{pass1:1,pass2:99,cache:2,mix:99,close:99,ans:3};
    const [c1,c2]=bi?pcx('bitune'):[0,0],mixC=l=>mix(CAU,BID,d.alpha?d.alpha[0][l]:0);
    // the prompt: one white block per token; it fades once its keys and values sit in the caches
    const ta=k<ks.cache?1:off(k,e,ks.cache);
    ids.forEach((_,j)=>{R.box([xs(0,j),0,ZT],[C*.7,.18,.5],{a:ta,fill:j===MI?mix(P.paper,P.good,.35):j===CH?mix(P.paper,P.c5,.45):P.paper});
      R.label([xs(0,j),0,ZT+.42],lab[j],{fs:13,serif:true,dy:10,b:j===MI||j===CH,c:j===MI?P.good:P.ink,a:k===0?1:0,wide:j===MI||j===CH?0:1})});
    // pass 1: causal (the standard prefill, default adapter)
    const fade=k===ks.close?0:k>=ks.ans?.14:k>=ks.mix?.22:k===ks.cache?.5:1,a1=k<ks.pass1?0:k===ks.pass1?e:k===ks.pass2?.3:fade;
    plate(R,c1,d.att[0],true,CAU,a1,k===ks.pass1);
    if(k===ks.pass1)ids.forEach((_,j)=>R.flowArc([xs(0,j),.2,ZT-.2],[xs(c1,j),.1,ZF],.7,{c:CAU,a:e*.8,r:.05,n:5,speed:1.4}));
    R.label([c1,.05,ZB-.3],bi?'pass 1 · causal · default adapter':'causal pass',{mono:true,fs:12,b:1,c:CAU,dy:-8,a:a1>=.45?a1:0});
    if(k===ks.pass1)R.label([xs(c1,CH),0,ZF],'shaded: masked · no person sees "chess"',{mono:true,fs:12,c:P.ink,a:e,al:'right',dx:12,dy:16,wide:1});
    // pass 2: bidirectional, its own adapter; the person rows read "?" and "chess" on their right
    if(bi){const a2=k<ks.pass2?0:k===ks.pass2?e:fade;plate(R,c2,d.att[1],false,BID,a2,k===ks.pass2);
      R.label([c2,.05,ZB-.3],'pass 2 · bidirectional · own adapter',{mono:true,fs:12,b:1,c:BID,dy:-8,a:a2>=.45?a2:0});
      if(k===ks.pass2){for(let i=1;i<QM;i++)[CH,QM].forEach(j=>{const w=d.att[1][i][j];R.flow([[xs(c2,j),.12,zr(i)],[xs(c2,i),.12,zr(i)]],{c:BID,a:e*(.3+.7*Math.min(1,w*2.5)),r:.04+.06*w,n:Math.max(2,Math.round(2+w*10)),speed:1.1})});
        ids.forEach((_,j)=>R.flowArc([xs(0,j),.2,ZT-.2],[xs(c2,j),.1,ZF],.7,{c:BID,a:e*.5,r:.045,n:4,speed:1.4}))}}
    // the caches: every prompt token leaves one (K, V) per block in each pass
    if(k>=ks.cache){const ac=k===ks.cache?e:k===ks.mix?1:k===ks.close?.05:bi?.25:1;
      cache(R,c1,ZC,()=>CAU,ac);if(bi)cache(R,c2,ZC,()=>BID,ac);
      if(k===ks.cache){[c1].concat(bi?[c2]:[]).forEach((cx,p)=>ids.forEach((_,j)=>R.flow([[xs(cx,j),.15,ZF],[xs(cx,j),.3,ZC-.25]],{c:p?BID:CAU,a:e*.8,r:.045,n:3,speed:.9})));
        R.label([c1,0,ZC+.3],bi?'causal K, V':'KV cache',{mono:true,fs:12,c:CAU,dy:16,a:e});if(bi)R.label([c2,0,ZC+.3],'bidirectional K, V',{mono:true,fs:12,c:BID,dy:16,a:e})}} // the labels stand in front of the caches, not on them
    // the mix, block by block: K = K_c (1 − α_k) + K_b α_k, the same for V; the mixed cache has the usual size
    if(bi&&k>=ks.mix){const am=k===ks.mix?e:k===ks.close?.06:1;cache(R,0,ZT,l=>mixC(l),am);
      if(k===ks.mix){for(let l=0;l<L;l++){const ak=d.alpha[0][l];[[c1,1-ak,CAU],[c2,ak,BID]].forEach(([cx,w,c])=>R.flowArc([cx,l*.27+.15,ZC+.2],[0,l*.27+.15,ZT-.25],.35+.15*l,{c,a:e*(.35+.65*w),r:.05+.06*w,n:Math.max(3,Math.round(3+w*10)),speed:1.2}));
          R.label([xs(0,T-1)+C*.6,l*.27+.1,ZT],'block '+(l+1)+'  α_k '+ak.toFixed(2)+'  α_v '+d.alpha[1][l].toFixed(2),{al:'left',dx:6,mono:true,fs:12,c:P.ink,a:e,grp:'al'})}
        R.label([0,0,ZT+.3],'mixed cache · the usual size',{mono:true,fs:12,b:1,dy:16,a:e})}}
    // up close: one cache entry (the member's key in block 2) before and after the mix
    if(bi&&k===ks.close){const m=Math.max(...d.kc.map(Math.abs),...d.kb.map(Math.abs),...d.km.map(Math.abs)),ak=d.alpha[0][BL];
      comb(R,[-2.6,.35,ZK],d.kc,m,CAU,e,.6,2.2);comb(R,[2.6,.35,ZK],d.kb,m,BID,e,.6,2.2);comb(R,[0,.35,ZK+.3],d.km,m,mixC(BL),Math.min(1,e*1.4),.6,2.2);
      [[-2.6,1-ak,CAU],[2.6,ak,BID]].forEach(([x,w,c])=>R.flowArc([x*.62,.7,ZK],[x*.2,.7,ZK+.3],.3,{c,a:e*(.3+.7*w),r:.03+.04*w,n:Math.max(2,Math.round(2+w*8)),speed:.8}));
      R.label([-2.6,.35,ZK],'K_c · causal',{mono:true,fs:12,c:CAU,dy:34,a:e,wide:1});R.label([2.6,.35,ZK],'K_b · bidirectional',{mono:true,fs:12,c:BID,dy:34,a:e,wide:1});
      R.label([0,.35,ZK+.3],'K = (1 − '+ak.toFixed(2)+') K_c + '+ak.toFixed(2)+' K_b',{mono:true,fs:12,b:1,dy:40,a:e});
      R.label([0,1.05,ZK],lab[MI]+', block '+(BL+1)+': '+d.kc.length+' numbers',{mono:true,fs:12,c:P.mute,dy:-6,a:e})}
    // the answer: ":" reads the cache causally with the ordinary weights; its own K, V are plain causal ones
    if(k>=ks.ans){const zs=bi?ZT:ZC;
      R.box([0,0,ZA],[C*.8,.24,.55],{fill:mix(P.paper,CAU,.25),a:e});R.label([0,.24,ZA],':',{mono:true,fs:16,b:1,dy:-10,a:e});
      ids.forEach((_,j)=>{const w=d.read[j];R.flowArc([xs(0,j),.8,zs+.1],[0,.3,ZA-.2],.5,{c:bi?mixC(1):CAU,a:e*(.2+.8*Math.min(1,w*4)),r:.035+.12*w,n:Math.max(2,Math.round(2+w*22)),speed:1.1})});
      // the answer token's own entry, appended to the cache: causal, as in any decoder
      for(let l=0;l<L;l++)R.box([xs(0,T),l*.27,zs],[C*.62,.21,.42],{fill:CAU,a:at(k,e,ks.ans)*Math.min(1,e*1.5),shadow:l===0,lw:.6});
      R.label([xs(0,T),0,zs+.3],'":" adds causal K, V',{al:'right',dx:14,dy:16,mono:true,fs:12,c:CAU,a:e,wide:1}); // under the new entry, clear of the cache
      ppl.forEach((p,i)=>{const pr=d.probs[i],j=i+1,isM=j===MI;R.box([xs(0,j),0,ZP],[.46,Math.max(.012,pr*1.4),.46],{fill:isM?P.good:mix(P.paper,P.bad,.5),a:e});
        R.label([xs(0,j),Math.max(.012,pr*1.4),ZP],isM||pr>.05?lab[j]+' '+(100*pr).toFixed(1)+'%':lab[j],{mono:true,fs:12,dy:isM||pr>.05?-10:14,b:isM,c:isM?P.good:P.mute,a:e,wide:isM?0:1})});
      R.label([xs(0,0)-.3,0,ZP],'p(answer)',{al:'right',dx:-6,mono:true,fs:12,c:P.mute,a:e,wide:1})}
  }
  function readout(){const Dd=data(),d=Dd[MODE],bi=MODE==='bitune',np=bi?2:1,o=document.getElementById('btOut');if(!o)return;
    o.innerHTML=stat('prompt passes',String(np),bi?'causal + bidirectional':'causal only')+stat('block evaluations for the prompt',String(np*T*L),T+' tokens × '+L+' blocks per pass')+
      stat('cache the answer reads',T*L+' (K, V)','the same for both')+stat('p('+lab[MI]+')',(100*d.probs[MI-1]).toFixed(1)+'%',(bi?'LoRA: ':'Bitune: ')+(100*Dd[bi?'lora':'bitune'].probs[MI-1]).toFixed(1)+'%')}
  // the numbers the step text quotes, written in once (the toy's shipped weights)
  function fill(){const d=data(),b=d.bitune,set=(c,v)=>document.querySelectorAll('.'+c).forEach(x=>x.textContent=v),pc=v=>Math.round(100*v)+'%';
    const rows=[];for(let i=1;i<QM;i++)rows.push(b.att[1][i][QM]+b.att[1][i][CH]);
    set('btQC',pc(Math.min(...rows))+' to '+pc(Math.max(...rows)));set('btAk',b.alpha[0].map(v=>v.toFixed(2)).join(', '));set('btAv',b.alpha[1].map(v=>v.toFixed(2)).join(', '));
    set('btPL',(100*d.lora.probs[MI-1]).toFixed(1)+'%');set('btPB',(100*b.probs[MI-1]).toFixed(1)+'%');set('btAkB',b.alpha[0][BL].toFixed(2));set('btMem',lab[MI])}
  const fullB={bitune:[[-6.7,0,-6.6],[6.7,1.5,6.6]],lora:[[-4.2,0,-6.6],[4.2,1.5,6.6]]};
  const st=S3.stage({id:'stg-bt',list:'sx-bt',fig:'Fig. 2 · prefill on the trained toy, live',cam:[.12,.74],bounds:()=>fullB[MODE],aspect:.8,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[18,16,14,70],
    view:k=>{if(MODE==='lora')return k===0?{cam:[.1,.7],bounds:[[-3.4,0,1.2],[3.4,.6,3.6]]}:k===1?{cam:[.12,.85],bounds:[[-3.4,0,-6.6],[3.4,1.2,3.0]]}:null;
      return k===0?{cam:[.1,.7],bounds:[[-3.4,0,1.2],[3.4,.6,3.6]]}:k===1?{cam:[.12,.85],bounds:[[-6.6,0,-6.6],[-.1,1.2,3.0]]}:k===2?{cam:[.12,.85],bounds:[[.1,0,-6.6],[6.6,1.2,3.0]]}:
        k===3?{cam:[.12,.72],bounds:[[-6.7,0,-6.6],[6.7,1.2,1.4]]}:k===4?{cam:[.12,.62],bounds:[[-6.4,0,-.4],[6.4,1.0,3.4]]}:k===5?{cam:[.1,.42],bounds:[[-3.9,0,3.1],[3.9,1.1,4.4]]}:k===6?{cam:[.12,.66],bounds:[[-4.4,0,1.2],[4.4,1.5,6.7]]}:null},
    onStep:()=>{try{readout()}catch(e){}}});
  if(!st)return;
  try{fill()}catch(e){console.error(e)}
  const seg=document.getElementById('btM');
  if(seg)seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    MODE=b.dataset.m;document.getElementById('sx-bt').hidden=MODE!=='bitune';document.getElementById('sx-lr').hidden=MODE!=='lora';st.list(MODE==='bitune'?'sx-bt':'sx-lr');readout()}));
  readout();
})();
