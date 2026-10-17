// ---- Token generator lab (t-nmgen): recorded samples of the tiny AR and masked models ----
(function(){
  const N=window.NM;if(!N)return;
  const $=id=>document.getElementById(id),E=RD.esc;
  const TS=[0.7,0.85,1,1.15,1.3];
  const f2=v=>v==null?'n/a':(+v).toFixed(1),pc=v=>(100*v).toFixed(1)+'%';
  const near=(a,b)=>Math.abs(a-b)<1e-9;
  function find(list,o){return (list||[]).find(r=>Object.keys(o).every(k=>near(+r[k],o[k])))}
  const ref=N.ref;
  function refLine(){return 'For comparison (same scoring, N = 1,000, recorded by the root labs): DDPM 1,000 steps FD '+f2(ref.ddpm1000.fd)+
    ', DDIM 50 steps with guidance s = 2 FD '+f2((ref.df_cfg.find(c=>c.scale===2)||{}).fd)+', flow Euler 50 steps FD '+f2((ref.fw_euler.find(e=>e.steps===50)||{}).fd)+
    ', with s = 1.5 FD '+f2((ref.fw_cfg.find(c=>near(c.scale,1.5))||{}).fd)+'. The tokenizer\'s own reconstructions of 1,000 real images: FD '+f2(N.tok.fsq1000.recon_val1000_fd)+'.'}
  // ---- 1. sampler grid
  function drawSamp(){
    const T=TS[+$('g-t').value],k=+$('g-k').value,s=+$('g-s').value;$('g-tv').textContent=T;
    const r=find(N.smp.ar_grid,{T,k,s});if(!r)return;
    $('g-img').src=N.img[r.img];
    $('g-stats').innerHTML=RD.stat('FD (lower is better)',f2(r.fd),'real images '+f2(N.tok.floor_fd_val1000))+RD.stat('Right class',pc(r.acc),'classifier on the asked-for class')+
      RD.stat('Diversity',r.div.toFixed(1),'real images '+N.ref.real_div.toFixed(1))+RD.stat('Distinct images per class',r.distinct_per_class.toFixed(0)+' of 100','')+
      RD.stat('Sampling time, 1,000 images',r.sec_batch1000.toFixed(1)+' s','64 calls per batch, 4 batches of 250'+(s>1?', each doubled for guidance':''));
    $('g-ref').textContent=refLine();
  }
  // ---- 2. sweeps: line chart, click a point
  const SW={
    ar_temp:{x:'T',lab:'temperature',pts:()=>N.smp.ar_temp,xf:v=>v===0?'0 (greedy)':v},
    ar_topk:{x:'k',lab:'top-k',pts:()=>[...N.smp.ar_topk,Object.assign({},find(N.smp.ar_temp,{T:1}),{k:1000})],xf:v=>v===1?'1 (greedy)':v===1000?'all':v,log:true},
    ar_cfg:{x:'s',lab:'guidance scale s',pts:()=>[...N.smp.ar_cfg,find(N.smp.ar_temp,{T:1})],xf:v=>v===0?'0 (unconditional)':v},
    mask:{x:'steps',lab:'masked rounds (s = 1, 2, 3)',pts:()=>N.smp.mask,xf:v=>v,log:true,series:'s'}};
  let swm='ar_temp',swSel=null;
  function drawSw(){
    const c=SW[swm],el=$('g-swc'),w=Math.max(280,RD.width(el)),h=210,L=44,R=10,T=12,B=34;
    let pts=c.pts().filter(Boolean).map(p=>Object.assign({},p)).sort((a,b)=>a[c.x]-b[c.x]);
    const xs=[...new Set(pts.map(p=>p[c.x]))].sort((a,b)=>a-b);
    const X=v=>{const i=xs.indexOf(v);return L+(xs.length>1?i/(xs.length-1):0.5)*(w-L-R)};
    const fmax=Math.min(800,Math.max(...pts.map(p=>p.fd))),fmin=0;
    const Y=v=>T+(1-Math.min(v,fmax)/fmax)*(h-T-B);
    let s='';
    for(let g=0;g<=4;g++){const v=fmax*g/4;s+='<line x1="'+L+'" x2="'+(w-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(L-4,Y(v)+3,Math.round(v),{a:'end',fs:10})}
    const fl=N.tok.fsq1000.recon_val1000_fd,rf=N.tok.floor_fd_val1000;
    s+='<line x1="'+L+'" x2="'+(w-R)+'" y1="'+Y(fl)+'" y2="'+Y(fl)+'" stroke="var(--bad)" stroke-dasharray="4 3"/>'+RD.t(w-R,Y(fl)-3,'tokenizer ceiling '+fl.toFixed(1),{a:'end',fs:10,fill:'var(--bad)'});
    s+='<line x1="'+L+'" x2="'+(w-R)+'" y1="'+Y(rf)+'" y2="'+Y(rf)+'" stroke="var(--good)" stroke-dasharray="4 3"/>'+RD.t(w-R,Y(rf)+11,'real images '+rf.toFixed(1),{a:'end',fs:10,fill:'var(--good)'});
    const groups=c.series?[...new Set(pts.map(p=>p[c.series]))]:[null];
    const cols=['var(--c1)','var(--c2)','var(--c3)'];
    groups.forEach((g,gi)=>{const gp=pts.filter(p=>g==null||p[c.series]===g);
      s+='<polyline fill="none" stroke="'+cols[gi]+'" stroke-width="2" points="'+gp.map(p=>X(p[c.x])+','+Y(p.fd)).join(' ')+'"/>';
      gp.forEach(p=>{const on=swSel&&swSel===p;s+='<circle data-i="'+pts.indexOf(p)+'" cx="'+X(p[c.x])+'" cy="'+Y(p.fd)+'" r="'+(on?6:4.5)+'" fill="'+cols[gi]+'" stroke="var(--bg)" style="cursor:pointer"><title>'+c.lab+' '+p[c.x]+': FD '+p.fd+'</title></circle>'});
      if(g!=null)s+=RD.t(w-R,T+10+13*gi,'guidance s = '+g,{a:'end',fs:10.5,fill:cols[gi],w:600})});
    xs.forEach(v=>{s+=RD.t(X(v),h-B+14,String(c.xf(v)),{a:'middle',fs:10})});
    s+=RD.t(L+(w-L-R)/2,h-4,c.lab,{a:'middle',fs:11})+RD.t(4,T+2,'FD',{fs:10});
    el.innerHTML=RD.svg(w,h,s,'FD against '+c.lab);
    el.querySelectorAll('circle').forEach(ci=>ci.addEventListener('click',()=>{swSel=pts[+ci.dataset.i];drawSw()}));
    if(!swSel||!pts.includes(swSel)){swSel=pts.find(p=>p.fd===Math.min(...pts.map(q=>q.fd)))}
    const p=swSel;
    $('g-swimg').src=N.img[p.img]||'';
    $('g-swcap').innerHTML=E(c.lab)+' = '+E(String(c.xf(p[c.x])))+(c.series?', s = '+p.s:'')+': FD '+f2(p.fd)+', right class '+pc(p.acc)+', diversity '+p.div.toFixed(1)+
      (p.distinct_per_class!=null?', '+p.distinct_per_class.toFixed(0)+' distinct images per class of 100':'')+', '+p.sec_batch1000.toFixed(1)+' s for 1,000. Click a point to see its samples (dashed: the tokenizer\'s reconstruction FD and the real-image floor).';
  }
  // ---- 3. watch one image being written
  const rec=N.smp.ar_record['1.0'];const BG=472;
  let wc=3,frameImg=new Image(),A3=null;
  function drawWatch(i){
    const toks=rec.tokens[wc],n=Math.min(i,64);
    $('g-wgrid').innerHTML=toks.map((t,j)=>'<span class="'+(j<n?'f':'')+(j===n&&n<64?' n':'')+'">'+(j<n?t:j===n&&n<64?'?':'&nbsp;')+'</span>').join('');
    const cv=$('g-wcan'),cx=cv.getContext('2d');
    if(frameImg.complete&&frameImg.naturalWidth){cx.clearRect(0,0,28,28);cx.drawImage(frameImg,n*28,0,28,28,0,0,28,28)}
    else frameImg.onload=()=>drawWatch(A3?A3.i:0);
    if(n<64){
      const top=rec.top5[wc][n],ch=toks[n],pch=rec.p[wc][n],H=rec.H[wc][n];
      $('g-wtop').innerHTML='<div class="small mute" style="display:block">Top 5 codes at position '+(n+1)+' of 64:</div>'+top.map(([id,p])=>'<div class="'+(id===ch?'ch':'')+'"><span>'+id+'</span><span class="tr"><span style="width:'+(100*p).toFixed(1)+'%"></span></span><span>'+(100*p).toFixed(1)+'%</span></div>').join('');
      $('g-wst').innerHTML=RD.stat('Chosen code',String(ch),'probability '+(100*pch).toFixed(1)+'%')+RD.stat('Uncertainty',H.toFixed(2)+' bits','entropy of this step (uniform: 9.97)')+RD.stat('Calls so far',String(n+1),'of 64');
      $('g-wcap').innerHTML='<div class="t">Position '+(n+1)+': row '+(Math.floor(n/8)+1)+', column '+(n%8+1)+'</div><p>'+(H<0.5?'Nearly certain: the model has seen this kind of position (usually background or a predictable edge) thousands of times.':H<3?'A few candidates: the shape so far constrains this code.':'Genuinely open: many codes are plausible here, and the draw decides the detail.')+' The chosen code is drawn with the shared random number for this position (temperature 1, no top-k, no guidance).</p>';
    }else{
      const tot=rec.H[wc].reduce((a,b)=>a+b,0),lp=rec.p[wc].reduce((a,b)=>a-Math.log2(b),0);
      $('g-wtop').innerHTML='';$('g-wst').innerHTML=RD.stat('Bits spent on this image',lp.toFixed(0),'-log2 of the chosen codes\' probabilities')+RD.stat('Sum of step entropies',tot.toFixed(0)+' bits','uniform codes would be 638');
      $('g-wcap').innerHTML='<div class="t">Done: 64 calls</div><p>The tokenizer\'s decoder turns the 64 codes into the image. Most of the uncertainty sat in a minority of positions; scrub back to find them.</p>';
    }
  }
  function setClass(c){wc=c;frameImg=new Image();frameImg.onload=()=>drawWatch(A3?A3.i:0);frameImg.src=N.img['ar_frames__1.0_c'+c]}
  function init(){
    if(init.done){drawSw();return}init.done=1;
    ['g-t','g-k','g-s'].forEach(id=>$(id).addEventListener('input',drawSamp));
    RD.seg($('g-swm'),m=>{swm=m;swSel=null;drawSw()});
    $('g-wc').addEventListener('change',e=>{setClass(+e.target.value);A3.go(0)});
    setClass(3);
    A3=RD.anim({card:'g-watch',ctl:'g-wctl',n:65,draw:drawWatch,ms:450,label:'Token'});
    drawSamp();drawSw();
    let t=0;addEventListener('resize',()=>{if($('t-nmgen').hidden)return;clearTimeout(t);t=setTimeout(drawSw,80)});
  }
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-nmgen']=window.TAB_RENDER['t-nmgen']||[]).push(init);
})();
