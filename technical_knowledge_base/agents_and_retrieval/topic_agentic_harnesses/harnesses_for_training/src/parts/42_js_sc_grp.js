// ---- Scene: Fig. 3, groups and advantages (renderer v2). Data: HT.groups (70 real groups: rewards, pass/fail and partial), HT.mask (sampled
// tokens per local rollout) and HT.runs (Haiku's output tokens). The field is every group; steps 3 to 5 move in on the chosen group. ----
(function(){
  if(!document.getElementById('stg-grp')||!window.HT)return;const {at,off,mix,lerp}=S3,HT=window.HT,$=id=>document.getElementById(id),esc=RD.esc;
  const G=HT.groups,ROWS=[['local','bash'],['local','tools'],['local','plain'],['haiku','bash'],['haiku','tools'],['haiku','plain'],['haiku','ccfull']];
  const RZ=[2.25,1.5,.75,-.35,-1.1,-1.85,-2.6],TXc=i=>-4.5+i,HS={bash:'bash',tools:'tools',plain:'no line no.',ccfull:'Claude Code'};
  const flat=(g,k)=>g[k].every(v=>v===g[k][0]);
  const tok=id=>{const m=HT.mask.find(x=>x.id===id);if(m&&m.counts)return m.counts.gen;const r=HT.runs.find(x=>x.id===id);return r&&r.out||0};
  const S={g:G.findIndex(g=>g.m==='local'&&g.bin.reduce((a,b)=>a+b,0)===1),rew:'bin',norm:'grpo'};
  function adv(rs,norm){const n=rs.length,mu=rs.reduce((a,b)=>a+b,0)/n,sd=Math.sqrt(rs.reduce((a,b)=>a+(b-mu)*(b-mu),0)/n);
    return {mu,sd,a:rs.map(x=>norm==='grpo'?(sd>0?(x-mu)/sd:0):norm==='dr'?x-mu:(n>1?x-(rs.reduce((a,b)=>a+b,0)-x)/(n-1):0))}}
  const FZ=4.3,FW=1.15,BH=1.6,PY=2.05; // the front stage: one group, large
  function draw(R,k,e){const P=R.P,fa=Math.min(1,e*1.6),nar=R.W<520;R.grid(-5.6,5.2,-3.2,5.6,.5);
    // the field: every group, one cluster of bars per model, harness and task
    const fk=k===0?'bin':'part',fieldA=k<=1?1:.09,sel=G[S.g];
    ROWS.forEach(([m,h],ri)=>{const z=RZ[ri];
      for(let ti=0;ti<10;ti++){const g=G.find(x=>x.m===m&&x.h===h&&x.t==='T'+String(ti+1).padStart(2,'0'));if(!g)continue;
        const isSel=g===sel,fl=flat(g,fk),n=g[fk].length,a=isSel&&k>=2?Math.max(.6,fieldA):fieldA;
        g[fk].forEach((v,j)=>{const v0=k===1?lerp(g.bin[j],g.part[j],e):v,hgt=Math.max(.025,v0*.7);
          R.box([TXc(ti)+(j-(n-1)/2)*.19,0,z],[.14,hgt,.3],{fill:fl?mix(P.paper,P.mute,.35):isSel&&k>=2?P.acc:P.c1,a,shadow:false,lw:.5})})}
      R.label([-5.1,.1,z],(m==='local'?'4B ':'Haiku ')+HS[h],{fs:12,al:'right',dx:-2,c:P.mute,a:k<=1?1:0,grp:'rows'})});
    if(k<=1){const z=(f,m)=>G.filter(g=>g.m===m&&flat(g,f)).length+' of '+G.filter(g=>g.m===m).length;
      R.label([0,1.0,RZ[1]],'flat: '+z(fk,'local')+' (4B)',{fs:12.5,b:1,mono:true,c:P.ink,a:k===0?fa:1});
      R.label([0,1.0,RZ[5]],'flat: '+z(fk,'haiku')+' (Haiku)',{fs:12.5,b:1,mono:true,c:P.ink,a:k===0?fa:1});
      if(k===1)R.label([0,0,RZ[0]+.5],'partial reward: fraction of the 20 checks passed',{fs:12,mono:true,dy:16,c:P.mute,a:fa,wide:1})}
    // the front stage: the chosen group, large
    if(k>=2){const rs=sel[S.rew],n=rs.length,A=adv(rs,S.norm),x=j=>(j-(n-1)/2)*FW,ra=k===2?fa:k===3?1-.55*e:.45;
      R.box([0,0,FZ],[n*FW+.4,.04,1.05],{a:ra,shadow:false});
      rs.forEach((v,j)=>{R.box([x(j),.04,FZ],[.62,Math.max(.03,v*BH),.62],{fill:v>=1?P.good:mix(P.paper,P.c1,.5),a:ra});
        R.label([x(j),Math.max(.03,v*BH)+.04,FZ],S.rew==='bin'?String(v):v.toFixed(2),{fs:13,mono:true,b:1,dy:-10,a:Math.max(.5,ra)});
        R.label([x(j),0,FZ+.5],sel.ids[j].split('_').pop()+(k===4&&!nar?' · '+tok(sel.ids[j]).toLocaleString('en-GB')+' tok':''),{fs:12,mono:true,dy:14,c:k===4?P.ink:P.mute,a:Math.max(.6,ra)})});
      // the mean: a glass plane at its height
      const my=A.mu*BH;R.glass([-(n*FW)/2-.2,my+.04,FZ-.5],[n*FW+.4,0,0],[0,0,1],{c:P.ink,a:(k===2?at(k,e,2):1)*.55,nu:n,nv:2});
      R.label([(n*FW)/2+.3,my+.04,FZ],'mean '+A.mu.toFixed(2),{fs:12.5,mono:true,b:1,al:'left',dx:6,c:P.ink,a:k===2?fa:.8});
      R.label([0,BH+.8,FZ],(sel.m==='local'?'4B':'Haiku')+' · '+HS[sel.h]+' · '+sel.t,{fs:13,b:1,c:P.acc,a:k===2?fa:1});
      // advantages: signed bars on a plinth just in front (positive stands on it, negative hangs below)
      if(k>=3){const aa=k===3?fa:1,mx=Math.max(1e-9,...A.a.map(Math.abs)),pz=FZ+.95;
        R.box([0,PY-.045,pz],[n*FW+.3,.045,.45],{a:aa,shadow:false});[-1,1].forEach(sx=>R.box([sx*(n*FW/2+.1),0,pz],[.03,PY-.05,.03],{a:aa*.9}));
        A.a.forEach((v,j)=>{const hgt=Math.max(.012,Math.abs(v)/mx*.6),c=v>1e-9?P.good:v<-1e-9?P.bad:P.mute;
          R.box([x(j),v>=0?PY:PY-.045-hgt,pz],[.5,hgt,.3],{fill:c,a:aa,shadow:false,lw:.7});
          R.label([x(j),v>=0?PY+hgt:PY-.045-hgt,pz],(v>1e-9?'+':'')+(Math.abs(v)<1e-9?'0':v.toFixed(2)),{fs:13,mono:true,b:1,dy:v>=0?-10:12,c,a:aa})});
        R.label([-(n*FW)/2-.25,PY,pz],{grpo:'GRPO',dr:'Dr. GRPO',rloo:'RLOO'}[S.norm],{fs:12.5,b:1,al:'right',dx:-6,c:P.ink,a:aa,wide:1});
        if(A.a.every(v=>Math.abs(v)<1e-9))R.label([0,PY+.4,pz],'flat group: no gradient',{fs:13,b:1,c:P.bad,a:aa})}
      // the update: every sampled token carries its rollout's advantage into the policy
      if(k===4){const px=(n*FW)/2+1.4,tk=sel.ids.map(tok),mt=Math.max(1,...tk);
        R.glass([px-.55,.3,FZ+.2],[1.1,0,0],[0,1.5,0],{c:P.c2,a:fa,nu:6,nv:6});R.label([px,1.8,FZ+.2],'policy',{fs:13,b:1,c:P.c2,dy:-10,a:fa});
        A.a.forEach((v,j)=>{if(Math.abs(v)<1e-9)return;const c=v>0?P.good:P.bad;
          R.flowArc([x(j),PY+.1,FZ+.95],[px,1.0,FZ+.25],.55+.08*j,{c,a:fa,r:.04+.03*Math.abs(v)/Math.max(...A.a.map(Math.abs)),n:Math.max(3,Math.round(16*tk[j]/mt)),speed:1.2});
        })}
    }
  }
  const full={cam:[.22,.78],bounds:[[-5.8,0,-3],[5.2,.8,2.7]]};
  const st=S3.stage({id:'stg-grp',list:'sx-grp',fig:'Fig. 3 · 70 real groups, then one up close',cam:full.cam,bounds:full.bounds,aspect:.66,dur:1400,hold:5000,draw,
    margin:w=>w<520?[14,8,14,8]:[16,14,14,14],
    view:k=>k===4?{cam:[.12,.42],bounds:[[-2.9,0,3.6],[4.3,2.6,5.4]]}:k>=2?{cam:[.12,.42],bounds:[[-2.9,0,3.6],[3.2,2.6,5.4]]}:full});
  // the chosen group and its reward and normaliser; a choice is a reader control: move to the group (step 3 or later) and stop autoplay
  const selEl=$('ht-advsel');
  const order=G.map((g,i)=>i).sort((a,b)=>(flat(G[a],'bin')?1:0)-(flat(G[b],'bin')?1:0));
  selEl.innerHTML=order.map(i=>{const g=G[i];return '<option value="'+i+'">'+esc((g.m==='local'?'4B':'Haiku')+'/'+HS[g.h]+'/'+g.t+': '+g.bin.join(''))+'</option>'}).join('');
  selEl.value=S.g;
  const touch=()=>{if(!st)return;st.st.user=true;st.pause();if(st.st.k<2)st.go(2,true);else st.draw()};
  selEl.addEventListener('change',()=>{S.g=+selEl.value;touch()});
  RD.seg($('ht-advrew'),v=>{S.rew=v;touch()});RD.seg($('ht-advnorm'),v=>{S.norm=v;touch()});
})();
