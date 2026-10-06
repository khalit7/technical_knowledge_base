"""Unit conversions for product dimensions (file kept with Windows line endings)."""

INCH_TO_CM = 2.5
POUND_TO_KG = 0.4536


def inches_to_cm(value):
    return value * INCH_TO_CM


def pounds_to_kg(value):
    return value * POUND_TO_KG
