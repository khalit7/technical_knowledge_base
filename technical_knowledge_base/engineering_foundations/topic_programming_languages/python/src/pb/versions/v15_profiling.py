import cProfile
import profiling.sampling
import profiling.tracing

print("cProfile.Profile is profiling.tracing.Profile:", cProfile.Profile is profiling.tracing.Profile)
