/* E3. How much a pipe holds, and what "atomic" means for pipe writes.
   Build: gcc -O2 -o pipes pipes.c */
#define _GNU_SOURCE
#include <stdio.h>
#include <fcntl.h>
#include <limits.h>
#include <unistd.h>
#include <errno.h>
#include <string.h>
int main(void){
  int p[2]; pipe2(p,O_NONBLOCK|O_CLOEXEC);
  printf("F_GETPIPE_SZ %d\n",fcntl(p[1],F_GETPIPE_SZ));
  printf("PIPE_BUF %d\n",PIPE_BUF);
  char b[1]={'x'}; long n=0; while(write(p[1],b,1)==1)n++;
  printf("bytes written before EAGAIN %ld (errno %s)\n",n,strerror(errno));
  FILE*f=fopen("/proc/sys/fs/pipe-max-size","r"); long mx=0; if(f){fscanf(f,"%ld",&mx);fclose(f);}
  printf("pipe-max-size %ld\n",mx);
  int r=fcntl(p[1],F_SETPIPE_SZ,1<<20); printf("F_SETPIPE_SZ 1 MiB -> %d\n",r);
  return 0;
}
