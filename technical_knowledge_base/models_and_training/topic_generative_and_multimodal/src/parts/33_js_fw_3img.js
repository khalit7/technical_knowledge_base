// ---- Flow lab: the image model. Recorded runs (src/flow/out) beside the Diffusion lab's (src/diff/out) ----
(function(){const FW=window.FW;if(!FW)return;const {D,$}=FW;if(!D.fm||!$('fw-cmp'))return;
  FW.facts();FW.quiz();FW.nav();
  if(D.code){$('fw-code-cfm').textContent=D.code.cfm;$('fw-code-samp').textContent=D.code.samp}
  FW.clsRow($('fw-same-c'));
  // per-t validation loss
  function pert(){FW.chart($('fw-pert'),[{name:'flow matching (EMA)',color:'var(--c1)',pts:D.per_t.map(r=>[r.t,r.loss])}],{h:190,xticks:[0,.2,.4,.6,.8,1],xlab:'t (0 = noise, 1 = data)',ylab:'val. loss',ymin:0,label:'Validation loss by t'})}
  FW.onRender(pert);
  // integration error
  const EC={euler:['Euler','var(--c1)'],midpoint:['Midpoint','var(--c3)'],heun:['Heun','var(--c2)'],heun_last_euler:['Heun, last step Euler','var(--c4)']};
  function err(){const ser=Object.keys(EC).map(k=>({name:EC[k][0],color:EC[k][1],dash:k==='heun_last_euler',pts:D.err.filter(r=>r.solver===k).map(r=>[r.nfe,r.rms])}));
    FW.chart($('fw-err'),ser,{logx:true,logy:true,xticks:[1,2,4,10,20,50,100],xlab:'network evaluations',ylab:'RMS error',yfmt:v=>FW.fmt(v),label:'Integration error by evaluations'});FW.leg($('fw-err-l'),Object.keys(EC).map(k=>EC[k]))}
  FW.onRender(err);
  // flow against diffusion
  const SER=[['fm','euler','Flow, Euler','var(--c1)'],['fm','midpoint','Flow, midpoint','var(--c3)'],['he','heun_last_euler','Flow, Heun (last step Euler)','var(--c4)'],['fm','heun','Flow, Heun','var(--c6)'],['rf','euler','Reflowed flow, Euler','var(--c5)'],['df','ddpm','Diffusion, DDPM','var(--c2)'],['df','ddim','Diffusion, DDIM','var(--mute)'],['df','dpm','Diffusion, DPM-Solver++','var(--acc)']];
  const rows=(src,s)=>(D[src]||[]).filter(r=>r.solver===s);
  function cmp(){const m=FW.segVal($('fw-cmp-m'))||'fd';
    const ser=SER.map(a=>({name:a[2],color:a[3],dash:a[0]==='df',pts:rows(a[0],a[1]).filter(r=>r[m]!=null).map(r=>[r.nfe,m==='acc'?100*r.acc:r[m]])}));
    FW.chart($('fw-cmp'),ser,{logx:true,logy:m==='fd',xticks:[1,2,4,10,20,50,250,1000],xlab:'network evaluations (= time)',ylab:{fd:'FD',acc:'class accuracy %',div:'diversity'}[m],
      hline:m==='fd'?{y:D.f_floor,label:'real images '+D.f_floor}:m==='div'?{y:D.f_realdiv,label:'real images '+D.f_realdiv}:null,yfmt:v=>FW.fmt(v),label:'Flow against diffusion by evaluations'});
    FW.leg($('fw-cmp-l'),SER.map(a=>[a[2],a[3]]));
    const NF=[1,2,4,10,20,50,250,1000];let h='<table class="fw-t"><thead><tr><th>'+{fd:'FD',acc:'accuracy',div:'diversity'}[m]+' at NFE</th>'+NF.map(n=>'<th class="n">'+n+'</th>').join('')+'</tr></thead><tbody>';
    SER.forEach(a=>{const rr=rows(a[0],a[1]);const he=a[1]==='heun_last_euler';const vals=NF.map(n=>{const r=rr.find(q=>he?q.nfe===n-1:q.nfe===n);return r?r[m]:null});
      const best=m==='fd'?Math.min(...vals.filter(v=>v!=null)):Math.max(...vals.filter(v=>v!=null));
      h+='<tr><td>'+a[2]+(he?' *':'')+'</td>'+vals.map(v=>'<td class="n'+(v===best&&m==='fd'?' fw-hl':'')+'">'+(v==null?'':m==='acc'?(100*v).toFixed(1)+'%':v.toFixed(1))+'</td>').join('')+'</tr>'});
    $('fw-cmp-t').innerHTML=h+'</tbody></table><p class="small mute">Highlighted: each row\'s best FD. * Heun with a last Euler step uses 2n &minus; 1 evaluations, so its runs sit one evaluation left of their column (3 under 4, 9 under 10, and so on). Empty cells were not run; the chart places every run at its exact NFE.</p>'}
  FW.seg($('fw-cmp-m'),cmp);FW.onRender(cmp);
  // same noise by steps
  function same(){const n=+(FW.segVal($('fw-same-n'))||4);const L=FW.CLS;
    FW.tiles($('fw-same-z'),'noise',0,10,L);FW.tiles($('fw-same-f'),'fm_'+n,0,10,L);FW.tiles($('fw-same-d'),'ddim_'+n,0,10,L);
    const rr=$('fw-same-r');if(n>4){rr.innerHTML='<span class="small mute" style="grid-column:1/-1">not embedded at '+n+' steps (looks like the row above; score below)</span>'}else FW.tiles(rr,'rf_'+n,0,10,L);
    const g=(src,s)=>{const r=rows(src,s).find(q=>q.nfe===n);return r?'FD '+r.fd.toFixed(1):'not run'};
    $('fw-same-cap').innerHTML=n+' step'+(n>1?'s':'')+' (1,000-sample scores): flow Euler '+g('fm','euler')+'; DDIM '+g('df','ddim')+'; reflowed flow '+g('rf','euler')+(n===2?'; the 2-step DDIM strip was made by this lab with the Diffusion lab\'s checkpoint (its runs have no 2-step score).':'.')}
  FW.seg($('fw-same-n'),same);FW.onRender(same);
  // trajectory animation: frames 0..10 (noise, after each of 10 steps)
  const one=['ankle boot'],DT=[999,899,799,699,599,499,399,299,199,99],SQ={899:0.017,799:0.039,699:0.083,599:0.161};   // sqrt(abar) on the linear schedule (derived)
  FW.anim({card:'fw-traj',ctl:'fw-traj-ctl',n:11,ms:800,label:'Sampling step',draw:i=>{
    FW.tiles($('fw-traj-a'),'tr_fm_xt',i,1,one);FW.tiles($('fw-traj-b'),i<10?'tr_fm_x1':'tr_fm_xt',i,1,one);
    FW.tiles($('fw-traj-c'),'tr_dd_xt',i,1,one);FW.tiles($('fw-traj-d'),i<10?'tr_dd_x0':'tr_dd_xt',i,1,one);
    $('fw-traj-cap').innerHTML=(i===0?'<b>The starting noise</b>, and each model\'s first guess. Flow\'s first guess is the class average (the velocity at t = 0 points at the mean); DDIM\'s is a smooth blob.':
      i<10?'<b>After step '+i+' of 10</b>: flow at t = '+(i/10).toFixed(1)+', DDIM at timestep '+DT[i]+'. '+(i<5?'The flow x<sub>t</sub> is already '+(i*10)+'% image by weight; DDIM\'s is still mostly noise: the image\'s weight &radic;&#257; at timestep '+DT[i]+' is '+SQ[DT[i]]+' (<span class="der">derived</span>).':'Both guesses have settled; the samplers are now filling in detail.'):
      '<b>Done</b> (both panels show the final sample).')}});
  // reflow table
  function rft(){const st=[1,2,4,10,20,50];let h='<table class="fw-t"><thead><tr><th>Euler steps</th>'+st.map(n=>'<th class="n">'+n+'</th>').join('')+'</tr></thead><tbody>';
    [['fm','FD before reflow','fd'],['rf','FD after reflow','fd'],['fm','accuracy before','acc'],['rf','accuracy after','acc'],['fm','diversity before','div'],['rf','diversity after','div']].forEach(a=>{
      h+='<tr><td>'+a[1]+'</td>'+st.map(n=>{const r=rows(a[0],'euler').find(q=>q.steps===n);return '<td class="n">'+(r?(a[2]==='acc'?(100*r.acc).toFixed(1)+'%':r[a[2]].toFixed(1)):'')+'</td>'}).join('')+'</tr>'});
    $('fw-rf-t').innerHTML=h+'</tbody></table><p class="small mute">1,000 samples each, same noise, <span class="meas">measured</span>. Straightness of 50-step paths (distance / path length): '+D.f_st_fm+' before, '+D.f_st_rf+' after; DDIM on the diffusion model '+D.f_st_dd+'.</p>'}
  FW.onRender(rft);
  // shift
  FW.onRender(()=>{FW.tiles($('fw-sh-a'),'shift_0.33_4',0,10,FW.CLS);FW.tiles($('fw-sh-b'),'fm_4',0,10,FW.CLS);FW.tiles($('fw-sh-c'),'shift_3.00_4',0,10,FW.CLS)});
  // guidance
  function cfg(){const ser=[{name:'Flow, Euler 50: FD',color:'var(--c1)',pts:D.cfg.map(r=>[r.scale,r.fd])},{name:'Diffusion, DDIM 50: FD',color:'var(--c2)',dash:true,pts:D.dcfg.filter(r=>r.scale<=5).map(r=>[r.scale,r.fd])}];
    FW.chart($('fw-cfg'),ser,{logy:true,xticks:[0,1,2,3,5],xlab:'guidance scale s (1 = plain conditional)',ylab:'FD',hline:{y:D.f_floor,label:'real '+D.f_floor},label:'FD by guidance scale'});
    FW.leg($('fw-cfg-l'),[['Flow, Euler 50','var(--c1)'],['Diffusion, DDIM 50 (Diffusion lab)','var(--c2)']]);
    const CS=D.cfg.filter(r=>D.cfgStrips.indexOf(r.scale)>=0);const el=$('fw-cfg-rows');if(!el.children.length){el.innerHTML=CS.map(r=>'<div class="fw-row"><span class="lb">s = '+r.scale+' (acc '+(100*r.acc).toFixed(0)+'%)</span><div class="fw-strip" id="fw-cfg-'+String(r.scale).replace('.','p')+'"></div></div>').join('')}
    CS.forEach(r=>FW.tiles($('fw-cfg-'+String(r.scale).replace('.','p')),'cfg_'+r.scale,0,10,FW.CLS))}
  FW.onRender(cfg);
  // bugs
  FW.onRender(()=>{const c5=FW.CLS.slice(0,5);FW.tiles($('fw-bug-ok'),'fm_50',0,5,c5);FW.tiles($('fw-bug-a'),'bug_rev',0,5,c5);FW.tiles($('fw-bug-b'),'bug_t1000',0,5,c5)});
})();
