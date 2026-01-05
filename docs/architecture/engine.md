# Simulation Engine

Deep dive into the Monte Carlo forecast engine.

## Overview

The simulation engine is the core of the Decision Risk Engine. It uses Monte Carlo methods to generate probabilistic forecasts by running thousands of scenarios with random variation.

## Monte Carlo Method

### What is Monte Carlo Simulation?

Named after the Monte Carlo Casino, this statistical technique uses random sampling to solve problems that might be deterministic in principle but are too complex to solve analytically.

**Key Principles:**

1. **Random Sampling**: Draw values from probability distributions
2. **Iteration**: Repeat many times (1000-50000+)
3. **Aggregation**: Analyze the distribution of results
4. **Convergence**: More iterations = more accurate results

### Why Use Monte Carlo for Forecasting?

**Traditional Planning:**
```
Task A: 5 days
Task B: 3 days
Total: 8 days  ← Single point estimate, ignores uncertainty
```

**Monte Carlo Approach:**
```
Task A: 3-5-8 days (min-likely-max)
Task B: 2-3-5 days (min-likely-max)

Run 10,000 simulations:
  P50: 8.2 days
  P90: 11.5 days  ← Realistic range with confidence levels
```

**Benefits:**
- Captures uncertainty
- Provides confidence intervals
- Models complex dependencies
- Handles non-linear effects

## Core Algorithm

### High-Level Pseudocode

```python
def monte_carlo_forecast(work_items, num_simulations):
    all_results = []
    
    for simulation_number in range(num_simulations):
        # 1. Sample estimates
        durations = sample_estimates(work_items)
        
        # 2. Apply risks probabilistically
        for risk in risks:
            if random() < risk.probability:
                durations = apply_risk(durations, risk)
        
        # 3. Calculate completion dates
        dates = calculate_completion_dates(work_items, durations)
        
        # 4. Store this simulation's results
        all_results.append(dates)
    
    # 5. Calculate statistics
    return calculate_percentiles(all_results)
```

### Detailed Implementation

```python
import numpy as np
from collections import defaultdict
from datetime import datetime, timedelta

class MonteCarloEngine:
    def __init__(self, work_items, actors, dependencies):
        self.work_items = {item.id: item for item in work_items}
        self.actors = {actor.id: actor for actor in actors}
        self.dependencies = dependencies
        self.graph = self._build_dependency_graph()
        self.topological_order = self._topological_sort()
    
    def run_forecast(self, num_simulations, decisions=None, risks=None):
        """Run Monte Carlo simulation."""
        results = []
        
        # Optimize by pre-computing
        work_items_array = self._prepare_work_items(decisions)
        
        for sim in range(num_simulations):
            # Run one simulation
            result = self._single_simulation(
                work_items_array,
                risks
            )
            results.append(result)
        
        # Aggregate results
        return self._calculate_statistics(results)
    
    def _single_simulation(self, work_items, risks):
        """Execute one simulation iteration."""
        # 1. Sample durations from distributions
        durations = self._sample_durations(work_items)
        
        # 2. Apply risks
        if risks:
            durations = self._apply_risks(durations, risks)
        
        # 3. Calculate completion dates
        completion_dates = {}
        current_date = datetime.now()
        
        for item_id in self.topological_order:
            item = self.work_items[item_id]
            
            # Start date = max(current_date, max(dependency completion dates))
            start_date = current_date
            for dep_id in item.dependencies:
                dep_completion = completion_dates[dep_id]
                if dep_completion > start_date:
                    start_date = dep_completion
            
            # Completion date = start + duration / velocity
            actor = self.actors[item.assigned_actor_id]
            adjusted_duration = durations[item_id] / actor.velocity
            completion_dates[item_id] = start_date + timedelta(days=adjusted_duration)
        
        return completion_dates
    
    def _sample_durations(self, work_items):
        """Sample from triangular distributions."""
        durations = {}
        for item_id, item in work_items.items():
            # Use triangular distribution
            duration = np.random.triangular(
                item.estimate_min,
                item.estimate_likely,
                item.estimate_max
            )
            durations[item_id] = duration
        return durations
    
    def _apply_risks(self, durations, risks):
        """Apply risks probabilistically."""
        for risk in risks:
            # Does risk materialize?
            if np.random.random() < risk.probability:
                # Apply impact to affected items
                for item_id in risk.affected_work_item_ids:
                    if risk.impact_type == "delay_days":
                        durations[item_id] += risk.impact_value
                    elif risk.impact_type == "velocity_multiplier":
                        durations[item_id] /= risk.impact_value
                    elif risk.impact_type == "estimate_multiplier":
                        durations[item_id] *= risk.impact_value
        
        return durations
    
    def _calculate_statistics(self, results):
        """Calculate percentiles from simulation results."""
        percentiles = {}
        
        for item_id in self.work_items:
            # Extract completion dates for this item across all simulations
            dates = [result[item_id] for result in results]
            dates.sort()
            
            # Calculate percentiles
            percentiles[item_id] = {
                'P10': dates[int(len(dates) * 0.10)],
                'P50': dates[int(len(dates) * 0.50)],
                'P90': dates[int(len(dates) * 0.90)],
                'P99': dates[int(len(dates) * 0.99)]
            }
        
        return percentiles
```

## Probability Distributions

### Triangular Distribution

We use triangular distribution for work estimates because:

1. **Intuitive**: Easy to specify (min, likely, max)
2. **Flexible**: Can model asymmetric uncertainty
3. **Bounded**: Has clear min/max limits
4. **Simple**: Fast to sample

**Formula:**
```python
def triangular_sample(min_val, likely_val, max_val):
    u = random()
    fc = (likely_val - min_val) / (max_val - min_val)
    
    if u < fc:
        return min_val + sqrt(u * (max_val - min_val) * (likely_val - min_val))
    else:
        return max_val - sqrt((1 - u) * (max_val - min_val) * (max_val - likely_val))
```

**Properties:**
- Mode (peak) at `likely_val`
- Support from `min_val` to `max_val`
- Mean ≈ `(min + likely + max) / 3`

**Example:**
```
Estimate: min=3, likely=5, max=10

Distribution:
    |
    |    *
    |   * *
    |  *   *
    | *     *
    |*       **
    +------------
    3  5      10

Mean: (3 + 5 + 10) / 3 = 6 days
```

### Alternative Distributions

**Beta Distribution:**
- More parameters
- Greater flexibility
- Harder to specify

**Normal Distribution:**
- Unbounded (can go negative!)
- Symmetric only
- Less intuitive

**PERT Distribution:**
- Weighted triangular
- Formula: (min + 4*likely + max) / 6
- Good for expert estimates

## Dependency Resolution

### Topological Sorting

Work items must be processed in dependency order.

**Kahn's Algorithm:**

```python
def topological_sort(work_items, dependencies):
    """
    Sort items so each comes after its dependencies.
    Detects cycles.
    """
    # Build graph
    in_degree = {item.id: 0 for item in work_items}
    adj_list = defaultdict(list)
    
    for dep in dependencies:
        adj_list[dep.from_id].append(dep.to_id)
        in_degree[dep.to_id] += 1
    
    # Start with items that have no dependencies
    queue = [id for id, degree in in_degree.items() if degree == 0]
    result = []
    
    while queue:
        # Process item with no remaining dependencies
        item_id = queue.pop(0)
        result.append(item_id)
        
        # Remove edges from this item
        for neighbor in adj_list[item_id]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)
    
    # Check for cycles
    if len(result) != len(work_items):
        # Some items still have dependencies = cycle
        remaining = set(in_degree.keys()) - set(result)
        raise CyclicDependencyError(f"Cycle detected involving: {remaining}")
    
    return result
```

**Complexity:**
- Time: O(V + E) where V = items, E = dependencies
- Space: O(V + E)

**Example:**
```
Items: A, B, C, D
Dependencies: A→B, A→C, B→D, C→D

Topological order: [A, B, C, D] or [A, C, B, D]
Both valid!
```

### Critical Path Method (CPM)

Find the longest path through the dependency graph.

```python
def find_critical_path(work_items, durations, dependencies):
    """
    Find critical path using forward and backward pass.
    """
    # Forward pass: earliest start times
    earliest_start = {}
    earliest_finish = {}
    
    for item_id in topological_sort(work_items, dependencies):
        # Start = max(finish time of dependencies)
        start = max(
            [earliest_finish[dep] for dep in predecessors(item_id)] 
            or [0]
        )
        earliest_start[item_id] = start
        earliest_finish[item_id] = start + durations[item_id]
    
    # Backward pass: latest start times
    project_duration = max(earliest_finish.values())
    latest_finish = {}
    latest_start = {}
    
    for item_id in reversed(topological_sort(work_items, dependencies)):
        # Finish = min(start time of successors)
        finish = min(
            [latest_start[succ] for succ in successors(item_id)]
            or [project_duration]
        )
        latest_finish[item_id] = finish
        latest_start[item_id] = finish - durations[item_id]
    
    # Calculate slack (float)
    slack = {
        item_id: latest_start[item_id] - earliest_start[item_id]
        for item_id in work_items
    }
    
    # Critical path: items with zero slack
    critical_path = [item_id for item_id, s in slack.items() if s == 0]
    
    return critical_path, slack
```

**Uses:**
- Identify bottlenecks
- Prioritize optimization efforts
- Understand schedule flexibility

## Optimization Techniques

### 1. Vectorization

Use NumPy for batch operations:

**Slow (Python loop):**
```python
durations = []
for item in work_items:
    duration = random.triangular(item.min, item.likely, item.max)
    durations.append(duration)
```

**Fast (NumPy vectorized):**
```python
mins = np.array([item.min for item in work_items])
likelys = np.array([item.likely for item in work_items])
maxs = np.array([item.max for item in work_items])

durations = np.random.triangular(mins, likelys, maxs)
```

**Speedup:** 10-100x faster

### 2. Caching

Cache expensive computations:

```python
class MonteCarloEngine:
    def __init__(self, work_items, dependencies):
        # Compute once, use many times
        self.graph = self._build_graph(dependencies)  # Cache
        self.topological_order = self._topological_sort()  # Cache
        self.critical_path_template = self._find_critical_path_template()  # Cache
    
    def run_simulation(self):
        # Reuse cached structures
        for item_id in self.topological_order:  # Use cached order
            ...
```

### 3. Early Termination

Stop when convergence reached:

```python
def run_adaptive_simulation(target_precision=0.01):
    results = []
    prev_p50 = None
    
    for sim in range(1000, 50000, 1000):
        # Run 1000 more simulations
        results.extend(run_simulations(1000))
        
        # Check convergence
        current_p50 = calculate_p50(results)
        if prev_p50 and abs(current_p50 - prev_p50) < target_precision:
            break  # Converged!
        
        prev_p50 = current_p50
    
    return results
```

### 4. Parallel Processing

Distribute across CPU cores:

```python
from multiprocessing import Pool

def run_parallel_simulation(num_simulations, num_workers=4):
    with Pool(num_workers) as pool:
        # Divide work
        per_worker = num_simulations // num_workers
        
        # Run in parallel
        results = pool.map(
            run_simulations,
            [per_worker] * num_workers
        )
        
        # Combine results
        all_results = [item for sublist in results for item in sublist]
    
    return all_results
```

**Speedup:** Near-linear with core count

## Accuracy and Convergence

### Law of Large Numbers

As simulations increase, results converge to true distribution.

**Convergence Rate:**
```
Standard Error ∝ 1 / √n

n = 1,000:   SE ≈ 0.032 (3.2%)
n = 5,000:   SE ≈ 0.014 (1.4%)
n = 10,000:  SE ≈ 0.010 (1.0%)
n = 50,000:  SE ≈ 0.004 (0.4%)
```

**Practical Guidelines:**
- Quick check: 1,000 simulations (±3%)
- Standard analysis: 5,000-10,000 (±1-1.5%)
- High precision: 20,000+ (±0.7%)

### Confidence Intervals

Calculate confidence in percentile estimates:

```python
def bootstrap_confidence_interval(results, percentile=50, confidence=95):
    """
    Estimate confidence interval for percentile using bootstrap.
    """
    percentile_estimates = []
    
    for _ in range(1000):
        # Resample with replacement
        sample = np.random.choice(results, size=len(results), replace=True)
        # Calculate percentile
        p = np.percentile(sample, percentile)
        percentile_estimates.append(p)
    
    # Confidence interval
    lower = np.percentile(percentile_estimates, (100 - confidence) / 2)
    upper = np.percentile(percentile_estimates, 100 - (100 - confidence) / 2)
    
    return lower, upper
```

## Validation and Testing

### Test Cases

**1. Deterministic Case:**
```python
# All estimates are the same
item = WorkItem(min=5, likely=5, max=5)

results = run_simulation([item], num_simulations=1000)

# All percentiles should be 5 days
assert results['P10'] == results['P50'] == results['P90'] == 5
```

**2. Independent Items:**
```python
# Two independent items
A = WorkItem(min=2, likely=3, max=4)
B = WorkItem(min=3, likely=5, max=7)

results = run_simulation([A, B], num_simulations=10000)

# P50(A+B) ≈ P50(A) + P50(B)
assert abs(results['total_P50'] - (3 + 5)) < 0.5
```

**3. Serial Dependencies:**
```python
# B depends on A
A = WorkItem(min=2, likely=3, max=4)
B = WorkItem(min=3, likely=5, max=7, dependencies=[A])

results = run_simulation([A, B], num_simulations=10000)

# B finishes after A
assert results['B_P50'] > results['A_P50']
```

### Comparison to Analytical Methods

For simple cases, compare to analytical solutions:

```python
# Two independent triangular distributions
# Analytical mean = (min1 + likely1 + max1)/3 + (min2 + likely2 + max2)/3
analytical_mean = (2 + 3 + 4)/3 + (3 + 5 + 7)/3 = 8

# Simulation mean
simulation_mean = np.mean(simulation_results)

# Should be within 1%
assert abs(simulation_mean - analytical_mean) < 0.08
```

## Related Documentation

- [System Architecture](overview.md)
- [Data Models](models.md)
- [Forecast API](../api/forecast.md)

