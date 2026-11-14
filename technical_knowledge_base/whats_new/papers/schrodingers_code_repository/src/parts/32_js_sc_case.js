// ---- Scene: the case study of §V-E and Figure 4, the same Django bug walked in the familiar and the renamed view (renderer v2: the repository as
// file blocks on directory plinths, the agent's reads as flowing dots, the paper's action totals as two bars to scale). Data: the 17 tree entries
// the case touches (paths as in Django at the task's base commit; the renamed labels are Figure 4's renamings applied by the ported release,
// SR.apply with REPO.fig.mapping); which entries each step lights follows the text of §V-E (the entries standing for "surrounding logic, tests,
// configuration" are this page's illustration, as the caption says); the totals 37 and 217 actions are the paper's. Two step lists, swapped by #csM.
(function(){
  if(!document.getElementById('stg-cs'))return;const {at,off,lerp,mix}=S3;
  const R=window.REPO,FM=SR.forwardMap(R.keys,R.fig.mapping);
  // entry: name, path, kind (d directory, f file), position x, z, and for a directory its extent [x0,x1,z0,z1] and level (plinth height)
  const T=[
    ['django/','django/','d',[-4.35,2.05,-2.45,.45],0],['db/','django/db/','d',[-4.25,.35,-2.35,.35],1],['models/','django/db/models/','d',[-4.15,.25,-2.25,.25],2],
    ['base.py','django/db/models/base.py','f',-3.6,-.35],['manager.py','django/db/models/manager.py','f',-2.5,-.35],['options.py','django/db/models/options.py','f',-1.4,-.35],['query.py','django/db/models/query.py','f',-.3,-.35],
    ['fields/','django/db/models/fields/','d',[-4.05,-.85,-2.15,-1.3],3],['__init__.py','django/db/models/fields/__init__.py','f',-3.6,-1.72],['related.py','django/db/models/fields/related.py','f',-2.5,-1.72],['mixins.py','django/db/models/fields/mixins.py','f',-1.4,-1.72],
    ['utils/','django/utils/','d',[.65,1.95,-2.25,-1.15],1],['encoding.py','django/utils/encoding.py','f',1.3,-1.7],
    ['tests/','tests/','d',[2.35,4.65,-1.05,.45],0],['model_fields/','tests/model_fields/','d',[2.45,4.55,-.95,.35],1],['models.py','tests/model_fields/models.py','f',2.95,-.3],['tests.py','tests/model_fields/tests.py','f',4.05,-.3]];
  const BS=[.88,.5,.62];
  const DL={'django/':[-4.3,.45,'left',10],'tests/':[2.4,.45,'left',10],'models/':[.25,-2.25,'right',-9],'fields/':[-.9,-1.3,'right',10],'utils/':[.7,-1.15,'left',10],'model_fields/':[2.5,-.95,'left',-9]};
  const name=(i,m)=>{if(m==='orig')return T[i][0];const p=SR.apply(T[i][1],FM,true).replace(/\/$/,''),s=p.split('/').pop();return s+(T[i][1].endsWith('/')?'/':'')};
  // the lit entries per step (as in the old 2D animation) and the paper's totals
  const V={orig:[[],[0,1,2,3,7,8],[8],[3],[8]],map:[[],[0,1,2,7,11,13,14],[0,2,3,7,8,14,15,16],[8,3],[4,5,6,8,9,10,12,15,16],[8]]};
  const TOT={orig:37,map:217};
  const ISS={orig:'get_FOO_display() · models.CharField(..., choices=...)',map:'render_FOO_label() · object_models.Character_unitField(..., picks=...)'};
  let M='orig';
  window.SCHRO_CS={steps:{orig:V.orig.length,map:V.map.length},tot:TOT,entries:T.length,names:{orig:T.map((_,i)=>name(i,'orig')),map:T.map((_,i)=>name(i,'map'))}};
  const top=i=>{const t=T[i];if(t[2]==='d'){const b=t[3];return [(b[0]+b[1])/2,.02,(b[2]+b[3])/2]}return [t[3],.01+BS[1],t[4]]};
  const AG=[.6,0,2.3],XB=5.6,ZB=-1.7,HB=1.7;
  function draw(R,k,e){const P=R.P,v=V[M],now=new Set(v[k]),seen=new Set();v.slice(0,k).forEach(s=>s.forEach(i=>seen.add(i)));const last=k===v.length-1;
    R.grid(-5,6.6,-3,3.2,.5);
    // directories as plinths, files as blocks; lit now: orange, read before: a light tint
    T.forEach((t,i)=>{const on=now.has(i),was=seen.has(i);
      if(t[2]==='d'){const b=t[3],y=.004+t[4]*.004;
        // a directory is a floor patch drawn under everything, nested patches in order of depth
        R.quad([[b[0],y,b[2]],[b[1],y,b[2]],[b[1],y,b[3]],[b[0],y,b[3]]],{fill:on?mix(P.paper,P.c2,.12+.2*e):was?mix(P.paper,P.c2,.1):mix(P.paper,P.ink,.04+.025*t[4]),dz:60-t[4],lw:.8});
        const lab=name(i,M);
        // where each directory's label sits: top level at its front-left corner, models/ at its back-right, the others at their front-left; db/ is named by models/
        const at=DL[t[0]];if(at&&(t[4]===0||on))R.label([at[0],y,at[1]],lab,{al:at[2],mono:true,fs:12,dy:at[3],c:on?P.c2:P.mute,b:on,a:on?Math.max(.4,e):.8,wide:t[4]>0?1:0})}
      else{const y=.01,f=on?mix(P.paper,P.c2,.25+.45*e):was?mix(P.paper,P.c2,.18):P.paper;
        R.box([t[3],y,t[4]],BS,{fill:f,lw:.8});
        if(on)R.glow([t[3],y+BS[1]+.05,t[4]],.45,{c:P.c2,a:.35*e});
        const fr=t[4]>-1;if(on||(i===8))R.label(fr?[t[3],y,t[4]+BS[2]/2]:[t[3],y+BS[1],t[4]],name(i,M),{mono:true,fs:12,dy:fr?13:-11,b:on,c:on?P.ink:P.mute,a:on?Math.max(.35,e):.75,grp:on?'f':undefined})}});
    // (front-row files are labelled in front of their blocks, back-row ones above, so the two rows' names do not meet)
    // the agent and its reads: dots flow from each entry lit at this step back to the agent
    R.box(AG,[1.0,.48,.55],{fill:mix(P.paper,P.c1,.3)});R.label([AG[0],.48,AG[2]],M==='orig'?'agent · familiar view':'agent · renamed view',{fs:12.5,b:1,c:P.c1,dy:-11});
    if(k===0)R.label([AG[0],0,AG[2]],ISS[M],{mono:true,fs:12,dy:16,c:P.mute,a:e});
    v[k].forEach(i=>{const p=top(i);R.flowArc([p[0],p[1]+.05,p[2]],[AG[0],.5,AG[2]-.25],.55+.04*Math.abs(p[0]-AG[0]),{c:last?P.c5:P.k,r:.06,n:7,speed:1.3,a:e*.9})});
    // the patch goes back into the field file at the last step
    if(last){const p=top(8);R.flowArc([AG[0]-.2,.5,AG[2]-.25],[p[0],p[1]+.05,p[2]],.7,{c:P.c5,r:.075,n:9,speed:1.3,a:e})}
    // the paper's action totals, to scale: this view's bar grows at the last step, the other view's stands beside it, faint
    const sc=HB/217,o=M==='orig'?'map':'orig',xs={orig:XB-.35,map:XB+.35};
    R.quad([[XB-.7,.004,ZB-.4],[XB+.7,.004,ZB-.4],[XB+.7,.004,ZB+.4],[XB-.7,.004,ZB+.4]],{fill:mix(P.paper,P.ink,.06),dz:60});
    [M,o].forEach(m=>{const mine=m===M,h=Math.max(.02,TOT[m]*sc*(mine?(last?e:0):1)),a=mine?1:(last?.35:.18);
      R.box([xs[m],.01,ZB],[.5,h,.5],{fill:m==='orig'?mix(P.paper,P.c3,.6):mix(P.paper,P.c2,.6),a});
      if(mine?last:true)R.label([xs[m],.01+h,ZB],TOT[m]+'',{mono:true,fs:12.5,b:mine,dy:-10,a:mine?e:.6,c:mine?P.ink:P.mute})});
    R.label([XB,0,ZB+.4],'actions in the run',{fs:12,c:P.mute,dy:14,wide:1})}
  const full={cam:[.2,.78],bounds:[[-4.4,0,-2.5],[6.5,.8,2.7]]};
  const st=S3.stage({id:'stg-cs',list:'sx-cs-orig',fig:'§V-E · the same bug, two views of the repository',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1400,hold:4600,draw,
    margin:w=>w<520?[14,10,14,10]:[22,14,14,14]});
  const seg=document.getElementById('csM');
  if(seg&&st)seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{const m=b.dataset.m;if(m===M&&b.classList.contains('on'))return;M=m;
    seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    document.getElementById('sx-cs-orig').hidden=m!=='orig';document.getElementById('sx-cs-map').hidden=m!=='map';st.list('sx-cs-'+m)}));
})();
