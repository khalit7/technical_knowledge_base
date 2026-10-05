/* E1. What does creating a process cost, and how does it grow with the parent's memory?
   For a parent with R MiB of touched (resident) anonymous memory, median microseconds of:
     fork_exit   : fork(); child _exit(0); parent waitpid      (copies page tables of R MiB)
     vfork_exit  : vfork(); child _exit(0); parent waitpid     (shares the address space)
     fork_exec   : fork(); child execve("/bin/true"); waitpid  (what a shell does)
     spawn_exec  : posix_spawn("/bin/true"); waitpid           (glibc uses clone(CLONE_VM|CLONE_VFORK))
   Also the parent's page-table size (VmPTE from /proc/self/status).
   Build: gcc -O2 -o spawn_cost spawn_cost.c   Run: ./spawn_cost 0 64 256 1024 */
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>
#include <spawn.h>
#include <sys/mman.h>
#include <sys/wait.h>
extern char **environ;
static double now(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return t.tv_sec*1e6+t.tv_nsec/1e3;}
static int cmp(const void*a,const void*b){double x=*(double*)a,y=*(double*)b;return x<y?-1:x>y;}
static char *argv_true[]={"/bin/true",NULL};
static double one(int how){
  double t=now(); pid_t p;
  if(how==0){p=fork(); if(p==0)_exit(0);}
  else if(how==1){p=vfork(); if(p==0)_exit(0);}
  else if(how==2){p=fork(); if(p==0){execve("/bin/true",argv_true,environ);_exit(127);}}
  else {if(posix_spawn(&p,"/bin/true",NULL,NULL,argv_true,environ)!=0){perror("spawn");exit(1);}}
  int st; waitpid(p,&st,0); return now()-t;
}
static long vmpte(void){FILE*f=fopen("/proc/self/status","r");char l[256];long v=-1;while(fgets(l,sizeof l,f))if(!strncmp(l,"VmPTE:",6))v=atol(l+6);fclose(f);return v;}
int main(int c,char**v){
  const char*nm[]={"fork_exit","vfork_exit","fork_exec","spawn_exec"};
  printf("rss_mib vmpte_kib method median_us p10_us p90_us n\n");
  for(int a=1;a<c;a++){
    size_t mib=atol(v[a]); char*m=NULL;
    if(mib){m=mmap(NULL,mib<<20,PROT_READ|PROT_WRITE,MAP_PRIVATE|MAP_ANONYMOUS,-1,0); for(size_t i=0;i<(mib<<20);i+=4096)m[i]=1;}
    long pte=vmpte();
    for(int h=0;h<4;h++){int n=41;double r[41];one(h);for(int j=0;j<n;j++)r[j]=one(h);qsort(r,n,sizeof r[0],cmp);
      printf("%zu %ld %s %.1f %.1f %.1f %d\n",mib,pte,nm[h],r[n/2],r[n/10],r[n*9/10],n);fflush(stdout);}
    if(m)munmap(m,mib<<20);
  }
  return 0;
}
