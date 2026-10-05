/* Section 9: io_uring on this lab's kernel 5.10, against a plain pread() loop.
   Build: gcc -O2 -o uring uring.c -luring        Usage: ./uring <file> <pread|uring|sqpoll|probe> [queue depth]
   Reads the whole file in 4 KiB blocks (the file is in the page cache: this measures the system-call path,
   not the disk). pread: one system call per block. uring: queue `depth` reads in the submission ring, then one
   io_uring_enter submits them all and waits for their completions. sqpoll: a kernel thread polls the ring, so
   submitting needs no system call at all (needs privilege on kernels before 5.11). probe: list supported opcodes. */
#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <liburing.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <time.h>
#include <unistd.h>
#define BS 4096
static double now(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return t.tv_sec*1e9+t.tv_nsec;}
int main(int argc,char**argv){
  if(argc>2&&!strcmp(argv[2],"probe")){
    struct io_uring_probe *pr=io_uring_get_probe(); if(!pr){printf("probe failed: io_uring unavailable\n");return 0;}
    int n=0; for(int op=0;op<=pr->last_op;op++) if(io_uring_opcode_supported(pr,op)) n++;
    printf("io_uring available: %d opcodes supported, last opcode %d\n",n,pr->last_op); io_uring_free_probe(pr); return 0;}
  int fd=open(argv[1],O_RDONLY); struct stat st; fstat(fd,&st); long nb=st.st_size/BS;
  char *buf=aligned_alloc(BS,(size_t)BS*64); long sum=0; double t=now();
  if(!strcmp(argv[2],"pread")){
    for(long i=0;i<nb;i++){ if(pread(fd,buf,BS,i*BS)!=BS){perror("pread");return 1;} sum+=buf[0]; }
  } else {
    int depth=argc>3?atoi(argv[3]):32; struct io_uring ring; struct io_uring_params p; memset(&p,0,sizeof p);
    if(!strcmp(argv[2],"sqpoll")){ p.flags=IORING_SETUP_SQPOLL; p.sq_thread_idle=2000; }
    int r=io_uring_queue_init_params(depth,&ring,&p);
    if(r<0){ printf("mode %s io_uring_queue_init: %s\n",argv[2],strerror(-r)); return 0; }
    for(long i=0;i<nb;i+=depth){ int k=nb-i<depth?(int)(nb-i):depth;
      for(int j=0;j<k;j++){ struct io_uring_sqe *s=io_uring_get_sqe(&ring); io_uring_prep_read(s,fd,buf+(size_t)(j%64)*BS,BS,(i+j)*BS); }
      io_uring_submit_and_wait(&ring,k);
      for(int j=0;j<k;j++){ struct io_uring_cqe *c; io_uring_wait_cqe(&ring,&c); if(c->res!=BS){printf("bad res %d\n",c->res);return 1;} io_uring_cqe_seen(&ring,c);} sum+=buf[0]; }
    io_uring_queue_exit(&ring);
  }
  double dt=now()-t;
  printf("mode %s blocks %ld ns_per_block %.0f total_ms %.1f\n",argv[2],nb,dt/nb,dt/1e6); (void)sum;
  return 0;}
