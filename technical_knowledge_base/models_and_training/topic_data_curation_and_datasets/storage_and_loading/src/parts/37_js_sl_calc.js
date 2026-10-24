// ---- Throughput calculator ----
(function(){
  const U=SLU,$=U.$;if(!$('sl-c-card'))return;
  const GP=[1,2,4,8,16,32,64,128,256,512,1024,2048,4096,8192,16384,32768],BT=[0.25,0.5,1,2,4,8,16,32,64].map(x=>x*1048576);
  const tokRate=SL.tok.rough_single_thread_tokens_per_s,memRate=SL.loader.nanogpt_get_batch_tok_s,zbpt=SL.xcheck.ours_zst_bpt;
  const PRE=[{nm:'Llama 3 405B (published setup)',N:405e9,G:16384,F:400,D:15.6e12,B:16*1048576,fmt:'4',src:'Llama 3: 405B parameters, 15.6T tokens, 16,384 H100s at 400 TFLOP/s each (Table 4), 16M tokens per batch, 128K vocabulary'},
    {nm:'70B on 2,048 H100s',N:70e9,G:2048,F:0.4*989.5,D:15e12,B:16*1048576,fmt:'4',src:'the design question in section 13, 40% of H100 peak (illustrative)'},
    {nm:'1B on 8 H100s',N:1e9,G:8,F:0.4*989.5,D:100e9,B:1048576,fmt:'2',src:'a small proxy model at 40% of peak (illustrative)'},
    {nm:'1B, tokenizing online',N:1e9,G:8,F:0.4*989.5,D:100e9,B:1048576,fmt:'z',src:'the same, reading zstd JSONL and tokenizing in the loader (illustrative)'}];
  const st={};
  const fmtN=n=>n>=1e12?(n/1e12).toFixed(n<1e13?2:1)+'T':n>=1e9?(n/1e9).toFixed(n<1e10?2:0)+'B':(n/1e6).toFixed(0)+'M';
  const bytes=b=>b>=1e12?(b/1e12).toFixed(2)+' TB':b>=1e9?(b/1e9).toFixed(1)+' GB':b>=1e6?(b/1e6).toFixed(1)+' MB':b>=1e3?(b/1e3).toFixed(1)+' KB':b.toFixed(0)+' B';
  function setSliders(){$('sl-c-n').value=Math.round((Math.log10(st.N)-7)/0.08);$('sl-c-g').value=GP.indexOf(st.G)<0?3:GP.indexOf(st.G);$('sl-c-f').value=Math.round(st.F/5)*5;
    $('sl-c-d').value=Math.round((Math.log10(st.D)-9)*10);$('sl-c-b').value=Math.max(0,BT.indexOf(st.B));$('sl-c-fmt').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m===st.fmt))}
  function read(){st.N=Math.pow(10,7+(+$('sl-c-n').value)*0.08);st.G=GP[+$('sl-c-g').value];st.F=+$('sl-c-f').value;st.D=Math.pow(10,9+(+$('sl-c-d').value)/10);st.B=BT[+$('sl-c-b').value];st.pre=null;calc()}
  function calc(){const tps=st.G*st.F*1e12/(6*st.N),bpt=st.fmt==='z'?zbpt:+st.fmt,Bps=tps*bpt;
    $('sl-c-nv').textContent=fmtN(st.N);$('sl-c-gv').textContent=U.f0(st.G);$('sl-c-fv').textContent=U.f0(st.F);$('sl-c-dv').textContent=fmtN(st.D);$('sl-c-bv').textContent=(st.B/1048576)+'M';
    $('sl-c-mfu').innerHTML='That is '+U.pc(st.F/989.5,0)+' of an H100\'s dense BF16 peak, or '+U.pc(st.F/312,0)+' of an A100\'s'+(st.F>312?' (above an A100\'s peak: not possible on A100s)':'')+'.';
    const days=st.D/tps/86400,cores=st.fmt==='z'?tps/tokRate:0;
    $('sl-c-out').innerHTML=RD.stat('Tokens per second, whole job',(tps>=1e6?(tps/1e6).toFixed(2)+' million':U.f0(tps)),U.f0(tps/st.G)+' per GPU')+RD.stat('Loader bytes per second',bytes(Bps)+'/s',bytes(Bps/st.G)+'/s per GPU')+
      RD.stat('Step time',(st.B/tps).toFixed(st.B/tps<10?2:0)+' s',U.f0(st.B)+' tokens per batch')+RD.stat('Days to train',days<1?(days*24).toFixed(1)+' hours':days.toFixed(1),'at full speed, no restarts')+
      RD.stat('Stored training data',bytes(st.D*bpt),st.fmt==='z'?'compressed documents':'token files')+RD.stat('Training FLOPs, 6ND',(6*st.N*st.D).toExponential(2),'')+
      RD.stat('CPU for online tokenizing',st.fmt==='z'?U.f0(Math.ceil(cores))+' cores':'none','at '+(tokRate/1e6).toFixed(2)+'M tokens per core-second, rough');
    // log bar chart
    const el=$('sl-c-plot'),W=RD.width(el),rows=[['This job needs',Bps,'var(--acc)','This job'],['One loader process, mmap token file (rough)',memRate*(st.fmt==='z'?4:bpt),'var(--c3)','1 loader (rough)'],['Llama 3 storage, sustained (published)',2e12,'var(--c4)','Llama 3 storage']];
    if(st.fmt==='z')rows.splice(1,0,['One CPU thread tokenizing (rough)',tokRate*zbpt,'var(--c2)','1 tokenizer thread']);
    const lo=3,hi=13,lab=W<600?110:Math.min(330,W*0.42),x=v=>lab+(Math.log10(Math.max(v,1e3))-lo)/(hi-lo)*(W-lab-60);let body='';
    rows.forEach((r,i)=>{const y=i*30+8;body+=RD.t(lab-6,y+14,U.esc(W<600?r[3]:r[0]),{fs:11,a:'end'})+'<rect x="'+lab+'" y="'+y+'" width="'+Math.max(2,x(r[1])-lab).toFixed(1)+'" height="18" fill="'+r[2]+'"/>'+RD.t(x(r[1])+4,y+14,bytes(r[1])+'/s',{fs:11})});
    el.innerHTML=RD.svg(W,rows.length*30+10,body,'Bytes per second');
    let res='';if(st.pre===0){const f=6*st.N*st.D;res='Check against Llama 3: 6ND = '+f.toExponential(2)+' FLOPs against the paper\'s 3.8 × 10<sup>25</sup> (introduction), reproduced independently from its N and D; '+days.toFixed(0)+' days at full speed on 16,384 GPUs, where the paper reports more than 90% effective training time and 466 interruptions in one 54-day snapshot. Ignores the long-context stage and attention FLOPs. <span class="sl-lbl der">derived</span>'}
    else if(st.pre!=null)res='Preset: '+PRE[st.pre].src+'.';
    $('sl-c-res').innerHTML=res}
  $('sl-c-pre').innerHTML=PRE.map((p,i)=>'<button data-i="'+i+'">'+p.nm+'</button>').join('');
  $('sl-c-pre').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const p=PRE[+b.dataset.i];Object.assign(st,{N:p.N,G:p.G,F:p.F,D:p.D,B:p.B,fmt:p.fmt,pre:+b.dataset.i});
    $('sl-c-pre').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));setSliders();calc()});
  ['sl-c-n','sl-c-g','sl-c-f','sl-c-d','sl-c-b'].forEach(id=>$(id).addEventListener('input',()=>{$('sl-c-pre').querySelectorAll('button').forEach(x=>x.classList.remove('on'));read()}));
  RD.seg($('sl-c-fmt'),v=>{st.fmt=v;calc()});
  $('sl-c-pre').querySelector('button').click();
  RD.onRender(calc);RD.onResize(calc);
})();
