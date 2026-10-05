/* The same extension, declaring that it does not need the GIL (PEP 703's Py_mod_gil slot). */
#include <Python.h>
static PyObject *answer(PyObject *self, PyObject *args) { return PyLong_FromLong(42); }
static PyMethodDef methods[] = {{"answer", answer, METH_NOARGS, "Return 42."}, {NULL, NULL, 0, NULL}};
static PyModuleDef_Slot slots[] = {{Py_mod_gil, Py_MOD_GIL_NOT_USED}, {0, NULL}};
static struct PyModuleDef mod = {PyModuleDef_HEAD_INIT, "newext", NULL, 0, methods, slots};
PyMODINIT_FUNC PyInit_newext(void) { return PyModuleDef_Init(&mod); }
