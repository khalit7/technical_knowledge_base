// ---- Fusion explorer (tab t-xpfuse) ----
(function(){
  const D=XP.D, F=D.fuse, esc=XP.esc, f=XP.f, $=id=>document.getElementById(id);
  const FNC={layer_norm:'var(--c1)',linear:'var(--c2)',attention:'var(--c4)',mlp:'var(--c5)',optimiser:'var(--c3)','model (other)':'var(--c6)',other:'var(--dim)'};
  const PH={f:'forward',b:'backward',o:'optimiser','?':'unlabelled'};
  const flt={kind:'all',phase:'all',fn:'all'};let sel=null;
  const fns=['all',...Object.keys(FNC).filter(k=>F.cat.some(r=>r[5]===k))];
  $('xf-fn').innerHTML=fns.map(k=>'<button data-m="'+esc(k)+'"'+(k==='all'?' class="on"':'')+'>'+esc(k==='all'?'All':k)+'</button>').join('');
  $('xf-leg').innerHTML=fns.slice(1).map(k=>'<span style="--sw:'+FNC[k]+'">'+esc(k)+'</span>').join('');
  const ok=r=>(flt.kind==='all'||r[1]===flt.kind)&&(flt.phase==='all'||r[4]===flt.phase)&&(flt.fn==='all'||r[5]===flt.fn);
  function grid(){
    $('xf-grid').innerHTML=F.cat.map((r,i)=>'<i role="listitem" data-i="'+i+'"'+(i<4?' data-xpclick="1"':'')+' class="'+(r[1]==='C'?'c ':'')+(ok(r)?'':'dim ')+(sel===i?'sel':'')+'" style="background:'+FNC[r[5]]+'" title="'+esc(r[0])+'"></i>').join('');
    const S=F.cat.filter(ok);
    $('xf-cnt').innerHTML=RD.stat('Fusions shown',f(S.length)+' of '+f(F.cat.length))+RD.stat('Operations inside',f(S.reduce((a,r)=>a+r[2],0)),'mean '+(S.length?(S.reduce((a,r)=>a+r[2],0)/S.length).toFixed(1):'0')+' per fusion')+RD.stat('Library (kCustom)',f(S.filter(r=>r[1]==='C').length))+RD.stat('Single-operation',f(S.filter(r=>r[2]<=1).length),'wrapped, not merged');
  }
  function det(i){
    sel=i;const r=F.cat[i];grid();
    const ex=F.examples[r[0]];
    $('xf-det').innerHTML='<b><code>'+esc(r[0])+'</code></b> '+(r[1]==='C'?'kCustom (YNNPACK library)':'kLoop')+'; '+r[2]+' operations inside, root <code>'+esc(r[3])+'</code>; phase '+PH[r[4]]+'; model function <b>'+esc(r[5])+'</b>.<br><span class="xf-note">Most frequent operations inside: '+esc(r[6]||'none')+'</span>'+
      (ex?'<pre>'+esc(ex.call)+'\n\n'+esc(ex.body.join('\n'))+(ex.truncated?'\n... '+ex.truncated+' more lines':'')+'</pre>':'<p class="xf-note">Full body not embedded for this one (16 representative fusions carry it).</p>');
  }
  [['xf-kind','kind'],['xf-phase','phase'],['xf-fn','fn']].forEach(([id,k])=>RD.seg($(id),m=>{flt[k]=m;grid()}));
  $('xf-grid').addEventListener('click',e=>{const t=e.target.closest('i[data-i]');if(t)det(+t.dataset.i)});
  // reasons
  const R=Object.entries(F.dec).sort((a,b)=>b[1]-a[1]);
  $('xf-reasons').innerHTML=R.map(([k,v],j)=>'<button data-j="'+j+'"><b>'+f(v)+'</b> '+esc(k)+'</button>').join('');
  $('xf-reasons').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;$('xf-reasons').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    const k=R[+b.dataset.j][0], ex=F.dec_ex[k];$('xf-reason-ex').innerHTML='<b>'+esc(k)+'</b><pre>'+esc(ex||'(no example recorded)')+'</pre>'});
  // breakers
  const lab={default:'Default',no_library:'Library off',no_fusion:'Fusion off'};
  $('xf-prog').innerHTML=F.breakers.map((b,i)=>'<option value="'+i+'">'+esc(b.title)+'</option>').join('');
  function prog(i){
    const b=F.breakers[i];
    $('xf-code').textContent=b.code;
    $('xf-tab').innerHTML='<table><thead><tr><th>Setting</th><th class="num">Kernels</th><th class="num">Bytes moved</th></tr></thead><tbody>'+['default','no_library','no_fusion'].map(s=>'<tr><td>'+lab[s]+'</td><td class="num">'+b.s[s].k+'</td><td class="num">'+XP.mb(b.s[s].b)+'</td></tr>').join('')+'</tbody></table>';
    $('xf-kern').innerHTML=['default','no_library','no_fusion'].map(s=>'<div class="xf-note" style="margin-top:4px">'+lab[s]+'</div><div class="xf-k">'+b.s[s].l.map(k=>'<span class="'+(k[1]==='kCustom'?'lib':'')+'">'+esc(k[0]==='fusion'?(k[2]||'fusion').split(' ').filter(o=>o!=='constant').join(' '):k[0])+'</span>').join('')+(b.s[s].more?'<span>+'+b.s[s].more+' more</span>':'')+'</div>').join('');
    const d=Object.entries(b.dec||{});
    $('xf-dec').innerHTML=d.length?d.map(([k,v])=>v+' x '+esc(k)).join('<br>'):'nothing logged (no producer-consumer pair was considered)';
    $('xf-hlo').textContent=b.hlo.join('\n')+(b.hlo_more?'\n... '+b.hlo_more+' more lines':'');
  }
  $('xf-prog').addEventListener('change',e=>prog(+e.target.value));
  grid();det(F.cat.findIndex(r=>F.examples[r[0]]));prog(0);
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-xpfuse']=[()=>{}];
})();
