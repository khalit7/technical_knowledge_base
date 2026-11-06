// ---- Scene: scaled dot-product attention (Equation 1) with the trained toy model's real numbers (renderer v2: glass plates, flowing dots, camera per step) ----
// Encoder layer 1, head 4 of the page's toy Transformer (d_model = 24, h = 4, d_k = 6) on one sentence: x, then q k v, scores, ÷√d_k, softmax, weighted sum.
(function(){
  if(!document.getElementById('stg-att'))return;const {at,off,lerp,mix}=S3;
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
  const XS=1.6,x=i=>(i-(n-1)/2)*XS,ZW=2.7,ZQ=.5,ZK=-.6,ZV=-1.7,ZS=-2.9,YP=.2;
  // a vector as signed bars on a white plinth: positive bars stand on it, negative ones hang below (the every-joule look)
  function comb(R,c,vals,m,col,a,hmax,wd){if(a<=.01)return;const P=R.P,nb=vals.length,bw=wd/nb;
    R.box([c[0],c[1]-.045,c[2]],[wd+.14,.045,.34],{a,shadow:false});
    if(c[1]>.12)[-1,1].forEach(sx=>R.box([c[0]+sx*(wd/2),0,c[2]],[.03,c[1]-.05,.03],{a:a*.9}));
    vals.forEach((v,i)=>{const hgt=Math.max(.014,Math.abs(v)/m*hmax),bx=c[0]-wd/2+bw*(i+.5),fill=col?col:P.paper;
      R.box([bx,v>=0?c[1]:c[1]-.045-hgt,c[2]],[bw*.7,hgt,.11],{fill,a,shadow:false,lw:.7})})}
  function draw(R,k,e){const P=R.P,T=compute(),f=qi;R.grid(-7,7,-4,4,.5);
    // composition: each step shows what it is about; the rest recedes (x row once the vectors exist, values until they are used, queries and keys once the weights are known)
    const others=k===1?1-.8*e:k===2?.2+.05*e:.25;
    const rq=k>=5?.3:1,rv=k>=2&&k<=4?.3:1;
    // 1. words and their 24-number vectors
    S.forEach((w,i)=>{const a=i===f?(k>=2?.55:1):others;comb(R,[x(i),YP,ZW],T.X[i],T.mX,null,a,.6,1.2);
      R.label([x(i),0,ZW+.35],w,{serif:true,fs:13.5,dy:12,b:i===f&&k>=1,c:i===f&&k>=1?P.q:P.ink,a:Math.max(.5,a)})});
    if(k!==1)R.label([x(0)-.75,YP,ZW],'x · 24 numbers',{al:'right',dx:-6,mono:true,fs:12,c:P.mute,grp:'row'});else R.label([x(f)-.7,YP+.3,ZW],'x · 24 numbers',{al:'right',dx:-6,mono:true,fs:12,c:P.mute,a:e,wide:1});
    // 2. three learned matrices as glass plates, then q, k and v for every word (six numbers each for this head)
    const ga=k===1?Math.min(1,e*1.6):k===2?off(k,e,2):0;
    const plates=[['Wᵠ',P.q,-1.05,ZQ],['Wᴷ',P.k,0,ZK],['Wⱽ',P.v,1.05,ZV]];
    if(ga>0)plates.forEach(([nm,c,dx,zr])=>{const px=x(f)+dx,o0=[px-.38,.12,1.45];R.glass(o0,[.76,0,0],[0,.82,0],{c,a:ga,nu:6,nv:6});
      R.label([px,.98,1.45],nm,{serif:true,fs:15,b:1,c,a:ga,dy:-8});
      if(k===1){const a0=[x(f),.75,ZW],m=[px,.53,1.47],b0=[x(f),.62,zr],pts=[];for(let i=0;i<=14;i++)pts.push(R.arcPt(a0,m,.12,i/14));for(let i=1;i<=18;i++)pts.push(R.arcPt(m,b0,.25,i/18));
        R.flow(pts,{c,a:ga,r:.075,speed:1.3})}});
    const qa=k===0?0:k===1?e:1;
    S.forEach((_,i)=>{const ai=k===0?0:i===f?qa:k===1?0:k===2?e:1,lift=i===f&&k>=2?.32*at(k,e,2):0;
      comb(R,[x(i),YP+lift,ZQ],T.Q[i],T.mQ,P.q,ai*(i===f&&k<5?1:rq),.5,.78);comb(R,[x(i),YP,ZK],T.K[i],T.mQ,P.k,ai*rq,.5,.78);comb(R,[x(i),YP,ZV],T.V[i],T.mQ,P.v,ai*rv,.5,.78)});
    if(k>=2)[['query · what it looks for',ZQ,P.q],['key · what it offers',ZK,P.k],['value · what it hands over',ZV,P.v]].forEach(([t,z,c])=>R.label([x(0)-.75,YP,z],t,{al:'right',dx:-6,mono:true,fs:12,c,grp:'row'}));
    // 3. the query meets every key: dots stream from the query to each key while the scores rise
    const sc=T.sc[f],sq=Math.sqrt(T.dk),w=T.W[f];
    if(k>=2&&k<=3){const a=k===2?Math.min(1,e*1.5):1;S.forEach((_,j)=>R.flowArc([x(f),YP+.45,ZQ],[x(j),YP+.3,ZK],.35+.05*Math.abs(j-f),{c:P.q,a:a*.8,r:.05,speed:1.6,n:6}))}
    if(k>=2){S.forEach((_,j)=>{let v,hgt,c,lab;
        if(k===2){v=sc[j];hgt=Math.abs(v)/T.mS*1.7*e;c=v>=0?P.c5:mix(P.paper,P.c5,.45);lab=v.toFixed(1)}
        else if(k===3){const t=lerp(1,1/sq,e);v=sc[j]*t;hgt=Math.abs(v)/T.mS*1.7;c=v>=0?P.c5:mix(P.paper,P.c5,.45);lab=v.toFixed(2)}
        else{const s0=Math.abs(sc[j]/sq)/T.mS*1.7,s1=w[j]*2.6,t=k===4?e:1;hgt=lerp(s0,s1,t);c=mix(P.c5,P.c1,t);lab=Math.round(w[j]*100)+'%'}
        R.box([x(j),0,ZS],[.66,Math.max(.015,hgt),.44],{fill:c});R.label([x(j),hgt,ZS],lab,{mono:true,fs:12.5,dy:-11,b:k>=4&&w[j]>.2,c:k>=4?P.c1:P.ink})});
      R.label([x(0)-.75,.2,ZS],k>=4?'weights · sum to 1':k===3?'scores ÷ √6':'scores q·k',{al:'right',dx:-6,mono:true,fs:12,c:k>=4?P.c1:P.c5,grp:'row'})}
    // 4. the output: every value streams into z, in proportion to its weight
    if(k>=5){const zp=[x(f),1.05,1.35];S.forEach((_,j)=>{if(w[j]<.005)return;R.flowArc([x(j),YP+.45,ZV],zp,.55,{c:P.v,a:.25+.75*Math.min(1,w[j]*2.5),r:.045+.07*w[j],n:Math.max(2,Math.round(3+w[j]*16)),speed:1.2})});
      comb(R,[zp[0],zp[1],ZV],T.Z[f],T.mQ,P.v,e,.42,.66);R.label([zp[0]+.5,zp[1]+.2,zp[2]],'z = Σ aⱼ vⱼ',{al:'left',dx:6,mono:true,fs:13,b:1,c:P.v,a:e})}
  }
  function readout(){const T=compute(),w=T.W[qi],ord=w.map((v,j)=>[v,j]).sort((a,b)=>b[0]-a[0]).slice(0,3);
    document.getElementById('attOut').innerHTML='"'+S[qi]+'" → '+ord.map(([v,j])=>S[j]+' '+Math.round(v*100)+'%').join(' · ')+' (all '+n+' weights sum to 100%)'}
  const Q=document.getElementById('attQ');Q.innerHTML=S.map((w,i)=>'<button data-i="'+i+'"'+(i===qi?' class="on"':'')+'>'+w+'</button>').join('');
  Q.querySelectorAll('button').forEach(b=>b.onclick=()=>{qi=+b.dataset.i;Q.querySelectorAll('button').forEach(y=>y.classList.toggle('on',y===b));readout();st.draw()});
  const full={cam:[.3,.78],bounds:[[-5.4,0,-3.3],[5.4,1.6,3.3]]};
  const st=S3.stage({id:'stg-att',list:'sx-att',fig:'Fig. 3 · one head of a trained toy model',cam:full.cam,bounds:full.bounds,aspect:.62,margin:w=>w<520?[14,10,14,10]:[16,14,14,200],dur:1500,hold:4600,draw,
    // step 2 moves in close on the chosen word while its vector is projected; every other step shows the whole sentence
    view:k=>k===1?{cam:[.55,.5],bounds:[[x(qi)-1.6,0,-2.1],[x(qi)+1.6,1.3,3.1]]}:k>=2?{cam:[.3,.62],bounds:[[-5.4,0,-3.3],[5.4,1.4,1.7]]}:full,
    onStep:()=>{try{readout()}catch(e){}}});
})();
