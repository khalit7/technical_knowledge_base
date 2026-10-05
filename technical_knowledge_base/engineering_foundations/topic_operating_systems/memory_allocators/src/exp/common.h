/* Small helpers shared by the experiments: resident memory from /proc/self/statm, a monotonic clock. */
#include <stdio.h>
#include <time.h>
#include <unistd.h>
static long rss_kib(void){long a=0,r=0;FILE*f=fopen("/proc/self/statm","r");if(f){if(fscanf(f,"%ld %ld",&a,&r)!=2)r=0;fclose(f);}return r*(sysconf(_SC_PAGESIZE)/1024);}
static long hwm_kib(void){char l[256];long v=-1;FILE*f=fopen("/proc/self/status","r");if(!f)return -1;while(fgets(l,sizeof l,f))if(sscanf(l,"VmHWM: %ld",&v)==1)break;fclose(f);return v;}
static double now(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return t.tv_sec+t.tv_nsec*1e-9;}
