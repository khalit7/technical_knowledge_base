// ---- Failure lab (t-fail): browse, search, filters, case detail and its small charts. Data: window.FL_DATA (32_js_fail_data.js, built by src/fail/make_data.py) ----
window.FL=(function(){
  const D=window.FL_DATA,C=D.cases,byId={};C.forEach(c=>byId[c.id]=c);
  const $=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  const LAYERS=[['DNS','var(--c6)','name lookup'],['TCP','var(--c1)','connection'],['TLS','var(--c4)','encryption and identity'],['HTTP','var(--c2)','requests, proxies, streaming'],['HTTP/2','var(--c5)','streams, gRPC'],['Auth','var(--c3)','tokens and OAuth'],['Agent','var(--closed)','MCP and tool results']];
  const LC={};LAYERS.forEach(l=>LC[l[0]]=l[1]);
  // canonical tool groups for the filter, from each case's tools list
  const TOOLS=[['curl',/curl/],['Python',/requests|httpx|PyJWT|dnspython|resolver|socket|h2 client|MCP client/],['Node fetch',/node/],['openssl',/openssl/],['dig',/dig|dns log/],['gRPC',/grpc/],['MCP',/MCP/],['nginx log',/nginx/]];
  C.forEach(c=>{const t=c.tools.join(' ');c._tools=TOOLS.filter(x=>x[1].test(t)).map(x=>x[0]);
    c._text=(c.t+' '+c.sym+' '+c.cause+' '+c.layer+' '+c.runs.map(r=>r.cmd+' '+r.out).join(' ')).toLowerCase()});
  const st={layer:null,tool:null,q:'',sel:null};
  try{const v=localStorage.getItem('fl-sel');if(v&&byId[v])st.sel=v}catch(e){}
  const tag=l=>'<span class="fl-tag" style="color:'+LC[l]+'">'+esc(l)+'</span>';

  function chips(){
    $('fl-layers').innerHTML='<span class="lbl">Layer</span>'+['All'].concat(LAYERS.map(l=>l[0])).map(l=>'<button data-l="'+l+'" class="'+((st.layer||'All')===l?'on':'')+'" title="'+esc(l==='All'?'every layer':(LAYERS.find(x=>x[0]===l)[2]))+'">'+esc(l)+'</button>').join('');
    $('fl-tools').innerHTML='<span class="lbl">Tool</span>'+['All'].concat(TOOLS.map(t=>t[0])).map(t=>'<button data-t="'+t+'" class="'+((st.tool||'All')===t?'on':'')+'">'+esc(t)+'</button>').join('');
  }
  function match(c){
    if(st.layer&&c.layer!==st.layer)return false;
    if(st.tool&&c._tools.indexOf(st.tool)<0)return false;
    if(st.q){const words=st.q.toLowerCase().split(/\s+/).filter(Boolean);if(!words.every(w=>c._text.indexOf(w)>=0))return false}
    return true;
  }
  function list(){
    const hit=C.filter(match);
    $('fl-count').textContent=hit.length+' of '+C.length+' failures'+(st.q?' match "'+st.q+'"':'')+'. Select one to see the recorded runs.';
    $('fl-list').innerHTML=hit.map(c=>'<button class="fl-item'+(st.sel===c.id?' sel':'')+'" data-id="'+c.id+'" style="border-left-color:'+LC[c.layer]+'"><span class="nm">'+esc(c.t)+'</span>'+tag(c.layer)+'<span class="sy">'+esc(c.sym)+'</span></button>').join('')||'<p class="mute">No recorded failure matches. Try fewer words, or one distinctive word from the error (for example ECONNRESET, 504, issuer).</p>';
  }
  function hl(s){
    const ws=st.q?st.q.split(/\s+/).filter(w=>w.length>1).map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')):[];
    if(!ws.length)return esc(s);
    return String(s).split(new RegExp('('+ws.join('|')+')','gi')).map((p,i)=>i%2?'<mark>'+esc(p)+'</mark>':esc(p)).join('');
  }
  function term(r){
    return '<div class="fl-term">'+(r.note?'<div class="n">'+esc(r.note)+'</div>':'')+'<div class="c">'+esc(r.cmd)+'</div><pre>'+hl(r.out||'(no output)')+'</pre>'+(r.rc===undefined?'':'<div class="rc">exit status '+r.rc+'</div>')+'</div>';
  }
  function detail(id){
    const c=byId[id],el=$('fl-detail');if(!c){el.innerHTML='';return}
    const SHOW=4,more=c.runs.length>SHOW;
    el.innerHTML='<div class="fl-detail" id="fl-d-'+c.id+'"><div>'+tag(c.layer)+'<span class="small mute">recorded '+esc(c.recorded)+'</span></div><h3>'+esc(c.t)+'</h3>'+
      '<div class="fl-sec"><b>What you see</b><code style="overflow-wrap:anywhere">'+esc(c.sym)+'</code></div>'+
      '<div class="fl-sec"><b>Check first</b>'+c.a+'</div>'+
      '<div class="fl-sec"><b>Recorded runs</b><div id="fl-runs">'+c.runs.slice(0,SHOW).map(term).join('')+'</div>'+(more?'<button class="fl-more" id="fl-morebtn">Show '+(c.runs.length-SHOW)+' more recorded run'+(c.runs.length-SHOW>1?'s':'')+'</button>':'')+'</div>'+
      '<div class="fl-chart" id="fl-chart"></div>'+
      '<div class="fl-sec"><b>Cause</b>'+esc(c.cause)+'</div>'+
      '<div class="fl-sec"><b>Fix</b>'+esc(c.fix)+'</div>'+
      '<div class="fl-sec"><b>In ML work</b>'+esc(c.ml)+'</div>'+
      (c.sim?'<div class="fl-sim"><b>Simulated:</b> '+esc(c.sim)+'</div>':'')+
      '<div class="fl-sec fl-src"><b>Sources</b>'+c.src.map(s=>'<a href="'+esc(s[1])+'" target="_blank" rel="noopener noreferrer">'+esc(s[0])+'</a>').join('')+'</div></div>';
    if(more)$('fl-morebtn').addEventListener('click',e=>{$('fl-runs').innerHTML=c.runs.map(term).join('');e.target.remove()});
    chart(c);
  }
  function select(id,scroll){
    st.sel=id;try{localStorage.setItem('fl-sel',id)}catch(e){}
    list();detail(id);if(scroll){const d=$('fl-detail');if(d&&d.scrollIntoView)d.scrollIntoView({block:'start'})}
  }
  // ---- charts inside a case ----
  function width(){const el=$('fl-chart');return Math.max(260,Math.min(860,(el&&el.clientWidth)||600))}
  function chart(c){
    const el=$('fl-chart');if(!el)return;el.innerHTML='';
    if(c.id==='window_rtt')winChart(c,el);
    else if(c.id==='buffering')bufChart(c,el);
    else if(c.id==='max_streams')streamChart(c,el);
    else if(c.id==='grpc_pinning')pinChart(c,el);
  }
  const COL=['var(--c1)','var(--c2)','var(--c3)','var(--c4)'];
  function winChart(c,el){
    const g=c.grid.filter(r=>r.rtt>0),wins=[...new Set(g.map(r=>r.win))],rtts=[...new Set(g.map(r=>r.rtt))];
    const W=width(),H=Math.round(Math.min(320,W*0.62)),L=46,R=12,T=12,B=34;
    const lx=r=>L+(Math.log(r)-Math.log(15))/(Math.log(130)-Math.log(15))*(W-L-R);
    const ymin=0.3,ymax=400,ly=v=>T+(1-(Math.log(v)-Math.log(ymin))/(Math.log(ymax)-Math.log(ymin)))*(H-T-B);
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Measured throughput against round-trip time for four window sizes, with the window divided by round trip prediction">';
    [0.5,1,2,5,10,20,50,100,200].forEach(v=>{s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+ly(v)+'" y2="'+ly(v)+'" stroke="var(--line)"/><text x="'+(L-5)+'" y="'+(ly(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+v+'</text>'});
    rtts.forEach(r=>{s+='<text x="'+lx(r)+'" y="'+(H-B+15)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+r+' ms</text>'});
    s+='<text x="'+((L+W-R)/2)+'" y="'+(H-4)+'" font-size="11" text-anchor="middle" fill="var(--mute)">round-trip time (log scale)</text>';
    s+='<text x="10" y="'+(T+2)+'" font-size="11" fill="var(--mute)" transform="rotate(90 10 '+(T+2)+')">MB/s (log)</text>';
    wins.forEach((w,i)=>{const pts=[15,130].map(r=>lx(r)+','+ly(Math.min(ymax*2,w/(r/1000)/1e6)));
      s+='<polyline points="'+pts.join(' ')+'" fill="none" stroke="'+COL[i]+'" stroke-dasharray="4 4" stroke-width="1.3" opacity=".8"/>';
      g.filter(r=>r.win===w).forEach(r=>{s+='<circle cx="'+lx(r.rtt)+'" cy="'+ly(r.mbps)+'" r="4.5" fill="'+COL[i]+'"><title>window '+w.toLocaleString('en')+' B, RTT '+r.rtt+' ms: '+r.mbps+' MB/s measured, '+(w/(r.rtt/1000)/1e6).toFixed(2)+' MB/s = window / RTT</title></circle>'})});
    s+='</svg>';
    const rows=g.map(r=>{const p=r.win/(r.rtt/1000)/1e6;return '<tr><td class="num">'+r.win.toLocaleString('en')+' B</td><td class="num">'+r.rtt+' ms</td><td class="num">'+r.mbps.toFixed(2)+'</td><td class="num">'+p.toFixed(2)+'</td><td class="num">'+Math.round(100*r.mbps/p)+'%</td></tr>'}).join('');
    el.innerHTML='<b class="small">Measured throughput (dots) against window / RTT (dashed), one 16 MB HTTP/2 download per point</b><div class="fl-legend">'+wins.map((w,i)=>'<span><i style="background:'+COL[i]+'"></i>window '+(w>=1048576?(w/1048576)+' MiB':Math.round(w/1024)+' KiB')+'</span>').join('')+'</div>'+s+
      '<details class="mist"><summary>The numbers</summary><div class="b"><div class="tw"><table><thead><tr><th class="num">window</th><th class="num">RTT</th><th class="num">measured MB/s</th><th class="num">window / RTT</th><th class="num">ratio</th></tr></thead><tbody>'+rows+'</tbody></table></div><p class="small mute">At 0 ms (no proxy) every window ran at 260 to 660 MB/s, limited by the Python HTTP/2 library, not by the window. Derived column: window bytes / RTT seconds / 10<sup>6</sup>.</p></div></details>';
  }
  function times(out){return out.split('\n').map(l=>{const m=l.match(/^\+([\d.]+) s\s+(\S+)/);return m?{t:+m[1],ev:m[2]}:null}).filter(Boolean).filter(x=>x.ev!=='HTTP')}
  function bufChart(c,el){
    const W=width(),Ls=c.runs.map(r=>({lab:r.note,ts:times(r.out)})),tmax=0.4,L=8,R=12;
    const x=t=>L+t/tmax*(W-L-R);
    let h='<b class="small">When each event reached the client (one dot per SSE event; the first is message_start)</b>';
    Ls.forEach((r,i)=>{const lump=r.ts.length&&r.ts[r.ts.length-1].t-r.ts[0].t<0.01;
      let s='<svg viewBox="0 0 '+W+' 26" width="'+W+'" height="26" aria-hidden="true"><line x1="'+L+'" x2="'+(W-R)+'" y1="13" y2="13" stroke="var(--line)"/>';
      r.ts.forEach(p=>{s+='<circle cx="'+x(p.t)+'" cy="13" r="5" fill="'+(lump?'var(--bad)':'var(--c1)')+'" opacity=".85"/>'});
      h+='<div class="small" style="margin-top:6px">'+esc(r.lab)+(lump?' <b style="color:var(--bad)">all at once</b>':'')+'</div>'+s+'</svg>'});
    let ax='<svg viewBox="0 0 '+W+' 18" width="'+W+'" height="18" aria-hidden="true">';[0,0.1,0.2,0.3,0.4].forEach(t=>{ax+='<text x="'+Math.min(W-R-10,Math.max(L+6,x(t)))+'" y="13" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+t.toFixed(1)+' s</text>'});
    el.innerHTML=h+ax+'</svg>';
  }
  function streamChart(c,el){
    const W=width(),L=8,R=12,tmax=3.2,x=t=>L+t/tmax*(W-L-R);let h='';
    c.runs.forEach(r=>{const calls=r.out.split('\n').map(l=>{const m=l.match(/^call (\d+): (.*?)\s+finished at\s+([\d.]+) s \(took ([\d.]+) s\)/);return m?{i:+m[1],ok:m[2].indexOf('DEADLINE')<0,end:+m[3],dur:+m[4]}:null}).filter(Boolean).sort((a,b)=>a.end-b.end);
      let s='<svg viewBox="0 0 '+W+' '+(calls.length*14+20)+'" width="'+W+'" height="'+(calls.length*14+20)+'" aria-hidden="true">';
      calls.forEach((k,j)=>{s+='<rect x="'+x(k.end-k.dur)+'" y="'+(j*14+2)+'" width="'+Math.max(2,x(k.end)-x(k.end-k.dur))+'" height="10" rx="2" fill="'+(k.ok?'var(--c1)':'var(--bad)')+'"><title>call '+k.i+': '+(k.ok?'answered':'deadline exceeded')+' at '+k.end+' s</title></rect>'});
      [0,1,2,3].forEach(t=>{s+='<line x1="'+x(t)+'" x2="'+x(t)+'" y1="0" y2="'+(calls.length*14+4)+'" stroke="var(--line)"/><text x="'+Math.max(L+8,x(t))+'" y="'+(calls.length*14+16)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+t+' s</text>'});
      h+='<div class="small" style="margin-top:6px">'+esc(r.note||'')+' <span class="mute">(blue answered, red deadline exceeded)</span></div>'+s+'</svg>'});
    el.innerHTML='<b class="small">Six concurrent calls on one connection, each bar from send to finish</b>'+h;
  }
  function pinChart(c,el){
    let h='<b class="small">Answers per backend</b><div class="bars">';
    c.runs.forEach((r,ri)=>{const lines=r.out.split('\n').filter(l=>l.indexOf('answers per backend')===0);
      lines.forEach((l,li)=>{const counts={};(l.match(/'(backend-\d)': (\d+)/g)||[]).forEach(m=>{const k=m.match(/'(backend-\d)': (\d+)/);counts[k[1]]=+k[2]});
        const lab=ri===0?'1 channel, L4':ri===1?'process '+(li+1)+', L4':'round_robin';
        ['backend-1','backend-2','backend-3'].forEach((b,bi)=>{const v=counts[b]||0;h+='<div class="row"><span class="nm">'+(bi===0?esc(lab)+': ':'')+b+'</span><span class="track"><span class="fill" style="width:'+(v/30*100)+'%;background:'+COL[bi]+'"></span></span><span class="val">'+v+'</span></div>'})})});
    el.innerHTML=h+'</div>';
  }
  function meta(){const el=$('fl-meta');if(el)el.innerHTML='<b class="small">Machine and versions ('+esc(D.recorded)+')</b>'+D.meta.map(term).join('')}
  function render(){if($('fl-chart')&&st.sel)chart(byId[st.sel])}
  // ---- wiring ----
  chips();list();meta();if(st.sel)detail(st.sel);
  $('fl-layers').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st.layer=b.dataset.l==='All'?null:b.dataset.l;chips();list()});
  $('fl-tools').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st.tool=b.dataset.t==='All'?null:b.dataset.t;chips();list()});
  let qt=0;$('fl-q').addEventListener('input',e=>{clearTimeout(qt);qt=setTimeout(()=>{st.q=e.target.value.trim();list();if(st.sel)detail(st.sel)},150)});
  $('fl-list').addEventListener('click',e=>{const b=e.target.closest('.fl-item');if(b)select(b.dataset.id,true)});
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-fail']=window.TAB_RENDER['t-fail']||[]).push(render);
  let rt=0,lw=0;window.addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{const t=$('t-fail');if(t&&!t.hidden&&t.clientWidth!==lw){lw=t.clientWidth;render()}},150)});
  return {C,byId,LAYERS,LC,esc,term,tag,select,showMode:null};
})();
