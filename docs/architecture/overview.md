# System Architecture

Comprehensive overview of the Decision Risk Engine architecture.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Dashboard │  │ Forecast │  │Decisions │  │  Risks   │   │
│  │   View   │  │   View   │  │   View   │  │   View   │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │              │             │          │
│       └─────────────┴──────────────┴─────────────┘          │
│                          │                                   │
│                     API Client                               │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/REST
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                   Backend (FastAPI)                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    API Layer                            │ │
│  │  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐   │ │
│  │  │Fcst  │  │Dcn   │  │Risk  │  │Work  │  │Meta  │   │ │
│  │  │Router│  │Router│  │Router│  │Router│  │Router│   │ │
│  │  └───┬──┘  └───┬──┘  └───┬──┘  └───┬──┘  └───┬──┘   │ │
│  └──────┼─────────┼─────────┼─────────┼─────────┼────────┘ │
│         │         │         │         │         │          │
│  ┌──────┴─────────┴─────────┴─────────┴─────────┴────────┐ │
│  │                   Business Logic                        │ │
│  │  ┌──────────────────┐  ┌──────────────────┐           │ │
│  │  │  Forecast Engine │  │ Risk Detector    │           │ │
│  │  │                  │  │                  │           │ │
│  │  │ - Monte Carlo    │  │ - Pattern Match  │           │ │
│  │  │ - Simulation     │  │ - Auto-detection │           │ │
│  │  │ - Percentiles    │  │                  │           │ │
│  │  └──────────────────┘  └──────────────────┘           │ │
│  │                                                         │ │
│  │  ┌──────────────────┐  ┌──────────────────┐           │ │
│  │  │ Decision Effects │  │  Ripple Engine   │           │ │
│  │  │                  │  │                  │           │ │
│  │  │ - Apply changes  │  │ - Propagate      │           │ │
│  │  │ - Rampup logic   │  │ - Dependencies   │           │ │
│  │  └──────────────────┘  └──────────────────┘           │ │
│  └──────────────────────────────────────────────────────┘ │
│         │                                                   │
│  ┌──────┴────────────────────────────────────────────────┐ │
│  │                   Data Layer                           │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │ │
│  │  │  Models  │  │  Loader  │  │  Cache   │            │ │
│  │  │ (Pydantic)│  │  (JSON)  │  │  (Dict)  │            │ │
│  │  └──────────┘  └──────────┘  └──────────┘            │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
                           │
                    ┌──────┴──────┐
                    │   Data      │
                    │mock_world.json│
                    └─────────────┘
```

## Technology Stack

### Frontend

**Core:**
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server

**Styling:**
- Custom CSS with modern features
- Responsive design
- Component-scoped styles

**State Management:**
- React hooks (useState, useEffect)
- Component-local state
- No external state library (intentionally simple)

**API Communication:**
- Native fetch API
- Type-safe wrappers in `api.ts`
- Error handling with toast notifications

### Backend

**Core:**
- **Python 3.8+** - Runtime
- **FastAPI** - Web framework
- **Pydantic** - Data validation
- **Uvicorn** - ASGI server

**Key Libraries:**
- **NumPy** - Numerical computations
- **python-dateutil** - Date handling
- **python-dotenv** - Configuration

**No Database:**
- File-based data storage (JSON)
- In-memory caching
- Suitable for medium datasets (<10k items)

## Core Components

### Frontend Components

**Dashboard.tsx**
- Main entry point
- Navigation between views
- Global state coordination

**ForecastView.tsx**
- Forecast configuration
- Results visualization
- Percentile display

**DecisionsView.tsx**
- Decision creation
- Impact analysis
- Decision comparison

**RisksView.tsx**
- Risk registration
- Risk analysis
- Portfolio view

**WorkItemsView.tsx**
- Work item management
- Dependency visualization
- Status tracking

### Backend Modules

**app/api/**
- REST endpoint definitions
- Request/response handling
- Validation

**app/engine/**
- Core simulation logic
- Monte Carlo engine
- Ripple effect propagation

**app/models/**
- Data models (Pydantic)
- Validation rules
- Type definitions

**app/data/**
- Data loading
- File I/O
- Caching

## Data Flow

### Forecast Generation Flow

```
1. User clicks "Run Forecast"
   ↓
2. Frontend sends POST /api/forecast
   {num_simulations: 5000, decisions: [...], risks: [...]}
   ↓
3. Backend receives request
   ↓
4. Load work items, actors, dependencies from JSON
   ↓
5. Apply decisions to baseline data
   ↓
6. Build dependency graph
   ↓
7. Run Monte Carlo simulation:
   For each iteration (1 to 5000):
     - Sample from estimate distributions
     - Apply risks probabilistically
     - Resolve dependencies
     - Calculate completion dates
   ↓
8. Aggregate results into percentiles
   ↓
9. Return forecast response
   ↓
10. Frontend displays results
```

### Decision Analysis Flow

```
1. User creates decision
   ↓
2. POST /api/decisions → Save decision
   ↓
3. User clicks "Analyze Decision"
   ↓
4. POST /api/decisions/analyze
   ↓
5. Run baseline forecast (without decision)
   ↓
6. Run forecast with decision applied
   ↓
7. Compare results
   ↓
8. Calculate impact metrics
   ↓
9. Return analysis
   ↓
10. Frontend displays comparison
```

## Monte Carlo Simulation Engine

### Algorithm

```python
def run_monte_carlo_simulation(work_items, num_simulations):
    results = []
    
    for simulation in range(num_simulations):
        # 1. Sample estimates
        sampled_durations = {}
        for item in work_items:
            # Sample from triangular distribution
            duration = triangular(
                item.estimate_min,
                item.estimate_likely,
                item.estimate_max
            )
            sampled_durations[item.id] = duration
        
        # 2. Apply risks
        for risk in risks:
            if random() < risk.probability:
                # Risk materializes
                apply_risk_impact(sampled_durations, risk)
        
        # 3. Resolve dependencies
        completion_dates = {}
        for item in topological_sort(work_items):
            start_date = max(
                current_date,
                max(completion_dates[dep] for dep in item.dependencies)
            )
            completion_dates[item.id] = start_date + sampled_durations[item.id]
        
        # 4. Store results
        results.append(completion_dates)
    
    # 5. Calculate percentiles
    percentiles = calculate_percentiles(results, [10, 50, 90, 99])
    
    return percentiles
```

### Optimizations

**Dependency Graph Caching:**
```python
# Build graph once, reuse across simulations
graph = build_dependency_graph(work_items)  # O(n)
topological_order = topological_sort(graph)  # O(n + e)

# Reuse for all simulations
for sim in range(num_simulations):
    # Use cached topological order
    for item_id in topological_order:
        ...
```

**Vectorized Sampling:**
```python
# Sample all estimates at once using NumPy
durations = np.random.triangular(mins, likelys, maxs, size=len(items))
```

**Lazy Evaluation:**
```python
# Only calculate what's requested
if filter_work_item_ids:
    # Only simulate these items and their dependencies
    relevant_items = get_transitive_dependencies(filter_work_item_ids)
else:
    relevant_items = all_items
```

## Dependency Resolution

### Topological Sort

```python
def topological_sort(work_items):
    """
    Sort work items so each item comes after its dependencies.
    Uses Kahn's algorithm.
    """
    # Build adjacency list
    graph = defaultdict(list)
    in_degree = defaultdict(int)
    
    for item in work_items:
        for dep in item.dependencies:
            graph[dep].append(item.id)
            in_degree[item.id] += 1
    
    # Start with items that have no dependencies
    queue = [id for id in work_items if in_degree[id] == 0]
    result = []
    
    while queue:
        item_id = queue.pop(0)
        result.append(item_id)
        
        # Remove edges
        for neighbor in graph[item_id]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)
    
    # Check for cycles
    if len(result) != len(work_items):
        raise CyclicDependencyError()
    
    return result
```

### Critical Path Detection

```python
def find_critical_path(work_items, completion_dates):
    """
    Find the longest path through the dependency graph.
    This is the critical path that determines project duration.
    """
    # Calculate slack for each item
    slack = {}
    for item_id in reversed(topological_sort(work_items)):
        if is_leaf(item_id):
            slack[item_id] = 0
        else:
            # Slack = min(successor_start - this_end)
            slack[item_id] = min(
                completion_dates[succ] - completion_dates[item_id]
                for succ in successors(item_id)
            )
    
    # Critical path items have zero slack
    critical_path = [id for id, s in slack.items() if s == 0]
    
    return critical_path
```

## Ripple Effect Propagation

### How Ripples Work

When a decision or risk affects a work item, the effect propagates through the dependency graph:

```
Decision: Delay Item 1 by 5 days

Direct Impact:
  Item 1: start_date += 5 days

Ripple to Dependencies:
  Item 2 (depends on 1): start_date += 5 days
  Item 3 (depends on 2): start_date += 5 days
  Item 4 (depends on 1): start_date += 5 days
  
Milestone Impact:
  Milestone (includes 1, 2, 3, 4): expected_date += 5 days
```

### Implementation

```python
def propagate_ripple_effects(affected_items, effect_type, effect_value, graph):
    """
    Propagate effects through dependency graph.
    """
    # Start with directly affected items
    queue = affected_items.copy()
    applied_effects = {}
    
    while queue:
        item_id = queue.pop(0)
        
        # Apply effect to this item
        applied_effects[item_id] = apply_effect(
            item_id, effect_type, effect_value
        )
        
        # Add successors to queue
        for successor_id in graph.successors(item_id):
            if successor_id not in applied_effects:
                queue.append(successor_id)
    
    return applied_effects
```

## Scalability Considerations

### Current Limits

**Work Items:** ~1,000 items
- Beyond this, simulation time increases significantly
- UI becomes cluttered

**Simulations:** ~50,000 iterations
- Limited by computation time
- Diminishing returns beyond 10,000

**Dependencies:** ~5,000 edges
- Graph algorithms remain fast (O(n + e))
- Visualization becomes difficult

### Scaling Strategies

**For Larger Projects:**

1. **Hierarchical Forecasting**
   - Forecast epics, not individual items
   - Roll up estimates

2. **Incremental Simulation**
   - Only re-simulate changed items
   - Cache unchanged results

3. **Parallel Simulation**
   - Use multiprocessing
   - Distribute simulations across cores

4. **Database Backend**
   - Replace JSON with PostgreSQL
   - Enable querying and indexing

5. **Approximation Algorithms**
   - Use analytical approximations for large graphs
   - Monte Carlo only for critical path

## Security Considerations

### Current State

**Development:**
- No authentication
- Open CORS policy
- Suitable for local use only

**Production Recommendations:**

1. **Authentication**
   - JWT tokens
   - OAuth2 integration
   - API key management

2. **Authorization**
   - Role-based access control
   - Project-level permissions
   - Read/write separation

3. **Input Validation**
   - Already handled by Pydantic
   - Add rate limiting
   - Sanitize file uploads

4. **HTTPS**
   - TLS encryption
   - Certificate management

5. **Secrets Management**
   - Environment variables
   - Secret storage service
   - Rotation policies

## Deployment Architecture

### Development

```
Local Machine:
  - Backend on localhost:8000
  - Frontend on localhost:3000
  - Data in local JSON file
```

### Production (Recommended)

```
                    ┌──────────────┐
                    │   CDN/Edge   │
                    │   (Frontend) │
                    └──────┬───────┘
                           │
                    ┌──────┴───────┐
                    │ Load Balancer│
                    └──────┬───────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────┴────┐      ┌────┴────┐      ┌────┴────┐
    │Backend 1│      │Backend 2│      │Backend 3│
    └────┬────┘      └────┬────┘      └────┬────┘
         │                │                 │
         └────────────────┼─────────────────┘
                          │
                    ┌─────┴──────┐
                    │  Database  │
                    │(PostgreSQL)│
                    └────────────┘
```

## Performance Benchmarks

### Simulation Performance

**Test Setup:**
- 100 work items
- 20 dependencies
- MacBook Pro M1

**Results:**

| Simulations | Time | Throughput |
|------------|------|------------|
| 1,000 | 0.3s | 3,333/sec |
| 5,000 | 1.2s | 4,167/sec |
| 10,000 | 2.4s | 4,167/sec |
| 50,000 | 12s | 4,167/sec |

**Observations:**
- Linear scaling with simulations
- Constant throughput (~4,000 sims/sec)
- Memory usage: ~50MB per 10k simulations

## Future Enhancements

### Planned Features

1. **Machine Learning**
   - Estimate prediction based on historical data
   - Risk detection using patterns
   - Velocity forecasting

2. **Real-time Collaboration**
   - WebSocket updates
   - Multi-user editing
   - Change notifications

3. **Advanced Visualizations**
   - Gantt charts
   - Burndown charts
   - Risk heat maps

4. **Integrations**
   - Jira import/export
   - GitHub integration
   - Slack notifications

5. **Mobile App**
   - React Native
   - Offline support
   - Push notifications

## Related Documentation

- [Simulation Engine Details](engine.md)
- [Data Models](models.md)
- [API Reference](../api/overview.md)

