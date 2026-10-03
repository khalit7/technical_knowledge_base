# django/db/models/base.py at commit 84633905273fc916e3d17883810d9969c03f73c2 (BSD-3-Clause, Django Software Foundation), lines 403 and 941-944
class Model(metaclass=ModelBase):
    def _get_FIELD_display(self, field):
        value = getattr(self, field.attname)
        # force_str() to coerce lazy strings.
        return force_str(dict(field.flatchoices).get(value, value), strings_only=True)
