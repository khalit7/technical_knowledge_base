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

  // FID in four steps is the 3D stage of section 2 (26_js_sc1fid.js)

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

  // JPEG before and after is part of the pitfall stage of section 5 (28_js_sc3pit.js)

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
