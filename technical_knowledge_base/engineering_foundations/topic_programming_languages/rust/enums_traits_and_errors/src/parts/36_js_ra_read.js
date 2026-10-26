// ---- Reading: hero, UTF-8 slice widget (s1), states before/after (s2), the ? stepper (s3), iterator bars (s5), prediction prompts ----
(function(){
  const D=window.RA_DATA;if(!D||!document.getElementById('t-read'))return;
  const esc=RA.esc,T=RD.t;
  const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim()||'#888';

  // ----- hero: where each mistake is found -----
  const heroEl=document.getElementById('ra-hero');
  const ROWS=[
    ['A case nobody handled','falls through silently','E0004: every match listed'],
    ['None where a value was needed','AttributeError on None','Option: match before use'],
    ['A failure nobody handled ("8k")','ValueError raised','Result in the signature'],
    ['A type missing a method','AttributeError, 1st call','E0277 at the call']];
  function hero(){const W=Math.max(300,Math.min(860,RD.width(heroEl)));const wide=W>=600;
    const lw=wide?210:0,x0=lw+6,x1=W-4,mid=(x0+x1)/2,rh=wide?50:72,top=34;let s='';
    const H=top+ROWS.length*rh+6;
    s+='<rect x="'+x0+'" y="2" width="'+(mid-x0-3)+'" height="'+(H-4)+'" rx="6" fill="'+css('--open2')+'"/>';
    s+='<rect x="'+(mid+3)+'" y="2" width="'+(x1-mid-3)+'" height="'+(H-4)+'" rx="6" fill="'+css('--soft')+'"/>';
    s+=T(x0+8,20,'before it runs (cargo build)',{fs:12,w:600,fill:css('--ink')});
    s+=T(mid+11,20,'while it runs',{fs:12,w:600,fill:css('--ink')});
    ROWS.forEach((r,i)=>{const y=top+i*rh;
      if(i)s+='<line x1="'+(wide?0:x0)+'" x2="'+x1+'" y1="'+(y-4)+'" y2="'+(y-4)+'" stroke="'+css('--line')+'"/>';
      let ly=y+14;if(wide)s+=T(0,y+24,esc(r[0]),{fs:12.5,w:600,fill:css('--ink')});else{s+=T(x0+8,ly,esc(r[0]),{fs:12,w:600,fill:css('--ink')});ly+=8}
      const yy=wide?y+22:ly+16;
      // Rust marker, before it runs
      s+='<circle cx="'+(x0+16)+'" cy="'+yy+'" r="10" fill="'+css('--c1')+'"/>'+T(x0+16,yy+4,'Rs',{fs:10,a:'middle',w:600,fill:css('--bg')});
      s+=T(x0+31,yy+4,esc(r[2]),{fs:wide?11.5:10.5,fill:css('--ink')});
      // Python marker, while it runs
      const py=wide?yy:yy+22;
      s+='<circle cx="'+(mid+19)+'" cy="'+py+'" r="10" fill="'+css('--c2')+'"/>'+T(mid+19,py+4,'Py',{fs:10,a:'middle',w:600,fill:css('--bg')});
      s+=T(mid+34,py+4,esc(r[1]),{fs:wide?11.5:10.5,fill:css('--ink')});
    });
    heroEl.innerHTML=RD.svg(W,H,s,'Four mistakes: Rust reports each before the program runs, Python while it runs');}

  // ----- section 1: slicing UTF-8 -----
  const STR='café 日本語 🦀';
  const chars=[];{let off=0;for(const ch of STR){const n=new TextEncoder().encode(ch).length;chars.push({ch,off,n});off+=n}}
  const NB=chars.reduce((a,c)=>a+c.n,0);
  const bytes=[...new TextEncoder().encode(STR)];
  const byEl=document.getElementById('ra-bytes'),bs=document.getElementById('ra-bytes-s'),bv=document.getElementById('ra-bytes-v'),bo=document.getElementById('ra-bytes-out');
  const recorded=(D.strings.out.match(/^end byte index .*$/m)||[''])[0];
  function slice(){const end=+bs.value;const W=Math.max(300,Math.min(860,RD.width(byEl)));
    const cw=Math.min(36,(W-8)/NB),h=96;let s='';
    const inside=chars.find(c=>end>c.off&&end<c.off+c.n);
    chars.forEach(c=>{const x=4+c.off*cw,w=c.n*cw;const cut=inside===c;
      s+='<rect x="'+(x+1)+'" y="2" width="'+(w-2)+'" height="26" rx="4" fill="'+(cut?css('--bad'):c.off+c.n<=end?css('--acc2'):css('--soft'))+'" stroke="'+css('--line')+'"/>';
      s+=T(x+w/2,21,c.ch===' '?'␣':esc(c.ch),{fs:15,a:'middle',fill:css('--ink')});
      for(let k=0;k<c.n;k++){const bx=4+(c.off+k)*cw;s+='<rect x="'+(bx+1)+'" y="32" width="'+(cw-2)+'" height="20" rx="3" fill="'+(c.off+k<end?css('--acc2'):css('--bg'))+'" stroke="'+(cut?css('--bad'):css('--line'))+'"/>';
        s+=T(bx+cw/2,46,bytes[c.off+k].toString(16),{fs:cw<20?8:10,a:'middle',fill:css('--mute')})}});
    chars.concat([{off:NB}]).forEach(c=>{const x=4+c.off*cw;s+='<line x1="'+x+'" x2="'+x+'" y1="54" y2="62" stroke="'+css('--good')+'"/>';if(cw>=14||c.off%2===0||c.off===NB)s+=T(x,74,String(c.off),{fs:9.5,a:'middle',fill:css('--good')})});
    const ex=4+end*cw;s+='<line x1="'+ex+'" x2="'+ex+'" y1="0" y2="'+(h-12)+'" stroke="'+(inside?css('--bad'):css('--acc'))+'" stroke-width="2.5"/>'+T(Math.min(Math.max(ex,24),W-30),h-2,'end '+end,{fs:11,a:'middle',w:600,fill:inside?css('--bad'):css('--acc')});
    byEl.innerHTML=RD.svg(W,h,s,'The 20 bytes of the string, grouped by character, with the slice end at byte '+end);
    bv.textContent=end+' of '+NB;
    if(inside){const msg=end===4&&recorded?recorded:'end byte index '+end+' is not a char boundary; it is inside \''+inside.ch+'\' (bytes '+inside.off+'..'+(inside.off+inside.n)+' of string)';
      bo.innerHTML='<div class="ra-verdict bad">&amp;s[0..'+end+'] panics: '+esc(msg)+(end===4?'\n(the recorded panic)':'')+'</div>'}
    else{const t=new TextDecoder().decode(new Uint8Array(bytes.slice(0,end)));bo.innerHTML='<div class="ra-verdict">&amp;s[0..'+end+'] = '+esc(JSON.stringify(t))+'   ('+[...t].length+' characters)</div>'}}
  bs.addEventListener('input',slice);

  // ----- section 2: the same states, two ways -----
  const stEl=document.getElementById('ra-states'),stCap=document.getElementById('ra-states-cap');let stMode='py';
  const ST=[['idle',[]],['connecting',['a']],['connected',['s']],['failed',['e']]];
  const COMB=[[],['a'],['s'],['e'],['a','s'],['a','e'],['s','e'],['a','s','e']];
  function states(){const W=Math.max(300,Math.min(860,RD.width(stEl)));let s='',h;
    if(stMode==='py'){const lw=Math.min(96,W*0.24),cw=(W-lw-4)/8,rh=30;h=24+4*rh+4;
      COMB.forEach((c,j)=>s+=T(lw+j*cw+cw/2,15,c.length?c.join('·'):'none',{fs:10.5,a:'middle',fill:css('--mute')}));
      ST.forEach((r,i)=>{const y=22+i*rh;s+=T(lw-6,y+19,'"'+r[0]+'"',{fs:11,a:'end',fill:css('--ink')});
        COMB.forEach((c,j)=>{const ok=c.join()===r[1].join();const x=lw+j*cw;
          s+='<rect x="'+(x+2)+'" y="'+y+'" width="'+(cw-4)+'" height="'+(rh-4)+'" rx="4" fill="'+(ok?css('--open2'):css('--soft'))+'" stroke="'+(ok?css('--good'):css('--line'))+'"/>'+
            T(x+cw/2,y+18,ok?'✓':'×',{fs:13,a:'middle',w:600,fill:ok?css('--good'):css('--dim')})})});
      stCap.innerHTML='Rows: the status string; columns: which optional fields are set (a = <code>attempt</code>, s = <code>session_id</code>, e = <code>error</code>). All 32 cells can be constructed; only the 4 ticked ones are legal, and every method must check for the other 28. Python, illustrative: <code>class Conn: status: str; attempt: int | None; session_id: int | None; error: str | None</code>.'}
    else{const V=[['Idle',''],['Connecting','{ attempt: u32 }'],['Connected','{ session_id: u64 }'],['Failed','{ error: String }']];
      const cols=W>=560?4:2,cw=(W-4)/cols,rh=54;h=Math.ceil(4/cols)*rh+4;
      V.forEach((v,i)=>{const x=(i%cols)*cw,y=Math.floor(i/cols)*rh;
        s+='<rect x="'+(x+3)+'" y="'+(y+3)+'" width="'+(cw-6)+'" height="'+(rh-8)+'" rx="6" fill="'+css('--open2')+'" stroke="'+css('--good')+'"/>'+
          T(x+cw/2,y+22,'Conn::'+v[0],{fs:12.5,a:'middle',w:600,fill:css('--ink')})+T(x+cw/2,y+38,esc(v[1]||'(no data)'),{fs:11,a:'middle',fill:css('--mute')})});
      stCap.innerHTML='Four variants, each with exactly its own data. There is no fifth value to construct and no field to check: a <code>Connected</code> without a <code>session_id</code> does not exist, and <code>match</code> must handle all four.'}
    stEl.innerHTML=RD.svg(W,h,s,stMode==='py'?'32 combinations of status and optional fields, 4 legal':'four enum variants');}
  RD.seg(document.getElementById('ra-states-seg'),m=>{stMode=m;states()});

  // ----- section 3: the ? stepper over errors.rs -----
  const SRC=D.errors.src.split('\n'),OUTL=D.errors.out.split('\n');
  const L0=22,L1=43;
  const PR={bad:OUTL.find(l=>l.startsWith('error: context')),missing:OUTL.find(l=>l.startsWith('error: missing')),good:OUTL.find(l=>l.startsWith('ok:'))};
  const cut=t=>t.replace(/\s+\(debug:.*$/,'');
  const QS={
    bad:[[[39,40],'<code>main</code> calls <code>budget(&amp;bad)</code>; <code>bad</code> has <code>context = "8k"</code>.'],
      [[30],'<code>budget</code> calls <code>get_num(cfg, "context")</code>.'],
      [[23],'<code>cfg.get("context")</code> is <code>Some("8k")</code>; <code>ok_or</code> makes it <code>Ok("8k")</code>; <code>?</code> unwraps it, so <code>raw = "8k"</code>.'],
      [[24,25],'<code>"8k".parse::&lt;u32&gt;()</code> returns <code>Err(ParseIntError { kind: InvalidDigit })</code>.'],
      [[26],'<code>map_err</code> wraps it as <code>Err(BadNumber { key: "context", source })</code>. With no semicolon, that is <code>get_num</code>\'s return value.'],
      [[30],'Back in <code>budget</code>, <code>?</code> sees an <code>Err</code> and returns it from <code>budget</code> at once. Lines 31 and 32 never run: <code>max_output</code> is never read.'],
      [[42],'<code>main</code>\'s <code>match</code> takes the <code>Err</code> arm and prints <code>'+esc(cut(PR.bad||''))+'</code> (the message is <code>ConfigError</code>\'s <code>Display</code>).']],
    missing:[[[39,40],'<code>main</code> calls <code>budget(&amp;missing)</code>; <code>missing</code> has no <code>max_output</code>.'],
      [[30,23,24,25,26],'<code>get_num(cfg, "context")</code> finds <code>"8192"</code> and parses it: <code>Ok(8192)</code>, so <code>?</code> gives <code>ctx = 8192</code>.'],
      [[31],'<code>budget</code> calls <code>get_num(cfg, "max_output")</code>.'],
      [[23],'<code>cfg.get("max_output")</code> is <code>None</code>; <code>ok_or</code> turns it into <code>Err(Missing("max_output"))</code>; <code>?</code> returns it from <code>get_num</code> immediately. Lines 24 to 26 never run.'],
      [[31],'In <code>budget</code>, <code>?</code> returns the same <code>Err</code>; line 32 never runs.'],
      [[42],'<code>main</code> prints <code>'+esc(cut(PR.missing||''))+'</code>.']],
    good:[[[39,40],'<code>main</code> calls <code>budget(&amp;good)</code>.'],
      [[30,23,24,25,26],'<code>"8192"</code> parses: <code>ctx = 8192</code>.'],
      [[31,23,24,25,26],'<code>" 1024"</code> is trimmed, then parses: <code>out = 1024</code>.'],
      [[32],'Both <code>?</code> found <code>Ok</code>, so <code>budget</code> reaches its last line: <code>Ok(8192 - 1024)</code>.'],
      [[41],'<code>main</code> prints <code>'+esc(PR.good||'')+'</code>.']]};
  let qm='bad',qi=0;const qCode=document.getElementById('ra-q-code'),qCap=document.getElementById('ra-q-cap'),qPos=document.getElementById('ra-q-pos');
  function qdraw(){const st=QS[qm][qi],on=new Set(st[0]);let h='';
    for(let n=L0;n<=L1;n++)h+='<div class="ln'+(on.has(n)?' on':'')+'"><span class="no">'+n+'</span><span class="tx">'+RA.hl(SRC[n-1]||'')+'</span></div>';
    qCode.innerHTML=h;qCap.innerHTML='<b>Step '+(qi+1)+' of '+QS[qm].length+'.</b> '+st[1];qPos.textContent='';
    document.getElementById('ra-q-b').disabled=qi===0;document.getElementById('ra-q-f').disabled=qi===QS[qm].length-1}
  document.getElementById('ra-q-b').addEventListener('click',()=>{if(qi>0){qi--;qdraw()}});
  document.getElementById('ra-q-f').addEventListener('click',()=>{if(qi<QS[qm].length-1){qi++;qdraw()}});
  RD.seg(document.getElementById('ra-q-seg'),m=>{qm=m;qi=0;qdraw()});

  // ----- section 5: measured bars, log scale -----
  const bars=document.getElementById('ra-bench-bars');
  function parse(t,lang){return t.split('\n').map(l=>l.match(/^(.+?)\s+([0-9.]+) ns\/element/)).filter(Boolean).map(m=>({n:(lang==='py'?'Python: ':'Rust: ')+m[1].trim(),v:+m[2],s:m[2],lang}))}
  const rows=parse(D.bench.rs,'rs').concat(parse(D.bench.py,'py'));
  function drawBars(){const lo=Math.log10(0.1),hi=Math.log10(200);
    bars.innerHTML=rows.map(r=>{const w=Math.max(2,(Math.log10(r.v)-lo)/(hi-lo)*100);
      return '<div class="row"><span class="nm" title="'+esc(r.n)+'">'+esc(r.n)+'</span><span class="track"><span class="fill" style="width:'+w.toFixed(1)+'%;background:'+(r.lang==='py'?'var(--c5)':r.n.includes('dyn')?'var(--c2)':'var(--c1)')+'"></span></span><span class="val">'+r.s+' ns</span></div>'}).join('')+
      '<div class="small mute">nanoseconds per element, logarithmic scale; shorter is faster</div>'}

  // ----- prediction prompts: pick a candidate, then the recorded results open -----
  document.querySelectorAll('#t-read .ra-dq').forEach(q=>{q.addEventListener('click',e=>{const b=e.target.closest('button[data-pick]');if(!b||b.disabled)return;
    const ans=q.dataset.ans,p=b.dataset.pick;
    q.querySelectorAll('.ra-cand').forEach(c=>{const k=c.dataset.c;c.classList.toggle('pick',k===p);c.classList.toggle('ok',k===ans);
      const bt=c.querySelector('button[data-pick]');bt.disabled=true;bt.textContent=k===ans?'matches Python':'differs'});
    const d=q.querySelector('details.ra-drv');if(d)d.open=true;
    const h=q.querySelector('.ra-dqh');if(h&&!h.querySelector('.res')){const s=document.createElement('span');s.className='res';s.innerHTML=' <b>'+(p===ans?'Right.':'Not quite: '+ans.toUpperCase()+' is the one.')+'</b>';h.appendChild(s)}})});

  function all(){hero();slice();states();qdraw();drawBars()}
  all();RD.onRender(all);RD.onResize(()=>{hero();slice();states()});
})();
