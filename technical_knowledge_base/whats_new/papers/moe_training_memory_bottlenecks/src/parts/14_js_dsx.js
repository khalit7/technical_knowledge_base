// ---- Live 1: expert dispatch, chunk by chunk, on the replayed send matrices ----
(function(){
let pi=3;
const T6={0:[52.660,21.430,21.464],1:[52.988,22.855,23.575],2:[52.988,22.861,23.514],3:[52.906,22.778,24.151],4:[52.906,22.772,null]};
const modes={str:[],cont:[],llep:[]};
const pname=()=>RT.profiles[pi][0];
function build(){const S=rtData(pi),K=RT.K;
  const ch=(m,i)=>{const r=S.recv(S[m][i]),mx=Math.max(...r);return {mx,arg:r.indexOf(mx)}};
  ['str','cont'].forEach(m=>{const A=modes[m];A.length=0;const lab=m==='str'?'strided':'contiguous';
    A.push({t:'LLEP plans the layer',c:'Every rank counts its routes per expert; LLEP\'s plan (capacity factor 1.0) splits each overloaded expert\'s global token list across helper ranks by position. Profile '+pname()+'. Nothing is in flight yet. Each rank will put at most c = '+fmt(RT.c)+' of its tokens in a chunk, so K = '+K+' chunks, chosen '+(m==='str'?'in strided order: positions i, i + 10, i + 20, ...':'as consecutive positions')+'.'});
    for(let i=0;i<K;i++){const q=ch(m,i);A.push({t:'Chunk '+(i+1)+' of '+K+' ('+lab+')',c:'The '+fmt(RT.c)+' '+lab+' tokens of each rank go out; destination '+q.arg+' receives the most, '+fmt(q.mx)+' routes, '+(100*q.mx/RT.bound).toFixed(1)+'% of the guarantee E<sub>p</sub>kc<sub>eff</sub> = '+fmt(RT.bound)+'. '+(i===0?'Chunk 1 is computing while chunk 2 is dispatched; the previous chunk\'s buffers are freed before the next allocates its own.':'Worst sender in this chunk: '+Math.max(...S[m][i].map(r=>{const s=r.reduce((a,b)=>a+b,0);return s?Math.max(...r)/(s/RT.ep):0})).toFixed(2)+'× its mean send.')})}
    A.push({t:'Done',c:'All '+fmt(RT.N*RT.k)+' routes of every rank delivered, no token dropped. Worst send ratio '+S.ratio[m].toFixed(2)+' (Table 8 for this profile: '+({0:'1.00 / 1.02',1:'1.35 / 2.63',2:'2.40 / 4.00',3:'2.29 / 6.00'}[pi]||'not measured')+', strided / contiguous); the busiest destination never held more than '+fmt(S.maxRecv[m])+' routes at once.'})});
  const A=modes.llep;A.length=0;const w=S.recv(S.whole),mx=Math.max(...w);
  A.push({t:'LLEP plans the layer',c:'The same plan, profile '+pname()+'. LLEP balances the load across ranks, but dispatches each rank\'s routed batch in one all-to-all.'});
  A.push({t:'The whole batch at once',c:'Every route is live at once: the busiest destination receives '+fmt(mx)+' routes, '+(mx/Math.max(1,S.maxRecv.str)).toFixed(1)+' times what strided chunks ever put there. LLEP balanced it, so this is the even share k N; standard expert parallelism without LLEP would pile more on the hot experts\' owners.'});
  A.push({t:'Done',c:'Same routes, same destinations, same result; the difference is only how many routes were live at once.'});
  const T=T6[pi];$('dsxNote').innerHTML='Measured at this shape and profile ('+A_AX('A2.T6','Table 6')+', '+A_AX('A2.T8','Table 8')+'): peak allocated memory LLEP '+T[0]+' GiB, PipelinedLLEP strided '+T[1]+' GiB'+(T[2]?', contiguous '+T[2]+' GiB':'')+'. The counters here count dispatch buffers only (2 R H b at H = 7,168, BF16); the measured peaks also hold combine buffers, expert intermediates and weights.'}
const A_AX=(a,t)=>'<a href="'+PAPER.meta.ax+'#'+a+'" target="_blank" rel="noopener noreferrer">'+t+'</a>';
const mat=(m,k)=>{const S=rtData(pi);if(m==='llep')return k===1?S.whole:null;return k>=1&&k<=RT.K?S[m][k-1]:null};
const peakTo=(m,k)=>{const S=rtData(pi);let p=0,r=0;for(let j=1;j<=k;j++){const M=mat(m,j);if(!M)continue;p=Math.max(p,...S.recv(M));r=Math.max(r,...M.map(row=>{const s=row.reduce((a,b)=>a+b,0);return s?Math.max(...row)/(s/RT.ep):0}))}return {p,r}};
function draw(m,k,e,w){const S=rtData(pi),M=mat(m,k),ymax=Math.max(...S.recv(S.whole))*1.12,wide=w>=600;
  const bw=wide?Math.floor(w*.56):w,bh=170,pl=50,pt=16,gx=wide?bw+16:0,gy=wide?0:bh+44,cs=Math.min(26,Math.floor(((wide?w-bw-16:w)-80)/8));
  const Y=v=>pt+bh*(1-v/ymax),slot=(bw-pl-6)/RT.ep;let s='';
  [0,ymax/2.24,ymax/1.12].forEach(v=>{s+=ln2(pl,Y(v),bw-4,Y(v),'var(--line)')+tx(pl-4,Y(v)+4,v>=1e3?fmt(v/1e3)+'K':fmt(v),{fs:11,a:'end',c:'var(--mute)'})});
  s+=tx(4,pt-4,'routes held by each destination now',{fs:11,c:'var(--mute)'});
  s+=ln2(pl,Y(RT.bound),bw-4,Y(RT.bound),'var(--bad)',{da:'5 3',sw:1.4})+tx(bw-6,Y(RT.bound)-4,'Eq. 1 guarantee per chunk',{fs:11,a:'end',c:'var(--bad)'});
  const r=M?S.recv(M):new Array(RT.ep).fill(0),col=m==='llep'?'var(--c2)':m==='cont'?'var(--c5)':'var(--c3)';
  r.forEach((v,d)=>{const x=pl+d*slot+slot*.15,ww=slot*.7,h=(Y(0)-Y(v))*e;s+=rc(x,Y(0)-h,ww,h,col,{r:2});
    if(v&&e>.5)s+=tx(x+ww/2,Y(0)-h-3,v>=1e4?Math.round(v/1e3)+'K':fmt(v),{fs:11,a:'middle'});s+=tx(x+ww/2,Y(0)+14,'d'+d,{fs:11,a:'middle',c:'var(--mute)'})});
  // send matrix of this chunk
  const gx0=gx+52,gy0=gy+22;s+=tx(gx,gy+10,'send matrix: sender rows, destination columns',{fs:11,c:'var(--mute)'});
  const mx=M?Math.max(1,...M.flat()):1;
  for(let i=0;i<RT.ep;i++){s+=tx(gx0-6,gy0+i*cs+cs/2+4,'src '+i,{fs:11,a:'end',c:'var(--mute)'});
    for(let d=0;d<RT.ep;d++){const v=M?M[i][d]:0;s+=rc(gx0+d*cs,gy0+i*cs,cs-2,cs-2,v?col:'var(--soft)',{r:2,op:v?(.12+.88*v/mx)*e+(1-e)*.1:1})}
    if(M){const row=M[i],sm=row.reduce((a,b)=>a+b,0);if(sm)s+=tx(gx0+RT.ep*cs+4,gy0+i*cs+cs/2+4,'×'+(Math.max(...row)/(sm/RT.ep)).toFixed(1),{fs:11})}}
  const H=Math.max(pt+bh+20,gy0+RT.ep*cs+6);return svgW(w,H,s,'Dispatch buffers per destination and the send matrix')}
function counters(m,k,e){const S=rtData(pi),M=mat(m,k),now=M?Math.max(...S.recv(M)):0,pk=peakTo(m,k),B=v=>fmtBytes(2*v*RT.H*RT.b);
  return stat('Busiest destination now',fmt(now)+' routes',B(now)+' of dispatch buffers')+stat('Peak so far',fmt(pk.p)+' routes',B(pk.p)+(m==='llep'?'':'; '+(100*pk.p/RT.bound).toFixed(1)+'% of the Eq. 1 bound'))+stat('Worst send ratio so far',pk.r?pk.r.toFixed(2)+'×':'none yet','largest send to one destination ÷ the sender\'s mean')}
build();
const an=makeAnim({id:'dsx',modes,mode:'str',draw,counters,dur:2400});
$('dsxP').addEventListener('change',e=>{pi=+e.target.value;build();if(an){an.st.lk=-1;an.st.k=Math.min(an.st.k,modes[an.st.m].length-1);an.draw()}});
})();
