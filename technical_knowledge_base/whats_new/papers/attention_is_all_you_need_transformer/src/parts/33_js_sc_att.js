// ---- Scene: scaled dot-product attention (Equation 1) with the trained toy model's real numbers ----
// Encoder layer 1, head 4 of the page's toy Transformer (d_model = 24, h = 4, d_k = 6) on one sentence: x, then q k v, scores, ÷√d_k, softmax, weighted sum.
(function(){
  if(!$('stg-att'))return;const {at,lerp,mix}=S3;
  const S='the big dog chased the small cat'.split(' '),n=S.length,HEAD=3;
  let A=null,qi=3;
  function compute(){if(A)return A;const M=TM.load('full'),P=M.P,d=TM.cfg.d,h=M.h,dk=d/h,o=HEAD*dk,idx=w=>TM.vocab.indexOf(w);
    const pe=(p,j)=>{const dv=Math.pow(10000,(j-(j%2))/d);return j%2?Math.cos(p/dv):Math.sin(p/dv)};
    const X=S.map((w,t)=>{const id=idx(w),x=[];for(let j=0;j<d;j++)x.push(P.emb[id*d+j]*Math.sqrt(d)+pe(t,j));return x});
    const lin=(x,nm)=>{const W=P['e0.att.'+nm+'.w'],b=P['e0.att.'+nm+'.b'],y=[];for(let i=o;i<o+dk;i++){let s=b[i];for(let j=0;j<d;j++)s+=W[i*d+j]*x[j];y.push(s)}return y};
    const Q=X.map(x=>lin(x,'q')),K=X.map(x=>lin(x,'k')),V=X.map(x=>lin(x,'v'));
    const sc=Q.map(q=>K.map(k=>q.reduce((s,v,i)=>s+v*k[i],0)));
    const sm=r=>{const m=Math.max(...r),e=r.map(v=>Math.exp(v-m)),z=e.reduce((a,b)=>a+b,0);return e.map(v=>v/z)};
    const W=sc.map(r=>sm(r.map(v=>v/Math.sqrt(dk))));
    const Z=W.map(w=>V[0].map((_,c)=>w.reduce((s,a,j)=>s+a*V[j][c],0)));
    const mx=a=>Math.max(...a.flat().map(Math.abs));
    return A={X,Q,K,V,sc,W,Z,dk,d,mX:mx(X),mQ:Math.max(mx(Q),mx(K),mx(V)),mS:mx(sc)}}
  const XW=1.32,x=i=>(i-(n-1)/2)*XW,ZW=2.4,ZQ=1.05,ZK=0,ZV=-1.05,ZS=-2.4;
  // a comb: one thin bar per number, height by value; positive and negative in two tones of the role's colour
  function comb(R,c,vals,m,col,a,hmax,wd){const nb=vals.length,bw=wd/nb;vals.forEach((v,i)=>{const hgt=Math.max(.012,Math.abs(v)/m*hmax);
    R.box([c[0]-wd/2+bw*(i+.5),c[1],c[2]],[bw*.78,hgt,.16],{fill:v>=0?col:mix(R.P.paper,col,.45),a,edge:false})})}
  function draw(R,k,e){const P=R.P,T=compute(),nar=R.W<620;R.grid(-6.2,5,-3.1,3.1,.5);
    // words and their 24-number vectors
    S.forEach((w,i)=>{const isq=i===qi&&k>=2;R.box([x(i),0,ZW],[1.05,.22,.62],{fill:isq?mix(P.paper,P.q,.35):P.paper});R.label([x(i),0,ZW+.31],w,{serif:true,fs:12.5,dy:12+(nar&&i%2?14:0),b:isq,c:isq?P.q:P.ink});
      comb(R,[x(i),.22,ZW],T.X[i],T.mX,P.c1,1,.55,.98)});
    R.label([x(0)-.6,.3,ZW],'x · 24 numbers',{al:'right',dx:-6,mono:true,fs:12,c:P.c1,grp:'row'});
    // q, k, v: six numbers each for this head, made by three learned matrices
    const a1=at(k,e,1);if(a1>0){S.forEach((_,i)=>{[[T.Q,ZQ,P.q],[T.K,ZK,P.k],[T.V,ZV,P.v]].forEach(([M,z,c],r)=>{const lift=r===0&&i===qi&&k>=2?.35*at(k,e,2):0;
        R.box([x(i),0,z],[.62,.05,.36],{a:a1*.9});comb(R,[x(i),.05+lift,z],M[i],T.mQ,c,a1,.5*a1,.58)})});
      [['query · Wq',ZQ,P.q],['key · Wk',ZK,P.k],['value · Wv',ZV,P.v]].forEach(([t,z,c])=>R.label([x(0)-.6,.15,z],t,{al:'right',dx:-6,mono:true,fs:12,c,a:a1,grp:'row'}));
      if(k===1)S.forEach((_,i)=>R.line([[x(i),.5,ZW-.3],[x(i),.5,ZQ+.25]],{c:P.mute,w:1,a:.5*(1-Math.abs(e-.5)*1.2),head:5}))}
    // scores: q of the query word against every key
    if(k>=2){const a2=at(k,e,2),qp=[x(qi),.65,ZQ];S.forEach((_,j)=>R.line([qp,[x(j),.55,ZK]],{c:P.q,w:1.4,a:a2*.55}));
      const sc=T.sc[qi],sq=Math.sqrt(T.dk),w=T.W[qi];
      S.forEach((_,j)=>{let v,hgt,col,lab;
        if(k===2){v=sc[j];hgt=Math.abs(v)/T.mS*1.6*a2;col=v>=0?P.c5:mix(P.paper,P.c5,.4);lab=v.toFixed(1)}
        else if(k===3){const f=lerp(1,1/sq,e);v=sc[j]*f;hgt=Math.abs(v)/T.mS*1.6;col=v>=0?P.c5:mix(P.paper,P.c5,.4);lab=v.toFixed(2)}
        else{const s0=Math.abs(sc[j]/sq)/T.mS*1.6,s1=w[j]*2.4,t=k===4?e:1;hgt=lerp(s0,s1,t);col=mix(P.c5,P.acc,t);lab=Math.round(w[j]*100)+'%'}
        R.box([x(j),0,ZS],[.62,Math.max(.015,hgt),.42],{fill:col});R.label([x(j),hgt,ZS],lab,{mono:true,fs:12,dy:-10,c:k>=4?P.acc:P.ink})});
      R.label([x(0)-.6,.2,ZS],k>=4?'weights · sum to 1':k===3?'scores ÷ √6':'scores q·k',{al:'right',dx:-6,mono:true,fs:12,c:k>=4?P.acc:P.c5,grp:'row'})}
    // the weighted sum of the values
    if(k>=5){const w=T.W[qi],zp=[x(qi),2.05,ZV];S.forEach((_,j)=>{const t=Math.min(1,e*1.2),p=[lerp(x(j),zp[0],t),lerp(.5,zp[1],t),ZV];R.arc([x(j),.5,ZV],zp,.6,{c:P.v,w:.6+6*w[j],a:.25+.75*w[j],t})});
      R.box([zp[0],zp[1],ZV],[.7,.05,.4],{a:e});comb(R,[zp[0],zp[1]+.05,ZV],T.Z[qi],T.mQ,P.v,e,.5,.62);R.label([zp[0],zp[1]+.6,ZV],'z = Σ aⱼ vⱼ',{mono:true,fs:12.5,c:P.v,a:e,dy:-6})}
  }
  function readout(){const T=compute(),w=T.W[qi],ord=w.map((v,j)=>[v,j]).sort((a,b)=>b[0]-a[0]).slice(0,3);
    $('attOut').innerHTML='"'+S[qi]+'" → '+ord.map(([v,j])=>S[j]+' '+Math.round(v*100)+'%').join(' · ')+' (all '+n+' weights sum to 100%)'}
  $('attQ').innerHTML=S.map((w,i)=>'<button data-i="'+i+'"'+(i===qi?' class="on"':'')+'>'+w+'</button>').join('');
  $('attQ').querySelectorAll('button').forEach(b=>b.onclick=()=>{qi=+b.dataset.i;$('attQ').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));readout();st.draw()});
  const st=S3.stage({id:'stg-att',list:'sx-att',fig:'Fig. 3 · one head of a trained toy model',cam:[.3,.8],bounds:[[-6.2,0,-2.9],[5,2.2,3]],draw,dur:1300,hold:2600,aspect:.72,
    onStep:()=>{try{readout()}catch(e){}}});
})();
