// ---- Mesh designer (t-mesh). The arithmetic mirrors src/runs/ss_mesh.py (checked by src/check_data.mjs). ----
window.SS_MESH=(function(){
  const MODELS={small:{d:128,L:4,H:4,KV:4,F:512,V:65,pos:128,mlp:'gelu',bias:true},big:{d:512,L:8,H:8,KV:8,F:2048,V:65,pos:256,mlp:'gelu',bias:true},
    llama3_8b:{d:4096,L:32,H:32,KV:8,F:14336,V:128256,pos:0,mlp:'swiglu',bias:false},llama3_70b:{d:8192,L:80,H:64,KV:8,F:28672,V:128256,pos:0,mlp:'swiglu',bias:false}};
  function nParams(m){const hd=m.d/m.H,b=m.bias?1:0;const attn=m.d*m.d+2*m.d*m.KV*hd+m.d*m.d+b*(m.d+2*m.KV*hd+m.d);
    const mlp=m.mlp==='swiglu'?3*m.d*m.F:2*m.d*m.F+b*(m.F+m.d);const norms=2*m.d*(m.bias?2:1);
    return m.V*m.d+m.pos*m.d+m.V*m.d+m.L*(attn+mlp+norms)+m.d*(m.bias?2:1)}
  function combos(n,k){const out=[];(function r(s,c){if(c.length===k){out.push(c.slice());return}for(let i=s;i<n;i++){c.push(i);r(i+1,c);c.pop()}})(0,[]);return out}
  function factorAxes(phys,size){for(let k=0;k<=phys.length;k++)for(const c of combos(phys.length,k)){if(c.reduce((p,i)=>p*phys[i],1)===size)return c}return null}
  function calc(m,chip,phys,B,X,Y,remat){
    const N=nParams(m),chips=phys.reduce((a,b)=>a*b,1),D=chips/(X*Y),W=2*chip.link;
    const yax=factorAxes(phys,Y);const rest=phys.filter((p,i)=>!yax||!yax.includes(i));
    const xax=yax?factorAxes(rest,X):null;let dax=null;if(xax){const r2=rest.filter((p,i)=>!xax.includes(i));dax=factorAxes(r2,D)}
    const ok=!!(yax&&xax&&dax),MY=yax?Math.max(1,yax.length):1,MX=xax?Math.max(1,xax.length):1,MD=dax?Math.max(1,dax.length):1;
    const tokDev=B/(D*X),state=16*N/(X*Y),act=m.L*tokDev*(remat?2*m.d:34*m.d/Y),compute=6*N*B/(chips*chip.bf16);
    const tF=X>1?3*(2*N/Y)/(MX*W):0,tD=D>1?2*(2*N/(X*Y))/(MD*W):0,tT=Y>1?4*m.L*2*(tokDev*m.d*2)/(MY*W):0,alpha=chip.bf16/W,per=B/chips;
    const batchOk=Y===1?per>=alpha/(MX+(D>1?MD:0)):per>=alpha*alpha/(MX*MY*m.F);
    return {N,chips,D,ok_topology:ok,MX,MY,MD,tok_dev:tokDev,state_bytes:state,act_bytes:act,mem_bytes:state+act,fits:state+act<=chip.hbm,
      compute_s:compute,t_fsdp_s:tF,t_dp_s:tD,t_tp_s:tT,ici_intensity:alpha,per_chip_tokens:per,batch_ok:batchOk,tp_ok:Y>1?Y<=MY*m.F/alpha:true,yax,xax,dax};
  }
  return {MODELS,nParams,calc,factorAxes};
})();
(function(){
  const U=SSU,$=id=>document.getElementById(id),M=SS_MESH,esc=U.esc;
  const G={};SS.specs.gens.forEach(g=>G[g.gen]=g);
  const chipOf=gen=>{const g=G[gen];const c={bf16:g.bf16,hbm:g.hbm,link:g.sb.link_oneway};if(gen==='7x'){c.bf16/=2;c.hbm/=2}return c};
  const SLICES=[['v5e','v5e 4x4 (16 chips)',[4,4],'TPU lab mock slice'],['v5e','v5e 16x16 (256 chips, a full pod)',[16,16],'TPU lab mock slice; Cloud pod size 256'],
    ['v5p','v5p 4x4x4 (64 chips, one cube)',[4,4,4],'TPU lab mock slice'],['v5p','v5p 8x8x8 (512 chips)',[8,8,8],'TPU lab mock slice'],
    ['v5p','v5p 16x20x28 (8,960 chips, a full pod)',[16,20,28],'scaling book, part 6'],['v6e','v6e 16x16 (256 chips, a full pod)',[16,16],'Cloud pod size 256'],
    ['7x','TPU7x 4x4x4 (64 chips = 128 JAX devices)',[2,4,4,4],'TPU lab mock slice: 2 TensorCores per chip, each its own JAX device']];
  $('md-slice').innerHTML=SLICES.map((s,i)=>'<option value="'+i+'"'+(i===4?' selected':'')+'>'+s[1]+'</option>').join('');
  const BS=[];for(let e=14;e<=24;e++)BS.push(Math.pow(2,e));
  $('md-batch').innerHTML=BS.map(b=>'<option value="'+b+'"'+(b===4194304?' selected':'')+'>'+U.num(b)+(b===4194304?' (4M, the book\'s 70B run)':'')+'</option>').join('');
  function divisors(n){const o=[];for(let i=1;i<=n;i++)if(n%i===0)o.push(i);return o}
  function fillXY(keepX,keepY){
    const phys=SLICES[+$('md-slice').value][2],n=phys.reduce((a,b)=>a*b,1);
    const ys=divisors(n).filter(y=>y<=64),y=ys.includes(keepY)?keepY:1;
    $('md-y').innerHTML=ys.map(v=>'<option'+(v===y?' selected':'')+'>'+v+'</option>').join('');
    const xs=divisors(n/y);const x=xs.includes(keepX)?keepX:xs[xs.length-1];
    $('md-x').innerHTML=xs.map(v=>'<option'+(v===x?' selected':'')+'>'+v+'</option>').join('');
  }
  const fmt=t=>t<1e-3?(t*1e6).toFixed(0)+' &micro;s':t<1?(t*1e3).toFixed(1)+' ms':t.toFixed(2)+' s';
  function draw(){
    const si=+$('md-slice').value,S=SLICES[si],gen=S[0],chip=chipOf(gen),phys=S[2],m=M.MODELS[$('md-model').value];
    const B=+$('md-batch').value,X=+$('md-x').value,Y=+$('md-y').value,remat=$('md-remat').value==='1';
    const r=M.calc(m,chip,phys,B,X,Y,remat);
    $('md-out').innerHTML=RD.stat('parameters N',U.num(r.N),'')+RD.stat('mesh',r.D+' data x '+X+' FSDP x '+Y+' tensor',r.chips+' devices')+
      RD.stat('tokens per device per step',U.num(r.per_chip_tokens,0),'ICI intensity C/W: '+U.num(r.ici_intensity,0))+
      RD.stat('memory per device',U.MB(r.mem_bytes),'of '+U.MB(chip.hbm)+' HBM'+(gen==='7x'?' (half a chip)':''))+
      RD.stat('compute per step',fmt(r.compute_s),'at 100% of peak; '+fmt(r.compute_s/0.4)+' at 40% MFU')+
      RD.stat('communication per step',fmt(r.t_fsdp_s+r.t_dp_s+r.t_tp_s),'FSDP '+fmt(r.t_fsdp_s)+', DP '+fmt(r.t_dp_s)+', TP '+fmt(r.t_tp_s));
    const hb=chip.hbm,tot=Math.max(hb,r.mem_bytes);
    $('md-membar').innerHTML='<span style="width:'+(r.state_bytes/tot*100)+'%;background:var(--c4)" title="state"></span><span style="width:'+(r.act_bytes/tot*100)+'%;background:var(--c5)" title="activations"></span>';
    $('md-memleg').innerHTML='<span><i style="background:var(--c4)"></i>weights, gradients, Adam: '+U.MB(r.state_bytes)+'</span><span><i style="background:var(--c5)"></i>activations: '+U.MB(r.act_bytes)+'</span><span>bar length = '+(r.fits?'HBM ('+U.MB(hb)+')':'the total, which exceeds HBM')+'</span>';
    const T=[['compute (40% MFU)',r.compute_s/0.4,'var(--c3)'],['FSDP',r.t_fsdp_s,'var(--c1)'],['DP',r.t_dp_s,'var(--c6)'],['TP',r.t_tp_s,'var(--c2)']],tt=T.reduce((s,x)=>s+x[1],0)||1;
    $('md-timebar').innerHTML=T.map(x=>'<span style="width:'+(x[1]/tt*100)+'%;background:'+x[2]+'" title="'+x[0]+'"></span>').join('');
    $('md-timeleg').innerHTML=T.map(x=>'<span><i style="background:'+x[2]+'"></i>'+x[0]+': '+fmt(x[1])+'</span>').join('');
    const ax=a=>a&&a.length?a.map(i=>'xyzc'[phys.length===4?[3,0,1,2][i]:i]+'('+phys[i]+')').join(' x '):'none';
    const err=SS.torus.slices.map(s=>s.meshes.find(q=>q.error)).find(Boolean);
    const chk=[
      [r.fits,'Fits in HBM: '+U.MB(r.mem_bytes)+' per device against '+U.MB(hb)+'.'],
      [r.ok_topology,r.ok_topology?'Topology: tensor on '+ax(r.yax)+', FSDP on '+ax(r.xax)+', data on '+ax(r.dax)+' (whole physical axes, M<sub>Y</sub> = '+r.MY+', M<sub>X</sub> = '+r.MX+').':'Topology: these degrees are not products of whole physical axes of '+phys.join('x')+'. <code>jax.make_mesh</code> refuses such a mesh unless physical axes may be split: "'+esc(err.error.split('. The size')[0])+'" (run in the TPU lab on a mock slice). Times below assume one axis each.'],
      [r.batch_ok,(Y===1?'Data or FSDP bound: '+U.num(r.per_chip_tokens,0)+' tokens per device against C/W / M = '+U.num(r.ici_intensity/(r.MX+(r.D>1?r.MD:0)),0):'Mixed FSDP + TP bound: '+U.num(r.per_chip_tokens,0)+' tokens per device against &alpha;&sup2;/(M<sub>X</sub>M<sub>Y</sub>F) = '+U.num(r.ici_intensity*r.ici_intensity/(r.MX*r.MY*m.F),0))+' (scaling book).'],
      [r.tp_ok&&!(Y>1&&m.H%Y),Y===1?'Tensor parallelism not used.':'Tensor degree '+Y+' against M<sub>Y</sub> F / (C/W) = '+U.num(r.MY*m.F/r.ici_intensity,1)+' (scaling book)'+(m.H%Y?'; it does not divide the '+m.H+' heads':'')+'.'],
      [r.t_fsdp_s+r.t_dp_s+r.t_tp_s<=r.compute_s/0.4,'Communication '+(r.t_fsdp_s+r.t_dp_s+r.t_tp_s<=r.compute_s/0.4?'fits under':'exceeds')+' compute at 40% MFU, if it can overlap.']];
    $('md-checks').innerHTML=chk.map(c=>'<li><span class="'+(c[0]?'md-ok':'md-bad')+'">'+(c[0]?'ok':'check')+'</span> '+c[1]+'</li>').join('');
    const g=G[gen];
    $('md-src').innerHTML='<span class="vend">published</span> '+esc(g.name)+': '+U.num(g.bf16/1e12)+' TFLOP/s bfloat16, '+esc(g.hbm_txt)+' HBM per chip (<a href="'+esc(g.url)+'" target="_blank" rel="noopener noreferrer">Cloud TPU docs</a>); ICI '+(g.sb.link_oneway/1e9)+' GB/s per link one way (scaling book). Slice shape: '+esc(S[3])+'. <span class="der">derived</span> everything else.';
  }
  const PRE=[['The book\'s 70B run: v5p pod, 2,240 FSDP x 4 TP','llama3_70b',4,4194304,2240,4],['70B on 512 v5p chips, 64 x 8','llama3_70b',3,4194304,64,8],['8B FSDP over a v5e pod','llama3_8b',1,1048576,256,1],['8B on v6e with TP 4 (not a whole axis)','llama3_8b',5,1048576,64,4],['The running example on 16 v5e chips','small',0,65536,16,1]];
  $('md-presets').innerHTML=PRE.map((p,i)=>'<button data-i="'+i+'">'+p[0]+'</button>').join('');
  $('md-presets').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const p=PRE[+b.dataset.i];
    $('md-model').value=p[1];$('md-slice').value=p[2];$('md-batch').value=p[3];fillXY(p[4],p[5]);$('md-x').value=p[4];draw()});
  $('md-slice').addEventListener('change',()=>{fillXY(+$('md-x').value,+$('md-y').value);draw()});
  $('md-y').addEventListener('change',()=>{fillXY(+$('md-x').value,+$('md-y').value);draw()});
  ['md-model','md-batch','md-x','md-remat'].forEach(id=>$(id).addEventListener('change',draw));
  fillXY(2240,4);draw();
})();
