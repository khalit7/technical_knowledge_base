// ---- Address translator tab ----
(function(){
  const $=id=>document.getElementById(id);if(!$('ad-arch'))return;
  const D=window.VM_DATA,V=window.VMADDR,H=V.human;
  const fmt=(x,d)=>Number(x).toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  $('ad-arch').innerHTML=Object.keys(V.A).map(k=>'<option value="'+k+'">'+V.A[k].name+'</option>').join('');
  // the job's real addresses (start of each mapping) from the root's recording, plus two illustrative ones
  const pick=(re)=>{const l=D.root_maps.sample.find(s=>re.test(s));return l?l.split('-')[0]:null};
  const P=[['python3 code',pick(/python3\.11$/)],['[heap]',pick(/\[heap\]/)],['dataset train.bin',pick(/train\.bin/)],['libgfortran (torch)',pick(/libgfortran/)],['/dev/shm batch',pick(/torch_21_1305303101/)],['[stack]',pick(/\[stack\]/)],['a kernel address (illustrative)','ffff800010000000'],['above 2^47 (illustrative)','900000000000']].filter(p=>p[1]);
  $('ad-pre').innerHTML=P.map(p=>'<button data-a="'+p[1]+'">'+p[0]+'</button>').join('');
  $('ad-pre').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;$('ad-in').value=b.dataset.a;one()});
  function one(){const k=$('ad-arch').value,r=V.decode($('ad-in').value,k);
    if(r.err){$('ad-strip').innerHTML='<p class="small">'+r.err+'</p>';$('ad-tbl').innerHTML='';$('ad-note').textContent='';return}
    $('ad-strip').innerHTML=V.splitHtml(r);
    const blk=V.A[k].block;
    $('ad-tbl').innerHTML='<thead><tr><th>Level</th><th>Bits</th><th class="num">Index</th><th class="num">Entry offset in its table</th><th>One entry covers</th><th>Can map a block directly</th></tr></thead><tbody>'+
      r.idx.map((f,i)=>'<tr><td>'+f.name+'</td><td class="mono">'+f.hi+'..'+f.lo+'</td><td class="num">'+f.val+'</td><td class="num mono">0x'+(f.val*8).toString(16)+'</td><td>'+H(f.span)+'</td><td>'+(blk[i]?'yes: a '+blk[i]+' huge page':(i===r.idx.length-1?'(last level: a '+H(r.g.pageBytes)+' page)':'no'))+'</td></tr>').join('')+
      '<tr><td>offset</td><td class="mono">'+(r.g.a.ps-1)+'..0</td><td class="num">'+r.off+'</td><td class="num mono">0x'+r.off.toString(16)+'</td><td>1 byte</td><td></td></tr></tbody>';
    $('ad-note').textContent=r.ok?('The walk reads '+r.idx.length+' entries, one per level, then adds the '+r.g.a.ps+'-bit offset to the frame address in the last entry. A TLB hit skips all '+r.idx.length+'.'):'No walk happens: '+r.space+'.';}
  $('ad-arch').addEventListener('change',()=>{one();cost()});$('ad-in').addEventListener('input',one);
  // footprint -> tables per level, for one contiguous aligned region
  function tables(bytes,g,skipLast){
    // one table at level i covers 2^(lo+w) bytes; the root table always exists
    const n=g.per.map((f,i)=>i===0?1:Math.ceil(bytes/2**(f.lo+f.w)));
    if(skipLast)n[n.length-1]=0;return n}
  function cost(){const k=$('ad-arch').value,g=V.geo(k),mem=2**(+$('ad-mem').value/2)*1048576,np=+$('ad-np').value,te=2**(+$('ad-tlb').value);
    $('ad-memv').textContent=H(mem);$('ad-npv').textContent=np;$('ad-tlbv').textContent=fmt(te);
    const base=tables(mem,g,false),hp=tables(mem,g,true),bt=base.reduce((s,x)=>s+x,0)*g.pageBytes,ht=hp.reduce((s,x)=>s+x,0)*g.pageBytes;
    const blk=V.A[k].block,hk=Object.keys(blk).map(Number).pop();
    $('ad-out').innerHTML=RD.stat('Base pages to map it',fmt(Math.ceil(mem/g.pageBytes)),H(g.pageBytes)+' each')+
      RD.stat('Page tables per process',H(bt),'tables per level, root first: '+base.join(', '))+
      RD.stat('With hugetlbfs '+(hk!==undefined?blk[hk]:'')+' pages',H(ht),'no last-level tables; THP keeps them (deposited)')+
      RD.stat('Tables for all '+np+' processes',H(bt*np),'each process has its own tables, even for shared pages');
    const sizes=[[4096,'4 KiB'],[16384,'16 KiB'],[65536,'64 KiB'],[2097152,'2 MiB'],[1073741824,'1 GiB']];
    $('ad-reach').innerHTML='<thead><tr><th>Page size</th><th class="num">TLB reach with '+fmt(te)+' entries</th><th class="num">Share of '+H(mem)+' covered</th></tr></thead><tbody>'+sizes.map(s=>'<tr><td>'+s[1]+'</td><td class="num">'+H(te*s[0])+'</td><td class="num">'+fmt(Math.min(100,100*te*s[0]/mem),1)+'%</td></tr>').join('')+'</tbody>';
    const g4=V.geo('arm64-4k'),c=tables(1073741824,g4,false);
    $('ad-chk').textContent='Check against this VM: 1 GiB on arm64 with 4 KiB pages needs '+c.join(' + ')+' tables = '+fmt(c.reduce((s,x)=>s+x,0)*4)+' KiB by this formula; the measured VmPTE growth was '+fmt(D.pte['4k'])+' KiB (the top table and some upper tables already existed), so the last level, '+fmt(c[c.length-1]*4)+' KiB, is reproduced independently.';}
  ['ad-mem','ad-np','ad-tlb'].forEach(id=>$(id).addEventListener('input',cost));
  one();cost();
})();
