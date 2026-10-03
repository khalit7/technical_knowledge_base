// ---- Milestones and benchmarks: Atari-57 tables one at a time, Atari 100k, same agent different numbers, corrections ----
(function(){
  const D=window.MS,U=window.MSU;if(!D||!U)return;
  const {$,esc,A}=U;
  const fmt=v=>v==null?'':(v>=1000?v.toLocaleString('en-GB',{maximumFractionDigits:2}):String(v))+'%';
  // ---- Atari-57 ----
  const order=Object.keys(D.T);
  const st={src:'rainbow',proto:'noop57',met:'med',ord:'tab'};
  const FIRST='first';
  function rowsFor(){
    if(st.src===FIRST)return D.CLIMB.map(c=>({a:c.a,p:'noop57',med:c.med,mean:null,fr:c.frl,tab:c.tab,first:true}));
    return D.A.filter(r=>r.tab===st.src);
  }
  const sel=$('ms-src');
  sel.innerHTML=order.map(k=>'<option value="'+k+'">'+esc(D.T[k].n)+' ('+D.T[k].d.slice(0,4)+')</option>').join('')+'<option value="'+FIRST+'">First printed median per agent (several papers)</option>';
  sel.value=st.src;
  function protos(){const s=new Set(rowsFor().map(r=>r.p));return Object.keys(D.PROTO).filter(p=>s.has(p))}
  function lg(v){return Math.log10(v)}
  const LO=10,HI=10000;
  const px=v=>Math.max(0,Math.min(100,(lg(Math.max(v,LO))-lg(LO))/(lg(HI)-lg(LO))*100));
  function bars(){
    const ps=protos();if(ps.indexOf(st.proto)<0)st.proto=ps[0];
    $('ms-proto').innerHTML=Object.keys(D.PROTO).map(p=>'<button data-v="'+p+'"'+(p===st.proto?' class="on"':'')+(ps.indexOf(p)<0?' disabled title="Not in this table"':'')+'>'+esc(D.PROTO[p])+'</button>').join('');
    $('ms-proto').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{if(b.disabled)return;st.proto=b.dataset.v;bars()}));
    let R=rowsFor().filter(r=>r.p===st.proto);
    const hasMean=R.some(r=>r.mean!=null);
    if(!hasMean&&st.met==='mean')st.met='med';
    $('ms-met').querySelectorAll('button').forEach(b=>{b.classList.toggle('on',b.dataset.v===st.met);b.disabled=b.dataset.v==='mean'&&!hasMean;b.title=b.disabled?'This table prints medians only':''});
    const key=st.met==='med'?'med':'mean';
    R=R.filter(r=>r[key]!=null);
    if(st.ord==='val')R=R.slice().sort((a,b)=>b[key]-a[key]);
    const T=st.src===FIRST?null:D.T[st.src];
    $('ms-tnote').innerHTML=T?('<b>'+A(T.u,esc(T.n))+'</b>, '+esc(T.d)+'. Scores taken as: '+esc(T.snap)+'. '+esc(T.note)):
      '<b>One value per agent</b>, each the first 57-game no-op median printed for it, with the table named under each bar. Same protocol label, different papers: comparable in protocol, not in seeds, evaluation details or training budget. This is the series the animation below steps through.';
    const ticks=[10,100,1000,10000];
    let h='<div class="ms-axis"><span></span><div class="ax">'+ticks.map(t=>'<span style="left:'+px(t)+'%">'+(t>=1000?(t/1000)+',000':t)+'%</span>').join('')+'</div><span></span></div>';
    R.forEach(r=>{const v=r[key];const sub=[];if(r.fr)sub.push(r.fr+' frames');if(r.first)sub.push(D.T[r.tab].n);
      h+='<div class="ms-row"><div class="nm">'+esc(r.a)+(sub.length?'<small>'+esc(sub.join(' · '))+'</small>':'')+'</div><div class="tr">'+
        ticks.map(t=>'<span class="gl" style="left:'+px(t)+'%"></span>').join('')+'<span class="fl'+(r.flag?' flg':'')+'" style="width:'+px(v)+'%"></span><span class="hl" style="left:'+px(100)+'%"></span></div><div class="v">'+fmt(v)+'</div>'+
        (r.flag?'<div class="note">'+esc(r.flag)+'</div>':'')+'</div>'});
    if(!R.length)h+='<p class="mute small">This table prints no value for this statistic and protocol.</p>';
    $('ms-bars').innerHTML=h;
  }
  sel.addEventListener('change',()=>{st.src=sel.value;bars()});
  $('ms-met').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{if(b.disabled)return;st.met=b.dataset.v;bars()}));
  $('ms-ord').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{st.ord=b.dataset.v;$('ms-ord').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));bars()}));
  bars();

  // ---- Atari 100k ----
  const ks={src:'bbf',met:'iqm'};
  const K=D.K,kk=Object.keys(K);
  function kbars(){
    $('ms-ksrc').innerHTML=kk.map(k=>'<button data-v="'+k+'"'+(k===ks.src?' class="on"':'')+'>'+esc(K[k].n)+'</button>').join('');
    $('ms-ksrc').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{ks.src=b.dataset.v;kbars()}));
    const T=K[ks.src],idx={med:1,mean:2,iqm:3};
    const hasIqm=T.rows.some(r=>r[3]!=null);if(!hasIqm&&ks.met==='iqm')ks.met='med';
    $('ms-kmet').querySelectorAll('button').forEach(b=>{b.classList.toggle('on',b.dataset.v===ks.met);b.disabled=b.dataset.v==='iqm'&&!hasIqm;b.title=b.disabled?'This table prints no IQM':''});
    $('ms-knote').innerHTML='<b>'+A(T.u,esc(T.n))+'</b>, '+esc(T.d)+'. 26 games, 100k agent steps. Runs: '+esc(T.seeds)+'.';
    const MX=2.4,p=v=>Math.max(0,Math.min(100,v/MX*100)),ticks=[0,0.5,1,1.5,2];
    let h='<div class="ms-axis" style="--ms-nm:9em"><span></span><div class="ax">'+ticks.map(t=>'<span style="left:'+p(t)+'%">'+t+'</span>').join('')+'</div><span></span></div>';
    T.rows.forEach(r=>{const v=r[idx[ks.met]];if(v==null)return;
      h+='<div class="ms-row" style="--ms-nm:9em"><div class="nm">'+esc(r[0])+'</div><div class="tr">'+ticks.map(t=>'<span class="gl" style="left:'+p(t)+'%"></span>').join('')+'<span class="fl" style="width:'+p(v)+'%"></span><span class="hl" style="left:'+p(1)+'%"></span></div><div class="v">'+v.toFixed(3)+'</div></div>'});
    $('ms-kbars').innerHTML=h;
  }
  $('ms-kmet').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{if(b.disabled)return;ks.met=b.dataset.v;kbars()}));
  kbars();

  // ---- same agent, different numbers ----
  $('ms-rec').innerHTML=D.REC.map(x=>'<div class="ms-rec"><h4>'+esc(x.a)+'</h4><div class="tw"><table><thead><tr><th>Value</th><th>What was measured</th><th>Printed in</th></tr></thead><tbody>'+
    x.rows.map(r=>'<tr><td class="v">'+esc(r[0])+'</td><td>'+esc(r[1])+'</td><td>'+esc(r[2])+'</td></tr>').join('')+'</tbody></table></div><p>'+esc(x.say)+'</p></div>').join('');

  // ---- corrections ----
  $('ms-fixes').innerHTML=D.M.filter(m=>m.fix).map(m=>'<li><b><a href="#" data-id="'+m.id+'">'+esc(m.t)+'</a></b> ('+esc(U.dtxt(m.d))+'): '+esc(m.fix)+'</li>').join('')+
    '<li><b>Atari medians across papers.</b> A median is only comparable within one protocol and, strictly, within one table: see <a href="#" data-go="ms-h-rec">Same agent, different numbers</a>.</li>';
  $('ms-fixes').querySelectorAll('a[data-id]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();U.select(a.dataset.id)}));
  $('ms-fixes').querySelectorAll('a[data-go]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();$(a.dataset.go).scrollIntoView({block:'start'})}));
})();
