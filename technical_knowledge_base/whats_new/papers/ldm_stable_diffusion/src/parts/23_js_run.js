// ---- Generate tab: live sampling from both toy models, cross-attention maps, the measured results ----
(function(){const TY=(PAPER.rc||{}).toy||{},st={c:0,s:0,p:0,mode:'both'};let last=null,running=false;
  $('genC').innerHTML=TOY.COL.map((n,i)=>'<button data-i="'+i+'">'+n+'</button>').join('');$('genS').innerHTML=TOY.SH.map((n,i)=>'<button data-i="'+i+'">'+n+'</button>').join('');
  $('genP').innerHTML=TOY.POS.map((n,i)=>'<option value="'+i+'">'+n+'</option>').join('');
  const sync=()=>{[['genC','c'],['genS','s']].forEach(([id,k])=>$(id).querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.i===st[k])));
    const cb=[st.c,st.s,st.p];$('genHeld').innerHTML=isHeld(cb)?'<b>This prompt was never seen in training</b> (one of the 12 held-out combinations).':'A prompt seen in training ('+(108-HELD.length)+' of 108 combinations were).'};
  [['genC','c'],['genS','s']].forEach(([id,k])=>$(id).querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{st[k]=+b.dataset.i;sync()})));
  $('genP').addEventListener('change',e=>{st.p=+e.target.value;sync()});$('genG').addEventListener('input',e=>{$('genGv').textContent=e.target.value});
  segBind('genM',m=>{st.mode=m});
  function run(){if(running)return;running=true;const cb=[st.c,st.s,st.p],ids=TOY.tokens(...cb),S=+$('genN').value,K=+$('genK').value,sc=+$('genG').value,seed=Math.max(1,+$('genSeed').value||1);
    const models=st.mode==='both'?['dm_f4','dm_pix']:[st.mode],jobs=[];models.forEach(m=>{for(let k=0;k<K;k++)jobs.push({m,k})});
    const res={cb,S,sc,seed,out:{},att:null};models.forEach(m=>res.out[m]=[]);let ji=0,ch=null,t0=0,m0=0;$('genProg').hidden=false;$('genGo').disabled=true;
    function slice(){if(ji>=jobs.length){running=false;$('genProg').hidden=true;$('genGo').disabled=false;last=res;show();drawAtt();return}
      const J=jobs[ji];if(!ch){LDM.resetMacs();ch=LDM.chain(J.m,ids,{S,scale:sc,seed:seed*100+J.k,keepAtt:J.m==='dm_f4'&&J.k===0||(!res.att&&J.k===0)});ch.atts=[];t0=performance.now()}
      const t1=performance.now();while(performance.now()-t1<30){const s2=ch.next();if(s2.att)ch.atts.push(s2.att);if(s2.j>=S)break}
      if(ch.j>=S){const mm=LDM.macs,t2=performance.now(),img=LDM.toImage(J.m,ch.x),dec=LDM.macs-mm;const r={img,chk:TOY.check(img),ms:performance.now()-t0,macs:LDM.macs,dec};
        res.out[J.m].push(r);if(ch.atts.length&&(!res.att||J.m==='dm_f4'))res.att={m:J.m,maps:ch.atts,img};ji++;ch=null}
      $('genProg').firstChild.style.width=(100*(ji+(ch?ch.j/S:0))/jobs.length).toFixed(0)+'%';setTimeout(slice,0)}
    slice()}
  $('genGo').addEventListener('click',run);
  function show(){const R=last;let h='';Object.keys(R.out).forEach(m=>{const L=R.out[m],ok=L.filter(r=>CHK(r.chk,R.cb).ok).length;
      h+='<h4 style="margin:10px 0 4px">'+(m==='dm_f4'?'Latent diffusion (f = 4), 192 numbers per step':'Pixel-space diffusion, 3,072 numbers per step')+': '+ok+' of '+L.length+' right</h4><div class="out">';
      L.forEach((r,i)=>{const v=CHK(r.chk,R.cb);h+='<div class="stat"><img alt="sample '+(i+1)+'" src="'+IMG.url(r.img,4)+'" style="width:100%;max-width:128px;image-rendering:pixelated;border-radius:6px;display:block"><div class="d" style="color:'+(v.ok?'var(--good)':'var(--bad)')+'">'+(v.ok?'✓ ':'✗ ')+v.txt+'</div></div>'});h+='</div>'});
    $('genOut').innerHTML=h;let s='';Object.keys(R.out).forEach(m=>{const L=R.out[m],ms=L.reduce((a,r)=>a+r.ms,0)/L.length,mac=L.reduce((a,r)=>a+r.macs,0)/L.length;
      s+=stat(m==='dm_f4'?'latent: per sample':'pixel: per sample',ms.toFixed(0)+' ms',(mac/1e6).toFixed(0)+' M multiply-adds'+(m==='dm_f4'?', of which decoder '+(L[0].dec/1e6).toFixed(1)+' M':''))});
    if(R.out.dm_f4&&R.out.dm_pix){const a=R.out.dm_pix.reduce((x,r)=>x+r.ms,0),b=R.out.dm_f4.reduce((x,r)=>x+r.ms,0);s+=stat('latent is faster by',(a/b).toFixed(1)+'×','measured here; the paper\'s Table 6: 3.7 to 4.9×')}
    $('genStats').innerHTML=s}
  // cross-attention maps
  function drawAtt(){const A=last&&last.att;if(!A){$('xaSvg').innerHTML='<p class="small mute">Generate first.</p>';return}
    const L=A.maps[0].length,sel=$('xaL');if(sel.options.length!==L){sel.innerHTML=A.maps[0].map((a,i)=>'<option value="'+i+'">'+a.where+' path, '+a.res+' × '+a.res+'</option>').join('');sel.value=0}
    $('xaT').max=A.maps.length;const t=Math.min(A.maps.length,+$('xaT').value)-1,li=+sel.value,M=A.maps[t][li],r=M.res,toks=TOY.tokens(...last.cb);$('xaTv').textContent=(t+1)+' of '+A.maps.length;
    fit($('xaSvg'),w=>{const n=3,cell=Math.max(60,Math.min(140,Math.floor((w-20)/n)-10)),cs=cell/r;let s='';const iu=IMG.url(A.img,4);
      for(let j=0;j<n;j++){const x0=j*(cell+10);s+=IMG.svgImg(x0,18,cell,cell,iu,0.55);let mx=0;for(let p=0;p<r*r;p++)mx=Math.max(mx,M.att[p*3+j]);
        for(let p=0;p<r*r;p++){const v=M.att[p*3+j];s+=rc(x0+(p%r)*cs,18+((p/r)|0)*cs,cs,cs,'var(--acc)',{r:0,op:Math.min(0.85,v*0.85)})}
        s+=tx(x0,12,'"'+LDM_W.vocab[toks[j]]+'"',{fs:12,w:600})+tx(x0,18+cell+14,'max '+mx.toFixed(2),{fs:11,c:'var(--mute)'})}
      $('xaSvg').innerHTML=svgW(w,cell+40,s,'Cross-attention weights per token')});
    $('xaNote').innerHTML='Model: '+(A.m==='dm_f4'?'latent (the map is over the 8 × 8 latent, or its 4 × 4 downsampled level)':'pixel space')+'. Opacity is the attention weight (0 to 1) each position gives to that token. Read it as what the toy happens to do, not as an explanation: the paper shows no attention maps, and a toy this small may route the prompt through any token.'}
  $('xaT').addEventListener('input',drawAtt);$('xaL').addEventListener('change',drawAtt);
  // results from the logs
  onTab('t-run',()=>{sync();if(!last&&!running)run();
    const E=(TY.eval_report||{}),dm=E.dm||{},q=TY.quant_report8||TY.quant_report6||{},cf=TY.check_forward||{};const pc=v=>v==null?'n/a':(100*v).toFixed(0)+'%';
    let h='<div class="tw"><table><thead><tr><th>Model</th><th>Parameters</th><th>Multiply-adds per evaluation</th><th>Training s/step</th><th>Held-out, s = 1</th><th>Held-out, s = 3</th><th>Seen, s = 3</th><th>Python s/image</th></tr></thead><tbody>';
    [['f4','Latent, f = 4'],['pix','Pixel space'],['f4long','Latent, f = 4, pixel model\'s training time']].forEach(([k,n])=>{const t=TY[k]||{},e=dm[k]||{};h+='<tr><td>'+n+'</td><td>'+(t.params?fmt(t.params):'')+'</td><td>'+(t.macs?(t.macs/1e6).toFixed(2)+' M':'')+'</td><td>'+(t.sec_per_step?t.sec_per_step.toFixed(3):'')+'</td><td>'+pc((e.held_s1||{}).all)+'</td><td>'+pc((e.held_s3||{}).all)+'</td><td>'+pc((e.seen_s3||{}).all)+'</td><td>'+(e.sec_per_image_s3?e.sec_per_image_s3.toFixed(3):'')+'</td></tr>'});
    h+='</tbody></table></div><p class="small mute">The third row is the same latent model trained for '+fmt(((TY.f4long||{}).log||[]).slice(-1).map(r=>r[0])[0]||0)+' steps, as many as fit in the pixel model\'s training time on the same CPU (fixed compute, as the paper\'s Figure 17 compares at fixed V100-days); it is measured here only, the page ships the matched-steps pair. "Held-out": the 12 prompt combinations never shown in training, 8 samples each; "seen": 24 training combinations, 4 samples each; 50 DDIM steps; "fully right" means colour, shape and position all match. The checker itself scores '+pc((E.real||{}).all)+' on 1,000 real images. Training time excludes encoding the 40,000 training images once with ℰ ('+((TY.f4||{}).enc_sec||0).toFixed(1)+' s), as the paper does.</p>';
    $('toyRes').innerHTML=h;
    const curve=(host,series,yl,lg)=>fit($(host),w=>{const H=200,pl=46,pr=10,pt=10,pb=30;const all=series.flatMap(s=>s.d);if(!all.length){$(host).innerHTML='';return}
      const xm=Math.max(...all.map(p=>p[0])),ys=all.map(p=>p[1]),y0=lg?Math.min(...ys):0,y1=lg?Math.max(...ys):1;
      const X=v=>pl+(w-pl-pr)*v/xm,Y=v=>pt+(H-pt-pb)*(1-(lg?(Math.log10(v)-Math.log10(y0))/(Math.log10(y1)-Math.log10(y0)):(v-y0)/(y1-y0)));let s='';
      (lg?[0.02,0.05,0.1,0.2,0.5].filter(v=>v>=y0&&v<=y1):[0,0.25,0.5,0.75,1]).forEach(v=>{s+=ln2(pl,Y(v),w-pr,Y(v),'var(--line)')+tx(pl-5,Y(v)+4,lg?v:(100*v)+'%',{fs:11,a:'end',c:'var(--mute)'})});
      [0,xm/2,xm].forEach((v,i)=>{s+=tx(X(v),H-pb+15,fmt(v),{fs:11,a:['start','middle','end'][i],c:'var(--mute)'})});
      series.forEach(se=>{s+='<polyline fill="none" stroke="'+se.c+'" stroke-width="1.6" points="'+se.d.map(p=>X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)).join(' ')+'"/>'});
      const L=legend(series.map(se=>[se.n,se.c]),pl,H-2,w-pl);$(host).innerHTML=svgW(w,H+L.h,s+L.s,yl)});
    curve('toyLoss',[{n:'latent',c:'var(--acc)',d:(TY.f4||{}).log||[]},{n:'pixel',c:'var(--bad)',d:(TY.pix||{}).log||[]}],'loss',true);
    curve('toyAcc',[{n:'latent',c:'var(--acc)',d:((TY.f4||{}).evals||[]).map(e=>[e.step,e.held.all])},{n:'pixel',c:'var(--bad)',d:((TY.pix||{}).evals||[]).map(e=>[e.step,e.held.all])},{n:'latent, longer',c:'var(--mute)',d:((TY.f4long||{}).evals||[]).map(e=>[e.step,e.held.all])}],'accuracy',false);
    const qd=q.dm||{};$('toyHonest').innerHTML='<div class="t">How far to trust the toy</div><p class="small">'+
      'The JavaScript forward passes are checked against PyTorch on the same quantised weights: '+(cf.summary||'see src/check_forward.json')+'. Weights are '+(q.bits||8)+'-bit per row; quantisation moved the held-out score from '+pc(((qd.f4||{}).float||{}).all)+' to '+pc(((qd.f4||{}).quant||{}).all)+' (latent) and '+pc(((qd.pix||{}).float||{}).all)+' to '+pc(((qd.pix||{}).quant||{}).all)+' (pixel), and the f = 4 autoencoder\'s PSNR from '+(((q.ae||{})[4]||{}).float||{psnr:0}).psnr.toFixed(2)+' to '+(((q.ae||{})[4]||{}).quant||{psnr:0}).psnr.toFixed(2)+' dB. '+
      'What the toy can test: that the same diffusion recipe works in a learned latent, that each step there is cheaper, and how both models fare after the same training steps and the same training time. The two loss curves are not comparable with each other: they measure noise prediction in different spaces. What it cannot: FID, the f sweep at scale (a 32 × 32 image of one shape has a few numbers of real content, so even strong compression loses little), and the perceptual and adversarial losses, which need a pretrained network. Single training run per model, one seed.</p>'});
})();
