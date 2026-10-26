# The hero: one std::vector<float> in C++ (where its parts live, when its buffer is freed) and the same list in Python.
rec h_vector hero 'clang++ -std=c++23 -O2 -Wall -Wextra vector.cpp -o vector && ./vector'
rec h_vector_py hero 'python3.14 vector.py'
