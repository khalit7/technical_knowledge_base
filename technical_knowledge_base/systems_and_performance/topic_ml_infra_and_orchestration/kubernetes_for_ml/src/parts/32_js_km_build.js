// ---- Manifest builder tab (t-kmb). Templates mirror src/k8s/train-indexed-job.sh, train-jobset.sh and e12-trainjob.yaml ----
window.KMB=(function(){
  const $=id=>document.getElementById(id),E=RD.esc;
  // text generators: with (n,p,g)=(2,2,2) they reproduce the shell generators' output exactly
  function indexed(N,P,o){o=o||{};const n=o.n||2,p=o.p||2,g=o.g||2,extra=o.extra||'';const BL=(P==='nopolicy0'||P==='disrupt0')?0:2;
    let s='apiVersion: v1\nkind: Service\nmetadata: {name: '+N+', namespace: km}\nspec:\n  clusterIP: None\n  selector: {job-name: '+N+'}\n  publishNotReadyAddresses: true\n---\n'+
      'apiVersion: batch/v1\nkind: Job\nmetadata: {name: '+N+', namespace: km}\nspec:\n  completions: '+n+'\n  parallelism: '+n+'\n  completionMode: Indexed\n  backoffLimit: '+BL+'\n';
    if(P==='exit13')s+='  podFailurePolicy:\n    rules:\n    - action: FailJob\n      onExitCodes: {containerName: trainer, operator: In, values: [13]}\n';
    if(P==='exit13ok')s+='  podFailurePolicy:\n    rules:\n    - action: FailJob\n      onExitCodes: {containerName: trainer, operator: In, values: [1]}\n';
    if(P==='disrupt0')s+='  podFailurePolicy:\n    rules:\n    - action: Ignore\n      onPodConditions:\n      - {type: DisruptionTarget}\n';
    s+='  template:\n    spec:\n      restartPolicy: Never\n      subdomain: '+N+'\n      containers:\n      - name: trainer\n        image: mi-train:1\n        imagePullPolicy: Never\n        command: ["sh", "-c"]\n        args:\n        - >-\n'+
      '          exec torchrun --nnodes='+n+' --nproc-per-node='+p+' --node-rank=$JOB_COMPLETION_INDEX\n          --master-addr='+N+'-0.'+N+' --master-port=29500\n          /opt/mi/train.py --ckpt-dir=/shared/ckpt/'+N+' --log-dir=/shared/logs/'+N+' '+extra+'\n'+
      '        resources:\n          requests: {cpu: 500m, memory: 400Mi, example.com/gpu: "'+g+'"}\n          limits: {cpu: "2", memory: 900Mi, example.com/gpu: "'+g+'"}\n        volumeMounts:\n        - {name: shared, mountPath: /shared}\n      volumes:\n      - name: shared\n        hostPath: {path: /shared, type: Directory}\n';
    return s}
  function jobset(N,M,Q,o){o=o||{};const n=o.n||2,p=o.p||2,g=o.g||2,extra=o.extra||'';
    let s='apiVersion: jobset.x-k8s.io/v1alpha2\nkind: JobSet\nmetadata:\n  name: '+N+'\n  namespace: km\n';
    if(Q&&Q!=='-')s+='  labels: {kueue.x-k8s.io/queue-name: '+Q+'}\n';
    s+='spec:\n';
    s+=M==='policy'?'  failurePolicy:\n    maxRestarts: 0\n    rules:\n    - name: disruptedRestartFree\n      action: RestartJobSetAndIgnoreMaxRestarts\n      onJobFailureReasons: [PodFailurePolicy]\n':'  failurePolicy: {maxRestarts: 0}\n';
    s+='  replicatedJobs:\n  - name: node\n    replicas: 1\n    template:\n      spec:\n        parallelism: '+n+'\n        completions: '+n+'\n        completionMode: Indexed\n        backoffLimit: 0\n';
    if(M==='policy')s+='        podFailurePolicy:\n          rules:\n          - action: FailJob\n            onPodConditions:\n            - {type: DisruptionTarget}\n';
    s+='        template:\n          spec:\n            restartPolicy: Never\n            containers:\n            - name: trainer\n              image: mi-train:1\n              imagePullPolicy: Never\n              command: ["sh", "-c"]\n              args:\n              - >-\n'+
      '                exec torchrun --nnodes='+n+' --nproc-per-node='+p+' --node-rank=$JOB_COMPLETION_INDEX\n                --master-addr='+N+'-node-0-0.'+N+' --master-port=29500\n                /opt/mi/train.py --ckpt-dir=/shared/ckpt/'+N+' --log-dir=/shared/logs/'+N+' '+extra+'\n'+
      '              resources:\n                requests: {cpu: 500m, memory: 400Mi, example.com/gpu: "'+g+'"}\n                limits: {cpu: "2", memory: 900Mi, example.com/gpu: "'+g+'"}\n              volumeMounts:\n              - {name: shared, mountPath: /shared}\n            volumes:\n            - name: shared\n              hostPath: {path: /shared, type: Directory}\n';
    return s}
  function trainjob(N,o){o=o||{};const n=o.n||2,p=o.p||2,g=o.g||2;
    return 'apiVersion: trainer.kubeflow.org/v1alpha1\nkind: TrainJob\nmetadata: {name: '+N+', namespace: km}\nspec:\n  runtimeRef: {name: torch-distributed}\n  trainer:\n    image: mi-train:1\n    numNodes: '+n+'\n    numProcPerNode: '+p+'\n'+
      '    command: ["torchrun", "/opt/mi/train.py", "--ckpt-dir=/tmp/ckpt", "--log-dir=/tmp/logs"]\n    resourcesPerNode:\n      requests: {cpu: 500m, memory: 400Mi, example.com/gpu: "'+g+'"}\n      limits: {cpu: "2", memory: 900Mi, example.com/gpu: "'+g+'"}\n'}
  const POL={indexed:[['none','backoffLimit 2, no rule'],['exit13','FailJob on exit code 13'],['exit13ok','FailJob on exit code 1'],['nopolicy0','backoffLimit 0, no rule'],['disrupt0','backoffLimit 0, Ignore DisruptionTarget']],
    jobset:[['plain','maxRestarts 0'],['policy','restart free on disruption']],jobsetq:[['plain','maxRestarts 0'],['policy','restart free on disruption']],trainjob:[['rt','the runtime\'s defaults']]};
  // measured outcomes: [layer, policy, event] -> text
  const MEAS={'indexed|none|ok':'Completed at 17.6 s; global loss 2.2638769149780273 (run e1, policy none, no crash).',
    'indexed|none|crash':'Both pods exited 1, retried after a 20 s backoff, failed again: Job Failed, BackoffLimitExceeded, at 34 s (run e2a).',
    'indexed|exit13|crash':'The rule never matched (the container exits 1, not 13): same as no rule, Failed with BackoffLimitExceeded at 34 s (run e2b).',
    'indexed|exit13ok|crash':'Failed at 11.6 s on the first attempt with reason PodFailurePolicy (run e2c).',
    'indexed|nopolicy0|evict':'The evicted pod and then its peer failed; Job Failed, BackoffLimitExceeded, at 18.7 s (run e2d1).',
    'indexed|disrupt0|evict':'The evicted pod was ignored (failed 1) but its peer exited 1 and counted: Failed, BackoffLimitExceeded, at 20.0 s (run e2d2).',
    'jobset|plain|ok':'JobSet Completed at 14.3 s (run e3a); the root ran the same through Kueue (the parent\'s running example on Kubernetes).',
    'jobset|policy|evict':'The Job failed with reason PodFailurePolicy, the JobSet restarted every pod (restarts: 1, not counted), the run resumed from its step-50 checkpoint and completed at 52.5 s (run e3b).',
    'jobset|policy|crash':'Job failed (BackoffLimitExceeded), no rule matched, maxRestarts 0 reached: JobSet Failed at 8.8 s, ReachedMaxRestarts (run e3c).',
    'jobsetq|plain|ok':'Kueue created the Workload, reserved quota and admitted it in the same second; the JobSet completed 18 s after creation (the parent\'s recorded run, src/data/runs/k8s).',
    'trainjob|rt|ok':'The Trainer controller built JobSet km-tj with the PET_* variables; Complete at 15.3 s after the JobSet appeared; loss 2.2638769149780273 (run e12).'};
  function derived(L,P,ev){if(ev==='ok')return 'Should complete like the measured runs. With another number of ranks the global batch is the same (32 sequences per step), so the loss should be close to 2.2639 but not bit for bit: the order of the sums changes.';
    if(L==='trainjob')return ev==='crash'?'The runtime sets restartPolicy OnFailure: the kubelet restarts the crashed container in place, the crash repeats, and the pod goes into CrashLoopBackOff until the Job\'s backoffLimit; no Job failure rule can see it.':'With restartPolicy OnFailure, the evicted pod is replaced by the Job controller and its peers\' containers restart in place; rendezvous must succeed again.';
    if(L==='indexed'){if(ev==='crash')return P==='exit13ok'?'(measured above)':'The crash repeats on every attempt: the Job fails once backoffLimit failed pods are counted.';
      return P==='disrupt0'||P==='nopolicy0'?'(measured above)':(P==='exit13ok'?'Danger: the peer of the evicted pod exits 1 and matches FailJob, so an eviction kills the Job.':'Each eviction costs failed pods from backoffLimit (2): the evicted one and its peer.')}
    if(ev==='evict')return P==='policy'?'As measured (run e3b); through Kueue the Workload stays admitted while the JobSet restarts.':'No rule: the Job fails (backoffLimit 0), the default action RestartJobSet spends a restart, maxRestarts 0: the JobSet fails.';
    return 'Job fails, no rule matches reason BackoffLimitExceeded, so RestartJobSet applies and maxRestarts 0 fails the JobSet (as in run e3c).'}
  function tree(L,N,n,P,Q){const pods=k=>Array.from({length:n},(_,i)=>k(i));const r=[];
    if(L==='trainjob'){r.push(['TrainJob '+N,'you']);r.push(['JobSet '+N,'Trainer controller (owner: the TrainJob)']);}
    if(L==='jobset'||L==='jobsetq'){r.push(['JobSet '+N,'you']);}
    if(L==='jobsetq')r.push(['Workload jobset-'+N+'-&lt;5 hex&gt;','Kueue (the JobSet waits suspended until it is admitted)']);
    if(L==='indexed'){r.push(['Service '+N+' (headless)','you']);r.push(['Job '+N,'you'])}
    else{r.push(['Service '+N+' (headless)','JobSet controller']);r.push(['Job '+N+'-node-0','JobSet controller'])}
    const pn=L==='indexed'?(i=>N+'-'+i):(i=>N+'-node-0-'+i);
    pods(i=>r.push(['Pod '+pn(i)+'-&lt;5 random&gt;, hostname '+pn(i)+(L==='trainjob'?', PET_NODE_RANK='+i:', JOB_COMPLETION_INDEX='+i),'job controller; bound by the scheduler'+(L==='jobsetq'?' (nodeSelector from the Kueue flavor)':'')]));
    r.push(['EndpointSlice for '+N,'endpointslice controller (DNS: '+pn(0)+'.'+N+')']);
    return r.map(x=>'<div><b>'+x[0]+'</b><br><span class="by">created by '+E(x[1])+'</span></div>').join('')}
  function render(){const L=$('km-b-layer').value;const pl=$('km-b-pol');const cur=pl.value;
    pl.innerHTML=POL[L].map(o=>'<option value="'+o[0]+'">'+o[1]+'</option>').join('');if(POL[L].some(o=>o[0]===cur))pl.value=cur;
    const P=pl.value,n=+$('km-b-n').value,p=+$('km-b-p').value,g=+$('km-b-g').value,ev=$('km-b-ev').value;
    const extra=ev==='crash'?'--steps 200 --crash-rank 1 --crash-step 20 --no-resume':(ev==='evict'?'--steps 200 --step-sleep-ms 150':'');
    const name=L==='trainjob'?'km-tj':'km-run';let y='';
    if(L==='indexed')y=indexed(name,P,{n,p,g,extra});else if(L==='trainjob')y=trainjob(name,{n,p,g});else y=jobset(name,P,L==='jobsetq'?'km-lq':'-',{n,p,g,extra});
    $('km-b-yaml').textContent=y;$('km-b-tree').innerHTML=tree(L,name,n,P);
    const key=L+'|'+P+'|'+ev,std=n===2&&p===2&&g===2,m=std&&MEAS[key];
    $('km-b-out').className='kres '+(m?'m':'d');
    $('km-b-out').innerHTML=(m?'<span class="meas">measured</span> ':'<span class="der">derived, not run</span> ')+E(m||derived(L,P,ev))+(n*g>12?' <b>'+n*g+' GPUs: more than the 12 this cluster has, so it would stay Pending (or wait in Kueue).</b>':'')}
  function init(){if(!$('km-b-card'))return;['km-b-layer','km-b-pol','km-b-n','km-b-p','km-b-g','km-b-ev'].forEach(id=>$(id).addEventListener('change',render));render()}
  init();
  return {indexed,jobset,trainjob,render};
})();
