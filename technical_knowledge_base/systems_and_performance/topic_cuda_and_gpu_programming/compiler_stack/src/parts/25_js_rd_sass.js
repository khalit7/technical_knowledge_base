// ---- Reading: one SASS line taken apart; opcode families; scoreboard check; live registers ----
(function(){
  const D=window.CSD,E=RD.esc,R=D.sass['softmax.sm_90a'];
  // row: [off,pred,op,args,stall,yield,wbar,rbar,wait,reuse,live,hi]
  const picks=[];const want=['LDG.E','SHFL.BFLY','FMNMX','LDS','BAR.SYNC','MUFU.EX2','STG.E','S2R'];
  want.forEach(w=>{const r=R.find(x=>x[2]===w&&(w!=='LDS'||x[1]));if(r)picks.push(r)});
  const sel=document.getElementById('cs-anatPick');
  sel.innerHTML=picks.map((r,i)=>'<option value="'+i+'">'+E((r[1]?r[1]+' ':'')+r[2]+' '+r[3])+'</option>').join('');
  const ctlTxt=r=>'stall '+r[4]+', yield '+r[5]+', write SB '+(r[6]===7?'none':r[6])+', read SB '+(r[7]===7?'none':r[7])+', waits on '+(r[8]?[0,1,2,3,4,5].filter(b=>r[8]>>b&1).map(b=>'SB'+b).join('+'):'nothing')+', reuse '+r[9].toString(2).padStart(4,'0');
  function anat(i){const r=picks[i];const base=r[2].split('.')[0];const mods=r[2].split('.').slice(1);
    const ops=r[3].split(/,\s*(?![^\[]*\])/);
    const parts=[['/*'+r[0].toString(16).padStart(4,'0')+'*/','Byte offset of the instruction in the kernel; each instruction is 16 bytes, so the next is at +0x10.']];
    if(r[1])parts.push([r[1],'Predicate guard: the instruction runs only in threads where '+(r[1].includes('!')?'this predicate is false':'this predicate is true')+'.']);
    parts.push([base,'Opcode. NVIDIA’s table: “'+(D.opdesc[base]||'not listed')+'”.']);
    mods.forEach(m=>parts.push(['.'+m,'Modifier on '+base+'. '+({E:'Extended (64-bit) addressing.',BFLY:'Butterfly pattern: lane i exchanges with lane i XOR offset.',SYNC:'Synchronising variant.',EX2:'Base-2 exponential on the special function unit.',DEFER_BLOCKING:'The default barrier behaviour.',U32:'Unsigned 32-bit.',WIDE:'64-bit result.'}[m]||'See NVIDIA’s table and the PTX it came from.')]));
    ops.forEach((o,k)=>parts.push([o+(k<ops.length-1?',':''),k===0&&!/^(ST|BAR|BRA)/.test(r[2])?'Destination operand.':'Source operand.']));
    parts.push(['control: '+ctlTxt(r),'The scheduling bits from the second 64-bit half of the encoding (0x'+r[11]+'), decoded with Jia et al.’s layout.']);
    const el=document.getElementById('cs-anat');
    el.innerHTML=parts.map((p,k)=>'<span data-k="'+k+'">'+E(p[0])+'</span>').join('');
    el.onclick=e=>{const s=e.target.closest('span[data-k]');if(!s)return;el.querySelectorAll('span').forEach(x=>x.classList.toggle('on',x===s));document.getElementById('cs-anatCap').innerHTML='<p>'+E(parts[+s.dataset.k][1])+'</p>'};
    el.querySelector('span[data-k="'+(r[1]?2:1)+'"]').click();}
  sel.addEventListener('change',()=>anat(+sel.value));anat(0);
  // the 21 control bits, as a header strip: reuse 4, wait 6, read 3, write 3, yield 1, stall 4 (+2 zero bits on top)
  const fl=[['0',2,'','zero'],['reuse',4,'f0','reuse flags'],['wait',6,'f1','wait mask'],['RB',3,'f2','read barrier'],['WB',3,'f3','write barrier'],['Y',1,'f4','yield'],['stall',4,'f5','stall cycles']];
  document.getElementById('cs-bitsHead').innerHTML=fl.map(f=>'<span class="'+f[2]+'" style="grid-column:span '+f[1]+'" title="'+f[3]+'">'+f[0]+'</span>').join('');
  // families
  const fam=[['Memory',/^(LDG|STG|LDS|STS|LDL|STL|LDC|ULDC|LDGSTS|LDSM|UTMALDG|UTMASTG|ATOM|RED)/],['Floating point',/^(FADD|FMUL|FFMA|FMNMX|FSETP|FSEL|MUFU|F2F|HADD2|HFMA2|HMUL2)/],['Tensor core',/^(HMMA|HGMMA|IMMA|QMMA|UTC)/],['Integer, address',/^(IADD3|IMAD|LEA|SHF|LOP3|ISETP|VIADD|IABS|I2F|F2I|SEL|MOV|UMOV|UIADD3|UIMAD|USHF|ULOP3|ULEA|UISETP|PRMT|SGXT|POPC|FLO|IMNMX|VIMNMX)/],['Warp, sync',/^(SHFL|BAR|WARPSYNC|VOTE|MEMBAR|DEPBAR|WARPGROUP|SYNCS|ELECT|R2UR|S2R|S2UR|CS2R)/],['Control flow',/^(BRA|EXIT|BSSY|BSYNC|CALL|RET|NOP|BPT)/]];
  const cnt={};fam.forEach(f=>cnt[f[0]]={});
  Object.values(D.sass).forEach(rows=>rows.forEach(r=>{const b=r[2].split('.')[0];const f=fam.find(x=>x[1].test(b));if(!f)return;cnt[f[0]][b]=(cnt[f[0]][b]||0)+1}));
  document.getElementById('cs-fam').innerHTML='<div class="tw"><table class="tbl-sm"><tr><th>Family</th><th>Opcodes seen (count)</th></tr>'+fam.map(f=>{const o=Object.entries(cnt[f[0]]).sort((a,b)=>b[1]-a[1]);
    return '<tr><td>'+f[0]+'</td><td>'+(o.length?o.map(x=>'<span title="'+E(D.opdesc[x[0]]||'')+'"><code>'+x[0]+'</code> '+x[1]+'</span>').join(', '):'<span class="mute">none in these kernels</span>')+'</td></tr>'}).join('')+'</table></div><p class="small mute">Hover an opcode for NVIDIA’s one-line meaning. Padding <code>NOP</code>s at the end of each kernel are included in Control flow.</p>';
  // scoreboard check
  const ck=D.sass_check,keys=Object.keys(ck);let n=0,v=0,p=0,t=0;keys.forEach(k=>{n+=ck[k][0];v+=ck[k][1];p+=ck[k][2];t+=ck[k][3]});
  document.getElementById('cs-sbOk').textContent=v+' violations in '+n.toLocaleString('en-US')+' instructions, and '+p+' of '+t+' first readers of a scoreboarded result wait on its scoreboard';
  document.getElementById('cs-sbNeg').textContent=Object.values(D.sass_neg).map(x=>x.toLocaleString('en-US')).join(', ');
  // live registers
  function live(){const el=document.getElementById('cs-liveChart'),W=RD.width(el),H=150,pl=34,pb=22;
    const xs=R.map(r=>r[10]||0),mx=Math.max(...xs),N=R.length;const X=i=>pl+(W-pl-8)*i/(N-1),Y=v=>H-pb-(H-pb-10)*v/20;
    let s='';[0,5,10,15,20].forEach(v=>{s+='<line x1="'+pl+'" x2="'+(W-8)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(pl-5,Y(v)+4,v,{a:'end',fill:'var(--mute)'})});
    s+='<line x1="'+pl+'" x2="'+(W-8)+'" y1="'+Y(18)+'" y2="'+Y(18)+'" stroke="var(--bad)" stroke-dasharray="4 3"/>'+RD.t(W-10,Y(18)-4,'18 allocated (ptxas)',{a:'end',fill:'var(--bad)'});
    s+='<polyline fill="none" stroke="var(--acc)" stroke-width="1.6" points="'+xs.map((v,i)=>X(i).toFixed(1)+','+Y(v).toFixed(1)).join(' ')+'"/>';
    s+=RD.t(pl,H-5,'instruction 0',{fill:'var(--mute)'})+RD.t(W-8,H-5,'instruction '+(N-1),{a:'end',fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'Live registers per instruction');
    document.getElementById('cs-liveTxt').innerHTML='At most <b>'+mx+'</b> registers hold a live value at once, yet ptxas reports 18 (sm_80 '+D.sass_regs.sm_80+', sm_100a '+D.sass_regs.sm_100a+', sm_120 '+D.sass_regs.sm_120+'): the count is the highest register number used plus one, and the live-range table’s columns run from R0 to R17. Allocation, not liveness, sets occupancy; for a kernel this small it does not matter, but on a kernel near a register cliff the gap between the two is what a different schedule or <code>__launch_bounds__</code> can win back.';}
  live();RD.onRender(live);RD.onResize(live);
})();
