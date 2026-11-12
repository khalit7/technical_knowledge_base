// ---- Reading section 4: Muon's spectrum, schedules, MultiSteps and apply_if_finite tables (the AdamW step is the 3D stage in 42_js_sc_opt.js) ----
(function(){
  const U=TSU,D=U.D;if(!D||!D.opt)return;
  // Muon spectrum
  const S8=D.opt.S8,SV=S8.sv_after_frob_and_each_iter;
  const nsSvg=document.getElementById('op-ns-svg');
  function nsDraw(i){const W=Math.max(280,nsSvg.clientWidth||600),Hh=190,L=40,B=22,T=8;const v=SV[i].slice().sort((a,b)=>b-a);
    const lo=-9,hi=0.5,Y=x=>T+(1-(Math.log10(Math.max(x,1e-9))-lo)/(hi-lo))*(Hh-T-B),bw=(W-L-6)/v.length;
    let s='';[-8,-6,-4,-2,0].forEach(e=>{const y=Y(Math.pow(10,e));s+='<line x1="'+L+'" x2="'+W+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+RD.t(L-4,y+3,'1e'+e,{a:'end',fs:11,fill:'var(--mute)'})});
    const y1=Y(1);s+='<line x1="'+L+'" x2="'+W+'" y1="'+y1+'" y2="'+y1+'" stroke="var(--c3)" stroke-dasharray="4 3"/>'+RD.t(W-4,y1-3,'1',{a:'end',fs:11,fill:'var(--c3)'});
    v.forEach((x,j)=>{const y=Y(x);s+='<rect x="'+(L+j*bw).toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(0.6,bw-0.6).toFixed(1)+'" height="'+(Hh-B-y).toFixed(1)+'" fill="'+(i===0?'var(--c2)':'var(--c1)')+'"/>'});
    s+=RD.t(L,Hh-6,'singular values, largest to smallest (128)',{fs:10.5,fill:'var(--mute)'});
    nsSvg.innerHTML=RD.svg(W,Hh,s,'singular values of the gradient during Newton-Schulz');
  }
  const NS=RD.anim({card:'op-ns-card',ctl:'op-ns-ctl',n:SV.length,draw:nsDraw,label:'Iteration',list:'sx-ns'});
  // schedules
  function sched(){const e=document.getElementById('op-sched-svg');if(!e||e.offsetParent===null)return;const S6=D.opt.S6;
    U.lines(e,[{name:'warmup_cosine_decay (old page)',color:U.COL[0],pts:S6.steps.map((s,i)=>[s,S6.warmup_cosine[i]])},{name:'warmup-stable-decay (join_schedules)',color:U.COL[1],pts:S6.steps.map((s,i)=>[s,S6.wsd[i]])}],{dec:5,label:'learning rate schedules',h:200})}
  U.table('op-ms',[['Micro-batch'],['Update norm',1],['mini_step',1],['gradient_step',1]],D.opt.S4.micro.map(m=>[m.micro,m.update_norm===0?'0':m.update_norm.toFixed(4),m.mini_step,m.gradient_step]));
  U.table('op-fin',[['Step'],['NaN?'],['Update norm',1],['notfinite_count',1]],D.opt.S5.steps.map(s=>[s.step,s.nan_injected?'<b>yes</b>':'',s.update_norm===0?'0':s.update_norm.toFixed(4),s.notfinite_count]));
  RD.onRender(sched);RD.onResize(()=>{NS.redraw();sched()});
})();
