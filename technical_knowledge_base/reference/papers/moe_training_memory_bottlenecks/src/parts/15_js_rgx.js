// ---- Live 2: Ring-DTP on real numbers, P = 4 ranks, 2 tokens each, H = 3, V = 12 (Algorithm 2) ----
(function(){
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
const modes={
 wts:[0,1,2,3].map(i=>({t:i?'Round '+(i+1)+': the weight shards hop':'Round 1: every rank meets its own shard',c:i?'Each rank sends its current shard to the next rank and receives the previous one (rank r now holds W<sub>'+'(r − '+i+') mod 4</sub>). It forms the 2 × 3 strip X<sub>r</sub>W, folds it into its own tokens\' (m, z, y<sub>t</sub>) and frees it. The batches never move.':'Rank r forms X<sub>r</sub>W<sub>r</sub>, a 2 × 3 strip of logits, folds it into the running state of its two tokens (Eq. 3) and frees it. If a token\'s target word is in this shard, its logit y<sub>t</sub> is recorded.'})).concat([{t:'Done: exact losses, at home',c:'After 4 meetings every batch has met every shard once. Each token\'s loss is m + log z − y<sub>t</sub>, equal to the dense log-softmax to floating-point precision, and no rank ever held more than one 2 × 3 strip. Forward needs no return hop, since the states never left.'}]),
 act:[0,1,2,3].map(i=>({t:i?'Round '+(i+1)+': batches and their states hop':'Round 1: every rank meets its own batch',c:i?'Each rank passes the batch it holds, its targets and its partial state S̃ to the next rank, receives the previous rank\'s, and folds X<sub>j</sub>W<sub>r</sub> with its own fixed shard. Chosen when N ≤ V/P, because a hop then moves N × H numbers instead of H × V/P.':'Rank r forms X<sub>r</sub>W<sub>r</sub> and folds it into the state of its tokens, exactly as in the other schedule.'})).concat([{t:'Return hop, then done',c:'The batches have met every shard, but each state sits one rank away from home, so one more hop sends it back (line 21 of Algorithm 2). The losses equal the dense ones.'}]),
 dense:[{t:'Each rank holds the whole weight',c:'The standard reference keeps the full H × V projection weight on every rank (4 times the shard here; 5.34 GiB against 0.67 GiB at the paper\'s shape with P = 8).'},
   {t:'Form all the logits',c:'Each rank forms its tokens\' full 2 × 12 logit matrix at once; then log-softmax, and in backward its gradient, three tensors of that size (Table 10).'},
   {t:'Done: the same losses',c:'The same numbers as either ring schedule, with four times the live logits at P = 4, or eight times at the paper\'s P = 8.'}]};
const C={wts:'var(--c3)',act:'var(--c1)',dense:'var(--c2)'};
const f2=v=>v===null||v===undefined?'·':Math.abs(v)>=10?v.toFixed(1):v.toFixed(2);
function cellCol(v){const t=Math.max(-1,Math.min(1,v/4));return t>=0?'rgba(194,112,58,'+(.15+.6*t)+')':'rgba(47,111,181,'+(.15-.6*t)+')'}
function box(x,y,bw,bh,r,hold,Y,S,fresh,e,mode){let s=rc(x,y,bw,bh,'var(--soft)',{s:'var(--line)'});
  s+=tx(x+8,y+16,'rank '+r,{fs:12,w:600})+tx(x+62,y+16,'holds '+hold,{fs:11,c:'var(--mute)'});
  const cols=Y?Y[0].length:VP,cw=Math.min(32,(bw-16-104)/cols),ch=20,sx=x+8,sy=y+40;
  for(let n=0;n<N;n++)for(let c=0;c<cols;c++){const v=Y?Y[n][c]:0;s+=rc(sx+c*cw,sy+n*(ch+2),cw-2,ch,Y?cellCol(v):'var(--bg)',{r:2,op:Y?e:1,s:'var(--line)'});
    if(Y&&cw>=27&&e>.6)s+=tx(sx+c*cw+cw/2-1,sy+n*(ch+2)+14,f2(v),{fs:11,a:'middle'})}
  const ox=x+bw-100;s+=tx(ox,sy-4,'m',{fs:11,c:'var(--mute)'})+tx(ox+33,sy-4,'z',{fs:11,c:'var(--mute)'})+tx(ox+66,sy-4,'yₜ',{fs:11,c:'var(--mute)'});
  if(S)S.forEach((o,n)=>{[o.m===-Infinity?null:o.m,o.m===-Infinity?null:o.z,o.y].forEach((v,i)=>{s+=tx(ox+i*33,sy+n*(ch+2)+14,f2(v),{fs:11,w:fresh?600:null})})});
  return s}
function draw(m,k,e,w){const cols=w>=760?4:w>=420?2:1,gap=8,bw=(w-gap*(cols-1))/cols,bh=92;let s='';
  for(let r=0;r<P;r++){const x=(r%cols)*(bw+gap),y=Math.floor(r/cols)*(bh+gap);
    if(m==='dense'){const Y=k>=1?dense(r):null,S=k>=1?dense(r).map((y,n)=>{const mx=Math.max(...y);return {m:mx,z:y.reduce((a,v)=>a+Math.exp(v-mx),0),y:y[T[r][n]]}}):null;
      s+=box(x,y,bw,bh,r,'X'+r+' and all of W',Y,S,k>=1,k===1?e:1,m)}
    else{const RR=m==='wts'?RW:RA,last=k>=P,row=RR.R[Math.min(k,P-1)][r];
      let S=row.S,hold=(m==='wts'?'X'+r:'X'+row.j)+' · W'+row.q;
      if(last){S=RR.final[r];hold='X'+r+', state home'}
      s+=box(x,y,bw,bh,r,hold,last?null:row.Y,S,!last,last?1:e,m)}}
  const rowsN=Math.ceil(P/cols);return svgW(w,rowsN*(bh+gap),s,'Ring-DTP ranks, strips and running states')}
function counters(m,k,e){const live=m==='dense'?N*V:N*VP,hop=m==='wts'?Hh*VP:m==='act'?N*Hh+4*N:0;
  let fin='';if(m==='dense'&&k>=1||m!=='dense'&&k>=P){const st=m==='wts'?RW.final:m==='act'?RA.final:null;fin=st?'max diff '+maxDiff(st).toExponential(1):'the reference'}
  return stat('Live logits per rank',live+' numbers',m==='dense'?'N × V':'one strip, N × V/P')+stat('Sent per hop',hop?hop+' numbers':'no hops',m==='wts'?'a 3 × 3 weight shard (H × V/P)':m==='act'?'a 2 × 3 batch, its 2 targets and 3 numbers of state per token':'every rank holds the whole weight')+stat('Loss against dense log-softmax',fin||'not finished',fin?'all 8 tokens':'')}
makeAnim({id:'rgx',modes,mode:'wts',draw,counters,dur:2600});
window.__ringCheck=()=>({wts:maxDiff(RW.final),act:maxDiff(RA.final)});
})();
