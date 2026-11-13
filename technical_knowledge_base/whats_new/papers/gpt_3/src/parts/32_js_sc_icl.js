// ---- Scene: Fig. 2, in-context learning against fine-tuning on Figure 2.1's own task (renderer v2: glass plates for the layers, flowing dots where data moves) ----
// Token counts are the prompt in GPT-3's tokeniser (r50k_base, src/count_tokens.py, inputs/fig21_tokens.json): 7, 10, 11, 11 and 3, answer 2.
// The context window is drawn to scale as a tray of 2,048 slots (64 by 32), one per token. The model's 96 layers are drawn as 8 plates (illustrative).
(function(){
  if(!document.getElementById('stg-icl'))return;const {at,off,mix}=S3;
  const SEG=[{t:'Translate English to French:',n:7,k:'ins'},{t:'sea otter => loutre de mer',n:10,k:'ex'},{t:'peppermint => menthe poivrée',n:11,k:'ex'},{t:'plush girafe => girafe peluche',n:11,k:'ex'},{t:'cheese =>',n:3,k:'q'}],ANS=2;
  const COLS=64,ROWS=32,SL=.15,X0=-4.8,Z0=-.4,TW=COLS*SL,TD=ROWS*SL,CB=.12;
  const MX=-.6,MZ=-2.6,CX=3.1,PL=8,PY=.45,PD=.4,PW=1.9;            // the model (and the fine-tuned copy) as a stack of plates behind the tray
  const PILE=[-6.3,0,-.7];
  let MODE='icl';
  const slot=j=>[X0+(j%COLS+.5)*SL,0,Z0+(Math.floor(j/COLS)+.5)*SL];
  const start=i=>{let s=0;for(let q=0;q<i;q++)s+=SEG[q].n;return s};
  function tokens(R,from,cnt,col,a,lab,above){if(a<=.01)return;for(let j=0;j<cnt;j++){const p=slot(from+j);R.box([p[0],0,p[2]],[CB,CB,CB],{fill:col,a,lw:.6,shadow:false})}
    if(lab){const m=slot(from+cnt/2-.5);R.label([m[0],CB,m[2]],lab,{mono:true,fs:12,c:col,a,dy:above?-14:20,wide:1})}}
  function model(R,cx,tint,a,lab,sub,top){const P=R.P,c=mix(P.c1,P.c5,tint);
    for(let i=0;i<PL;i++)R.glass([cx-PW/2,PY+i*PD,MZ-PW/2],[PW,0,0],[0,0,PW],{c,a,nu:6,nv:6});
    R.box([cx,0,MZ],[PW+.16,.08,PW+.16],{a});
    if(top){const ty=PY+PL*PD;if(lab)R.label([cx,ty,MZ],lab,{fs:13,b:1,c,a:Math.max(.5,a),dy:-30});if(sub)R.label([cx,ty,MZ],sub,{fs:12.5,c:P.ink,a:Math.max(.5,a),dy:-13});return}
    const ly=PY+(PL-1)*PD,lx=cx-PW/2-.1;
    if(lab)R.label([lx,ly,MZ+PW/2],lab,{fs:13,b:1,c,a:Math.max(.5,a),al:'right',dx:-6,dy:-9});
    if(sub)R.label([lx,ly,MZ+PW/2],sub,{fs:12.5,c:P.ink,a:Math.max(.5,a),al:'right',dx:-6,dy:9})}
  const colOf=(P,k)=>k==='ins'?P.c4:k==='q'?P.c2:k==='ans'?P.good:P.c1;
  function trayLab(R,used,a){R.label([X0,0,Z0+TD],'context window to scale: '+used+' of 2,048 tokens',{al:'left',fs:12.5,b:1,c:R.P.mute,dy:16,a})}
  function draw(R,k,e){const P=R.P;R.grid(-7,6,-4,5,.5);
    // the tray: 2,048 slots, the 2,048-token context
    R.glass([X0,.005,Z0],[TW,0,0],[0,0,TD],{c:P.mute,a:.5,nu:COLS,nv:ROWS,th:.01});
    // the training set the demonstrations are drawn from
    for(let i=0;i<5;i++)R.box([PILE[0],i*.1,PILE[2]],[.9,.09,.6],{fill:mix(P.paper,P.c1,.15),a:.8,shadow:i===0,lw:.6});
    R.label([PILE[0],.5,PILE[2]],'training set',{fs:12,c:P.mute,dy:-12});
    if(MODE==='icl'){
      const shown=Math.min(k,5);let used=0;
      for(let i=0;i<shown;i++){const s=SEG[i],a=i===k-1?e:1;tokens(R,start(i),s.n,colOf(P,s.k),a,i===k-1?s.t:null,true);used+=s.n*(i===k-1?e:1)}
      // demonstrations arrive from the training set; the instruction and the query are typed
      if(k>=2&&k<=4){const s=slot(start(k-1)+SEG[k-1].n/2);R.flowArc([PILE[0]+.3,.5,PILE[2]],[s[0],CB,s[2]],1.1,{c:P.c1,a:Math.min(1,e*1.8),n:10,r:.06,speed:1.4})}
      if(k===6){const qs=slot(20),top=PY+PL*PD;R.flowArc([qs[0],CB,qs[2]],[MX,PY-.05,MZ+PW/2-.2],.6,{c:P.c1,n:12,r:.06,speed:1.3,a:Math.min(1,e*2)});
        R.flow([[MX,PY,MZ],[MX,top,MZ]],{c:P.c1,n:10,r:.07,speed:1.2,a:Math.min(1,e*2)});
        const as=slot(42);R.flowArc([MX+.4,top,MZ],[as[0]+SL/2,CB,as[2]],1,{c:P.good,n:10,r:.07,speed:1.3,a:e});
        tokens(R,42,ANS,P.good,e,'→ fromage',true);used=42+ANS*e}
      model(R,MX,0,1,'GPT-3 175B','frozen: 0 updates');
      trayLab(R,Math.round(used),1);
      if(k===6)R.label([MX-PW/2-.1,PY+(PL-1)*PD,MZ+PW/2],'one forward pass, nothing written back',{al:'right',dx:-6,dy:28,fs:12.5,b:1,c:P.good,a:e,wide:1})}
    else{
      // fine-tuning: each example goes into the weights by a gradient step; the context holds one example at a time
      const ups=k===0?0:k<=3?(k-1)+e:k===4?3+e:4,tint=k===5?1-.85*e:k===6?.15:Math.min(1,ups/4);
      const top=PY+PL*PD;
      if(k>=1&&k<=3){const s=SEG[k];tokens(R,0,s.n,P.c1,e,s.t,true);
        const m=slot(s.n/2);R.flowArc([PILE[0]+.3,.5,PILE[2]],[m[0],CB,m[2]],1.1,{c:P.c1,a:Math.min(1,e*2),n:8,r:.06,speed:1.4});
        R.flowArc([m[0],CB,m[2]],[MX,PY-.05,MZ+PW/2-.2],.6,{c:P.c1,a:Math.min(1,e*2),n:10,r:.06,speed:1.3});
        R.flow([[MX+.5,top,MZ+.5],[MX+.5,PY,MZ+.5]],{c:P.c2,a:e,n:12,r:.08,speed:1.3});
        R.label([MX-PW/2-.1,PY+(PL-1)*PD,MZ+PW/2],'gradient step '+k+': all 175B weights move',{al:'right',dx:-6,dy:28,fs:12.5,b:1,c:P.c2,a:e,wide:1})}
      if(k===4){R.flowArc([PILE[0]+.3,.5,PILE[2]],[MX-.5,PY+.2,MZ+PW/2-.2],1.4,{c:P.c1,n:28,r:.05,speed:1.8});
        R.flow([[MX+.5,top,MZ+.5],[MX+.5,PY,MZ+.5]],{c:P.c2,n:24,r:.07,speed:1.8});
        R.label([PILE[0],.5,PILE[2]],'… thousands more pairs',{fs:12.5,b:1,c:P.c1,dy:-30,a:e})}
      const upd=k===0?'pretrained':k<=3?'updated '+k+' time'+(k>1?'s':''):k===4?'updated 1,000s of times':'pretrained, kept for other tasks';
      model(R,MX,tint,1,'GPT-3 175B',upd);
      if(k>=5){const ca=at(k,e,5);model(R,CX,1,ca,'translation copy, 175B','updated 1,000s of times',true)}
      let used=k>=1&&k<=3?Math.round(SEG[k].n*e):0;
      if(k===6){tokens(R,0,3,P.c2,1,'cheese =>',false);const qs=slot(1);
        R.flowArc([qs[0],CB,qs[2]],[CX,PY-.05,MZ+PW/2-.2],.7,{c:P.c2,n:12,r:.06,speed:1.3,a:Math.min(1,e*2)});
        R.flow([[CX,PY,MZ],[CX,top,MZ]],{c:P.c1,n:10,r:.07,speed:1.2,a:Math.min(1,e*2)});
        const as=slot(3);R.flowArc([CX-.4,top,MZ],[as[0]+SL/2,CB,as[2]],1,{c:P.good,n:10,r:.07,speed:1.3,a:e});
        tokens(R,3,ANS,P.good,e,'→ fromage',true);used=3+Math.round(ANS*e)}
      trayLab(R,used,1)}
  }
  const full={cam:[.12,.7],bounds:[[-6.9,0,-3.6],[5,3.4,4.4]]};
  const close={cam:[.1,.42],bounds:[[-6.9,0,-3.6],[2.4,3.4,0]]};
  const stg=S3.stage({id:'stg-icl',list:'sx-icl-icl',fig:'Fig. 2 · the task in the prompt, or in the weights',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1400,hold:4600,draw,
    margin:w=>w<520?[16,8,18,8]:[22,14,26,14],
    // step 1 shows the whole 2,048-slot window; later steps move in close on the first row and the model
    view:k=>k===0?full:MODE==='icl'?close:k>=5?{cam:[.06,.42],bounds:[[-6.9,0,-3.6],[4.4,3.4,0]]}:close});
  const seg=document.getElementById('iclM');
  seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    MODE=b.dataset.m;['icl','ft'].forEach(m=>document.getElementById('sx-icl-'+m).hidden=m!==MODE);stg.list('sx-icl-'+MODE)}));
  window.GPT3_ICL={SEG,ANS,COLS,ROWS,mode:()=>MODE};
})();
