// ---- Section 7: ten commands, fresh connections against one master, each bar a recorded run, to scale.
(function(){
  const M=SSHD.mux,fresh=M['gpu-node-01 via bastion, fresh each time'].runs_ms,first=M['gpu-node-01 first (creates master)'].ms,reuse=M['gpu-node-01 via existing master'].runs_ms;
  const lanes={fresh:fresh.slice(0,10),mux:[first].concat(reuse.slice(0,9))};
  const fig=document.getElementById('mux-fig'),cap=document.getElementById('mux-cap'),out=document.getElementById('mux-out');let mode='both';
  const T=Math.max(lanes.fresh.reduce((a,b)=>a+b,0),lanes.mux.reduce((a,b)=>a+b,0));
  function draw(i){
    const w=Math.min(RD.width(fig),820),narrow=w<520,lab=narrow?0:120,bw=w-lab-10;const show=mode==='both'?['fresh','mux']:[mode];let s='',y=4;
    const sum={};show.forEach(k=>{let x=0;const rows=lanes[k];if(narrow){s+=RD.t(0,y+10,k==='fresh'?'fresh each time':'through the master',{fs:11.5,w:600});y+=14}else s+=RD.t(lab-8,y+16,k==='fresh'?'fresh each time':'through the master',{fs:11.5,a:'end',w:600});
      let tot=0;rows.forEach((v,j)=>{const on=j<=i;const ww=bw*v/T;if(on)tot+=v;s+='<rect x="'+(lab+x)+'" y="'+y+'" width="'+Math.max(1,ww-1)+'" height="22" rx="2" fill="'+(k==='fresh'?'var(--c2)':(j===0?'var(--c4)':'var(--c3)'))+'" opacity="'+(on?(j===i?1:.7):.12)+'"/>';
        if(ww>28&&on)s+=RD.t(lab+x+ww/2,y+15,Math.round(v),{a:'middle',fs:10,fill:'var(--bg)'});x+=ww});
      sum[k]=tot;y+=34});
    s+=RD.t(lab,y+8,'0',{fs:10,fill:'var(--mute)'})+RD.t(lab+bw,y+8,(T/1000).toFixed(1)+' s',{fs:10,fill:'var(--mute)',a:'end'});
    fig.innerHTML=RD.svg(w,y+14,s,'Ten ssh commands, fresh against multiplexed, to scale');
    const k=i+1;cap.innerHTML='<div class="t">Command '+k+' of 10</div><p>'+(i===0?'The first multiplexed command does a full login and leaves the master running ('+Math.round(first)+' ms); the fresh lane pays a full login through the bastion every time.':'Fresh: TCP, key exchange and authentication with the bastion, then again with the node ('+Math.round(lanes.fresh[i])+' ms this run). Multiplexed: one new channel on the master, one round trip to the bastion ('+Math.round(lanes.mux[i])+' ms).')+'</p>';
    out.innerHTML=(sum.fresh!=null?RD.stat('Fresh, elapsed',(sum.fresh/1000).toFixed(2)+' s',k+' commands'):'')+(sum.mux!=null?RD.stat('Multiplexed, elapsed',(sum.mux/1000).toFixed(2)+' s',k+' commands'):'')+(sum.fresh!=null&&sum.mux!=null?RD.stat('Ratio',(sum.fresh/sum.mux).toFixed(1)+'×','fresh / multiplexed'):'');
  }
  const A=RD.anim({card:'mux-card',ctl:'mux-ctl',n:10,draw,ms:900,label:'Command'});
  RD.seg(document.getElementById('mux-seg'),m=>{mode=m;A.redraw()});RD.onResize(()=>A.redraw());
})();
