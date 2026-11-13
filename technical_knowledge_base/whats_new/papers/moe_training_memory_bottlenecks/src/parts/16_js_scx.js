// ---- SCO on gpt-oss-20b's 47 checkpoint boundaries (Table 3, Algorithm 3), in four explained stretches (2026-11-13 rollout) ----
// Step 1 plays the whole forward pass (boundary by boundary within the step), steps 2 and 3 the two halves of backward
// (the boundaries kept on the device, then the offloaded ones restored one ahead), step 4 the end of the step. The step list
// #sx-scx is shared by the four host budgets; the numbers that differ are in the counters.
(function(){
const NB=47,BG=557056/8*2880*2/GiB,OFF={off:0,b8:21,b16:42,full:47},PEAK={off:139.790,b8:133.546,b16:125.677,full:123.728},
  BUD={off:'none',b8:'8 GiB',b16:'16 GiB',full:'unlimited'};
// the position reached at step k, progress e: forward position f (boundaries created so far) or backward position p (boundaries not yet consumed)
function pos(m,k,e){const n=OFF[m];if(k===0)return {ph:'F',f:NB*e};if(k===1)return {ph:'B',p:NB-(NB-n)*e};if(k===2)return {ph:'B',p:n*(1-e)};return {ph:'E'}}
// per boundary: on the device (d), the one restored ahead (r), on the host (h); fractional positions fade the boundary in or out
function state(m,q){const n=OFF[m];return Array.from({length:NB},(_,i)=>{
  if(q.ph==='F'){const a=cl01(q.f-i);return {d:i>=n?a:0,r:0,h:i<n?a:0}}
  if(q.ph==='B'){const keep=cl01(q.p-i),ahead=i<n&&i<q.p&&i>=Math.ceil(q.p)-2?1:0;return {d:i>=n?keep:ahead*keep,r:ahead*keep,h:i<n?1:0}}
  return {d:0,r:0,h:0}})}
const modes={b8:[0,1,2,3],b16:[0,1,2,3],full:[0,1,2,3],off:[0,1,2,3]};
function draw(m,k,e,w){const s1=state(m,pos(m,k,e)),pl=74,cw=(w-pl-6)/NB,ch=Math.max(12,Math.min(26,cw*2.2)),y1=22,y2=y1+ch+30;let s='';
  s+=tx(pl-6,y1+ch/2+4,'GPU HBM',{fs:11,a:'end'})+tx(pl-6,y2+ch/2+4,'host, pinned',{fs:11,a:'end'});
  s+=tx(pl,12,'boundaries 1 to 47, 0.3735 GiB each',{fs:11,c:'var(--mute)'});
  for(let i=0;i<NB;i++){const b=s1[i],x=pl+i*cw;
    s+=rc(x,y1,cw-1,ch,'var(--soft)',{r:1})+rc(x,y2,cw-1,ch,'var(--soft)',{r:1});
    if(b.d>0)s+=rc(x,y1,cw-1,ch,b.r?'var(--acc)':'var(--c3)',{r:1,op:b.d});
    if(b.h>0)s+=rc(x,y2,cw-1,ch,'var(--c4)',{r:1,op:b.h})}
  const n=OFF[m];if(n>0&&n<NB)s+=ln2(pl+n*cw-.5,y1-4,pl+n*cw-.5,y2+ch+4,'var(--bad)',{da:'3 3'})+tx(Math.min(w-4,pl+n*cw+3),y2+ch+16,'host budget '+BUD[m],{fs:11,c:'var(--bad)',a:pl+n*cw+120>w?'end':null});
  // to-scale bar of boundary memory on the device
  const yb=y2+ch+30,dev=s1.reduce((a,q)=>a+q.d,0)*BG,X=v=>pl+(w-pl-6)*v/(NB*BG);
  s+=tx(pl-6,yb+12,'on GPU',{fs:11,a:'end'})+rc(pl,yb,w-pl-6,16,'var(--soft)',{r:2})+rc(pl,yb,X(dev)-pl,16,'var(--c3)',{r:2})+tx(Math.min(X(dev)+4,w-70),yb+12,dev.toFixed(2)+' GiB',{fs:11});
  return svgW(w,yb+24,s,'Checkpoint boundaries on device and host')}
// the counters at the end of each stretch (whole boundaries), plus the boundary peak over the step
function counters(m,k){const s=state(m,pos(m,k,1)),c=f=>s.filter(f).length,dev=c(q=>q.d>.5)*BG,host=c(q=>q.h>.5)*BG,rs=c(q=>q.r>.5);
  const n=OFF[m],pk=Math.max((NB-n)*BG,Math.min(2,n)*BG);
  return stat('Boundaries on the GPU now',dev.toFixed(2)+' GiB',(rs?rs+' restored, ':'')+c(q=>q.d>.5)+(c(q=>q.d>.5)===1?' boundary':' boundaries'))+stat('In pinned host memory',host.toFixed(2)+' GiB',c(q=>q.h>.5)+' boundaries, budget '+BUD[m])+stat('Measured peak HBM',PEAK[m].toFixed(3)+' GiB','Table 3; boundaries at their peak '+pk.toFixed(2)+' GiB')}
makeAnim({id:'scx',modes,mode:'b8',lists:{b8:'sx-scx',b16:'sx-scx',full:'sx-scx',off:'sx-scx'},draw,counters,dur:4200,durOf:(m,k)=>k===3?3600:6400});
})();
