// ---- Pipeline schedules: 1F1B, ZB1P and DualPipe, simulated chunk by chunk ----
(function(){
function opsDualPipe(P,m){ // port of DualPipe.step (deepseek-ai/DualPipe dualpipe.py)
  const R=[];const H=P/2,hm=m/2;
  for(let r=0;r<P;r++){const hr=Math.min(r,P-1-r),L=[];let zb=false;
    const F=ph=>L.push({t:'F',ph}),B=(ph,z)=>L.push({t:z?'Bi':'B',ph}),W=()=>L.push({t:'W'}),FB=(a,b)=>L.push({t:'FB',ph:a,ph2:b});
    for(let i=0;i<(H-hr-1)*2;i++)F(0);
    for(let i=0;i<hr+1;i++){F(0);F(1)}
    for(let i=0;i<H-hr-1;i++){B(1,1);W();F(1)}
    const s4=hm-P+hr+1;
    for(let i=0;i<s4;i++){if(i===0&&hr===H-1){F(0);B(1,0)}else FB(0,1);FB(1,0)}
    for(let i=0;i<H-hr-1;i++){B(1,0);FB(1,0)}
    for(let i=0;i<hr+1;i++){if(i===((hr+1)>>1)&&hr%2===1)zb=true;B(1,zb);if(i===((hr+1)>>1)&&hr%2===0)zb=true;B(0,zb)}
    for(let i=0;i<H-hr-1;i++){W();B(0,1)}
    for(let i=0;i<hr+1;i++)W();
    R.push(L)}
  return R}
function op1F1B(P,m,zb){const R=[];for(let r=0;r<P;r++){const w=Math.min(P-r-1,m),L=[];for(let i=0;i<w;i++)L.push({t:'F',ph:0});for(let i=0;i<m-w;i++){L.push({t:'F',ph:0});L.push({t:zb?'Bi':'B',ph:0})}for(let i=0;i<w;i++)L.push({t:zb?'Bi':'B',ph:0});R.push(L)}return R}
// direction of a phase on rank r, and position of rank r along a direction
function simulate(kind,P,m,T){ // T={F,B,W,FB}
  const dual=kind==='dp';const R=dual?opsDualPipe(P,m):op1F1B(P,m,kind==='zb');
  const nd=dual?2:1,mb=dual?m/2:m;
  const dirOf=(r,ph)=>dual?((r<P/2)?ph:1-ph):0, pos=(r,d)=>d===0?r:P-1-r, rankAt=(d,s)=>d===0?s:P-1-s;
  const fDone={},bDone={};const key=(d,s,k)=>d+'|'+s+'|'+k;
  const fc=R.map(()=>[0,0]),bc=R.map(()=>[0,0]);
  const idx=R.map(()=>0),free=R.map(()=>0),cells=R.map(()=>[]),wq=R.map(()=>[]),busy=R.map(()=>0);
  const dur={F:T.F,B:T.B,Bi:T.B-T.W,W:T.W,FB:T.FB};
  function ready(r,o){ // returns earliest start or null
    let t=free[r];
    const need=(ph,isB)=>{const d=dirOf(r,ph),s=pos(r,d),k=isB?bc[r][ph]:fc[r][ph];
      if(!isB){if(s===0)return 0;const v=fDone[key(d,s-1,k)];return v===undefined?null:v}
      if(s===P-1){const v=fDone[key(d,s,k)];return v===undefined?null:v}
      const v=bDone[key(d,s+1,k)];return v===undefined?null:v};
    if(o.t==='F'){const v=need(o.ph,0);if(v===null)return null;t=Math.max(t,v)}
    else if(o.t==='B'||o.t==='Bi'){const v=need(o.ph,1);if(v===null)return null;t=Math.max(t,v)}
    else if(o.t==='FB'){const a=need(o.ph,0),b=need(o.ph2,1);if(a===null||b===null)return null;t=Math.max(t,a,b)}
    return t}
  let left=R.reduce((a,l)=>a+l.length,0),guard=0;
  while(left>0&&guard++<1e6){let prog=false;
    for(let r=0;r<P;r++){
      // greedy W filling for ZB1P: W ops are not in the list; run a pending W if next op would wait
      while(idx[r]<R[r].length){const o=R[r][idx[r]];let t=ready(r,o);if(t===null){
          if(kind==='zb'&&wq[r].length){} break}
        if(kind==='zb'&&wq[r].length&&t-free[r]>=T.W-1e-9){const k=wq[r].shift();cells[r].push({t:'W',s:free[r],e:free[r]+T.W,k:k.k,d:0});busy[r]+=T.W;free[r]+=T.W;prog=true;continue}
        const e=t+dur[o.t];
        const mark=(ph,isB)=>{const d=dirOf(r,ph),s=pos(r,d);if(isB){const k=bc[r][ph]++;bDone[key(d,s,k)]=e;return {d,k}}const k=fc[r][ph]++;fDone[key(d,s,k)]=e;return {d,k}};
        let info;if(o.t==='FB'){const a=mark(o.ph,0),b=mark(o.ph2,1);info={d:a.d,k:a.k,d2:b.d,k2:b.k}}else if(o.t==='W'){info={d:0,k:-1}}else info=mark(o.ph,o.t!=='F');
        cells[r].push(Object.assign({t:o.t,s:t,e},info));busy[r]+=dur[o.t];free[r]=e;idx[r]++;left--;prog=true;
        if(kind==='zb'&&o.t==='Bi')wq[r].push({k:info.k});
      }
    }
    if(!prog)throw new Error('deadlock '+kind+' P'+P+' m'+m+' '+idx.join(','));
  }
  // flush remaining W for zb
  if(kind==='zb')for(let r=0;r<P;r++)while(wq[r].length){const k=wq[r].shift();cells[r].push({t:'W',s:free[r],e:free[r]+T.W,k:k.k,d:0});busy[r]+=T.W;free[r]+=T.W}
  const end=Math.max(...free);
  const idle=free.map((f,r)=>end-busy[r]);
  return {cells,end,idle,mean:idle.reduce((a,c)=>a+c,0)/P,max:Math.max(...idle)}}
  let kind='dp';
  function draw(){
    const P=+$('ppP').value,rt=$('ppR').value.split(',').map(Number),T={F:rt[0],B:rt[1],W:rt[2],FB:rt[3]};
    let m=+$('ppM').value,note='';
    if(kind==='dp'&&m<2*P){m=2*P;note='DualPipe needs at least 2 × PP micro-batches (half in each direction), so this run uses '+m+'. '}
    $('ppMv').textContent=m;
    const r=simulate(kind,P,m,T),W=640,pl=34,rh=P>8?13:18,H=rh*P+26,sc=(W-pl-6)/r.end;
    let s='<defs><pattern id="pph" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="var(--dim)" stroke-width="2"/></pattern></defs>';
    const col=(t,d)=>t==='F'?(d?'var(--c6)':'var(--c1)'):t==='W'?'var(--c5)':'var(--c2)';
    r.cells.forEach((row,i)=>{const y=4+i*rh;s+='<rect x="'+pl+'" y="'+y+'" width="'+(r.end*sc)+'" height="'+(rh-3)+'" fill="url(#pph)"/><text x="'+(pl-5)+'" y="'+(y+rh/2+2)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+i+'</text>';
      row.forEach(c=>{const x=pl+c.s*sc,w=(c.e-c.s)*sc;
        if(c.t==='FB'){s+='<rect x="'+x+'" y="'+y+'" width="'+w/2+'" height="'+(rh-3)+'" fill="'+col('F',c.d)+'"/><rect x="'+(x+w/2)+'" y="'+y+'" width="'+w/2+'" height="'+(rh-3)+'" fill="'+col('B',c.d2)+'"/><rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+(rh-3)+'" fill="none" stroke="var(--ink)" stroke-width="1.2"/>'}
        else s+='<rect x="'+(x+0.3)+'" y="'+y+'" width="'+Math.max(0.5,w-0.6)+'" height="'+(rh-3)+'" fill="'+col(c.t,c.d)+'"'+(c.t==='B'||c.t==='Bi'?(c.d?' opacity=".7"':''):'')+'/>';
        if(c.k>=0&&w>13&&rh>14&&c.t!=='FB')s+='<text x="'+(x+w/2)+'" y="'+(y+rh/2+1.5)+'" font-size="9" text-anchor="middle" fill="var(--bg)">'+c.k+'</text>'})});
    s+='<text x="'+pl+'" y="'+(H-6)+'" font-size="10.5" fill="var(--mute)">time →  makespan '+fmt(r.end,1)+' units; row = pipeline rank</text>';
    $('ppSvg').innerHTML=svgEl(W,H,s,'pipeline schedule grid');
    const fo={'1f1b':(P-1)*(T.F+T.B),zb:(P-1)*(T.F+T.B-2*T.W),dp:(P/2-1)*(T.FB+T.B-3*T.W)}[kind];
    const fs={'1f1b':'(PP − 1)(F + B)',zb:'(PP − 1)(F + B − 2W)',dp:'(PP/2 − 1)(F&B + B − 3W)'}[kind];
    $('ppOut').innerHTML=stat('Bubble, published formula',fmt(fo,2).replace(/\.?0+$/,'')+' units',fs)+stat('Bubble, this simulation',fmt(r.max,2).replace(/\.?0+$/,'')+' units','idle time on the busiest-waiting rank; mean '+r.mean.toFixed(2))+stat('Memory and devices',kind==='dp'?'2× parameters':'1× parameters',(kind==='dp'?'activations PP + 1 = '+(P+1)+'; DualPipeV: same bubble on '+P/2+' devices':'activations PP = '+P+'; '+P+' devices'));
    $('ppNote').textContent=note+'The grid is computed, not drawn by hand: DualPipe follows the exact order of the eight steps in the open-source scheduler (dualpipe.py), 1F1B the standard warm-up, steady and drain order, and ZB1P lets a deferred W fill any gap long enough. Every chunk then starts as soon as its rank is free and its input has arrived; communication time is taken as hidden. The formulas and the simulation agree at the default ratios. Change W and they can drift apart: the DualPipe formula matches this simulation whenever B − W equals F, and this ZB1P filler, greedier than the published ZB1P order, can beat its formula.';
  }
  segBind('ppS',v=>{kind=v;draw()});['ppP','ppR'].forEach(i=>$(i).addEventListener('change',draw));$('ppM').addEventListener('input',draw);draw();
})();
