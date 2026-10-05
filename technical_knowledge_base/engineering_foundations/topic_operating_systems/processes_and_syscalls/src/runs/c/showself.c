/* Helper for E14b: print this process's pid, signal masks and open descriptors, then exit.
   It installs nothing and changes nothing, so what it prints is exactly what execve left it. */
#include <stdio.h>
#include <string.h>
#include <dirent.h>
#include <unistd.h>
#include <stdlib.h>
int main(void){
  printf("after exec: pid %d (program: showself)\n",getpid());
  FILE*f=fopen("/proc/self/status","r");char l[256];
  while(fgets(l,sizeof l,f))if(!strncmp(l,"SigBlk",6)||!strncmp(l,"SigIgn",6)||!strncmp(l,"SigCgt",6))fputs(l,stdout);
  fclose(f);
  DIR*d=opendir("/proc/self/fd");struct dirent*e;int dfd=dirfd(d);printf("open fds:");
  int fds[64],n=0;while((e=readdir(d))){if(e->d_name[0]=='.')continue;int x=atoi(e->d_name);if(x!=dfd)fds[n++]=x;}
  for(int i=0;i<n;i++)for(int j=i+1;j<n;j++)if(fds[j]<fds[i]){int t=fds[i];fds[i]=fds[j];fds[j]=t;}
  for(int i=0;i<n;i++)printf(" %d",fds[i]);printf("\n");closedir(d);return 0;
}
