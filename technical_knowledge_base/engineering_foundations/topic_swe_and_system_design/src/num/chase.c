/* Pointer-chase memory latency: each load depends on the previous one, so time per load = latency
   of the level that holds a working set of that size. Random cyclic permutation over 64-byte lines.
   Build and run: cc -O2 chase.c -o /tmp/chase && /tmp/chase  (prints size_kib ns_per_load) */
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <time.h>
static double now(){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return t.tv_sec+t.tv_nsec*1e-9;}
int main(){
  size_t sizes_kib[]={16,32,64,128,256,512,1024,2048,4096,8192,16384,32768,65536,131072,262144,524288};
  for(int s=0;s<16;s++){
    size_t n=sizes_kib[s]*1024/64; char*buf=aligned_alloc(64,n*64); size_t*idx=malloc(n*sizeof(size_t));
    for(size_t i=0;i<n;i++)idx[i]=i;
    srand(42);for(size_t i=n-1;i>0;i--){size_t j=((size_t)rand()*RAND_MAX+rand())%(i+1);size_t t=idx[i];idx[i]=idx[j];idx[j]=t;}
    for(size_t i=0;i<n;i++)*(void**)(buf+idx[i]*64)=buf+idx[(i+1)%n]*64;
    void**p=(void**)(buf+idx[0]*64);size_t iters=20000000;
    for(size_t i=0;i<n*2;i++)p=(void**)*p;
    double t0=now();for(size_t i=0;i<iters;i++)p=(void**)*p;double t1=now();
    printf("%zu %.2f %p\n",sizes_kib[s],(t1-t0)/iters*1e9,(void*)p);fflush(stdout);
    free(buf);free(idx);
  }
}
