// ---- Compiler explorer: 2. three-pane explorer with source-line mapping ----
(function(){
  const X=window.CMPX,D=window.CMP;if(!D||!X.$('cmp-xp'))return;
  const CAT={mem:['Global, shared, local memory','var(--cmp-mem)'],fp:['FP32/FP16 math','var(--cmp-fp)'],tc:['Tensor core','var(--cmp-tc)'],int:['Integer, address, constants','var(--cmp-int)'],sync:['Sync and warp exchange','var(--cmp-sync)'],ctl:['Control flow','var(--cmp-ctl)']};
  window.CMPX.CAT=CAT;
  const opOf=t=>{const m=t.replace(/^@!?U?P\w+\s+/,'').match(/^([A-Z0-9_]+)/);return m?m[1]:''};
  const catOf=op=>(D.ops[op]&&D.ops[op][1])||'int';
  window.CMPX.opOf=opOf;window.CMPX.catOf=catOf;
  const ks=D.kernels.filter(k=>!k.hidden);
  let kid=ks[0].id,arch='sm_90a',sel=-1;
  const sk=X.$('cmp-xp-k');sk.innerHTML=ks.map(k=>'<option value="'+k.id+'">'+X.esc(k.title)+'</option>').join('');
  X.$('cmp-xp-a').innerHTML=D.archs.map(a=>'<button data-m="'+a+'"'+(a===arch?' class="on"':'')+'>'+a+'</button>').join('');
  function line(txt,lines,i,kind){
    let h=X.esc(txt);
    if(kind==='sass'){const op=opOf(txt);if(op){const c=catOf(op);h=h.replace(op,'<span class="op cmp-k-'+c+'">'+op+'</span>')}}
    if(kind==='ptx'){h=h.replace(/^(\s*)(\/\/.*)$/,'$1<span class="c">$2</span>')}
    return '<span class="cmp-ln" data-i="'+i+'" data-l="'+(lines||[]).join(',')+'"><span class="n">'+(i+1)+'</span>'+h+'</span>'}
  function render(){
    const K=D.kernels.find(k=>k.id===kid),R=K.arch[arch];sel=-1;
    X.$('cmp-xp-about').innerHTML=K.about;
    X.$('cmp-xp-src').innerHTML=K.src.map((t,i)=>line(t,[i+1],i,'src')).join('');
    if(!R.ok){
      X.$('cmp-xp-stats').innerHTML='';X.$('cmp-xp-mix').innerHTML='';X.$('cmp-xp-leg').innerHTML='';
      X.$('cmp-xp-cap').innerHTML='<span class="cmp-tag no">did not compile</span> for '+arch+'. The compiler said:<div class="cmp-err">'+X.esc(R.err)+'</div>'+(K.whyfail&&K.whyfail[arch]?K.whyfail[arch]:'');
      X.$('cmp-xp-ptx').innerHTML=R.ptx?R.ptx.map((l,i)=>line(l[0],l[1],i,'ptx')).join(''):'<span class="cmp-ln"><span class="n"></span>(the front end can emit PTX for this target, but ptxas rejects it: see the error)</span>';
      X.$('cmp-xp-sass').innerHTML='<span class="cmp-ln"><span class="n"></span>(no SASS: compilation failed)</span>';return}
    const r=R.res,o=window.CMPX.occ(arch,r.regs,r.smem,K.block,K.dsmem||0,r.bars);
    X.$('cmp-xp-stats').innerHTML=X.stat('Registers / thread',r.regs,'of 255 max')+X.stat('Shared memory / block',r.smem+' B',r.smem?'static, from ptxas':'none')+
      X.stat('Spill stores / loads',r.spillSt+' / '+r.spillLd+' B',r.spillSt?'<b style="color:var(--bad)">spilling</b>':'none')+
      X.stat('SASS instructions',R.sass.filter(l=>!/^\.L_x_/.test(l[0])).length,'in the kernel body')+
      X.stat('Occupancy',Math.round(o.occ*100)+'%',o.warps+' of '+o.maxW+' warps at '+K.block+' threads/block; limit: '+o.lim);
    const cnt={};let tot=0;R.sass.forEach(l=>{const op=opOf(l[0]);if(!op||op==='NOP')return;const c=catOf(op);cnt[c]=(cnt[c]||0)+1;tot++});
    X.$('cmp-xp-mix').innerHTML=Object.keys(CAT).filter(c=>cnt[c]).map(c=>'<span title="'+CAT[c][0]+': '+cnt[c]+'" style="width:'+(100*cnt[c]/tot)+'%;background:'+CAT[c][1]+'"></span>').join('');
    X.$('cmp-xp-leg').innerHTML=Object.keys(CAT).filter(c=>cnt[c]).map(c=>'<span><i style="background:'+CAT[c][1]+'"></i>'+CAT[c][0]+' '+cnt[c]+'</span>').join('')+'<span>(static count, NOPs excluded)</span>';
    X.$('cmp-xp-cap').innerHTML=(K.notes&&K.notes[arch])||K.note||'';
    X.$('cmp-xp-ptx').innerHTML=R.ptx.map((l,i)=>line(l[0],l[1],i,'ptx')).join('');
    X.$('cmp-xp-sass').innerHTML=R.sass.map((l,i)=>line(l[0],l[1],i,'sass')).join('');
  }
  function hl(L){
    sel=L;['src','ptx','sass'].forEach(p=>{const pre=X.$('cmp-xp-'+p);let first=null;
      pre.querySelectorAll('.cmp-ln').forEach(e=>{const on=L>0&&(','+e.dataset.l+',').indexOf(','+L+',')>=0;e.classList.toggle(p==='src'?'on':'on2',on);if(on&&!first)first=e});
      if(first){pre.scrollTop=Math.max(0,first.offsetTop-pre.offsetTop-40)}})}
  X.$('cmp-xp-src').addEventListener('click',e=>{const l=e.target.closest('.cmp-ln');if(!l)return;const L=+l.dataset.i+1;hl(sel===L?-1:L)});
  function opInfo(e,pane){const l=e.target.closest('.cmp-ln');if(!l)return;const t=l.textContent.replace(/^\d+/,'').trim();
    const ls=(l.dataset.l||'').split(',').filter(Boolean);
    if(pane==='sass'){const op=opOf(t),d=D.ops[op];X.$('cmp-xp-op').innerHTML='<b>'+X.esc(op||'?')+'</b>: '+(d?X.esc(d[0])+' ('+CAT[d[1]][0].toLowerCase()+')':'not in the excerpt of NVIDIA\'s table kept here')+(d&&d[2]?'. '+d[2]:'')+(ls.length?'. From source line '+ls.join(', ')+'.':'. No source line (setup or epilogue code).')}
    else X.$('cmp-xp-op').innerHTML=ls.length?'From source line '+ls.join(', ')+'.':'No source line attached.';
    if(ls.length)hl(+ls[ls.length-1]);}
  X.$('cmp-xp-sass').addEventListener('click',e=>opInfo(e,'sass'));
  X.$('cmp-xp-ptx').addEventListener('click',e=>opInfo(e,'ptx'));
  sk.addEventListener('change',()=>{kid=sk.value;render()});
  X.seg(X.$('cmp-xp-a'),m=>{arch=m;render()});
  X.seg(X.$('cmp-xp-v'),m=>{const P=X.$('cmp-xp-panes');P.classList.toggle('three',m==='3');X.$('cmp-xp-p1').hidden=m==='sass';X.$('cmp-xp-p2').hidden=m==='ptx'});
  window.CMPX.xpShow=(k,a)=>{kid=k;arch=a;sk.value=k;X.$('cmp-xp-a').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m===a));render();X.$('cmp-xp').scrollIntoView({block:'start'})};
  render();
})();
