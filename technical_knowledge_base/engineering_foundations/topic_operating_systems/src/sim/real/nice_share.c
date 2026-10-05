// CFS weights for real: two busy loops pinned to one CPU, one at nice 0 and one at nice N.
// After a fixed wall time we read each one's CPU time (utime+stime from /proc/<pid>/stat).
// Kernel v5.10 kernel/sched/core.c line 8457: weight(nice 0)=1024, nice 5=335, nice 10=110.
#define _GNU_SOURCE
#include <sched.h>
#include <signal.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/resource.h>
#include <sys/wait.h>
static void pin(int cpu){cpu_set_t s;CPU_ZERO(&s);CPU_SET(cpu,&s);sched_setaffinity(0,sizeof s,&s);}
static long cputicks(pid_t p){char f[64],buf[1024];sprintf(f,"/proc/%d/stat",p);FILE*x=fopen(f,"r");if(!x)return -1;
  if(!fgets(buf,sizeof buf,x)){fclose(x);return -1;}fclose(x);char*s=buf;for(int i=0;s&&i<13;i++){s=strchr(s,' ');if(s)s++;}
  long ut,st;sscanf(s,"%ld %ld",&ut,&st);return ut+st;}

int main(int argc,char**argv){
  int nice2=argc>1?atoi(argv[1]):5, secs=argc>2?atoi(argv[2]):10, cpu=argc>3?atoi(argv[3]):0;
  pid_t k[2];int nv[2]={0,nice2};
  for(int j=0;j<2;j++){k[j]=fork();if(k[j]==0){pin(cpu);setpriority(PRIO_PROCESS,0,nv[j]);volatile unsigned long x=0;for(;;)x++;}}
  sleep(secs);long t0=cputicks(k[0]),t1=cputicks(k[1]);
  for(int j=0;j<2;j++){kill(k[j],SIGKILL);waitpid(k[j],0,0);}
  double hz=sysconf(_SC_CLK_TCK);
  printf("nice 0 vs nice %d on cpu %d for %ds: cpu_s %.2f %.2f share_nice0 %.4f\n",nice2,cpu,secs,t0/hz,t1/hz,(double)t0/(t0+t1));
  return 0;}
