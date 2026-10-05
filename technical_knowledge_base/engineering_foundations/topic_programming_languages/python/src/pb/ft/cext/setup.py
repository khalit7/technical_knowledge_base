from setuptools import Extension, setup

setup(name="gildemo", ext_modules=[Extension("oldext", ["oldext.c"]), Extension("newext", ["newext.c"])])
