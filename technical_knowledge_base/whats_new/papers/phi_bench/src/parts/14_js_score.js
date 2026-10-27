// ---- Score a submission: the AB-BA protocol and the reward curve on simulated timings ----
(function(){
  const P=T.tasks.filter(t=>t.cls==='p'),FN={kfc:'KFC',lh:'LHI',e2e:'E2EO'},sel=$('scTask');
  ['kfc','lh','e2e'].forEach(b=>{const og=document.createElement('optgroup');og.label=FN[b];
    P.filter(t=>t.b===b).sort((x,y)=>x.ref-y.ref).forEach(t=>{const o=document.createElement('option');o.value=t.id;o.textContent=t.id+' ('+(t.ref<10?t.ref.toFixed(2):fmt(t.ref))+'×)';og.appendChild(o)});sel.appendChild(og)});
  sel.value='kv-traffic-sol';
  let proto='ab';const cur=()=>P.find(t=>t.id===sel.value);
  const kmax=ref=>Math.max(2,ref*1.3),kOf=ref=>{const v=+$('scK').value/1000;return Math.exp(Math.log(.5)+(Math.log(kmax(ref))-Math.log(.5))*v)};
  const setK=(ref,k)=>{$('scK').value=Math.round((Math.log(k)-Math.log(.5))/(Math.log(kmax(ref))-Math.log(.5))*1000)};
  function nrm(r){let u=0,v=0;while(u===0)u=r();v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
  function simulate(S,ref,cv,dr,np,paired){const r=mulberry32(12345),N=2000,ms=new Float64Array(N),rw=new Float64Array(N);
    const sc=Math.log(1+cv),sd=Math.log(1+dr);
    for(let n=0;n<N;n++){const q=[];for(let i=0;i<np;i++){const d1=Math.exp(sd*nrm(r)),d2=paired?d1:Math.exp(sd*nrm(r));
        const tb=d1*Math.exp(sc*nrm(r)),tc=d2*Math.exp(sc*nrm(r))/S;q.push(tb/tc)}
      q.sort((a,b)=>a-b);const m=q.length%2?q[(q.length-1)/2]:(q[q.length/2-1]+q[q.length/2])/2;ms[n]=m;rw[n]=reward(m,ref)}
    return {ms,rw}}
  function draw(w){const t=cur(),ref=t.ref,k=kOf(ref),S=k*ref,cv=$('scN').value/100,dr=$('scD').value/100,np=+$('scP').value;
    $('scKv').textContent=k.toFixed(3)+'× (true speed-up '+(S<100?S.toFixed(2):fmt(S))+'×)';$('scNv').textContent=(cv*100).toFixed(0)+'%';$('scDv').textContent=(dr*100).toFixed(0)+'%';$('scPv').textContent=np;
    const {ms,rw}=simulate(S,ref,cv,dr,np,proto==='ab');const N=ms.length;
    const z=Array.from(rw).filter(v=>v===0).length/N,mean=rw.reduce((a,b)=>a+b,0)/N,srt=Array.from(rw).sort((a,b)=>a-b);
    $('scOut').innerHTML=stat('True reward',reward(S,ref).toFixed(3),'with perfect timing')+stat('Mean measured reward',mean.toFixed(3))+stat('Scored zero',(100*z).toFixed(1)+'%')+stat('5% to 95% of rewards',srt[Math.floor(.05*N)].toFixed(3)+' to '+srt[Math.floor(.95*N)].toFixed(3));
    // top: measured speed-up histogram (log x)
    const H1=160,H2=130,pl=40,pr=12,lg=Math.log;const sm=Array.from(ms).sort((a,b)=>a-b);let lo=Math.min(sm[Math.floor(.005*N)],ref,S),hi=Math.max(sm[Math.floor(.995*N)],ref,S);
    if(ref*ref<=hi*1.3)hi=Math.max(hi,ref*ref);const pad=Math.pow(hi/lo,.08)||1.05;lo/=pad;hi*=pad;
    const lx=v=>pl+(w-pl-pr)*(lg(v)-lg(lo))/(lg(hi)-lg(lo)),B=48,bins=new Array(B).fill(0);
    ms.forEach(v=>{const b=Math.min(B-1,Math.max(0,Math.floor(B*(lg(v)-lg(lo))/(lg(hi)-lg(lo)))));bins[b]++});
    const mx=Math.max(...bins),bw=(w-pl-pr)/B;let s='';
    bins.forEach((c,i)=>{const x0=pl+i*bw,v=Math.exp(lg(lo)+(i+.5)/B*(lg(hi)-lg(lo)));s+=rc(x0+.5,H1-24-(H1-40)*c/mx,bw-1,(H1-40)*c/mx,v>ref?'var(--acc)':'var(--dim)',{r:1})});
    const mk=(v,l,c,dy)=>{if(v<lo||v>hi)return '';return ln2(lx(v),8,lx(v),H1-24,c,{sw:1.4,da:'4 3'})+tx(lx(v)+(lx(v)>w-90?-4:4),12+dy,l,{fs:11,c,a:lx(v)>w-90?'end':'start'})};
    s+=mk(ref,'anchor '+(ref<100?ref.toFixed(2):fmt(ref))+'×','var(--c3)',0)+mk(ref*ref,'anchor²','var(--c2)',14)+mk(S,'true','var(--ink)',28);
    let tk=[];for(let e=-3;e<=6;e++)[1,1.2,1.5,2,2.5,3,4,5,6,8].forEach(m=>{const v=+(m*10**e).toPrecision(3);if(v>=lo&&v<=hi)tk.push(v)});
    if(tk.length<3){const raw=(hi-lo)/4,e=10**Math.floor(Math.log10(raw)),st=[1,2,2.5,5,10].map(m=>m*e).find(x=>x>=raw);tk=[];for(let v=Math.ceil(lo/st)*st;v<=hi;v+=st)tk.push(+v.toPrecision(4))}
    const mxT=Math.max(3,Math.floor((w-pl-pr)/70));while(tk.length>mxT)tk=tk.filter((v,i)=>i%2===0);tk.forEach(v=>{s+=tx(lx(v),H1-10,(v<10?String(v):fmt(v))+'×',{fs:11,a:'middle',c:'var(--mute)'})});
    s+=tx(pl,H1+2,'measured speed-up (median of '+np+' pair'+(np>1?'s':'')+')',{fs:11,c:'var(--mute)'});
    // bottom: reward histogram, zeros as their own bar
    const RB=20,rb=new Array(RB).fill(0);let zc=0;rw.forEach(v=>{if(v===0)zc++;else rb[Math.min(RB-1,Math.floor(v*RB))]++});
    const y0=H1+14,rmx=Math.max(1,...rb,0),ry=c=>(H2-40)*c/Math.max(rmx,zc),zx=pl,zw=Math.min(46,(w-pl-pr)*.12),gx=zx+zw+14,gw=w-pr-gx,rbw=gw/RB;let s2='';
    s2+=rc(zx,y0+H2-26-ry(zc)*1,zw,ry(zc),'var(--bad)',{r:2})+tx(zx+zw/2,y0+H2-10,'zero',{fs:11,a:'middle',c:'var(--mute)'})+tx(zx+zw/2,y0+H2-30-ry(zc),(100*zc/N).toFixed(0)+'%',{fs:11,a:'middle'});
    rb.forEach((c,i)=>{s2+=rc(gx+i*rbw+.5,y0+H2-26-ry(c),rbw-1,ry(c),'var(--acc)',{r:1})});
    [0,.5,1].forEach(v=>{s2+=tx(gx+v*gw,y0+H2-10,v.toFixed(1),{fs:11,a:v===0?'start':v===1?'end':'middle',c:'var(--mute)'})});
    s2+=tx(gx,y0+8,'reward earned (2,000 scorings; zero bar at left)',{fs:11,c:'var(--mute)'});
    $('scPlot').innerHTML=svgW(w,H1+H2+16,s+s2,'Simulated scorings');
    drawAnchors()}
  function drawAnchors(){fit($('anPlot'),w=>{const t=cur(),pl=46,pr=12,H=130,lo=1,hi=1e5,lg=Math.log10,lx=v=>pl+(w-pl-pr)*(lg(v)-lg(lo))/(lg(hi)-lg(lo));let s='';
    [1,10,100,1000,1e4,1e5].forEach(v=>{s+=ln2(lx(v),6,lx(v),H-24,'var(--line)')+tx(lx(v),H-8,(v>=1000?fmt(v):v)+'×',{fs:11,a:v===1?'start':v===1e5?'end':'middle',c:'var(--mute)'})});
    ['kfc','lh','e2e'].forEach((b,r)=>{const y=20+r*32;s+=tx(pl-6,y+4,FN[b],{fs:11.5,a:'end'});
      const r2=mulberry32(7+r);P.filter(x=>x.b===b).forEach(x=>{const jy=y+(r2()-.5)*14;s+='<circle cx="'+lx(x.ref).toFixed(1)+'" cy="'+jy.toFixed(1)+'" r="'+(x.id===t.id?6:3.6)+'" fill="'+(x.id===t.id?'none':'var(--acc)')+'" stroke="'+(x.id===t.id?'var(--c2)':'none')+'" stroke-width="2.4" opacity="'+(x.id===t.id?1:.6)+'"><title>'+x.id+': '+x.ref.toFixed(2)+'×</title></circle>'})});
    s+=ln2(lx(RC.ref_median),8,lx(RC.ref_median),H-24,'var(--c3)',{da:'3 3'})+tx(lx(RC.ref_median)+4,10,'median '+RC.ref_median.toFixed(1)+'×',{fs:11,c:'var(--c3)'});
    $('anPlot').innerHTML=svgW(w,H,s,'Reference anchors of the 77 performance tasks')})}
  const go=()=>refit($('scPlot'));
  sel.addEventListener('change',()=>{setK(cur().ref,1.05);go()});
  ['scK','scN','scD','scP'].forEach(id=>$(id).addEventListener('input',go));
  segBind('scM',m=>{proto=m;document.querySelectorAll('#scM button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));go()});
  setK(cur().ref,1.05);
  onTab('t-score',()=>fit($('scPlot'),draw));
})();
