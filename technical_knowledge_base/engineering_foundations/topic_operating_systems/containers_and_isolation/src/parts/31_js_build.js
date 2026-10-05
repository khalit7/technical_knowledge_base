// ---- Build a container tab: step through minictr's run, each view compared with the previous step or step 0 ----
(function(){
  const D=window.CT_DATA,E=RD.esc,$=id=>document.getElementById(id),S=D.mini;
  const L='https://github.com/torvalds/linux/blob/v5.10/';
  const lk=(t,u)=>'<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+E(t)+'</a>';
  const STEP=[
    {t:'Start: an ordinary root process',c:'shmget(IPC_PRIVATE, 4096, IPC_CREAT | 0600);  /* one System V segment, to watch */\nview(0, ...);',
     p:'The baseline, inside the outer Docker container: its namespaces, 22 entries in /, 23 mounts, eth0, the outer cgroup /init, and no seccomp filter (the outer container ran unconfined).'},
    {t:'A new UTS namespace',c:'unshare(CLONE_NEWUTS);\nsethostname("trainer-0", 9);',k:['kernel/nsproxy.c: unshare_nsproxy_namespaces',L+'kernel/nsproxy.c#L216'],
     p:'Only the uts namespace number and the hostname change. The outer container still has its own hostname: this process now has a private copy.'},
    {t:'A new PID namespace, then fork',c:'unshare(CLONE_NEWPID);   /* sets pid_ns_for_children only */\npid_t c = fork();       /* the child is PID 1 in the new namespace */\nif (c > 0) { waitpid(c, &st, 0); return 0; }',k:['kernel/fork.c: alloc_pid(p->nsproxy->pid_ns_for_children)',L+'kernel/fork.c#L2111'],
     p:'The child is PID 1 with parent 0 (its parent is outside the namespace). But it still sees 3 processes: /proc is the old namespace\'s proc mount until step 4.'},
    {t:'Join the limited cgroup, then a cgroup namespace',c:'write("/sys/fs/cgroup/ctr/cgroup.procs", "0");  /* "0" means me */\nunshare(CLONE_NEWCGROUP);',k:['cgroup v2 docs: cgroup namespaces','https://docs.kernel.org/admin-guide/cgroup-v2.html#namespace'],
     p:'/proc/self/cgroup now reads 0::/ (this cgroup looks like the root). The memory.max read from /sys/fs/cgroup is still the outer container\'s: that mount was made before; it is remounted at step 4.'},
    {t:'A mount namespace, an overlay root, pivot_root',c:'unshare(CLONE_NEWNS);\nmount(NULL, "/", NULL, MS_REC | MS_PRIVATE, NULL);\nmount("overlay", "/ctr/merged", "overlay", 0,\n      "lowerdir=/ctr/lower,upperdir=/ctr/upper,workdir=/ctr/work");\nmount("/dev", "/ctr/merged/dev", NULL, MS_BIND | MS_REC, NULL);\npivot_root("/ctr/merged", "/ctr/merged/oldroot");\nchdir("/");\nmount("proc", "/proc", "proc", ...);\nmount("cgroup2", "/sys/fs/cgroup", "cgroup2", ...);\nmount("tmpfs", "/tmp", "tmpfs", 0, "size=16m");\numount2("/oldroot", MNT_DETACH);',k:['fs/overlayfs/copy_up.c',L+'fs/overlayfs/copy_up.c#L132'],
     p:'The busybox tree is now /, the old root is unmounted, and a fresh /proc shows exactly one process. The new cgroup2 mount shows /ctr as its root: memory.max 64 MiB, pids.max 16.'},
    {t:'A network namespace',c:'unshare(CLONE_NEWNET);   /* about 2.4 ms here, see Reading section 1 */',k:['net/core/net_namespace.c: setup_net',L+'net/core/net_namespace.c#L325'],
     p:'eth0 is gone. lo, tunl0 and ip6tnl0 are new devices of the new namespace (all down); nothing connects it to the outside yet.'},
    {t:'An IPC namespace',c:'unshare(CLONE_NEWIPC);',
     p:'The System V shared memory segment created at step 0 is no longer visible: zero segments.'},
    {t:'Drop capabilities to Docker\'s default 14',c:'for (cap = 0; cap <= 40; cap++)\n  if (!keep(cap)) prctl(PR_CAPBSET_DROP, cap);   /* bounding set */\ncapset(&hdr, data);   /* permitted = effective = the 14 */',k:['capabilities(7)','https://man7.org/linux/man-pages/man7/capabilities.7.html'],
     p:'CapEff loses bit 21, CAP_SYS_ADMIN. Root inside can still chown files, but sethostname and mount now fail with EPERM.'},
    {t:'no_new_privs and a seccomp filter',c:'prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0);\nprctl(PR_SET_SECCOMP, SECCOMP_MODE_FILTER, &prog);\n/* 9 BPF instructions: wrong arch: kill; mkdirat: EPERM;\n   unshare: EPERM; anything else: allow */',k:['kernel/seccomp.c: seccomp_run_filters',L+'kernel/seccomp.c#L311'],
     p:'Seccomp becomes 2 (filter mode) and NoNewPrivs 1. mkdir and unshare fail before reaching the kernel\'s code for them; getpid is unaffected.'},
    {t:'execve the workload',c:'execl("/bin/sh", "sh", "/job.sh", NULL);',
     p:'The program replaces itself with busybox sh, which keeps every restriction. The workload\'s own output is below, then the upper layer as seen from outside after the run.'}
  ];
  const ROWS=[['identity',['pid','ppid','uid','hostname']],['namespaces (inode numbers)',['ns_uts','ns_pid','ns_cgroup','ns_mnt','ns_net','ns_ipc','ns_user','ns_time']],
    ['what it can see',['procs_visible','root_entries','mounts','root_fs','net_ifaces','sysv_shm_segments']],['cgroup',['cgroup','memory_max_visible','pids_max_visible']],['privileges',['CapEff','NoNewPrivs','Seccomp']]];
  let cmp='prev';
  $('bl-steps').innerHTML=STEP.map((s,i)=>'<button data-i="'+i+'">'+i+'</button>').join('');
  function draw(i){
    const s=S[i],st=STEP[i],ref=i===0?null:(cmp==='prev'?S[i-1]:S[0]);
    [...$('bl-steps').children].forEach((b,k)=>{b.classList.toggle('on',k===i);b.classList.toggle('done',k<i)});
    $('bl-cap').innerHTML='<div class="t">Step '+i+': '+E(st.t)+'</div><p>'+E(st.p)+'</p>'+(st.k?'<p class="small">Kernel side: '+lk(st.k[0],st.k[1])+'</p>':'');
    $('bl-code').textContent=st.c;
    $('bl-tries').innerHTML=(s.tries||[]).map(t=>'<div class="try">'+(t[1]==='ok'?'<span class="pill ok">ok</span>':'<span class="pill bad">'+E(t[1])+'</span>')+' '+E(t[0])+'</div>').join('');
    const kv=i===9?S[8].kv:s.kv;
    let n=0;
    $('bl-view').innerHTML=ROWS.map(([g,keys])=>'<tr class="grp"><td colspan="2">'+g+'</td></tr>'+keys.map(k=>{const v=kv[k]||'',o=ref&&i<9?(ref.kv[k]||''):v,ch=o!==v;if(ch)n++;
      return '<tr'+(ch?' class="chg"':'')+'><td>'+E(k)+'</td><td>'+(ch?'<span class="was">'+E(o)+'</span>':'')+E(v)+'</td></tr>'}).join('')).join('');
    const out=$('bl-out');
    if(i===9){out.hidden=false;out.textContent=s.out+'\n\n### the upper layer, seen from outside after the run\n'+D.mini_upper}else out.hidden=true;
  }
  const a=RD.anim({card:'bl-card',ctl:'bl-ctl',n:STEP.length,draw,ms:2600,label:'Build step'});
  $('bl-steps').addEventListener('click',e=>{const b=e.target.closest('button');if(b)a.go(+b.dataset.i)});
  RD.seg($('bl-cmp'),m=>{cmp=m;a.redraw()});
})();
