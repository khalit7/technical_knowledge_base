/* E6. Zombies, orphans and subreapers, read from /proc.
   1) A child exits; the parent has not called wait(): the child's /proc/<pid>/stat shows state Z.
      After waitpid() the entry is gone.
   2) An orphan: a middle process forks a grandchild and exits. The grandchild's parent becomes
      PID 1 of this PID namespace (or, with PR_SET_CHILD_SUBREAPER set on us, becomes us).
   Build: gcc -O2 -o lifecycle lifecycle.c   Run: ./lifecycle 0 ; ./lifecycle 1  (1 = become subreaper) */
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/prctl.h>
#include <sys/wait.h>
static void st(pid_t p,const char*when){char path[64],b[256];snprintf(path,sizeof path,"/proc/%d/stat",p);FILE*f=fopen(path,"r");
  if(!f){printf("  %-34s /proc/%d: gone\n",when,p);return;} fgets(b,sizeof b,f);fclose(f);
  char*r=strrchr(b,')'); char s; int pp; sscanf(r+2,"%c %d",&s,&pp); printf("  %-34s pid %d state %c ppid %d\n",when,p,s,pp);}
int main(int c,char**v){
  int sub=c>1&&atoi(v[1]);
  printf("me: pid %d, ppid %d, subreaper %s\n",getpid(),getppid(),sub?"yes":"no");
  if(sub)prctl(PR_SET_CHILD_SUBREAPER,1);
  pid_t k=fork(); if(k==0)_exit(7);
  usleep(200000); st(k,"child exited, not yet waited:");
  int s; waitpid(k,&s,0); printf("  waitpid: WIFEXITED %d, WEXITSTATUS %d\n",WIFEXITED(s),WEXITSTATUS(s)); st(k,"after waitpid:");
  int pp[2]; pipe(pp);
  pid_t mid=fork();
  if(mid==0){ pid_t g=fork(); if(g==0){ close(pp[0]); usleep(300000); int x=getppid(); write(pp[1],&x,sizeof x); sleep(1); _exit(0);} 
    write(pp[1],&g,sizeof g); _exit(0);} 
  close(pp[1]); pid_t g; read(pp[0],&g,sizeof g); waitpid(mid,0,0);
  int newpp; read(pp[0],&newpp,sizeof newpp);
  printf("  orphan: grandchild %d, its parent %d exited; getppid() in the grandchild now = %d\n",g,mid,newpp);
  if(sub){ int s2; pid_t w=waitpid(-1,&s2,0); printf("  as subreaper we reaped pid %d\n",w);} else sleep(2);
  return 0;
}
