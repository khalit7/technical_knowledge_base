// ---- Live 3: SCO on gpt-oss-20b's 47 checkpoint boundaries (Table 3, Algorithm 3) ----
(function(){
const NB=47,BG=557056/8*2880*2/GiB,OFF={off:0,b8:21,b16:42,full:47},PEAK={off:139.790,b8:133.546,b16:125.677,full:123.728},
  BUD={off:'none',b8:'8 GiB',b16:'16 GiB',full:'unlimited'};
// forward in 4 groups, backward in 4 groups (reverse), then the end of the step. Per boundary: on device (d), restored (r), on host (h)
const FW=[[0,12],[12,24],[24,36],[36,47]],BW=[[35,47],[23,35],[11,23],[0,11]];
function state(m,k){const n=OFF[m];if(k<0)return Array.from({length:NB},()=>({d:false,r:false,h:false}));return Array.from({length:NB},(_,i)=>{
  if(k<4){const c=i<FW[k][1];return {d:c&&i>=n,r:false,h:c&&i<n}}
  if(k<8){const a=BW[k-4][0],pr=i>=a,re=i===a-1&&i<n;return {d:(!pr&&i>=n)||re,r:re,h:i<n}}
  return {d:false,r:false,h:false}})}
const cnt=(s,f)=>s.filter(f).length;
function steps(m){const n=OFF[m],A=[];
  FW.forEach(([a,b],g)=>A.push({t:'Forward: boundaries '+(a+1)+' to '+b,c:(n===0?'Each layer\'s input stays on the device until backward recomputes the layer.':a>=n?'The host budget is full ('+n+' boundaries, '+(n*BG).toFixed(2)+' GiB): these inputs stay on the device.':'Each input that still fits the '+BUD[m]+' budget is copied to pinned host memory on a copy stream, then freed on the device'+(b>n?'; from boundary '+(n+1)+' on, the budget is full and the rest stay on the device.':'.'))+' At the end of forward the device holds '+((NB-Math.min(n,NB))*BG).toFixed(2)+' GiB of boundaries.'}));
  BW.forEach(([a,b],g)=>A.push({t:'Backward: boundaries '+b+' down to '+(a+1),c:'Backward visits the layers in reverse, recomputing each from its boundary and then freeing it. '+(n===0?'Nothing to restore: every boundary was on the device all along.':b<=n?'These were offloaded: while one layer recomputes, the next boundary is copied back on a separate stream, so at most two restored boundaries are on the device at once (Eq. 4).':a<n?'The device-resident ones are used and freed; the offloaded ones start coming back one layer ahead.':'These stayed on the device and are used and freed in place.')}));
  A.push({t:'Step done',c:'The pinned host memory is released at the end of the step. Measured peak HBM for this setting: '+PEAK[m].toFixed(3)+' GiB (Table 3), throughput within 1.9% of the others.'});return A}
const modes={b8:steps('b8'),b16:steps('b16'),full:steps('full'),off:steps('off')};
function draw(m,k,e,w){const s0=k?state(m,k-1):state(m,-1),s1=state(m,k),pl=74,cw=(w-pl-6)/NB,ch=Math.max(12,Math.min(26,cw*2.2)),y1=22,y2=y1+ch+30;let s='';
  s+=tx(pl-6,y1+ch/2+4,'GPU HBM',{fs:11,a:'end'})+tx(pl-6,y2+ch/2+4,'host, pinned',{fs:11,a:'end'});
  s+=tx(pl,12,'boundaries 1 to 47, 0.3735 GiB each',{fs:11,c:'var(--mute)'});
  for(let i=0;i<NB;i++){const a=s0[i],b=s1[i],x=pl+i*cw,mix=(p,q)=>(p?1-e:0)+(q?e:0);
    s+=rc(x,y1,cw-1,ch,'var(--soft)',{r:1})+rc(x,y2,cw-1,ch,'var(--soft)',{r:1});
    const dOp=Math.min(1,mix(a.d,b.d)),hOp=Math.min(1,mix(a.h,b.h));
    if(dOp>0)s+=rc(x,y1,cw-1,ch,b.r||a.r?'var(--acc)':'var(--c3)',{r:1,op:dOp});
    if(hOp>0)s+=rc(x,y2,cw-1,ch,'var(--c4)',{r:1,op:hOp})}
  const n=OFF[m];if(n>0&&n<NB)s+=ln2(pl+n*cw-.5,y1-4,pl+n*cw-.5,y2+ch+4,'var(--bad)',{da:'3 3'})+tx(Math.min(w-4,pl+n*cw+3),y2+ch+16,'host budget '+BUD[m],{fs:11,c:'var(--bad)',a:pl+n*cw+120>w?'end':null});
  // to-scale bar of boundary memory on device
  const yb=y2+ch+30,dev=cnt(s1,q=>q.d)*BG,X=v=>pl+(w-pl-6)*v/(NB*BG);
  s+=tx(pl-6,yb+12,'on GPU',{fs:11,a:'end'})+rc(pl,yb,w-pl-6,16,'var(--soft)',{r:2})+rc(pl,yb,X(dev)-pl,16,'var(--c3)',{r:2})+tx(Math.min(X(dev)+4,w-70),yb+12,dev.toFixed(2)+' GiB',{fs:11});
  return svgW(w,yb+24,s,'Checkpoint boundaries on device and host')}
function counters(m,k){const s=state(m,k),dev=cnt(s,q=>q.d)*BG,host=cnt(s,q=>q.h)*BG;let pk=0;for(let j=0;j<=k;j++)pk=Math.max(pk,cnt(state(m,j),q=>q.d)*BG);
  return stat('Boundaries on the GPU now',dev.toFixed(2)+' GiB',(cnt(s,q=>q.r)?'1 restored ahead, ':'')+cnt(s,q=>q.d)+(cnt(s,q=>q.d)===1?' boundary':' boundaries'))+stat('In pinned host memory',host.toFixed(2)+' GiB',cnt(s,q=>q.h)+' boundaries, kept until the step ends')+stat('Boundary peak so far',pk.toFixed(2)+' GiB','measured whole-GPU peak '+PEAK[m].toFixed(3)+' GiB')}
makeAnim({id:'scx',modes,mode:'b8',draw,counters,dur:2400});
})();
