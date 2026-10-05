// ---- Section 4: one access followed through the arm64 fault path of Linux v5.10, per case ----
(function(){
  const D=window.VM_DATA,$=id=>document.getElementById(id);if(!$('vm-flt-card'))return;
  const fmt=(x,d)=>Number(x).toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  const GH='https://github.com/torvalds/linux/blob/v5.10/';
  const L=(f,l,t)=>'<a href="'+GH+f+'#L'+l+'" target="_blank" rel="noopener noreferrer">'+(t||f+' line '+l)+'</a>';
  const F=D.first_write,Z=D.zero_page,RF=D.root_faults;
  const warm=RF.warm.slice().sort((a,b)=>a.ms-b.ms)[1],cold=RF.cold.slice().sort((a,b)=>a.ms-b.ms)[1];
  const sw=D.root_swap.filter(x=>x.majflt>0),swUs=sw.reduce((s,x)=>s+x.s*1e6/x.majflt,0)/sw.length;
  // per case: the PTE before, what the handler does, the frame after, measured cost
  const C={
    anon_w:{lab:'First write, fresh memory',acc:'store',vma:'anonymous, private, rw-',pte0:'none (never touched)',
      h:'do_anonymous_page ('+L('mm/memory.c',3469,'mm/memory.c line 3469')+'): take a free frame, zero it, map it writable.',fr:'a new zeroed 4 KiB frame',
      us:F['4k'].ms_median*1000/F['4k'].faults,minor:1,major:0,rss:4,src:'64 MiB first touched: '+fmt(F['4k'].faults)+' faults in '+fmt(F['4k'].ms_median,1)+' ms (median of 3)'},
    anon_r:{lab:'First read, fresh memory',acc:'load',vma:'anonymous, private, rw-',pte0:'none (never touched)',
      h:'do_anonymous_page sees a read: map the one shared zero page, read-only ('+L('mm/memory.c',3496,'lines 3496 to 3500')+'). No frame is used.',fr:'the shared zero page',
      us:Z.read_ms*1000/Z.read_faults,minor:1,major:0,rss:0,src:'64 MiB read: '+fmt(Z.read_faults)+' faults in '+fmt(Z.read_ms,1)+' ms, RSS +0'},
    file_w:{lab:'Read a cached file page',acc:'load',vma:'file train.bin, shared, r--',pte0:'none',
      h:'do_fault, do_read_fault ('+L('mm/memory.c',3990,'line 3990')+'): the page is in the page cache, so do_fault_around maps it and up to 15 cached neighbours (64 KiB, '+L('mm/memory.c',3875,'line 3875')+').',fr:'the page-cache page itself, plus neighbours',
      us:warm.ms*1000/warm.minor,minor:1,major:0,rss:64,src:'root, dataset warm: 2,056 pages in '+warm.minor+' faults, '+fmt(warm.ms,2)+' ms'},
    file_c:{lab:'Read an uncached file page',acc:'load',vma:'file train.bin, shared, r--',pte0:'none',
      h:'filemap_fault: page not cached, start readahead I/O, sleep until the device returns it ('+L('mm/filemap.c',2738,'mm/filemap.c line 2738')+' counts the major fault).',fr:'a page-cache page just read from disk',
      us:cold.ms*1000/(cold.minor+cold.major),minor:0,major:1,rss:64,src:'root, dataset cold: '+cold.major+' major + '+cold.minor+' minor faults, '+fmt(cold.ms,1)+' ms (average over both kinds)'},
    cow:{lab:'Write after fork',acc:'store',vma:'anonymous, private, rw-',pte0:'present, read-only (fork write-protected it)',
      h:'handle_pte_fault: write to a read-only entry, do_wp_page; the frame is shared, so wp_page_copy ('+L('mm/memory.c',2817,'line 2817')+') copies 4 KiB.',fr:'a private copy of the page',
      us:D.cow_write['4k'].ns_per_page/1000,minor:1,major:0,rss:4,src:'child writes 256 MiB: '+fmt(D.cow_write['4k'].faults)+' faults, '+fmt(D.cow_write['4k'].ms,0)+' ms'},
    swap:{lab:'Page that was swapped out',acc:'load',vma:'anonymous, private, rw-',pte0:'not present: holds a swap slot',
      h:'handle_pte_fault: not present, do_swap_page ('+L('mm/memory.c',4377,'line 4377')+'): read the slot (and 7 neighbours) from swap, map the frame.',fr:'a frame read back from swap',
      us:swUs,minor:0,major:1,rss:4,src:'root Debug lab, 700 MiB in a 512 MiB container: '+sw.map(x=>fmt(x.majflt)+' major in '+x.s+' s').join('; ')+' (includes evicting other pages)'},
    segv:{lab:'Address with no mapping',acc:'load',vma:'none',pte0:'none',
      h:'find_vma finds no mapping: the kernel sends SIGSEGV; Python dies with "Segmentation fault".',fr:'none',us:0,minor:0,major:0,rss:0,src:'no cost: the process is killed'}};
  const ORDER=['anon_w','anon_r','file_w','file_c','cow','swap','segv'];
  const STEPS=[['TLB lookup','The CPU issues the {acc}. The TLB has no translation for this page.'],
    ['Hardware walk','The MMU walks the tables from TTBR0_EL1. The last entry is {pte0}: the walk stops with a fault.'],
    ['Exception','The CPU enters the kernel (a data abort). The fault-status code says translation fault (no entry) or permission fault (read-only entry): '+L('arch/arm64/mm/fault.c',599,'do_translation_fault')+' or '+L('arch/arm64/mm/fault.c',451,'do_page_fault')+'.'],
    ['Find the VMA','__do_page_fault ('+L('arch/arm64/mm/fault.c',408,'line 408')+') looks the address up among the mappings. VMA: {vma}.'],
    ['handle_mm_fault','Allocate any missing upper tables, then handle_pte_fault ('+L('mm/memory.c',4330,'mm/memory.c line 4330')+') chooses the handler from the entry and the VMA.'],
    ['Handler','{h}'],
    ['Return and retry','The entry now points at {fr}. The CPU re-executes the {acc}, the walk succeeds and the TLB caches it; the next access to this page costs nothing extra.']];
  let cur='anon_w';
  $('vm-flt-mode').innerHTML=ORDER.map(k=>'<button data-m="'+k+'"'+(k===cur?' class="on"':'')+'>'+C[k].lab+'</button>').join('');
  const fill=(s,c)=>s.replace(/\{(\w+)\}/g,(m,k)=>c[k]);
  function draw(i){const c=C[cur];const last=cur==='segv'?3:STEPS.length-1;const j=Math.min(i,last);
    $('vm-flt-svg').innerHTML='<div class="stage">'+STEPS.map((s,k)=>'<span class="'+(k===j?'on':(k<j?'done':''))+'"'+(cur==='segv'&&k>3?' style="opacity:.35"':'')+'>'+(k+1)+'. '+s[0]+'</span>').join('')+'</div>'+
      '<div class="panes"><div class="sp"><div class="n">Virtual page</div><p>'+c.vma+'</p></div><div class="sp"><div class="n">Page-table entry</div><p>'+(j>=last&&cur!=='segv'?'valid: '+c.fr:c.pte0)+'</p></div><div class="sp"><div class="n">Physical memory</div><p>'+(j>=5&&cur!=='segv'?c.fr:(cur==='segv'&&j>=3?'process killed':'(not yet)'))+'</p></div></div>';
    const st=(cur==='segv'&&i>=3)?['SIGSEGV',C.segv.h]:STEPS[j];
    $('vm-flt-cap').innerHTML='<div class="t">Step '+(j+1)+' of '+(last+1)+': '+st[0]+'</div><p>'+fill(st[1],c)+'</p>';
    const done=j>=last;
    $('vm-flt-cnt').innerHTML=RD.stat('Minor faults',done?c.minor:0,'')+RD.stat('Major faults',done?c.major:0,'')+RD.stat('RSS added',done?c.rss+' KiB':'0 KiB',cur==='file_w'||cur==='file_c'?'fault-around maps 16 pages':'')+RD.stat('Measured cost',c.us?fmt(c.us,c.us<10?2:0)+' us per fault':'n/a',c.src);}
  const an=RD.anim({card:'vm-flt-card',ctl:'vm-flt-ctl',n:STEPS.length,draw,ms:1700,label:'Fault step'});
  RD.seg($('vm-flt-mode'),m=>{cur=m;an.reset(m==='segv'?4:STEPS.length);an.play()});
})();
