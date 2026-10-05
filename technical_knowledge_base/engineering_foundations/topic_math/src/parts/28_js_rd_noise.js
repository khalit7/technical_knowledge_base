// ---- Reading tab, section 6: one noisy evaluation against the average of many (simulated, illustrative) ----
(function(){
  const el=document.getElementById('rd-ns-svg');if(!el)return;
  const M=RDM,T=RD.t,MU=-0.1,SD=0.5;
  // seeded random numbers (mulberry32) and normal draws (Box-Muller), so the picture is the same on every visit
  let a=20261005;const rnd=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  const D=[];for(let k=0;k<200;k++){const u=Math.max(1e-12,rnd()),v=rnd(),r=Math.sqrt(-2*Math.log(u));D.push(MU+SD*r*Math.cos(2*Math.PI*v),MU+SD*r*Math.sin(2*Math.PI*v))}
  const JIT=D.map(()=>rnd());
  const SCHED=[1,2,4,8,16,32,64,100,200,400];
  let mode='many',cur=0;
  function stats(lo,n){const s=D.slice(lo,lo+n),m=s.reduce((x,y)=>x+y,0)/n;
    const sd=n>1?Math.sqrt(s.reduce((x,y)=>x+(y-m)*(y-m),0)/(n-1)):SD;return {m,sd,se:sd/Math.sqrt(n),s}}
  function draw(i){cur=i;const Wd=RD.width(el),H=200,pl=16,pr=16,X0=-2,X1=1.5,sx=v=>pl+(v-X0)/(X1-X0)*(Wd-pl-pr);
    const one=mode==='one',lo=one?i:0,n=one?1:SCHED[i],S=stats(lo,n),hw=1.96*S.se;let o='';
    for(let g=-2;g<=1.5;g+=0.5)o+='<line x1="'+sx(g)+'" y1="20" x2="'+sx(g)+'" y2="'+(H-36)+'" stroke="var(--line)"/>'+T(sx(g),H-22,(g>0?'+':'')+String(g).replace('-','−'),{a:'middle',fs:10.5,fill:'var(--mute)'});
    o+='<line x1="'+sx(0)+'" y1="16" x2="'+sx(0)+'" y2="'+(H-36)+'" stroke="var(--mute)" stroke-width="1.4"/>'+T(sx(0)+4,14,'no change',{fs:10.5,fill:'var(--mute)'});
    o+=T(pl+(Wd-pl-pr)/2,H-5,'change in loss per sentence, nats (left of 0 = better)',{a:'middle',fs:11,fill:'var(--mute)'});
    const band0=sx(Math.max(X0,S.m-hw)),band1=sx(Math.min(X1,S.m+hw));
    o+='<rect x="'+band0+'" y="26" width="'+Math.max(2,band1-band0)+'" height="'+(H-68)+'" fill="var(--c6)" opacity="0.18"/>';
    S.s.forEach((v,k)=>{const idx=lo+k;o+='<circle cx="'+sx(Math.max(X0,Math.min(X1,v)))+'" cy="'+(36+JIT[idx]*(H-88))+'" r="'+(n>100?2.2:3.2)+'" fill="var(--c6)" opacity="'+(n>100?0.55:0.85)+'"/>'});
    o+='<line x1="'+sx(S.m)+'" y1="24" x2="'+sx(S.m)+'" y2="'+(H-40)+'" stroke="var(--ink)" stroke-width="2.5"/>';
    o+='<line x1="'+sx(MU)+'" y1="'+(H-40)+'" x2="'+sx(MU)+'" y2="'+(H-30)+'" stroke="var(--c2)" stroke-width="2"/>';
    el.innerHTML=RD.svg(Wd,H,o,'Dots for per-sentence loss changes, the running mean and its 95% band');
    const excl=S.m+hw<0||S.m-hw>0,f=M.f;
    let t,p;
    if(one){t='Sentence '+(i+1)+' on its own: '+f(S.m,2)+' nats';p='One sentence’s change, with the 95% band its spread of 0.5 allows (± '+f(hw,2)+'). Step through five sentences: the single measurement jumps around, and every band covers both “better” and “worse”.'}
    else{t=n+' sentence'+(n>1?'s':'')+': average '+f(S.m,3)+' ± '+f(hw,3);p='The band is 1.96 standard errors either side of the average; the standard error is the spread divided by √'+n+'. '+(excl?'The band no longer covers 0: the improvement is real at this sample size.':'The band still covers 0: with this many sentences you cannot tell the step helped.')+' The small red tick marks the true average used to simulate, −0.1.'}
    document.getElementById('rd-ns-cap').innerHTML='<div class="t">'+t+'</div><p>'+p+'</p>';
    document.getElementById('rd-ns-cnt').innerHTML=RD.stat('sentences n',n,'')+RD.stat('average change',f(S.m,3),'nats')+
      RD.stat('standard error',f(S.se,3),n>1?'sample spread / √n':'known spread 0.5')+RD.stat('95% interval excludes 0?',excl?'yes':'no','');
  }
  const A=RD.anim({card:'rd-ns-card',ctl:'rd-ns-ctl',n:SCHED.length,draw,ms:1500,label:'Number of sentences'});
  RD.seg(document.getElementById('rd-ns-seg'),m=>{mode=m==='1'?'one':'many';A.reset(mode==='one'?5:SCHED.length);A.play()});
  RD.onResize(()=>draw(cur));
})();
