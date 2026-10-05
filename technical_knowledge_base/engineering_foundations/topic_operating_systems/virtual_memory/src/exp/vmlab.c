// vmlab.c: the virtual memory child's measurements, one subcommand each.
// Build: gcc -O2 -pthread -o /tmp/vmlab vmlab.c      Run inside kb-os-vm:1 (Linux 5.10, arm64, 4 KiB pages).
//   faults   first touch of 64 MiB anonymous memory: 4 KiB pages vs transparent huge pages,
//            reading before writing (the shared zero page), MAP_POPULATE
//   bloat    touch one byte in every 2 MiB of 256 MiB: resident memory with 4 KiB pages vs THP
//   pte      page-table memory (VmPTE) after touching 1 GiB with 4 KiB pages vs THP
//   fork     fork+exit+wait time with 0, 256 and 1024 MiB resident, 4 KiB vs THP; then copy-on-write
//            fault cost: the child writes every page once
//   shoot    mprotect cost (forces a TLB flush) with 0..3 other threads of the process running on other CPUs
//   mlock    mlock under the container's default RLIMIT_MEMLOCK, and with it raised
//   commit   overcommit: reserve far more than exists; Committed_AS before and after
#define _GNU_SOURCE
#include <errno.h>
#include <pthread.h>
#include <sched.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>
#include <sys/mman.h>
#include <sys/resource.h>
#include <sys/wait.h>

#define MIB (1UL << 20)
#define HUGE (2UL << 20)
static long PG;
static double now(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return t.tv_sec+t.tv_nsec*1e-9;}
static long minflt(void){struct rusage r;getrusage(RUSAGE_SELF,&r);return r.ru_minflt;}
static long majflt(void){struct rusage r;getrusage(RUSAGE_SELF,&r);return r.ru_majflt;}
// one field (kB) from a /proc file of this process
static long kb(const char*file,const char*key){FILE*f=fopen(file,"r");char l[256];long v=-1;size_t n=strlen(key);
  while(f&&fgets(l,sizeof l,f))if(!strncmp(l,key,n)&&l[n]==':'){v=atol(l+n+1);break;}if(f)fclose(f);return v;}
static long rss(void){return kb("/proc/self/status","VmRSS");}
// 2 MiB aligned anonymous region, advised for 4 KiB pages or for huge pages
static char*region(size_t len,int huge){char*raw=mmap(0,len+HUGE,PROT_READ|PROT_WRITE,MAP_PRIVATE|MAP_ANONYMOUS,-1,0);
  if(raw==MAP_FAILED){perror("mmap");exit(1);}char*a=(char*)(((unsigned long)raw+HUGE-1)&~(HUGE-1));
  madvise(a,len,huge?MADV_HUGEPAGE:MADV_NOHUGEPAGE);return a;}
static const char*kind(int huge){return huge?"thp":"4k";}

static void faults(void){
  size_t len=64*MIB;
  for(int rep=0;rep<3;rep++)for(int huge=0;huge<2;huge++){
    char*a=region(len,huge);long f0=minflt(),r0=rss();double t=now();
    for(size_t i=0;i<len;i+=PG)a[i]=1;
    double dt=now()-t;long f1=minflt();
    printf("first_write %s rep %d faults %ld ms %.2f rss_delta_kb %ld anonhuge_kb %ld\n",kind(huge),rep,f1-f0,dt*1e3,rss()-r0,kb("/proc/self/smaps_rollup","AnonHugePages"));
    munmap(a,len);}
  // read every page first: the kernel maps the shared zero page (no memory used), then each write faults again
  for(int rep=0;rep<3;rep++){char*a=region(len,0);volatile long s=0;long f0=minflt(),r0=rss();double t=now();
    for(size_t i=0;i<len;i+=PG)s+=a[i];
    double dr=now()-t;long f1=minflt(),r1=rss();t=now();
    for(size_t i=0;i<len;i+=PG)a[i]=1;
    double dw=now()-t;long f2=minflt();
    printf("read_then_write 4k rep %d read_faults %ld read_ms %.2f rss_after_read_kb %ld write_faults %ld write_ms %.2f rss_after_write_kb %ld\n",rep,f1-f0,dr*1e3,r1-r0,f2-f1,dw*1e3,rss()-r0);
    munmap(a,len);}
  // MAP_POPULATE: the kernel faults everything in during mmap itself
  for(int rep=0;rep<3;rep++){long f0=minflt();double t=now();
    char*a=mmap(0,len,PROT_READ|PROT_WRITE,MAP_PRIVATE|MAP_ANONYMOUS|MAP_POPULATE,-1,0);double dm=now()-t;long f1=minflt();t=now();
    for(size_t i=0;i<len;i+=PG)a[i]=1;double dw=now()-t;long f2=minflt();
    printf("populate 4k rep %d mmap_ms %.2f faults_during_mmap %ld write_ms %.2f write_faults %ld\n",rep,dm*1e3,f1-f0,dw*1e3,f2-f1);munmap(a,len);}
}

static void bloat(void){
  size_t len=256*MIB;
  for(int huge=0;huge<2;huge++){char*a=region(len,huge);long r0=rss(),f0=minflt();
    for(size_t i=0;i<len;i+=HUGE)a[i]=1;
    printf("bloat %s touched_bytes %lu rss_delta_kb %ld faults %ld anonhuge_kb %ld\n",kind(huge),len/HUGE,rss()-r0,minflt()-f0,kb("/proc/self/smaps_rollup","AnonHugePages"));
    munmap(a,len);}
}

static void pte(void){
  size_t len=1024*MIB;
  for(int huge=0;huge<2;huge++){long p0=kb("/proc/self/status","VmPTE");char*a=region(len,huge);
    for(size_t i=0;i<len;i+=PG)a[i]=1;
    printf("pte %s resident_kb %ld vmpte_delta_kb %ld anonhuge_kb %ld\n",kind(huge),rss(),kb("/proc/self/status","VmPTE")-p0,kb("/proc/self/smaps_rollup","AnonHugePages"));
    munmap(a,len);}
}

static void forks(void){
  size_t sizes[]={0,256*MIB,1024*MIB};
  for(int si=0;si<3;si++)for(int huge=0;huge<2;huge++){size_t len=sizes[si];char*a=len?region(len,huge):0;
    for(size_t i=0;i<len;i+=PG)a[i]=1;
    double best=1e9;for(int r=0;r<5;r++){double t=now();pid_t p=fork();if(!p)_exit(0);waitpid(p,0,0);double d=now()-t;if(d<best)best=d;}
    printf("fork %s resident_mib %lu fork_exit_wait_us %.1f vmpte_kb %ld\n",kind(huge),len/MIB,best*1e6,kb("/proc/self/status","VmPTE"));
    if(len==256*MIB){ // copy-on-write: the child writes every page; time per page against a first-touch fault
      int pfd[2];if(pipe(pfd))exit(1);pid_t p=fork();
      if(!p){long f0=minflt();double t=now();for(size_t i=0;i<len;i+=PG)a[i]=2;double d=now()-t;
        char b[200];int n=snprintf(b,sizeof b,"cow_write %s pages %lu faults %ld ms %.2f ns_per_page %.0f\n",kind(huge),len/PG,minflt()-f0,d*1e3,d*1e9/(len/PG));
        if(write(pfd[1],b,n)<0)_exit(1);_exit(0);}
      waitpid(p,0,0);char b[200];int n=read(pfd[0],b,sizeof b-1);if(n>0){b[n]=0;fputs(b,stdout);}close(pfd[0]);close(pfd[1]);}
    if(len)munmap(a,len);}
}

static volatile int stop_spin;
static char*shared_page;
static void*spin(void*arg){long cpu=(long)arg;cpu_set_t s;CPU_ZERO(&s);CPU_SET(cpu,&s);pthread_setaffinity_np(pthread_self(),sizeof s,&s);
  volatile long x=0;while(!stop_spin){x+=shared_page[0];}return 0;}
static void shoot(void){
  // the CPUs this container may use: the measuring thread on the first, spinning threads on the others
  cpu_set_t allowed;sched_getaffinity(0,sizeof allowed,&allowed);int cpus[64],ncpu=0;
  for(int c=0;c<64&&ncpu<64;c++)if(CPU_ISSET(c,&allowed))cpus[ncpu++]=c;
  cpu_set_t s;CPU_ZERO(&s);CPU_SET(cpus[0],&s);sched_setaffinity(0,sizeof s,&s);
  shared_page=mmap(0,PG,PROT_READ|PROT_WRITE,MAP_PRIVATE|MAP_ANONYMOUS,-1,0);shared_page[0]=1;
  char*mine=mmap(0,PG,PROT_READ|PROT_WRITE,MAP_PRIVATE|MAP_ANONYMOUS,-1,0);mine[0]=1;
  for(int k=0;k<4&&k<ncpu;k++){pthread_t th[4];stop_spin=0;
    for(int j=0;j<k;j++)pthread_create(&th[j],0,spin,(void*)(long)cpus[j+1]);
    usleep(100000);int N=20000;double best=1e9;
    for(int r=0;r<5;r++){double t=now();for(int i=0;i<N;i++){mprotect(mine,PG,PROT_READ);mprotect(mine,PG,PROT_READ|PROT_WRITE);mine[0]=(char)i;}
      double d=(now()-t)/(2.0*N);if(d<best)best=d;}
    stop_spin=1;for(int j=0;j<k;j++)pthread_join(th[j],0);
    printf("shootdown other_threads_running %d ns_per_mprotect %.0f (measuring on cpu %d)\n",k,best*1e9,cpus[0]);}
  // the same call when the page is not present: nothing to flush
  char*cold=mmap(0,PG,PROT_READ|PROT_WRITE,MAP_PRIVATE|MAP_ANONYMOUS,-1,0);int N=20000;double t=now();
  for(int i=0;i<N;i++){mprotect(cold,PG,PROT_READ);mprotect(cold,PG,PROT_READ|PROT_WRITE);}
  printf("shootdown page_never_touched 0 ns_per_mprotect %.0f\n",(now()-t)/(2.0*N)*1e9);
}

static void mlocks(void){
  struct rlimit rl;getrlimit(RLIMIT_MEMLOCK,&rl);
  printf("rlimit_memlock_kb soft %ld hard %ld\n",rl.rlim_cur==RLIM_INFINITY?-1L:(long)(rl.rlim_cur>>10),rl.rlim_max==RLIM_INFINITY?-1L:(long)(rl.rlim_max>>10));
  size_t len=256*MIB;char*a=mmap(0,len,PROT_READ|PROT_WRITE,MAP_PRIVATE|MAP_ANONYMOUS,-1,0);
  long f0=minflt();double t=now();int r=mlock(a,len);double d=now()-t;
  printf("mlock 256MiB ret %d errno %s ms %.1f faults %ld vmlck_kb %ld rss_kb %ld\n",r,r?strerror(errno):"0",d*1e3,minflt()-f0,kb("/proc/self/status","VmLck"),rss());
  r=mlock(a,32*1024);printf("mlock 32KiB ret %d errno %s vmlck_kb %ld\n",r,r?strerror(errno):"0",kb("/proc/self/status","VmLck"));
}

static void commit(void){
  printf("before Committed_AS_kb %ld CommitLimit_kb %ld MemTotal_kb %ld SwapTotal_kb %ld\n",kb("/proc/meminfo","Committed_AS"),kb("/proc/meminfo","CommitLimit"),kb("/proc/meminfo","MemTotal"),kb("/proc/meminfo","SwapTotal"));
  size_t big=64UL<<30;char*a=mmap(0,big,PROT_READ|PROT_WRITE,MAP_PRIVATE|MAP_ANONYMOUS,-1,0);
  printf("mmap 64GiB private: %s; VmSize_kb %ld VmRSS_kb %ld Committed_AS_kb %ld\n",a==MAP_FAILED?strerror(errno):"ok",kb("/proc/self/status","VmSize"),rss(),kb("/proc/meminfo","Committed_AS"));
  char*b=mmap(0,big,PROT_READ|PROT_WRITE,MAP_PRIVATE|MAP_ANONYMOUS|MAP_NORESERVE,-1,0);
  printf("mmap 64GiB MAP_NORESERVE: %s; Committed_AS_kb %ld\n",b==MAP_FAILED?strerror(errno):"ok",kb("/proc/meminfo","Committed_AS"));
  if(a!=MAP_FAILED)munmap(a,big);if(b!=MAP_FAILED)munmap(b,big);
  void*m=malloc(32UL<<30);printf("malloc 32GiB: %s\n",m?"non-NULL":"NULL");free(m);
}

int main(int argc,char**argv){PG=sysconf(_SC_PAGESIZE);if(argc<2){fprintf(stderr,"usage\n");return 2;}
  const char*c=argv[1];setvbuf(stdout,0,_IOLBF,0);
  if(!strcmp(c,"faults"))faults();else if(!strcmp(c,"bloat"))bloat();else if(!strcmp(c,"pte"))pte();
  else if(!strcmp(c,"fork"))forks();else if(!strcmp(c,"shoot"))shoot();else if(!strcmp(c,"mlock"))mlocks();
  else if(!strcmp(c,"commit"))commit();else return 2;
  (void)majflt;return 0;}
