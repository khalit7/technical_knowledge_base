.PHONY: all test lint clean

PYTHON ?= python3

all: lint test

test:
	$(PYTHON) -m pytest -q

lint:
	$(PYTHON) -m pyflakes shop textstats

clean:
	rm -rf build dist *.egg-info
	find . -name __pycache__ -type d -prune -exec rm -rf {} +
