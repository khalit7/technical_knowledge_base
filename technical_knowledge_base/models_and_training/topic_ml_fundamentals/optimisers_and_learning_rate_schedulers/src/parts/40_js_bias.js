// ---- Reading: Adam's first 40 steps, with and without bias correction (before/after animation) ----
(function(){
  const N=40,B1=0.9,EPS=1e-8;
  // three gradient streams (illustrative): a steady tiny gradient, pure noise, a sparse gradient that fires every 10th step
  const nz=OPTE.gauss(3);const noisy=[];for(let t=0;t<N;t++)noisy.push(nz());
  const P=[{n:'Steady, tiny',d:'g = 0.01 every step',g:t=>0.01,c:'var(--c1)'},
           {n:'Noisy',d:'g drawn from N(0, 1)',g:t=>noisy[t-1],c:'var(--c2)'},
           {n:'Sparse',d:'g = 1 on steps 1, 11, 21, 31; else 0',g:t=>(t%10===1?1:0),c:'var(--c3)'}];
  let corr=true,b2=0.999;
  // full trace for one setting: per param per step {g, m, v, mh, vh, step}
  function trace(cor,B2){return P.map(p=>{let m=0,v=0;const out=[];for(let t=1;t<=N;t++){const g=p.g(t);m=B1*m+(1-B1)*g;v=B2*v+(1-B2)*g*g;
    const mh=cor?m/(1-Math.pow(B1,t)):m,vh=cor?v/(1-Math.pow(B2,t)):v;out.push({g,m,v,mh,sv:Math.sqrt(vh),st:mh/(Math.sqrt(vh)+EPS)})}return out})}
  const host=document.getElementById('bc-lanes'),cnt=document.getElementById('bc-cnt'),cap=document.getElementById('bc-cap'),svg=document.getElementById('bc-plot');
  if(!host)return;
  const f=(x,d)=>{if(x===0)return '0';const a=Math.abs(x);return a>=100||a<0.001?x.toExponential(1):x.toFixed(d==null?3:d)};
  function bar(val,scale,col){const w=Math.min(50,Math.abs(val)/scale*50);const l=val>=0?50:50-w;
    return '<div class="mb"><div class="z"></div><div class="f" style="left:'+l+'%;width:'+w+'%;background:'+col+'"></div><div class="t">'+f(val,2)+'</div></div>'}
  let A,Bo;
  function compute(){A=trace(corr,b2);Bo=trace(!corr,b2)}
  function draw(i){const t=i+1;
    // scales fixed over the whole run and both modes, so bars are to scale while the animation runs
    let h='<div class="lane"><span class="h">parameter</span><span class="h">gradient g</span><span class="h">'+(corr?'m̂ (corrected)':'m (raw)')+'</span><span class="h">'+(corr?'√v̂ (corrected)':'√v (raw)')+'</span><span class="h">step ÷ lr</span></div>';
    P.forEach((p,k)=>{const s=A[k][i];const all=A[k].concat(Bo[k]);const sg=Math.max(...all.map(x=>Math.abs(x.g)))||1,sm=Math.max(...all.map(x=>Math.abs(x.mh)))||1,ss=Math.max(...all.map(x=>x.sv))||1;
      h+='<div class="lane"><span><b>'+p.n+'</b><br><span class="mute small">'+p.d+'</span></span>'+bar(s.g,sg,p.c)+bar(s.mh,sm,p.c)+bar(s.sv,ss,p.c)+bar(s.st,7,p.c)+'</div>'});
    host.innerHTML=h;
    const c1=1-Math.pow(B1,t),c2=1-Math.pow(b2,t);
    cnt.innerHTML=RD.stat('step t',t,'of '+N)+RD.stat('1 − β₁ᵗ',c1.toFixed(3),'the share of m that is real data')+RD.stat('1 − β₂ᵗ',c2.toFixed(4),'the share of v that is real data')+
      RD.stat('steady parameter\'s step',f(A[0][i].st,2)+' × lr',corr?'corrected':'uncorrected: (1 − β₁ᵗ)/√(1 − β₂ᵗ)');
    let tx;
    if(t===1)tx=corr?'Both averages start at zero, so after one step m = 0.1g and v = '+f(1-b2,3)+'g². Dividing by 1 − βᵗ undoes that exactly: m̂ = g, v̂ = g², and every parameter moves by exactly lr times the sign of its gradient, whether the gradient is 0.01 or 1. That is why the first steps need warmup: the size of the move says nothing yet about the gradient.'
      :'Without correction the first step is m/√v = 0.1/√'+f(1-b2,3)+' = '+f(0.1/Math.sqrt(1-b2),2)+' times lr. With β₂ = 0.999 that is 3.16 lr; with 0.95 it is 0.45 lr, too small rather than too large.';
    else if(t<=12)tx=corr?'The corrected step of the steady parameter stays at exactly 1 × lr: m̂ and √v̂ are both 0.01. The noisy parameter\'s step is large and erratic because v̂ is still an average of '+t+' squares.'
      :'The raw m fills in at rate 1 − 0.9ᵗ but v only at 1 − β₂ᵗ. With β₂ = 0.999 the denominator lags far behind, so the steady parameter\'s step grows towards '+(b2===0.999?'its peak of 6.57 lr at step 12.':'1.10 lr at step 20.');
    else if(t===11||t===21||t===31)tx='The sparse parameter receives its gradient again: its step is now '+f(A[2][i].st,2)+' lr against '+f(A[2][0].st,2)+' lr on step 1, because its m and v still remember the earlier spikes. Infrequent gradients need a long memory in v (β₂ near 1), which the Adam paper names as exactly the case where an uncorrected v starts far too small.';
    else tx=corr?'The corrected estimates are unbiased averages of the gradients seen so far; the steady parameter has moved exactly lr per step from the start. Correction removes the bias, not the noise: with few samples v̂ is still noisy, which is what warmup protects against.'
      :'Uncorrected, the steady parameter still moves '+f(A[0][i].st,2)+' lr per step at step '+t+'. With β₂ = 0.999 it would still be 3.24 lr at step 100 and 1.26 lr at step 1,000: the bias lasts for thousands of steps.';
    cap.innerHTML='<div class="t">Step '+t+(corr?', Adam as published':', bias correction removed')+'</div><p>'+tx+'</p>';
    plot(i)}
  function plot(i){const W=RD.width(svg.parentNode),H=200,ml=34,mr=14,mt=10,mb=26;const x=t=>ml+(t-1)/(N-1)*(W-ml-mr),y=v=>mt+(1-Math.min(7,Math.abs(v))/7)*(H-mt-mb);
    let s='';for(let v=0;v<=7;v++){s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/><text x="'+(ml-5)+'" y="'+(y(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+v+'</text>'}
    [1,10,20,30,40].forEach(t=>{s+='<text x="'+x(t)+'" y="'+(H-8)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+t+'</text>'});
    P.forEach((p,k)=>{const pa=(arr,upto)=>arr.slice(0,upto).map((q,j)=>(j?'L':'M')+x(j+1).toFixed(1)+','+y(q.st).toFixed(1)).join('');
      s+='<path d="'+pa(Bo[k],N)+'" fill="none" stroke="'+p.c+'" stroke-width="1.3" stroke-dasharray="4 3" opacity=".55"/>';
      s+='<path d="'+pa(A[k],i+1)+'" fill="none" stroke="'+p.c+'" stroke-width="2.2"/>'});
    s+='<line x1="'+x(i+1)+'" x2="'+x(i+1)+'" y1="'+mt+'" y2="'+(H-mb)+'" stroke="var(--mute)" stroke-dasharray="2 3"/>';
    svg.setAttribute('viewBox','0 0 '+W+' '+H);svg.setAttribute('width',W);svg.setAttribute('height',H);svg.innerHTML=s}
  compute();
  const an=RD.anim({card:'bc-card',ctl:'bc-ctl',n:N,ms:900,draw,label:'Adam step'});
  document.querySelectorAll('#bc-mode button').forEach(b=>b.addEventListener('click',()=>{corr=b.dataset.v==='1';document.querySelectorAll('#bc-mode button').forEach(x=>x.classList.toggle('on',x===b));compute();an.redraw()}));
  document.querySelectorAll('#bc-b2 button').forEach(b=>b.addEventListener('click',()=>{b2=+b.dataset.v;document.querySelectorAll('#bc-b2 button').forEach(x=>x.classList.toggle('on',x===b));compute();an.redraw()}));
  addEventListener('resize',()=>an.redraw());
})();
