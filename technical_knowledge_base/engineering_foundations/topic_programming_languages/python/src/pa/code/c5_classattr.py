class Agent:
    tools = []                    # ONE list, stored on the class, shared by all instances
    def __init__(self, name):
        self.name = name

a, b = Agent("a"), Agent("b")
a.tools.append("search")          # finds Agent.tools via the class, mutates it
print(b.tools, "tools" in vars(a))
a.tools = ["calc"]                # assignment creates an instance attribute that shadows it
print(a.tools, b.tools, Agent.tools)
