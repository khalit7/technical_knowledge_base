// ---- Reading s3: one warp's sum by shuffles against shared memory + barriers (same input); steps explained by #sx-sh-shfl and #sx-sh-smem ----
(function(){
  const fig=document.getElementById('pm-sh-fig');if(!fig)return;
  const cnt=document.getElementById('pm-sh-cnt');
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
    cnt.innerHTML=RD.stat('SHFL',c.SHFL)+RD.stat('LDS (shared loads)',c.LDS)+RD.stat('STS (shared stores)',c.STS)+RD.stat('BAR (barriers)',c.BAR)}
  const A=RD.anim({card:'pm-sh-card',ctl:'pm-sh-ctl',list:'sx-sh-shfl',n:6,draw,label:'Reduction step'});
  // a mode toggle swaps the step list on the left (#sx-sh-shfl, #sx-sh-smem) and replays from the start
  RD.seg(document.getElementById('pm-sh-mode'),m=>{mode=m;['shfl','smem'].forEach(x=>{document.getElementById('sx-sh-'+x).hidden=x!==m});A.reset(6,'sx-sh-'+m)});
  RD.onResize(()=>A.redraw());
})();
