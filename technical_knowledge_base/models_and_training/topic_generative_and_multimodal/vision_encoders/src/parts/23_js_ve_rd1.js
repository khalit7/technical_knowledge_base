// ---- Reading, sections 1 and 2: predictions, FLOP table, errors, position resize animation, token norms, CLIP-score filter ----
(function(){
  const $=id=>document.getElementById(id),E=RD.esc,U=VEU;
  // predict-then-reveal: index of the right option per card
  const RIGHT={'ve-p1':1,'ve-p2':2,'ve-p3':1,'ve-p4':2,'ve-p5':0,'ve-p6':1,'ve-p7':0};
  document.querySelectorAll('#t-read .pr').forEach(pr=>{const ok=RIGHT[pr.id];const ans=pr.querySelector('.ans');
    pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      pr.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(+x.dataset.a===ok)x.classList.add('right')});
      if(+b.dataset.a!==ok)b.classList.add('wrong');ans.hidden=false}))});
  // numbers in the prose are written at build time by src/runs/fill_prose.py
  const R=VE.res;
  // FLOP accounting table
  (function(){const el=$('ve-flops');if(!el)return;const g=x=>x==null?'':x.toFixed(2);
    let h='<h4>One formula, a FLOP counter and two published numbers</h4><div class="tw"><table class="rd-narrow"><thead><tr><th>Model, input</th><th class="num">Formula</th><th class="num">Counter, eager attention</th><th class="num">Counter, fused attention</th><th class="num">Published (timm card)</th></tr></thead><tbody>';
    VE.flops.rows.forEach(r=>{h+='<tr><td>'+E(r.name)+'</td><td class="num">'+g(r.formula_gmacs)+'</td><td class="num">'+g(r.counted_gmacs_eager)+'</td><td class="num">'+g(r.counted_gmacs_sdpa)+'</td><td class="num">'+(r.published_gmacs==null?'<span class="mute">none</span>':g(r.published_gmacs))+'</td></tr>'});
    h+='</tbody></table></div><p class="small mute">GMACs per image. Formula from section 1 (for SigLIP 2 it leaves out the attention-pooling head, which the eager count includes: 0.24 GMACs more). Counter: <code>FlopCounterMode</code> on transformers models built from the configs with random weights, CPU, 2026-10-17 <span class="meas">measured</span>; the fused count equals the formula minus 2N&sup2;DL exactly. Published: timm model cards read 2026-10-17 <span class="indep">third-party</span>. Script: <code>src/runs/flops.py</code>.</p>';
    el.innerHTML=h})();
  // the real error messages are written into the HTML (section 2); check_data.py compares them with out/resolution.json

  // ---- position table resize animation ----
  (function(){const card=$('ve-ra');if(!card)return;let slot=0;const sv=$('ve-ra-svg'),cap=$('ve-ra-cap'),cnt=$('ve-ra-cnt');
    const P224=R.clip.pos224,P448=R.clip.pos448,run=R.clip.runs;
    const STEPS=[
      ['The trained grid','At 224 pixels CLIP B/32 cuts the image into 7 &times; 7 patches of 32 pixels. Its learned table has one position vector per slot (49, plus one for [CLS]). Right: how similar the chosen slot\'s vector is to every other slot\'s. Nobody told the model the grid is 2-D, yet the pattern is: slots close by, and slots on the same border, have similar vectors (try the centre slot).'],
      ['A bigger image, no rows for it','At 448 pixels the same patches make a 14 &times; 14 grid: 196 slots, but the table still has 49 rows. Without interpolation the model refuses (the error above).'],
      ['Resize the table like an image','<code>interpolate_pos_encoding</code> reshapes the 49 vectors into a 7 &times; 7 &times; 768 grid and resizes it bicubically to 14 &times; 14. Every new vector is a smooth blend of its trained neighbours; none of them was ever trained.'],
      ['The resized table','The similarity pattern survives, stretched over four times as many slots. The model now runs at 448, on positions it has never seen.'],
      ['What it costs','Four times the tokens (49 to 196) and about 4 times the compute; on the 16 test images the image embedding moves to an average cosine of '+run['448'].cos_to_224.toFixed(2)+' with its own 224-pixel version (as low as '+run['448'].cos_to_224_min.toFixed(2)+'). Caption matching stays at '+run['448'].matched+' of 16 on these easy pairs.']];
    function draw(i){const W=RD.width(sv),pad=8,half=Math.min(260,(W-pad*3)/2),H=half+28;
      const fine=i>=1,g=fine?14:7,s224=slot,r=Math.floor(slot/7),c=slot%7,s448=(2*r)*14+2*c;
      let b='<image href="'+VE.thumbs.p01_cat+'" x="'+pad+'" y="20" width="'+half+'" height="'+half+'" preserveAspectRatio="none"/>';
      for(let k=1;k<g;k++){const p=pad+k*half/g,q=20+k*half/g;b+='<line x1="'+p+'" y1="20" x2="'+p+'" y2="'+(20+half)+'" stroke="#fff" stroke-opacity=".7" stroke-width="1"/><line x1="'+pad+'" y1="'+q+'" x2="'+(pad+half)+'" y2="'+q+'" stroke="#fff" stroke-opacity=".7" stroke-width="1"/>'}
      const cs=half/g,sr=fine?2*r:r,sc=fine?2*c:c;b+='<rect x="'+(pad+sc*cs)+'" y="'+(20+sr*cs)+'" width="'+cs+'" height="'+cs+'" fill="none" stroke="#ffd400" stroke-width="2.5"/>';
      b+=RD.t(pad,13,(fine?'448':'224')+' px, '+g+' &times; '+g,{fs:11});
      const x2=pad*2+half;
      if(i===1){b+='<rect x="'+x2+'" y="20" width="'+half+'" height="'+half+'" fill="none" stroke="var(--bad)" stroke-dasharray="4 3"/>'+RD.t(x2+half/2,20+half/2,'49 rows for 196 slots',{a:'middle',fill:'var(--bad)',fs:12})}
      else{const PP=(i>=3?P448:P224)[String(slot)],gg=i>=3?14:7,ss=i>=3?s448:s224,cw=half/gg;
        for(let k=0;k<gg*gg;k++){const col=U.ramp((PP[k]-30)/70);b+='<rect x="'+(x2+(k%gg)*cw)+'" y="'+(20+Math.floor(k/gg)*cw)+'" width="'+(cw+0.5)+'" height="'+(cw+0.5)+'" fill="rgb('+col.map(Math.round).join(',')+')"/>'}
        b+='<rect x="'+(x2+(ss%gg)*cw)+'" y="'+(20+Math.floor(ss/gg)*cw)+'" width="'+cw+'" height="'+cw+'" fill="none" stroke="#fff" stroke-width="2"/>';
        if(i===2)b+='<text x="'+(x2+half/2)+'" y="'+(20+half/2)+'" text-anchor="middle" font-size="13" fill="#fff" stroke="#000" stroke-width="3" paint-order="stroke">bicubic &rarr; 14 &times; 14</text>'}
      b+=RD.t(x2,13,i>=3?'resized table, 14 &times; 14':'trained table, 7 &times; 7',{fs:11});
      sv.innerHTML=RD.svg(W,H,b,'Patch grid and position-embedding similarity');
      cap.innerHTML='<div class="t">'+(i+1)+'/5 '+STEPS[i][0]+'</div><p>'+STEPS[i][1]+'</p>';
      const m=U.macs(fine?448:224,32,768,12,3072,1);
      cnt.innerHTML=RD.stat('Grid',g+' &times; '+g,'')+RD.stat('Table rows','49 + 1',i>=2?'resized to '+(fine?'196 + 1':'')+'':'learned')+RD.stat('Tokens',(fine?196:49)+' + [CLS]','')+RD.stat('GMACs',(m.total/1e9).toFixed(2),'formula')+RD.stat('Cosine to 224 embedding',i>=4?run['448'].cos_to_224.toFixed(3):(i===0?'1':'step 5'),'mean of 16 images')}
    const A=RD.anim({card:'ve-ra',ctl:'ve-ra-ctl',n:5,draw,ms:2600,label:'Resize step'});
    RD.seg($('ve-ra-slot'),m=>{slot=+m;A.redraw()});RD.onResize(()=>A.redraw())})();

  // ---- token norms (registers) ----
  (function(){const card=$('ve-reg');if(!card)return;const D=VE.dense,keys=D.allkeys;let img=keys.indexOf('p01_cat');
    const chips=$('ve-reg-img'),maps=$('ve-reg-maps');const ORDER=['clip','siglip','dino','dinoreg','mae'];
    const nr={};ORDER.forEach(w=>nr[w]=U.u8(D.enc[w].normRatio));
    chips.innerHTML=keys.map((k,i)=>'<button data-i="'+i+'"'+(i===img?' class="on"':'')+'>'+E(k)+'</button>').join('');
    maps.innerHTML=ORDER.map(w=>'<div class="rd-gen"><div class="h">'+U.ENC[w]+'</div><canvas id="ve-reg-'+w+'" width="160" height="160"></canvas><div class="c" id="ve-reg-c-'+w+'"></div></div>').join('');
    function draw(){ORDER.forEach(w=>{const e=D.enc[w],g=e.grid,P=g*g,a=nr[w].subarray(img*P,(img+1)*P);
      U.grid($('ve-reg-'+w),g,i=>U.ramp(Math.min(1,(a[i]/10-0.5)/3.5)));
      let mx=0;for(let i=0;i<P;i++)mx=Math.max(mx,a[i]/10);const over=[...a].filter(v=>v/10>3).length;
      $('ve-reg-c-'+w).innerHTML='max '+mx.toFixed(1)+'&times; median ('+e.normMed[img]+')'+(over?', '+over+' patch'+(over>1?'es':'')+' over 3&times;':'')+(e.regNorm?'<br>registers: median '+(e.regNorm[img].reduce((s,x)=>s+x,0)/e.regNorm[img].length).toFixed(0):'')})}
    chips.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;img=+b.dataset.i;chips.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));draw()});
    RD.onRender(draw);RD.onResize(draw);draw()})();

  // ---- CLIP-score filter on the 16 x 16 matrix ----
  (function(){const card=$('ve-laion');if(!card)return;const S=VE.lab.clip_sim16,keys=VE.lab.keys,t=$('ve-laion-t'),sv=$('ve-laion-svg'),out=$('ve-laion-out');
    const pos=[],neg=[];for(let i=0;i<16;i++)for(let j=0;j<16;j++)(i===j?pos:neg).push({v:S[i][j],i,j});
    function draw(){const th=+t.value;$('ve-laion-v').textContent=th.toFixed(3);
      const pp=pos.filter(p=>p.v>=th).length,np=neg.filter(p=>p.v>=th).length;
      out.innerHTML=RD.stat('True pairs kept',pp+' of 16','')+RD.stat('Wrong pairs kept',np+' of 240','')+RD.stat('Share of kept pairs that are wrong',pp+np?U.pct(np/(pp+np)):'n/a','');
      const W=RD.width(sv),x0=8,x1=W-8,lo=0.05,hi=0.42,X=v=>x0+(v-lo)/(hi-lo)*(x1-x0);let b='';
      [0.1,0.2,0.3,0.4].forEach(v=>{b+='<line x1="'+X(v)+'" y1="10" x2="'+X(v)+'" y2="96" stroke="var(--line)"/>'+RD.t(X(v),108,v.toFixed(1),{a:'middle',fill:'var(--mute)'})});
      b+=RD.t(x0,10,'true pairs',{fill:'var(--mute)'})+RD.t(x0,58,'wrong pairs',{fill:'var(--mute)'});
      pos.forEach((p,k)=>{b+='<circle cx="'+X(p.v)+'" cy="'+(22+(k%3)*7)+'" r="3.6" fill="'+(p.v>=th?'var(--good)':'var(--dim)')+'"><title>'+E(keys[p.i])+' '+p.v.toFixed(3)+'</title></circle>'});
      neg.forEach((p,k)=>{b+='<circle cx="'+X(p.v)+'" cy="'+(68+(k%5)*5.5)+'" r="2.6" fill="'+(p.v>=th?'var(--bad)':'var(--dim)')+'" fill-opacity=".85"><title>image '+E(keys[p.i])+', caption of '+E(keys[p.j])+' '+p.v.toFixed(3)+'</title></circle>'});
      b+='<line x1="'+X(th)+'" y1="4" x2="'+X(th)+'" y2="98" stroke="var(--acc)" stroke-width="2"/>';
      sv.innerHTML=RD.svg(W,114,b,'CLIP cosines of true and wrong pairs with the threshold')}
    t.addEventListener('input',draw);RD.onRender(draw);RD.onResize(draw);draw()})();
})();
