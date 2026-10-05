// ---- KV cache across models tab (t-kv) ----
// KVM.kvSeq and KVM.plan mirror kv_seq() and plan() in code/build_data.py; check/check_js.mjs compares them.
window.KVM={
  kvSeq:(m,ctx,kvb)=>kvb*(m.el*m.full*ctx+m.el*m.slide*Math.min(ctx,m.window))+m.fixed,
  plan(m,chip,n,util,ctx,kvb,wscale){
    const mem=chip.gb*1e9*n*util,w=m.wbytes*wscale,s=KVM.kvSeq(m,ctx,kvb);
    const fit=mem>w?Math.floor((mem-w)/s):0,b=Math.max(fit,1);
    const t1=(w+s)/(chip.tbs*1e12*n),tb=(w+b*s)/(chip.tbs*1e12*n);
    return {fit,w,s,free:mem-w,t1_ms:t1*1e3,tb_ms:tb*1e3,user_tps:1/tb,agg_tps:b/tb};
  }
};
(function(){
  const D=MEMD,MS=D.models,CH=D.chips,byId={};MS.forEach(m=>byId[m.id]=m);const chipBy={};CH.forEach(c=>chipBy[c.id]=c);
  const reg=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-kv']=window.TAB_RENDER['t-kv']||[]).push(f)};
  const live=()=>{const t=document.getElementById('t-kv');return t&&!t.hidden};
  const pal6=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)'];
  const sty=i=>({color:pal6[i%6],dash:i>=12?'2 3':i>=6?'7 4':null});
  const kindTxt={mha:'MHA',gqa:'GQA',swa_all:'GQA + sliding window',gemma3:'local/global windows',alt:'alternating window/full',qnext:'hybrid linear + full',mla:'MLA'};
  const GB=b=>MC.gb(b);
  // ---------- 1. animation ----------
  const anIds=['l2','l8','mis','g27','oss','qn','ds3'];let anM=byId.l8;const CTX=[1024,2048,4096,8192,16384,32768,65536,131072];
  const segM=document.getElementById('kv-an-model');segM.innerHTML=anIds.map(id=>'<button data-m="'+id+'"'+(id==='l8'?' class="on"':'')+'>'+byId[id].name+'</button>').join('');
  const selC=document.getElementById('kv-an-chip');selC.innerHTML=CH.map(c=>'<option value="'+c.id+'"'+(c.id==='h100'?' selected':'')+'>'+c.name+' ('+c.gb+' GB, '+(+c.tbs.toPrecision(3))+' TB/s)</option>').join('');
  const svgA=document.getElementById('kv-an-svg');
  function drawA(k){const chip=chipBy[selC.value],ctx=CTX[k],W=RD.width(svgA),H=96,L=4,R=4;
    const cap=chip.gb*1e9,w=anM.wbytes,kv=KVM.kvSeq(anM,ctx,2);const scale=(W-L-R)/Math.max(cap,w+kv);
    let s='<rect x="'+L+'" y="22" width="'+(cap*scale)+'" height="34" rx="4" style="fill:var(--soft);stroke:var(--mute)"/>';
    s+='<rect x="'+L+'" y="22" width="'+(w*scale)+'" height="34" style="fill:var(--c4);opacity:.75"/>';
    s+='<rect x="'+(L+w*scale)+'" y="22" width="'+Math.max(1,kv*scale)+'" height="34" style="fill:var(--c2)"/>';
    s+=RD.t(L,15,chip.name+': '+chip.gb+' GB',{fs:11,fill:'var(--mute)'});
    s+=RD.t(L,74,'weights '+GB(w),{fs:11,fill:'var(--c4)'})+RD.t(Math.min(W-R,L+(w+kv)*scale),90,'KV '+GB(kv),{a:'end',fs:11,fill:'var(--c2)'});
    if(w+kv>cap)s+=RD.t(W-R,15,'does not fit on one GPU',{a:'end',fs:11,fill:'var(--bad)'});
    svgA.innerHTML=RD.svg(W,H,s,'Memory of one GPU');
    const p=KVM.plan(anM,chip,1,0.92,ctx,2,1);const tok=(w+kv)/(chip.tbs*1e12)*1e3;
    let txt=anM.name+' ('+kindTxt[anM.kind]+'): '+anM.note+'.';
    if(anM.slide&&ctx>anM.window)txt+=' Past '+MC.fmtN(anM.window,0)+' tokens the windowed layers stop growing; only '+anM.full+' of '+anM.L+' layers keep every token.';
    if(anM.kind==='swa_all'&&ctx>anM.window)txt+=' Every layer is windowed, so the cache is now constant: the model can no longer attend to the start of the conversation directly.';
    if(anM.fixed)txt+=' The '+MC.fmtN(anM.fixed/1e6,1)+' MB linear-attention state is the same at every length.';
    document.getElementById('kv-an-cap').innerHTML='<div class="t">'+MC.fmtN(ctx,0)+' tokens</div><p>'+txt+'</p>';
    document.getElementById('kv-an-cnt').innerHTML=RD.stat('KV cache, this conversation',GB(kv),MC.fmtN(kv/ctx/1024,1)+' KiB per token on average')+
      RD.stat('KV / weights',(kv/w*100<0.1?(kv/w*100).toPrecision(2):MC.fmtN(kv/w*100,kv/w<0.1?1:0))+'%','')+RD.stat('Batch-1 decode ceiling',w+kv>cap?'-':MC.fmtN(1000/tok,0)+' tok/s',w+kv>cap?'needs more GPUs':MC.fmtN(tok,2)+' ms per token')+
      RD.stat('Such conversations that fit',p.fit,'at 92% of '+chip.gb+' GB');
  }
  const A=RD.anim({card:'kv-an-card',ctl:'kv-an-ctl',n:CTX.length,draw:drawA,ms:1100,label:'Context'});
  RD.seg(segM,id=>{anM=byId[id];A.reset(CTX.length);A.play()});selC.addEventListener('change',()=>A.redraw());
  // ---------- 2. chart and table ----------
  const pick=new Set(['l2','l8','mis','g27','oss','qn','ds3','l70']);const segP=document.getElementById('kv-c-pick');
  segP.innerHTML=MS.map(m=>'<button data-m="'+m.id+'"'+(pick.has(m.id)?' class="on"':'')+'>'+m.name+'</button>').join('');
  segP.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const id=b.dataset.m;if(pick.has(id)){if(pick.size>1)pick.delete(id)}else pick.add(id);b.classList.toggle('on',pick.has(id));drawC()});
  const xs=[];for(let e=8;e<=18;e+=0.5)xs.push(Math.round(Math.pow(2,e)));
  function drawC(){const ser=MS.filter(m=>pick.has(m.id)).map(m=>({name:m.name,color:sty(MS.indexOf(m)).color,dash:sty(MS.indexOf(m)).dash,pts:xs.map(c=>({x:c,y:KVM.kvSeq(m,c,2)/1e9}))}));
    MC.line(document.getElementById('kv-c-svg'),ser.map(s=>Object.assign({},s,{name:''})),{logx:true,logy:true,xticks:[256,1024,4096,16384,65536,262144],xfmt:v=>v>=1024?MC.fmtN(v/1024,0)+'K':String(v),yfmt:v=>v>=1?MC.fmtN(v,0):String(+v.toPrecision(1)),xl:'context (tokens)',yl:'GB per sequence',label:'KV against context',h:310});
    // legend as HTML (long names wrap at phone width)
    const lg=document.getElementById('kv-c-leg')||(()=>{const d=document.createElement('div');d.id='kv-c-leg';d.className='hmleg';document.getElementById('kv-c-svg').after(d);return d})();
    lg.innerHTML=ser.map(s=>'<span><svg width="20" height="6"><line x1="0" x2="20" y1="3" y2="3" stroke-width="2.5"'+(s.dash?' stroke-dasharray="'+s.dash+'"':'')+' style="stroke:'+s.color+'"/></svg>'+s.name+'</span>').join('')}
  document.getElementById('kv-tbl').innerHTML='<thead><tr><th>Model</th><th>Attention</th><th class="num">Layers with a growing cache</th><th class="num">KV per token</th><th class="num">at 8K</th><th class="num">at 32K</th><th class="num">at 128K</th><th class="num">Weights</th><th class="num">Cache = weights at</th></tr></thead><tbody>'+
    MS.map(m=>{let eq='-';for(let e=8;e<=22;e+=0.25){const c=Math.round(Math.pow(2,e));if(KVM.kvSeq(m,c,2)>=m.wbytes){eq=MC.fmtN(c/1024,0)+'K tokens';break}}if(eq==='-')eq='beyond 4M';
      return '<tr><td><a href="'+m.src+'" target="_blank" rel="noopener noreferrer">'+m.name+'</a></td><td>'+kindTxt[m.kind]+'</td><td class="num">'+m.full+' of '+m.L+'</td><td class="num">'+MC.fmtN(m.kv_tok0_bf16/1024,1)+' KiB'+(m.slide?'<br><span class="mute">then '+MC.fmtN(m.kv_tok_bf16/1024,1)+'</span>':'')+'</td><td class="num">'+GB(m.kv['8192'])+'</td><td class="num">'+GB(m.kv['32768'])+'</td><td class="num">'+GB(m.kv['131072'])+'</td><td class="num">'+GB(m.wbytes)+'<br><span class="mute">'+m.wfmt+'</span></td><td class="num">'+eq+'</td></tr>'}).join('')+'</tbody>';
  document.getElementById('kv-tbl-note').innerHTML='BF16 cache for one sequence; "then" is the cost per token once every window is full. Max context in each config: '+MS.map(m=>m.name+' '+MC.fmtN(m.ctx,0)).join(', ')+' (the 8K to 128K columns go past it for Llama 2, Mistral and Qwen3 to keep one scale). Weights are the bytes of the released safetensors (DeepSeek-V3 and Llama 3.1 405B counted from the config by the parent\'s calculator, because DeepSeek-V3\'s index lists twice its FP8 size). Qwen3-Next\'s linear-attention state is an assumption (2 bytes per value). Configs: links in the first column; the 405B config comes from an open mirror whose architecture fields match Meta\'s gated repository. <span class="der">derived</span>';
  // ---------- 3. planner ----------
  const $=id=>document.getElementById(id);
  $('kv-p-model').innerHTML=MS.map(m=>'<option value="'+m.id+'"'+(m.id==='l70'?' selected':'')+'>'+m.name+'</option>').join('');
  $('kv-p-chip').innerHTML=CH.map(c=>'<option value="'+c.id+'"'+(c.id==='h100'?' selected':'')+'>'+c.name+'</option>').join('');
  function drawP(){const m=byId[$('kv-p-model').value],c=chipBy[$('kv-p-chip').value],n=+$('kv-p-n').value,ctx=Math.round(Math.pow(2,+$('kv-p-ctx').value)),kvb=+$('kv-p-kvb').value,ws=+$('kv-p-ws').value,u=+$('kv-p-u').value/100;
    $('kv-p-nv').textContent=n;$('kv-p-cv').textContent=MC.fmtN(ctx,0);$('kv-p-uv').textContent=Math.round(u*100)+'%';
    const p=KVM.plan(m,c,n,u,ctx,kvb,ws);const mem=c.gb*1e9*n;
    $('kv-p-out').innerHTML=RD.stat('Conversations that fit',p.fit,p.fit?'each '+GB(p.s)+' of cache':'the weights alone need '+GB(p.w)+' of '+GB(mem*u))+
      RD.stat('Decode step at that batch',p.fit?MC.fmtN(p.tb_ms,1)+' ms':'-',p.fit?'reads '+GB(p.w+p.fit*p.s):'')+
      RD.stat('Per conversation',p.fit?MC.fmtN(p.user_tps,1)+' tok/s':'-','ceiling')+RD.stat('All conversations',p.fit?MC.fmtN(p.agg_tps,0)+' tok/s':'-','ceiling')+
      RD.stat('At batch 1',p.free>0?MC.fmtN(1000/p.t1_ms,0)+' tok/s':'-','ceiling, same context');
    const used=p.fit*p.s;MC.bars($('kv-p-bar'),[{name:'weights',v:Math.max(1,p.w),label:GB(p.w),color:'var(--c4)'},{name:'KV, '+p.fit+' conversations',v:Math.max(1,used),label:GB(used),color:'var(--c2)'},{name:'left over',v:Math.max(1,mem-p.w-used),label:GB(Math.max(0,mem-p.w-used)),color:'var(--dim)'}]);
    $('kv-p-note').innerHTML=c.name+': '+c.gb+' GB and '+(+c.tbs.toPrecision(3))+' TB/s per GPU (<a href="'+c.src+'" target="_blank" rel="noopener noreferrer">source</a>); '+n+' of them hold '+GB(mem)+'. '+(p.fit?'Going from batch 1 to '+p.fit+' raises total throughput '+MC.fmtN(p.agg_tps*p.t1_ms/1000,0)+'&times; but slows each conversation: the cache bytes add to every step.':'')}
  ['kv-p-model','kv-p-chip','kv-p-n','kv-p-ctx','kv-p-kvb','kv-p-ws','kv-p-u'].forEach(id=>$(id).addEventListener('input',drawP));
  reg(()=>{A.redraw();drawC();drawP()});
  let t=0;addEventListener('resize',()=>{if(!live())return;clearTimeout(t);t=setTimeout(()=>{A.redraw();drawC()},80)});
  drawP();
})();
