// ---- Address translation engine shared by the Reading tab (section 2) and the Address translator tab ----
// A virtual address is cut into page-table indices and a page offset. Rules (Linux v5.10):
//   arm64: levels = (VA_BITS - 4) / (PAGE_SHIFT - 3) (arch/arm64/include/asm/pgtable-hwdef.h line 26), 8-byte entries,
//          user addresses below 2^VA_BITS go through TTBR0, addresses with all top bits set through TTBR1 (kernel).
//   x86-64: 4 levels, 48-bit canonical addresses (bits 63..47 equal), or 5 levels (LA57), 57-bit.
window.VMADDR=(function(){
  const A={
    'arm64-4k':{name:'arm64, 4 KiB pages, 48-bit (this VM)',va:48,ps:12,lv:['level 0','level 1','level 2','level 3'],x86:false,block:{1:'1 GiB',2:'2 MiB'}},
    'arm64-16k':{name:'arm64, 16 KiB pages, 48-bit (macOS-style granule)',va:48,ps:14,lv:['level 0','level 1','level 2','level 3'],x86:false,block:{2:'32 MiB'}},
    'arm64-64k':{name:'arm64, 64 KiB pages, 48-bit (some server distributions)',va:48,ps:16,lv:['level 1','level 2','level 3'],x86:false,block:{1:'512 MiB'}},
    'x86-4':{name:'x86-64, 4 levels, 48-bit',va:48,ps:12,lv:['PGD','PUD','PMD','PTE'],x86:true,block:{1:'1 GiB',2:'2 MiB'}},
    'x86-5':{name:'x86-64, 5 levels (LA57), 57-bit',va:57,ps:12,lv:['PGD','P4D','PUD','PMD','PTE'],x86:true,block:{2:'1 GiB',3:'2 MiB'}}};
  function geo(k){const a=A[k],b=a.ps-3,n=Math.floor((a.va-4)/b);const levels=a.x86?a.lv.length:n;
    const fields=[];let lo=a.ps;const per=[];
    for(let i=levels-1;i>=0;i--){const w=(i===0)?(a.va-a.ps-b*(levels-1)):b;per.unshift({w,lo});lo+=w}
    return {a,b,levels,per,entries:1<<b,pageBytes:2**a.ps}}
  function parse(hex){hex=String(hex).trim().toLowerCase().replace(/^0x/,'').replace(/[_\s]/g,'');if(!/^[0-9a-f]{1,16}$/.test(hex))return null;return BigInt('0x'+hex)}
  function decode(hex,k){const v=parse(hex);if(v===null)return {err:'Type a hexadecimal address of up to 16 digits, like ffff81fd2000.'};
    const g=geo(k),a=g.a,top=v>>BigInt(a.va),allOnes=(1n<<BigInt(64-a.va))-1n;let space,ok=true;
    if(a.x86){const t=v>>BigInt(a.va-1);if(t===0n)space='user half (canonical)';else if(t===(1n<<BigInt(65-a.va))-1n)space='kernel half (canonical)';else{space='non-canonical: the CPU faults before any walk';ok=false}}
    else{if(top===0n)space='user space, walked from TTBR0_EL1';else if(top===allOnes)space='kernel space, walked from TTBR1_EL1';else{space='outside both halves: a translation fault';ok=false}}
    const off=Number(v&((1n<<BigInt(a.ps))-1n));
    const idx=g.per.map((f,i)=>({name:a.lv[i],bits:f.w,hi:f.lo+f.w-1,lo:f.lo,val:Number((v>>BigInt(f.lo))&((1n<<BigInt(f.w))-1n)),span:2**(f.lo)}));
    return {v,g,space,ok,off,idx}}
  const human=b=>{const u=['B','KiB','MiB','GiB','TiB','PiB','EiB'];let i=0;while(b>=1024&&i<u.length-1){b/=1024;i++}return (b%1===0?b:b.toFixed(1))+' '+u[i]};
  const COL=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c6)'];
  // a bit-field strip: one box per level plus the offset, widths proportional to bits
  function splitHtml(r){const g=r.g,tot=g.a.va;
    const box=(lab,bits,val,c)=>'<div style="flex:'+bits+' 1 0;min-width:0;border:1px solid var(--line);border-top:4px solid '+c+';padding:3px 4px;font-size:11.5px;line-height:1.25;overflow:hidden"><b style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+lab+'</b><span class="mono">'+val+'</span><span class="mute" style="display:block">'+bits+' bits</span></div>';
    return '<div style="display:flex;gap:2px;margin:6px 0">'+r.idx.map((f,i)=>box(f.name,f.bits,f.val,COL[i%5])).join('')+box('offset',g.a.ps,'0x'+r.off.toString(16),'var(--c5)')+'</div>'+
      '<div class="small mute">Address 0x'+r.v.toString(16)+': '+r.space+'. '+tot+' bits translated: '+r.idx.map(f=>f.bits).join(' + ')+' index bits + '+g.a.ps+' offset bits. Each table has '+g.entries+' entries of 8 bytes = one '+human(g.pageBytes)+' page.</div>'}
  function splitSvg(el,hex,k){const r=decode(hex,k);el.innerHTML=r.err?'<p class="small">'+r.err+'</p>':splitHtml(r)}
  return {A,geo,decode,splitHtml,splitSvg,human,parse};
})();
