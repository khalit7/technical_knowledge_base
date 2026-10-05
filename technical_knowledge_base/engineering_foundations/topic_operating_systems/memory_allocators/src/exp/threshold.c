/* glibc's dynamic mmap threshold, traced. Requests at or above M_MMAP_THRESHOLD (initially 128 KiB) get their
   own mmap. Freeing such a chunk raises the threshold to its size (malloc.c lines 3366 to 3371, glibc 2.36),
   so the SAME request made again is served from the heap (brk) and is not returned to the kernel on free.
   Run: strace -e trace=brk,mmap,munmap,write ./threshold
   With MALLOC_MMAP_THRESHOLD_=131072 set, the threshold is fixed and the second request mmaps again. */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
static char*volatile sink;
static void mark(const char*s){write(2,s,strlen(s));}
int main(void){
  mark("--- 1st malloc(1 MiB)\n"); char*p=malloc(1<<20); memset(p,1,1<<20); sink=p;
  mark("--- free it\n"); free(p);
  mark("--- 2nd malloc(1 MiB)\n"); p=malloc(1<<20); memset(p,1,1<<20); sink=p;
  mark("--- free it\n"); free(p);
  mark("--- end\n");
  return 0;
}
