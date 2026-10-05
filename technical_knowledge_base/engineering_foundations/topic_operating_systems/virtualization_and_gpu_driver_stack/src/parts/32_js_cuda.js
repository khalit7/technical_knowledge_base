// ---- One CUDA call tab: the recorded traces of four no-GPU cases, stepped line by line with what each line means ----
(function(){
  const V=window.VD,C=V.cuda,$=id=>document.getElementById(id);if(!$('cu-case'))return;
  const key=p=>Object.keys(C).find(k=>k.indexOf(p)===0);
  const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  const NV='https://github.com/NVIDIA/open-gpu-kernel-modules/blob/615.71.09/';
  const a=(t,u)=>'<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+t+'</a>';
  const CASES=[
   {id:'c1',name:'1. No driver',res:'<b>cudaGetDeviceCount: 35 cudaErrorInsufficientDriver.</b> No <code>libcuda.so.1</code> anywhere: what any container started without the NVIDIA runtime sees. PyTorch reports this as "Found no NVIDIA driver on your system" (or returns False from is_available).',
    raw:[['$ LD_DEBUG=libs ./rt_probe  (lines mentioning libcuda)',key('case 1 under LD_DEBUG')],['$ strace -f -e trace=openat,... ./rt_probe  (lines mentioning cuda or nvidia)',key('case 1 under strace')],['$ ./rt_probe',key('case 1: no driver')]],
    steps:[[/find library=libcudart\.so\.13/,'The program was linked against <code>libcudart.so.13</code> (see ldd below), so the dynamic loader finds it at start-up, before <code>main</code>.'],
     [/trying file=\/usr\/local\/nvidia\/lib\/libcudart/,'The loader tries each directory on the search path in order. The CUDA images put <code>/usr/local/nvidia/lib</code> and <code>lib64</code> first on <code>LD_LIBRARY_PATH</code>: they are empty here.'],
     [/calling init: \/usr\/local\/cuda\/lib64\/libcudart/,'Found in <code>/usr/local/cuda/lib64</code>; its initialisers run. Nothing has touched a GPU yet.'],
     [/find library=libcuda\.so\.1/,'The first runtime call that needs the driver makes the runtime <code>dlopen("libcuda.so.1")</code>. Note: the driver is <b>not</b> a link-time dependency; it is opened at run time, so the same binary starts on machines without one.'],
     [/trying file=\/usr\/lib\/libcuda\.so\.1/,'Five directories tried, nothing found. The toolkit image has no real libcuda: it belongs to the host and is mounted in by the NVIDIA container runtime.'],
     [/openat\(AT_FDCWD, "\/usr\/local\/cuda\/lib64\/libcuda\.so\.1"/,'The same search seen as system calls: each attempt is an <code>openat</code> that fails with ENOENT.'],
     [/cudaGetDeviceCount *-> 35/,'Result: error 35, worded as if the driver were too old. With no driver at all, <code>cudaDriverGetVersion</code> returns 0, which is how you tell "absent" from "old".']]},
   {id:'c2',name:'2. Stub library',res:'<b>cudaGetDeviceCount: 34 cudaErrorStubLibrary.</b> The toolkit ships <code>lib64/stubs/libcuda.so</code> so programs can link on build machines; if it is found at run time, it refuses to work.',
    raw:[['$ LD_LIBRARY_PATH=/tmp/stub ./rt_probe; ./drv_probe',key('case 2:')]],
    steps:[[/cudaGetDeviceCount *-> 34/,'The runtime loaded the stub as <code>libcuda.so.1</code> (a symlink made for this test) and got "CUDA driver is a stub library".'],
     [/libcuda loaded from \/tmp\/stub/,'The driver-API probe confirms which file was loaded.'],
     [/cuInit\(0\) *-> 34/,'Every driver call returns 34. A stub on the library path ahead of the real driver (a common Dockerfile mistake: adding <code>stubs</code> to <code>LD_LIBRARY_PATH</code> for the build and leaving it there) breaks a GPU machine the same way.']]},
   {id:'c3',name:'3. Driver library, no kernel module',res:'<b>cuInit: 100 CUDA_ERROR_NO_DEVICE.</b> The real user-mode driver 615.71.09 (from the image\'s forward-compatibility directory) loads, finds no kernel module and no usable device file.',
    raw:[['$ LD_LIBRARY_PATH=/usr/local/cuda/compat strace -f ... ./drv_probe',key('case 3 under strace')],['$ ./drv_probe; ./rt_probe',key('case 3: the real')]],
    steps:[[/"\/usr\/local\/cuda\/compat\/libcuda\.so\.1".*= 3/,'<code>dlopen</code> finds the driver through <code>LD_LIBRARY_PATH</code>, which is how the compat package is meant to be used ("This package only provides the libraries, and does not configure the system to find such libraries").'],
     [/\/proc\/cpuinfo/,'cuInit starts by learning about the host CPU and memory map (<code>/proc/cpuinfo</code>, <code>/proc/self/maps</code>, CPUs online).'],
     [/cuda_injection_path_shm/,'A hook checked at start-up, by its name for injecting a tool library (profilers and debuggers attach this way); absent here. Purpose read from the name, unconfirmed.'],
     [/nvidia-application-profiles-615\.71\.09-rc/,'Application profiles: per-program driver settings, looked up in the home directory, <code>/etc/nvidia</code> and <code>/usr/share/nvidia</code>.'],
     [/sys\/bus\/pci\/devices\/0000:00:01\.0\/config/,'It scans PCI configuration space for an NVIDIA device (vendor ID 0x10de). This VM has only QEMU\'s host bridge and the virtio disk.'],
     [/nvidia-modprobe/,'Looks for <code>nvidia-modprobe</code>, the setuid helper that loads the kernel module and creates <code>/dev/nvidia*</code> for unprivileged users. Absent.'],
     [/\/proc\/driver\/nvidia\/params/,'The kernel module\'s parameters file. Absent: no module loaded.'],
     [/newfstatat\(AT_FDCWD, "\/dev\/nvidiactl".*makedev\(0xc3, 0xff\)/,'<code>/dev/nvidiactl</code> exists as character device 195:255 because libcuda created it with <code>mknodat</code> on an earlier run (the Reading tab shows the call). 195 and 255 are the module\'s '+a('major and control-device minor',NV+'kernel-open/common/inc/nv-chardev-numbers.h#L29-L40')+'.'],
     [/openat\(AT_FDCWD, "\/dev\/nvidiactl", O_RDWR\) = -1 EPERM/,'<code>EPERM</code>: the container\'s device cgroup does not allow 195:*. The kernel never even looked for a driver.'],
     [/\/proc\/modules/,'It reads the list of loaded modules, presumably to word its diagnosis. Then it gives up: <code>cuInit</code> returns 100.'],
     [/cuInit\(0\) *-> 100/,'"no CUDA-capable device is detected". The runtime turns this into <code>cudaErrorNoDevice</code>, and PyTorch\'s <code>device_count()</code> into 0.']]},
   {id:'c4',name:'4. Device allowed, no module',res:'<b>cuInit: 100, and now ENXIO.</b> Same as case 3, but the container was started with <code>--device-cgroup-rule \'c 195:* rwm\'</code>: the open reaches the kernel, which has no driver for major 195.',
    raw:[['$ docker run --device-cgroup-rule \'c 195:* rwm\' ... strace -X raw ./drv_probe',null]],
    steps:[[/mknodat/,'The node is made fresh in this container: mode 020666 is "character device, read-write for all"; 0xc3ff is major 0xc3 = 195, minor 0xff = 255.'],
     [/ENXIO/,'<code>ENXIO</code> "No such device or address": the device cgroup allowed the open, then the kernel\'s character-device lookup found no driver registered for 195. That is the kernel-module half missing.'],
     [/ioctl\(-1, 0xc020462a/,'One ioctl sent to the descriptor it never got: <code>0xc020462a</code> = read-write, 32 bytes, type \'F\', number 0x2A: '+a('NV_ESC_RM_CONTROL',NV+'src/nvidia/arch/nvalloc/unix/include/nv_escape.h#L34')+' with an '+a('NVOS54_PARAMETERS',NV+'src/common/sdk/nvidia/inc/nvos.h#L2231-L2240')+' argument. The resource manager\'s "run a control command" call, the most common ioctl a CUDA process makes.'],
     [/\(none\)/,'And the kernel agrees: <code>/proc/devices</code> lists no character driver with major 195. On a GPU host the module registers 195 as <code>nvidia</code> and <code>nvidiactl</code> ('+a('nv.c L1059-1066',NV+'kernel-open/nvidia/nv.c#L1059-L1066')+'), with the same file operations for both.']]},
   {id:'c5',name:'5. CPU-only PyTorch',res:'<b>is_available: False, device_count: 0, no driver search at all.</b> The CPU wheel is not compiled with CUDA, so <code>torch.cuda.is_available()</code> returns early ('+a('torch/cuda/__init__.py L209-228','https://github.com/pytorch/pytorch/blob/v2.14.1/torch/cuda/__init__.py#L209-L228')+').',
    raw:[['$ python3 -c "import torch; ..."',key('case 5:')]],
    steps:[[/torch 2\.14\.1\+cpu/,'<code>torch.version.cuda</code> is None for a CPU build: the quickest way to tell "wrong wheel" from "no driver".'],
     [/libm\.so\.6/,'The only matching lines are the loader looking for <code>libm</code> in <code>/usr/local/nvidia/lib*</code> (the image\'s library path), not a driver lookup.']]}
  ];
  let ci=0,si=0;
  function raw(c){if(c.id==='c4')return '$ '+c.raw[0][0].slice(2)+'\n'+V.cuda_dev;return c.raw.map(r=>r[0]+'\n'+C[r[1]]).join('\n\n')}
  function render(){const c=CASES[ci],text=raw(c),lines=text.split('\n');
    // find each step's line, in order
    let from=0;const at=c.steps.map(s=>{let k=lines.findIndex((l,j)=>j>=from&&s[0].test(l));if(k<0)k=lines.findIndex(l=>s[0].test(l));if(k>=0)from=k+1;return k});
    $('cu-res').innerHTML=c.res;
    $('cu-raw').innerHTML=lines.map((l,j)=>j===at[si]?'<span class="hl">'+esc(l)+'</span>':esc(l)).join('\n');
    $('cu-rawname').textContent='recorded output, '+lines.length+' lines';
    $('cu-steps').innerHTML=c.steps.map((s,k)=>'<button class="'+(k===si?'on':'')+'" data-k="'+k+'">'+(k+1)+'. '+esc((lines[at[k]]||'').replace(/^\[pid +\d+\] /,'').replace(/^\s+/,'').slice(0,90))+'</button>').join('');
    $('cu-note').innerHTML=c.steps[si][1];$('cu-pos').textContent='step '+(si+1)+' of '+c.steps.length;
    const hl=$('cu-raw').querySelector('.hl');if(hl){const p=$('cu-raw');p.scrollTop=Math.max(0,hl.offsetTop-p.clientHeight/3)}}
  $('cu-case').innerHTML=CASES.map((c,k)=>'<button data-k="'+k+'"'+(k===0?' class="on"':'')+'>'+c.name+'</button>').join('');
  $('cu-case').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;ci=+b.dataset.k;si=0;[...$('cu-case').children].forEach(x=>x.classList.toggle('on',x===b));render()});
  $('cu-steps').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;si=+b.dataset.k;render()});
  $('cu-prev').addEventListener('click',()=>{si=Math.max(0,si-1);render()});
  $('cu-next').addEventListener('click',()=>{si=Math.min(CASES[ci].steps.length-1,si+1);render()});
  $('cu-ldd').textContent=C[key('ldd rt_probe')];
  $('cu-cubins').textContent=C[key('each cubin')];
  $('cu-ptx').textContent=C[key('the first lines of the PTX')];
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-cuda']=[render];
  render();
})();
