// ---- OS simulators, 2: address translation (linear and two-level), the TLB on an array walk, page replacement ----
(function(){
const SC=window.SIMCORE,A=window.SIMA,D=window.SIMDATA;if(!document.getElementById('sim-tr-card'))return;
const $=id=>document.getElementById(id);
const hex=(v,w)=>'0x'+v.toString(16).padStart(w||1,'0');
const bin=(v,n)=>v.toString(2).padStart(n,'0');
// ---------- 2a. translate ----------
// linear: 16 KiB address space, 1 KiB pages (16 PTEs), 32 physical frames; the table is the one in src/sim/make_ref.py (mulberry32, seed 99)
const rnd=SC.mulberry32(99),PT=[];for(let k=0;k<16;k++)PT.push(rnd()<0.6?((1<<31)|Math.floor(rnd()*32))>>>0:0);
const ML=D.ml,MEM=ML.pages.map(h=>{const a=[];for(let i=0;i<64;i+=2)a.push(parseInt(h.slice(i,i+2),16));return a});
const TR={mode:'lin',va:6245};
function picks(){const el=$('sim-tr-pick');let vs;
  if(TR.mode==='lin'){vs=[6245,3548,1000,9000,15000]}else vs=ML.answers.map(a=>a[0]);
  el.innerHTML=vs.map(v=>'<button data-m="'+v+'">'+hex(v,4)+'</button>').join('');
  const va=$('sim-tr-va');va.max=TR.mode==='lin'?16383:32767;if(TR.va>+va.max)TR.va=vs[0];va.value=TR.va}
A.seg($('sim-tr-pick'),m=>{TR.va=+m;$('sim-tr-va').value=TR.va;tan.go(0);tan.play()});
A.seg($('sim-tr-mode'),m=>{TR.mode=m;TR.va=m==='lin'?6245:ML.answers[0][0];picks();tan.reset(m==='lin'?4:5)});
$('sim-tr-va').addEventListener('input',e=>{TR.va=+e.target.value;tan.redraw()});
function bits(b,parts,W,y,step){// parts: [{n,label,col,on}]
  const tot=parts.reduce((s,p)=>s+p.n,0),bw=Math.min(22,(W-8)/tot);let x=4,o='';
  parts.forEach(p=>{const s=bin(p.v,p.n);for(let k=0;k<p.n;k++){o+=A.R(x+k*bw,y,bw-1.5,20,p.on?p.col:'var(--soft)',{st:'var(--line)'})+A.T(x+k*bw+bw/2-0.7,y+14,s[k],{a:'middle',fs:Math.min(12,bw*0.62),fill:p.on?'var(--bg)':'var(--ink)'})}
    o+=A.T(x+p.n*bw/2,y+34,p.label+' = '+p.v,{a:'middle',fs:10.5,fill:'var(--mute)'});x+=p.n*bw});return o}
function grid32(bytes,hl,W,y,title,sub){// 32 bytes as 8 x 4
  const cw=Math.min(40,(W-8)/8),ch=17;let o=A.T(4,y-17,title,{fs:11,w:600})+(sub?A.T(4,y-4,sub,{fs:10,fill:'var(--mute)'}):'');
  for(let k=0;k<32;k++){const x=4+(k%8)*cw,yy=y+Math.floor(k/8)*ch,on=k===hl;o+=A.R(x,yy,cw-2,ch-2,on?'var(--acc)':'var(--soft)',{st:'var(--line)'})+A.T(x+cw/2-1,yy+12,bytes[k].toString(16).padStart(2,'0'),{a:'middle',fs:Math.min(11,cw*0.33),fill:on?'var(--bg)':'var(--ink)'})}
  return o}
function trDraw(i){const el=$('sim-tr-svg'),W=Math.min(560,Math.max(290,A.width(el)));let o='',H=0,cap='',refs=0;
  if(TR.mode==='lin'){const r=SC.translateLinear(TR.va,1024,PT);
    o+=bits(0,[{n:4,v:r.vpn,label:'VPN',col:'var(--c1)',on:true},{n:10,v:r.off,label:'offset',col:'var(--c3)',on:i>=0}],W,4);
    // page table rows
    const rh=15,y0=58;o+=A.T(4,y0-6,'Page table (16 entries; PTE = valid bit | PFN)',{fs:11,w:600});
    for(let k=0;k<16;k++){const y=y0+k*rh,on=i>=1&&k===r.vpn,v=(PT[k]>>>31)&1;o+=A.R(4,y,W-8,rh-2,on?(v?'var(--open2)':'var(--hl)'):'var(--bg)',{st:'var(--line)'})+
      A.T(10,y+11,'VPN '+String(k).padStart(2,' '),{fs:10.5,fill:'var(--mute)'})+A.T(80,y+11,hex(PT[k],8),{fs:10.5})+A.T(170,y+11,v?'valid, PFN '+(PT[k]&0x7FFFFFFF):'invalid',{fs:10.5,fill:v?'var(--ink)':'var(--mute)'})}
    H=y0+16*rh+8;refs=i>=1?(r.valid&&i>=3?2:1):0;
    cap=['Split the 14-bit address: the top 4 bits are the virtual page number ('+r.vpn+'), the low 10 bits the offset inside the 1 KiB page ('+r.off+').',
      'Read page-table entry '+r.vpn+' from memory (one memory reference before the real one): '+hex(PT[r.vpn],8)+'.',
      r.valid?'Valid, frame '+r.pfn+': physical address = '+r.pfn+' × 1024 + '+r.off+' = '+r.pa+' ('+hex(r.pa,4)+').':'The valid bit is 0: the MMU raises a page fault and the kernel decides (load the page, or kill the process with a segmentation fault).',
      r.valid?'Now the access itself: 2 memory references for 1 load. A TLB hit would have skipped the first.':'No access happens; on Linux an access to an unmapped address ends in SIGSEGV.'][Math.min(i,3)];
    $('sim-tr-note').innerHTML='The page table is generated (seeded); it is the table the Python reference checks. A real x86-64 or arm64 table has four levels for a 48-bit address space.'}
  else{const r=SC.walkTwoLevel(TR.va,ML.pdbr,MEM);
    o+=bits(0,[{n:5,v:r.pdi,label:'directory',col:'var(--c4)',on:true},{n:5,v:r.pti,label:'table',col:'var(--c1)',on:true},{n:5,v:r.off,label:'offset',col:'var(--c3)',on:true}],W,4);
    let y=78;o+=grid32(MEM[ML.pdbr],i>=1?r.pdi:-1,W,y,'Page directory (page '+ML.pdbr+', the PDBR)',i>=1?'PDE '+hex(r.pde,2)+(r.pde_valid?' valid, PT in page '+r.pt_pfn:' invalid'):'');y+=4*17+38;
    if(i>=2&&r.pde_valid){o+=grid32(MEM[r.pt_pfn],r.pti,W,y,'Page table (page '+r.pt_pfn+')','PTE '+hex(r.pte,2)+(r.pte_valid?' valid, frame '+r.pfn:' invalid'));y+=4*17+38}
    if(i>=3&&r.pa!=null){o+=grid32(MEM[r.pfn],r.off,W,y,'Data page (frame '+r.pfn+')','byte '+r.off+' = '+hex(r.value,2));y+=4*17+8}
    H=y+4;const ans=ML.answers.find(a=>a[0]===TR.va);
    cap=['15-bit address, 32-byte pages: 5 bits pick the page-directory entry ('+r.pdi+'), 5 the page-table entry ('+r.pti+'), 5 the byte ('+r.off+').',
      'Read PDE '+r.pdi+' of the directory: '+hex(r.pde,2)+(r.pde_valid?' (valid; the page table is in page '+r.pt_pfn+').':' (invalid: fault; this whole 1 KiB region has no page table at all, which is the point of two levels).'),
      r.pde_valid?'Read PTE '+r.pti+' of that page table: '+hex(r.pte,2)+(r.pte_valid?' (valid, frame '+r.pfn+').':' (invalid: page fault).'):'Fault at the directory.',
      r.pa!=null?'Physical address = frame '+r.pfn+' × 32 + '+r.off+' = '+hex(r.pa,3)+'; the byte there is '+hex(r.value,2)+'.':'No physical address: the walk faulted.',
      r.pa!=null?'3 memory references for 1 load (directory, table, data): a TLB miss is dearer with more levels, which is why the TLB matters.':'The kernel handles the fault.'][Math.min(i,4)]+
      (ans&&i>=3?' <span class="mute">(OSTEP <code>paging-multilevel-translate.py -s 1 -c</code> answers '+(ans[1]==null?'a fault':hex(ans[1],3))+' for this address.)</span>':'');
    $('sim-tr-note').innerHTML='The memory is the 128 pages of 32 bytes printed by OSTEP\'s <code>paging-multilevel-translate.py -s 1</code>, so the five addresses above are that homework\'s questions. Any other address may fault.'}
  $('sim-tr-cap').innerHTML='<b>Step '+(i+1)+'.</b> '+cap;
  el.innerHTML=A.svg(W,H,o,'Address translation, step '+(i+1))}
picks();
const tan=A.anim({card:'sim-tr-card',ctl:'sim-tr-ctl',n:4,draw:trDraw,ms:1500,label:'Translation step'});
// ---------- 2b. TLB ----------
const TL={shape:'16x16',page:128,ent:4,ord:'row'};let tres=null,tother=null,taddr=[],rows=16,cols=16,base=0;
function tlbCompute(){if(TL.shape==='19'){rows=1;cols=10;base=100;$('sim-tlb-page').disabled=true}else{[rows,cols]=TL.shape.split('x').map(Number);base=0;$('sim-tlb-page').disabled=false}
  const page=TL.shape==='19'?16:TL.page,ent=TL.shape==='19'?16:TL.ent;
  const run=o=>{const a=SC.arrayTrace(rows,cols,o,base);return{a,r:SC.tlbTrace(a,page,ent),page}};
  const x=run(TL.ord),y=run(TL.ord==='row'?'col':'row');tres=x;tother=y;taddr=x.a;tl.reset(taddr.length,taddr.length-1)}
function tlbDraw(i){if(!tres)return;const el=$('sim-tlb-svg'),W=Math.min(420,Math.max(260,A.width(el))),cw=Math.min(26,(W-30)/cols),ch=Math.min(26,cw),page=tres.page;
  let o='';const seen={};for(let k=0;k<=i&&k<taddr.length;k++)seen[taddr[k]]=tres.r.seq[k];
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const ad=base+(r*cols+c)*4,pg=Math.floor(ad/page),x=24+c*cw,y=4+r*ch;
    o+=A.R(x,y,cw-1,ch-1,A.JOBCOL[pg%6],{op:0.22});
    if(ad in seen)o+='<circle cx="'+(x+cw/2-0.5)+'" cy="'+(y+ch/2-0.5)+'" r="'+Math.max(1.5,cw*0.2)+'" fill="'+(seen[ad]?'var(--good)':'var(--bad)')+'"/>';
    if(ad===taddr[i])o+=A.R(x-0.5,y-0.5,cw,ch,'none',{st:'var(--ink)',sw:2})}
  for(let r=0;r<rows;r+=Math.max(1,Math.ceil(rows/8)))o+=A.T(20,4+r*ch+ch*0.7,String(r),{a:'end',fs:9,fill:'var(--mute)'});
  el.innerHTML=A.svg(W,rows*ch+10,o,'Array cells coloured by page; dots mark hits (green) and misses (red)');
  const st=tres.r.states[i]||[];$('sim-tlb-tlb').innerHTML=st.map(v=>'<span class="sim-chip'+(v===Math.floor(taddr[i]/page)?(tres.r.seq[i]?' hit':' miss'):'')+'">page '+v+'</span>').join('')||'<span class="mute small">empty</span>';
  let h=0;for(let k=0;k<=i;k++)h+=tres.r.seq[k];
  const ad=taddr[i],idx=(ad-base)/4;
  $('sim-tlb-cap').innerHTML='Access '+(i+1)+' of '+taddr.length+': element ['+Math.floor(idx/cols)+']['+(idx%cols)+'] at address '+ad+', page '+Math.floor(ad/page)+': <b>'+(tres.r.seq[i]?'TLB hit':'TLB miss')+'</b>'+(tres.r.seq[i]?'':' (walk the page table, then cache the translation'+(st.length>=(TL.shape==='19'?16:TL.ent)&&i>0?', evicting the least recently used':'')+')')+'.';
  const pct=x=>(100*x.r.hits/x.a.length).toFixed(1)+'%';
  $('sim-tlb-stats').innerHTML='<div class="stat"><div class="k">Hits so far</div><div class="v">'+h+' / '+(i+1)+'</div><div class="d">'+TL.ord+' order</div></div>'+
    '<div class="stat"><div class="k">Hit rate, whole walk</div><div class="v">'+pct(tres)+'</div><div class="d">'+(TL.ord==='row'?'row by row':'column by column')+'</div></div>'+
    '<div class="stat"><div class="k">The other order</div><div class="v">'+pct(tother)+'</div><div class="d">'+(TL.ord==='row'?'column by column':'row by row')+'</div></div>'}
const tl=A.anim({card:'sim-tlb-card',ctl:'sim-tlb-ctl',n:256,draw:tlbDraw,ms:90,label:'Access'});
$('sim-tlb-shape').addEventListener('change',e=>{TL.shape=e.target.value;tlbCompute()});
$('sim-tlb-page').addEventListener('change',e=>{TL.page=+e.target.value;tlbCompute()});
$('sim-tlb-ent').addEventListener('change',e=>{TL.ent=+e.target.value;tlbCompute()});
A.seg($('sim-tlb-ord'),m=>{TL.ord=m;tlbCompute();tl.go(0);tl.play()});
tlbCompute();
// real TLB chart
(function(){const pts={'4k':[],huge:[]};D.raw.tlb.forEach(l=>{const m=l.match(/^(4k|huge) pages\s+(\d+) ns_per_access ([\d.]+)/);if(m)pts[m[1]].push([+m[2],+m[3]])});
  const w=D.raw.tlb.find(l=>/^walk/.test(l)).match(/row_major_ns ([\d.]+) col_major_ns ([\d.]+) ratio ([\d.]+)/);
  $('sim-tlb-walk').textContent=w[1]+' ns per element row by row, '+w[2]+' ns column by column ('+w[3]+'× slower)';
  $('sim-tlb-raw').textContent=D.raw.tlb.join('\n');
  function draw(){const el=$('sim-tlb-real'),W=Math.max(290,Math.min(720,A.width(el))),H=210,x0=40,pw=W-x0-24,ph=H-50;
    const lx=v=>x0+Math.log2(v)/14*pw,ly=v=>10+ph-v/12*ph;let o='';
    for(let v=0;v<=12;v+=3)o+='<line x1="'+x0+'" x2="'+(x0+pw)+'" y1="'+ly(v)+'" y2="'+ly(v)+'" stroke="var(--line)"/>'+A.T(x0-4,ly(v)+3,String(v),{a:'end',fs:10,fill:'var(--mute)'});
    for(let k=0;k<=14;k+=(W<450?4:2))o+=A.T(lx(1<<k),H-26,String(1<<k),{a:'middle',fs:10,fill:'var(--mute)'});
    o+=A.T(x0+pw/2,H-10,'pages touched (log scale)',{a:'middle',fs:10.5,fill:'var(--mute)'})+A.T(4,10,'ns',{fs:10,fill:'var(--mute)'});
    [['4k','var(--c2)','4 KiB pages'],['huge','var(--c1)','2 MiB huge pages']].forEach(([k,c,n],j)=>{o+='<path d="'+pts[k].map((p,q)=>(q?'L':'M')+lx(p[0]).toFixed(1)+' '+ly(p[1]).toFixed(1)).join('')+'" fill="none" stroke="'+c+'" stroke-width="2"/>'+
      pts[k].map(p=>'<circle cx="'+lx(p[0]).toFixed(1)+'" cy="'+ly(p[1]).toFixed(1)+'" r="2.5" fill="'+c+'"/>').join('')+A.R(x0+8,14+j*15,10,10,c)+A.T(x0+22,23+j*15,n,{fs:10.5})});
    el.innerHTML=A.svg(W,H,o,'Nanoseconds per access against pages touched, 4 KiB against huge pages')}
  draw();A.onResize(draw);A.onRender(draw)})();
// ---------- 2c. replacement ----------
const RP={refs:'ostep',fr:3,pol:'FIFO'};
const REFS={ostep:[0,1,2,0,1,3,0,3,1,2,1],belady:[1,2,3,4,1,2,5,1,2,3,4,5],loop:[0,1,2,3,4,0,1,2,3,4,0,1,2,3,4],rand:SC.randRefs(4,20,7)};
let rres=null;
function rpCompute(){rres=SC.replace(REFS[RP.refs],RP.fr,RP.pol);rp.reset(REFS[RP.refs].length,REFS[RP.refs].length-1);rpAll()}
function rpDraw(i){if(!rres)return;const refs=REFS[RP.refs],n=refs.length,el=$('sim-rp-svg'),W=Math.max(280,Math.min(760,A.width(el))),x0=46,cw=Math.min(34,(W-x0-4)/n),rh=18;let o='';
  o+=A.T(x0-6,13,'access',{a:'end',fs:10,fill:'var(--mute)'});for(let f=0;f<RP.fr;f++)o+=A.T(x0-6,18+(f+1)*rh,'frame '+(f+1),{a:'end',fs:10,fill:'var(--mute)'});
  o+=A.T(x0-6,18+(RP.fr+1)*rh+12,'result',{a:'end',fs:10,fill:'var(--mute)'});
  for(let k=0;k<n;k++){const x=x0+k*cw,on=k<=i,s=rres.seq[k];o+=A.T(x+cw/2,13,String(refs[k]),{a:'middle',fs:11,w:k===i?700:400,fill:on?'var(--ink)':'var(--mute)'});
    if(!on)continue;
    for(let f=0;f<RP.fr;f++){const y=18+f*rh+4,v=s.mem[f];const isNew=!s.hit&&v===refs[k];
      o+=A.R(x+1,y,cw-2,rh-2,isNew?'var(--hl)':(s.hit&&v===refs[k]?'var(--open2)':'var(--soft)'),{st:k===i?'var(--ink)':'var(--line)'});if(v!=null)o+=A.T(x+cw/2,y+12,String(v),{a:'middle',fs:10.5})}
    o+=A.T(x+cw/2,18+(RP.fr+1)*rh+12,s.hit?'hit':'miss',{a:'middle',fs:Math.min(10,cw*0.38),fill:s.hit?'var(--good)':'var(--bad)'})}
  el.innerHTML=A.svg(W,18+(RP.fr+1)*rh+22,o,'Frames after each access');
  const s=rres.seq[i];let h=0;for(let k=0;k<=i;k++)h+=rres.seq[k].hit?1:0;
  $('sim-rp-cap').innerHTML='Access '+(i+1)+': page '+refs[i]+' is '+(s.hit?'<b>in memory (hit)</b>':'<b>not in memory (page fault)</b>'+(s.evict!=null?'; '+RP.pol+' evicts page '+s.evict:'; a frame is still free'))+'. Hits so far: '+h+' of '+(i+1)+'.'+(RP.pol==='OPT'&&s.evict!=null?' <span class="mute">(OPT looked ahead: page '+s.evict+' is used furthest in the future, or never.)</span>':'')}
function rpAll(){const refs=REFS[RP.refs];let h='<div class="bars">';['OPT','FIFO','LRU','CLOCK'].forEach(p=>{const r=SC.replace(refs,RP.fr,p);h+='<div class="row'+(p===RP.pol?' hl':'')+'"><span class="nm">'+p+'</span><span class="track"><span class="fill" style="width:'+(100*r.hits/refs.length)+'%;background:var(--c3)"></span></span><span class="val">'+r.hits+' / '+refs.length+'</span></div>'});
  h+='</div><div class="tw"><table class="sim-t"><tr><th>Page faults with</th>'+[1,2,3,4,5,6].map(f=>'<th class="num">'+f+' fr.</th>').join('')+'</tr>'+['FIFO','LRU','OPT','CLOCK'].map(p=>'<tr><td>'+p+'</td>'+[1,2,3,4,5,6].map(f=>{const m=SC.replace(refs,f,p).misses,prev=f>1?SC.replace(refs,f-1,p).misses:Infinity;return'<td class="num"'+(m>prev?' style="color:var(--bad);font-weight:600" title="more frames, more faults"':'')+'>'+m+'</td>'}).join('')+'</tr>').join('')+'</table></div><p class="sim-note">Hits with '+RP.fr+' frames (bars); faults for every frame count (table; red = more faults than with one frame fewer). The loop over 5 pages is LRU\'s worst case: with fewer than 5 frames it evicts exactly the page needed next.</p>';
  $('sim-rp-all').innerHTML=h}
const rp=A.anim({card:'sim-rp-card',ctl:'sim-rp-ctl',n:11,draw:rpDraw,ms:800,label:'Access'});
$('sim-rp-refs').addEventListener('change',e=>{RP.refs=e.target.value;rpCompute()});
$('sim-rp-fr').addEventListener('input',e=>{RP.fr=+e.target.value;$('sim-rp-frv').textContent=RP.fr;rpCompute()});
A.seg($('sim-rp-pol'),m=>{RP.pol=m;rpCompute();rp.go(0);rp.play()});
rpCompute();
A.onResize(()=>{tan.redraw();tl.redraw();rp.redraw()});
})();
