// ---- Scene, Fig. 1 (the hero, 2026-11-12): the running example, MaxText, Tunix and Levanter as towers of the same five boxes
// (config on top, then model, sharding, train step, data and checkpoints). Slabs are equal in height; each label gives the lines of that
// part from LC.map.components (runs/lc_map.py), summed by the map's own group; a faint slab is a box with no part of its own in the map.
// The highlighted slabs are what each codebase is built for. Steps are explained by #sx-hero on the left. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.S3||!window.LC)return;const {at,mix}=S3;
  const M=LC.map,G={config:0,model:1,sharding:2,train:3,post:3,data:4,ckpt:4};
  const BOX=['config','model','sharding','train step','data, checkpoints'];
  // lines per box and codebase, from the recorded map (null: no part of its own)
  const lines={};['maxtext','tunix','levanter'].forEach(r=>{lines[r]=[null,null,null,null,null];
    M.components.forEach(c=>{if(c.repo!==r||G[c.group]==null)return;const j=G[c.group];lines[r][j]=(lines[r][j]||0)+c.lines})});
  const fmt=n=>Number(n).toLocaleString('en-GB');
  // the cell texts of the old 2D hero (what each box is in each codebase)
  const T=[
    {name:'running example',tot:'268 lines',hl:[],for_:'learning',ln:[null,null,null,null,null],
      cell:['CFG dict','apply()','none: one device','6 lines, jit, donate','numpy batches'],ghost:[0,0,1,0,0]},
    {name:'MaxText',tot:fmt(M.totals_py.maxtext.lines)+' lines',hl:[0,2],for_:'scale on TPU',ln:lines.maxtext,
      cell:['base.yml + model YAML','Flax NNX, 25 blocks','logical names + 80 rules','pure train_step','grain, HF; Orbax v1']},
    {name:'Tunix',tot:fmt(M.totals_py.tunix.lines)+' lines',hl:[3],for_:'post-training',ln:lines.tunix,
      cell:['dataclasses, cli/ YAML','Flax NNX models/','role_to_mesh in rl/','PeftTrainer, RL learners','Orbax CheckpointManager']},
    {name:'Levanter',tot:fmt(M.totals_py.levanter.lines)+' lines',hl:[2,4],for_:'reproducibility',ln:lines.levanter,
      cell:['draccus dataclasses','Equinox + Haliax','named axes + mapping dict','trainer.py','seekable cache, keys saved']}];
  T.forEach(t=>{if(!t.ghost)t.ghost=t.ln.map(v=>v==null?1:0)});
  const XN=[-7.2,-2.4,2.4,7.2],XF=[-4.2,-1.4,1.4,4.2],X=XN.slice(),SW=2.0,SD=1.5,SH=.46,GAP=.1,yOf=j=>(4-j)*(SH+GAP); // j=0 config on top
  const front=(i,j)=>[X[i]+SW/2,yOf(j)+SH/2,SD/2];
  function tower(R,i,a,k,e){const P=R.P,t=T[i];if(a<=.01)return;
    for(let j=0;j<5;j++){const hl=t.hl.includes(j),gh=t.ghost[j];
      const fill=hl?mix(P.paper,P.acc,.42):gh?mix(P.paper,P.mute,.08):P.paper;
      R.box([X[i],yOf(j),0],[SW,SH,SD],{fill,a:a*(gh?.32:1),fa:gh?.6:1,shadow:j===4})}}
  function slabLabels(R,i,a){const P=R.P,t=T[i];
    for(let j=0;j<5;j++){const hl=t.hl.includes(j),txt=t.cell[j]+(t.ln[j]!=null?' · '+fmt(t.ln[j]):'');
      R.label([X[i]+SW/2,yOf(j)+SH/2,0],txt,{al:'left',dx:10,fs:12.5,b:hl,c:hl?P.acc:t.ghost[j]?P.mute:P.ink,grp:'sl'+i,a})}}
  function boxNames(R,a){const P=R.P;for(let j=0;j<5;j++)R.label([X[0]-SW/2,yOf(j)+SH/2,0],BOX[j],{al:'right',dx:-10,fs:12.5,b:1,c:P.mute,grp:'box',a})}
  function draw(R,k,e){const P=R.P;R.grid(-9.5,10,-2.2,2.2,.5);
    // the towers stand apart while each is read (room for its labels) and close up for the side-by-side view of step 5
    const t5=k===4?e:0;for(let i=0;i<4;i++)X[i]=XN[i]+(XF[i]-XN[i])*t5;
    // which tower a step is about (step 5: all four)
    const foc=k<4?k:-1;
    T.forEach((t,i)=>{const a=foc<0?1:i===foc?1:.16;tower(R,i,a,k,e);
      // names only on the tower being read (all four in step 5)
      const la=foc<0||i===foc?1:0;
      // on a phone the side-by-side view keeps only short names; the step text gives the sizes and what each is built for
      const ph=R.W<520&&foc<0;
      R.label([X[i],yOf(0)+SH,-SD/2],ph&&i===0?'example':t.name,{fs:ph?12:13.5,b:1,dy:ph?-14:-30,c:P.ink,a:la});
      R.label([X[i],yOf(0)+SH,-SD/2],t.tot,{mono:true,fs:12,dy:-14,c:P.mute,a:la,wide:foc<0});
      if(foc<0)R.label([X[i],0,SD/2],'built for '+t.for_,{fs:12.5,b:1,dy:i%2?34:16,c:i===0?P.mute:P.acc,a:e,wide:1})});
    if(foc>=0){slabLabels(R,foc,foc===k?Math.min(1,.25+e):1);if(foc===0)boxNames(R,e)}
    else boxNames(R,1);
    // 2. MaxText: the config feeds every box below it (shapes, sharding, remat are config values read at trace time)
    if(k===1)for(let j=1;j<5;j++){const a0=[X[1]-SW/2+.15,yOf(0)+SH/2,SD/2+.02],b0=[X[1]-SW/2+.15,yOf(j)+SH/2,SD/2+.02];
      R.flowArc(a0,b0,-.28-.06*j,{c:P.acc,r:.06,a:e,n:3+j})}
    // 3. Tunix: the trainer takes a model as it is (it trained the running example's NNX model unchanged, section 7)
    if(k===2)R.flowArc([X[2]-SW/2+.2,yOf(1)+SH/2,SD/2+.02],[X[2]-SW/2+.2,yOf(3)+SH/2,SD/2+.02],-.3,{c:P.acc,r:.06,a:e,n:5});
    // 4. Levanter: the seekable data cache feeds the step
    if(k===3)R.flowArc([X[3]-SW/2+.2,yOf(4)+SH/2,SD/2+.02],[X[3]-SW/2+.2,yOf(3)+SH/2,SD/2+.02],-.25,{c:P.acc,r:.06,a:e,n:4});
    // 5. a real dependency: MaxText's post-training entry points import Tunix's trainers (named in the step text)
    if(k===4){const a0=[X[1]+SW/2,yOf(3)+SH/2,0],b0=[X[2]-SW/2,yOf(3)+SH/2,0];R.flowArc(a0,b0,.7,{c:P.c2,r:.07,a:e,n:6});}
  }
  const full={cam:[.36,.34],bounds:[[-5.4,0,-.8],[5.4,3.0,.8]]};
  const near=i=>({cam:[.42,.36],bounds:[[X[i]-1.6,0,-.8],[X[i]+3.4,2.9,.8]]});
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · five boxes, four codebases (line counts measured)',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1400,hold:5200,draw,
    margin:w=>w<520?[16,10,26,10]:[22,14,30,130],
    view:k=>k<4?near(k):full});
})();
