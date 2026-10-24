// ---- Reading tab, section 8: model-collapse simulation (in a closed block; redrawn when the block opens). The OLMo 2 mid-training bars were retired on 2026-10-24 (Data mixing, section 5, owns staging) ----
(function(){
  const D=window.RDD,esc=RD.esc;
  // model collapse: Gaussian refit on own samples, replace vs accumulate (median of 400 seeded runs)
  const host=document.getElementById('rd-col-svg');if(!host)return;
  const G=40,M=20,RUNS=400;
  function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  function sim(){
    const rep=[],acc=[];for(let g=0;g<=G;g++){rep.push([]);acc.push([])}
    for(let run=0;run<RUNS;run++){
      const r=rng(1234+run);const nrm=()=>{let u=0,v=0;while(u===0)u=r();v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
      const fit=xs=>{const m=xs.reduce((a,b)=>a+b,0)/xs.length;return [m,Math.sqrt(xs.reduce((a,b)=>a+(b-m)*(b-m),0)/xs.length)]};
      let x0=[];for(let i=0;i<M;i++)x0.push(nrm());
      // replace
      let cur=x0.slice();for(let g=0;g<=G;g++){const f=fit(cur);rep[g].push(f[1]);cur=[];for(let i=0;i<M;i++)cur.push(f[0]+f[1]*nrm())}
      // accumulate
      let pool=x0.slice();for(let g=0;g<=G;g++){const f=fit(pool);acc[g].push(f[1]);for(let i=0;i<M;i++)pool.push(f[0]+f[1]*nrm())}
    }
    const med=a=>{const s=a.slice().sort((x,y)=>x-y);return s[s.length>>1]};
    return {rep:rep.map(med),acc:acc.map(med)};
  }
  const S=sim();
  const cap=document.getElementById('rd-col-cap');
  function draw(i){
    const W=RD.width(host),H=220,L=40,R=12,T=10,B=30,x=g=>L+g/G*(W-L-R),y=v=>T+(1.1-v)/1.1*(H-T-B);
    let s='';[0,0.25,0.5,0.75,1].forEach(v=>{s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+RD.t(L-4,y(v)+4,v.toFixed(2),{a:'end',fill:'var(--mute)'})});
    [0,10,20,30,40].forEach(g=>{s+=RD.t(x(g),H-14,String(g),{a:'middle',fill:'var(--mute)'})});
    s+=RD.t((L+W-R)/2,H-1,'generation',{a:'middle',fill:'var(--mute)',fs:10.5});
    const path=(arr,c)=>{let d='';for(let g=0;g<=i;g++)d+=(g?'L':'M')+x(g).toFixed(1)+' '+y(arr[g]).toFixed(1);return '<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="2.5"/>'};
    s+=path(S.rep,'var(--c2)')+path(S.acc,'var(--c3)');
    s+='<circle cx="'+x(i)+'" cy="'+y(S.rep[i])+'" r="4" fill="var(--c2)"/><circle cx="'+x(i)+'" cy="'+y(S.acc[i])+'" r="4" fill="var(--c3)"/>';
    host.innerHTML=RD.svg(W,H,s,'Median fitted standard deviation by generation, replace against accumulate');
    const msg=i===0?'Generation 0: both start from the same 20 real samples; the fitted spread is a little under 1 because small samples underestimate it.':
      i<10?'Each generation is trained only on what the previous one produced (orange) or on everything so far (green). Small estimation errors compound in the orange line.':
      i<G?'The orange spread keeps shrinking: rare values stop being sampled, so the next fit is narrower, and so on. The green one barely moves, because the real samples never leave the pool.':
      'After '+G+' generations the replaced model\'s spread is '+S.rep[G].toFixed(2)+' of the original against '+S.acc[G].toFixed(2)+' when data accumulates: the tails are gone in one case and kept in the other.';
    cap.innerHTML='<div class="t">Generation '+i+': spread '+S.rep[i].toFixed(2)+' (replace), '+S.acc[i].toFixed(2)+' (accumulate)</div><p>'+esc(msg)+'</p>';
  }
  const A=RD.anim({card:'rd-col-card',ctl:'rd-col-ctl',n:G+1,draw,ms:260,label:'Generation'});
  RD.onResize(()=>A.redraw());
  const det=document.getElementById('rd-col-det');if(det)det.addEventListener('toggle',()=>{if(det.open)A.redraw()});
})();
