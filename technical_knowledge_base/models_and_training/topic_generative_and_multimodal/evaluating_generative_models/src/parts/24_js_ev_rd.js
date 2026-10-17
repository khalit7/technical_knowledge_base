// ---- Reading tab visuals (prefix ev) ----
(function(){
  const {E,SET,MET,fmt,val,col,ticks,lg}=EVH;const t=RD.t;
  const $=id=>document.getElementById(id);

  // predict-then-reveal blocks: data-right on .pr gives the right option
  document.querySelectorAll('#t-read .pr').forEach(pr=>{pr.addEventListener('click',e=>{const b=e.target.closest('button[data-a]');if(!b)return;
    const right=pr.dataset.right;pr.querySelectorAll('button[data-a]').forEach(x=>{x.classList.toggle('right',x.dataset.a===right);x.classList.toggle('wrong',x===b&&x.dataset.a!==right)});
    pr.querySelector('.ans').hidden=false})});

  // the eight sets with their strips
  $('ev-sets').innerHTML=E.sets.map(s=>'<div><img src="'+s.strip+'" alt="'+RD.esc(s.label)+' samples" style="display:block;width:100%;image-rendering:pixelated;border-radius:3px;margin-bottom:4px"><b style="color:'+s.color+'">'+RD.esc(s.label)+'</b>'+RD.esc(s.what)+'</div>').join('');

  // ---------- FID in four steps ----------
  const A1={set:'ddpm'};
  const CAP1=[
    ['Two sets of images','The reference: the 10,000 real test images. The candidate: 10,000 images of the chosen set. Each strip shows ten of them.'],
    ['Every image becomes a point','Inception-v3 maps each image to 2,048 numbers. Drawn here: 300 images of each set, projected on the two directions along which the real features vary most. Grey: real test images.'],
    ['Fit a Gaussian to each cloud','Mean (the cross) and covariance (the ellipse covers about 86% of a 2-D Gaussian: two standard deviations). FID never looks at single points again: only these two summaries.'],
    ['The mean term','The squared distance between the two means, summed over all 2,048 dimensions. Large when the average content is wrong.'],
    ['The covariance term','Tr(&Sigma;<sub>r</sub> + &Sigma;<sub>g</sub> &minus; 2(&Sigma;<sub>r</sub>&Sigma;<sub>g</sub>)<sup>1/2</sup>): zero when the two clouds have the same spread and orientation. Large when variety is missing or misplaced.'],
    ['FID = mean term + covariance term','The number reported. Compare it with the floor: the real training images score '+E.txt['m:real:fid:10000']+' at this sample count.']];
  function ellipse(mu,c,sx,sy,k){const a=c[0][0],b=c[0][1],d=c[1][1];const tr=(a+d)/2,det=Math.sqrt(Math.max(0,((a-d)/2)**2+b*b));
    const l1=tr+det,l2=Math.max(1e-12,tr-det);const ang=Math.atan2(l1-a,b||1e-12);const pts=[];
    for(let i=0;i<=48;i++){const th=2*Math.PI*i/48;const x=k*Math.sqrt(l1)*Math.cos(th),y=k*Math.sqrt(l2)*Math.sin(th);
      pts.push(sx(mu[0]+x*Math.cos(ang)-y*Math.sin(ang)).toFixed(1)+','+sy(mu[1]+x*Math.sin(ang)+y*Math.cos(ang)).toFixed(1))}return pts.join(' ')}
  function draw1(i){
    const host=$('ev-an1-svg'),W=Math.min(640,RD.width(host)),H=Math.round(Math.min(360,W*0.62));
    const P=E.pca,R=P.pts.test,G=P.pts[A1.set],SR=P.stats.test,SG=P.stats[A1.set];
    const ex=S=>{const sx=2*Math.sqrt(S.cov[0][0]),sy=2*Math.sqrt(S.cov[1][1]);return [[S.mu[0]-sx,S.mu[1]-sy],[S.mu[0]+sx,S.mu[1]+sy]]};
    const all=R.concat(G,ex(SR),ex(SG));let x0=Math.min(...all.map(p=>p[0])),x1=Math.max(...all.map(p=>p[0])),y0=Math.min(...all.map(p=>p[1])),y1=Math.max(...all.map(p=>p[1]));
    const px=(x1-x0)*0.05,py=(y1-y0)*0.05;x0-=px;x1+=px;y0-=py;y1+=py;
    const L=10,T=i===0?70:10,sx=v=>L+(v-x0)/(x1-x0)*(W-2*L),sy=v=>T+(1-(v-y0)/(y1-y0))*(H-T-24);
    let b='';const c=col(A1.set);
    if(i===0){b+='<image href="'+E.ref_strip+'" x="'+L+'" y="8" width="'+Math.min(W-2*L,420)+'" height="'+Math.min(W-2*L,420)/10+'" style="image-rendering:pixelated"/>';
      b+='<image href="'+SET[A1.set].strip+'" x="'+L+'" y="'+(16+Math.min(W-2*L,420)/10)+'" width="'+Math.min(W-2*L,420)+'" height="'+Math.min(W-2*L,420)/10+'" style="image-rendering:pixelated"/>';
      b+=t(L,H-48,'Top strip: real test images.',{fs:11.5});
      b+=t(L,H-30,'Below it: '+RD.esc(SET[A1.set].label)+'.',{fs:11.5});
      b+=t(L,H-12,'Next: each image becomes a feature vector.',{fs:11.5,fill:'var(--mute)'});
    }else{
      b+='<rect x="'+L+'" y="'+T+'" width="'+(W-2*L)+'" height="'+(H-T-24)+'" fill="none" stroke="var(--line)"/>';
      R.forEach(p=>b+='<circle cx="'+sx(p[0]).toFixed(1)+'" cy="'+sy(p[1]).toFixed(1)+'" r="2" fill="var(--mute)" opacity="'+(i>=2?0.25:0.5)+'"/>');
      G.forEach(p=>b+='<circle cx="'+sx(p[0]).toFixed(1)+'" cy="'+sy(p[1]).toFixed(1)+'" r="2" fill="'+c+'" opacity="'+(i>=2?0.3:0.65)+'"/>');
      if(i>=2){b+='<polygon points="'+ellipse(SR.mu,SR.cov,sx,sy,2)+'" fill="none" stroke="var(--ink)" stroke-width="'+(i===4?2.5:1.5)+'"/>';
        b+='<polygon points="'+ellipse(SG.mu,SG.cov,sx,sy,2)+'" fill="none" stroke="'+c+'" stroke-width="'+(i===4?2.5:1.5)+'"/>';
        [[SR.mu,'var(--ink)'],[SG.mu,c]].forEach(([m,cc])=>{const X=sx(m[0]),Y=sy(m[1]);b+='<path d="M'+(X-6)+' '+Y+'h12M'+X+' '+(Y-6)+'v12" stroke="'+cc+'" stroke-width="2.5"/>'})}
      if(i===3||i===5){b+='<line x1="'+sx(SR.mu[0])+'" y1="'+sy(SR.mu[1])+'" x2="'+sx(SG.mu[0])+'" y2="'+sy(SG.mu[1])+'" stroke="var(--bad)" stroke-width="2.5" stroke-dasharray="5 3"/>'}
      b+=t(L,H-8,W<520?'PC 1 and PC 2 of real features ('+P.var_pct+' of variance)':'PC 1 (horizontal) and PC 2 (vertical) of the real Inception features; '+P.var_pct+' of their variance',{fs:11,fill:'var(--mute)'});
    }
    host.innerHTML=RD.svg(W,H,b,'FID step '+(i+1));
    $('ev-an1-cap').innerHTML='<div class="t">'+(i+1)+'. '+CAP1[i][0]+'</div><p>'+CAP1[i][1]+'</p>';
    const d=E.dec[A1.set];
    $('ev-an1-cnt').innerHTML=RD.stat('images per set','10,000','reference: test set')+
      RD.stat('mean term',i>=3?fmt(d.mean,2):'&middot;','&#8214;&mu;r &minus; &mu;g&#8214;&sup2;, 2,048-d')+
      RD.stat('covariance term',i>=4?fmt(d.cov,2):'&middot;','trace term, 2,048-d')+
      RD.stat('FID',i>=5?fmt(d.mean+d.cov,2):'&middot;',i>=5?'floor (real set) '+E.txt['m:real:fid:10000']:'');
  }
  const an1=RD.anim({card:'ev-an1',ctl:'ev-an1-ctl',n:6,draw:draw1,ms:2600,label:'FID step'});
  RD.seg($('ev-an1-set'),m=>{A1.set=m;an1.reset(6);an1.play()});
  RD.onResize(()=>an1.redraw());

  // ---------- FID against N ----------
  let biasX='n';
  function drawBias(){
    const host=$('ev-bias-svg'),W=Math.min(760,RD.width(host)),H=Math.round(Math.min(380,Math.max(260,W*0.55)));
    const L=46,R=W<480?12:92,T=10,B=34,ks=E.sets.map(s=>s.k);
    let lo=1e9,hi=0;ks.forEach(k=>E.ns.forEach(n=>{const v=val(k,'fid',n);lo=Math.min(lo,v.min);hi=Math.max(hi,v.max)}));
    const inv=biasX==='inv';let sy;
    if(inv){lo=0;hi*=1.05;sy=v=>T+(1-(v-lo)/(hi-lo))*(H-T-B)}else{lo=Math.max(0.5,lo*0.8);hi*=1.2;sy=v=>T+(1-(lg(Math.max(v,lo))-lg(lo))/(lg(hi)-lg(lo)))*(H-T-B)}
    const xs=biasX==='n'?(n=>L+(lg(n)-lg(200))/(lg(12500)-lg(200))*(W-L-R)):(n=>L+(1/n)/(1/200)*(W-L-R));
    let b='';const lab=[];
    (inv?[0,20,40,60,80,100,120].filter(v=>v<=hi):ticks(lo,hi)).forEach(v=>{const y=sy(v);b+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+t(L-4,y+4,fmt(v,0),{a:'end',fs:10.5,fill:'var(--mute)'})});
    E.ns.forEach(n=>{const x=xs(n);b+='<line x1="'+x+'" x2="'+x+'" y1="'+T+'" y2="'+(H-B)+'" stroke="var(--line)"/>';
      if(!inv||n<=1000)b+=t(x,H-B+14,!inv?n.toLocaleString('en-US'):'1/'+n.toLocaleString('en-US'),{a:'middle',fs:W<480?9:10.5,fill:'var(--mute)'})});
    if(biasX==='inv')b+=t(xs(1e12),H-B+14,'0',{a:'middle',fs:10.5,fill:'var(--mute)'});
    b+=t((L+W-R)/2,H-4,biasX==='n'?'generated samples N (log scale)':'1 / N (linear; 0 = infinitely many samples)',{a:'middle',fs:11,fill:'var(--mute)'});
    ks.forEach(k=>{const c=col(k);let path='';E.ns.forEach((n,i)=>{const v=val(k,'fid',n);const x=xs(n);path+=(i?'L':'M')+x.toFixed(1)+' '+sy(v.mean).toFixed(1);
        b+='<line x1="'+x+'" x2="'+x+'" y1="'+sy(v.min)+'" y2="'+sy(v.max)+'" stroke="'+c+'" stroke-width="3" opacity=".5"/>'});
      b+='<path d="'+path+'" fill="none" stroke="'+c+'" stroke-width="1.8"/>';
      if(biasX==='inv'){const f=E.fit[k];const x0=xs(1e12),x1=xs(200);b+='<line x1="'+x0+'" y1="'+sy(f.inf)+'" x2="'+x1+'" y2="'+sy(f.inf+f.K/200)+'" stroke="'+c+'" stroke-dasharray="4 3" opacity=".8"/>'}
      if(R>40){const v=val(k,'fid',biasX==='n'?10000:250);let y=sy(v.mean)+4;while(lab.some(q=>Math.abs(q-y)<11))y+=11;lab.push(y);b+=t(W-R+4,y,RD.esc(SET[k].short),{fs:10.5,fill:c})}});
    host.innerHTML=RD.svg(W,H,b,'FID against sample count');
    $('ev-bias-leg').innerHTML=ks.map(k=>'<span><i style="background:'+col(k)+'"></i>'+RD.esc(SET[k].short)+'</span>').join('');
  }
  $('ev-bias-tab').innerHTML='<thead><tr><th>Set</th><th class="num">FID at 1,000</th><th class="num">FID at 10,000</th><th class="num">FID<sub>&infin;</sub> (fit)</th><th class="num">slope K</th></tr></thead><tbody>'+
    E.sets.map(s=>'<tr><td style="color:'+s.color+'">'+RD.esc(s.short)+'</td><td class="num">'+fmt(val(s.k,'fid',1000).mean,1)+'</td><td class="num">'+fmt(val(s.k,'fid',10000).mean,1)+'</td><td class="num">'+fmt(E.fit[s.k].inf,1)+'</td><td class="num">'+fmt(E.fit[s.k].K,0)+'</td></tr>').join('')+'</tbody>';
  RD.seg($('ev-bias-x'),m=>{biasX=m;drawBias()});
  RD.onRender(drawBias);RD.onResize(drawBias);drawBias();

  // ---------- KID table ----------
  $('ev-kidtab').innerHTML='<thead><tr><th>Set</th><th class="num">KID at 250</th><th class="num">spread over subsets</th><th class="num">KID at 10,000</th></tr></thead><tbody>'+
    E.sets.map(s=>{const a=val(s.k,'kid',250),sd=val(s.k,'kid_sd',250),z=val(s.k,'kid',10000);return '<tr><td style="color:'+s.color+'">'+RD.esc(s.short)+'</td><td class="num">'+fmt(a.mean,2)+'</td><td class="num">&plusmn;'+fmt(sd.mean,2)+'</td><td class="num">'+fmt(z.mean,2)+'</td></tr>'}).join('')+'</tbody>';

  // ---------- precision / recall ----------
  let prSp='inception_10000';
  function drawPR(){
    const host=$('ev-pr-svg'),W=Math.min(520,RD.width(host)),H=Math.round(Math.min(420,W*0.85));
    const L=42,R=12,T=10,B=36,sx=v=>L+v*(W-L-R),sy=v=>T+(1-v)*(H-T-B);let b='';
    [0,0.25,0.5,0.75,1].forEach(v=>{b+='<line x1="'+sx(0)+'" x2="'+sx(1)+'" y1="'+sy(v)+'" y2="'+sy(v)+'" stroke="var(--line)"/>'+t(L-4,sy(v)+4,fmt(v,2),{a:'end',fs:10.5,fill:'var(--mute)'});
      b+='<line y1="'+sy(0)+'" y2="'+sy(1)+'" x1="'+sx(v)+'" x2="'+sx(v)+'" stroke="var(--line)"/>'+t(sx(v),H-B+14,fmt(v,2),{a:'middle',fs:10.5,fill:'var(--mute)'})});
    b+=t((L+W-R)/2,H-4,'recall: share of real images covered',{a:'middle',fs:11,fill:'var(--mute)'});
    b+='<text x="12" y="'+((T+H-B)/2)+'" font-size="11" fill="var(--mute)" text-anchor="middle" transform="rotate(-90 12 '+((T+H-B)/2)+')">precision: share of samples realistic</text>';
    const placed=[];
    E.sets.forEach(s=>{const p=E.pr[s.k][prSp];const X=sx(p[1]),Y=sy(p[0]);b+='<circle cx="'+X+'" cy="'+Y+'" r="5" fill="'+s.color+'"/>';
      const lw=s.short.length*6+4;let best=null;
      for(const dy of [4,-8,16,-20,28]){if(best)break;for(const side of [1,-1]){const x0=side>0?X+8:X-8-lw,y=Y+dy;if(x0<L||x0+lw>W-2)continue;
        if(!placed.some(q=>x0<q[0]+q[2]&&q[0]<x0+lw&&Math.abs(q[1]-y)<12)){best=[x0,y,lw];break}}}
      if(!best)best=[X+8,Y+4,lw];placed.push(best);b+=t(best[0],best[1],RD.esc(s.short),{fs:10.5,fill:s.color})});
    host.innerHTML=RD.svg(W,H,b,'Precision against recall');
  }
  RD.seg($('ev-pr-sp'),m=>{prSp=m;drawPR()});RD.onRender(drawPR);RD.onResize(drawPR);drawPR();

  // ---------- ranks at 10,000 ----------
  const MODELS=E.sets.filter(s=>s.model).map(s=>s.k),MK=['fid','kid','fd_dino','cmmd','fd_clf'];
  const rk={};MK.forEach(m=>{const order=MODELS.slice().sort((a,b)=>val(a,m,10000).mean-val(b,m,10000).mean);order.forEach((k,i)=>{(rk[k]=rk[k]||{})[m]=i+1})});
  $('ev-ranktab').innerHTML='<thead><tr><th>Set</th>'+MK.map(m=>'<th class="num">'+MET[m].name+'</th>').join('')+'<th class="num">precision / recall (DINOv2)</th></tr></thead><tbody>'+
    MODELS.map(k=>'<tr><td style="color:'+col(k)+'">'+RD.esc(SET[k].short)+'</td>'+MK.map(m=>'<td class="num">'+fmt(val(k,m,10000).mean,MET[m].dp)+' <span class="mute">('+rk[k][m]+')</span></td>').join('')+
      '<td class="num">'+fmt(E.pr[k].dino_10000[0],2)+' / '+fmt(E.pr[k].dino_10000[1],2)+'</td></tr>').join('')+'</tbody>';

  // ---------- JPEG before / after ----------
  const A2={q:'75'};
  const CAP2=[['The real images, as stored','Four real training images (PNG, lossless), drawn 4x. Against the 10,000 test images their FID is the floor.'],
    ['Saved as JPEG and read back','PIL, grey, quality '+'Q'+'. To the eye: the same garments.'],
    ['What changed','The absolute difference, amplified 8x: JPEG works on 8 x 8 blocks, and on a 28-pixel image one block is almost a third of the width.'],
    ['What FID sees','The same 10,000 real images, scored three ways.']];
  function draw2(i){
    const host=$('ev-an2-svg'),W=Math.min(640,RD.width(host)),J=E.jpeg,q=A2.q;
    const n=4,gap=8,sz=Math.min(112,Math.floor((W-gap*(n-1))/n));let H=sz+30,b='';
    if(i<3){const src=i===0?J.orig:i===1?J['q'+q]:J['d'+q];
      src.forEach((u,j)=>{b+='<image href="'+u+'" x="'+(j*(sz+gap))+'" y="0" width="'+sz+'" height="'+sz+'" style="image-rendering:pixelated"/>'});
      b+=t(0,sz+18,i===0?'PNG (lossless)':i===1?'JPEG quality '+q:'|JPEG - PNG| x 8',{fs:11.5,fill:'var(--mute)'});
    }else{const rows=[['real vs test (nothing wrong)',E.pit.real.fid],['JPEG '+q+' real vs test',E.pit['real_jpeg'+q].fid]];
      if(q==='75')rows.push(['JPEG 75 real vs JPEG 75 test',E.pit.real_jpeg75_vs_test_jpeg75.fid]);
      const mx=Math.max(...rows.map(r=>r[1]))*1.1,lw=W<480?150:210;H=rows.length*30+10;
      rows.forEach((r,j)=>{const y=j*30+4,w=(W-lw-60)*r[1]/mx;b+=t(0,y+15,r[0],{fs:11.5});b+='<rect x="'+lw+'" y="'+y+'" width="'+Math.max(2,w)+'" height="18" rx="3" fill="'+(j===0?'var(--good)':j===1?'var(--bad)':'var(--acc)')+'"/>'+t(lw+w+6,y+14,fmt(r[1],2),{fs:11.5})});}
    host.innerHTML=RD.svg(W,H,b,'JPEG before and after');
    $('ev-an2-cap').innerHTML='<div class="t">'+(i+1)+'. '+CAP2[i][0]+'</div><p>'+CAP2[i][1].replace('Q',q)+'</p>';
    $('ev-an2-cnt').innerHTML=RD.stat('mean |change| per pixel',i>=1?fmt(J.mad[q],2)+' of 255':'&middot;','over all 10,000 images')+RD.stat('PSNR',i>=1?fmt(J.psnr[q],1)+' dB':'&middot;','JPEG against PNG')+
      RD.stat('FID',i>=3?fmt(E.pit['real_jpeg'+q].fid,2):'&middot;','floor '+fmt(E.pit.real.fid,2));
  }
  const an2=RD.anim({card:'ev-an2',ctl:'ev-an2-ctl',n:4,draw:draw2,ms:2400,label:'JPEG step'});
  RD.seg($('ev-an2-q'),m=>{A2.q=m;an2.reset(4);an2.play()});RD.onResize(()=>an2.redraw());

  // ---------- Stable Diffusion: four guidance scales ----------
  const S=E.sd,A3={p:Object.keys(S.prompts)[0],seed:'0'};
  $('ev-sd-p').innerHTML=Object.keys(S.prompts).map((k,i)=>'<button data-m="'+k+'"'+(i?'':' class="on"')+'>'+RD.esc(S.short[k])+'</button>').join('');
  function drawSD(){const g=$('ev-sd-grid');
    g.innerHTML=S.scales.map(sc=>{const nm=A3.p+'_s'+A3.seed+'_g'+sc;const r=S.img[nm];
      return '<figure><img src="'+r.u+'" alt="SD 1.5, guidance '+sc+'"><figcaption><b>s = '+sc+(sc==1?' (off)':'')+'</b><br>CLIP-S '+fmt(r.cs,3)+' &middot; L/14 cos '+fmt(r.cl,3)+'<br>VQA P(yes) '+fmt(r.vq,2)+' &middot; questions '+Math.round(r.tf*3)+'/3</figcaption></figure>'}).join('');
    const nm=A3.p+'_s'+A3.seed+'_g';
    $('ev-sd-q').innerHTML='<b>'+RD.esc(S.prompts[A3.p])+'</b>\n'+S.qs[A3.p].map((q,j)=>q+'  '+S.scales.map(sc=>'s='+sc+': '+fmt(S.img[nm+sc].el[j],2)).join('  ')).join('\n');}
  RD.seg($('ev-sd-p'),m=>{A3.p=m;drawSD()});RD.seg($('ev-sd-seed'),m=>{A3.seed=m;drawSD()});drawSD();
  $('ev-sd-tab').innerHTML='<thead><tr><th>Guidance scale s</th><th class="num">CLIPScore (B/32, x2.5)</th><th class="num">CLIP L/14-336 cosine</th><th class="num">VQA P(yes), whole prompt</th><th class="num">element questions yes</th><th class="num">seconds per image</th></tr></thead><tbody>'+
    S.scales.map(sc=>{const a=S.avg[sc];return '<tr><td>'+sc+(sc==1?' (no guidance)':sc==7.5?' (default)':'')+'</td><td class="num">'+fmt(a.cs,3)+'</td><td class="num">'+fmt(a.cl,3)+'</td><td class="num">'+fmt(a.vq,2)+'</td><td class="num">'+fmt(100*a.tf,0)+'%</td><td class="num">'+fmt(a.sec,1)+'</td></tr>'}).join('')+'</tbody>';
})();
