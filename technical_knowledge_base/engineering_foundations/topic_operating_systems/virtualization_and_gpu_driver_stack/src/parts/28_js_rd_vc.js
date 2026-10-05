// ---- Reading s10: will it run? NVIDIA's compatibility rules and forward-compatibility matrix (CUDA Compatibility, Table 3) ----
(function(){
  const out=document.getElementById('vc-out');if(!out)return;
  // driver branch -> the CUDA version it was released with (450 and 525: the minimum drivers for 11.x and 12.x)
  const DRV=[[450,'11.0'],[525,'12.0'],[535,'12.2'],[570,'12.8'],[580,'13.0'],[590,'13.1'],[595,'13.2'],[610,'13.3'],[615,'13.4']];
  const RT=['11.8','12.2','12.4','12.6','12.8','12.9','13.0','13.1','13.2','13.3','13.4'];
  const COLS=[535,570,580,590,595,610,615];
  const M={'13.4':'CCCCCCN','13.3':'CCCCCNX','13.2':'CCCCNXX','13.1':'CCCNXXX','13.0':'CCNXXXX','12.9':'CCXXXXX','12.8':'CNXXXXX','12.6':'CXXXXXX','12.5':'CXXXXXX','12.4':'CXXXXXX','12.3':'CXXXXXX','12.2':'NXXXXXX'};
  const MIN={11:450,12:525,13:580};
  const v=s=>s.split('.').map(Number),cmp=(a,b)=>{a=v(a);b=v(b);return a[0]-b[0]||a[1]-b[1]};
  const $=id=>document.getElementById(id);
  $('vc-drv').innerHTML=DRV.map(d=>'<option value="'+d[0]+'"'+(d[0]===570?' selected':'')+'>'+d[0]+' (CUDA '+d[1]+')</option>').join('');
  $('vc-rt').innerHTML=RT.map(r=>'<option'+(r==='13.4'?' selected':'')+'>'+r+'</option>').join('');
  function cell(r,b){const row=M[r];const i=COLS.indexOf(b);if(!row||i<0)return null;return row[i]}
  function verdict(){const b=+$('vc-drv').value,D=DRV.find(d=>d[0]===b)[1],R=$('vc-rt').value,gpu=$('vc-gpu').value,code=$('vc-code').value,compat=$('vc-compat').value==='yes';
    const c=cell(R,b),pkg='cuda-compat-'+R.replace('.','-');
    const fwd=()=>{if(gpu!=='dc')return['bad','Not supported: forward compatibility is for data-centre GPUs (and select RTX and Jetson parts). Use a build for CUDA '+D.split('.')[0]+'.x or upgrade the driver.'];
      if(!compat)return['bad','Fails at the first CUDA call: cudaErrorInsufficientDriver (35), "CUDA driver version is insufficient for CUDA runtime version" (PyTorch: "The NVIDIA driver on your system is too old"). Install '+pkg+' and put its compat directory on LD_LIBRARY_PATH, or upgrade the driver.'];
      if(c==='C')return['ok','Runs through forward compatibility: the newer user-mode driver from '+pkg+' talks to the '+b+' kernel module. PTX JIT works, because the package brings its own JIT compiler. Some features that need kernel support (graphics interop) do not.'];
      if(c===null)return['bad','No compatibility package: driver branch '+b+' is not a supported target ("Branches not listed ... are end of life"), or there is no '+pkg+'. Upgrade the driver.'];
      return['bad','NVIDIA provides no '+pkg+' for driver '+b+' (marked X in the matrix). Upgrade the driver.']};
    let r;
    if(cmp(R,D)<=0)r=['ok','Runs: backward compatibility. Driver '+b+' supports CUDA up to '+D+', and an older runtime always works on a newer driver.'];
    else if(v(R)[0]===v(D)[0]&&b>=MIN[v(R)[0]]){
      if(code==='sass')r=['mid','Runs through minor version compatibility (same major, driver '+b+' is at least the minimum '+MIN[v(R)[0]]+'). Features newer than '+D+' that need driver support return cudaErrorCallRequiresNewerDriver.'];
      else if(compat&&gpu==='dc'&&c==='C')r=['ok','PTX needs a newer driver, but '+pkg+' is installed and compatible with '+b+': runs through forward compatibility, with PTX JIT.'];
      else r=['bad','Fails to load the GPU code: "Applications that compile device code to PTX will not work on older drivers" under minor version compatibility. Ship SASS for the GPU (nvcc -arch=sm_XX), upgrade the driver, or use the compat package on a data-centre GPU.']}
    else r=fwd();
    out.className='verdict '+(r[0]==='ok'?'ok':r[0]==='bad'?'bad':'');
    out.innerHTML='<b>'+(r[0]==='ok'?'Runs.':r[0]==='bad'?'Does not run.':'Runs, with limits.')+'</b> '+r[1]+'<div class="small mute" style="margin-top:4px">Matrix cell for '+pkg+' on '+b+': '+(c===null?'not in the table':c==='C'?'C (compatible)':c==='N'?'N/A (this package belongs to this driver)':'X (no package)')+'.</div>'}
  ['vc-drv','vc-rt','vc-gpu','vc-code','vc-compat'].forEach(id=>$(id).addEventListener('change',verdict));
  verdict();
})();
