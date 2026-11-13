// ---- Scene (which matrices to adapt, Fig. 4): one Llama 3 8B decoder block's seven linear matrices to scale, and what a LoRA on each costs (renderer v2) ----
// Shapes from PF_DATA.models['Llama 3 8B'] (its config.json): hidden 4,096, MLP 14,336, 8 KV heads of 128, 32 layers. Each glass plate is one matrix,
// width its input size and height its output size; the column in front of it is the adapter a LoRA puts there, r (d_in + d_out) numbers per layer.
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-where')||!window.S3)return;const {at,off,lerp,mix}=S3;
  const M=PF_DATA.models['Llama 3 8B'],d=M.d,ff=M.ff,kv=M.KV*M.hd,L=M.L,r=16;
  const MAT=[['q',d,M.H*M.hd,'att'],['k',d,kv,'att'],['v',d,kv,'att'],['o',M.H*M.hd,d,'att'],['gate',d,ff,'mlp'],['up',d,ff,'mlp'],['down',ff,d,'mlp']]; // name, d_in, d_out
  const U=.74/4096,GAP=.42,GG=.95,CH=1.25/(16*18432);
  let x=-4.88;const X=MAT.map(([n,i,o,g],j)=>{if(j===4)x+=GG-GAP;const w=i*U,c=x+w/2;x+=w+GAP;return c});
  const per=m=>r*(m[1]+m[2]) ,tot=s=>L*MAT.filter(m=>s.includes(m[0])).reduce((a,m)=>a+per(m),0);
  const ALL=MAT.map(m=>m[0]),ATT=['q','k','v','o'],MLP=['gate','up','down'];
  const SETS=[[],['q','v'],ATT,ALL,ATT],match=MLP.reduce((a,n)=>a+per(MAT.find(m=>m[0]===n)),0)/ATT.reduce((a,n)=>a+per(MAT.find(m=>m[0]===n)),0);
  const fmtM=v=>(v/1e6).toFixed(1)+'M',pctAll=s=>(100*tot(s)/tot(ALL)).toFixed(s.length===2?0:1)+'%';
  document.querySelectorAll('[data-wh]').forEach(e=>{const k=e.dataset.wh;e.textContent=k==='qv'?fmtM(tot(['q','v'])):k==='att'?fmtM(tot(ATT)):k==='mlp'?fmtM(tot(MLP)):k==='all'?fmtM(tot(ALL)):
    k==='pqv'?pctAll(['q','v']):k==='patt'?pctAll(ATT):k==='pmlp'?pctAll(MLP):k==='match'?match.toFixed(2):k==='rmatch'?Math.round(r*match):''});
  function draw(R,k,e){const P=R.P;R.grid(-5,5,-1.6,2.4,.5);
    const on=SETS[k],was=SETS[Math.max(0,k-1)],acc=mix(P.paper,P.acc,.78),ghost=mix(P.paper,P.mute,.15),ZA=1.15;
    MAT.forEach((m,j)=>{const [n,di,dout,g]=m,w=di*U,h=dout*U,cx=X[j],lit=on.includes(n),wasLit=was.includes(n);
      const pa=k===0?Math.min(1,e*1.4):(k===4&&g==='mlp')?.35:1;
      R.glass([cx-w/2,.06,0],[w,0,0],[0,h,0],{c:g==='att'?P.mute:P.c6,a:pa,nu:Math.max(2,Math.round(w/.15)),nv:Math.max(2,Math.round(h/.15))});
      R.label([cx,h+.06,0],n,{mono:true,fs:12.5,b:1,dy:-11,c:g==='att'?P.ink:P.c6,a:Math.max(.5,pa)});
      // the adapter: lit when this step targets the matrix (easing in), a faint outline otherwise; step 5 gives attention the higher rank
      const a=lit?(wasLit||k===0?1:e):(wasLit?1-e:0),hh=per(m)*CH*(k===4&&lit?lerp(1,match,e):1);
      if(a>.01)R.box([cx,0,ZA],[.34,hh,.26],{fill:acc,a:Math.max(a,.0)});
      if(a<.99)R.quad([[cx-.17,.004,ZA-.13],[cx+.17,.004,ZA-.13],[cx+.17,.004,ZA+.13],[cx-.17,.004,ZA+.13]],{ec:P.mute,ea:.5,dash:[3,3],lw:.8});
      if(lit&&a>.01)R.flowArc([cx-.32,.25,ZA+.05],[cx+.32,.25,ZA+.05],hh*.25+.18,{c:P.acc,a:a*.9,r:.045,speed:.9,n:5})});
    // the token's hidden state passing through the block
    R.flow([[-5,.32,.38],[X[3]+.5,.32,.38],[X[6]+1.3,.32,.38]],{c:P.c5,a:k===0?Math.min(1,e*1.5):.55,r:.05,speed:1.4,n:22});
    R.label([(X[0]+X[3])/2,0,ZA+.3],'attention',{mono:true,fs:12.5,dy:16,c:P.ink,a:k===0?e:1,wide:1});R.label([(X[4]+X[6])/2,0,ZA+.3],'MLP',{mono:true,fs:12.5,dy:16,c:P.c6,a:k===0?e:1,wide:1});
    const HL=['','q and v · rank 16 · '+fmtM(tot(['q','v']))+' trained · '+pctAll(['q','v'])+' of all-linear','attention · rank 16 · '+fmtM(tot(ATT))+' · '+pctAll(ATT),'all linear · rank 16 · '+fmtM(tot(ALL))+' · MLP '+pctAll(MLP)+' of it','attention at rank '+Math.round(r*match)+' · '+fmtM(tot(ATT)*match)+' = MLP-only at rank 16'];
    const HS=['','q, v · '+fmtM(tot(['q','v']))+' · '+pctAll(['q','v']),'attention · '+fmtM(tot(ATT)),'all · '+fmtM(tot(ALL))+' · MLP '+pctAll(MLP),'attention r '+Math.round(r*match)+' · '+fmtM(tot(ATT)*match)];
    if(k>=1)R.label([0,3.45,0],R.W<520?HS[k]:HL[k],{mono:true,fs:13.5,b:1,c:P.acc,a:e});
  }
  S3.stage({id:'stg-where',list:'sx-where',fig:'Fig. 4 · one Llama 3 8B block, to scale',cam:[.12,.5],bounds:[[-5,0,-.4],[5,3.45,1.4]],aspect:.47,dur:1400,hold:4600,draw,
    margin:w=>w<520?[16,10,26,10]:[22,26,24,26]});
})();
