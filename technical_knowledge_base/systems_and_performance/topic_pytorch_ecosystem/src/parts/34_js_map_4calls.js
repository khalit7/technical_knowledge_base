// ---- Ecosystem map: What calls what (bipartite picture for one library, full matrix for all) ----
(function(){
  const M=window.MAP,D=M.D,$=M.$,esc=M.esc;
  const libs=Object.keys(D.ev).filter(id=>M.byId[id]).sort((a,b)=>M.byId[a].name.localeCompare(M.byId[b].name));
  let lib='torchtitan',mode='api',cell=null;
  const APIN={};D.api.forEach(([k,t])=>APIN[k]=t);
  const DEPN={megatron:'Megatron',liger_kernel:'Liger',flash_attn:'flash-attn',transformer_engine:'Transformer Engine',sglang:'SGLang',vllm:'vLLM',bitsandbytes:'bitsandbytes'};
  const dn=k=>DEPN[k]||k;
  function svg(){
    const el=$('map-c-svg'),W=M.width(el),ev=D.ev[lib]||{},dp=D.deps[lib]||{};
    const api=D.api.map(([k,t])=>[k,t,ev[k]?ev[k][0]:0]);
    const dep=Object.entries(dp).sort((a,b)=>b[1]-a[1]).slice(0,12);
    const narrow=W<560,rowH=narrow?19:21;
    const nL=api.length,nR=Math.max(dep.length,1);
    const H=Math.max(nL,nR)*rowH+46;
    const lx=narrow?4:16,rx=W-(narrow?4:16);
    const colL=narrow?92:Math.min(W*0.28,160);
    const xs=lx+colL+(narrow?20:26),x0=rx-(narrow?72:120);
    const bw=Math.min(narrow?112:160,x0-xs-28),bx=(xs+x0)/2-bw/2,cx=bx+bw/2;
    const yL=i=>34+i*rowH*Math.max(nL,nR)/nL,yR=i=>34+i*rowH*Math.max(nL,nR)/nR;
    const maxv=Math.max(1,...api.map(a=>a[2]),...dep.map(d=>d[1]));
    const sw=v=>v?1+5*Math.sqrt(v/maxv):0;
    const midY=H/2,fs=narrow?10:11.5;
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Core APIs and libraries called by '+esc(M.byId[lib].name)+'">';
    s+='<text x="'+lx+'" y="16" class="map-axt" font-weight="600">'+(narrow?'Core APIs':'PyTorch core APIs (files)')+'</text><text x="'+rx+'" y="16" class="map-axt" text-anchor="end" font-weight="600">'+(narrow?'Libraries':'Other libraries (files)')+'</text>';
    const short=t=>narrow?t.replace('activation ckpt','act. ckpt').replace('autograd.Function','autograd.Fn').replace('__torch_dispatch__','subclass').replace('FSDP2 fully_shard','FSDP2').replace('context parallel','context par.').replace('torch.library','torch.library'):t;
    api.forEach(([k,t,v],i)=>{const y=yL(i);
      if(v)s+='<path d="M'+xs+','+y+' C'+(xs+30)+','+y+' '+(bx-30)+','+midY+' '+bx+','+midY+'" fill="none" stroke="var(--c1)" stroke-opacity=".55" stroke-width="'+sw(v).toFixed(1)+'"/>';
      s+='<text x="'+(lx+colL)+'" y="'+(y+4)+'" text-anchor="end" font-size="'+fs+'"'+(v?'':' fill="var(--dim)"')+'>'+esc(short(t))+'</text>';
      if(v)s+='<text x="'+(lx+colL+3)+'" y="'+(y+4)+'" font-size="9.5" class="map-axt">'+v+'</text>'});
    dep.forEach(([k,v],i)=>{const y=yR(i);
      s+='<path d="M'+(bx+bw)+','+midY+' C'+(bx+bw+30)+','+midY+' '+(x0-34)+','+y+' '+(x0-4)+','+y+'" fill="none" stroke="var(--c2)" stroke-opacity=".55" stroke-width="'+sw(v).toFixed(1)+'"/>';
      s+='<text x="'+x0+'" y="'+(y+4)+'" font-size="'+fs+'">'+esc(dn(k))+' <tspan class="map-axt" font-size="9.5">'+v+'</tspan></text>'});
    if(!dep.length)s+='<text x="'+rx+'" y="'+(yR(0)+4)+'" text-anchor="end" class="map-axt">none</text>';
    s+='<rect x="'+bx+'" y="'+(midY-17)+'" width="'+bw+'" height="34" rx="7" fill="var(--acc2)" stroke="var(--acc)"/><text x="'+cx+'" y="'+(midY+4)+'" text-anchor="middle" font-weight="600" font-size="'+(narrow?11:12.5)+'">'+esc(M.byId[lib].name.replace(' / Megatron-LM','').replace(' (MosaicML)','').replace('PyTorch Lightning','Lightning'))+'</text></svg>';
    el.innerHTML=s;
    const a=M.byId[lib],used=api.filter(x=>x[2]).length;
    $('map-c-cap').innerHTML='<b>'+esc(a.name)+' '+esc(a.ver||'')+'</b>: '+used+' of '+api.length+' core APIs appear in its source; it imports '+Object.keys(dp).length+' of the tracked libraries. '+esc(a.wraps||'');
  }
  function matrix(){
    const t=$('map-c-mx');
    const cols=mode==='api'?D.api.map(([k,n])=>[k,n]):D.depcols.filter(k=>libs.some(l=>(D.deps[l]||{})[k])).map(k=>[k,dn(k)]);
    const val=(l,k)=>mode==='api'?((D.ev[l]||{})[k]||[0])[0]:((D.deps[l]||{})[k]||0);
    const mx=Math.max(1,...libs.flatMap(l=>cols.map(([k])=>val(l,k))));
    t.innerHTML='<thead><tr><th class="rh">'+(mode==='api'?'files using':'files importing')+'</th>'+cols.map(([k,n])=>'<th>'+esc(n)+'</th>').join('')+'</tr></thead><tbody>'+
      libs.map(l=>'<tr><th class="rh"><a href="#" data-lib="'+l+'">'+esc(M.byId[l].name.replace(' / Megatron-LM','').replace(' (MosaicML)',''))+'</a></th>'+cols.map(([k])=>{const v=val(l,k);
        if(!v)return '<td class="z">.</td>';const a=Math.min(.85,.12+.73*Math.sqrt(v/mx));
        return '<td class="c'+(cell&&cell[0]===l&&cell[1]===k?' on':'')+'" data-l="'+l+'" data-k="'+k+'" style="background:color-mix(in srgb,var('+(mode==='api'?'--c1':'--c2')+') '+Math.round(a*100)+'%,transparent)">'+v+'</td>'}).join('')+'</tr>').join('')+'</tbody>';
  }
  function showCell(l,k){
    cell=[l,k];matrix();
    const a=M.byId[l];let h;
    if(mode==='api'){const r=D.ev[l][k];h='<b>'+esc(a.name)+'</b>, '+esc(APIN[k])+': '+r[0]+' files, '+r[1]+' matches. Example: <span class="map-ev">'+esc(r[2])+'</span>';}
    else h='<b>'+esc(a.name)+'</b> imports '+esc(dn(k))+' in '+D.deps[l][k]+' files (top-level <code>import</code> or <code>from ... import</code> lines).';
    $('map-c-ev').innerHTML=h;
  }
  function draw(){svg();matrix()}
  function init(){
    $('map-c-lib').innerHTML=libs.map(l=>'<option value="'+l+'"'+(l===lib?' selected':'')+'>'+esc(M.byId[l].name)+'</option>').join('');
    $('map-c-lib').addEventListener('change',e=>{lib=e.target.value;svg()});
    $('map-c-mode').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.m;cell=null;$('map-c-ev').innerHTML='';
      $('map-c-mode').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));matrix()});
    $('map-c-mx').addEventListener('click',e=>{const c=e.target.closest('td.c');if(c){showCell(c.dataset.l,c.dataset.k);return}
      const a=e.target.closest('a[data-lib]');if(a){e.preventDefault();lib=a.dataset.lib;$('map-c-lib').value=lib;svg();$('map-c-svg').scrollIntoView({block:'nearest'})}});
    const dsF=((D.ev.deepspeed||{}).fsdp1||[0])[0]+((D.ev.deepspeed||{}).fsdp2||[0])[0];
    M.predict('map-pr2','a','DeepSpeed 0.19.7 mentions FSDP in '+dsF+' files. ZeRO-3 and FSDP shard the same three things (parameters, gradients, optimizer state), but DeepSpeed implemented its own engine before FSDP existed and still uses it, talking to torch.distributed collectives through <code>deepspeed/comm</code>. That is why you pick one or the other per model, and why Accelerate has separate DeepSpeed and FSDP plugins.');
  }
  init();
  M.onRender(draw);
})();
