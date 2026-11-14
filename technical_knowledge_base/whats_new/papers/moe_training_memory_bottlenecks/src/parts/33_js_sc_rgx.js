// ---- Scene (Vocabulary projection): Ring-DTP on real numbers, P = 4 ranks on a ring, 2 tokens each, H = 3, V = 12 (Algorithm 2; renderer v2) ----
// The numbers are real: seeded random activations X_j (2 x 3 per rank), a 3 x 12 projection W cut into four 3 x 3 shards, random targets.
// Each rank is a board: its batch as two signed bar rows (blue), the shard it holds as a glass plate (purple), the strip X_j W_q it forms this
// round as signed bars (orange), and each token's running state (m, z, y_t) as two green chips; the green ball marks the target's logit when
// its shard passes. Hops travel along the ring arcs. Three step lists: move weights, move activations, dense logits.
// window.__ringCheck() returns the largest loss difference against the dense log-softmax for each ring schedule.
(function(){
if(!document.getElementById('stg-rgx'))return;const {at,lerp,mix}=S3;
const P=4,N=2,Hh=3,V=12,VP=V/P,rnd=mulberry32(20260913),gs=()=>(rnd()+rnd()+rnd()-1.5)*1.6;
const X=Array.from({length:P},()=>Array.from({length:N},()=>Array.from({length:Hh},gs)));
const W=Array.from({length:Hh},()=>Array.from({length:V},gs));
const T=Array.from({length:P},()=>Array.from({length:N},()=>Math.floor(rnd()*V)));
const strip=(j,q)=>X[j].map(x=>Array.from({length:VP},(_,c)=>x.reduce((a,v,h)=>a+v*W[h][q*VP+c],0)));
const dense=j=>X[j].map(x=>Array.from({length:V},(_,c)=>x.reduce((a,v,h)=>a+v*W[h][c],0)));
const denseNLL=j=>dense(j).map((y,n)=>{const m=Math.max(...y);return m+Math.log(y.reduce((a,v)=>a+Math.exp(v-m),0))-y[T[j][n]]});
function fold(S,Y,j,q){return S.map((s,n)=>{const m2=Math.max(s.m,...Y[n]),z=(s.m===-Infinity?0:Math.exp(s.m-m2)*s.z)+Y[n].reduce((a,v)=>a+Math.exp(v-m2),0);
  const t=T[j][n],y=(t>=q*VP&&t<(q+1)*VP)?Y[n][t-q*VP]:s.y;return {m:m2,z,y}})}
const S0=()=>Array.from({length:N},()=>({m:-Infinity,z:0,y:null}));
// precompute every round: who holds what, the strip, the states
function rounds(mode){const R=[];let st=Array.from({length:P},S0);
  for(let i=0;i<P;i++){const rows=[];for(let r=0;r<P;r++){const j=mode==='wts'?r:(r-i+P)%P,q=mode==='wts'?(r-i+P)%P:r,Y=strip(j,q);st[j]=fold(st[j],Y,j,q);rows.push({r,j,q,Y,S:st[j].map(o=>({...o}))})}R.push(rows)}
  return {R,final:st}}
const RW=rounds('wts'),RA=rounds('act');
const nllOf=st=>st.map(S=>S.map(s=>s.m+Math.log(s.z)-s.y));
const DN=Array.from({length:P},(_,j)=>denseNLL(j));
const maxDiff=st=>Math.max(...nllOf(st).flat().map((v,i)=>Math.abs(v-DN.flat()[i])));
window.__ringCheck=()=>({wts:maxDiff(RW.final),act:maxDiff(RA.final)});
const NSTEP={wts:P+1,act:P+1,dense:3};
// where each rank sits on the ring (0 front left, then clockwise seen from above: front right, back right, back left)
const POS=[[-1.55,0,1.15],[1.55,0,1.15],[1.55,0,-1.15],[-1.55,0,-1.15]];
const SUB='₀₁₂₃';
const mX=Math.max(...X.flat(2).map(Math.abs)),mY=Math.max(...Array.from({length:P},(_,j)=>dense(j)).flat(2).map(Math.abs));
// a vector as signed bars on a white plinth (positive up, negative hanging below)
function comb(R,c,vals,m,col,a,hmax,wd){if(a<=.01)return;const nb=vals.length,bw=wd/nb;
  R.box([c[0],c[1]-.03,c[2]],[wd+.08,.03,.16],{a,shadow:false,lw:.6});
  vals.forEach((v,i)=>{const h=Math.max(.012,Math.abs(v)/m*hmax),bx=c[0]-wd/2+bw*(i+.5);R.box([bx,v>=0?c[1]:c[1]-.03-h,c[2]],[bw*.7,h,.1],{fill:mix(R.P.paper,col,.75),a,shadow:false,lw:.5})})}
// what each rank holds at round i (0-based; i = P is the end): batch j and shard q
function hold(mode,i,r){if(mode==='dense')return {j:r,q:-1};const ii=Math.min(i,P-1);return mode==='wts'?{j:r,q:(r-ii+P)%P}:{j:(r-ii+P)%P,q:r}}
const arcH=.45,lift=.32;
function draw(R,k,e){const PL=R.P,mode=cur;let LA=1;R.grid(-3.2,3.2,-2.4,2.4,.5);
  // the ring: faint arcs from each rank to the next
  for(let r=0;r<P;r++){const a=POS[r],b=POS[(r+1)%P];R.arc([a[0],.1,a[2]],[b[0],.1,b[2]],arcH*.6,{c:PL.mute,w:1.2,a:mode==='dense'?.12:.35,dash:[4,4]})}
  const RR=mode==='wts'?RW:mode==='act'?RA:null;
  // a hop is under way in the first half of steps 2 to 4 (and the return hop of the activation schedule, step 5); the strip forms in the second half
  const hop=mode!=='dense'&&k>=1&&(k<P||(mode==='act'&&k===P)),hp=hop?Math.min(1,e*2):1,sp=k===0?e:hop?Math.max(0,e*2-1):1;
  const BX=-.62,PX=.05,SX=.68;
  // pieces: the shard plate, the batch (two tokens of three numbers), the state chips (two green blocks, taller once the target's logit is in)
  const plate=(x,z,lab)=>{R.glass([x-.27,.1,z],[.54,0,0],[0,.54,0],{c:PL.c4,a:1,nu:3,nv:3});R.label([x,.66,z],lab,{fs:12.5,b:1,c:PL.c4,dy:-6,al:'center',a:LA})};
  const batch=(x,y,z,j,a)=>{for(let n=0;n<N;n++)comb(R,[x,y,z+(n-.5)*.36],X[j][n],mX,PL.c1,a,.4,.42);R.label([x,y+.3,z],'X'+SUB[j],{fs:12.5,b:1,c:PL.c1,dy:-8,al:'center',a:a*LA})};
  const chips=(x,y,z,st)=>{for(let n=0;n<N;n++){const got=st&&st[n]&&st[n].y!=null;R.box([x+(n-.5)*.22,y,z],[.16,got?.16:.08,.16],{fill:mix(PL.paper,PL.c3,got?.85:.4),shadow:false,lw:.6})}};
  const along=(from,to,u)=>R.arcPt(from,to,arcH,u);
  for(let r=0;r<P;r++){const c=POS[r],h=hold(mode,k,r),pr=POS[(r-1+P)%P],ZC=c[2]-.05,ZS=c[2]+.55;
    // round 1 is a close-up on rank 0: the other ranks' labels stay hidden (they would sit clipped at the card's edges) and fade in as the camera pulls out
    LA=r===0||mode==='dense'?1:k===0?0:k===1?Math.min(1,e*2):1;
    R.box([c[0],0,c[2]],[2.1,.06,1.5],{fill:PL.paper,dz:30});
    R.label([c[0]-1.0,0,c[2]+.75],'rank '+r,{fs:12.5,b:1,dy:13,al:'left',a:LA});
    const st=stateOf(mode,k,r);
    if(mode==='wts'){
      batch(c[0]+BX,.32,ZC,r,1);chips(c[0]+SX,.06,ZS,st);
      // the shard arrives from the previous rank along the ring
      if(hop){const from=[pr[0]+PX,.1,pr[2]-.05],to=[c[0]+PX,.1,ZC],p=along(from,to,hp);plate(p[0],p[2],'W'+SUB[h.q]);
        R.flowArc([from[0],.4,from[2]],[to[0],.4,to[2]],arcH,{c:PL.c4,r:.06,n:7,speed:1.6,a:1-hp*.6})}
      else plate(c[0]+PX,ZC,'W'+SUB[h.q])}
    else if(mode==='act'){
      plate(c[0]+PX,ZC,'W'+SUB[r]);
      const bf=[pr[0]+BX,.32,pr[2]-.05],bt=[c[0]+BX,.32,ZC],cf=[pr[0]+SX,.06,pr[2]+.55],ct=[c[0]+SX,.06,ZS];
      if(hop&&k<P){const p=along(bf,bt,hp),q=along(cf,ct,hp);batch(p[0],p[1],p[2],h.j,1);chips(q[0],q[1],q[2],st);
        R.flowArc(bf,bt,arcH,{c:PL.c1,r:.06,n:7,speed:1.6,a:1-hp*.6})}
      else if(hop){const q=along(cf,ct,hp);batch(c[0]+BX,.32,ZC,h.j,1);chips(q[0],q[1],q[2],st);R.flowArc(cf,ct,arcH,{c:PL.c3,r:.06,n:7,speed:1.6,a:1-hp*.6})}
      else{batch(c[0]+BX,.32,ZC,h.j,1);chips(c[0]+SX,.06,ZS,st)}}
    else{R.glass([c[0]-.95,.1,c[2]-.58],[1.9,0,0],[0,.5,0],{c:PL.c4,a:.85,nu:12,nv:3});R.label([c[0],.62,c[2]-.58],'all of W',{fs:12.5,b:1,c:PL.c4,dy:-6,al:'center'});
      batch(c[0]-.72,.32,c[2]+.2,r,1);chips(c[0]+.8,.06,c[2]+.6,st)}
    // the strip this round: signed bars, freed when the next hop starts
    let Y=null,q=0,j=r;
    if(mode==='dense'){if(k>=1)Y=dense(r)}
    else if(k<P){const row=RR.R[k][r];Y=row.Y;q=row.q;j=row.j}
    const ya=mode==='dense'?(k===1?e:k>1?.6:0):k<P?sp:0;
    if(Y&&ya>.01){const wide=mode==='dense',sx=wide?c[0]+.37:c[0]+SX,zz=wide?c[2]+.2:ZC,wd=wide?1.15:.46,dz=wide?.36:.36;
      for(let n=0;n<N;n++){const zn=zz+(n-.5)*dz;comb(R,[sx,.3,zn],Y[n],mY,PL.c2,ya,.45,wd);
        // the target's logit, when it is in this strip
        const t=T[j][n],lo=wide?0:q*VP,hi=wide?V:(q+1)*VP;if(t>=lo&&t<hi&&ya>.5){const bw=wd/(hi-lo),bx=sx-wd/2+bw*(t-lo+.5),v=Y[n][t-lo],top=v>=0?.3+Math.abs(v)/mY*.45:.3;
          R.ball([bx,top+.08,zn],.05,{c:PL.c3,a:ya});R.glow([bx,top+.08,zn],.16,{c:PL.c3,a:ya*.7})}}
      // the strip folds into the state chips
      if(!wide&&ya>.3)R.flowArc([sx,.36,zz],[c[0]+SX,.15,ZS],.15,{c:PL.c3,r:.04,n:4,speed:1.2,a:ya*.8})}
  }
  if(k===NSTEP[mode]-1)R.label([0,.2,0],mode==='dense'?'the reference losses':'loss = m + log z − yₜ · max difference from dense '+maxDiffMode(mode).toExponential(1),{fs:12.5,b:1,al:'center',a:e,wide:1});
}
// the state of the batch that lives at rank r at step k (at the end of that round)
function stateOf(mode,k,r){if(mode==='dense'){if(k<1)return null;return dense(r).map((y,n)=>{const mx=Math.max(...y);return {m:mx,z:y.reduce((a,v)=>a+Math.exp(v-mx),0),y:y[T[r][n]]}})}
  const RR=mode==='wts'?RW:RA;if(k>=P)return RR.final[r];return RR.R[k][r].S}
const maxDiffMode=mode=>mode==='wts'?maxDiff(RW.final):mode==='act'?maxDiff(RA.final):0;
// the per-batch state table and the counters
function table(mode,k){const f2=v=>v===null||v===undefined||v===-Infinity?'·':Math.abs(v)>=10?v.toFixed(2):v.toFixed(3);let h='<tr><th>Batch</th><th>Token</th><th class="num">m</th><th class="num">z</th><th class="num">yₜ</th><th class="num">loss</th><th class="num">dense</th></tr>';
  const RR=mode==='wts'?RW:mode==='act'?RA:null,done=k===NSTEP[mode]-1;
  for(let j=0;j<P;j++){let st;
    if(mode==='dense')st=k>=1?stateOf('dense',k,j):null;else if(k>=P)st=RR.final[j];else{const row=RR.R[k].find(x=>x.j===j);st=row.S}
    for(let n=0;n<N;n++){const s=st?st[n]:null,ok=s&&s.y!=null&&s.m!==-Infinity,loss=ok&&done?s.m+Math.log(s.z)-s.y:null;
      h+='<tr><td>X'+SUB[j]+'</td><td>'+(n+1)+'</td><td class="num">'+f2(s?s.m:null)+'</td><td class="num">'+f2(s&&s.m!==-Infinity?s.z:null)+'</td><td class="num">'+f2(s?s.y:null)+'</td><td class="num">'+(loss==null?'·':loss.toFixed(6))+'</td><td class="num">'+(done?DN[j][n].toFixed(6):'·')+'</td></tr>'}}
  document.getElementById('rgxS').innerHTML=h}
function counters(mode,k){const live=mode==='dense'?N*V:N*VP,hop=mode==='wts'?Hh*VP:mode==='act'?N*Hh+4*N:0,done=k===NSTEP[mode]-1;
  const fin=done?(mode==='dense'?'the reference':'max diff '+maxDiffMode(mode).toExponential(1)):'';
  document.getElementById('rgxCnt').innerHTML=stat('Live logits per rank',live+' numbers',mode==='dense'?'N × V':'one strip, N × V/P')+stat('Sent per hop',hop?hop+' numbers':'no hops',mode==='wts'?'a 3 × 3 weight shard (H × V/P)':mode==='act'?'a 2 × 3 batch, its 2 targets and 3 numbers of state per token':'every rank holds the whole weight')+stat('Loss against dense log-softmax',fin||'not finished',fin?'all 8 tokens':'');
  table(mode,k)}
let cur='wts';
const full={cam:[.3,.78],bounds:[[-2.7,0,-1.95],[2.7,.8,2.0]]};
const stg=S3.stage({id:'stg-rgx',list:'sx-rgx-wts',fig:'Ring-DTP · four ranks on a ring · real numbers',cam:full.cam,bounds:full.bounds,aspect:.55,dur:2200,hold:4800,draw,
  // round 1 moves in close on rank 0 while its first strip forms
  view:k=>k===0&&cur!=='dense'?{cam:[.25,.6],bounds:[[-2.95,0,.05],[-.15,.9,2.15]]}:full,
  margin:w=>w<520?[18,8,14,8]:[20,16,16,16],onStep:k=>{try{counters(cur,k)}catch(e){}}});
window.MM_RGX={stage:stg,get mode(){return cur}};
const seg=document.getElementById('rgxM');
seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
  cur=b.dataset.m;['wts','act','dense'].forEach(m=>document.getElementById('sx-rgx-'+m).hidden=m!==cur);stg.list('sx-rgx-'+cur)}));
counters(cur,0);
})();
