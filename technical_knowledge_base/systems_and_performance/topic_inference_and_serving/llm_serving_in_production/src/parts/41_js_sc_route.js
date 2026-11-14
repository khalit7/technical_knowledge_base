// ---- Scene, section 2 (Fig. 2): eight requests of four two-turn conversations routed to three real llama-server replicas (renderer v2).
// Measured on the M1 Pro (window.PRD.route_detail, each row [request, replica, cached tokens, computed tokens, TTFT s]):
// round robin and SGLang's cache-aware rules one request at a time with a 1.5 GiB host cache (root8big), and the weighted cache-plus-queue
// score with two bursts of four (root8burst). Each request lands on its replica as a slab as long as its prompt: green the tokens the replica
// found cached, orange the tokens it computed. ----
(function(){
  if(!document.getElementById('stg-rt')||!window.PRD||!PRD.route_detail)return;const {at,off,lerp,mix}=S3;
  const DET=PRD.route_detail,MODES={rr:['root8big','rr','sx-rt-rr'],pa:['root8big','ca','sx-rt-pa'],bw:['root8burst','wt','sx-rt-bw']};
  let mode='rr';
  const rows=()=>DET[MODES[mode][0]][MODES[mode][1]];
  const XR=[-3.2,0,3.2],ZP=1.1,SW=1.8,TOK=2500,SH=.17,qx=j=>-3.15+j*.9,QZ=-2.75,RT=[0,0,-1.25];
  const CC={A:'c1',B:'c2',C:'c4',D:'c6'};
  const nf=v=>Math.round(v).toLocaleString('en-US');
  // which requests have arrived by step k, and which arrive at step k
  function arrived(k){const n=rows().length;if(mode==='bw'){const m=k===0?0:k===1?4:n,c=k===1?[0,1,2,3]:k===2?[4,5,6,7]:[];return {m,cur:c}}return {m:Math.min(n,k),cur:k>=1?[k-1]:[]}}
  function draw(R,k,e){const P=R.P,X=rows(),A=arrived(k),last=!!st&&k===st.st.n-1;R.grid(-5.4,5.4,-3.4,2.6,.5);
    // the queue of requests, in the order sent; a sent request's token fades out
    X.forEach((r,j)=>{const cur=A.cur.includes(j),nx=mode==='bw'?j<(A.m===0?4:8):j===A.m,a=j<A.m?(cur?1-e:0):(nx?1:.55);
      R.box([qx(j),0,QZ],[.62,.34,.5],{fill:mix(P.paper,P[CC[r[0][0]]],.7),a,lw:.8});R.label([qx(j),.34,QZ],r[0],{dy:-10,b:1,c:P[CC[r[0][0]]],a})});
    R.box(RT,[1.3,.42,.8],{fill:mix(P.paper,P.ink,.12),lw:1.1});R.label([RT[0],.42,RT[2]],'router · '+{rr:'round robin',pa:'SGLang cache-aware',bw:'prefix 3 + queue 2'}[mode],{dy:-14,b:1,c:P.ink});
    // replicas: a white plinth each, with the slabs stacked in arrival order
    const per=[[],[],[]];X.slice(0,A.m).forEach((r,j)=>per[r[1]].push([r,j]));
    XR.forEach((x,i)=>{R.box([x,0,ZP],[SW+.4,.12,1.15],{lw:.9});
      const tot=per[i].reduce((s,[r])=>s+r[3],0);R.label([x,0,ZP+.6],'replica '+(i+1)+(A.m?' · '+nf(tot):''),{dy:14,b:1,c:last?P.bad:P.ink});
      per[i].forEach(([r,j],h)=>{const cur=A.cur.includes(j),a=cur?Math.min(1,e*1.4):last?1:.55,y=.12+h*(SH+.04)+(cur?(1-e)*.5:0),x0=x-SW/2,wc=SW*r[2]/TOK,wu=SW*r[3]/TOK;
        if(wc>0)R.box([x0+wc/2,y,ZP],[wc,SH,.8],{fill:mix(P.paper,P.good,.75),a,lw:.6,shadow:h===0});
        R.box([x0+wc+wu/2,y,ZP],[wu,SH,.8],{fill:mix(P.paper,P.bad,.8),a,lw:.6,shadow:h===0&&wc===0});
        R.box([x0-.12,y,ZP+.25],[.12,SH,.25],{fill:P[CC[r[0][0]]],a,lw:.4,shadow:false});
        if(cur)R.label([x0+(wc+wu)/2,y+SH,ZP-.4],r[0]+' · '+nf(r[3])+' computed',{dy:-10,b:1,c:P[CC[r[0][0]]],a:e,grp:'new'})})});
    // the request's path: queue to router to its replica, coloured by conversation
    A.cur.forEach(j=>{const r=X[j],h=per[r[1]].findIndex(p=>p[1]===j);
      R.flowArc([qx(j),.34,QZ],[RT[0],.42,RT[2]],.35,{c:P[CC[r[0][0]]],r:.06,n:6,speed:1.6,a:Math.min(1,e*2)});
      R.flowArc([RT[0],.42,RT[2]],[XR[r[1]],.12+h*(SH+.04)+SH,ZP],.5,{c:P[CC[r[0][0]]],r:.06,n:8,speed:1.6,a:Math.min(1,e*2)})});
    const done=X.slice(0,A.m).reduce((s,r)=>s+r[3],0);
    R.label([RT[0]+.7,.2,RT[2]],'computed so far: '+nf(done),{al:'left',dx:8,b:last,c:last?P.bad:P.mute});
  }
  const ph=()=>{const c=document.querySelector('#stg-rt canvas');return c&&c.clientWidth<520};
  const full={cam:[.12,.7],bounds:[[-5.1,0,-3.0],[5.1,.7,1.9]]};
  const st=S3.stage({id:'stg-rt',list:'sx-rt-rr',fig:'Fig. 2 · eight real requests, three llama-server replicas',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1400,hold:4400,draw,
    view:()=>ph()?{cam:[.12,.98]}:null, // a steeper camera on a phone so the scene draws larger
    margin:w=>w<520?[16,10,18,10]:[20,24,22,24]});
  const ch=document.getElementById('rt-mode');
  if(ch)ch.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;mode=b.dataset.m;ch.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    Object.values(MODES).forEach(m=>{document.getElementById(m[2]).hidden=m[2]!==MODES[mode][2]});st.list(MODES[mode][2])});
  (window.PRSTG=window.PRSTG||{})['stg-rt']=st;
})();
