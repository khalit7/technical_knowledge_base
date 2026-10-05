// ---- Reading section 7: forward mode (one tangent sweep per weight) against reverse mode (one backward sweep) on the tiny model ----
(function(){
  const M=window.MC, t=M.tinyAll(), jv=M.tinyJvps(), view=document.getElementById('mc-fr-view');
  if(!view)return;
  const f3=v=>(v<0?'−':'')+Math.abs(v).toFixed(3), vec=a=>'('+a.map(f3).join(', ')+')';
  const words=['cat','dog','sat'];
  let mode='rev';
  function steps(){
    const s=[{k:'intro'}];
    if(mode==='fwd'){jv.forEach((r,n)=>{s.push({k:'seed',n});s.push({k:'prop',n});s.push({k:'out',n})});s.push({k:'done'})}
    else{s.push({k:'pbar'},{k:'zbar'},{k:'wbar'},{k:'xbar'},{k:'done'})}
    return s;
  }
  let S=steps();
  function state(i){ // what is known after step i
    const found=new Array(6).fill(null);let sweeps=0,macs=0,carry=null,hl=null,xbar=false;
    for(let s=0;s<=i;s++){const e=S[s];
      if(mode==='fwd'){
        if(e.k==='seed'){const r=jv[e.n];macs+=6;carry={node:'z',lab:'ż',v:r.dz,seed:e.n};hl='z'}
        if(e.k==='prop'){const r=jv[e.n];macs+=9;carry={node:'p',lab:'ṗ',v:r.dp,seed:e.n};hl='p'}
        if(e.k==='out'){const r=jv[e.n];macs+=1;carry={node:'L',lab:'L̇',v:[r.dL],seed:e.n};hl='L';found[e.n]=r.dL;sweeps++}
      }else{
        if(e.k==='pbar'){macs+=1;carry={node:'p',lab:'p̄',v:[0,0,-1/t.p[2]]};hl='p';sweeps=0}
        if(e.k==='zbar'){macs+=9;carry={node:'z',lab:'z̄',v:t.gz};hl='z'}
        if(e.k==='wbar'){macs+=6;carry={node:'W',lab:'W̄',v:null};hl='W';t.gW.flat().forEach((v,n)=>found[n]=v);sweeps=1}
        if(e.k==='xbar'){macs+=6;carry={node:'x',lab:'x̄',v:t.gx};hl='x';xbar=true}
      }
      if(e.k==='done'){hl=null}
    }
    return {found,sweeps,macs,carry,hl,xbar};
  }
  function cap(i){const e=S[i];
    if(e.k==='intro')return ['The forward pass, shared by both modes','The model computes z = Wx = (2, 1, 0), p = softmax(z) = (0.665, 0.245, 0.090) and L = −ln p_sat = 2.408. '+(mode==='fwd'?'Forward mode will now push one tangent through this chain for each of the six weights.':'Reverse mode keeps x and p (the values its local derivatives need) and now runs the chain backwards once.')];
    if(mode==='fwd'&&e.k!=='done'){const r=jv[e.n],nm='W['+words[r.i]+', '+(r.j+1)+']';
      if(e.k==='seed')return ['Sweep '+(e.n+1)+' of 6: seed '+nm,'Set the tangent of '+nm+' to 1 and every other weight’s to 0. Then ż = Ẇx: only score '+words[r.i]+' moves, at rate x_'+(r.j+1)+' = '+M.tiny.x[r.j]+'. So ż = '+vec(r.dz)+'.'];
      if(e.k==='prop')return ['Sweep '+(e.n+1)+': through softmax','ṗ = J ż, the softmax Jacobian times the tangent: '+vec(r.dp)+'. A Jacobian-vector product: 9 multiply-adds for a 3 by 3 Jacobian (a real implementation never builds J, but the count is the same order).'];
      if(e.k==='out')return ['Sweep '+(e.n+1)+': through the loss','L̇ = −ṗ_sat / p_sat = '+f3(r.dL)+'. That is ∂L/∂'+nm+'. One sweep, one slope: '+(e.n+1)+' of 6 found.'];
    }
    if(mode==='fwd'){
      return ['Done: six sweeps for six slopes','Forward mode needed one full sweep per weight. A model with a billion weights would need a billion sweeps. Each sweep gives the derivative of every output along one direction, which is wasted here because there is only one output.'];
    }
    if(e.k==='pbar')return ['Start at the loss: p̄','The adjoint of L is 1. L = −ln p_sat, so p̄ = (0, 0, −1/p_sat) = (0, 0, −11.107).'];
    if(e.k==='zbar')return ['Back through softmax: z̄ = Jᵀ p̄','A vector-Jacobian product: z̄ = '+vec(t.gz)+', the prediction minus the target.'];
    if(e.k==='wbar')return ['Back through z = Wx: all six slopes at once','W̄ = z̄ xᵀ, an outer product: every entry of the gradient in one step, using the stored input x. Rows '+t.gW.map(vec).join(', ')+'.'];
    if(e.k==='xbar')return ['And the input’s gradient for free','x̄ = Wᵀ z̄ = '+vec(t.gx)+': what an earlier layer (here the embedding) would receive.'];
    return ['Done: one sweep for every slope','Reverse mode found all six slopes, plus the input’s, in one backward sweep. Its cost does not grow with the number of weights, only with the size of the computation, which is why every training framework uses it.'];
  }
  function draw(i){
    const s=state(i),c=cap(i);
    const box=(id,title,val)=>{const on=s.hl===id,car=s.carry&&s.carry.node===id;
      return '<div class="mc-node'+(on?' on':'')+'"><div class="mc-nt">'+title+'</div><div class="mc-nv">'+val+'</div>'+(car&&s.carry.v?'<div class="mc-nc">'+s.carry.lab+' = '+vec(s.carry.v)+'</div>':(car?'<div class="mc-nc">'+s.carry.lab+'</div>':''))+'</div>'};
    let h='<div class="mc-chain">'+box('W','W (weights)','rows (1, 0), (0, 1), (1, −2)')+box('x','x (input)','(2, 1)')+'<span class="mc-arr">→</span>'+box('z','z = Wx',vec(t.z))+'<span class="mc-arr">→</span>'+box('p','p = softmax(z)',vec(t.p))+'<span class="mc-arr">→</span>'+box('L','L = −ln p_sat',f3(t.loss))+'</div>';
    h+='<div class="mc-gw"><div class="mc-gwt">∂L/∂W, filled as each slope is found</div><div class="mc-grid">';
    for(let n=0;n<6;n++){const v=s.found[n],cur=(mode==='fwd'&&S[i].n===n);h+='<div class="mc-cell'+(v!==null?' got':'')+(cur?' cur':'')+'"><span>W['+words[Math.floor(n/2)]+', '+(n%2+1)+']</span><b>'+(v===null?'?':f3(v))+'</b></div>'}
    h+='</div></div>';
    view.innerHTML=h;
    document.getElementById('mc-fr-cap').innerHTML='<div class="t">'+RD.esc(c[0])+'</div><p>'+RD.esc(c[1])+'</p>';
    document.getElementById('mc-fr-cnt').innerHTML=RD.stat('Sweeps after the forward pass',String(s.sweeps),mode==='fwd'?'one per weight':'one, whatever the number of weights')+
      RD.stat('Slopes found',s.found.filter(v=>v!==null).length+' of 6',s.xbar?'plus the 2 of x':'')+RD.stat('Multiply-adds in the sweeps',String(s.macs),mode==='fwd'?'16 per sweep':'16 for W, 6 more for x');
  }
  const A=RD.anim({card:'mc-fr-card',ctl:'mc-fr-ctl',n:S.length,draw,ms:1700,label:'Step'});
  RD.seg(document.getElementById('mc-fr-mode'),m=>{mode=m;S=steps();A.reset(S.length);A.play()});
})();
