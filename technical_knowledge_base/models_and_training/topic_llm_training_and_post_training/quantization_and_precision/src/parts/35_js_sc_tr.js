// ---- Scene (training in low precision, Fig. 10): one linear layer's three matmuls per training step, the format of each input under five recipes (renderer v2) ----
// Each matmul's two inputs stand as glass plates tinted by bit width (16-bit blue, 8-bit orange, 4-bit green); a plate's grid is its scaling
// (one cell: no scale or one per tensor; strips: 1 x 128 tiles or 1 x 16 blocks; squares: 128 x 128 or 16 x 16 blocks; the cell counts are illustrative, the sizes are in the labels).
// Dots stream from both inputs into the sum, which accumulates in higher precision, and on to the output; the last step sends dW to the optimiser
// state in fp32 and a fresh low-precision copy of W back to the two matmuls that read it. Recipes as in the captions beside it (each sourced there).
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-tr')||!window.S3)return;const {at,lerp,mix}=S3;
  // per recipe: the six matmul inputs [name, format, bits, grid: 0 none or per tensor, 1 strips, 2 blocks, 3 fine strips, 4 fine blocks], the sum, the optimiser state
  const RC={
    fp16:{rows:[['X','fp16',16,0],['W','fp16 copy',16,0],['dY','fp16, loss × S',16,0],['W','fp16 copy',16,0],['dY','fp16, loss × S',16,0],['X','fp16',16,0]],acc:'fp32',state:['master W · fp32','Adam m · fp32','Adam v · fp32']},
    bf16:{rows:[['X','bf16',16,0],['W','bf16 copy',16,0],['dY','bf16',16,0],['W','bf16 copy',16,0],['dY','bf16',16,0],['X','bf16',16,0]],acc:'fp32',state:['master W · fp32','Adam m · fp32','Adam v · fp32']},
    te:{rows:[['X','E4M3, per tensor',8,0],['W','E4M3, per tensor',8,0],['dY','E5M2, per tensor',8,0],['W','E4M3, per tensor',8,0],['dY','E5M2, per tensor',8,0],['X','E4M3, per tensor',8,0]],acc:'higher precision',state:['master W · higher precision']},
    ds:{rows:[['X','E4M3, 1×128 tiles',8,1],['W','E4M3, 128×128',8,2],['dY','E4M3, fine-grained',8,1],['W','E4M3, 128×128',8,2],['dY','E4M3, fine-grained',8,1],['X','E4M3, fine-grained',8,1]],acc:'fp32 every 128',state:['master W · higher precision']},
    nv:{rows:[['X','NVFP4, per 16',4,3],['W','NVFP4, 16×16',4,4],['dY','NVFP4, stoch. round',4,3],['W','NVFP4, 16×16',4,4],['dY','NVFP4 + Hadamard',4,3],['X','NVFP4 + Hadamard',4,3]],acc:'higher precision',state:['master W · higher precision']}};
  const G=[['Forward','Y = X · Wᵀ','Y','to the next layer'],['Data gradient','dX = dY · W','dX','to the layer below'],['Weight gradient','dW = dYᵀ · X','dW','to the optimiser']];
  const GX=[-3.7,0,3.7],PW=1.15,PH=1.2,PY=.35,ZI=0,ZS=1.35,ZO=2.35,OX=6.6;
  let rec='bf16';
  const famC=(P,b)=>b===16?P.c1:b===8?P.c2:b===4?P.c3:P.mute;
  const grid=g=>g===0?[1,1]:g===1?[2,5]:g===2?[3,3]:g===3?[6,8]:[7,7];
  function draw(R,k,e,st){
    // labels wait for the camera: while it glides to another view they stay hidden, then fade in (so none points at a place it has left)
    const vk=k=>k<3?k:3,LA=st&&st.pk!==k&&vk(st.pk)!==vk(k)?Math.max(0,(e-.55)/.45):1,lab=(p,t,o)=>R.label(p,t,{...o,a:(o&&o.a!=null?o.a:1)*LA});const P=R.P,r=RC[rec];R.grid(-5.6,8.4,-1.4,3.6,.5);
    G.forEach((gp,i)=>{const x=GX[i],lit=k===3?.55:k===i?1:.18,la=k===3?0:k===i?1:0;
      // the two inputs, upright glass plates
      [0,1].forEach(s=>{const [nm,fm,b,gr]=r.rows[2*i+s],px=x+(s?.72:-.72),[nu,nv]=grid(gr),c=famC(P,b);
        R.glass([px-PW/2,PY,ZI],[PW,0,0],[0,PH,0],{c,a:lit,nu,nv,th:.04});[-1,1].forEach(sx=>R.box([px+sx*(PW/2-.06),0,ZI+.02],[.04,PY,.04],{a:lit*.8}));
        lab([px,PY+PH,ZI],nm,{serif:true,fs:15,b:1,c,dy:-32,a:k===i?1:0});
        lab([px+(s?-1:1)*PW/2,PY+PH,ZI],fm,{mono:true,fs:12,al:s?'left':'right',c:mix(P.ink,c,.45),dy:-12,a:la,wide:1})});
      // the sum, accumulating in higher precision, then the output lying in front
      R.box([x,0,ZS],[1.3,.32,.5],{fill:mix(P.paper,P.mute,.18),a:lit});lab([x+.66,.16,ZS+.25],'sum · '+r.acc,{mono:true,fs:12,al:'left',dx:8,a:la});
      R.glass([x-.55,.02,ZO-.35],[1.1,0,0],[0,0,.7],{c:i===2?P.c4:P.c1,a:lit,nu:1,nv:1,th:.02});
      lab([x,0,ZO+.35],gp[2]+' · '+gp[3],{mono:true,fs:12,dy:16,a:la,c:i===2?P.c4:P.ink});
      lab([x,PY+PH+(k===3?0:.75),ZI],k===3?gp[0]:gp[0]+' · '+gp[1],{mono:true,fs:12.5,b:1,c:k===i?P.acc:P.ink,dy:-14,a:k===3||k===i?1:0});
      // dots: both inputs into the sum, the sum to the output
      if(k===i){const a=Math.min(1,e*1.6);[0,1].forEach(s=>{const [, ,b]=r.rows[2*i+s];R.flowArc([x+(s?.72:-.72),PY+.2,ZI+.1],[x+(s?.25:-.25),.33,ZS-.2],.3,{c:famC(P,b),a,r:.055,n:7,speed:1.1})});
        R.flow([[x,.2,ZS+.25],[x,.1,ZO-.3]],{c:i===2?P.c4:P.c1,a,r:.06,n:4})}});
    // the update: dW to the optimiser state (high precision), a new low-precision copy of W back to the two matmuls that read it
    const oa=k===3?Math.min(1,e*1.6):.12;
    r.state.forEach((nm,j)=>{R.box([OX,j*.42,ZS-.2],[1.5,.36,1],{fill:mix(P.paper,P.mute,.3),a:Math.max(.12,oa)});lab([OX+.78,j*.42+.18,ZS-.2],nm,{mono:true,fs:12,al:'left',dx:6,a:k===3?oa:0,grp:'st'})});
    if(k===3){R.flowArc([GX[2],.1,ZO],[OX,.3,ZS+.3],.8,{c:P.c4,a:oa,r:.06,n:10,speed:1.2});
      const wb=r.rows[1][2];[0,1].forEach(i=>R.flowArc([OX,r.state.length*.42+.05,ZS-.2],[GX[i]+.72,PY+PH+.05,ZI],1.4,{c:famC(P,wb),a:oa,r:.055,n:12,speed:1.3}));
      lab([OX,r.state.length*.42+.1,ZS-.2],'optimiser',{mono:true,fs:12.5,b:1,dy:-12,c:P.ink,a:oa});
      lab([GX[0]+1.8,PY+PH+1.9,ZI],'new '+r.rows[1][1].replace(' copy','')+' copy of W',{mono:true,fs:12,c:mix(P.ink,famC(P,wb),.5),a:oa})}}
  const full={cam:[.08,.4],bounds:[[-5,0,-.3],[9.7,2.4,2.8]]},close=i=>({cam:[.2,.42],bounds:[[GX[i]-1.9,0,-.3],[GX[i]+1.9,2.4,2.9]]});
  const st=S3.stage({id:'stg-tr',list:'sx-tr',fig:'Fig. 10 · one linear layer, three matmuls, one recipe',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:5200,draw,
    margin:w=>w<520?[16,10,12,10]:[20,26,14,26],view:k=>k<3?close(k):full});
  (window.QSTG=window.QSTG||{})['stg-tr']=st;
  const M=$('rd-trM');
  function show(){M.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m===rec));document.querySelectorAll('#rd-trC .rd-trx').forEach(d=>{d.hidden=d.dataset.k!==rec})}
  M.addEventListener('click',ev=>{const b=ev.target.closest('button[data-m]');if(!b)return;rec=b.dataset.m;show();st.st.user=true;st.pause();st.draw()});
  show();
})();
