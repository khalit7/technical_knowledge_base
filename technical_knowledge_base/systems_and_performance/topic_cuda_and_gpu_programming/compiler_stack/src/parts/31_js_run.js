// ---- Tab "Will it run?": a port of src/code/compat.py (checked by check/check_js.mjs) and its step animation ----
window.CSRUN=(function(){
  function parse(t){const [kind,rest]=t.split('_');const num=parseInt(rest,10);return [kind,num,rest.slice(String(num).length)]}
  const dv=n=>[Math.floor(n/10),n%10];
  function okSass(num,suf,cc){const [a,b]=dv(num);
    if(suf==='a')return [num===cc,"an 'a' cubin runs only on exactly CC "+a+'.'+b];
    const same=Math.floor(num/10)===Math.floor(cc/10)&&num%10<=cc%10;
    if(suf==='f')return [same,"an 'f' cubin runs on CC "+a+'.x with minor >= '+b];
    return [same,'a cubin runs on the same major ('+a+') with minor >= '+b];}
  function okPtx(num,suf,cc){const [a,b]=dv(num);
    if(suf==='a')return [num===cc,"'a' PTX can be compiled only for exactly CC "+a+'.'+b];
    if(suf==='f')return [Math.floor(num/10)===Math.floor(cc/10)&&num%10<=cc%10,"'f' PTX: same major, minor >= "+(num%10)];
    return [num<=cc,'PTX can be JIT-compiled for any CC >= '+a+'.'+b];}
  function decide(images,cc,driver,toolkit,force,disable){driver=driver||134;toolkit=toolkit||134;const steps=[];
    if(driver<130)return {outcome:'error',code:'cudaErrorInsufficientDriver',steps:[['note','a CUDA 13 application needs driver r580 (CUDA 13.0) or newer',null,'']]};
    const sass=images.filter(t=>t.startsWith('sm_')).map(parse),ptx=images.filter(t=>t.startsWith('compute_')).map(parse);let best=null;
    if(!force){for(const [,n,s] of sass){const [g,why]=okSass(n,s,cc);steps.push(['sass','sm_'+n+s,g,why]);
        if(g&&(best===null||n>best[0]||(n===best[0]&&s==='a')))best=[n,s];}
      if(best)return {outcome:'sass',image:'sm_'+best[0]+best[1],steps};}
    else steps.push(['note','CUDA_FORCE_PTX_JIT=1: every cubin ignored',null,'']);
    if(disable){steps.push(['note','CUDA_DISABLE_PTX_JIT=1: PTX not considered',null,'']);return {outcome:'error',code:'cudaErrorNoKernelImageForDevice',steps};}
    let bp=null;for(const [,n,s] of ptx){const [g,why]=okPtx(n,s,cc);steps.push(['ptx','compute_'+n+s,g,why]);if(g&&(bp===null||n>bp[0]))bp=[n,s];}
    if(bp===null)return {outcome:'error',code:'cudaErrorNoKernelImageForDevice',steps};
    if(toolkit>driver){steps.push(['jit','compute_'+bp[0]+bp[1],false,'PTX made by CUDA '+(toolkit/10).toFixed(1)+"; this driver's JIT knows CUDA "+(driver/10).toFixed(1)]);return {outcome:'error',code:'cudaErrorUnsupportedPtxVersion',steps};}
    const [a,b]=dv(cc);steps.push(['jit','compute_'+bp[0]+bp[1],true,'the driver compiles it for CC '+a+'.'+b+' and caches the result']);
    return {outcome:'jit',image:'compute_'+bp[0]+bp[1],steps};}
  return {decide};
})();
(function(){
  const C=window.CSC,E=RD.esc,dec=window.CSRUN.decide;
  const names={sm90a:'nvcc -arch=sm_90a (compiled here)',sm90:'nvcc -arch=sm_90 (compiled here)',c90:'nvcc -arch=compute_90: PTX only (compiled here)',sm90only:'-gencode arch=compute_90,code=sm_90: SASS only (compiled here)',two:'sm_80 + sm_90 + compute_90 (compiled here)',f100:'nvcc -arch=sm_100f (compiled here)',allmajor:'nvcc -arch=all-major (compiled here)',torch:'five SASS + PTX 12.0, like a PyTorch build (compiled here)',wheel:'PyTorch 2.14 release wheel, CUDA 13, x86_64',nightly:'PyTorch 2.14 nightly, CUDA 13, x86_64 (+PTX 12.0)',custom:'your own mix'};
  const gpus=C.gpus.concat([['a future CC 13.0 GPU (hypothetical)',130]]);
  const $=id=>document.getElementById(id);
  $('run-fat').innerHTML=Object.keys(names).map(k=>'<option value="'+k+'"'+(k==='sm90a'?' selected':'')+'>'+E(names[k])+'</option>').join('');
  $('run-gpu').innerHTML=gpus.map((g,i)=>'<option value="'+i+'"'+(g[1]===100?' selected':'')+'>'+E(g[0])+' (CC '+(g[1]/10|0)+'.'+g[1]%10+')</option>').join('');
  const ALL=['sm_75','sm_80','sm_86','sm_89','sm_90','sm_90a','sm_100','sm_100a','sm_100f','sm_103','sm_110','sm_120','sm_120a','sm_121','compute_75','compute_80','compute_90','compute_90a','compute_100','compute_100f','compute_120'];
  let custom=['sm_80','sm_90','compute_90'],mode='as';
  $('run-chips').innerHTML=ALL.map(t=>'<button data-t="'+t+'">'+t+'</button>').join('');
  const syncChips=()=>$('run-chips').querySelectorAll('button').forEach(b=>b.classList.toggle('on',custom.includes(b.dataset.t)));
  $('run-chips').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const t=b.dataset.t;custom=custom.includes(t)?custom.filter(x=>x!==t):custom.concat([t]);syncChips();update()});syncChips();
  const imgs=()=>{const k=$('run-fat').value;let L=k==='custom'?custom:C.fat[k];if(mode==='strip')L=L.filter(t=>t.startsWith('sm_'));return L};
  const state=()=>({L:imgs(),g:gpus[+$('run-gpu').value],drv:+$('run-drv').value,f:$('run-force').checked,d:$('run-dis').checked});
  let R=null,S=null;
  function outcomeHtml(r){if(r.outcome==='sass')return '<b>Runs the SASS image '+r.image+'.</b> No compilation at load time.';
    if(r.outcome==='jit')return '<b>Runs after a JIT compile of '+r.image+'.</b> The first use of each kernel waits for the driver’s ptxas; later runs hit the cache in <code>CUDA_CACHE_PATH</code>.';
    return '<b>Fails: <code>'+r.code+'</code>.</b> '+({cudaErrorNoKernelImageForDevice:'"no kernel image is available for execution on the device".',cudaErrorUnsupportedPtxVersion:'"the provided PTX was compiled with an unsupported toolchain": the PTX is newer than the driver.'}[r.code]||'')}
  function draw(i){if(!R)return;const steps=R.steps,n=steps.length;const k=Math.min(i,n);
    // step 0 = the GPU reports its CC; step j (1..n) = the j-th check; step n+1 = outcome
    const seen={};for(let j=0;j<Math.min(k,n);j++){const s=steps[j];if(s[0]!=='note')seen[s[1]+(s[0]==='jit'?'#jit':'')]=s[2]}
    const cur=k>=1&&k<=n?steps[k-1]:null;
    $('run-imgs').innerHTML=S.L.length?S.L.map(t=>{const isS=t.startsWith('sm_');const st=seen[t];const jit=seen[t+'#jit'];
      let cls='run-img '+(isS?'sass':'ptx');if(st===true||jit===true)cls+=' yes';else if(st===false||jit===false)cls+=' no';if(cur&&cur[1]===t)cls+=' cur';
      return '<div class="'+cls+'"><span class="k">'+(isS?'SASS':'PTX')+'</span>'+t+'</div>'}).join(''):'<span class="ann">the binary holds no image</span>';
    let cap;
    if(k===0)cap='<b>The GPU reports compute capability '+(S.g[1]/10|0)+'.'+S.g[1]%10+'.</b> The driver opens the fat binary: '+S.L.length+' image'+(S.L.length===1?'':'s')+'. '+(S.f?'CUDA_FORCE_PTX_JIT is set. ':'')+(S.d?'CUDA_DISABLE_PTX_JIT is set. ':'');
    else if(cur)cap='<b>'+({sass:'Check SASS ',ptx:'Check PTX ',jit:'JIT-compile ',note:''}[cur[0]])+E(cur[1])+(cur[2]===true?': yes':cur[2]===false?': no':'')+'.</b> '+E(cur[3]);
    else cap='<b>Result.</b>';
    $('run-cap').innerHTML=cap;
    $('run-out').className='run-out'+(k>n?' '+R.outcome:'');$('run-out').innerHTML=k>n?outcomeHtml(R):'<span class="mute">Step on to see the result.</span>';}
  const an=RD.anim({card:'run-card',ctl:'run-ctl',n:3,draw:draw,ms:1500,label:'Driver step'});
  function matrix(){const rows=gpus.map((g,i)=>{const r=dec(S.L,g[1],S.drv,134,S.f,S.d);return '<tr data-i="'+i+'" style="cursor:pointer"><td>'+E(g[0])+'</td><td>'+(g[1]/10|0)+'.'+g[1]%10+'</td><td class="o-'+r.outcome+(i===+$('run-gpu').value?' o-cur':'')+'">'+(r.outcome==='sass'?'SASS '+r.image:r.outcome==='jit'?'JIT from '+r.image:r.code)+'</td></tr>'}).join('');
    $('run-m').innerHTML='<tr><th>GPU</th><th>CC</th><th>Outcome</th></tr>'+rows;}
  $('run-m').addEventListener('click',e=>{const tr=e.target.closest('tr[data-i]');if(!tr)return;$('run-gpu').value=tr.dataset.i;update()});
  function update(){S=state();R=dec(S.L,S.g[1],S.drv,134,S.f,S.d);$('run-custom').hidden=$('run-fat').value!=='custom';
    $('run-what').textContent=names[$('run-fat').value]+(mode==='strip'?', PTX removed':'')+' on '+S.g[0]+', '+$('run-drv').selectedOptions[0].text;
    an.reset(R.steps.length+2);matrix();}
  ['run-fat','run-gpu','run-drv','run-force','run-dis'].forEach(id=>$(id).addEventListener('change',update));
  RD.seg($('run-mode'),m=>{mode=m;update()});
  $('run-ncase').textContent=window.CSD.compat_n;
  update();
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-run']=[()=>an.redraw()];
})();
