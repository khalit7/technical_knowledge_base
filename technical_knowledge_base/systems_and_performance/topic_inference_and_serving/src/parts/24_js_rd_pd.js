// ---- Reading tab, section 2: prefill against decode on the same weights (before/after animation) ----
(function(){
  const D=window.RDD.life,svgEl=document.getElementById('rd-pd-svg');if(!svgEl)return;
  const PEAK=1979e12*0.345; // FP8 dense peak x fitted compute efficiency (Capacity planner)
  const M={pre:{n:2000,fl:D.pre_fl,by:D.pre_bytes,t:D.t_pre_ms,lab:'2,000 prompt tokens'},dec:{n:1,fl:D.dec_fl,by:D.dec_bytes,t:D.t_dec_ms,lab:'1 new token'}};
  let mode='pre';const cnt=document.getElementById('rd-pd-cnt');
  // four steps per mode, explained by the step lists sx-pd-pre and sx-pd-dec: enter, the first group of ten layers, all 80, done
  const MAP=[0,1,8,9];
  function draw(j){
    const i=MAP[j],m=M[mode],w=RD.width(svgEl),h=150,g=Math.min(i,8),x0=8,W=w-16,gw=W/8;
    const busy=Math.min(1,(m.fl/PEAK*1e3)/m.t);
    let s=RDX.T(x0,12,'Weights in GPU memory: 80 layers, '+D.weights_gb+' GB',{fs:11,w:600});
    for(let k=0;k<8;k++){const read=k<g;s+=RDX.R(x0+k*gw+1,18,gw-2,22,read?'var(--c1)':'var(--soft)',{st:'var(--line)'});
      s+=RDX.T(x0+k*gw+gw/2,33,'L'+(k*10+1)+(gw>44?'-'+(k*10+10):''),{a:'middle',fs:9.5,c:read?'var(--bg)':'var(--mute)'})}
    // tokens riding through
    const tx=x0+Math.min(g,7.6)*gw+4,tw=mode==='pre'?Math.max(28,gw*0.9):10;
    if(i>0&&i<9){s+=RDX.R(Math.min(tx,w-8-tw),48,tw,16,mode==='pre'?'var(--c2)':'var(--c3)');}
    s+=RDX.T(x0,78,(mode==='pre'?'Riding on this read: ':'Riding on this read: ')+m.lab,{fs:11});
    // chip busy bar
    s+=RDX.T(x0,104,'Arithmetic units busy',{fs:11,w:600});
    s+=RDX.R(x0,110,W,16,'var(--soft)',{st:'var(--line)'});
    if(i>0)s+=RDX.R(x0,110,W*busy,16,mode==='pre'?'var(--c2)':'var(--c3)');
    if(i>0)s+=RDX.T(x0+Math.max(W*busy,0)+4>w-60?w-12:x0+W*busy+4,122,(busy*100).toFixed(busy<0.1?1:0)+'%',{fs:11,w:600,a:x0+W*busy+4>w-60?'end':'start',c:x0+W*busy+4>w-60?'var(--bg)':'var(--ink)'});
    s+=RDX.T(x0,142,'Operations per byte read: '+(mode==='pre'?RDX.nf(D.pre_int):RDX.nf(D.dec_int,1))+' (the H200 balances at '+RDX.nf(D.ridge)+')',{fs:10.5,c:'var(--mute)'});
    svgEl.innerHTML=RD.svg(w,h,s,'Weights read layer group by layer group, with the share of time the arithmetic units are busy');
    const f=g/8,bt=(m.t-2.5)*f+(i>=9?2.5:0);
    RDX.cnt(cnt,[['Memory read',RDX.nf(m.by*f/1e9,1)+' GB'],['Arithmetic',m.fl*f>=1e12?RDX.nf(m.fl*f/1e12,1)+' TFLOP':RDX.nf(m.fl*f/1e9)+' GFLOP'],['Time',RDX.nf(bt,1)+' ms'],['Tokens done',i>=9?RDX.nf(m.n):'0']]);
  }
  const A=RD.anim({card:'rd-pd-card',ctl:'rd-pd-ctl',n:4,draw,ms:4200,label:'Prefill or decode step',list:'sx-pd-pre'});
  RD.seg(document.getElementById('rd-pd-mode'),v=>{mode=v;document.getElementById('sx-pd-pre').hidden=v!=='pre';document.getElementById('sx-pd-dec').hidden=v!=='dec';A.reset(4,'sx-pd-'+v)});
  RD.onResize(()=>A.redraw());
})();
