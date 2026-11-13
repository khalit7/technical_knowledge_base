// ---- Fig. 1: the lifecycle on one stage (renderer v2, 2026-11-10). Five learning stations in order along one line; one set of weights
// (the purple glass plate) moves from station to station. At each station: the box behind is its data, coloured by who makes it (as in Axis 2:
// grey the web, blue people, green a checker; purple is the model itself), with dots streaming into the weights; the white column beside the
// plate is its compute as a share of pretraining, log scale, computed below from the sourced figures the step list quotes. Step 7: the three
// stages that make any output cheaper. Dot counts are schematic (the stages' data are in different units: tokens, demonstrations, pairs, environments).
(function(){
  if(!document.getElementById('stg-life'))return;const {lerp,mix}=S3;
  // compute share of pretraining, in percent, from the figures quoted on the page (derived):
  //   SFT and RLHF: InstructGPT's 4.9 and 60 petaflop/s-days against GPT-3's 3,640 (InstructGPT §5.1);
  //   RLVR: DeepSeek-R1's 147K H800 hours against DeepSeek-V3's 2,788K; mid-training: OLMo 2's 5 to 10%, drawn at the geometric middle.
  const SH={pre:100,mid:Math.sqrt(5*10),sft:100*4.9/3640,pref:100*60/3640,rl:100*147/2788};
  const ST=[
    {k:'pre',n:'Pretraining',s:'Pre',sig:'the next token',dat:'the web · 15.6T tokens',src:'Llama 3 405B',who:'web',pct:'100%'},
    {k:'mid',n:'Mid-training',s:'Mid',sig:'the next token, new mix',dat:'curated · 50B tokens ×3',src:'OLMo 2 7B',who:'web',pct:'5 to 10%'},
    {k:'sft',n:'SFT',s:'SFT',sig:'imitate a demonstration',dat:'people · about 13k demos',src:'InstructGPT',who:'ppl',pct:SH.sft.toFixed(2)+'%'},
    {k:'pref',n:'Preference',s:'Pref',sig:'the answer ranked higher',dat:'people · 33k ranked prompts',src:'InstructGPT',who:'ppl',pct:SH.pref.toFixed(1)+'%'},
    {k:'rl',n:'RLVR',s:'RLVR',sig:'what a checker accepts',dat:'checker · 7,000+ environments',src:'MiMo-V2.6',who:'chk',pct:SH.rl.toFixed(1)+'%'}];
  const XS=[-6,-3,0,3,6],DXD=-.95,DXP=-.35,DXC=.68,ZC=.15,ZD=-1.75,HM=2.6,PY=.1,PW=1.15,PH=1.05,ROW=2.7;
  const HY=p=>HM*(Math.log10(p)+2)/4,TICKS=[100,10,1,0.1];
  window.LIFE={stages:ST.map(s=>({stage:s.n,share:SH[s.k],label:s.pct,height:HY(SH[s.k])}))};
  const col=(P,w)=>w==='web'?(P.dark?mix(P.card,P.ink,.38):mix(P.paper,P.ink,.3)):w==='ppl'?P.c1:w==='chk'?P.c3:P.c4;
  const mono={mono:true,fs:12};
  // the weights: a purple glass plate standing on the line (x its centre); a alpha, s scale
  function plate(R,x,a,s,o,z){if(a<=.01)return;const w=PW*(s||1),h=PH*(s||1);R.glass([x-w/2,PY,z||0],[w,0,0],[0,h,0],Object.assign({c:R.P.c4,a,nu:6,nv:6},o||{}))}
  function draw(R,k,e){const P=R.P,ph=R.W<520;R.grid(-8,8.4,-3,3.4,.5);
    const f=k>=1&&k<=5?k-1:null,cheap=k===6;
    // close-view labels fade in only once the camera has nearly arrived, so they never cross each other during the glide
    const la=Math.max(0,(e-.6)/.4);
    // the weights glide from the last station to this one
    const wx=(f==null?XS[cheap?4:0]:f===0?XS[0]:lerp(XS[f-1],XS[f],e))+DXP;
    const inF=i=>k===0?1:cheap?.2:i===f?1:.07; // close views: the neighbours almost vanish, so the card edges do not cut them
    // two floor bands: the base (what it knows) and post-training (what it does with it)
    [[-7.6,-1.6,P.mute],[-1.4,7.6,P.c4]].forEach(([x0,x1,c],b)=>{const a=k===0?1:cheap?.3:(f!=null&&(f<2)===(b===0))?.9:.3;
      R.quad([[x0,.004,-2.5],[x1,.004,-2.5],[x1,.004,1.55],[x0,.004,1.55]],{fill:mix(P.card,c,P.dark?.16:.08),fa:f!=null&&a<.5?.12:a,ea:f!=null?0:.3*a})});
    if(k===0){R.label([-4.6,0,1.55],ph?'the base':'the base: what it knows',{...mono,b:1,dy:30,c:P.mute});
      R.label([3.1,0,1.55],ph?'post-training':'post-training: what it does with it',{...mono,b:1,dy:30,c:P.c4})}
    ST.forEach((s,i)=>{const x=XS[i],a=inF(i),c=col(P,s.who),h=HY(SH[s.k]),on=k===0||i===f;
      // data: a box coloured by who makes it, streaming into the weights
      R.box([x+DXD,0,ZD],[1.0,.7,.7],{fill:mix(P.paper,c,.6),a});
      if(on){const fa=k===0?e:Math.min(1,e*1.4),pc=[x+DXP,PY+PH*.55,0];
        if(s.k==='rl'){ // the model's own attempts go out to the checker, its score comes back
          R.flowArc([pc[0]-.2,pc[1],0],[x+DXD-.15,.72,ZD+.3],.5,{c:P.c4,a:fa,r:.075,n:7,speed:1.1});
          R.flowArc([x+DXD+.2,.72,ZD+.3],[pc[0]+.2,pc[1],0],.5,{c,a:fa,r:.075,n:7,speed:1.1})}
        else R.flowArc([x+DXD,.72,ZD+.3],pc,.5,{c,a:fa,r:.075,n:s.who==='web'?11:6,speed:1.1})}
      // compute: a white column beside the plate, log scale
      const hh=k===0?Math.max(.02,h*e):h;R.box([x+DXC,0,ZC],[.42,hh,.42],{a});R.glow([x+DXC,hh+.06,ZC],.28,{c:P.acc,a:a*.45});
      // the weights' ghost at every other station
      if(i!==f||k===0)plate(R,x+DXP,(k===0?.5:f!=null?.05:.12));
      // labels: every name and share in the map; the focused station's detail in its close view
      if(k===0){R.label([x,0,1.0],ph?s.s:s.n,{...mono,b:1,dy:14,c:P.ink});R.label([x+DXC,hh,ZC],s.pct,{...mono,dy:-12,c:P.acc,b:1,a:e})}
      if(i===f){R.label([x,0,1.0],s.n,{...mono,b:1,dy:14,c:P.ink,a:la});R.label([x,0,1.0],s.sig,{...mono,dy:30,c:P.c4,b:1,a:la});
        R.label([x+DXC+.21,h,ZC],ph?s.pct:s.pct+' of pretraining',{...mono,b:1,al:'left',dx:8,dy:-2,c:P.acc,a:la});
        R.label([x+DXD,.7,ZD],s.dat,{...mono,b:1,dy:-28,c:s.who==='web'?P.ink:c,a:la});R.label([x+DXD,.7,ZD],s.src,{...mono,dy:-12,c:P.mute,a:la})}
    });
    // the moving weights (full strength) and, in the map, the one line they travel
    if(!cheap&&f!=null)plate(R,wx,1);
    if(k===0){R.flow([[XS[0]+DXP,PY+PH*.5,.05],[XS[4]+DXP,PY+PH*.5,.05]],{c:P.c4,a:e,r:.07,speed:1.2,n:20});
}
    // the compute ruler: a post with ticks at the right end of the line in the map, right of the column in a close view
    if(f==null&&!cheap){const px=XS[4]+1.45,tk=TICKS;R.line([[px,0,ZC],[px,HY(100),ZC]],{c:P.mute,w:1.2});
      tk.forEach(t=>{R.line([[px,HY(t),ZC],[px-.12,HY(t),ZC]],{c:P.mute,w:1.2});if(!ph)R.label([px,HY(t),ZC],t+'%',{...mono,al:'left',dx:6,c:P.mute})});
      if(f==null&&!ph)R.label([px,HY(100),ZC],'compute, share of pretraining',{...mono,al:'right',dx:-4,dy:-20,c:P.mute,a:e})}
    // step 7: three stages that act on the output of any stage, on a front row
    if(cheap){const src=[XS[4]+DXP,PY+PH*.55,0],a=e;plate(R,XS[4]+DXP,1);
      R.label([XS[4]+DXP,PY+PH,0],'any stage\'s output',{...mono,dy:-12,c:P.c4,b:1,a:la});
      const C=[{x:-2.6,n:'Distillation',d:'a smaller student'},{x:.7,n:'PEFT',d:'a small add-on'},{x:4.0,n:'Quantisation',d:'fewer bits per weight'}];
      C.forEach((c,i)=>{R.flowArc(src,[c.x,.5,ROW],.9,{c:P.c4,a,r:.07,n:9,speed:1.2});
        if(i===0)plate(R,c.x,a,.55,{},ROW);
        if(i===1){plate(R,c.x-.12,a*.45,.8,{},ROW);R.glass([c.x+.38,PY,ROW+.02],[.14,0,0],[0,PH*.8,0],{c:P.c5,a,nu:1,nv:4})}
        if(i===2)plate(R,c.x,a,.8,{nu:2,nv:2},ROW);
        R.label([c.x,0,ROW+.25],c.n,{...mono,b:1,dy:14,a:la});R.label([c.x,0,ROW+.25],c.d,{...mono,dy:30,c:P.mute,a:la,wide:1})})}
  }
  const full={cam:[.1,.52],bounds:[[-8.0,0,-2.3],[8.4,2.1,2.0]]};
  const close=i=>({cam:[.14,.62],bounds:[[XS[i]-2.4,0,-2.3],[XS[i]+2.6,1.9,1.7]]});
  const phone=v=>innerWidth<520?{cam:[v.cam[0],Math.min(1.1,v.cam[1]+.25)],bounds:v.bounds}:v;
  S3.stage({id:'stg-life',list:'sx-life',fig:'Fig. 1 · one set of weights through every stage · columns: compute, log',cam:full.cam,bounds:full.bounds,aspect:.44,dur:1500,hold:5200,draw,
    margin:w=>w<520?[22,8,14,8]:[28,16,18,16],
    view:k=>phone(k>=1&&k<=5?close(k-1):k===6?{cam:[.12,.62],bounds:[[-4.4,0,-.6],[7.4,1.1,3.7]]}:full)});
})();
