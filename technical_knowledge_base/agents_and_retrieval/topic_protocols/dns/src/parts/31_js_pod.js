// ---- Pod resolver lab tab: two recorded getaddrinfo calls replayed packet by packet ----
(function(){
  const tab=document.getElementById('t-pod');if(!tab)return;const X=PODX,esc=RD.esc,fmt=X.fmt;
  const LIBC={glibc:'glibc',musl:'musl'};
  const DESC={ndots5:'ndots:5, 3 search domains',ndots1:'ndots:1',ndots5_4dom:'ndots:5, 4 search domains',drop_aaaa:'first AAAA lost',drop_aaaa_t1:'first AAAA lost, timeout:1',
    drop_aaaa_sr:'first AAAA lost, single-request-reopen',dead_first:'first of two nameservers dead',errors:'plain resolver',no_server:'only nameserver dead',big:'plain resolver'};
  const opts=[];X.by&&Object.keys(X.by).forEach(l=>{const s=X.by[l];const k=l.replace(/^(glibc|musl)_/,'');
    s.calls.forEach((c,i)=>opts.push({v:l+'|'+i,t:LIBC[s.libc]+', '+(DESC[k]||k)+': '+c.name}))});
  const side={a:'glibc_ndots5|0',b:'glibc_ndots5|1'};
  function get(v){const [l,i]=v.split('|');const s=X.by[l];const pc=X.perCall(s)[+i];
    return {s:s,pc:pc,ev:pc.all,t0:pc.t0}}
  function row(e,t0,cur){
    const t=(e.t-t0);const ts=(t>=1000?(t/1000).toFixed(3)+' s':t.toFixed(1)+' ms');
    if(e.tcp)return '<div class="'+(cur?'cur':'')+'"><span>'+ts+'</span><span>'+(e.d==='q'?'&rarr;':'&larr;')+'</span><span>TCP ['+esc(e.tcp)+']</span></div>';
    const body=e.d==='q'?esc(e.type+'? '+e.name)+(e.proto?' (TCP)':''):
      '<span class="'+(e.rcode==='NOERROR'?'ok':'nx')+'">'+esc(e.rcode)+'</span> '+esc(e.type+'? '+e.name)+(e.addrs?' &rArr; '+esc(e.addrs.join(', ')):'')+(e.tc?' <b>TC</b>':'')+(e.proto?' (TCP)':'');
    return '<div class="'+(e.d==='q'?'q ':'')+(cur?'cur':'')+'"><span>'+ts+'</span><span>'+(e.d==='q'?'&rarr;':'&larr;')+'</span><span>'+body+'</span></div>';
  }
  function pane(id,v,k){
    const el=document.getElementById(id);const g=get(v);
    let sel='<select aria-label="Recorded run">'+opts.map(o=>'<option value="'+o.v+'"'+(o.v===v?' selected':'')+'>'+esc(o.t)+'</option>').join('')+'</select>';
    let lad='',prev=g.t0;
    g.ev.forEach((e,i)=>{if(i>k)return;if(e.t-prev>500)lad+='<div><span></span><span></span><span class="gap">wait '+((e.t-prev)/1000).toFixed(2)+' s (timer)</span></div>';prev=e.t;lad+=row(e,g.t0,i===k)});
    const shown=g.ev.slice(0,k+1).filter(e=>e.type);
    const c=g.pc.call;const done=k>=g.ev.length-1;
    const relay=g.s.relay?'<details class="small"><summary>relay log ('+g.s.relay.length+' lines)</summary><div class="rc">'+esc(g.s.relay.join('\n'))+'</div></details>':'';
    el.innerHTML=sel+'<div class="rc">'+esc(g.s.resolv.trim())+'</div><div class="cnt">'+RD.stat('Queries sent',shown.filter(e=>e.d==='q').length+' / '+g.ev.filter(e=>e.d==='q'&&e.type).length)+
      RD.stat('NXDOMAIN',shown.filter(e=>e.rcode==='NXDomain').length)+RD.stat('getaddrinfo',done?fmt(c.ms):'...')+'</div>'+
      '<div class="lad">'+(lad||'<div><span></span><span></span><span class="mute">(no packets yet)</span></div>')+'</div>'+
      '<p class="small">'+(done?(c.ok?'<span class="ok">Resolved</span>: '+esc((c.addrs||[]).slice(0,4).join(', '))+((c.addrs||[]).length>4?' ...':''):'<span class="no">Failed</span>: <code>'+esc(c.error||'')+'</code>'):'')+'</p>'+relay;
    el.querySelector('select').addEventListener('change',e=>{side[id==='pd-a'?'a':'b']=e.target.value;reset()});
    return g;
  }
  function bars(){
    const el=document.getElementById('pd-bars');const w=RD.width(el);const ga=get(side.a),gb=get(side.b);const mx=Math.max(ga.pc.call.ms,gb.pc.call.ms,1);
    let b='';const x=v=>110+(w-170)*v/mx;
    [['left',ga],['right',gb]].forEach(([n,g],i)=>{const y=14+i*26;b+=RD.t(4,y+12,n+' pane',{fs:11})+'<rect x="110" y="'+y+'" width="'+Math.max(2,x(g.pc.call.ms)-110)+'" height="16" fill="'+(i?'#3f7f56':'#2f6fb5')+'"/>'+RD.t(Math.min(w-4,x(g.pc.call.ms)+4),y+12,fmt(g.pc.call.ms),{fs:11,a:x(g.pc.call.ms)>w-60?'end':'start'})});
    el.innerHTML=RD.svg(w,66,b,'Duration of the two calls, one scale');
  }
  let A;
  function n(){return Math.max(get(side.a).ev.length,get(side.b).ev.length,1)}
  function draw(k){const ga=pane('pd-a',side.a,k),gb=pane('pd-b',side.b,k);bars();
    const cap=(g,nm)=>{const e=g.ev[Math.min(k,g.ev.length-1)];if(!e)return nm+': no packets (the library could not even reach a server).';
      return nm+': '+(e.tcp?'TCP segment ['+e.tcp+']':(e.d==='q'?'asks '+e.type+' for '+e.name:'gets '+e.rcode+' for '+e.type+' '+e.name))+' at '+fmt(e.t-g.t0)+'.'};
    document.getElementById('pd-cap').innerHTML=cap(ga,'Left')+' '+cap(gb,'Right')}
  function reset(){A.reset(n());A.go(n()-1)}
  A=RD.anim({card:'pd-bars',ctl:'pd-ctl',n:n(),draw:draw,ms:700,label:'Packet'});
  document.getElementById('pd-pre').addEventListener('click',e=>{const b=e.target.closest('button[data-p]');if(!b)return;const p=b.dataset.p.split(',');side.a=p[0];side.b=p[1];A.reset(n());A.play()});
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-pod']=[()=>A.redraw()];
  addEventListener('resize',()=>{if(!tab.hidden)bars()});
})();
