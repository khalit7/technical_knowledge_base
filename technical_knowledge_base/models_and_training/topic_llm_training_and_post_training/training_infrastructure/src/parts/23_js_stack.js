// ---- Reading, The stack: clickable layers and one GPU failure walked through them ----
(function(){
  const A=(t,u)=>'<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+t+'</a>';
  const L3=u=>A(u||'Llama 3 §3.3.4','https://arxiv.org/html/2407.21783v3#S3.SS3.SSS4');
  const FR=A('Flight Recorder tutorial','https://docs.pytorch.org/tutorials/unstable/flight_recorder_tutorial.html');
  const HP=A('HyperPod auto-resume docs','https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-hyperpod-resiliency-slurm-auto-resume.html');
  const TF=A('torchft post','https://pytorch.org/blog/fault-tolerant-llama-training-with-2000-synthetic-failures-every-15-seconds-and-no-checkpoints-on-crusoe-l40s/');
  const DCP=A('DCP docs','https://docs.pytorch.org/docs/stable/distributed.checkpoint.html');
  // bottom to top; drawn top to bottom in reverse
  const LY=[
    {id:'hw',nm:'Hardware and fabric',ex:'8-GPU servers (H100, H200, B200 class), NVLink and NVSwitch inside; InfiniBand, RoCE or EFA between; Lustre, FSx, GPFS or object storage',
     own:'Compute, the two networks, and the storage that holds data and checkpoints. GPU servers of the 8×H100/H200/B200 class connect their GPUs with NVLink and NVSwitch inside the server and InfiniBand, RoCE or AWS EFA across servers; data and checkpoints sit on a parallel filesystem (Lustre, Amazon FSx, GPFS) or object storage. Llama 3: 8 H100s per Grand Teton server, a RoCE fabric of 24K GPUs in pods of 3,072 with full bisection bandwidth and 1:7 oversubscription between pods, and Tectonic storage at 2 TB/s sustained ('+A('§3.3.1','https://arxiv.org/html/2407.21783v3#S3.SS3.SSS1')+'). Accelerators and NVLink domains are on %%TH%%.'},
    {id:'hc',nm:'Node health',ex:'DCGM diagnostics, ECC and Xid counters, EFA tests, pre-job burn-in, cordoning',
     own:'Deciding whether a machine is fit to run: diagnostics before a job (burn-in, '+A('DCGM','https://docs.nvidia.com/datacenter/dcgm/latest/user-guide/dcgm-diagnostics.html')+'), counters during it (ECC errors, NIC and EFA errors), and cordoning or draining a bad node so the scheduler stops placing work there. HyperPod runs a health-monitoring agent plus basic and deep health checks ('+HP+').'},
    {id:'sch',nm:'Scheduler',ex:'SLURM (sbatch, srun, --requeue, --switches); Kubernetes with Kubeflow, Volcano or Kueue; Meta MAST',
     own:'Queues, all-or-nothing allocation of every node a job needs, topology-aware placement (SLURM\'s <code>--switches</code> caps the leaf switches a job spans), requeue after node failure. SLURM: job queues, <code>sbatch</code> and <code>srun</code>; Kubernetes with Kubeflow, Volcano or Kueue for batch jobs; Llama 3 used Meta\'s global scheduler '+A('MAST','https://www.usenix.org/conference/osdi24/presentation/choudhury')+', aware of the network topology.'},
    {id:'mg',nm:'Managed cluster',ex:'AWS SageMaker HyperPod; Google Cloud Cluster Toolkit, Vertex AI; Azure CycleCloud; CoreWeave, Lambda, Nebius',
     own:'The three layers below as a service. AWS SageMaker HyperPod: provisioned EFA-connected clusters with SLURM or EKS as the orchestrator, deep health checks, automatic replacement of faulty nodes and job auto-resume from the last checkpoint ('+HP+'). Equivalents: Google Cloud Cluster Toolkit and Vertex AI, Azure CycleCloud, and neoclouds such as CoreWeave, Lambda and Nebius.'},
    {id:'ln',nm:'Launcher',ex:'torchrun and its elastic agent; srun',
     own:'Starting one process per GPU on every node, wiring up rendezvous, restarting workers or the whole set when one dies, and (elastic mode) admitting or dropping nodes between a minimum and maximum ('+A('torchrun','https://docs.pytorch.org/docs/stable/elastic/run.html')+').'},
    {id:'cl',nm:'Collectives',ex:'NCCL (Meta\'s fork NCCLX), Gloo; watchdog timeouts; Flight Recorder',
     own:'All-reduce, all-gather, reduce-scatter, all-to-all and point-to-point between GPUs, over NVLink inside a server and the network outside. A watchdog aborts a collective that hangs; Flight Recorder keeps a ring buffer of every collective per rank and dumps it on timeout ('+FR+'). Llama 3 ran on NCCLX, a fork of NCCL, with automatic timeouts on NVLink stalls ('+L3()+').'},
    {id:'fw',nm:'Framework',ex:'Megatron Core and Bridge, NeMo, torchtitan, DeepSpeed, Hugging Face stack; DCP checkpoints; torchft',
     own:'The training loop, the parallel layout, mixed precision, checkpoint save and load (DCP, with resharding: '+DCP+'), and in fault-tolerant setups the quorum and peer recovery (torchft). Listed below, under Training frameworks.'},
    {id:'ex',nm:'Experiment layer',ex:'Weights & Biases, MLflow, TensorBoard; config management; data versioning',
     own:'Metrics, dashboards and alerts (step time, per-rank timing, loss, gradient norm, NCCL and ECC errors), configuration management and data versioning. More on %%ML%%.'}
  ];
  const fill=s=>s.replace('%%TH%%','<a href="https://app.notion.com/p/3c65c17b0d0d8118beeefaed56da6f8e" target="_blank" rel="noopener noreferrer">Topic: hardware</a>').replace('%%ML%%','<a href="https://app.notion.com/p/3c65c17b0d0d81b5925bfd1d8665dd4b" target="_blank" rel="noopener noreferrer">Topic: ml-infra-and-orchestration</a>');
  const STEPS={
    job:[
      {l:'hw',t:'1. A GPU fails',c:'One of 16,384 GPUs reports an uncorrectable HBM3 memory error (72 of Llama 3\'s 419 unexpected interruptions). Its kernels stop; when an NVLink peer or its link fails, the symptom is a load or store that never returns, with no error code ('+L3()+').'},
      {l:'cl',t:'2. Everyone else waits; the watchdog fires',c:'Every other rank sits in the next all-reduce waiting for it. The collectives watchdog times out, and Flight Recorder writes one trace file per rank, from which its analyzer finds the rank that never joined ('+FR+').'},
      {l:'ln',t:'3. The job comes down',c:'Process groups abort, worker processes exit, and the launcher reports the job step as failed. In a synchronous job all 16,384 GPUs stop, not just the broken one.'},
      {l:'hc',t:'4. Health checks find the machine',c:'Diagnostics (nvidia-smi, DCGM, EFA tests) confirm the bad server and mark it for drain; HyperPod marks the node "regardless of job-level status" ('+HP+').'},
      {l:'sch',t:'5. Requeue onto a spare',c:'The scheduler requeues the job (SLURM <code>--requeue</code>) and the managed layer swaps the faulty server for a spare (HyperPod: nodes are always replaced, not rebooted, under auto-resume).'},
      {l:'fw',t:'6. Reload the last checkpoint',c:'All ranks restart, rebuild process groups, and load the latest checkpoint with DCP, resharding if the layout changed ('+DCP+'). Everything computed since that checkpoint is computed again.'},
      {l:'ex',t:'7. The dashboard shows a gap',c:'Throughput drops to zero for the restart and the repeated work. Someone reads the Flight Recorder analysis and files the root cause; for Llama 3, automation handled all but three of 419 in 54 days.'}],
    ft:[
      {l:'hw',t:'1. A GPU fails',c:'The same HBM3 error, on one GPU in replica group 7 of 16. Each group is an ordinary FSDP job; groups are joined only by a fault-tolerant all-reduce of gradients.'},
      {l:'cl',t:'2. That step\'s gradient sync fails',c:'The cross-group all-reduce errors out (torchft used Gloo with 5-second timeouts in its demonstration). Every group discards that step\'s gradients instead of applying a partial update: each step is committed or rolled back like a database transaction ('+TF+').'},
      {l:'fw',t:'3. The other 15 groups carry on',c:'A Lighthouse server, which tracks every group by heartbeat, forms a new quorum without group 7; the next step commits with 15 groups, a batch one-sixteenth smaller.'},
      {l:'hc',t:'4. Health checks find the machine',c:'The bad server is diagnosed and drained as before, but only group 7 is waiting for it.'},
      {l:'sch',t:'5. Only group 7 is restarted',c:'Each group runs as its own SLURM job; a monitor relaunches the missing one on healthy nodes. The launcher restarts 1/16 of the GPUs, not all of them.'},
      {l:'fw',t:'6. Weights come from a peer, not storage',c:'Group 7 joins the quorum and copies weights and optimizer state from a healthy group at runtime; no checkpoint is read, and nothing already trained is repeated ('+TF+').'},
      {l:'ex',t:'7. A dip, not a gap',c:'Throughput dips by one group for the recovery, and the loss curve shows small spikes from averaging in the recovering group\'s stale loss. Demonstrated on 300 L40S GPUs, not at 16,384.'}]
  };
  const box=document.getElementById('st-layers');if(!box)return;
  let mode='job',sel=null;
  box.innerHTML=LY.slice().reverse().map(l=>'<button class="ly" data-l="'+l.id+'" aria-pressed="false"><span class="nm">'+l.nm+'</span><span class="ex">'+RD.esc(l.ex)+'</span></button>').join('');
  const det=document.getElementById('st-det');
  function showDet(id){const l=LY.find(x=>x.id===id);sel=id;
    box.querySelectorAll('.ly').forEach(b=>{b.classList.toggle('sel',b.dataset.l===id);b.setAttribute('aria-pressed',b.dataset.l===id?'true':'false')});
    det.innerHTML='<h3>'+l.nm+'</h3><p class="small"><b>What it owns.</b> '+fill(l.own)+'</p>'}
  box.addEventListener('click',e=>{const b=e.target.closest('.ly');if(b)showDet(b.dataset.l)});
  function draw(i){const S=STEPS[mode],s=S[i];
    const seen=new Set(S.slice(0,i).map(x=>x.l));
    box.querySelectorAll('.ly').forEach(b=>{const id=b.dataset.l;b.classList.toggle('act',id===s.l);b.classList.toggle('done',id!==s.l&&seen.has(id));
      b.classList.toggle('skip',mode==='ft'&&id==='ln'&&i<4)});
    document.getElementById('st-t').textContent=s.t;document.getElementById('st-c').innerHTML=s.c;
    showDet(s.l)}
  const an=RD.anim({card:'st-card',ctl:'st-ctl',n:STEPS.job.length,draw,ms:3400,label:'Step of the failure walk'});
  document.getElementById('st-modes').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.m;
    document.querySelectorAll('#st-modes button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});an.reset(STEPS[mode].length)});
})();
