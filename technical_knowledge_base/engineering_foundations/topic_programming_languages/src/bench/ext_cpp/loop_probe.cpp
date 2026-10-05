#include <chrono>
#include <cstdio>
#include <string>
#include <cstdint>
#include "tokens.h"
static uint64_t tok2(std::string_view s){uint64_t n=0;bool in=false;for(unsigned char c:s){bool t=((unsigned)((c|32)-'a')<26u)|((unsigned)(c-'0')<10u);n+=t&!in;in=t;}return n;}
int main(){std::string s;for(int i=0;i<10;i++)s+="abc def ghi ";uint64_t acc=0;
for(int v=0;v<2;v++){auto t0=std::chrono::steady_clock::now();for(int i=0;i<2000000;i++){std::string_view sv(s.data(),s.size()-(i&1));acc+=v?tok2(sv):count_tokens_sv(sv);}
auto t1=std::chrono::steady_clock::now();printf("v%d %.2f ns/byte\n",v,std::chrono::duration<double,std::nano>(t1-t0).count()/2000000/s.size());}printf("%llu\n",(unsigned long long)acc);}
