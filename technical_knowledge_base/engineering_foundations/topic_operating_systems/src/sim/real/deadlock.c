// OSTEP chapter 32's deadlock: thread 1 locks A then B, thread 2 locks B then A.
// A short sleep between the two locks makes the bad interleaving certain.
// "ordered": both threads take A before B (lock ordering), which cannot deadlock.
// The main thread waits 2 s, then reports what each thread is doing from /proc
// (state, and the system call it is blocked in: 98 = futex on arm64).
#define _GNU_SOURCE
#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/syscall.h>
static pthread_mutex_t A=PTHREAD_MUTEX_INITIALIZER,B=PTHREAD_MUTEX_INITIALIZER;
static int ordered; static volatile int done[2]; static volatile pid_t tid[2];
static void*t1(void*x){(void)x;tid[0]=syscall(SYS_gettid);pthread_mutex_lock(&A);usleep(100000);pthread_mutex_lock(&B);
  pthread_mutex_unlock(&B);pthread_mutex_unlock(&A);done[0]=1;return 0;}
static void*t2(void*x){(void)x;tid[1]=syscall(SYS_gettid);pthread_mutex_t*f=ordered?&A:&B,*s=ordered?&B:&A;
  pthread_mutex_lock(f);usleep(100000);pthread_mutex_lock(s);pthread_mutex_unlock(s);pthread_mutex_unlock(f);done[1]=1;return 0;}
static void show(int i){char p[96],buf[256];FILE*f;
  sprintf(p,"/proc/self/task/%d/stat",tid[i]);f=fopen(p,"r");if(f&&fgets(buf,sizeof buf,f)){char*s=strrchr(buf,')');printf("  thread %d state %c",i+1,s?s[2]:'?');}if(f)fclose(f);
  sprintf(p,"/proc/self/task/%d/syscall",tid[i]);f=fopen(p,"r");if(f&&fgets(buf,sizeof buf,f)){char*sp=strchr(buf,' ');if(sp)*sp=0;printf(" syscall %s",buf);}else printf(" syscall (unreadable)");if(f)fclose(f);
  printf("\n");}
int main(int argc,char**argv){ordered=argc>1&&!strcmp(argv[1],"ordered");
  pthread_t a,b;pthread_create(&a,0,t1,0);pthread_create(&b,0,t2,0);
  for(int i=0;i<20&&!(done[0]&&done[1]);i++)usleep(100000);
  if(done[0]&&done[1]){printf("%s: both threads finished\n",ordered?"ordered":"opposite order");return 0;}
  printf("%s: still waiting after 2 s (deadlock)\n",ordered?"ordered":"opposite order");show(0);show(1);
  fflush(stdout);_exit(0);}
