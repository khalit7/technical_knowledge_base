// ---- ELBO lab ----
(function(){
  const $=id=>document.getElementById(id);if(!$('el-svg'))return;
  let model='A',est='rep',trace=null;
  const P=()=>({x:+$('el-x').value,s2:Math.pow(+$('el-s').value,2),m:+$('el-m').value,sd:+$('el-q').value});
  function evalAll(p){if(model==='A'){const r=VI.modelA(p.x,p.s2,p.m,p.sd*p.sd);return {logpx:r.logpx,elbo:r.elbo,gap:r.gap,recon:r.recon,klp:r.klPrior,pm:r.pm,pv:r.pv}}
    const r=VI.modelB(p.x,p.s2,p.m,p.sd*p.sd);const klp=VI.klg(p.m,p.sd*p.sd,0,1);return {logpx:r.logpx,elbo:r.elbo,gap:r.gap,recon:r.elbo+klp,klp,z:r.z,post:r.post}}
  const lj=(p,z)=>model==='A'?VI.lognorm(p.x,z,p.s2)+VI.lognorm(z,0,1):VI.lognorm(p.x,z*z,p.s2)+VI.lognorm(z,0,1);
  const dlj=(p,z)=>model==='A'?(p.x-z)/p.s2-z:(p.x-z*z)*2*z/p.s2-z;
  function draw(){const p=P();$('el-xv').textContent=p.x.toFixed(2);$('el-sv').textContent=Math.sqrt(p.s2).toFixed(2);$('el-mv').textContent=p.m.toFixed(2);$('el-qv').textContent=p.sd.toFixed(2);
    const r=evalAll(p),el=$('el-svg'),W=Math.min(RD.width(el),760),H=210,L=8,R=8,T=8,B=24,Z0=-3.5,Z1=3.5;const X=z=>L+(z-Z0)/(Z1-Z0)*(W-L-R);
    const n=281,zs=[],pri=[],post=[],q=[];for(let i=0;i<n;i++){const z=Z0+(Z1-Z0)*i/(n-1);zs.push(z);pri.push(Math.exp(VI.lognorm(z,0,1)));q.push(Math.exp(VI.lognorm(z,p.m,p.sd*p.sd)));
      post.push(model==='A'?Math.exp(VI.lognorm(z,r.pm,r.pv)):Math.exp(lj(p,z)-r.logpx))}
    const ym=Math.max(...post,...q.map(v=>Math.min(v,4)),0.45),Y=v=>T+(1-Math.min(v,ym)/ym)*(H-T-B);
    const path=a=>a.map((v,i)=>(i?'L':'M')+X(zs[i]).toFixed(1)+' '+Y(v).toFixed(1)).join('');
    let s='<line x1="'+L+'" y1="'+(H-B)+'" x2="'+(W-R)+'" y2="'+(H-B)+'" stroke="var(--mute)"/>';
    for(let z=-3;z<=3;z++)s+=RD.t(X(z),H-8,z,{a:'middle',fs:10});
    s+='<path d="'+path(post)+'L'+X(Z1)+' '+(H-B)+'L'+X(Z0)+' '+(H-B)+'Z" fill="var(--c4)" fill-opacity="0.25" stroke="var(--c4)"/>';
    s+='<path d="'+path(pri)+'" fill="none" stroke="var(--mute)" stroke-dasharray="4 3"/><path d="'+path(q)+'" fill="none" stroke="var(--c1)" stroke-width="2.2"/>';
    s+=RD.t(W-R,T+10,'z',{a:'end',fs:11});
    el.innerHTML=RD.svg(W,H,s,'Prior, posterior and q');
    // stacked bar: |log p| split into |ELBO| ... show ELBO and gap as parts of -ELBO
    const tot=-r.elbo,a=Math.max(0,-r.logpx)/tot*100,g=r.gap/tot*100;
    $('el-gap').innerHTML=r.logpx<0?'<span style="width:'+a.toFixed(1)+'%;background:var(--c3)">−log p(x) = '+(-r.logpx).toFixed(3)+'</span><span style="width:'+g.toFixed(1)+'%;background:var(--c2)">gap '+r.gap.toFixed(3)+'</span>':'';
    $('el-out').innerHTML=RD.stat('log p(x)',r.logpx.toFixed(4),model==='A'?'closed form, N(0, 1 + s²)':'quadrature on 2,401 points')+RD.stat('ELBO',r.elbo.toFixed(4),'= reconstruction − KL to prior')+RD.stat('gap = KL(q ‖ posterior)',r.gap.toFixed(4),'log p(x) − ELBO')+RD.stat('reconstruction E_q log p(x|z)',r.recon.toFixed(4),'')+RD.stat('KL(q ‖ prior)',r.klp.toFixed(4),'closed form');
    drawTrace()}
  function best(){const p=P();if(model==='A'){const r=VI.modelA(p.x,p.s2,0,1);$('el-m').value=r.pm;$('el-q').value=Math.sqrt(r.pv);draw();return}
    let bb=[-1e9,0,1];for(let m=-2.5;m<=2.5;m+=0.02)for(let sd=0.05;sd<=1.6;sd+=0.01){const e=VI.modelB(p.x,p.s2,m,sd*sd,801).elbo;if(e>bb[0])bb=[e,m,sd]}
    const sdv=bb[2];let bm=bb[1],bs=sdv;for(let m=bb[1]-0.03;m<=bb[1]+0.03;m+=0.005)for(let sd=Math.max(0.05,sdv-0.02);sd<=sdv+0.02;sd+=0.002){const e=VI.modelB(p.x,p.s2,m,sd*sd).elbo;if(e>bb[0]){bb=[e,m,sd];bm=m;bs=sd}}
    $('el-m').value=bm;$('el-q').value=bs;draw()}
  function grad(p,m,ls,S,r){const sd=Math.exp(ls);let gm=0,gs=0;const fs=[],zs=[],es=[];
    for(let k=0;k<S;k++){const e=r.g(),z=m+sd*e;zs.push(z);es.push(e);if(est==='rep'){const d=dlj(p,z);gm+=d;gs+=d*sd*e}else fs.push(lj(p,z)-VI.lognorm(z,m,sd*sd))}
    if(est==='rep'){gm/=S;gs=gs/S+1}else{for(let k=0;k<S;k++){gm+=fs[k]*es[k]/sd;gs+=fs[k]*(es[k]*es[k]-1)}gm/=S;gs/=S}
    return [gm,gs]}
  let timer=0;
  function run(){if(timer){clearTimeout(timer);timer=0}const p=P(),S=+$('el-ns').value,lr=+$('el-lr').value,r=VI.rng(2026);let m=p.m,ls=Math.log(p.sd),i=0;
    trace={est,pts:[]};const go=()=>{for(let k=0;k<10&&i<300;k++,i++){const g=grad(p,m,ls,S,r);m+=lr*g[0];ls+=lr*g[1];m=Math.max(-3,Math.min(3,m));ls=Math.max(Math.log(0.05),Math.min(Math.log(2),ls));
        const pp=Object.assign({},p,{m,sd:Math.exp(ls)});trace.pts.push(evalAll(pp).elbo)}
      $('el-m').value=m;$('el-q').value=Math.exp(ls);draw();if(i<300)timer=setTimeout(go,30);else timer=0};go()}
  function drawTrace(){const el=$('el-tr');if(!trace||!trace.pts.length){el.innerHTML='';return}const W=Math.min(RD.width(el),760),H=120,L=46,R=8,T=8,B=20,pts=trace.pts;
    const p=P(),lp=evalAll(p).logpx;let lo=Math.min(...pts),hi=Math.max(lp,...pts);if(hi-lo<0.05)lo=hi-0.05;const X=i=>L+i/299*(W-L-R),Y=v=>T+(1-(v-lo)/(hi-lo))*(H-T-B);
    let s='<line x1="'+L+'" y1="'+Y(lp)+'" x2="'+(W-R)+'" y2="'+Y(lp)+'" stroke="var(--c3)" stroke-dasharray="4 3"/>'+RD.t(W-R,Y(lp)-3,'log p(x)',{a:'end',fs:10,fill:'var(--c3)'});
    s+='<path d="'+pts.map((v,i)=>(i?'L':'M')+X(i).toFixed(1)+' '+Y(v).toFixed(1)).join('')+'" fill="none" stroke="'+(trace.est==='rep'?'var(--c1)':'var(--c2)')+'" stroke-width="1.6"/>';
    s+=RD.t(L-4,Y(hi)+4,hi.toFixed(2),{a:'end',fs:10})+RD.t(L-4,Y(lo)+4,lo.toFixed(2),{a:'end',fs:10})+RD.t((L+W)/2,H-4,'step (ELBO of the current q, exact)',{a:'middle',fs:10});
    el.innerHTML=RD.svg(W,H,s,'ELBO during optimisation')}
  ['el-x','el-s','el-m','el-q'].forEach(id=>$(id).addEventListener('input',()=>{if(id==='el-x'||id==='el-s')trace=null;draw()}));
  RD.seg($('el-model'),m=>{model=m;trace=null;if(m==='B'){$('el-x').value=2;$('el-m').value=0.5;$('el-q').value=0.5}else{$('el-x').value=1.5;$('el-m').value=0.5;$('el-q').value=0.5}$('el-s').value=0.5;draw()});
  RD.seg($('el-est'),m=>{est=m});
  $('el-run').addEventListener('click',run);$('el-best').addEventListener('click',best);
  RD.onRender(draw,'t-elbo');addEventListener('resize',()=>{if(!$('t-elbo').hidden)draw()});
  window.VI_ELBO={best,run,get trace(){return trace}};
})();
