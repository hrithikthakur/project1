# Quick Start Tutorial

Get up and running with your first forecast in 5 minutes.

## What You'll Build

In this tutorial, you'll:
1. Start the application
2. Load sample data
3. Run a Monte Carlo forecast
4. Analyze a decision impact
5. Model a risk scenario

## Prerequisites

- Completed the [Installation Guide](installation.md)
- Both backend and frontend servers running

## Step 1: Start the Application

Open two terminal windows:

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Visit http://localhost:3000 in your browser.

## Step 2: Explore the Dashboard

You should see the main dashboard with several sections:

- **Work Items** - Individual tasks in your project
- **Milestones** - Target dates and goals
- **Actors** - Team members and their capacity
- **Dependencies** - How work items relate to each other

### Understanding the Sample Data

The application comes with sample data representing a software project:

- **Epic: User Authentication** (Items 1-3)
- **Epic: Payment Integration** (Items 4-6)
- **Milestone: MVP Launch** (targeting specific date)

## Step 3: Run Your First Forecast

### Navigate to Forecast View

Click "Forecast" in the navigation menu.

### Configure the Simulation

```
Number of Simulations: 1000
Include Current State: ✓
```

### Run the Forecast

Click the **"Run Forecast"** button.

### Understand the Results

After a few seconds, you'll see results like:

```
Work Item #1: User Login
  P10: Jan 15, 2026
  P50: Jan 22, 2026  ← 50% chance of completing by this date
  P90: Feb 5, 2026
  P99: Feb 12, 2026
```

**What does this mean?**
- **P50 (median)**: 50% chance of completing by this date
- **P90**: 90% confidence of completing by this date
- **P10/P99**: Show the range of possible outcomes

## Step 4: Analyze a Decision

Let's model what happens if we hire a new engineer.

### Navigate to Decisions View

Click "Decisions" in the navigation menu.

### Create a Decision

```
Decision Type: hire
Target Work Item: 1
Description: Hire senior engineer to help with authentication
Effect Type: velocity_change
Effect Value: 1.3  (30% velocity increase)
Ramp-up Time: 14 days  (2 weeks to get productive)
```

### Run Decision Analysis

Click **"Analyze Decision"** to see:

**Before Decision:**
```
P50: Jan 22, 2026
```

**After Decision:**
```
P50: Jan 18, 2026
Improvement: 4 days
```

### Interpret the Results

The analysis shows:
- Initial ramp-up delay (2 weeks)
- Increased velocity after ramp-up
- Net improvement of 4 days
- Impact on dependent work items

## Step 5: Model a Risk

Now let's model a potential risk.

### Navigate to Risks View

Click "Risks" in the navigation menu.

### Create a Risk

```
Title: API Stability Issues
Description: Third-party payment API may be unstable
Severity: high
Probability: 0.3  (30% chance)
Impact Type: velocity_multiplier
Impact Value: 0.7  (30% slowdown if it occurs)
Affected Items: 4, 5, 6  (payment-related items)
```

### Run Risk Analysis

Click **"Analyze Risk"** to see expected impact:

```
Expected Delay: 2.1 days  (0.3 probability × 7 day impact)
P50 with Risk: Jan 24, 2026
P90 with Risk: Feb 8, 2026
```

### Understanding Risk Analysis

The engine calculates:
- **Expected value**: probability × impact
- **Ripple effects**: impact on dependent items
- **Combined uncertainty**: adds to simulation variance

## Step 6: Run Combined Scenarios

You can combine decisions and risks in a single forecast.

### Navigate to Forecast View

### Add Multiple Scenarios

1. Click "Add Decision" → Select your hiring decision
2. Click "Add Risk" → Select your API risk
3. Set simulations to 2000 (for better accuracy)
4. Click "Run Forecast"

### Compare Results

```
Baseline:          P50: Jan 22, 2026
+ Hire:            P50: Jan 18, 2026
+ Hire + Risk:     P50: Jan 21, 2026
```

This shows the hiring decision mostly offsets the risk impact.

## Understanding the Simulation

### How It Works

1. **Monte Carlo Method**: Runs thousands of simulations
2. **Random Sampling**: Each simulation samples from estimate ranges
3. **Dependency Resolution**: Respects work item dependencies
4. **Effect Propagation**: Decisions and risks ripple through the graph
5. **Statistical Analysis**: Aggregates results into percentiles

### Why Use This Approach?

Traditional project planning uses single-point estimates:
```
Task A: 5 days
Task B: 3 days
Total: 8 days  ← False precision!
```

Monte Carlo simulation acknowledges uncertainty:
```
Task A: 3-7 days (P50: 5 days)
Task B: 2-5 days (P50: 3 days)
Total: P50: 8.2 days, P90: 11.5 days  ← Realistic range!
```

## Next Steps

### Learn More Concepts

- [Basic Concepts](concepts.md) - Understand the data model
- [Work Items & Dependencies](../guides/work-items.md) - Structure your project
- [Forecast Guide](../guides/forecasts.md) - Advanced forecasting techniques

### Customize Your Data

1. Edit `data/mock_world.json` with your project data
2. Restart the backend
3. Refresh the frontend

### Explore Advanced Features

- **Milestone Tracking**: Associate work items with delivery dates
- **Resource Allocation**: Model team capacity and assignments
- **Dependency Types**: Blocking vs finish-to-start relationships
- **Scenario Comparison**: Run multiple what-if scenarios

### API Integration

Use the REST API to integrate with your tools:

```bash
# Run a forecast programmatically
curl -X POST http://localhost:8000/api/forecast \
  -H "Content-Type: application/json" \
  -d '{"num_simulations": 1000}'
```

See the [API Reference](../api/overview.md) for full documentation.

## Common Questions

### How many simulations should I run?

- **Quick exploration**: 1,000 simulations
- **Standard analysis**: 5,000 simulations
- **High precision**: 10,000+ simulations

More simulations = smoother distributions but slower computation.

### How accurate are the forecasts?

Forecasts are only as good as your input data:
- Use historical velocity data when possible
- Calibrate estimate ranges based on past performance
- Update regularly as work progresses

### Can I use real data instead of mock data?

Yes! Replace `data/mock_world.json` with your own data file, or integrate with your project management tool via the API.

## Troubleshooting

### Forecast returns empty results

- Check that work items have valid estimates
- Verify dependencies don't create cycles
- Look at browser console for errors

### Simulations are very slow

- Reduce number of simulations
- Simplify dependency graph
- Check for infinite loops in dependencies

### Results seem unrealistic

- Review estimate ranges (min/max/likely)
- Check velocity multipliers
- Verify dependency relationships

## Summary

You've learned how to:
- ✓ Run a Monte Carlo forecast
- ✓ Analyze decision impacts
- ✓ Model risk scenarios
- ✓ Interpret probabilistic results
- ✓ Combine multiple scenarios

Ready to dive deeper? Check out the [User Guides](../guides/) for detailed feature documentation.

