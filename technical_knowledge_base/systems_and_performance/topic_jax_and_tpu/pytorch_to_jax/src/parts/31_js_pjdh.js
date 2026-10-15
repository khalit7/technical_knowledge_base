// ---- Divergence hunter tab: real curves from src/runs/out/hunt.json
(function(){
  const J=window.PJ.hunt,V=J.variants,esc=RD.esc,s2=v=>PJU.fmt(v,'s2');
  const KIND={forward:'Forward pass',weights:'Weights',loss:'Loss',optimizer:'Optimiser',combined:'Combined'};
  const COL=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','#d4588a','#7a8a2a','#5a6ad6','#b0603a','#2a9a7a','#9a4ab0','#c08a00','#4a7ab0','#a04a4a','#6a9a3a','#8a6a4a'];
  const keys=Object.keys(V).filter(k=>k!=='correct');const color={};keys.forEach((k,i)=>color[k]=COL[i%COL.length]);
  const on=new Set(['ln_eps','gelu','clip_after','sched_off']);let view='diff';
  const tg=document.getElementById('pjdh-togs');
  tg.innerHTML=Object.keys(KIND).map(kd=>'<div class="pj-grp">'+KIND[kd]+'</div><div class="pj-togs">'+keys.filter(k=>V[k].kind===kd).map(k=>
    '<label data-v="'+k+'"'+(on.has(k)?' class="on"':'')+'><input type="checkbox" '+(on.has(k)?'checked ':'')+'aria-label="'+esc(V[k].label)+'"><i style="background:'+color[k]+'"></i>'+esc(V[k].label)+(V[k].src.indexOf('root')===0?' <span class="mute">(root)</span>':'')+'</label>').join('')+'</div>').join('');
  const TH=[['logits',1e-5],['loss0',1e-5],['grads',1e-5],['step1',1e-6]];
  const T=J.torch_loss,N=T.length,FR=31;
  function series(upto){const out=[];const mk=(k,c,w)=>{const L=V[k].loss;const ys=L.map((v,i)=>i>upto?null:(v==null?null:(view==='diff'?Math.max(Math.abs(v-T[i]),1e-7):v)));return {name:k==='correct'?'correct port':V[k].label,c,ys,w}};
    if(view==='loss')out.push({name:'PyTorch',c:'var(--mute)',ys:T.map((v,i)=>i>upto?null:v),w:2.4,dash:false});
    out.push(Object.assign(mk('correct','var(--ink)',2),{dash:true}));
    keys.filter(k=>on.has(k)).forEach(k=>out.push(mk(k,color[k])));return out}
  const el=document.getElementById('pjdh-chart'),cap=document.getElementById('pjdh-cap');
  function draw(f){const upto=Math.round((N-1)*f/(FR-1));
    PJV.line(el,series(upto),view==='diff'?{log:true,lo:-7,xlab:'training step',xticks:[0,100,200,299],label:'loss difference from PyTorch'}:{xlab:'training step',xticks:[0,100,200,299],ylo:1.9,yhi:4.4,label:'training loss'});
    const ks=keys.filter(k=>on.has(k));
    cap.innerHTML='Step '+upto+'. '+(ks.length?ks.map(k=>{const d=V[k].loss[upto];return esc(V[k].label.split('(')[0].trim())+': '+(d==null?'NaN':s2(Math.abs(d-T[upto])))}).join('; '):'Turn on a switch above.')+
      (view==='diff'?' The dashed line is the correct port: float noise, '+s2(Math.abs(V.correct.loss[upto]-T[upto])||0)+' at this step.':'')}
  const a=PJU.anim({card:'pjdh-card',ctl:'pjdh-ctl',n:FR,draw,ms:350,label:'Training step'},'t-pjdh');a.go(FR-1);
  tg.addEventListener('change',e=>{const lb=e.target.closest('label');if(!lb)return;const k=lb.dataset.v;if(e.target.checked)on.add(k);else on.delete(k);lb.classList.toggle('on',e.target.checked);a.redraw();table()});
  RD.seg(document.getElementById('pjdh-view'),m=>{view=m;a.redraw()});
  PJU.onTab('t-pjdh',()=>a.redraw());PJU.onResize('t-pjdh',()=>a.redraw());
  const cell=(x,t)=>x==null||!isFinite(x)?'<td>&ndash;</td>':'<td class="'+(x<=t?'ok':'no')+'">'+s2(x)+'</td>';
  function table(){const ks=['correct'].concat(keys.filter(k=>on.has(k)));
    document.getElementById('pjdh-tab').innerHTML='<thead><tr><th>Run</th><th>from</th><th>logits</th><th>loss</th><th>gradients</th><th>one step</th><th>curve max</th><th>first step &gt; 1e-4</th><th>validation at 300</th></tr></thead><tbody>'+
      ks.map(k=>{const v=V[k],r=v.rungs;return '<tr><td>'+esc(k==='correct'?'correct port':v.label)+'</td><td>'+(v.src.indexOf('root')===0?'root':'here')+'</td>'+(r.logits_nan?'<td class="no">NaN</td>':cell(r.logits,1e-5))+cell(r.loss0,1e-5)+cell(r.grads,1e-5)+cell(r.step1,1e-6)+cell(v.max_abs_loss_diff_vs_torch,1e-4)+
        '<td>'+(v.first_nan_step!=null?'NaN at '+v.first_nan_step:(v['first_step_over_1e-4']!=null?v['first_step_over_1e-4']:'never'))+'</td><td>'+(v.val_300==null?'NaN':PJU.fmt(v.val_300,'f4'))+(v.val_300_own_mask!=null&&/mask/.test(k)?' <span class="mute">(own mask '+PJU.fmt(v.val_300_own_mask,'f3')+')</span>':'')+'</td></tr>'}).join('')+'</tbody>'}
  table();
  const cpu=keys.filter(k=>V[k].cpu_s).map(k=>V[k].cpu_s);document.getElementById('pjdh-time').textContent=Math.round(Math.min(...cpu))+' to '+Math.round(Math.max(...cpu))+' s';
})();
