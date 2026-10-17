// ---- Shared helpers for this page (all tabs): formatting, the token and FLOPs formulas (same as calc/recompute.py), data-va spans, predict cards, audio players ----
window.VAU=(function(){
  const V=window.VA;
  const int=n=>Math.round(n).toLocaleString('en-US');
  const fx=(n,d)=>Number(n).toFixed(d);
  const pct=(x,d)=>fx(100*x,d==null?0:d)+'%';
  const B=n=>n>=1e9?fx(n/1e9,2)+'B':fx(n/1e6,0)+'M';
  const TF=n=>{const t=n/1e12;return t>=1000?int(t):t>=10?fx(t,0):fx(t,1)};
  const mById={};V.models.forEach(m=>mById[m.id]=m);
  // latent frames: causal VAEs keep the first frame alone (1 + (F-1)/ct); Movie Gen's TAE divides F by 8
  const latF=(m,F)=>m.frames_rule?Math.floor(F/m.ct):Math.floor((F-1)/m.ct)+1;
  // everything the calculator shows for model m at H x W, F frames, fps, steps, passes
  function calc(m,o){o=Object.assign({H:m.H,W:m.W,F:m.F,fps:m.fps,steps:m.steps,passes:m.passes},o||{});
    const lf=latF(m,o.F),lh=Math.floor(o.H/m.cs),lw=Math.floor(o.W/m.cs);
    const th=Math.floor(lh/m.ph),tw=Math.floor(lw/m.ph),s=th*tw,N=lf*s;
    const lin=2*m.params*N,att=4*m.L*N*N*m.D,per=lin+att,sec=o.F/o.fps;
    return {o,lf,lh,lw,th,tw,s,N,sec,tps:N/sec,lin,att,per,share:att/per,clip:per*o.steps*o.passes,
      full:N*N,fact:lf*s*s+s*lf*lf,vae:3*m.cs*m.cs*m.ct/m.ch,ppt:m.cs*m.cs*m.ph*m.ph*m.ct,
      okH:o.H%(m.cs*m.ph)===0&&o.W%(m.cs*m.ph)===0,okF:m.frames_rule?o.F%m.ct===0:(o.F-1)%m.ct===0}}
  // values the prose reads (data-va="a.b")
  const D={};
  V.models.forEach(m=>{const c=calc(m);D[m.id]={tps:int(c.tps),tokens:int(c.N),share:pct(c.share)}});
  const cl=V.vae.clips,mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
  D.vae={f0:fx(cl.slow.psnr[0],1),slow_rest:fx(mean(cl.slow.psnr.slice(1)),1),fast_rest:fx(mean(cl.fast.psnr.slice(1)),1),
    slow_enc:fx(cl.slow.enc_s,0),slow_dec:fx(cl.slow.dec_s,0),rss:fx(V.vae.peak_rss_mb/1024,1)};
  const fc=V.flopcheck;D.fc={counted:fx(fc.counted/1e12,1),bmm:fx(fc.by_op['aten.bmm']/1e12,1),share:pct(fc.by_op['aten.bmm']/fc.counted),
    formula:fx(fc.formula/1e12,1),resid:(fc.formula>fc.counted?'+':'')+pct(fc.formula/fc.counted-1,1)+' against the count'};
  const sp=V.codecs.speech,mu=V.codecs.music,er=k=>sp.encodec.rows[k-1],f2=v=>fx(v,2),f3=v=>fx(v,3);
  D.rvq={r1:pct(er(1).resid,1),r8:pct(er(8).resid,1),r32:pct(er(32).resid,2),m1:f2(er(1).mel_l1),m8:f2(er(8).mel_l1),m32:f2(er(32).mel_l1),
    e6:f3(er(8).mel_l1),o6:f3(sp.opus6.mel_l1),o12:f3(sp.opus12.mel_l1),snr32:fx(er(32).snr_db,1),snro12:fx(sp.opus12.snr_db,1),
    mus32:f2(mu.encodec.rows[31].mel_l1),dac9m:f2(mu.dac.rows[8].mel_l1),dacr1:pct(sp.dac.rows[0].resid,0),dacr9:pct(sp.dac.rows[8].resid,0),
    encdec:fx(er(32).dec_s,2),dacdec:fx(sp.dac.rows[8].dec_s,2),mimi1:f2(sp.mimi.rows[0].mel_l1),mimi8:f2(sp.mimi.rows[7].mel_l1),e15:f2(er(2).mel_l1)};
  D.mis={in:fx(V.mist.wrong_rate.input_seconds_true,2),out:fx(V.mist.wrong_rate.output_seconds_at_24k,2)};
  function get(p){return p.split('.').reduce((o,k)=>o==null?o:o[k],D)}
  function fill(root){(root||document).querySelectorAll('[data-va]').forEach(el=>{const v=get(el.dataset.va);el.textContent=v==null?'?':v})}
  const ANS={};const setAns=(id,h)=>{ANS[id]=h};
  function wirePredicts(){document.querySelectorAll('.vap .pr').forEach(pr=>{const o=pr.querySelector('.opts');if(!o||o.dataset.w)return;o.dataset.w=1;
    o.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
      pr.querySelectorAll('.opts button').forEach(x=>{x.classList.toggle('right',x.dataset.ok==='1');if(x===b&&x.dataset.ok!=='1')x.classList.add('wrong')});
      const a=pr.querySelector('.ans');a.innerHTML=ANS[pr.id]||'';a.hidden=false})})}
  // one shared <audio>: play(src) stops whatever was playing; buttons get the class "on" while playing
  const au=new Audio();let curBtn=null;
  au.addEventListener('ended',()=>{if(curBtn)curBtn.classList.remove('on');curBtn=null});
  function play(src,btn){try{if(curBtn===btn&&!au.paused){au.pause();btn.classList.remove('on');curBtn=null;return}
    if(curBtn)curBtn.classList.remove('on');au.src=src;au.currentTime=0;const p=au.play();if(p&&p.catch)p.catch(()=>{});curBtn=btn;if(btn)btn.classList.add('on')}catch(e){}}
  function stop(){try{au.pause()}catch(e){}if(curBtn)curBtn.classList.remove('on');curBtn=null}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
  const CODEC={encodec:{n:'EnCodec 24 kHz',fr:75,bits:10,max:32},dac:{n:'DAC 44.1 kHz',fr:44100/512,bits:10,max:9},mimi:{n:'Mimi',fr:12.5,bits:11,max:32}};
  const COL={encodec:'var(--c1)',dac:'var(--c2)',mimi:'var(--c3)',opus:'var(--c4)'};
  return {V,int,fx,pct,B,TF,mById,latF,calc,D,get,fill,setAns,wirePredicts,play,stop,CODEC,COL};
})();
