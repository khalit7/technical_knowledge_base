// ---- Tab: Space-time patch calculator ----
(function(){
  const U=window.VAU,V=U.V,$=id=>document.getElementById(id),esc=RD.esc;
  const sel=$('pc-m');sel.innerHTML=V.models.map(m=>'<option value="'+m.id+'">'+esc(m.n)+'</option>').join('');
  const F={w:$('pc-w'),h:$('pc-h'),f:$('pc-f'),fps:$('pc-fps'),s:$('pc-s'),p:$('pc-p')};let ymode='tok';
  function defaults(){const m=U.mById[sel.value];F.w.value=m.W;F.h.value=m.H;F.f.value=m.F;F.fps.value=m.fps;F.s.value=m.steps;F.p.value=m.passes;draw()}
  const num=(el,lo,hi,d)=>{const v=Math.round(+el.value);return Number.isFinite(v)?Math.max(lo,Math.min(hi,v)):d};
  function draw(){const m=U.mById[sel.value];
    const o={W:num(F.w,64,4096,m.W),H:num(F.h,64,4096,m.H),F:num(F.f,1,2001,m.F),fps:num(F.fps,1,60,m.fps),steps:num(F.s,1,250,m.steps),passes:+F.p.value||1};
    const c=U.calc(m,o);
    const warn=[];if(!c.okH)warn.push('Width and height should be multiples of '+(m.cs*m.ph)+' for this model (VAE '+m.cs+' x patch '+m.ph+'); the pipeline would refuse or crop.');
    if(!c.okF)warn.push(m.frames_rule?'Frames should be a multiple of '+m.ct+'.':'Frames should be '+m.ct+'k + 1 (for example '+(Math.floor((o.F-1)/m.ct)*m.ct+1)+'); diffusers rounds to the nearest such number.');
    $('pc-warn').innerHTML=warn.map(w=>'<div class="pc-warn">'+w+'</div>').join('');
    const mem=c.N*c.N*2/2**30;
    $('pc-out').innerHTML=RD.stat('Latent',m.ch+' x '+c.lf+' x '+c.lh+' x '+c.lw,'channels x frames x height x width')+RD.stat('Tokens',U.int(c.N),c.lf+' x '+c.th+' x '+c.tw)+
      RD.stat('Video length',U.fx(c.sec,2)+' s',o.F+' frames at '+o.fps+' fps')+RD.stat('Tokens per second of video',U.int(c.tps))+
      RD.stat('Pixels per token',U.int(c.ppt),'VAE ratio '+U.fx(c.vae,0)+' : 1')+RD.stat('TFLOP per pass',U.TF(c.per),'attention '+U.pct(c.share))+
      RD.stat('TFLOP per clip',U.int(c.clip/1e12),o.steps+' steps x '+o.passes+' pass'+(o.passes>1?'es':''))+
      RD.stat('Attention pairs per head',U.int(c.full/1e6)+'M','factorised: '+U.int(c.fact/1e6)+'M ('+U.fx(c.full/c.fact,1)+'x fewer)')+
      RD.stat('One score matrix if stored',U.fx(mem,mem<10?2:0)+' GiB','per head, bf16; why FlashAttention never stores it');
    $('pc-split').innerHTML='<span style="width:'+(100*(1-c.share)).toFixed(1)+'%;background:var(--c1)"></span><span style="width:'+(100*c.share).toFixed(1)+'%;background:var(--c2)"></span>';
    $('pc-explain').textContent=U.B(m.params)+' parameters, '+m.L+' blocks, attention width '+m.D+'. Linear '+U.TF(c.lin)+' TFLOP, attention '+U.TF(c.att)+' TFLOP per pass.';
    chart(m,o)}
  function chart(cur,o){const el=$('pc-chart'),w=RD.width(el),h=Math.max(220,Math.min(300,w*0.45)),L=56,R=12,T=10,B=30;
    const xs=[];for(let s=1;s<=20;s+=0.5)xs.push(s);
    const val=(m,sec)=>{const fr=Math.max(1,Math.round(sec*o.fps));const F2=m.frames_rule?Math.max(m.ct,Math.round(fr/m.ct)*m.ct):Math.floor((fr-1)/m.ct)*m.ct+1;const c=U.calc(m,{W:o.W,H:o.H,F:F2,fps:o.fps});return ymode==='tok'?c.N:c.per/1e12};
    const all=V.models.map(m=>xs.map(s=>val(m,s)));const vmax=Math.max(...all.flat()),vmin=Math.max(1e-3,Math.min(...all.flat().filter(v=>v>0)));
    const lmin=Math.floor(Math.log10(vmin)),lmax=Math.ceil(Math.log10(vmax));
    const X=s=>L+(w-L-R)*(s-1)/19,Y=v=>T+(h-T-B)*(lmax-Math.log10(Math.max(v,vmin)))/(lmax-lmin);
    const cols=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','#7fa98a','#b06a8a'];let s='';
    const gap=(h-T-B)/Math.max(1,lmax-lmin),every=gap<16?2:1;for(let e=lmin;e<=lmax;e++){if((e-lmin)%every)continue;s+='<line x1="'+L+'" x2="'+(w-R)+'" y1="'+Y(10**e)+'" y2="'+Y(10**e)+'" stroke="var(--line)"/>'+RD.t(L-4,Y(10**e)+4,e>=6?(10**(e-6))+'M':e>=3?(10**(e-3))+'k':String(10**e),{a:'end',fill:'var(--mute)',fs:10})}
    [1,5,10,15,20].forEach(x=>{s+=RD.t(X(x),h-B+14,x+' s',{a:'middle',fill:'var(--mute)',fs:10})});
    V.models.forEach((m,i)=>{const on=m.id===cur.id;s+='<polyline fill="none" stroke="'+cols[i]+'" stroke-width="'+(on?3:1.3)+'" opacity="'+(on?1:0.75)+'" points="'+xs.map((x,j)=>X(x).toFixed(1)+','+Y(all[i][j]).toFixed(1)).join(' ')+'"/>'});
    const cs=U.calc(cur,o),cv=ymode==='tok'?cs.N:cs.per/1e12;if(cs.sec>=1&&cs.sec<=20)s+='<circle cx="'+X(cs.sec)+'" cy="'+Y(cv)+'" r="5" fill="var(--bg)" stroke="var(--ink)" stroke-width="2"/>';
    s+=RD.t(L,h-4,ymode==='tok'?'tokens (log scale)':'TFLOP per pass (log scale)',{fill:'var(--mute)',fs:10});
    el.innerHTML=RD.svg(w,h,s,'Tokens or FLOPs against duration');
    $('pc-leg').innerHTML='At '+o.W+' x '+o.H+' and '+o.fps+' fps, frames rounded to each model\'s rule; circle: the current setting. '+V.models.map((m,i)=>'<span style="color:'+cols[i]+';font-weight:'+(m.id===cur.id?700:400)+'">'+esc(m.n)+'</span>').join(' &middot; ')}
  $('pc-check').innerHTML='Defaults reproduce published figures: '+V.reproduce.map(r=>{const m=U.mById[r.model],c=U.calc(m);const got=r.kind==='ratio'?c.ppt:r.kind==='vae_ratio'?c.vae:c.N;
    return esc(r.what)+' &rarr; '+U.int(got)}).join('; ')+' (independently: computed from the factors and frame counts, not fitted). Not reproduced: Mochi\'s "128x" compression (96 from its factors).';
  sel.addEventListener('change',defaults);Object.values(F).forEach(el=>el.addEventListener('input',draw));F.p.addEventListener('change',draw);$('pc-reset').addEventListener('click',defaults);
  RD.seg($('pc-y'),v=>{ymode=v;draw()});
  sel.value='wan13';defaults();RD.onResize(draw,'t-vapatch');RD.onRender(draw,'t-vapatch');
})();
