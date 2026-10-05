// O_DIRECT's alignment rules, shown: a misaligned buffer or length fails with EINVAL, an aligned one works.
#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
static void try(int fd,void*b,size_t len,off_t off,const char*what){ssize_t r=pwrite(fd,b,len,off);
  printf("%-44s -> %s\n",what,r<0?strerror(errno):"ok");}
int main(int argc,char**argv){int fd=open(argv[1],O_WRONLY|O_CREAT|O_TRUNC|O_DIRECT,0644);if(fd<0){perror("open O_DIRECT");return 1;}
  void*al;posix_memalign(&al,4096,8192);memset(al,1,8192);
  try(fd,al,4096,0,"buffer aligned to 4096, length 4096, offset 0");
  try(fd,(char*)al+1,4096,0,"buffer address +1 byte");
  try(fd,al,1000,0,"length 1000 bytes");
  try(fd,al,4096,100,"file offset 100");
  try(fd,(char*)al+512,512,512,"buffer, length, offset multiples of 512");
  close(fd);return 0;}
