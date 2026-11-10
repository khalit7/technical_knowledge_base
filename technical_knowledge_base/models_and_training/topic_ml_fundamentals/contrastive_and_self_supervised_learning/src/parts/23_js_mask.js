// ---- Reading: masked modelling, MAE (pixels) against I-JEPA (representations), on one real image ----
(function(){
  const card=document.getElementById('mk-card');if(!card||!window.CSD)return;
  const M=CSD.mae,IJ=CSD.ij,$=id=>document.getElementById(id),G=14;
  const st={m:'mae',r:'0.75'};
  const CF=M.cfg;
  function grid(){let h='';for(let k=1;k<G;k++){const p=(k*100/G).toFixed(3);h+='<line x1="'+p+'%" x2="'+p+'%" y1="0" y2="100%" stroke="#fff" stroke-opacity=".55" stroke-width="0.6"/><line y1="'+p+'%" y2="'+p+'%" x1="0" x2="100%" stroke="#fff" stroke-opacity=".55" stroke-width="0.6"/>'}return h}
  const cell=(i,fill,op,stroke)=>{const r=Math.floor(i/G),c=i%G,s=100/G;return '<rect x="'+(c*s).toFixed(3)+'%" y="'+(r*s).toFixed(3)+'%" width="'+s.toFixed(3)+'%" height="'+s.toFixed(3)+'%" fill="'+fill+'" fill-opacity="'+op+'"'+(stroke?' stroke="'+stroke+'" stroke-width="1.6"':'')+'/>'};
  const TC=['#e8915c','#5fae7b','#b48ce0','#d9bb5f'];
  function vecGlyph(i,col){const r=Math.floor(i/G),c=i%G,s=100/G;let h='';for(let q=0;q<4;q++){const hh=(0.25+0.6*((i*7+q*13)%10)/10)*s;h+='<rect x="'+(c*s+s*(0.12+q*0.2)).toFixed(3)+'%" y="'+(r*s+s-hh-s*0.08).toFixed(3)+'%" width="'+(s*0.14).toFixed(3)+'%" height="'+hh.toFixed(3)+'%" fill="'+col+'"/>'}return h}
  function view(i){
    const R=M.ratios[st.r],mask=R.mask;let img=M.original,ov='';
    if(st.m==='mae'){
      if(i>=1&&i<=3){img=M.ratios[st.r].visible}
      if(i===1)mask.forEach((m,k)=>{if(m)ov+=cell(k,'#000',0.08)});
      if(i>=4)img=R.recon;
      if(i>=4)mask.forEach((m,k)=>{if(m)ov+=cell(k,'var(--c2)',0.0,'')});
      if(i===5)mask.forEach((m,k)=>{if(m)ov+=cell(k,'#e8915c',0.18)});
    }else{
      const inT=new Set(IJ.targets.flat()),ctx=new Set(IJ.context);
      if(i>=2&&i<=3)for(let k=0;k<G*G;k++)if(!ctx.has(k))ov+=cell(k,'#808080',0.92);
      if(i>=1&&i<=2)IJ.targets.forEach((t,q)=>t.forEach(k=>{ov+=cell(k,TC[q],0.35)}));
      if(i===4)for(let k=0;k<G*G;k++)if(!inT.has(k))ov+=cell(k,'#808080',0.55);
      if(i===4||i===5)IJ.targets.forEach((t,q)=>t.forEach(k=>{ov+=cell(k,TC[q],i===5?0.9:0.3);if(i===5)ov+=vecGlyph(k,'#fff')}));
    }
    $('mk-img').innerHTML='<img src="'+img+'" alt="The test photograph, a cat, 224 by 224 pixels" style="display:block;width:100%;height:auto"><svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%" aria-hidden="true">'+ov+'</svg><svg style="position:absolute;inset:0;width:100%;height:100%" aria-hidden="true">'+grid()+'</svg>';
  }
  // the step lists' numbers: static spans (75% by default) refreshed for the chosen ratio
  function spans(){const R=M.ratios[st.r],nv=R.nvis,F={pct:String(Math.round(100*(+st.r))),nh:String(196-nv),nv:String(nv),tok:(100*nv/196).toFixed(0),att:(100*nv*nv/196/196).toFixed(0),
      loss:R.loss.toFixed(4),tg:String(new Set(IJ.targets.flat()).size),ctx:String(IJ.context.length)};
    document.querySelectorAll('[data-mk]').forEach(e=>{if(F[e.dataset.mk]!=null)e.textContent=F[e.dataset.mk]})}
  window.CS_MK=spans;
  function draw(i){view(i);
    const R=M.ratios[st.r],nv=R.nvis;
    if(st.m==='mae')$('mk-cnt').innerHTML=RD.stat('tokens into the encoder',i>=2?nv+' of 196':'196','no mask tokens in the encoder')+RD.stat('target',i>=4?(196-nv)+' × 768 pixels':'not yet','pixel values of hidden patches')+RD.stat('loss',i>=5?R.loss.toFixed(4):'not yet','MSE, hidden patches only');
    else{const tg=new Set(IJ.targets.flat()).size;$('mk-cnt').innerHTML=RD.stat('tokens into the context encoder',i>=2?IJ.context.length+' of 196':'196','context block minus targets')+RD.stat('target',i>=4?tg+' vectors':'not yet','target-encoder outputs, not pixels')+RD.stat('loss',i>=5?'L2 between vectors':'not yet','in representation space');}
  }
  spans();
  const A=RD.anim({card:'mk-card',ctl:'mk-ctl',n:6,draw,ms:4200,label:'Masked modelling step',list:'sx-mk-mae'});
  function seg(id,key){$(id).addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st[key]=b.dataset.v;
    [...$(id).querySelectorAll('button')].forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)});
    $('mk-r').style.display=st.m==='mae'?'':'none';spans();$('sx-mk-mae').hidden=st.m!=='mae';$('sx-mk-ij').hidden=st.m==='mae';A.reset(6,st.m==='mae'?'sx-mk-mae':'sx-mk-ij')})}
  seg('mk-m','m');seg('mk-r','r');
  $('mk-losses').textContent=['0.5','0.75','0.9'].map(k=>M.ratios[k].loss.toFixed(4)).join(', ');
})();
