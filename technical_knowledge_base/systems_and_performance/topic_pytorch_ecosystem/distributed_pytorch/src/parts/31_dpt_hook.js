// ---- Comm-hook bytes lab (t-dpt-hook) ----
(function(){
  const D=window.DPT,U=window.DU,$=U.$;
  const COLS=['var(--ink)','var(--c6)','var(--c3)','var(--c5)','var(--c2)','var(--c1)','var(--c4)','var(--bad)'];
  let W=2;const on={};
  const vs=()=>D.hooks[W];
  function hooksUI(){
    $('dh-hooks').innerHTML=vs().map((v,i)=>{const bad=v.error||v.aborted;if(on[i]==null)on[i]=!bad&&i!==1;
      return '<label><input type="checkbox" data-i="'+i+'"'+(on[i]&&!bad?' checked':'')+(bad?' disabled':'')+'><i style="background:'+COLS[i]+'"></i>'+U.esc(v.name)+(v.aborted?' <span class="no">aborted</span>':v.error?' <span class="no">refused</span>':'')+'</label>'}).join('');
  }
  $('dh-hooks').addEventListener('change',e=>{const i=+e.target.dataset.i;on[i]=e.target.checked;draw()});
  function chart(el,series,o){
    const w=U.W(el),h=o.h||200,L=58,R=10,T=8,B=26;const all=series.flatMap(s=>s.pts.map(p=>p[1])).filter(v=>o.log?v>0:true);
    if(!all.length){el.innerHTML='';return}
    let y0=o.y0!=null?o.y0:Math.min(...all),y1=Math.max(...all);if(o.log){y0=Math.log10(Math.min(...all));y1=Math.log10(y1)}if(y1===y0){y1+=1}
    const pad=(y1-y0)*0.06;y0-=o.log?pad:(o.y0!=null?0:pad);y1+=pad;
    const xmax=o.xmax;const X=x=>L+(w-L-R)*x/xmax,Y=v=>T+(h-T-B)*(1-((o.log?Math.log10(v):v)-y0)/(y1-y0));
    let s='';
    const ticks=o.log?(()=>{const t=[];for(let e=Math.ceil(y0);e<=Math.floor(y1);e++)t.push(Math.pow(10,e));return t})():[0,1,2,3,4].map(k=>y0+(y1-y0)*k/4);
    ticks.forEach(v=>{s+='<line class="ax" x1="'+L+'" x2="'+(w-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'"/>'+RD.t(L-4,Y(v)+4,o.fmt(v),{a:'end',fill:'var(--mute)',fs:10})});
    [0,10,20].forEach(x=>{s+=RD.t(X(x),h-8,String(x),{a:'middle',fill:'var(--mute)',fs:10})});
    s+=RD.t(w-R,h-8,'step',{a:'end',fill:'var(--mute)',fs:10});
    series.forEach(sr=>{const p=sr.pts.filter(q=>!o.log||q[1]>0);if(o.bars){p.forEach(q=>{s+='<rect x="'+(X(q[0])-3)+'" y="'+Y(q[1])+'" width="6" height="'+Math.max(1,h-B-Y(q[1]))+'" fill="'+sr.c+'" opacity=".55"/>'});return}
      s+='<polyline fill="none" stroke="'+sr.c+'" stroke-width="'+(sr.thin?1:2)+'" points="'+p.map(q=>X(q[0])+','+Y(q[1])).join(' ')+'"><title>'+U.esc(sr.name)+'</title></polyline>'});
    el.innerHTML=RD.svg(w,h,s,o.label);
  }
  function draw(){
    const v=vs();const sel=v.map((x,i)=>[x,i]).filter(([x,i])=>on[i]&&x.s&&x.s.length);
    chart($('dh-bytes'),sel.map(([x,i])=>({name:x.name,c:COLS[i],pts:x.s.map((s,k)=>[k,s[2]])})),{xmax:30,log:true,fmt:b=>b>=1e6?(b/1e6)+' MB':b>=1e3?(b/1e3)+' kB':b+' B',label:'Bytes per step'});
    chart($('dh-err'),sel.map(([x,i])=>({name:x.name,c:COLS[i],pts:x.s.map((s,k)=>[k,s[1]])})),{xmax:30,log:$('dh-log').checked,fmt:e=>$('dh-log').checked?U.sci(e,0):e.toFixed(2),label:'Relative error'});
    chart($('dh-loss'),sel.map(([x,i])=>({name:x.name,c:COLS[i],pts:x.s.map((s,k)=>[k,s[0]])})),{xmax:30,h:220,fmt:l=>l.toFixed(2),label:'Loss'});
    const base=v[0].s;
    $('dh-tbl').innerHTML=U.table(['Hook','Bytes per step (from step 2)','vs built-in','Collectives per step','Error at step 5','Error at step 29','Loss at step 29','Loss minus built-in'],v.map(x=>{
      if(x.aborted)return ['<code>'+U.esc(x.name)+'</code>','<span class="no">gloo aborted the job</span> (Reading tab, section 3)','','','','','',''];
      if(x.error&&!x.s.length)return ['<code>'+U.esc(x.name)+'</code>','<span class="no">refused</span>: '+U.esc(x.error.slice(0,90)),'','','','','',''];
      const s=x.s;return ['<code>'+U.esc(x.name)+'</code>',U.comma(s[5][2]),(s[5][2]/base[5][2]).toFixed(3)+'&times;',s[5][3],U.sci(s[5][1],2),U.sci(s[29][1],2),s[29][0].toFixed(4),(s[29][0]-base[29][0]>=0?'+':'')+(s[29][0]-base[29][0]).toFixed(4)]}));
    const ef=v.find(x=>x.name==='powerSGD rank 4'),nf=v.find(x=>x.name==='powerSGD rank 4, no error feedback');
    $('dh-note').innerHTML='<p>Read the error chart with error feedback in mind: a PowerSGD hook with error feedback sends this step\'s gradient <i>plus</i> the residual it failed to send before, so its per-step error against this step\'s exact gradient is larger'+(ef&&ef.s&&ef.s.length&&nf&&nf.s?' (rank 4 at step 29: '+U.sci(ef.s[29][1],2)+' with feedback, '+U.sci(nf.s[29][1],2)+' without)':'')+', while what accumulates over steps is closer to the truth. The loss chart is the judge. <code>allreduce_hook</code> reproduces the built-in path exactly (same bytes, same losses).</p>';
  }
  U.seg($('dh-w'),m=>{W=+m;for(const k in on)delete on[k];hooksUI();draw()});
  $('dh-log').addEventListener('change',draw);
  // ---- PowerSGD byte calculator (running example: vocab 43, d 256, context 64, 4 blocks; tied head counted once) ----
  const d=256,V=43,T=64,L=4;
  const mats=[['tok.weight (tied head)',V,d],['pos.weight',T,d]];const vecs=[['ln_f.weight, ln_f.bias',2*d]];
  for(let b=0;b<L;b++){mats.push(['blocks.'+b+'.attn.qkv.weight',3*d,d],['blocks.'+b+'.attn.proj.weight',d,d],['blocks.'+b+'.mlp.fc.weight',4*d,d],['blocks.'+b+'.mlp.proj.weight',d,4*d]);
    vecs.push(['blocks.'+b+' biases and LayerNorms',2*d+3*d+d+2*d+4*d+d])}
  const total=mats.reduce((a,m)=>a+m[1]*m[2],0)+vecs.reduce((a,v)=>a+v[1],0);
  function calc(){
    const r=+$('dh-r').value,mcr=+$('dh-mcr').value;$('dh-rv').textContent=r;
    let comp=0,unc=0;const rows=[];
    mats.forEach(m=>{const c=(m[1]+m[2])*r,ok=c*mcr<m[1]*m[2];if(ok)comp+=c;else unc+=m[1]*m[2];
      if(m[0].startsWith('blocks.0')||!m[0].startsWith('blocks'))rows.push(['<code>'+m[0]+'</code>',m[1]+' &times; '+m[2],U.comma(m[1]*m[2]),ok?'<span class="ok">P + Q: '+U.comma(c)+'</span>':'<span class="no">sent whole</span>'])});
    const one=vecs.reduce((a,v)=>a+v[1],0);
    const bytes=4*(comp+unc+one);
    $('dh-calc').innerHTML='<div class="tw"><table>'+U.table(['Tensor (blocks 1 to 3 like block 0)','Shape','Elements','Sent at rank '+r],rows)+'</table></div>'+
      '<p>Elements sent: compressed '+U.comma(comp)+' + uncompressed matrices '+U.comma(unc)+' + one-dimensional '+U.comma(one)+' = <b>'+U.comma(comp+unc+one)+'</b>, so <b>'+U.comma(bytes)+' bytes</b> per step per rank in float32, against '+U.comma(4*total)+' for a plain all-reduce ('+(total/(comp+unc+one)).toFixed(1)+'&times; less). In ring terms on n ranks each all-reduce costs 2(n &minus; 1)/n of that.</p>';
    const rec={};D.hooks[2].forEach(x=>{const m=/^powerSGD rank (\d+)$/.exec(x.name);if(m&&x.s&&x.s.length)rec[m[1]]=x.s[5][2]});
    const chk=Object.keys(rec).map(k=>{let c=0,u=0;mats.forEach(m=>{const cc=(m[1]+m[2])*k;if(cc*2<m[1]*m[2])c+=cc;else u+=m[1]*m[2]});const p=4*(c+u+one);return 'rank '+k+': formula '+U.comma(p)+' B, recorded '+U.comma(rec[k])+' B '+(p===rec[k]?'<span class="ok">equal</span>':'<span class="no">differs</span>')});
    $('dh-repro').innerHTML='Defaults reproduce the recorded bytes, independently (the formula uses only the shapes and the rule in the source): '+chk.join('; ')+'. fp16 compression: '+U.comma(2*total)+' B formula, '+U.comma(D.hooks[2][2].s[5][2])+' B recorded.';
  }
  $('dh-r').addEventListener('input',calc);$('dh-mcr').addEventListener('change',calc);
  hooksUI();
  U.onTab('t-dpt-hook',()=>{draw();calc()});U.onResize('t-dpt-hook',draw);
})();
