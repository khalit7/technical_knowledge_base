// ---- Scene: Fig. 2, every call re-reads everything before it (renderer v2). Data: AR.tool (the root's 200 recorded ReAct trajectories, Qwen3-1.7B):
// s_mean, the first call's prompt, and r_mean, what each step adds (thought, action, observation); by_n, recorded billed and computed tokens for the
// 28 questions with n = 4 searches. One call per row, its prompt to scale (2,100 tokens = 5.4 units): grey is re-read from the call before,
// colour is new. The last step turns the re-read parts into the prompt cache (glass): computed once, billed again. ----
(function(){
  if(!document.getElementById('stg-stair')||!window.ARL)return;const {mix}=S3;
  const TL=ARL.A.tool,S=TL.s_mean,Rr=TL.r_mean,B4=TL.by_n['4'],fi=n=>Math.round(n).toLocaleString('en-GB');
  const N=5,X0=-2.4,HS=5.2/2100,TH=.2,TD=.55,Z=j=>-1.9+j*.95,len=j=>S+j*Rr,OX=-4.2;
  // which calls exist at step k (k 0: call 1; 1: call 2; 2: call 3; 3: calls 4 and 5; 4: all, cached)
  const shown=k=>k<=2?k+1:N;
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-4.8,3.4,-2.2,2.4,.5);
    const n=shown(k),grow=j=>{if(k<=2)return j===k?e:1;if(k===3)return j===3?Math.min(1,e*2):j===4?Math.max(0,e*2-1):1;return 1};
    // the search tool: results come from here
    R.box([OX,0,0],[.9,.5,.9],{fill:mix(P.paper,P.c1,.25)});R.label([OX,.5,0],'search tool',{fs:12.5,b:1,c:P.c1,dy:-10});
    let billed=0;
    for(let j=0;j<n;j++){const z=Z(j),gw=grow(j),prev=j?len(j-1):0,nw=j?Rr:S,act=k===4?1:(k<=2?j===k:j>=3)?1:.5;
      const cached=k===4&&j>0,ga=cached?1-e:1;
      if(prev>0){const lw=prev*HS*Math.min(1,gw*2);
        if(ga>.01)R.box([X0+lw/2,0,z],[lw,TH,TD],{fill:mix(P.paper,P.mute,.3),a:act*ga});
        if(cached)R.glass([X0,TH*.55,z-TD/2],[prev*HS,0,0],[0,0,TD],{c:P.c6,a:e,nu:Math.max(2,Math.round(prev/250)),nv:2})}
      const nl=nw*HS*gw;if(nl>.01)R.box([X0+prev*HS+nl/2,0,z],[nl,TH,TD],{fill:j?P.c2:P.c5,a:act});
      R.label([X0,TH/2,z],'call '+(j+1),{fs:12.5,mono:true,al:'right',dx:-8,c:P.mute,grp:'calls',a:Math.max(.5,act)});
      R.label([X0+(prev+nw*gw)*HS,TH,z],fi(prev+nw*gw),{fs:12.5,mono:true,b:1,al:'left',dx:8,c:P.ink,a:act*Math.min(1,gw*2)});
      billed+=(prev+nw)*gw;
      // re-read: the whole previous prompt streams down into this call; the new part streams in from the search tool
      const live=(k<=2&&j===k&&j>0)||(k===3&&j>=3);
      if(live){R.flowArc([X0+prev*HS*.5,TH,Z(j-1)],[X0+prev*HS*.5,TH,z],.35,{c:P.mute,a:.9,r:.05,n:5,speed:1});
        R.flowArc([OX,.5,0],[X0+(prev+nw*.5)*HS,TH,z],.8,{c:P.c2,a:.9,r:.065,n:7,speed:1.3})}
      if(k===4&&j>0&&j<N-1)R.flowArc([X0+prev*HS+nw*HS*.5,TH,z],[X0+prev*HS+nw*HS*.5,TH*.55,Z(j+1)-TD/4],.3,{c:P.c6,a:.8*e,r:.045,n:4,speed:.8})} // this call's new part is cached for the next
    if(k===0)R.label([X0,0,Z(0)+TD/2],'s: instructions + tool description + question',{fs:12.5,c:P.c5,al:'left',dy:13,wide:1,a:e});
    if(k===1)R.label([X0+S*HS,0,Z(1)+TD/2],'r: thought + action + observation',{fs:12.5,c:P.c2,al:'left',dy:13,wide:1,a:e});
    const tx=k===4?'computed with the prompt cache · '+fi(S+4*Rr)+' of '+fi(5*S+10*Rr):'billed so far · '+fi(billed);
    R.label([X0+5.4,0,Z(0)-TD/2],tx,{fs:13,b:1,mono:true,al:'right',c:k===4?P.c6:P.ink,dy:-10});
  }
  S3.stage({id:'stg-stair',list:'sx-stair',fig:'Fig. 2 · prompt tokens of each model call, mean s and r',cam:[0,.92],bounds:[[-4.8,0,-2.5],[3,.5,2.3]],aspect:.55,dur:1400,hold:4800,draw,
    margin:w=>w<520?[14,10,26,10]:[18,80,30,40]});
})();
