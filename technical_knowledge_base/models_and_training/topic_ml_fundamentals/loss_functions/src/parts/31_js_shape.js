// ---- Loss shapes tab: regression losses against the error, classification losses against the margin, and what each score estimates ----
(function(){
  const card=document.getElementById('sh-r');if(!card)return;
  const $=id=>document.getElementById(id);
  const RC={mse:'var(--c1)',mae:'var(--c2)',huber:'var(--c3)',logcosh:'var(--c4)',pinball:'var(--c5)',mape:'var(--c6)'};
  const MC={zero_one:'var(--mute)',hinge:'var(--c2)',sqhinge:'var(--c5)',logistic:'var(--c1)',exp:'var(--c4)',focal:'var(--c3)'};
  const st={rv:'rho',ron:{mse:1,mae:1,huber:1,logcosh:1,pinball:0,mape:0},delta:1,tau:0.9,u:1.5,
    cv:'phi',con:{zero_one:1,hinge:1,sqhinge:0,logistic:1,exp:1,focal:1},g:2,m:0,eta:0.9,g2:2};
  const boxes=(el,keys,on,col,nm)=>{el.innerHTML=keys.map(k=>'<label><input type="checkbox" data-k="'+k+'"'+(on[k]?' checked':'')+'> <span class="sw" style="background:'+col[k]+'"></span>'+nm(k)+'</label>').join('')};
  const segc=(id,key,f)=>$(id).addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;[...$(id).querySelectorAll('button')].forEach(x=>x.classList.toggle('on',x===b));st[key]=b.dataset.v;f()});
  const n4=v=>!isFinite(v)?'∞':Math.abs(v)>=1000?v.toExponential(2):Math.abs(v)<1e-4&&v!==0?v.toExponential(2):(+v.toFixed(4)).toString();
  // ---- regression
  function hessOf(k,u,p){if(LF.HESS[k])return LF.HESS[k](u,p);return 0}
  function drawR(){
    $('sh-dv').textContent=st.delta<1?st.delta.toFixed(2):st.delta.toFixed(1);$('sh-tv').textContent=st.tau.toFixed(2);$('sh-uv').textContent=st.u.toFixed(2);
    const p={delta:st.delta,tau:st.tau,y:1},us=PL.range(-3,3,600),lines=[],pts=[];let rows='<tr><th>Loss</th><th class="num">loss ρ(u)</th><th class="num">pull ψ(u)</th><th class="num">second derivative</th></tr>';
    const f=(k,u)=>st.rv==='rho'?LF.REG[k].rho(u,p):st.rv==='psi'?LF.REG[k].psi(u,p):hessOf(k,u,p);
    Object.keys(RC).forEach(k=>{if(!st.ron[k])return;lines.push({xs:us,ys:us.map(u=>f(k,u)),c:RC[k],dash:k==='mape'?'6 3':null});pts.push({x:st.u,y:f(k,st.u),r:4.5,c:RC[k],stroke:'var(--bg)'});
      rows+='<tr><td><span class="sw" style="background:'+RC[k]+'"></span>'+LF.REG[k].name+(k==='huber'?', δ = '+$('sh-dv').textContent:k==='pinball'?', τ = '+st.tau.toFixed(2):'')+'</td><td class="num">'+n4(LF.REG[k].rho(st.u,p))+'</td><td class="num">'+n4(LF.REG[k].psi(st.u,p))+'</td><td class="num">'+n4(hessOf(k,st.u,p))+(LF.HESS[k]?'':' (kink at 0)')+'</td></tr>'});
    const yr=st.rv==='rho'?[-0.1,4.6]:st.rv==='psi'?[-2.6,2.6]:[-0.1,2.2];
    const segs=[{x1:st.u,y1:yr[0],x2:st.u,y2:yr[1],c:'var(--mute)',w:1,dash:'3 3'}];
    PL.chart({el:$('sh-rsvg'),id:'shr',x:[-3,3],y:yr,lines,pts,segs,xl:'error u = y − ŷ',yl:st.rv==='rho'?'loss':st.rv==='psi'?'pull':'second derivative',label:'Regression losses against the error'});
    $('sh-rt').innerHTML=rows;
  }
  boxes($('sh-rl'),Object.keys(RC),st.ron,RC,k=>LF.REG[k].name);
  $('sh-rl').addEventListener('change',e=>{const k=e.target.dataset.k;if(k){st.ron[k]=e.target.checked?1:0;drawR()}});
  segc('sh-rv','rv',drawR);
  $('sh-d').addEventListener('input',e=>{st.delta=Math.pow(10,(e.target.value-50)/50);drawR()});
  $('sh-t').addEventListener('input',e=>{st.tau=e.target.value/100;drawR()});
  $('sh-u').addEventListener('input',e=>{st.u=-3+e.target.value/20;drawR()});
  // ---- classification on the margin
  function drawC(){
    $('sh-gv').textContent=st.g.toFixed(1);$('sh-mv').textContent=st.m.toFixed(3);
    const ms=PL.range(-4,4,640),lines=[],pts=[];let rows='<tr><th>Loss</th><th class="num">loss φ(m)</th><th class="num">pull −φ′(m)</th></tr>';
    const f=(k,m)=>st.cv==='phi'?LF.MARG[k].phi(m,st.g):LF.MARG[k].pull(m,st.g);
    Object.keys(MC).forEach(k=>{if(!st.con[k])return;const xs=k==='zero_one'?[-4,0,0,4]:ms,ys=k==='zero_one'?(st.cv==='phi'?[1,1,0,0]:[0,0,0,0]):ms.map(m=>f(k,m));
      lines.push({xs,ys,c:MC[k],w:k==='zero_one'?1.6:2,dash:k==='zero_one'?'4 3':null});pts.push({x:st.m,y:f(k,st.m),r:4.5,c:MC[k],stroke:'var(--bg)'});
      rows+='<tr><td><span class="sw" style="background:'+MC[k]+'"></span>'+LF.MARG[k].name+(k==='focal'?', γ = '+st.g.toFixed(1):'')+'</td><td class="num">'+n4(LF.MARG[k].phi(st.m,st.g))+'</td><td class="num">'+(k==='zero_one'?'0 (no gradient)':n4(LF.MARG[k].pull(st.m,st.g)))+'</td></tr>'});
    const yr=st.cv==='phi'?[-0.1,4.6]:[-0.1,3.2];
    PL.chart({el:$('sh-csvg'),id:'shc',x:[-4,4],y:yr,lines,pts,segs:[{x1:st.m,y1:yr[0],x2:st.m,y2:yr[1],c:'var(--mute)',w:1,dash:'3 3'}],xl:'margin m = y·f(x)  (wrong ← 0 → right)',yl:st.cv==='phi'?'loss':'pull',label:'Classification losses against the margin'});
    $('sh-ct').innerHTML=rows;
    const pt=LF.sig(st.m),ce=LF.softplus(-st.m),fl=LF.MARG.focal.phi(st.m,st.g);
    $('sh-focal').innerHTML=RD.stat('p<sub>t</sub> = σ(m)',pt.toFixed(4),'probability on the right class')+RD.stat('cross entropy',n4(ce),'−log p<sub>t</sub>')+RD.stat('focal, γ = '+st.g.toFixed(1),n4(fl),'(1 − p<sub>t</sub>)<sup>γ</sup> times CE')+
      RD.stat('CE / focal',(ce/fl>=100?Math.round(ce/fl).toLocaleString('en-US'):(ce/fl).toFixed(2))+'×','= 1 / (1 − p<sub>t</sub>)<sup>γ</sup>');
    const r9=1/Math.pow(0.1,2),r968=1/Math.pow(1-0.968,2);
    $('sh-repro').innerHTML='<b>Defaults reproduce</b> Lin et al.\'s "100× lower loss" at p<sub>t</sub> = 0.9 and "1000×" at p<sub>t</sub> ≈ 0.968 for γ = 2 (<a href="https://arxiv.org/abs/1708.02002" target="_blank" rel="noopener noreferrer">Lin et al. 2017</a>): '+Math.round(r9)+'× and '+Math.round(r968)+'×, independently. <button id="sh-j1">set p<sub>t</sub> = 0.9, γ = 2</button> <button id="sh-j2">set p<sub>t</sub> = 0.968, γ = 2</button>';
    $('sh-j1').onclick=()=>jump(0.9);$('sh-j2').onclick=()=>jump(0.968);
  }
  function jump(p){st.g=2;$('sh-g').value=20;st.m=Math.log(p/(1-p));$('sh-m').value=Math.round((st.m+4)*20);drawC()}
  boxes($('sh-cl'),Object.keys(MC),st.con,MC,k=>LF.MARG[k].name);
  $('sh-cl').addEventListener('change',e=>{const k=e.target.dataset.k;if(k){st.con[k]=e.target.checked?1:0;drawC()}});
  segc('sh-cv','cv',drawC);
  $('sh-g').addEventListener('input',e=>{st.g=e.target.value/10;drawC()});
  $('sh-m').addEventListener('input',e=>{st.m=-4+e.target.value/20;drawC()});
  // ---- what the score estimates
  function drawK(){
    $('sh-ev').textContent=st.eta.toFixed(2);$('sh-g2v').textContent=st.g2.toFixed(1);
    const fs=PL.range(-3,3,600),lines=[],pts=[];let rows='<tr><th>Loss</th><th class="num">best score f*</th><th class="num">probability it implies</th><th>vs the true η = '+st.eta.toFixed(2)+'</th></tr>';
    ['hinge','sqhinge','logistic','exp','focal'].forEach(k=>{const g=k==='focal'?st.g2:0,C=fs.map(f=>LF.condRisk(k,f,st.eta,g));let a=Infinity,b=-Infinity;C.forEach(v=>{if(v<a)a=v;if(v>b)b=v});
      const fstar=LF.fstar(k,st.eta,g),cs=LF.condRisk(k,fstar,st.eta,g);
      lines.push({xs:fs,ys:C.map(v=>(v-a)/(b-a||1)),c:MC[k]});if(Math.abs(fstar)<=3)pts.push({x:fstar,y:(cs-a)/(b-a||1),r:5,c:MC[k],stroke:'var(--bg)'});
      const pr=k==='sqhinge'?(1+fstar)/2:k==='hinge'?null:LF.pstar(k,st.eta,g);
      rows+='<tr><td><span class="sw" style="background:'+MC[k]+'"></span>'+LF.MARG[k].name+(k==='focal'?', γ = '+st.g2.toFixed(1):'')+'</td><td class="num">'+fstar.toFixed(4)+'</td><td class="num">'+(pr==null?'none':pr.toFixed(4))+'</td><td class="small">'+(pr==null?'the sign only':Math.abs(pr-st.eta)<5e-4?'<span class="ok">equal</span>':'<span class="warn">'+(pr<st.eta?'pulled towards 0.5':'off')+'</span>')+'</td></tr>'});
    PL.chart({el:$('sh-ksvg'),id:'shk',x:[-3,3],y:[-0.03,1.03],lines,pts,yt:[0,0.5,1],xl:'score f',yl:'expected loss, scaled',label:'Expected loss against the score for five losses'});
    $('sh-kt').innerHTML=rows;
  }
  $('sh-e').addEventListener('input',e=>{st.eta=e.target.value/100;drawK()});
  $('sh-g2').addEventListener('input',e=>{st.g2=e.target.value/10;drawK()});
  const all=()=>{drawR();drawC();drawK()};
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-shape']=window.TAB_RENDER['t-shape']||[]).push(all);
  addEventListener('resize',()=>{if(card.offsetParent)all()});
})();
