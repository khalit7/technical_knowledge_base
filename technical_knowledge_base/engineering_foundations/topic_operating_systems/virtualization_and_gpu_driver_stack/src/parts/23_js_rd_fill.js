// ---- Reading: fill the recorded outputs (from window.VD, generated from src/raw/) into the page ----
(function(){
  const V=window.VD,$=id=>document.getElementById(id),put=(id,t)=>{const e=$(id);if(e)e.textContent=t};
  put('vm-args',V.host.args+'\n'+V.host.version);
  put('vm-pci',V.vmid.pci);
  put('vm-virtio',V.vmid.virtio.split('\n').map(l=>l.replace(/ features .*/,'')).join('\n'));
  put('vm-intr',V.vmid.interrupts);
  put('vm-clk',V.vmid.clocksource);
  put('vm-steal',String(V.vmid.steal[0]));
  // case 3 of the page (raw: "case 4", nodes replaced by empty files): the node libcuda makes for itself
  const k4=Object.keys(V.cuda).find(k=>k.indexOf('case 4:')===0);
  const L=V.cuda[k4].split('\n');const pick=[];let opens=0,shown=0;
  L.forEach(l=>{
    if(/unlinkat\(-100, "\/dev\/nvidiactl"|mknodat/.test(l)&&pick.indexOf(l)<0)pick.push(l);
    else if(/openat\(-100, "\/dev\/nvidiactl"/.test(l)){opens++;if(shown<1){pick.push(l);shown++}}
    else if(/ioctl\(/.test(l))pick.push('... ('+opens+' attempts to open /dev/nvidiactl in all)\n'+l);
  });
  put('cu-mknod',pick.map(l=>l.replace(/^\[pid +\d+\] /,'')).join('\n'));
  const kf=Object.keys(V.cuda).find(k=>k.indexOf('the fat binary inside')===0),ke=Object.keys(V.cuda).find(k=>k.indexOf('fat binary section')===0);
  put('cu-fat','$ cuobjdump -lelf -lptx rt_probe\n'+V.cuda[kf]+'\n$ readelf -SW rt_probe | grep nv\n'+V.cuda[ke]);
})();
