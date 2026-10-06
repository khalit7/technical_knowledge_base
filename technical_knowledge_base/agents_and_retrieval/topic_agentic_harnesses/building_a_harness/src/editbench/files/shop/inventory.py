"""A tiny in-memory inventory used by the shop's command-line tools."""
import csv
from dataclasses import dataclass


@dataclass
class Item:
    sku: str
    name: str
    price: float
    qty: int


def load_items(path):
    """Read items from a CSV file with columns sku,name,price,qty."""
    items = []
    with open(path, newline="") as f:
        for row in csv.DictReader(f):
            items.append(Item(row["sku"], row["name"], float(row["price"]), int(row["qty"])))
    return items


def find_item(items, sku):
    for item in items:
        if item.sku == sku:
            return item
    return None


def restock(items, sku, amount):
    """Add amount units to the item with this sku."""
    item = find_item(items, sku)
    if item is None:
        raise KeyError(sku)
    if amount < 0:
        raise ValueError("amount must be positive")
    item.qty += amount
    return item


def sell(items, sku, amount):
    """Remove amount units; refuse to go below zero."""
    item = find_item(items, sku)
    if item is None:
        raise KeyError(sku)
    if amount < 0:
        raise ValueError("amount must be positive")
    if item.qty - amount < 0:
        raise ValueError("not enough stock")
    item.qty -= amount
    return item


def apply_discount(item, percent):
    """Lower the item's price by percent."""
    item.price = round(item.price * (1 - percent / 100), 2)
    return item


def legacy_import(rows):
    """Old tuple format (sku, name, price); kept for the 2019 migration script."""
    out = []
    for sku, name, price in rows:
        out.append(Item(sku, name, float(price), 0))
    return out


def low_stock(items, threshold=5):
    return [item for item in items if item.qty < threshold]
