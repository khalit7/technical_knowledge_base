// ---- Attention schedules (t-fa) ----
// Part 1: split-K against split-Q inside one block. Part 2: a list-scheduling model of FlashAttention-3's overlap.
window.WKFA=(function(){
  const Br=64,Bc=64,d=128,nw=4;
  // per-iteration shared-memory traffic and barriers, in values, from the tile shapes
  function split(m){
    const kv=2*Bc*d;  // one K tile and one V tile
    const st=[];
    st.push({cap:'The K and V tiles ('+Bc+' keys, d = '+d+') are copied from global into shared memory; every warp waits at a barrier.',w:kv,r:0,b:1,show:'load'});
    if(m==='q'){
      st.push({cap:'Each warp multiplies its own 16 query rows (held in registers since the start) by all 64 keys: S for its rows is complete. It reads the whole K tile from shared memory.',w:0,r:Bc*d*nw,b:0,show:'s'});
      st.push({cap:'Each warp runs the online softmax on its own complete rows: the row maxima and sums never leave the warp.',w:0,r:0,b:0,show:'p'});
      st.push({cap:'Each warp multiplies its P (16 x 64) by the whole V tile into its own 16 rows of O, kept in registers. No warp needs another warp\'s result.',w:0,r:Bc*d*nw,b:0,show:'o'});
    }else{
      st.push({cap:'Each warp multiplies all 64 query rows by its own quarter of the keys (16): every warp holds a slice of every row of S. Q is read by every warp.',w:0,r:Bc/nw*d*nw+Br*d*nw,b:0,show:'s'});
      st.push({cap:'A row\'s maximum spans all four warps: each writes its 64 partial maxima to shared memory, waits, and reads the other three.',w:Br*nw,r:Br*nw*nw,b:1,show:'p'});
      st.push({cap:'Each warp multiplies its slice of P (64 x 16) by its quarter of V: a partial O for every row (64 x 128) and a partial row sum.',w:0,r:Bc/nw*d*nw,b:0,show:'o'});
      st.push({cap:'"All warps need to write their intermediate results out to shared memory, synchronize, then add up" (FA-2, section 3.3): four partial outputs of 64 x 128, plus row sums.',w:nw*Br*(d+1),r:nw*Br*(d+1),b:1,show:'m'});
    }
    return st}
  // Part 2: list scheduling on two pipes (tensor cores 'tc', exponential units 'sfu'). Each warpgroup issues its
  // tasks in program order. In order: a task starts after the previous one of its warpgroup ends. Pipelined: after
  // the previous one starts, if its inputs are ready. Inputs: softmax j needs GEMM0 j; GEMM1 j needs softmax j and
  // GEMM1 j-1 (same accumulator); GEMM0 j needs softmax j-2 (two S buffers). Each pipe runs one task at a time.
  function schedule(mode,r,total){
    const wg=(mode==='pp'||mode==='both')?2:1, per=total/wg, pipe=(mode==='ip'||mode==='both');
    const dur={G0:1,SM:2*r,G1:1}, res={G0:'tc',SM:'sfu',G1:'tc'};
    const prog=[];for(let g=0;g<wg;g++){const L=[];
      if(!pipe){for(let j=0;j<per;j++)L.push(['G0',j],['SM',j],['G1',j])}
      else{L.push(['G0',0]);for(let j=0;j<per;j++){if(j+1<per)L.push(['G0',j+1]);L.push(['SM',j],['G1',j])}}
      prog.push(L)}
    const done={},free={tc:0,sfu:0},ptr=prog.map(()=>0),lastS=prog.map(()=>0),lastE=prog.map(()=>0),out=[];
    function deps(g,k,j){const D=[];if(k==='SM')D.push('G0'+j);if(k==='G1'){D.push('SM'+j);if(j>0)D.push('G1'+(j-1))}if(k==='G0'&&j>=2)D.push('SM'+(j-2));
      let t=0;for(const q of D){const v=done[g+q];if(v===undefined)return null;t=Math.max(t,v)}return t}
    for(let guard=0;guard<1000;guard++){
      let best=null;
      prog.forEach((L,g)=>{if(ptr[g]>=L.length)return;const [k,j]=L[ptr[g]];const dt=deps(g,k,j);if(dt===null)return;
        const st=Math.max(dt,pipe?lastS[g]:lastE[g],free[res[k]]);
        if(best===null||st<best.st)best={g,k,j,st}});
      if(!best)break;
      const {g,k,j,st}=best,en=st+dur[k];
      done[g+k+j]=en;free[res[k]]=en;lastS[g]=st;lastE[g]=en;ptr[g]++;out.push({g,k,j,st,en,res:res[k]})}
    const end=Math.max(...out.map(t=>t.en)),tc=out.filter(t=>t.res==='tc').reduce((q,t)=>q+t.en-t.st,0);
    return {tasks:out,end,util:tc/end,wg}}
  return {split,schedule,Br,Bc,d,nw};
})();
(function(){
  const F=window.WKFA;
  // ---------- part 1 drawing
  const fig1=document.getElementById('fa-fig1'),cap1=document.getElementById('fa-cap1'),cnt1=document.getElementById('fa-cnt1');
  let m1='k',S1=F.split(m1);
  const WC=['var(--c1)','var(--c3)','var(--c2)','var(--c4)'];
  function draw1(i){
    const W=Math.min(700,RD.width(fig1)),H=170,g=Math.min(30,(W-40)/12),x0=10,y0=26;
    const step=i>0?S1[i-1]:null,show=step?step.show:'';
    let s=RD.t(x0,14,'S tile, 64 x 64, by warp',{fill:'var(--mute)'});
    for(let r=0;r<4;r++)for(let c=0;c<4;c++){const w=m1==='q'?r:c;const on=i>=2;
      s+='<rect x="'+(x0+c*g)+'" y="'+(y0+r*g)+'" width="'+(g-2)+'" height="'+(g-2)+'" rx="2" fill="'+(on?WC[w]:'var(--soft)')+'" opacity="'+(on?0.75:1)+'" stroke="var(--line)"/>'}
    s+=RD.t(x0,y0+4*g+14,m1==='q'?'rows split: warp w owns rows 16w..16w+15':'keys split: warp w owns keys 16w..16w+15',{fill:'var(--mute)',fs:10});
    // shared memory box and O box
    const bx=x0+4*g+24,bw=Math.max(80,(W-bx-10)/2-8);
    const smUse=show==='load'||show==='p'&&m1==='k'||show==='m';
    s+='<rect x="'+bx+'" y="'+y0+'" width="'+bw+'" height="'+(4*g-2)+'" rx="4" fill="'+(smUse?'var(--hl)':'var(--soft)')+'" stroke="var(--line)"/>'+RD.t(bx+6,y0+14,'shared memory',{fs:10,w:600});
    s+=RD.t(bx+6,y0+30,'K, V tile'+(i>=1?' (loaded)':''),{fs:10});
    if(m1==='k'&&i>=3)s+=RD.t(bx+6,y0+46,'row maxima x 4 warps',{fs:10,fill:'var(--c2)'});
    if(m1==='k'&&i>=5)s+=RD.t(bx+6,y0+62,'partial O x 4 warps',{fs:10,fill:'var(--c2)'});
    const ox=bx+bw+12,ow=Math.max(60,W-ox-10);
    s+='<rect x="'+ox+'" y="'+y0+'" width="'+ow+'" height="'+(4*g-2)+'" rx="4" fill="var(--soft)" stroke="var(--line)"/>'+RD.t(ox+6,y0+14,'O rows (registers)',{fs:10,w:600});
    for(let w=0;w<4;w++){const yy=y0+20+w*((4*g-26)/4);const full=m1==='q'?i>=4:i>=6;
      s+='<rect x="'+(ox+6)+'" y="'+yy.toFixed(1)+'" width="'+(ow-12)*(full?1:(i>=4&&m1==='k'?0.25:0))+'" height="'+((4*g-26)/4-3).toFixed(1)+'" fill="'+WC[w]+'" opacity=".7" rx="2"/>'}
    fig1.innerHTML=RD.svg(W,H,s,'Split K against split Q, step '+i);
    cap1.innerHTML='<b>'+(m1==='q'?'Split Q (FA-2)':'Split K (FA-1)')+(i?', step '+i+' of '+S1.length:'')+'.</b> '+(i?step.cap:'One loop iteration of one thread block: load a K and V tile, compute scores, softmax, multiply by V.');
    let w=0,r=0,b=0;for(let k=0;k<i;k++){w+=S1[k].w;r+=S1[k].r;b+=S1[k].b}
    cnt1.innerHTML=RD.stat('Shared memory writes',w.toLocaleString('en-US'),'values')+RD.stat('Shared memory reads',r.toLocaleString('en-US'),'values')+RD.stat('Barriers',b)+RD.stat('Exchanges between warps',m1==='k'?Math.max(0,(i>=3)+(i>=5)):0);
  }
  const A1=RD.anim({card:'fa-card1',ctl:'fa-ctl1',n:S1.length+1,draw:draw1,ms:1800,label:'Step'});
  RD.seg(document.getElementById('fa-split'),m=>{m1=m;S1=F.split(m);A1.reset(S1.length+1);A1.play()});
  // ---------- part 2: time line
  const fig2=document.getElementById('fa-fig2'),cap2=document.getElementById('fa-cap2'),cnt2=document.getElementById('fa-cnt2'),rr=document.getElementById('fa-r');
  let m2='seq',r=0.5,SC=F.schedule(m2,r,8);
  const NAMES={seq:'In order',pp:'Ping-pong',ip:'Pipelined',both:'Ping-pong + pipelined'};
  const TICKS=24;
  function draw2(i){
    const W=Math.min(760,RD.width(fig2)),L=78,R=8,lane=26,H=2*lane+50;
    const tmax=Math.max(...['seq','pp','ip','both'].map(m=>F.schedule(m,r,8).end));
    const now=SC.end*i/TICKS,x=t=>L+(W-L-R)*t/tmax;
    let s=RD.t(4,24,'Tensor cores',{fs:10})+RD.t(4,24+lane,'Exponentials',{fs:10});
    SC.tasks.forEach(t=>{if(t.st>=now)return;const y=t.res==='tc'?10:10+lane,en=Math.min(t.en,now);
      const col=t.g===0?'var(--c1)':'var(--c3)';
      s+='<rect x="'+x(t.st).toFixed(1)+'" y="'+y+'" width="'+Math.max(0.5,x(en)-x(t.st)-1).toFixed(1)+'" height="'+(lane-6)+'" rx="2" fill="'+col+'" opacity="'+(t.k==='G1'?0.6:0.9)+'"/>';
      if(x(en)-x(t.st)>22)s+=RD.t(((x(t.st)+x(en))/2).toFixed(1),y+14,({G0:'QK',SM:'exp',G1:'PV'}[t.k])+(t.j+1),{a:'middle',fs:9,fill:'var(--bg)'})});
    s+='<line x1="'+x(now).toFixed(1)+'" x2="'+x(now).toFixed(1)+'" y1="6" y2="'+(2*lane+12)+'" stroke="var(--ink)" stroke-dasharray="2 3"/>';
    for(let t=0;t<=tmax;t+=2)s+=RD.t(x(t).toFixed(1),2*lane+28,t,{a:'middle',fs:9,fill:'var(--mute)'});
    s+=RD.t(((L+W-R)/2).toFixed(1),2*lane+44,'time (one unit = one GEMM)',{a:'middle',fs:10,fill:'var(--mute)'});
    fig2.innerHTML=RD.svg(W,H,s,NAMES[m2]+' schedule');
    const busy=SC.tasks.filter(t=>t.res==='tc').reduce((q,t)=>q+Math.max(0,Math.min(t.en,now)-Math.min(t.st,now)),0);
    cap2.innerHTML='<b>'+NAMES[m2]+'.</b> '+({seq:'GEMM0, softmax, GEMM1, then the next iteration: the tensor cores wait for every softmax.',
      pp:'Two warpgroups (blue and green), each on its own query tile: while one runs its softmax, the other\'s GEMMs use the tensor cores.',
      ip:'One warpgroup issues the next iteration\'s GEMM0 before this iteration\'s softmax, so the two overlap; it needs registers for two S tiles at once.',
      both:'Both techniques together, as in FlashAttention-3.'}[m2])+(i===TICKS?' Tensor cores busy '+(100*SC.util).toFixed(0)+'% of the time.':'');
    cnt2.innerHTML=RD.stat('Time so far',now.toFixed(1),'units')+RD.stat('Tensor cores busy',now>0?(100*busy/now).toFixed(0)+'%':'0%')+RD.stat('Total time',SC.end.toFixed(1),'units, 8 iterations')+RD.stat('Warpgroups',SC.wg);
  }
  const A2=RD.anim({card:'fa-card2',ctl:'fa-ctl2',n:TICKS+1,draw:draw2,ms:300,label:'Time'});
  function table(){const rows=['seq','pp','ip','both'].map(m=>{const q=F.schedule(m,r,8);return '<tr'+(m===m2?' style="background:var(--acc2)"':'')+'><td>'+NAMES[m]+'</td><td class="num">'+q.end.toFixed(1)+'</td><td class="num">'+(100*q.util).toFixed(0)+'%</td></tr>'}).join('');
    document.getElementById('fa-tab').innerHTML='<tr><th>Schedule, softmax / GEMM = '+r.toFixed(2)+'</th><th class="num">total time (units)</th><th class="num">tensor cores busy</th></tr>'+rows}
  RD.seg(document.getElementById('fa-sched'),m=>{m2=m;SC=F.schedule(m2,r,8);A2.reset(TICKS+1);table();A2.play()});
  rr.addEventListener('input',()=>{r=+rr.value;document.getElementById('fa-rv').textContent=r.toFixed(2);SC=F.schedule(m2,r,8);A2.go(TICKS);table()});
  table();
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-fa']=window.TAB_RENDER['t-fa']||[]).push(()=>{A1.redraw();A2.redraw()});
  addEventListener('resize',()=>{if(!document.getElementById('t-fa').hidden){A1.redraw();A2.redraw()}});
})();
