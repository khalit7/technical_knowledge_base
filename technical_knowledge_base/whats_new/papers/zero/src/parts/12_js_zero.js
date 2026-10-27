// ---- ZeRO's memory and communication model (Sections 3, 5 and 7), shared by every tab ----
const RC=PAPER.rc, TBL=PAPER.tables;
const STAGES=['dp','os','os_g','os_g_p'];
const SNAME={dp:'Baseline DP',os:'ZeRO-1 (P<sub>os</sub>)',os_g:'ZeRO-2 (P<sub>os+g</sub>)',os_g_p:'ZeRO-3 (P<sub>os+g+p</sub>)'};
const SSHORT={dp:'DDP',os:'ZeRO-1',os_g:'ZeRO-2',os_g_p:'ZeRO-3'};
// per-device model-state bytes for psi parameters (Figure 1, §5.1 to §5.3)
function zStates(psi,nd,st,k){k=k==null?12:k;
  if(st==='dp')return (4+k)*psi; if(st==='os')return 4*psi+k*psi/nd; if(st==='os_g')return 2*psi+(2+k)*psi/nd; return (4+k)*psi/nd}
// split into [params, grads, optimizer] bytes
function zParts(psi,nd,st,k){k=k==null?12:k;
  return [st==='os_g_p'?2*psi/nd:2*psi, (st==='os_g'||st==='os_g_p')?2*psi/nd:2*psi, st==='dp'?k*psi:k*psi/nd]}
const zComm=st=>st==='os_g_p'?3:2; // elements per process, in units of psi (§7)
// largest model that fits, model states only, on mem bytes per GPU with nd DP and nm MP
function zMax(mem,nd,nm,st,k){k=k==null?12:k;const per=st==='dp'?4+k:st==='os'?4+k/nd:st==='os_g'?2+(2+k)/nd:(4+k)/nd;return mem/per*nm}
const ND_STEPS=[1,2,4,8,16,32,64,128,256,512,1024];
const gb=(b,d)=>{const v=b/1e9;return fmt(v,d!=null?d:v>=100?0:v>=10?1:v>=1?2:3)};
const psiTxt=p=>p>=1e12?fmt(p/1e12,p/1e12<10?1:0)+'T':p>=1e11?fmt(p/1e9,0)+'B':fmt(p/1e9,1)+'B';
const COL={p:'var(--c1)',g:'var(--c2)',o:'var(--c3)'};
// fill the numbers the prose quotes from recompute.py
function fillRC(){const S=(id,v)=>{const e=$(id);if(e)e.textContent=v};
  S('rdAct',fmt(RC.act.gpt2_full_GB,1));S('rdCk',fmt(RC.act.gpt2_ckpt_inputs_GB,1));S('rdCk2',fmt(RC.act.gpt2_ckpt_plus_one_layer_GB,1));
  S('paPct',fmt(RC.pa_comm.ratio_pct,1));S('a100e',fmt(RC.act100.elements_e9,1));S('a100g',fmt(RC.act100.fp16_GB,1));S('a100gi',fmt(RC.act100.fp16_GiB,1));S('a100p',fmt(RC.act100.pa16_fp16_GB,1));
  S('tr1',fmt(RC.trillion_dp1024_GB,1));S('gapR',fmt(RC.gap.ratio));S('gapD',fmt(RC.gap.days_at_3000x,1));
  S('r40',fmt(RC.results.size_vs_40B,2));S('r20',fmt(RC.results.size_vs_20B,1));S('r15',fmt(RC.results.aggregate_PF,1));S('rpk',fmt(RC.results.pct_peak_38,1));
  const rs=RC.t2.rows.map(r=>r.measured_ratio*100);S('t2r',fmt(Math.min(...rs),0)+' to '+fmt(Math.max(...rs),0)+'%');
  S('cmEx',fmt(RC.comm.exact_ring_n64,3));S('thM20',fmt(RC.mtnlg.TB_at_20,1));S('thM16',fmt(RC.mtnlg.TB_at_16,1))}
fillRC();
