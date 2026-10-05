/* (section 5) Where does malloc get memory? glibc serves small requests from the heap (grown with brk)
   and large ones with their own mmap; the default switch point M_MMAP_THRESHOLD is 128 KiB (mallopt(3)).
   Run under: strace -e trace=brk,mmap,munmap ./malloc_sizes   Build: gcc -O2 -o malloc_sizes malloc_sizes.c */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
static char*volatile sink;static volatile int sum;
int main(void){
  size_t sz[]={64*1024,200*1024};
  for(int i=0;i<2;i++){
    char m[64];int k=snprintf(m,sizeof m,"--- malloc(%zu KiB)\n",sz[i]/1024);write(2,m,k);
    char*p=malloc(sz[i]);memset(p,1,sz[i]);sink=p;sum+=p[sz[i]-1];
    k=snprintf(m,sizeof m,"--- free\n");write(2,m,k);free(p);
  }
  return 0;
}
