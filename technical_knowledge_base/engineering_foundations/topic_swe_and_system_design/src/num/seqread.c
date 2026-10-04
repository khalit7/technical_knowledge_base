/* Single-thread sequential read bandwidth from DRAM: sum a 1 GiB array of uint64 (far larger than any cache).
   Build and run: cc -O2 seqread.c -o /tmp/seqread && /tmp/seqread  (prints GB/s and microseconds per MiB) */
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <time.h>
static double now(){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return t.tv_sec+t.tv_nsec*1e-9;}
int main(){size_t n=(1ull<<30)/8;uint64_t*a=malloc(n*8);for(size_t i=0;i<n;i++)a[i]=i;
  double best=1e9;uint64_t s=0;for(int r=0;r<5;r++){double t=now();
    uint64_t s0=0,s1=0,s2=0,s3=0;for(size_t i=0;i<n;i+=4){s0+=a[i];s1+=a[i+1];s2+=a[i+2];s3+=a[i+3];}s+=s0+s1+s2+s3;
    t=now()-t;if(t<best)best=t;}
  double gbs=(n*8)/best/1e9;printf("%.1f GB/s, %.1f us per MiB (checksum %llu)\n",gbs,1048576/(gbs*1e9)*1e6,(unsigned long long)s);}
