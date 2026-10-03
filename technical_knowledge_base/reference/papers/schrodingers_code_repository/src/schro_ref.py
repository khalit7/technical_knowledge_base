"""Reference copies of the released SchrodingerRepo code (github.com/cslsolow/Schrodinger-Repo, commit e2eef98,
MIT licence) that this page ports to JavaScript, so check_page.mjs can compare the two.

Copied verbatim (only `self` removed and the extractor passed as a function):
  - tokenize_identifier            from glasses/extractor.py   RepoIdentifierExtractor.tokenize_identifier
  - create_token_mapping           from glasses/mapper.py      SemanticMapper.create_token_mapping
  - reconstruct_identifier         from glasses/mapper.py      SemanticMapper.reconstruct_identifier
  - _loaded_names .. build_run_specs from glasses/intra_file_reorder.py (_build_run_specs and its helpers)
  - random_topological_order       from glasses/intra_file_reorder.py _random_topological_order, with ONE change:
        the released code reseeds each retry with random.Random(f"{rng.random()}:{_}") (a string seed, hashed
        with SHA-512 by CPython); here the retry seed is the integer int(rng.random() * 2**32) + _, so a browser
        can reproduce it without SHA-512. The algorithm and the distribution are the same.
"""
import ast, random, re


def tokenize_identifier(identifier):
    if identifier.startswith('__') and identifier.endswith('__'):
        return [identifier]
    name = identifier
    if '.' in name:
        name = name.rsplit('.', 1)[0]
    tokens = []
    for segment in re.split(r"[_\-.]+", name):
        tokens.extend(re.findall(r'[A-Z]?[a-z0-9]+|[A-Z]+(?=[A-Z][a-z]|\b)|[0-9]+', segment))
    return [t for t in tokens if len(t) > 0]


def create_token_mapping(token_candidates_cache, tokens, seed, avoid_tokens=None):
    rng = random.Random(seed)
    mapping = {}
    used_virtual_tokens = set()
    avoid_tokens = avoid_tokens or set()
    for t_key in sorted(list(set(t.lower() for t in tokens))):
        candidates = token_candidates_cache.get(t_key, [t_key])
        shuffled = list(candidates)
        rng.shuffle(shuffled)
        selected = t_key
        for c in shuffled:
            c_low = c.lower()
            if c_low not in used_virtual_tokens and c_low != t_key and c_low not in avoid_tokens:
                selected = c_low
                break
        mapping[t_key] = selected
        used_virtual_tokens.add(selected)
    return mapping


def reconstruct_identifier(original, token_mapping):
    suffix = ""
    name = original
    if "." in original:
        name, suffix = original.rsplit(".", 1)
        suffix = "." + suffix
    orig_tokens = tokenize_identifier(name)
    new_parts = []
    for ot in orig_tokens:
        vt = token_mapping.get(ot.lower(), ot.lower())
        if ot.isupper() and len(ot) > 1:
            new_parts.append(vt.upper())
        elif ot[0].isupper():
            new_parts.append(vt.capitalize())
        else:
            new_parts.append(vt.lower())
    if "_" in original:
        reconstructed = "_".join(new_parts)
    else:
        reconstructed = "".join(new_parts)
        if name and name[0].islower() and reconstructed:
            reconstructed = reconstructed[0].lower() + reconstructed[1:]
    return reconstructed + suffix


# ---- Level 3 (intra_file_reorder.py) ----
def _is_def(node):
    return isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef))


def _group_reorderable_runs(body, predicate):
    runs = []
    current = []
    previous_index = None
    for index, node in enumerate(body):
        if not predicate(node):
            if current:
                runs.append(current)
                current = []
            previous_index = None
            continue
        if current and previous_index is not None and index != previous_index + 1:
            runs.append(current)
            current = []
        current.append(node)
        previous_index = index
    if current:
        runs.append(current)
    return runs


def _loaded_names(node):
    names = set()
    for child in ast.walk(node):
        if isinstance(child, ast.Name) and isinstance(child.ctx, ast.Load):
            names.add(child.id)
    return names


def _function_definition_names(node):
    names = set()
    for decorator in getattr(node, "decorator_list", []):
        names.update(_loaded_names(decorator))
    if getattr(node, "returns", None) is not None:
        names.update(_loaded_names(node.returns))
    if getattr(node, "type_params", None):
        for param in node.type_params:
            names.update(_loaded_names(param))
    args = getattr(node, "args", None)
    if args is None:
        return names
    all_args = list(args.posonlyargs) + list(args.args) + list(args.kwonlyargs)
    if args.vararg and args.vararg.annotation is not None:
        names.update(_loaded_names(args.vararg.annotation))
    if args.kwarg and args.kwarg.annotation is not None:
        names.update(_loaded_names(args.kwarg.annotation))
    for arg in all_args:
        if arg.annotation is not None:
            names.update(_loaded_names(arg.annotation))
    for default in list(args.defaults) + [item for item in args.kw_defaults if item is not None]:
        names.update(_loaded_names(default))
    return names


def _class_definition_names(node):
    names = set()
    for decorator in getattr(node, "decorator_list", []):
        names.update(_loaded_names(decorator))
    for base in getattr(node, "bases", []):
        names.update(_loaded_names(base))
    for keyword in getattr(node, "keywords", []):
        if keyword.value is not None:
            names.update(_loaded_names(keyword.value))
    for stmt in node.body:
        if isinstance(stmt, (ast.FunctionDef, ast.AsyncFunctionDef)):
            names.update(_function_definition_names(stmt))
            continue
        if isinstance(stmt, ast.ClassDef):
            names.update(_class_definition_names(stmt))
            continue
        names.update(_loaded_names(stmt))
    return names


def _definition_time_names(node):
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        return _function_definition_names(node)
    if isinstance(node, ast.ClassDef):
        return _class_definition_names(node)
    return set()


def build_run_specs(body, predicate):
    specs = []
    for run in _group_reorderable_runs(body, predicate):
        positions = {}
        for index, node in enumerate(run):
            positions.setdefault(node.name, []).append(index)
        deps = []
        for index, node in enumerate(run):
            required = set()
            for name in _definition_time_names(node):
                candidates = [candidate for candidate in positions.get(name, []) if candidate < index]
                if not candidates:
                    continue
                required.add(candidates[-1])
            deps.append(sorted(required))
        specs.append({"length": len(run), "deps": deps})
    return specs


def random_topological_order(run_spec, seed):
    rng = random.Random(seed)
    length = run_spec["length"]
    deps = [set(items) for items in run_spec["deps"]]
    dependents = {index: set() for index in range(length)}
    indegree = [0] * length
    for index, required in enumerate(deps):
        indegree[index] = len(required)
        for parent in required:
            dependents[parent].add(index)
    available = [index for index in range(length) if indegree[index] == 0]
    order = []
    while available:
        choice = rng.choice(sorted(available))
        available.remove(choice)
        order.append(choice)
        for child in sorted(dependents[choice]):
            indegree[child] -= 1
            if indegree[child] == 0:
                available.append(child)
    if len(order) != length:
        return list(range(length))
    base = list(range(length))
    if length <= 1:
        return order
    for _ in range(32):
        candidate_rng = random.Random(int(rng.random() * 2**32) + _)   # released: random.Random(f"{rng.random()}:{_}")
        candidate = []
        indegree = [len(items) for items in deps]
        available = [index for index in range(length) if indegree[index] == 0]
        while available:
            choice = candidate_rng.choice(sorted(available))
            available.remove(choice)
            candidate.append(choice)
            for child in sorted(dependents[choice]):
                indegree[child] -= 1
                if indegree[child] == 0:
                    available.append(child)
        if candidate != base:
            return candidate
    return order
