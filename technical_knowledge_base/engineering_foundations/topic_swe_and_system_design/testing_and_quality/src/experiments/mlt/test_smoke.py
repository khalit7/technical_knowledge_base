import numpy as np

def train(X, y, steps=500, lr=1.0, seed=0, bug=False):
    """Tiny logistic-regression trainer standing in for a real training loop."""
    rng = np.random.default_rng(seed)
    w = rng.normal(0, 0.01, X.shape[1]); b = 0.0; losses = []
    for _ in range(steps):
        p = 1 / (1 + np.exp(-(X @ w + b)))
        losses.append(float(-np.mean(y * np.log(p + 1e-9) + (1 - y) * np.log(1 - p + 1e-9))))
        target = rng.permutation(y) if bug else y      # the wiring bug: labels shuffled apart from inputs
        g = p - target
        w -= lr * X.T @ g / len(y); b -= lr * g.mean()
    return losses

def ten_examples():
    rng = np.random.default_rng(42)
    X = rng.normal(size=(10, 4)); y = (X[:, 0] > 0).astype(float)
    return X, y

def test_overfits_ten_examples():
    losses = train(*ten_examples())
    assert losses[-1] < 0.1 * losses[0]       # a correct loop memorises 10 examples

def test_smoke_catches_shuffled_labels():
    losses = train(*ten_examples(), bug=True)
    assert not losses[-1] < 0.1 * losses[0]   # the broken loop cannot
