// ---- Scene, section 7: fairshare reorders the queue in 51 seconds. Data: window.SL.snaps (sprio -l of the gallery run at 05:38:07 and
// 05:38:58, the same eleven eligible jobs; squeue for each job's user; sshare -a -l for each team's EffectvUsage and RawUsage and each user's
// FairShare factor). Front: one column per job, height its priority, the bottom block its fairshare points (coloured by user), the white
// block the other factors, a red glass top for a nice penalty. Back: the two teams' usage meters, and bob's running 12-GPU job 81. ----
(function(){
  if(!document.getElementById('stg-fs')||!window.SL)return;const {lerp,mix}=S3,SN=SL.snaps;
  // sshare lines: an account line has 7 fields, a user line 9 (account, user, RawShares, NormShares, RawUsage, NormUsage, EffectvUsage, FairShare, LevelFS)
  const share=sn=>{const o={team:{},user:{}};sn.share.forEach(l=>{const f=l.trim().split(/\s+/);
      if(f.length===7&&f[0]!=='root')o.team[f[0]]={raw:+f[3],eff:+f[5]};if(f.length===9&&f[1]!=='root')o.user[f[1]]={fs:+f[7]}});return o};
  const SH=SN.map(share),ids=Object.keys(SN[0].sprio);
  const user=id=>{const q=SN[0].q.find(x=>x.id===id||x.id.indexOf(id+'_')===0);return q?q.user:''};
  const rank=si=>{const r=ids.slice().sort((a,b)=>SN[si].sprio[b].prio-SN[si].sprio[a].prio||(+a)-(+b));const o={};r.forEach((id,i)=>o[id]=i);return o};
  const RK=[rank(0),rank(1)],blk=SN[0].q.find(x=>x.st==='R');
  window.SL_FS={SH,RK,ids,blk:blk&&blk.id};
  const XS=1.0,x=i=>(i-(ids.length-1)/2)*XS,ZJ=1.0,HS=2.6/10000,ZT=-3.9,TX={teama:-2.6,teamb:2.0},MH=1.8;
  function col(P,u){return u==='alice'?P.c1:u==='carol'?P.c6:P.c4}
  function draw(R,k,e){const P=R.P,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12},o||{}));
    R.grid(-6.5,6.5,-4.4,2.4,.5);
    // the snapshot's values: steps 1 and 2 are 05:38:07; step 4 lerps the values; step 5 also moves the columns
    const tv=k<3?0:k===3?e:1,tx=k<4?0:e,mt=k<2?0:k===2?e:1,other=k===1||k===2?.28:k===3?.4:1;
    ids.forEach(id=>{const a=SN[0].sprio[id],b=SN[1].sprio[id],v=f=>lerp(a[f],b[f],tv),u=user(id),fs=v('fs'),pr=v('prio'),ni=v('nice'),c=col(P,u);
      const xi=lerp(x(RK[0][id]),x(RK[1][id]),tx),hot=id==='95'||(k>=4&&id==='93');
      R.box([xi,0,ZJ],[.68,Math.max(.02,fs*HS),.68],{fill:c});
      if(pr-fs>1)R.box([xi,fs*HS,ZJ],[.68,(pr-fs)*HS,.68],{fill:P.paper,a:other,shadow:false});
      if(ni>0)R.box([xi,pr*HS,ZJ],[.68,ni*HS,.68],{fill:P.bad,fa:.2,ea:.9,shadow:false,a:other});
      lab([xi,0,ZJ+.4],id,{dy:12,b:hot,c:hot?c:P.ink,fs:12.5});
      lab([xi,(pr+ni)*HS,ZJ],Math.round(pr).toLocaleString('en-US'),{dy:-10,b:hot,c:hot?c:P.mute,a:hot?1:Math.max(.45,other),wide:hot?0:1})});
    lab([x(0)-.45,0,ZJ],'priority',{al:'right',dx:-6,c:P.mute,wide:1});
    // the team meters at the back, from sshare
    if(k>=1){const ma=k===1?e:1;Object.keys(TX).forEach(t=>{const a=SH[0].team[t],b=SH[1].team[t],eff=lerp(a.eff,b.eff,mt),c=t==='teama'?mix(P.c1,P.c6,.5):P.c4;
        R.box([TX[t],0,ZT],[1.5,1e-3+MH,1.0],{fill:P.paper,fa:.08,a:ma,shadow:false});
        R.box([TX[t],0,ZT],[1.5,Math.max(.02,eff*MH),1.0],{fill:c,a:ma});
        lab([TX[t]+(t==='teama'?-.8:.8),eff*MH,ZT],t+' · usage '+eff.toFixed(2),{al:t==='teama'?'right':'left',dx:t==='teama'?-8:8,b:1,c,a:ma,fs:12.5,wide:1});
});
      // each user's Fair Tree factor
      const uf=n=>lerp(SH[0].user[n].fs,SH[1].user[n].fs,k<3?0:k===3?e:1).toFixed(2);
      lab([TX.teama-.8,0,ZT],'alice '+uf('alice')+' · carol '+uf('carol'),{al:'right',dx:-8,b:k===3,c:P.ink,a:ma,wide:1});
      lab([TX.teamb-.8,0,ZT],'bob '+uf('bob'),{al:'right',dx:-8,b:k===3,c:P.c4,a:ma,wide:1})}
    // bob's running job charges teamb
    if(k===2||k===3){const a=k===2?Math.min(1,e*2):1-e,bx=[4.7,0,ZT];R.box(bx,[1.3,.55,1.0],{fill:mix(P.paper,P.c4,.55),a});
      lab([bx[0],0,ZT+.5],'job '+(blk?blk.id:'')+' · bob · 12 GPUs',{dy:14,b:1,c:P.c4,a,wide:1});
      R.flowArc([bx[0]-.5,.5,ZT],[TX.teamb+.6,MH*.5,ZT],.7,{c:P.c4,a,r:.07,n:8,speed:1.5})}
    const clock=k===4?SN[1].at:k===3?SN[0].at+' to '+SN[1].at:SN[0].at;
    lab([(TX.teama+TX.teamb)/2,MH+.5,ZT],clock+' UTC',{dy:-14,b:1,c:P.acc,fs:13})}
  const st=S3.stage({id:'stg-fs',list:'sx-fs',fig:'Fairshare · sprio and sshare, recorded',cam:[.1,.66],bounds:[[-6,0,-4.5],[6,2.4,1.9]],aspect:.58,dur:1600,hold:5000,draw,
    margin:w=>w<520?[18,10,16,10]:[24,18,22,60]});
  (window.SLSTG=window.SLSTG||{})['stg-fs']=st;
})();
