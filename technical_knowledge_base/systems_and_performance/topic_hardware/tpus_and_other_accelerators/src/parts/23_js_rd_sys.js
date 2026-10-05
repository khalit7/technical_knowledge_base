// ---- Reading, section 1: one small matmul through a systolic array, against scalar lanes ----
(function(){
  const card=document.getElementById('rd-sys-card');if(!card)return;
  // The animated case is case 0 of src/out/systolic_ref.json (seeded; check_sim.mjs compares)
  const X=[[2,1,2,3],[1,1,3,1],[2,3,1,3],[1,1,1,2],[2,1,1,1]];
  const W=[[3,2,1,3],[1,1,3,3],[3,1,3,3],[2,1,1,1]];
  const M=5,K=4,N=4,LANES=16,RF_PJ=6;
  const sim=SYS.simulate(X,W);const T=sim.cycles;
  let mode='sys';
  // lanes schedule: output index r*16+i for lane i in round r, one k per step
  const rounds=Math.ceil(M*N/LANES);
  const nSteps=()=>mode==='sys'?K+T+1:rounds*K+1;
  const svgEl=document.getElementById('rd-sys-svg'),cap=document.getElementById('rd-sys-cap'),cnt=document.getElementById('rd-sys-cnt');
  const C=v=>'var(--'+v+')';
  function cell(x,y,s,fill,stroke,txt,sub,o){o=o||{};
    let h='<rect x="'+x+'" y="'+y+'" width="'+s+'" height="'+s+'" rx="3" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+(o.sw||1)+'"/>';
    if(txt!==''&&txt!=null)h+=RD.t(x+s/2,sub!=null?y+s*0.46:y+s/2+4,txt,{a:'middle',fs:o.fs||Math.max(9,Math.round(s*0.36)),w:o.w,fill:o.fill});
    if(sub!=null)h+=RD.t(x+s-3,y+s-3,sub,{a:'end',fs:Math.max(7,Math.round(s*0.24)),fill:C('mute')});
    return h}
  function counters(c){cnt.innerHTML=RD.stat('Cycles',c.cyc,c.cycd)+RD.stat('Multiply-adds done',c.macs+' of 80','')+
    RD.stat('Operand reads from storage',c.reads,c.readd)+RD.stat('Hand-offs to a neighbour',c.pass,'short wires, no storage port')+
    RD.stat('Unit utilisation so far',c.cyc?Math.round(100*c.macs/(16*c.cyc))+'%':'n/a','multiply-adds / (16 units x cycles)')}
  function capt(t,p){cap.innerHTML='<div class="t">'+t+'</div><p>'+p+'</p>'}
  function drawSys(i){
    const w=RD.width(svgEl);const q=M+K-1;// queue columns on the left
    const s=Math.max(22,Math.min(50,Math.floor((w-24)/(q*0.72+N+0.5))));const qs=Math.round(s*0.72);const gx=8+q*qs+s*0.5,gy=22;
    let h=RD.t(gx+N*s-2,14,'array: weights stay',{a:'end',fs:11,fill:C('mute')})+RD.t(8,14,'X enters here',{fs:11,fill:C('mute')});
    let load=Math.min(i,K),t=i-K;const fr=(t>=0&&t<T)?sim.frames[t]:null;
    for(let k=0;k<K;k++)for(let n=0;n<N;n++){
      const loaded=(k>=K-load);const pe=fr&&fr.pe[k][n];
      const fill=pe?C('acc2'):(loaded?C('soft'):C('bg'));
      h+=cell(gx+n*s,gy+k*s,s-2,fill,pe?C('acc'):C('line'),pe?pe.s:'',loaded?'w'+W[k][n]:null,{w:pe?600:400});
    }
    // inputs waiting in the skewed queue
    const tt=Math.max(t,-1);
    for(let k=0;k<K;k++)for(let m=0;m<M;m++){const due=m+k;const d=due-tt-(fr?0:0);
      if(t<T&&due>tt){const x=gx-(due-tt)*qs;if(x>=4)h+=cell(x,gy+k*s+(s-qs)/2+1,qs-4,C('bg'),C('c2'),X[m][k],null,{fs:Math.max(9,Math.round(s*0.3)),fill:C('c2')})}}
    // outputs below
    const oy=gy+K*s+16;h+=RD.t(gx-6,oy+14,'Y leaves the bottom',{a:'end',fs:11,fill:C('mute')});
    const seen={};for(let tt2=0;tt2<=Math.min(t,T-1);tt2++)sim.frames[tt2].out.forEach(o=>seen[o[0]+','+o[1]]=o[2]);
    const os=Math.max(18,Math.round(s*0.7));
    for(let m=0;m<M;m++)for(let n=0;n<N;n++){const v=seen[m+','+n];h+=cell(gx+n*s+(s-os)/2,oy+4+m*(os+2),os-2,v!=null?C('open2'):C('bg'),C('line'),v!=null?v:'',null,{fs:Math.max(9,Math.round(os*0.42))})}
    const H=oy+4+M*(os+2)+6;svgEl.innerHTML=RD.svg(Math.max(w,gx+N*s+4),H,h,'Systolic array animation');
    // counters
    const tc=Math.max(0,Math.min(t+1,T));let macs=0,edge=0,pass=0;for(let j=0;j<tc;j++){macs+=sim.frames[j].act;edge+=sim.frames[j].edge;pass+=sim.frames[j].pass}
    const reads=edge+K*Math.max(0,Math.min(load,K))*N/K*1;// weights: one row of N per load cycle
    counters({cyc:load+tc,cycd:'4 to load weights, then 11 to stream',macs:macs,reads:reads,readd:'weights '+(load*N)+', inputs '+edge,pass:pass});
    if(i<K)capt('Load the weights: cycle '+(i+1)+' of 4','The 4 x 4 weight tile shifts into the array one row per cycle and then stays put for every row of X that follows. Each weight is read from storage once.');
    else if(t<T){const f=fr;capt('Cycle '+(t+1)+' of '+T+': '+f.act+' of 16 cells busy','Inputs move one cell right per cycle, partial sums one cell down. '+(t<K-1?'The wave is still filling the array (the skew: row k of X starts k cycles late). ':t>T-K?'The wave is draining: the last rows are finishing. ':'The diagonal wavefront is in full flow. ')+(f.out.length?f.out.length+' finished output'+(f.out.length>1?'s':'')+' leave'+(f.out.length>1?'':'s')+' the bottom this cycle.':'Nothing has reached the bottom yet.'))}
    else capt('Done: 80 multiply-adds in 15 cycles, 36 reads','Every input was read once at the left edge (20 reads) and every weight once (16 reads); the other 120 moves were hand-offs between neighbouring cells. At this tiny size the fill and drain waste two thirds of the cycles; with 8,192 rows they would waste under 0.1%.');
  }
  function drawLanes(i){
    const w=RD.width(svgEl);const s=Math.max(26,Math.min(48,Math.floor((w-110)/4)));const gx=104,gy=22;
    const r=Math.min(Math.floor(i/K),rounds-1),kk=i-r*K,fin=i>=rounds*K;
    let h=RD.t(gx,14,'16 lanes, each owns one output',{fs:11,fill:C('mute')})+
      '<rect x="6" y="'+(gy)+'" width="78" height="'+(4*s-2)+'" rx="6" fill="'+C('soft')+'" stroke="'+C('c2')+'"/>'+RD.t(45,gy+2*s-8,'register',{a:'middle',fs:11})+RD.t(45,gy+2*s+7,'file',{a:'middle',fs:11})+RD.t(45,gy+2*s+22,'2 reads per',{a:'middle',fs:10,fill:C('mute')})+RD.t(45,gy+2*s+34,'lane per cycle',{a:'middle',fs:10,fill:C('mute')});
    const done={};let macs=0,reads=0;
    const upto=fin?rounds*K:i+1;
    for(let st=0;st<upto;st++){const rr=Math.floor(st/K),k=st-rr*K;for(let l=0;l<LANES;l++){const idx=rr*LANES+l;if(idx>=M*N)continue;macs++;reads+=2;
      const m=Math.floor(idx/N),n=idx%N;done[idx]=(done[idx]||0)+X[m][k]*W[k][n]}}
    for(let l=0;l<LANES;l++){const idx=r*LANES+l,on=!fin&&idx<M*N;const m=Math.floor(idx/N),n=idx%N;
      h+=cell(gx+(l%4)*s,gy+Math.floor(l/4)*s,s-2,on?C('acc2'):C('bg'),on?C('acc'):C('line'),on?done[idx]:'',on?('y'+m+n):null,{w:on?600:400});
      if(on)h+='<line x1="84" y1="'+(gy+2*s)+'" x2="'+(gx+(l%4)*s)+'" y2="'+(gy+Math.floor(l/4)*s+s/2)+'" stroke="'+C('c2')+'" stroke-opacity=".25"/>'}
    const oy=gy+4*s+16;h+=RD.t(gx-6,oy+14,'Y',{a:'end',fs:11,fill:C('mute')});
    const os=Math.max(18,Math.round(s*0.7));
    for(let m=0;m<M;m++)for(let n=0;n<N;n++){const idx=m*N+n;const rr=Math.floor(idx/LANES);const ok=fin||rr<r||(rr===r&&kk===K-1);
      h+=cell(gx+n*s+(s-os)/2,oy+4+m*(os+2),os-2,ok?C('open2'):C('bg'),C('line'),ok?sim.Y[m][n]:'',null,{fs:Math.max(9,Math.round(os*0.42))})}
    const H=oy+4+M*(os+2)+6;svgEl.innerHTML=RD.svg(Math.max(w,gx+4*s+4),H,h,'Scalar lanes animation');
    const cyc=fin?rounds*K:i+1;
    counters({cyc:cyc,cycd:'2 rounds of 4 steps',macs:macs,reads:reads,readd:'x and w for every multiply-add',pass:0});
    if(fin)capt('Done: 80 multiply-adds in 8 cycles, 160 reads','Faster here, because there is no fill and drain, but every multiply-add fetched both operands from the register file: 160 reads against the array\'s 36. At about 6 pJ per register-file access against about 2 pJ for the multiply-add itself (45 nm, Horowitz 2014), the reads cost more energy than the arithmetic. At 8,192 rows the gap grows to about 250 times fewer reads per multiply-add for the array.');
    else capt('Round '+(r+1)+' of 2, step '+(kk+1)+' of 4',(r===0?'Lanes 1 to 16 own outputs y00 to y33. ':'Only 4 outputs are left, so 12 of the 16 lanes idle. ')+'Each lane reads x and w from the register file, multiplies and adds into its own accumulator. Nothing passes between lanes.');
  }
  const A=RD.anim({card:'rd-sys-card',ctl:'rd-sys-ctl',n:nSteps(),ms:1100,label:'Animation step',draw:i=>mode==='sys'?drawSys(i):drawLanes(i)});
  RD.seg(document.getElementById('rd-sys-mode'),m=>{mode=m;A.reset(nSteps());A.play()});
  RD.onResize(()=>A.redraw());
  window.__tpuRdSys={Y:sim.Y,cycles:sim.cycles,passes:sim.passes,active:sim.active};
})();
