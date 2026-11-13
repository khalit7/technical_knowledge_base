// ---- Scene: one 256-token block decoded three ways (autoregressive, speculative decoding, DiffusionGemma), as bar fields (renderer v2) ----
// Each lane is the block as 16 x 16 cells on the floor; a token's bar rises to the forward pass in which it became final (step 5: to the
// milliseconds at the measured speed). Numbers from the DiffusionGemma report as the issue's check quotes them: canvas 256, about 12 passes
// (at most 48), a draft of 8 with 3 to 6 kept per pass, 1,479 and 303 tokens per second on one H100. Which cells settle when is illustrative.
(function(){
  if(!document.getElementById('stg-diff'))return;const {at,off,lerp,mix,cl}=S3;
  const C=256,N=16,TPS_D=1479,TPS_M=303,CS=.2,GAP=.03,HP=.021; // HP: world height of one forward pass
  const st={tpf:4.5,P:12};
  // illustrative per-cell order (the same seed as the earlier 2D version): rank decides when a cell settles; about 7% are revised later
  const rnd=mulberry32(20260820),rank=[],rev=[];for(let i=0;i<C;i++){rank.push(rnd());rev.push(rnd()<0.07)}
  const sm=(p,P)=>{if(p<=0)return 0;if(p>=P)return 1;const x=p/P;return x*x*(3-2*x)};
  const msD=()=>1000*C/TPS_D/12,msM=()=>1000*st.tpf/TPS_M,pm=()=>Math.ceil(C/st.tpf);
  // the pass in which each diffusion cell first settles (s) and becomes final (f)
  let D=null;function diff(){if(D&&D.P===st.P)return D;const P=st.P,s=[],f=[];
    for(let i=0;i<C;i++){let a=P,b=P;for(let p=1;p<=P;p++){if(sm(p,P)>rank[i]){a=p;break}}
      if(rev[i]){for(let p=a;p<=P;p++){if(sm(p,P)>=Math.min(1,rank[i]+.35)){b=p;break}}}else b=a;s.push(a);f.push(Math.max(a,b))}
    return D={P,s,f}}
  const XL=[-4.1,0,4.1],LW=N*CS;
  const cell=(l,i)=>[XL[l]-LW/2+CS*(i%N)+CS/2,0,LW/2-CS*Math.floor(i/N)-CS/2]; // token 0 front left; later rows further back, so a rising lane stays visible
  // the stretch of the pass clock each step plays: [from, to]
  function span(k){const P=st.P,m=pm();return k===0?[0,0]:k===1?[0,P]:k===2?[P,Math.max(P,m)]:[Math.max(P,m),C]}
  function draw(R,k,e){const P=R.P,d=diff(),m=pm(),narrow=R.W<520;
    const sp=span(Math.min(k,3)),clk=k>=4?C:lerp(sp[0],sp[1],e),ms=k>=4?e:0; // ms: 0 heights in passes, 1 heights in milliseconds
    const kM=HP/msM(); // in milliseconds, a speculative pass keeps its height, so the two clocks are directly comparable
    R.grid(-6.6,6.6,-2.6,2.6,.5);
    const cols=[P.c2,P.c1,P.c3],names=narrow?['Autoregressive','Speculative','Diffusion']:['Autoregressive: 1 token a pass','Speculative: about '+st.tpf+' a pass','DiffusionGemma: all 256 refined'];
    for(let l=0;l<3;l++){
      const a=l===0?1-.85*ms:1,foc=k===1?(l===2?1:.35):k===2?(l===1?1:.35):k===3?(l===0?1:.45):1,A=a*foc;
      // the lane's floor
      const x0=XL[l]-LW/2,z0=-LW/2;R.quad([[x0,0,z0],[x0+LW,0,z0],[x0+LW,0,-z0],[x0,0,-z0]],{fill:P.soft,a:.8*a,ec:P.line});
      // the model, one forward pass: a glass plate behind the lane; dots stream into the lane while it is still decoding
      const done=l===0?clk>=C:l===1?clk>=m:clk>=st.P,act=k>=1&&k<=3&&!done&&clk>0;
      R.glass([XL[l]-.9,.25,-LW/2-.9],[1.8,0,0],[0,.9,0],{c:cols[l],a:.75*a*(k===0?1:act?1:.45),nu:6,nv:4});
      if(act){const n=l===0?2:l===1?Math.round(2+st.tpf):18;R.flow([[XL[l],.7,-LW/2-.85],[XL[l],1.2,-LW/2+.2],[XL[l],.35,0]],{c:cols[l],n,r:.07,speed:1.4,a:A})}
      // the cells
      let hmax=0;
      for(let i=0;i<C;i++){const c=cell(l,i);let pass=null,pale=false;
        if(l===0){if(i<Math.floor(clk))pass=i+1}
        else if(l===1){const p=Math.floor(i/st.tpf)+1;if(p<=Math.floor(clk+1e-9))pass=p}
        else{const p=Math.floor(clk+1e-9);if(p>=d.f[i])pass=d.f[i];else if(p>=d.s[i]){pass=d.s[i];pale=true}}
        if(pass==null){if(l===2&&a>.05){const g=.35+.5*((i*7919)%13)/13;R.quad([[c[0]-CS/2+GAP,.004,c[2]-CS/2+GAP],[c[0]+CS/2-GAP,.004,c[2]-CS/2+GAP],[c[0]+CS/2-GAP,.004,c[2]+CS/2-GAP],[c[0]-CS/2+GAP,.004,c[2]+CS/2-GAP]],{fill:mix(P.paper,P.mute,g*.6),a:A,edge:false})}continue}
        let h=pass*HP;if(ms>0&&l>0){const t=l===1?Math.min(pass*msM(),1000*C/TPS_M):pass*msD();h=lerp(h,t*kM,ms)}hmax=Math.max(hmax,h);
        R.box(c,[CS-GAP*2,Math.max(.012,h),CS-GAP*2],{fill:pale?mix(P.paper,cols[l],.3):mix(P.paper,cols[l],.25+.6*Math.min(1,pass/(l===0?C:l===1?m:st.P))),a:A*(pale?.8:1),shadow:false,lw:.5,ea:.35})}
      // labels: the lane under it, its count above it
      R.label([XL[l],0,LW/2+.25],names[l],{fs:12.5,b:1,c:cols[l],dy:10,a:Math.max(.35,a)});
      const p=Math.floor(clk+1e-9);let txt;
      if(l===0)txt=p?(p>=C?C+' passes':p+' tokens'):'';
      else if(l===1)txt=p?(p>=m?m+' passes':Math.min(C,Math.floor(p*st.tpf))+' tokens'):'';
      else txt=p?(p>=st.P?st.P+' passes':'pass '+p):'';
      if(ms>.5)txt=l===0?'no measured speed':Math.round(l===1?1000*C/TPS_M:st.P*msD())+' ms';
      if(txt)R.label([XL[l],hmax+.12,-LW/2],txt,{mono:true,fs:12.5,dy:-10,c:P.ink,a:Math.max(.4,l===0?1-.6*ms:a*foc)})}
  }
  const api=S3.stage({id:'stg-diff',list:'sx-diff',fig:'Fig. · one block of 256 tokens, three decoders',cam:[.42,.52],aspect:.62,dur:2600,hold:4200,draw,
    bounds:[[-6.3,0,-2.4],[6.3,C*HP+.3,2.3]],
    view:k=>k===0?{cam:[.42,.55],bounds:[[-6.3,0,-2.4],[6.3,1.3,2.3]]}:k===1?{cam:[.5,.62],bounds:[[1.9,0,-2.4],[6.3,1.4,2.2]]}:k===2?{cam:[.45,.55],bounds:[[-2.4,0,-2.4],[6.3,1.9,2.2]]}:null});
  // sliders: the drafter's tokens kept per pass and the diffusion passes; moving one is a reader control (stops autoplay) and updates the step text
  const fx=(v,d)=>v.toLocaleString('en-GB',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  function text(){const P=st.P,m=pm(),set=(k,v)=>document.querySelectorAll('#sx-diff [data-dg="'+k+'"]').forEach(x=>x.textContent=v);
    set('P',P);set('Pn',P===12?' (the report\'s average)':P===48?' (the sampler\'s maximum)':'');set('arP',P);set('spP',fx(Math.min(C,Math.floor(P*st.tpf))));
    set('pm',m);set('pm1',Math.max(P,m)+1);set('tpf',st.tpf.toFixed(1));
    if(m>P){set('s3h','Passes '+(P+1)+' to '+m+': speculative decoding finishes.');set('s3','At '+st.tpf.toFixed(1)+' tokens kept per pass'+(st.tpf===4.5?' (the default; the report gives 3 to 6)':'')+', the block needs '+m+' passes. Its bars rise in steps of about '+st.tpf.toFixed(1)+' tokens: each pass adds a short run.')}
    else{set('s3h','Speculative decoding had already finished.');set('s3','At '+st.tpf.toFixed(1)+' tokens kept per pass the block needs '+m+' passes, no more than the '+P+' diffusion passes set by the slider, so this step adds nothing.')}
    const dD=P*msD(),mD=1000*C/TPS_M;set('msD',msD().toFixed(1));set('msM',msM().toFixed(1));set('dDone',fx(dD));set('mDone',fx(mD));set('ratio',(mD/dD).toFixed(1));
    $('dgTv').textContent=st.tpf.toFixed(1)+' (passes for 256: '+m+')';$('dgPv').textContent=P+(P===12?' (the report\'s average)':P===48?' (the sampler\'s maximum)':'')}
  const user=()=>{if(api){api.st.user=true;api.pause()}};
  $('dgT').addEventListener('input',e=>{st.tpf=+e.target.value;user();text();api&&api.draw()});
  $('dgP').addEventListener('input',e=>{st.P=+e.target.value;user();text();api&&api.draw()});
  text();
  window.TN_DIFF={st,pm,msD,msM,diff,C,TPS_M}; // read by src/check_stages.mjs
})();
