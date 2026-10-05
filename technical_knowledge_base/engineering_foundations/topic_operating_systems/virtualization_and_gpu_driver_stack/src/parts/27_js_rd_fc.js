// ---- Reading s9: the first CUDA call of a process against a launch in the training loop ----
(function(){
  const box=document.getElementById('fc-steps');if(!box)return;
  const S={
    first:[
      ['sys','dlopen("libcuda.so.1")','The runtime looks for the user-mode driver (here it searched five directories, section 9 case 1) and maps it: openat and mmap system calls.'],
      ['sys','open("/dev/nvidiactl")','cuInit opens the control device, character 195:255. In a container this is where the device cgroup says yes or no.'],
      ['sys','ioctl NV_ESC_CHECK_VERSION_STR','The version handshake with nvidia.ko: an exact or relaxed match of the version strings, or the "API mismatch" message in the kernel log.'],
      ['sys','ioctl NV_ESC_RM_ALLOC, NV_ESC_RM_CONTROL','Resource-manager objects: a client for this process, then a device and subdevice per GPU; control calls ask what the GPUs are.'],
      ['sys','open("/dev/nvidia0"), open("/dev/nvidia-uvm")','The GPU itself, and the unified-memory device (UVM_INITIALIZE, UVM_REGISTER_GPU) that gives CPU and GPU one virtual address space.'],
      ['sys','create the context: allocate and map','A GPU address space, channels with their GPFIFO ring and pushbuffer, and the usermode doorbell page: RM allocations, then NV_ESC_RM_MAP_MEMORY and mmap so the process can write them directly.'],
      ['sys','load the kernel\'s module (lazily, at first launch)','Pick the cubin for this GPU from the fatbin, or JIT-compile the PTX; allocate GPU memory for the code and copy it there.'],
      ['user','write the launch into the pushbuffer','Methods: which kernel, grid and block sizes, the parameter buffer. Ordinary stores into mapped memory.'],
      ['user','add a GPFIFO entry, barrier, update GPPut','The ring entry points at the new pushbuffer segment; a memory barrier orders the writes (uvm_channel.c L984-1015 shows the same sequence).'],
      ['mmio','ring the doorbell','One store of the channel\'s token to NOTIFY_CHANNEL_PENDING in the mapped usermode page. In a VM with passthrough this is not an exit: the page is mapped by stage-2 tables.'],
      ['gpu','the GPU fetches and runs the kernel','By DMA from the pushbuffer, through the IOMMU in a VM. The CPU returned long ago.']],
    steady:[
      ['user','cudaLaunchKernel, cuLaunchKernel','PyTorch\'s dispatcher has chosen the kernel; the runtime forwards to the driver API. Everything from the first call is already mapped.'],
      ['user','write the launch into the pushbuffer','Methods for this kernel: ordinary stores.'],
      ['user','add a GPFIFO entry, barrier, update GPPut','Still plain memory.'],
      ['mmio','ring the doorbell','One store to the mapped doorbell register.'],
      ['gpu','the GPU fetches and runs the kernel','No system call happened anywhere on this path, which is why a launch costs a few microseconds of CPU time and why strace of a steady loop is quiet (inferred for the closed libcuda; see the box above).']]
  };
  const TAG={sys:'enters the kernel',user:'user space',mmio:'doorbell store',gpu:'GPU'};
  let mode='first';
  function draw(i){const st=S[mode];let h='';
    st.forEach((s,k)=>{h+='<div class="'+(k===i?'on':k<i?'done':'')+'"><b>'+TAG[s[0]]+'</b><span><code>'+s[1].replace(/</g,'&lt;')+'</code></span></div>'});
    box.innerHTML=h;const d=st.slice(0,i+1);
    document.getElementById('fc-cnt').innerHTML=RD.stat('Steps that enter the kernel',d.filter(s=>s[0]==='sys').length,'each one or more system calls')+RD.stat('Steps in user space',d.filter(s=>s[0]!=='sys'&&s[0]!=='gpu').length,'plain stores')+RD.stat('Step',(i+1)+' / '+st.length,mode==='first'?'first call':'steady state');
    document.getElementById('fc-cap').innerHTML='<div class="t">'+st[i][1].replace(/</g,'&lt;')+'</div><p>'+st[i][2]+'</p>'}
  const a=RD.anim({card:'fc-card',ctl:'fc-ctl',n:S.first.length,draw,ms:1700,label:'CUDA call step'});
  RD.seg(document.getElementById('fc-mode'),m=>{mode=m;a.reset(S[m].length);a.play()});
})();
