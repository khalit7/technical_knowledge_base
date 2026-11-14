// ---- Scene, Fig. 3 (section 9): a fleet's GPU-seconds flowing into the jobs and accounts that held them (renderer v2) ----
// The local Slurm cluster (three nodes of 4 GPUs) and the Slurm test's accounting, window.OC.sacct (sacct: user, account, elapsed,
// AllocTRES; submit and start for the wait). Placement from squeue mid-run: 131 on c[1-2] with 2 GPUs per node, 132 on c3; 133's node
// was not recorded (drawn on node 1). Meter heights are GPU-seconds; the price is the AWS Capacity Block's, read 2026-10-16.
(function(){
  if(!document.getElementById('stg-cb')||!window.OC||!window.OC.sacct)return;const {at,off,lerp,mix}=S3;
  const J={};OC.sacct.forEach(j=>J[j.id]=j);const a=J['131'],b=J['132'],c=J['133'];
  const gs=j=>j.gpu*j.el,ts=s=>Date.parse(s+'Z')/1000,wait=ts(c.start)-ts(c.submit);
  const pr=OC.prices.find(x=>x.provider==='AWS'&&x.gpu==='H100'&&x.kind.indexOf('reserved')===0).usd;
  const team={};OC.sacct.forEach(j=>team[j.acct]=(team[j.acct]||0)+gs(j));
  window.OC_CB={a:gs(a),b:gs(b),c:gs(c),wait,teama:team.teama,teamb:team.teamb,price:pr,usd_a:team.teama/3600*pr,usd_b:team.teamb/3600*pr};
  const NX=[-3.6,0,3.6],ZN=2.4,GO=[-1.05,-.35,.35,1.05],gp=(n,g)=>[NX[n]+GO[g],.2,ZN];
  const JX={131:-3,132:0,133:3},ZJ=-.2,TX={teama:-1.5,teamb:1.5},ZT=-2.9,HS=1.7/400;
  // who holds each GPU at each step: [node][gpu] -> job id or ''
  const HOLD=k=>{const h=[['','','',''],['','','',''],['','','','']];
    if(k>=1&&k<=2){h[0][0]=h[0][1]=h[1][0]=h[1][1]='131';h[2]=['132','132','132','132']}
    if(k>=3){h[0]=['133','133','133','133']}return h};
  function draw(R,k,e){const P=R.P,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12},o||{})),JC={131:P.c1,132:P.c4,133:P.c6};
    R.grid(-6,6,-4,3.8,.5);
    const back=k>=4?lerp(1,.3,k===4?e:1):1,nb=k>=4?lerp(1,0,k===4?e:1):1;
    // nodes and their GPUs, coloured by the job holding them
    const H=HOLD(k),H0=HOLD(Math.max(0,k-1));
    if(nb>.01)NX.forEach((x,n)=>{R.box([x,0,ZN],[3,.2,1.4],{fill:mix(P.paper,P.ink,.06),a:nb});lab([x,0,ZN+.7],'node '+(n+1),{dy:14,b:1,a:nb,c:P.mute});
      GO.forEach((_,g)=>{const j=H[n][g],j0=H0[n][g],t=k>=1&&k<=3?e:1,fc=mix(j0?JC[j0]:P.paper,j?JC[j]:P.paper,t);
        R.box(gp(n,g),[.58,.5,.7],{fill:fc,a:nb,shadow:false});
        if(k===2&&!j)R.glow([gp(n,g)[0],.55,ZN],.35,{c:P.good,a:e})})});
    if(k===2)[0,1].forEach(n=>lab([NX[n]+.7,.7,ZN],'2 free',{dy:-14,b:1,c:P.good,a:e}));
    // job meters: height = GPU-seconds so far
    const fill={131:k>=2?1:k===1?e:0,132:k>=2?1:k===1?e:0,133:k>=4?1:k===3?e:0};
    [['131',a,'alice (teama)'],['132',b,'bob (teamb)'],['133',c,'carol (teama)']].forEach(([id,j,who])=>{const x=JX[id],v=gs(j)*fill[id],ja=k===0?.9:back,la=k>=4?(k===4?1-e:0):1;
      R.box([x,0,ZJ],[1.1,1.7,1.1],{fill:P.paper,fa:.08,a:ja,shadow:false});
      if(v>0)R.box([x,0,ZJ],[1.1,v*HS,1.1],{fill:JC[id],a:ja});
      lab([x,1.7,ZJ-.55],R.W<520?id:id+' '+who,{dy:-10,c:JC[id],b:1,a:la});
      if(fill[id]>0)lab([x,v*HS,ZJ+.55],Math.round(v)+' GPU-s',{dy:-8,b:1,a:k>=4?(R.W<520?0:.45):ja})});
    // flows: allocated GPUs stream GPU-seconds into their job's meter while they are held
    const fl=(from,to,col,al,o)=>R.flowArc(from,to,1.1,Object.assign({c:col,a:al,r:.06,n:5,speed:1.5},o||{}));
    if(k===1)[0,1,2].forEach(n=>GO.forEach((_,g)=>{const j=H[n][g];if(j)fl([gp(n,g)[0],.7,ZN],[JX[j],.6,ZJ],JC[j],e)}));
    if(k===3)GO.forEach((_,g)=>fl([gp(0,g)[0],.7,ZN],[JX[133],.6,ZJ],JC[133],e));
    if(k===2)lab([JX[133],.85,ZJ],'waits '+Math.round(wait)+' s'+(R.W<520?'':': 0 GPU-s'),{b:1,c:P.c6,a:e}); // shorter on a phone, where it ran into 132
    // accounts: the jobs roll up, then a price
    if(k>=4){const ta=k===4?e:1;Object.keys(TX).forEach(t=>{const x=TX[t],v=team[t]*ta;
        if(v>0)R.box([x,0,ZT],[1.6,v*HS,1.3],{fill:t==='teama'?mix(P.c1,P.c6,.5):P.c4,a:ta});
        lab([x,v*HS,ZT],t+': '+(k===5?'$'+(team[t]/3600*pr).toFixed(2):Math.round(v)+' GPU-s'),{dy:-12,b:1,fs:13,a:ta})});
      if(k===4){fl([JX[131],1.4,ZJ],[TX.teama,1,ZT],JC[131],e);fl([JX[133],.7,ZJ],[TX.teama,1,ZT],JC[133],e);fl([JX[132],1.4,ZJ],[TX.teamb,1,ZT],JC[132],e)}
      if(k===5)lab([TX.teamb+1,0,ZT],'at $'+pr.toFixed(2)+' per GPU-hour',{al:'left',dx:8,c:P.mute,a:e,wide:1})}
  }
  const full={cam:[.18,.66],bounds:[[-5.4,0,-3.6],[5.4,1.9,3.2]]};
  const st=S3.stage({id:'stg-cb',list:'sx-cb',fig:'Fig. 3 · GPU-seconds to jobs to accounts',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1400,hold:5200,draw,
    view:k=>k>=4?{cam:[.2,.55],bounds:[[-4.4,0,-3.6],[4.4,2,.6]]}:full,
    margin:w=>w<520?[16,10,16,10]:[22,18,20,18]});
  (window.OCSTG=window.OCSTG||{})['stg-cb']=st;
})();
