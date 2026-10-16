// ---- Cost lab: "GPU utilisation 100%" drill: one window, three cases, two definitions ----
(function(){
  const C=window.CO,$=C.$;
  const SM=132,SL=20;
  // active SM count per time slice for each case (derived from the definitions; C's SM count is illustrative)
  const CASES={small:{name:'A',act:()=>Math.round(SM/5),work:true,txt:'A kernel launched with a fifth as many blocks as SMs runs for the whole window.'},
    burst:{name:'B',act:i=>i<4?SM:0,work:true,txt:'A kernel that fills all 132 SMs runs for the first fifth of the window, then the GPU waits (for data, for the CPU, for a peer).'},
    wait:{name:'C',act:()=>8,work:false,txt:'An all-reduce kernel is resident on a few SMs (8 here, illustrative), spinning while it waits for a rank that never arrives. Warps are active; nothing is computed.'}};
  let cm='small';
  function draw(i){ // i = number of slices elapsed (0..SL)
    const c=CASES[cm],el=$('co-u-svg'),W=C.width(el);
    const cols=W<420?12:22,cell=Math.max(6,Math.min(16,Math.floor((W-12)/cols)-2)),rows=Math.ceil(SM/cols);
    const cur=i>0?c.act(i-1):0;let s='';
    for(let k=0;k<SM;k++){const x=6+(k%cols)*(cell+2),y=6+Math.floor(k/cols)*(cell+2);
      s+=C.rect(x,y,cell,cell,k<cur?(c.work?C.col('c3'):C.col('bad')):C.col('dim'),{rx:1})}
    let y=8+rows*(cell+2)+10;s+=C.t(6,y,'SMs during slice '+Math.max(1,i)+(i===0?' (not started)':''),{fs:10,fill:C.col('mute')});
    y+=8;const sw=(W-12)/SL;
    for(let k=0;k<SL;k++){const a=c.act(k),on=k<i;
      s+=C.rect(6+k*sw,y,sw-2,18,on?(a>0?(c.work?C.col('c3'):C.col('bad')):C.col('dim')):'none',{stroke:C.col('line'),rx:1,op:on?Math.max(0.25,a/SM):1})}
    s+=C.t(6,y+32,'the one-second window in 20 slices; shade = share of SMs active',{fs:10,fill:C.col('mute')});
    el.innerHTML=C.svg(W,y+38,s,'SM activity over one window, case '+c.name);
    let any=0,sum=0;for(let k=0;k<i;k++){const a=c.act(k);if(a>0)any++;sum+=a}
    const n=Math.max(1,i);
    $('co-u-out').innerHTML=C.stat('nvidia-smi / DCGM_FI_DEV_GPU_UTIL',i?C.pct(any/n):'-','share of slices with any kernel')+
      C.stat('SM activity (DCGM 1002)',i?(sum/(SM*n)).toFixed(2):'-','active SMs, averaged')+
      C.stat('Useful work',c.work?(i?(sum/(SM*n)).toFixed(2)+' of the chip, at most':'-'):'none','what MFU would see');
    $('co-u-cap').innerHTML='<b>Case '+c.name+'.</b> '+c.txt+(i===SL?(cm==='small'?' Utilisation reads 100%; SM activity 0.20: four fifths of the chip did nothing.':cm==='burst'?' Utilisation reads 20%, SM activity 0.20: the same SM activity as A, with the opposite utilisation reading.':' Utilisation reads 100% and the job has not moved: this is what a hung job looks like on a default dashboard.'):'');
  }
  const A=C.anim({card:'co-u-card',ctl:'co-u-ctl',n:SL+1,draw,ms:450,label:'Time slice'});
  C.seg($('co-u-seg'),m=>{cm=m;A.reset()});
  C.pr('co-pr2');
  C.onRender(()=>A.redraw());
})();
