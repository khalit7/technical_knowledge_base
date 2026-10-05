// ---- GEMM scheduler tab (t-sched): data-parallel, split-K, Stream-K and hybrid on P SMs ----
// The model (window.GS.plan) is mirrored in recompute.py (sched_plan) and checked by check/check_page.mjs.
window.GS=(function(){
  // returns {T, I, P, time, util, segs: per SM list of [start, len, tile], extraBytes, units}
  function plan(M,N,K,bm,bn,P,sch){
    const BK=64,T=Math.ceil(M/bm)*Math.ceil(N/bn),I=Math.ceil(K/BK);
    const segs=Array.from({length:P},()=>[]);let time=0,extra=0,units=T;
    const put=(sm,start,len,tile)=>{segs[sm].push([start,len,tile]);time=Math.max(time,start+len)};
    if(sch==='dp'){for(let t=0;t<T;t++)put(t%P,Math.floor(t/P)*I,I,t)}
    else if(sch.startsWith('sk')){const s=Math.min(+sch.slice(2),I),each=Math.ceil(I/s);units=T*s;
      for(let u=0;u<units;u++){const t=Math.floor(u/s),part=u%s,len=Math.min(each,I-part*each);if(len<=0)continue;put(u%P,Math.floor(u/P)*each,len,t)}
      extra=s>1?T*s*bm*bn*4*2:0}
    else{ // Stream-K over all tiles, or over the tiles left after the full data-parallel waves
      let dpw=0;if(sch==='hybrid'){const full=Math.floor(T/P);dpw=T%P===0?full:Math.max(0,full-1)}
      for(let t=0;t<dpw*P;t++)put(t%P,Math.floor(t/P)*I,I,t);
      const t0=dpw*P,W=(T-t0)*I;let partial=0;
      if(W>0){const per=Math.ceil(W/P);const base=dpw*I;
        for(let sm=0;sm<P;sm++){let a=sm*per,b=Math.min(W,a+per);let clock=base;
          while(a<b){const tile=Math.floor(a/I),off=a%I,len=Math.min(I-off,b-a);put(sm,clock,len,t0+tile);if(len<I)partial++;clock+=len;a+=len}}}
      extra=partial*bm*bn*4*2}
    const util=T*I/(P*time);
    return {T,I,P,time,util,segs,extra,units};
  }
  return {plan};
})();
(function(){
  const $=id=>document.getElementById(id),esc=RD.esc;
  const PRE=[
    ['NVIDIA example: A100, 2304 x 1536, 256 x 128 tiles',108,'256x128','dp',2304,1536,4096],
    ['NVIDIA example + 8 columns: 2304 x 1544',108,'256x128','dp',2304,1544,4096],
    ['Running example on an H100: 8192 x 14336 x 4096',132,'128x256','dp',8192,14336,4096],
    ['Square, long K: 1024 x 1024 x 16384, data-parallel',132,'128x256','dp',1024,1024,16384],
    ['Same, split-K 4 ways',132,'128x256','sk4',1024,1024,16384],
    ['Same, Stream-K',132,'128x256','stream',1024,1024,16384],
    ['Just past one wave: 1536 x 1536 x 8192, 128 x 128 tiles',132,'128x128','dp',1536,1536,8192],
    ['Same, Stream-K',132,'128x128','stream',1536,1536,8192]];
  $('gs-pre').innerHTML='<option value="-1">(your own)</option>'+PRE.map((p,i)=>'<option value="'+i+'">'+esc(p[0])+'</option>').join('');
  let R=null,frac=1,playing=false,raf=0,last=0;
  function read(){const [bm,bn]=$('gs-tile').value.split('x').map(Number);
    const v=id=>Math.max(1,Math.min(+$(id).max||1e9,Math.round(+$(id).value||1)));
    return {M:v('gs-m'),N:v('gs-n'),K:Math.max(64,v('gs-k')),bm,bn,P:+$('gs-gpu').value,sch:$('gs-sch').value}}
  function compute(){const q=read();R=GS.plan(q.M,q.N,q.K,q.bm,q.bn,q.P,q.sch);R.q=q;
    const waves=R.T/q.P;
    $('gs-out').innerHTML=RD.stat('Output tiles',R.T.toLocaleString('en-US'),R.I+' K slices each')+RD.stat('Waves of tiles',waves.toFixed(2),'on '+q.P+' SMs')+
      RD.stat('SM time used',(100*R.util).toFixed(1)+'%','work / (SMs x finish time)')+RD.stat('Finish time',R.time.toLocaleString('en-US')+' iterations','')+
      RD.stat('Partial-sum traffic',R.extra?(R.extra/2**20).toFixed(1)+' MiB':'none','FP32 partial tiles, written and read');
    // all schedules compared
    const el=$('gs-cmp'),w=RD.width(el);const S=[['dp','data-parallel'],['sk2','split-K 2'],['sk4','split-K 4'],['sk8','split-K 8'],['stream','Stream-K'],['hybrid','DP + Stream-K']];
    const res=S.map(([s,n])=>[n,GS.plan(q.M,q.N,q.K,q.bm,q.bn,q.P,s),s]);const mx=Math.max(...res.map(r=>r[1].time));const lab=Math.min(110,w*0.3),bw=w-lab-110;
    let b='';res.forEach(([n,r,s],i)=>{const y=i*20+2,x=bw*r.time/mx;b+=RD.t(lab-6,y+12,n,{a:'end',fs:11,w:s===q.sch?600:400})+'<rect x="'+lab+'" y="'+y+'" width="'+Math.max(1,x).toFixed(1)+'" height="14" rx="2" fill="'+(s===q.sch?'var(--acc)':'var(--dim)')+'"/>'+RD.t(lab+x+4,y+11,(100*r.util).toFixed(0)+'% used, '+r.time+' it.',{fs:10.5})});
    el.innerHTML=RD.svg(w,res.length*20+4,b,'schedules compared');
    gantt()}
  function gantt(){if(!R)return;const el=$('gs-gantt'),w=RD.width(el);const P=R.P,rh=P>120?2:P>60?3:5,H=P*rh+18,lab=24,bw=w-lab-4;const tcur=frac*R.time;
    let b='';for(let sm=0;sm<P;sm++)R.segs[sm].forEach(([s,l,t])=>{if(s>=tcur)return;const ll=Math.min(l,tcur-s);
      b+='<rect x="'+(lab+bw*s/R.time).toFixed(2)+'" y="'+(sm*rh)+'" width="'+Math.max(0.6,bw*ll/R.time).toFixed(2)+'" height="'+Math.max(1,rh-(rh>2?1:0))+'" fill="hsl('+((t*47)%360)+',55%,55%)"/>'});
    b+='<line x1="'+(lab+bw*frac)+'" y1="0" x2="'+(lab+bw*frac)+'" y2="'+(P*rh)+'" stroke="var(--ink)" stroke-width="1"/>';
    b+=RD.t(0,10,'SM 0',{fs:9.5,fill:'var(--mute)'})+RD.t(0,P*rh,'SM '+(P-1),{fs:9.5,fill:'var(--mute)'})+RD.t(lab,H-3,'time (MAC-loop iterations) 0 to '+R.time.toLocaleString('en-US'),{fs:10.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(w,H,b,'SM timeline');$('gs-tl').textContent=Math.round(tcur).toLocaleString('en-US')+' / '+R.time.toLocaleString('en-US')}
  function setPlay(p){playing=p;$('gs-play').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';$('gs-play').setAttribute('aria-label',p?'Pause':'Play');if(p){if(frac>=1)frac=0;last=0;raf=requestAnimationFrame(step)}else cancelAnimationFrame(raf)}
  function step(ts){const tab=$('t-sched');if(!playing||tab.hidden||document.hidden){setPlay(false);return}
    if(last)frac=Math.min(1,frac+(ts-last)/4000);last=ts;$('gs-t').value=Math.round(frac*1000);gantt();if(frac>=1){setPlay(false);return}raf=requestAnimationFrame(step)}
  $('gs-play').addEventListener('click',()=>setPlay(!playing));
  $('gs-t').addEventListener('input',e=>{setPlay(false);frac=+e.target.value/1000;gantt()});
  ['gs-gpu','gs-tile','gs-sch'].forEach(id=>$(id).addEventListener('change',()=>{$('gs-pre').value='-1';frac=1;$('gs-t').value=1000;compute()}));
  ['gs-m','gs-n','gs-k'].forEach(id=>$(id).addEventListener('input',()=>{$('gs-pre').value='-1';frac=1;$('gs-t').value=1000;compute()}));
  function preset(i){const p=PRE[i];$('gs-gpu').value=String(p[1]);$('gs-tile').value=p[2];$('gs-sch').value=p[3];$('gs-m').value=p[4];$('gs-n').value=p[5];$('gs-k').value=p[6];frac=1;$('gs-t').value=1000;compute()}
  $('gs-pre').addEventListener('change',e=>{const i=+e.target.value;if(i>=0)preset(i)});
  $('gs-pre').value='3';
  const render=()=>{if(!R)preset(3);else compute()};
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-sched']=[render];
  addEventListener('resize',()=>{const t=$('t-sched');if(t&&!t.hidden&&R)compute()});
})();
