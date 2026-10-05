// What each durability call costs: N records of 4 KiB written to one file, timed per record.
// Modes: none (write only), fsync, fdatasync, odsync (open with O_DSYNC), sfr (sync_file_range WRITE|WAIT_AFTER).
// Two file shapes: append (the file grows: size changes every record) and overwrite (records rewrite a
// preallocated, already-synced file: only data and mtime change). Prints median and p99 in microseconds.
#define _GNU_SOURCE
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>
static double now(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return t.tv_sec*1e6+t.tv_nsec/1e3;}
static int cmp(const void*a,const void*b){double x=*(double*)a,y=*(double*)b;return x<y?-1:x>y;}
int main(int argc,char**argv){
  const char*dir=argv[1];int n=atoi(argv[2]);const char*modes[]={"none","fsync","fdatasync","odsync","sfr"};
  char buf[4096];memset(buf,'x',sizeof buf);double*t=malloc(n*sizeof(double));char path[512];
  for(int shape=0;shape<2;shape++)for(int m=0;m<5;m++){
    snprintf(path,sizeof path,"%s/rec_%d_%d.bin",dir,shape,m);unlink(path);
    if(shape==1){int f=open(path,O_WRONLY|O_CREAT,0644);for(int i=0;i<n;i++)if(write(f,buf,4096)!=4096)return 1;fsync(f);close(f);}
    int fl=O_WRONLY|O_CREAT|(m==3?O_DSYNC:0);int fd=open(path,fl,0644);if(fd<0){perror("open");return 1;}
    for(int i=0;i<n;i++){double a=now();
      if(pwrite(fd,buf,4096,(off_t)i*4096)!=4096){perror("pwrite");return 1;}
      if(m==1)fsync(fd);else if(m==2)fdatasync(fd);
      else if(m==4)sync_file_range(fd,(off_t)i*4096,4096,SYNC_FILE_RANGE_WAIT_BEFORE|SYNC_FILE_RANGE_WRITE|SYNC_FILE_RANGE_WAIT_AFTER);
      t[i]=now()-a;}
    fsync(fd);close(fd);qsort(t,n,sizeof(double),cmp);
    printf("%-9s %-10s n %d median_us %.1f p99_us %.1f\n",shape?"overwrite":"append",modes[m],n,t[n/2],t[(int)(n*0.99)]);
    unlink(path);}
  return 0;}
