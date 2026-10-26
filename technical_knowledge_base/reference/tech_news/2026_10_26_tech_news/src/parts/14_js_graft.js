// ---- GRAFT: a reward penalty on flagged rollouts against routing flagged updates into a deletable adapter ----
(function(){
  const card=$('v-graft');if(!card)return;
  $('grAnim').innerHTML=animCtl('gr',[['pen','Reward penalty'],['graft','GRAFT']]);
  const PEN=[{t:'The monitor flags a hack',c:'A rollout uses hack 1, the only kind the monitor recognises, and is flagged. Hacks 2 and 3 pass unflagged.'},
    {t:'The flag lowers the reward',c:'The usual fix: a flagged rollout gets a lower reward, and the update goes into the same weights as every other rollout. The policy is now rewarded for not being caught, which is not the same as not cheating.'},
    {t:'The model learns the hack the monitor misses',c:'Hack 1 fades, and an undetected hack takes its place on <b>about 30%</b> of trajectories. The monitor reports almost nothing; in the paper\'s words a practitioner "might incorrectly conclude that this policy is hack-free".'},
    {t:'Deploy',c:'What ships still hacks on about 30% of trajectories, all of it in a form the monitor cannot see. The penalty made the monitor an optimisation target.'}];
  const GR=[{t:'The monitor flags a hack',c:'Same rollout, same monitor, same flag on hack 1.'},
    {t:'The flag decides where the gradient goes',c:'GRAFT adds small extra neurons to every MLP, split into a RETAIN and a FORGET adapter. A flagged rollout updates <b>only FORGET</b>; unflagged rollouts update both. The reward is untouched, so nothing pays the model for evading the monitor.'},
    {t:'Hacking collects in FORGET',c:'During training the model with FORGET switched on still hacks, on up to <b>35%</b> of trajectories, but what it learned from flagged rollouts sits in FORGET, and deleting FORGET also removes the hacks the monitor never flagged (next step).'},
    {t:'Delete FORGET, then deploy',c:'Ablating FORGET leaves hacking of every type <b>near zero</b>, and the clean solve rate stays nearly <b>20 points</b> above the base model. Limits: heuristic monitors, single-turn tasks, models up to 8B.'}];
  const MODES={pen:{name:'Reward penalty',steps:PEN},graft:{name:'GRAFT',steps:GR}};
  const cl=v=>Math.max(0,Math.min(1,v));
  function draw(st){
    const box=$('grSvg'),W=Math.max(300,Math.round(box.clientWidth||340)),narrow=W<560,g=st.m==='graft';
    const fs=narrow?11:12,H=narrow?318:268;
    const op=k=>k<st.k?1:(k===st.k?cl(st.t*1.6):0);
    let s='';
    // column positions
    const c1=narrow?6:10,bw=narrow?(W-24)/3:(W-60)/3.4,c2=c1+bw+(narrow?6:20),c3=c2+bw+(narrow?6:20);
    const y1=narrow?20:24,bh=narrow?58:52;
    s+=bx(c1,y1,bw,bh,'bxa',['Rollout',narrow?'hack 1, 2, 3':'hack 1, 2 or 3'],fs);
    s+=bx(c2,y1,bw,bh,'bxa',['Monitor',narrow?'sees hack 1':'sees hack 1 only'],fs);
    s+=ar(c1+bw,y1+bh/2,c2,y1+bh/2);
    // step 0: flag
    s+='<g opacity="'+op(0)+'"><text x="'+(c2+bw/2)+'" y="'+(y1+bh+16)+'" font-size="'+fs+'" text-anchor="middle" fill="var(--bad)">flag: hack 1</text></g>';
    // weights boxes
    const y2=y1+bh+(narrow?44:40),wh=narrow?58:52;
    if(!g){
      s+=bx(c3,y1,bw,bh,'bxa',['Reward',narrow?'lowered':'lowered if flagged'],fs).replace('<rect','<rect opacity="'+op(1)+'"');
      s+='<g opacity="'+op(1)+'">'+ar(c2+bw,y1+bh/2,c3,y1+bh/2)+'</g>';
      s+=bx(c2,y2,bw,wh,'bxa',['Policy weights','one set'],fs);
      s+='<g opacity="'+op(1)+'">'+ar(c3+bw/2,y1+bh,c2+bw*0.75,y2,true)+'</g>';
    }else{
      s+=bx(c2-(narrow?0:bw*0.35),y2,bw,wh,'bxa',[narrow?'RETAIN':'RETAIN + base',narrow?'unflagged':'unflagged updates'],fs);
      const fx=c3,del=st.k===3?cl(st.t*1.6):0;
      s+='<g opacity="'+(op(1)*(1-0.75*del))+'">'+bx(fx,y2,bw,wh,'bxb',[narrow?'FORGET':'FORGET adapter',narrow?'flagged only':'flagged updates only'],fs)+ar(c2+bw,y1+bh*0.75,fx+bw*0.3,y2)+'</g>';
      if(del>0)s+='<g opacity="'+del+'"><line x1="'+fx+'" y1="'+y2+'" x2="'+(fx+bw)+'" y2="'+(y2+wh)+'" stroke="var(--bad)" stroke-width="2"/><line x1="'+(fx+bw)+'" y1="'+y2+'" x2="'+fx+'" y2="'+(y2+wh)+'" stroke="var(--bad)" stroke-width="2"/><text x="'+(fx+bw/2)+'" y="'+(y2+wh+15)+'" font-size="'+fs+'" text-anchor="middle" fill="var(--bad)">deleted</text></g>';
    }
    // outcome strip
    const y3=H-(narrow?80:74),lw=narrow?110:150,X0=c1+lw,X1=W-(narrow?44:60);
    const X=v=>X0+(X1-X0)*v/40;
    s+='<text x="'+c1+'" y="'+(y3-8)+'" font-size="'+fs+'" fill="var(--mute)">share of trajectories that hack (paper\'s figures)</text>';
    [0,10,20,30,40].forEach(v=>{s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+y3+'" y2="'+(y3+26)+'" stroke="var(--line)"/><text x="'+X(v)+'" y="'+(y3+40)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+v+'%</text>'});
    const e=cl(st.t*1.3);let val=null,lab='',col='var(--closed)';
    if(!g){if(st.k===2){val=30*e;lab='undetected hack: about 30%'}if(st.k===3){val=30;lab='deployed: about 30%, undetected'}}
    else{if(st.k===2){val=35*e;lab='FORGET on: up to 35%';col='var(--dim)'}if(st.k===3){val=35-34.4*e;lab=e<1?'deleting FORGET':'FORGET deleted: near zero';col=e<1?'var(--dim)':'var(--open)'}}
    s+='<text x="'+(X0-6)+'" y="'+(y3+17)+'" font-size="'+fs+'" text-anchor="end">'+(g?'GRAFT':'Penalty')+'</text>';
    if(val!=null){const xe=X(val);
      s+='<rect x="'+X0+'" y="'+(y3+5)+'" width="'+Math.max(2,xe-X0)+'" height="16" rx="3" fill="'+col+'"/>';
      s+='<text x="'+X0+'" y="'+(y3+58)+'" font-size="'+(narrow?11:12)+'" font-weight="600">'+lab+'</text>'}
    else s+='<text x="'+X0+'" y="'+(y3+58)+'" font-size="11" fill="var(--mute)">not measured at this step</text>';
    box.innerHTML=svgEl(W,H,s,'Where a flagged update goes: '+(g?'GRAFT':'reward penalty'));
    $('grCnt').innerHTML=g?stat('Reward changed by the flag','No','the flag picks the parameters')+stat('After deleting FORGET','near zero','hacking of all three types')+stat('Clean solve rate','about +20 points','against the base model'):
      stat('Reward changed by the flag','Yes','flagged rollouts score lower')+stat('Undetected hacking','about 30%','of trajectories')+stat('What the monitor reports','almost nothing','it cannot see hacks 2 and 3');
  }
  makeAnim({card,pre:'gr',modes:MODES,start:'pen',dur:1800,draw});
})();
