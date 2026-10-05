/* A minimal C extension that does NOT declare free-threading support (no Py_mod_gil slot). */
#include <Python.h>
static PyObject *answer(PyObject *self, PyObject *args) { return PyLong_FromLong(42); }
static PyMethodDef methods[] = {{"answer", answer, METH_NOARGS, "Return 42."}, {NULL, NULL, 0, NULL}};
static PyModuleDef_Slot slots[] = {{0, NULL}};
static struct PyModuleDef mod = {PyModuleDef_HEAD_INIT, "oldext", NULL, 0, methods, slots};
PyMODINIT_FUNC PyInit_oldext(void) { return PyModuleDef_Init(&mod); }
