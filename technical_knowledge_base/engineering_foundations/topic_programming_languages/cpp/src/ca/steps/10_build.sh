# Section: how a C++ program is built
rec b_pp_count build1 'wc -l main.cpp tokens.h; clang++ -std=c++20 -E main.cpp | wc -l
for h in cstdio string_view vector string algorithm iostream; do printf "#include <%s> alone: " $h; printf "#include <$h>\\n" | clang++ -std=c++20 -x c++ -E - | wc -l | tr -d " "; done'
rec b_pp_head build1 'clang++ -std=c++20 -E -P main.cpp | tail -n 6'
rec b_compile build1 'clang++ -std=c++20 -O2 -Wall -c tokens.cpp && clang++ -std=c++20 -O2 -Wall -c main.cpp && ls *.o'
rec b_nm build1 'nm -C main.o; echo ---; nm -C tokens.o'
rec b_link_missing build1 'clang++ main.o -o app'
rec b_link_ok build1 'clang++ main.o tokens.o -o app && ./app'
rec b_odr_nm odr 'clang++ -std=c++20 -O2 -c a.cpp b.cpp && nm -C a.o; echo ---; nm -C b.o'
rec b_odr odr 'clang++ -std=c++20 -c a.cpp b.cpp && clang++ a.o b.o -o app'
rec b_odr_fix odr 'sed -i.bak "s/util.h/util_inline.h/" a.cpp b.cpp && clang++ -std=c++20 -c a.cpp b.cpp && clang++ a.o b.o -o app && ./app; echo "exit code $?"'
rec b_cmake1 cmake1 'cmake -S . -B build -G Ninja -DCMAKE_CXX_COMPILER=clang++ > /dev/null && cmake --build build && ./build/hello'
# printed command line shortened: the sed calls only drop the SDK path and dependency-file flags
recq b_cmake2 cmake2 'echo "$ cmake -S . -B build -G Ninja && cmake --build build --verbose"; cmake -S . -B build -G Ninja -DCMAKE_CXX_COMPILER=clang++ > /dev/null && cmake --build build --verbose | grep -E "clang\+\+|ar qc" | sed -e "s/^\[[0-9/]*\] //" -e "s/ -isysroot [^ ]*//" -e "s/ -MD -MT [^ ]* -MF [^ ]*//" -e "s#[^ ]*/usr/bin/##g" -e "s/ && :\$//" -e "s/^: && //"; echo "$ ./build/tokcount"; ./build/tokcount'
rec b_pp_tokens build1 'clang++ -std=c++20 -E tokens.cpp | wc -l'
rec b_sizes build1 'wc -c main.o tokens.o app'
rec b_otool build1 'otool -L app'
recq b_incr cmake2 'echo "$ touch src/tokens.cpp && cmake --build build"; touch src/tokens.cpp && cmake --build build; echo "$ touch src/tokens.h && cmake --build build"; touch src/tokens.h && cmake --build build; echo "$ cmake --build build"; cmake --build build'
