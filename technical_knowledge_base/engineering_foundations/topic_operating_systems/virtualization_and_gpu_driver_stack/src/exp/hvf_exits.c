// macOS contrast, run natively on the laptop (not in the VM): Apple's Hypervisor.framework, the
// hardware-virtualization API that Docker Desktop's QEMU (-accel hvf) is built on.
// A tiny VM with one vCPU and 2 instructions of guest code; measures how long one VM exit takes,
// out of the guest into this process and back, for three exit reasons, and how long it takes
// another host thread to force a running vCPU out (hv_vcpus_exit, what QEMU does to deliver an
// interrupt to a running vCPU). Also: the same pipe ping-pong as in the VM, run natively.
// Build: clang -O2 -o hvf_exits hvf_exits.c -framework Hypervisor && codesign -s - --entitlements ent.plist hvf_exits
#include <Hypervisor/Hypervisor.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <pthread.h>
#include <time.h>
#include <sys/mman.h>
#include <stdatomic.h>
static double now(void){return (double)clock_gettime_nsec_np(CLOCK_UPTIME_RAW);}
#define CHK(x) do{hv_return_t r=(x);if(r!=HV_SUCCESS){fprintf(stderr,"%s failed: %d\n",#x,r);exit(1);}}while(0)
static int cmp(const void*a,const void*b){double x=*(double*)a,y=*(double*)b;return x<y?-1:x>y;}
static const uint64_t IPA=0x10000;
static uint32_t*mem;static hv_vcpu_t cpu;static hv_vcpu_exit_t*ex;
static void load(uint32_t i0,uint32_t i1){mem[0]=i0;mem[1]=i1;
  CHK(hv_vcpu_set_reg(cpu,HV_REG_PC,IPA));CHK(hv_vcpu_set_reg(cpu,HV_REG_CPSR,0x3c5));
  CHK(hv_vcpu_set_reg(cpu,HV_REG_X2,0x800000));} // x2: an address with no memory behind it
static void bench(const char*name,uint32_t i0,int advance,int n){load(i0,0x17ffffff); // i1: b . -4
  double*t=malloc(n*sizeof(double));unsigned ec=0;
  for(int i=-200;i<n;i++){double a=now();CHK(hv_vcpu_run(cpu));double b=now();
    if(ex->reason!=HV_EXIT_REASON_EXCEPTION){fprintf(stderr,"unexpected exit %d\n",ex->reason);exit(1);}
    ec=(unsigned)(ex->exception.syndrome>>26);
    if(advance){uint64_t pc;hv_vcpu_get_reg(cpu,HV_REG_PC,&pc);hv_vcpu_set_reg(cpu,HV_REG_PC,pc+4);}
    if(i>=0)t[i]=b-a;}
  qsort(t,n,sizeof(double),cmp);
  printf("exit %-34s EC 0x%02x n %d median_us %.3f p10_us %.3f p90_us %.3f\n",name,ec,n,t[n/2]/1e3,t[n/10]/1e3,t[n*9/10]/1e3);free(t);}
static _Atomic long go_seq,done_seq;static _Atomic int quit,retried;static double t_kick;
// the kicker waits until the vCPU has had time to enter the guest, then forces it out; if the kick
// arrived before the vCPU was running (it is then lost), it kicks again and the sample is dropped
static void*kicker(void*x){long seen=0;for(;;){
    while(atomic_load(&go_seq)==seen&&!atomic_load(&quit)){}
    if(atomic_load(&quit))return 0;
    seen=atomic_load(&go_seq);usleep(200);t_kick=now();hv_vcpus_exit(&cpu,1);
    while(atomic_load(&done_seq)!=seen){if(now()-t_kick>2e6){atomic_store(&retried,1);t_kick=now();hv_vcpus_exit(&cpu,1);}}}}
// a host thread forces a running vCPU out: time from hv_vcpus_exit() to hv_vcpu_run() returning
static void kickbench(int n){load(0x14000000,0x14000000);// b . (spin in the guest)
  pthread_t th;atomic_store(&quit,0);pthread_create(&th,0,kicker,0);double*t=malloc(n*sizeof(double));int k=0,drop=0;
  for(int i=-50;k<n;i++){CHK(hv_vcpu_set_reg(cpu,HV_REG_PC,IPA));atomic_store(&retried,0);long q=atomic_fetch_add(&go_seq,1)+1;
    CHK(hv_vcpu_run(cpu));double b=now();double tk=t_kick;int rt=atomic_load(&retried);atomic_store(&done_seq,q);
    if(ex->reason!=HV_EXIT_REASON_CANCELED){fprintf(stderr,"kick: exit %d\n",ex->reason);exit(1);}
    if(rt){drop++;continue;}if(i>=0)t[k++]=b-tk;}
  atomic_store(&quit,1);pthread_join(th,0);qsort(t,n,sizeof(double),cmp);
  printf("kick (hv_vcpus_exit from another thread to run() returning) n %d median_us %.3f p10_us %.3f p90_us %.3f dropped %d\n",n,t[n/2]/1e3,t[n/10]/1e3,t[n*9/10]/1e3,drop);free(t);}
// wake a host thread sleeping in pselect() with pthread_kill(), the way QEMU wakes an idle vCPU thread
// (hvf_wait_for_ipi / hvf_kick_vcpu_thread); the waker spins until the sleeper reports it is running
#include <signal.h>
#include <sys/select.h>
static _Atomic long w_seq,w_ack;static pthread_t sleeper_th;
static void on_usr1(int s){(void)s;}
static void*sleeper(void*x){sigset_t blk,unblk;sigemptyset(&blk);sigaddset(&blk,SIGUSR1);pthread_sigmask(SIG_BLOCK,&blk,&unblk);
  sigemptyset(&unblk);for(;;){long q=atomic_load(&w_seq);if(q<0)return 0;if(q!=atomic_load(&w_ack)){atomic_store(&w_ack,q);continue;}
    pselect(0,0,0,0,NULL,&unblk);}}
static void wakebench(int n){struct sigaction sa;memset(&sa,0,sizeof sa);sa.sa_handler=on_usr1;sigaction(SIGUSR1,&sa,0);
  atomic_store(&w_seq,0);atomic_store(&w_ack,0);pthread_create(&sleeper_th,0,sleeper,0);double*t=malloc(n*sizeof(double));
  for(int i=-20;i<n;i++){usleep(1000);long q=atomic_load(&w_seq)+1;double a=now();atomic_store(&w_seq,q);pthread_kill(sleeper_th,SIGUSR1);
    while(atomic_load(&w_ack)!=q){}double b=now();if(i>=0)t[i]=b-a;}
  atomic_store(&w_seq,-1);pthread_kill(sleeper_th,SIGUSR1);pthread_join(sleeper_th,0);qsort(t,n,sizeof(double),cmp);
  printf("wake an idle thread sleeping in pselect (pthread_kill, as QEMU does) n %d median_us %.3f p10_us %.3f p90_us %.3f\n",n,t[n/2]/1e3,t[n/10]/1e3,t[n*9/10]/1e3);free(t);}
static void pipe_pp(int n){int p1[2],p2[2];char c=0;pipe(p1);pipe(p2);pid_t pid=fork();
  if(!pid){for(int i=0;i<n+1000;i++){read(p1[0],&c,1);write(p2[1],&c,1);}_exit(0);}
  for(int i=0;i<1000;i++){write(p1[1],&c,1);read(p2[0],&c,1);}
  double a=now();for(int i=0;i<n;i++){write(p1[1],&c,1);read(p2[0],&c,1);}double t=now()-a;
  printf("native pipe ping-pong (macOS chooses the cores) n %d round_trip_us %.3f one_way_us %.3f\n",n,t/n/1e3,t/n/2e3);}
int main(void){
  setvbuf(stdout,0,_IOLBF,0);
  CHK(hv_vm_create(NULL));
  mem=mmap(0,0x4000,PROT_READ|PROT_WRITE,MAP_ANON|MAP_PRIVATE,-1,0);
  CHK(hv_vm_map(mem,IPA,0x4000,HV_MEMORY_READ|HV_MEMORY_WRITE|HV_MEMORY_EXEC));
  CHK(hv_vcpu_create(&cpu,&ex,NULL));
  for(int r=0;r<3;r++){
    printf("## run %d\n",r+1);
    bench("hvc #0 (hypercall)",0xd4000002,0,20000);
    bench("str x1,[x2] to unmapped memory (MMIO)",0xf9000041,1,20000);
    bench("wfi (idle instruction)",0xd503207f,1,20000);
    kickbench(2000);
    pipe_pp(20000);
    wakebench(2000);
  }
  return 0;}
