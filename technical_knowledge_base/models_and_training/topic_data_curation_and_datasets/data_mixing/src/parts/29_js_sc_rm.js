// ---- Scene (Reading 3c, Fig. 3): RegMix on its released runs (window.MX2.regmix): four of the 512 training mixtures as bars on plinths,
// their 1M models' Pile-CC losses as columns behind them, the exponential mixing law fitted here on all 512 as a glass plate of exponents,
// RegMix's own 1B mixture, and Table 4's average scores. ----
(function(){
  if(!document.getElementById('stg-rm'))return;const {at,off,lerp,mix}=S3;
  const G=window.MX2.regmix,DOM=G.domains,J=DOM.length,PC=DOM.indexOf('pile_cc'),RUNS=[0,2,5,7];
  const X=RUNS.map(i=>G.train.X[i]),Y=RUNS.map(i=>G.train.Y.pile_cc[i]);
  const T=G.fit.dml_params.t,tmax=Math.max(...DOM.map(d=>T[d])),TB=DOM.map(d=>tmax-T[d]),tbm=Math.max(...TB);
  const MIX=DOM.map(d=>G.mixtures_1b.regmix['train_the_pile_'+d]||0);
  const T4=G.table4,SC=['Human','DoReMi','Pile-CC','RegMix'].map(c=>[c,T4.avg[T4.cols.indexOf(c)]]);
  const x=i=>(i-1.5)*2.55,ZM=-1.0,ZL=-2.5,ZP=.55,ZX=1.45,PW=2.0,LH=.3;
  const short={pile_cc:'Pile-CC',enron_emails:'Enron Emails',philpapers:'PhilPapers',ubuntu_irc:'Ubuntu IRC',pubmed_abstracts:'PubMed Abstracts',wikipedia_en:'Wikipedia',hackernews:'HackerNews',github:'GitHub',gutenberg_pg_19:'Gutenberg',arxiv:'ArXiv',freelaw:'FreeLaw'};
  // a vector as bars on a white plinth (the reference look)
  function bars(R,c,vals,hmax,wd,a,hi,col){if(a<=.01)return;const P=R.P,bw=wd/vals.length;R.box([c[0],c[1]-.05,c[2]],[wd+.14,.05,.4],{a,shadow:c[1]<.1});
    vals.forEach((v,j)=>{const h=Math.max(.012,v*hmax);R.box([c[0]-wd/2+bw*(j+.5),c[1],c[2]],[bw*.7,h,.16],{fill:j===hi?P.c1:col||mix(P.paper,P.c6,.4),a,shadow:false,lw:.6})})}
  const top=w=>w.indexOf(Math.max(...w.map((v,j)=>j===PC?-1:v)));
  function draw(R,k,e){const P=R.P;R.grid(-6,7,-3.2,2.6,.5);
    const back=k===0?1:k===1?.85:.14;
    // 1. four sampled mixtures
    X.forEach((w,i)=>{const a=k===0?e:back;bars(R,[x(i),.06,ZM],w,1.1,PW,a,PC);
      const t=top(w),bw=PW/J;if(k===0){R.label([x(i)-PW/2+bw*(PC+.5),.06+w[PC]*1.1,ZM],'Pile-CC '+Math.round(100*w[PC])+'%',{mono:true,fs:12,dy:-11,c:P.c1,a,wide:1,grp:'m'+i});
        if(w[t]>.15)R.label([x(i)-PW/2+bw*(t+.5),.06+w[t]*1.1,ZM],(short[DOM[t]]||DOM[t])+' '+Math.round(100*w[t])+'%',{mono:true,fs:12,dy:-11,c:P.ink,a,wide:1,grp:'m'+i})}
      R.label([x(i),0,ZM+.3],'run '+(RUNS[i]+1),{mono:true,fs:12,dy:14,c:P.mute,a:a*(k<=1?1:0)})});
    // 2. one 1M model each: its Pile-CC validation loss, a column behind its mixture
    if(k>=1){Y.forEach((l,i)=>{const a=(k===1?e:1)*(k>=2?.16:1),h=l*LH*(k===1?e:1);
        if(k===1)R.flowArc([x(i),.6,ZM-.2],[x(i),h+.05,ZL],.5,{c:P.c1,a:.85,r:.06,n:6,speed:1.3});
        R.box([x(i),0,ZL],[.6,h,.6],{fill:mix(P.paper,P.c5,.55),a});
        R.label([x(i),h,ZL],'loss '+l.toFixed(2),{mono:true,fs:12.5,b:1,dy:-12,c:P.ink,a:a*(k<=1?1:0)})})}
    // 3. the law fitted on all 512 runs; each bar: how much more that domain's weight lowers the loss than GitHub's
    const la=k===2?e:k===3?.3*(1-e)+.15:k>3?.12:0;
    if(la>0){if(k===2)Y.forEach((l,i)=>R.flowArc([x(i),l*LH,ZL],[lerp(-2,2,i/3),1.2,ZP],.6,{c:P.c5,a:.8,r:.05,n:6,speed:1.3}));
      R.glass([-2.9,.06,ZP-.25],[5.8,0,0],[0,1.4,0],{c:P.c4,a:la*.85,nu:17,nv:5,th:.04});
      bars(R,[0,.08,ZP],TB.map(v=>v/tbm),1.15,5.5,la,PC,mix(P.paper,P.c4,.45));
      if(k===2){const bw=5.5/J;[PC,DOM.indexOf('enron_emails'),DOM.indexOf('philpapers')].forEach(j=>R.label([-2.75+bw*(j+.5),.08+TB[j]/tbm*1.15,ZP],short[DOM[j]]+' '+TB[j].toFixed(2),{mono:true,fs:12.5,b:j===PC,dy:-11,c:j===PC?P.c1:P.c4,a:e,grp:'tb'}));
        R.label([-2.9,1.46,ZP-.25],'fitted on 512 runs · L = c + exp(b + Σ tⱼ rⱼ)',{al:'left',dy:-12,mono:true,fs:12.5,b:1,c:P.c4,a:e})}}
    // 4. RegMix's 1B mixture, picked by its regression
    if(k>=3){const a=k===3?e:1;if(k===3)R.flowArc([0,1.3,ZP],[0,.9,ZX],.4,{c:P.c4,a:.85*Math.min(1,e*2),r:.06,n:6,speed:1.2});
      bars(R,[0,.08,ZX],MIX,1.5,4.4,a,PC,mix(P.paper,P.c6,.5));
      const bw=4.4/J;[PC,DOM.indexOf('ubuntu_irc'),DOM.indexOf('pubmed_abstracts')].forEach(j=>R.label([-2.2+bw*(j+.5),.08+MIX[j]*1.5,ZX],short[DOM[j]]+' '+(100*MIX[j]).toFixed(1)+'%',{mono:true,fs:12.5,b:j===PC,dy:-11,c:j===PC?P.c1:P.ink,a,grp:'mx'}));
      R.label([0,0,ZX+.3],'RegMix\'s 1B mixture',{mono:true,fs:12.5,b:1,dy:15,c:P.ink,a})}
    // 5. Table 4: average over 14 tasks, 1B parameters on 25B tokens
    if(k>=4){SC.forEach(([c,v],i)=>{const px=3.2+i*1.05,h=v*.034,rm=c==='RegMix';
        R.box([px,0,ZX],[.62,h*e,.62],{fill:rm?P.c1:mix(P.paper,P.c5,.45)});
        R.label([px,h*e,ZX],v.toFixed(1),{mono:true,fs:12.5,b:rm,dy:-11,c:rm?P.c1:P.ink,a:e});
        R.label([px,0,ZX+.31],c,{mono:true,fs:12,dy:14,c:P.mute,a:e})});
      R.flowArc([2.2,.4,ZX],[3.2+3*1.05,1.3,ZX],.5,{c:P.c1,a:.85*e,r:.06,n:6,speed:1.2})}
  }
  const full={cam:[.12,.55],bounds:[[-5,0,-2.9],[5,1.8,1.8]]};
  S3.stage({id:'stg-rm',list:'sx-rm',fig:'Fig. 3 · RegMix, released runs',cam:full.cam,bounds:full.bounds,aspect:.55,dur:1500,hold:4800,draw,
    margin:w=>w<520?[16,10,16,10]:[22,16,22,16],
    view:k=>k===0?{cam:[.32,.5],bounds:[[-4.9,0,-1.3],[4.9,1.1,-.7]]}:k===1?full:k===2?{cam:[.12,.45],bounds:[[-3.6,0,-.2],[3.6,1.6,1.2]]}:k===3?{cam:[.12,.42],bounds:[[-3.1,0,.4],[3.1,1.7,2.2]]}:{cam:[.15,.42],bounds:[[-2.8,0,.4],[6.6,1.9,2.2]]}});
})();
