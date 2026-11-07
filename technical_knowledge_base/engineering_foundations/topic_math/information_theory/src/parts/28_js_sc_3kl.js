// ---- Scene, Fig. 3 (section 3): sixteen symbols through the right code and the wrong code; the KL terms per outcome (renderer v2) ----
// p = (A 1/2, B 1/4, C 1/8, D 1/8), q = (A 1/8, B 1/2, C 1/4, D 1/8); the codes are their Huffman codes (IT.huffman gives the same lengths).
// Every count, bit and term is computed here from p and q.
(function(){
  if(!document.getElementById('stg-kl')||!window.ITS)return;const {mix,lerp}=S3;
  const NM=['A','B','C','D'],p=[1/2,1/4,1/8,1/8],q=[1/8,1/2,1/4,1/8],CP=['0','10','110','111'],CQ=['110','0','10','111'];
  const cnt=p.map(v=>v*16),bp=cnt.map((c,i)=>c*CP[i].length),bq=cnt.map((c,i)=>c*CQ[i].length),TP=bp.reduce((a,b)=>a+b,0),TQ=bq.reduce((a,b)=>a+b,0);
  const fwd=p.map((v,i)=>v*Math.log2(v/q[i])),rev=q.map((v,i)=>v*Math.log2(v/p[i])),sum=a=>a.reduce((s,v)=>s+v,0);
  window.IT_KLSC={TP,TQ,fwd,rev,KLf:sum(fwd),KLr:sum(rev)};
  const X=[-2.4,-.8,.8,2.4],ZS=2.1,ZP=.55,ZQ=-1,ZK=-2.6,YK=1.05,HB=.085,HS=.12;
  // a stack of codewords: one slab per bit, shaded per symbol so each codeword shows
  function stack(R,x,z,n,code,col,a,frac){const P=R.P,L=code.length,tot=n*L,m=Math.round(tot*frac);
    for(let b=0;b<m;b++){const s=Math.floor(b/L),bit=code[b%L];R.box([x,b*HB,z],[.7,HB*.82,.5],{fill:mix(col,P.paper,(s%2?.35:0)+(bit==='1'?0:.15)),a,shadow:b===0,lw:.6})}}
  function draw(R,k,e){const P=R.P;R.grid(-3.6,3.6,-3.4,3,.5);
    const sa=k<=1?1:.3,pa=k===1?1:k===2?.45:k>=3?.22:0,qa=k===2?1:k>=3?.22:0;
    // 1. the stream: 16 symbols in exactly p's proportions
    NM.forEach((nm,i)=>{for(let s=0;s<cnt[i];s++)R.box([X[i],s*HS,ZS],[.5,HS*.82,.5],{fill:mix(P.c1,P.paper,.55),a:sa*(k===0?Math.min(1,e*3-s*.12+.2):1),shadow:s===0});
      R.label([X[i],cnt[i]*HS,ZS],nm+' · '+cnt[i],{fs:13,b:1,dy:-10,c:P.c1,a:sa})});
    if(k<3)R.label([X[0]-.6,.3,ZS],'16 symbols from p',{al:'right',dx:-6,mono:true,fs:12,c:P.c1,grp:'row',a:sa});
    // 2. the code built for p: 28 bits; 3. the code built for q: 38 bits
    [[ZP,CP,bp,TP,P.c3,pa,1],[ZQ,CQ,bq,TQ,P.c2,qa,2]].forEach(([z,code,bits,tot,col,a,st])=>{if(a<=.01)return;const fr=k===st?e:1;
      NM.forEach((nm,i)=>{stack(R,X[i],z,cnt[i],code[i],col,a,fr);
        if(k===st)R.flowArc([X[i],cnt[i]*HS+.05,ZS],[X[i],bits[i]*HB*fr+.05,z],.5,{c:col,r:.06,n:Math.max(2,Math.round(bits[i]/2)),speed:1.3,a:e});
        R.label([X[i],bits[i]*HB*fr,z],code[i]+(k===st?' · '+bits[i]:''),{mono:true,fs:12.5,b:1,dy:-10,c:col,a:a<.5?a*1.6:1})});
      if(k<3)R.label([X[0]-.6,.3,z],(st===1?'code for p · ':'code for q · ')+tot+' bits = '+(tot/16).toFixed(3)+' a symbol',{al:'right',dx:-6,mono:true,fs:12,c:col,grp:'row',a:Math.max(.5,a)})});
    // 4. per outcome, the extra bits per symbol: p(x) log2 p(x)/q(x); 5. the other direction, q(x) log2 q(x)/p(x)
    if(k>=3){const t=k===4?e:0,v=fwd.map((f,i)=>lerp(f,rev[i],t)),a=k===3?e:1;
      ITS.signed(R,X,v,{y:YK,z:ZK,s:.9,cp:k===4&&e>.5?P.c4:P.c2,a,bw:.7});
      const tot=lerp(sum(fwd),sum(rev),t);R.label([X[0]-.75,YK,ZK],(k===4&&e>.5?'KL(q ‖ p) = ':'KL(p ‖ q) = ')+tot.toFixed(3)+' bits',{al:'right',dx:-6,mono:true,fs:12.5,b:1,c:k===4&&e>.5?P.c4:P.c2,grp:'row',a})}
  }
  const full={cam:[.42,.62],bounds:[[-3.2,0,-2.9],[3.2,2.2,2.5]]};
  S3.stage({id:'stg-kl',list:'sx-kl',fig:'Fig. 3 · one stream, two codes',cam:full.cam,bounds:full.bounds,aspect:.7,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[18,14,14,210],
    view:k=>k>=3?{cam:[.25,.38],bounds:[[-3.2,0,-3.1],[3.2,2.2,-.4]]}:null});
})();
