/* (c) What does a TLB miss cost? A pointer chase over N cache lines in random order.
   "packed": the N lines sit next to each other, so they span N/64 pages (few TLB entries needed).
   "spread": each line sits in its own 4 KiB page (one TLB entry per line), at a varying offset inside
             the page so the lines spread over the cache sets the same way as packed.
   Same number of cache lines touched, so the difference is (mostly) address translation.
   "spread+THP": the spread layout in memory advised MADV_HUGEPAGE: 2 MiB pages, one TLB entry per 512 lines.
   Output: ns per access, median of 5. Build: gcc -O2 -o tlb tlb.c */
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include <time.h>
#include <sys/mman.h>
static double now(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return t.tv_sec*1e9+t.tv_nsec;}
static int cmp(const void*a,const void*b){double x=*(double*)a,y=*(double*)b;return x<y?-1:x>y;}
static uint64_t rng=88172645463325252ull;static uint64_t xr(void){rng^=rng<<13;rng^=rng>>7;rng^=rng<<17;return rng;}
static double chase(size_t n,int spread,int thp,long *anon_huge_kb){
  size_t bytes=spread? n*4096 : n*64; size_t al=2u<<20; bytes=(bytes+al-1)/al*al;
  char*raw=mmap(0,bytes+al,PROT_READ|PROT_WRITE,MAP_PRIVATE|MAP_ANONYMOUS,-1,0);
  char*m=(char*)(((uintptr_t)raw+al-1)&~(uintptr_t)(al-1));
  if(thp)madvise(m,bytes,MADV_HUGEPAGE);else madvise(m,bytes,MADV_NOHUGEPAGE);
  memset(m,0,bytes);
  size_t*perm=malloc(n*sizeof*perm);for(size_t i=0;i<n;i++)perm[i]=i;
  for(size_t i=n-1;i>0;i--){size_t j=xr()%(i+1),t=perm[i];perm[i]=perm[j];perm[j]=t;}
  #define ADDR(k) (spread? m+(k)*4096+((k)%64)*64 : m+(k)*64)
  for(size_t i=0;i<n;i++)*(char**)ADDR(perm[i])=ADDR(perm[(i+1)%n]);
  if(anon_huge_kb){FILE*f=fopen("/proc/self/smaps_rollup","r");char l[256];*anon_huge_kb=-1;
    while(f&&fgets(l,sizeof l,f))if(!strncmp(l,"AnonHugePages:",14))*anon_huge_kb=atol(l+14);if(f)fclose(f);}
  char*p=ADDR(perm[0]);long steps=20000000;double r[5];
  for(long i=0;i<n;i++)p=*(char**)p;
  for(int j=0;j<5;j++){double t=now();for(long i=0;i<steps;i++)p=*(char**)p;r[j]=(now()-t)/steps;}
  if(p==0)puts("");
  qsort(r,5,sizeof r[0],cmp);free(perm);munmap(raw,bytes+al);return r[2];
}
int main(void){
  printf("lines\tpacked_ns\tspread_4k_ns\tspread_thp_ns\tthp_kb\n");
  size_t ns[]={16,64,256,1024,2048,4096,8192,16384,32768};
  for(int i=0;i<9;i++){long kb=0;double a=chase(ns[i],0,0,0),b=chase(ns[i],1,0,0),c=chase(ns[i],1,1,&kb);
    printf("%zu\t%.2f\t%.2f\t%.2f\t%ld\n",ns[i],a,b,c,kb);fflush(stdout);}
  return 0;
}
