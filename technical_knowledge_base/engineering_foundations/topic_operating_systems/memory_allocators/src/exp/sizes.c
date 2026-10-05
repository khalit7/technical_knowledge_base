/* Chunk sizes glibc's malloc really hands out. For each request size, malloc_usable_size() gives the bytes
   the chunk can hold; the chunk itself is that plus one 8-byte size field (64-bit). Also prints where the
   first allocation of each size landed relative to the previous one (the chunk stride).
   Build: gcc -O2 -o sizes sizes.c */
#include <stdio.h>
#include <stdlib.h>
#include <malloc.h>
#include <stdint.h>
int main(void){
  printf("request usable chunk_stride\n");
  size_t req[]={0,1,8,16,24,25,32,40,41,56,64,100,128,256,512,1000,1024,1032,1033,4096,65536};
  for(unsigned i=0;i<sizeof req/sizeof*req;i++){
    char*a=malloc(req[i]);char*b=malloc(req[i]);   /* two in a row: their distance is the chunk size */
    printf("%zu %zu %ld\n",req[i],malloc_usable_size(a),(long)((uintptr_t)b-(uintptr_t)a));
  }
  return 0;
}
