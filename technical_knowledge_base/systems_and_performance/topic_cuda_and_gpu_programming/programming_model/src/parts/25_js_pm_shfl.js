// ---- Reading s3: one warp's sum by shuffles against shared memory + barriers (same input) ----
(function(){
  const fig=document.getElementById('pm-sh-fig');if(!fig)return;
  const cap=document.getElementById('pm-sh-cap'),cnt=document.getElementById('pm-sh-cnt');
  const OFF=[16,8,4,2,1];
  // precompute every step's values for both modes
  function shflSteps(){const st=[{v:Array.from({length:32},(_,i)=>i+1),act:[],note:0}];
    OFF.forEach((o,s)=>{const p=st[st.length-1].v,v=p.map((x,l)=>x+(l+o<32?p[l+o]:p[l]));st.push({v,off:o,s:s+1})});return st}
  function smemSteps(){const st=[{v:Array.from({length:32},(_,i)=>i+1),s:0}];
    OFF.forEach((k,s)=>{const p=st[st.length-1].v,v=p.slice();for(let t=0;t<k;t++)v[t]=p[t]+p[t+k];st.push({v,off:k,s:s+1})});return st}
  const D={shfl:shflSteps(),smem:smemSteps()};
  window.PM_SH=D; // checked by the page test: lane 0 ends at 528 in both modes
  let mode='shfl';
  function counters(i){if(mode==='shfl')return {SHFL:i,LDS:0,STS:0,BAR:0};
    return {SHFL:0,LDS:i?2*i:0,STS:1+i,BAR:1+i}}
  function draw(i){
    const S=D[mode][i],W=RD.width(fig),cw=Math.max(18,Math.min(48,Math.floor((W-8)/16))),w=16*cw+8,h=2*(cw+16)+26;
    let b='';
    for(let l=0;l<32;l++){const r=l>>4,c=l&15,x=4+c*cw,y=14+r*(cw+18);
      const used=mode==='shfl'?(i===0||l<32-S.off||false):(i===0||l<(S.off||32));
      const live=i===0?true:(mode==='shfl'?l<(32>>i):l<(32>>i));
      const fill=l===0&&i===5?'var(--good)':(live?'var(--acc2)':'var(--soft)');
      b+='<rect x="'+x+'" y="'+y+'" width="'+(cw-3)+'" height="'+cw+'" rx="3" style="fill:'+fill+';stroke:var(--line)"></rect>';
      b+=RD.t(x+(cw-3)/2,y+cw/2+4,S.v[l],{a:'middle',fs:Math.min(12,cw/2.4),fill:live?'var(--ink)':'var(--mute)'});
      if(c%4===0)b+=RD.t(x,y-3,(mode==='shfl'?'lane ':'s[')+l+(mode==='shfl'?'':']'),{fs:9.5,fill:'var(--mute)'})}
    b+=RD.t(4,h-4,mode==='shfl'?'values live in registers, one per lane':'values live in shared memory s[0..31]',{fs:10.5,fill:'var(--mute)'});
    fig.innerHTML=RD.svg(w,h,b,'Thirty-two lanes and their values');
    const c=counters(i);
    let t,p;
    if(i===0){t='Start: lane i holds i + 1';p=mode==='shfl'?'Each lane has one value in a register. Sum = 528.':'Each thread stores its value into shared memory (1 STS), then the block waits at __syncthreads() (1 BAR) so every store is visible.'}
    else if(mode==='shfl'){t='Shuffle '+i+' of 5: add the value '+S.off+' lanes away';p='v += __shfl_down_sync(0xffffffff, v, '+S.off+'). Lanes '+(32-S.off)+' to 31 have no lane '+S.off+' above them and get their own value back; their results are never used. Lanes 0 to '+((32>>i)-1)+' carry the partial sums.'+(i===5?' Lane 0 now holds 528: five instructions, no memory, no barrier.':'')}
    else{t='Level '+i+' of 5: threads 0 to '+(S.off-1)+' add s[t + '+S.off+']';p='Two shared-memory loads and one store per thread, then __syncthreads() so the next level reads finished values.'+(i===5?' s[0] = 528 after 10 loads, 6 stores and 6 barriers (reading the result is one more load).':'')}
    cap.innerHTML='<div class="t">'+t+'</div><p>'+p+'</p>';
    cnt.innerHTML=RD.stat('SHFL',c.SHFL)+RD.stat('LDS (shared loads)',c.LDS)+RD.stat('STS (shared stores)',c.STS)+RD.stat('BAR (barriers)',c.BAR)}
  const A=RD.anim({card:'pm-sh-card',ctl:'pm-sh-ctl',n:6,draw,ms:1500,label:'Reduction step'});
  RD.seg(document.getElementById('pm-sh-mode'),m=>{mode=m;A.reset(6);A.play()});
  RD.onResize(()=>A.redraw());
})();
