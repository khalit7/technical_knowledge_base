cmake_minimum_required(VERSION 3.28)
project(tokcount LANGUAGES CXX)

# A library target: compiled once, linked into anything that needs it
add_library(tokens src/tokens.cpp)
target_include_directories(tokens PUBLIC src)      # users of tokens see src/
target_compile_features(tokens PUBLIC cxx_std_20)  # and get C++20
target_compile_options(tokens PRIVATE -Wall -Wextra)

add_executable(tokcount src/main.cpp)
target_link_libraries(tokcount PRIVATE tokens)     # brings the include dir and C++20 along
