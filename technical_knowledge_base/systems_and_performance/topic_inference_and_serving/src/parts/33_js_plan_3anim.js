// ---- Capacity planner (t-plan): before/after animation of one deployment with one setting changed ----
window.PLNA=(function(){
  const Q=window.PLN,U=window.PLNU,D=Q.D,$=id=>document.getElementById(id);
  const {sig,fGB,fT,fUSD,fInt,esc,svg,tx,width,SEG}=U;
  const MODES={
    fmt:{a:{fmt:'bf16'},b:{fmt:'fp8'},la:'BF16 weights',lb:'FP8 weights'},
    kv:{a:{kvb:2},b:{kvb:1},la:'FP16 KV cache',lb:'FP8 KV cache'},
    tp:{a:{tp:1,pp:1,ep:0},b:{tp:2,pp:1,ep:0},la:'TP 1 (one GPU per copy)',lb:'TP 2 (two GPUs per copy)'}
  };
  let mode='fmt',base=null,cache={},an=null,pend=0;
  const NB=32; // batch used to compare one decode step
  function variants(){
    const key=mode+'|'+JSON.stringify(base);if(cache[key])return cache[key];
    const md=MODES[mode],out={};
    ['a','b'].forEach(w=>{const o=Object.assign({},base,md[w]);
      if(mode==='tp'&&D.chips[o.chip].tpmax<2&&w==='b'){out[w]={o:o,na:'one GPU only: '+D.chips[o.chip].name+' cannot split a model'};return}
      const r=Q.plan(o),s=r.setup,st=r.fits?Q.step(o,s,Math.min(NB,Math.max(1,s.bmax)),0):null;out[w]={o:o,r:r,s:s,st:st}});
    cache={};cache[key]=out;return out;
  }
  const CAP=[
    v=>'Two copies of the same deployment and traffic. Top: '+v.la+'. Bottom: '+v.lb+'. Each bar is one '+esc(D.chips[base.chip].name)+' ('+sig(D.chips[base.chip].mem,3)+' GB), drawn to the same scale.',
    v=>'The weights land first: '+part(v.A,'w')+' against '+part(v.B,'w')+' per GPU. Everything else has to fit in what is left.',
    v=>'The engine reserves activation space for its largest step and some memory for CUDA graphs and buffers ('+part(v.A,'ao')+' against '+part(v.B,'ao')+'); vLLM keeps '+Math.round((1-base.util)*100)+'% of the GPU for everything outside it.',
    v=>'What is left is the KV cache pool: '+part(v.A,'k')+' against '+part(v.B,'k')+'. This, not the weights, decides how many conversations run at once.',
    v=>'Conversations pack into the pool, each holding its cached tokens (ticks to scale): '+seqs(v.A)+' against '+seqs(v.B)+' per copy.',
    v=>'One decode step with '+NB+' sequences: '+stepTxt(v.A)+' against '+stepTxt(v.B)+'. A memory-bound step costs the bytes it reads, so fewer bytes per weight or per cached token mean a faster step for every user in it.',
    v=>'The most traffic one copy carries inside your targets: '+rate(v.A)+' against '+rate(v.B)+'.',
    v=>'The fleet for '+sig(base.lam,3)+' requests per second at peak: '+fleet(v.A)+' against '+fleet(v.B)+'.'
  ];
  function part(x,k){if(x.na)return 'n/a';if(!x.s)return '?';const s=x.s;const v=k==='w'?s.w_gpu:k==='ao'?s.act+s.ovh:s.pool;return v>0?fGB(v):'<b>nothing</b>'}
  function seqs(x){if(x.na)return 'n/a';return x.r.fits?fInt(x.s.bmax):'<b>none (does not fit)</b>'}
  function stepTxt(x){if(x.na||!x.st)return 'n/a';return fT(x.st.t)+' ('+x.st.bound+'-bound)'}
  function rate(x){if(x.na||!x.r.fits)return 'n/a';return x.r.lam_slo>0?sig(x.r.lam_slo,3)+' req/s ('+fInt(x.r.lam_slo*base.O)+' output tokens/s on '+x.s.G+' GPU'+(x.s.G>1?'s':'')+')':'none'}
  function fleet(x){if(x.na||!x.r.fits||!x.r.gpus)return 'n/a';return fInt(x.r.gpus)+' GPUs'+(x.r.cost?', '+fUSD(x.r.cost.usd_out)+' per million output tokens':'')}
  function wrap(s,w,fs){const cw=fs*0.56,mx=Math.max(8,Math.floor(w/cw)),words=String(s).split(' '),out=[];let l='';
    words.forEach(x=>{if((l+' '+x).trim().length>mx&&l){out.push(l);l=x}else l=(l?l+' ':'')+x});if(l)out.push(l);return out}
  function draw(i){
    const el=$('pln-anim');if(!el||!base)return;
    const W=width(el),r=build(i,W),full=i<7?build(7,W)[1]:r[1],md=MODES[mode],v=variants();
    el.innerHTML=svg(W,full+6,r[0],'Before and after: '+md.la+' against '+md.lb);
    $('pln-ancap').innerHTML='<b>Step '+(i+1)+' of 8.</b> '+CAP[i]({la:md.la,lb:md.lb,A:v.a,B:v.b});
  }
  function build(i,W){
    const v=variants(),A=v.a,B=v.b,md=MODES[mode];
    const ch=D.chips[base.chip],tot=ch.mem*1e9,bw=W,sc=bw/tot;
    let b='',y=0;
    const line=(s,o)=>{wrap(s,W,o.fs||10.5).forEach(l=>{y+=(o.fs||10.5)+4;b+=tx(0,y,l,o)})};
    const stv=[A,B].filter(z=>z.st).map(z=>z.st.t),smax=Math.max(1e-9,...stv);
    const rr=[A,B].map(z=>z.na||!z.r.fits?0:z.r.lam_slo*base.O),rmax=Math.max(1e-9,...rr);
    [[A,md.la,0],[B,md.lb,1]].forEach(([x,lab,k])=>{
      if(k)y+=14;
      line(lab,{fs:12.5,w:600});
      y+=6;const yb=y,hb=26;y+=hb;
      b+='<rect x="0" y="'+yb+'" width="'+bw+'" height="'+hb+'" fill="none" stroke="var(--line)"/>';
      if(x.na){line(x.na,{fs:11,fill:'var(--bad)'});return}
      const s=x.s,parts={w:s.w_gpu,a:s.act,o:s.ovh,k:Math.max(0,s.pool),r:tot-s.usable},show={w:i>=1,a:i>=2,o:i>=2,k:i>=3,r:i>=2};
      let xx=0;
      SEG.forEach(([kk,n,c])=>{const w=Math.max(0,parts[kk])*sc;if(show[kk]&&w>0.5){const ww=Math.min(w,bw-xx);if(ww>0)b+='<rect x="'+xx+'" y="'+yb+'" width="'+ww+'" height="'+hb+'" fill="'+c+'" opacity="'+(kk==='r'?0.6:0.85)+'"/>';
        if(ww>44)b+=tx(xx+ww/2,yb+17,fGB(parts[kk]),{a:'middle',fs:10.5,fill:'var(--bg)',w:600})}xx+=w});
      const over=s.w_gpu+s.act+s.ovh-s.usable;
      if(i>=1&&(over>0||!x.r.fits))line('does not fit: needs '+fGB(s.w_gpu+s.act+s.ovh)+' of '+fGB(s.usable),{fs:11,fill:'var(--bad)',w:600});
      if(i>=4&&x.r.fits&&s.pool>0){
        const x0=(s.w_gpu+s.act+s.ovh)*sc,per=s.per_seq*sc,n=s.ep?Math.floor(s.bmax/s.G):s.bmax,fx=s.fixed*sc;
        if(fx>1)b+='<rect x="'+x0+'" y="'+yb+'" width="'+fx+'" height="'+hb+'" fill="var(--c6)" opacity="0.9"/>';
        const st=Math.max(1,Math.ceil(n/Math.max(1,Math.floor(bw/3))));
        let ticks='';for(let q=st;q<=n;q+=st){const t0=x0+fx+q*per;if(t0>bw)break;ticks+='M'+t0.toFixed(1)+' '+yb+'v'+hb}
        b+='<path d="'+ticks+'" stroke="var(--bg)" stroke-width="'+(st>1?1:0.8)+'" opacity="0.8"/>';
        line(fInt(s.bmax)+' sequences per copy, '+fGB(s.per_seq)+' each'+(st>1?' (a tick every '+st+')':'')+(s.fixed>0?'; shared prefix stored once':''),{fs:10.5,fill:'var(--mute)'});
      }
      if(i>=5&&x.st){line('one step of '+NB+' sequences: '+fT(x.st.t)+', '+x.st.bound+'-bound',{fs:10.5});y+=3;
        b+='<rect x="0" y="'+y+'" width="'+(x.st.t/smax*bw*0.9)+'" height="10" fill="'+(x.st.bound==='memory'?'var(--c1)':'var(--c2)')+'"/>';y+=10}
      if(i>=6){const val=rr[k];line(val?fInt(val)+' output tokens/s per copy inside targets':'no traffic meets the targets',{fs:10.5});y+=3;
        b+='<rect x="0" y="'+y+'" width="'+Math.max(1,val/rmax*bw*0.9)+'" height="10" fill="var(--c3)"/>';y+=10}
      if(i>=7)line(x.na||!x.r.fits||!x.r.gpus?'fleet: n/a':'fleet: '+fInt(x.r.gpus)+' GPUs'+(x.r.cost?', '+fUSD(x.r.cost.cost_h)+' per hour':''),{fs:12,w:600});
    });
    return [b,y];
  }
  function init(){
    if(an||!window.RD||!$('pln-ancard'))return;
    an=RD.anim({card:'pln-ancard',ctl:'pln-anctl',n:8,ms:1900,draw:draw,label:'Animation step'});
    RD.seg($('pln-anseg'),m=>{mode=m;an.reset(8);an.play()});
  }
  function update(o){
    base=Object.assign({},o);
    clearTimeout(pend);pend=setTimeout(()=>{init();if(an)an.redraw();else draw(0)},30);
  }
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-plan']=window.TAB_RENDER['t-plan']||[]).push(()=>{init();if(an)an.redraw()});
  return {update};
})();
