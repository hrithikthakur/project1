# Decision Risk Engine

Welcome to the Decision Risk Engine documentation. This platform helps teams forecast project timelines using Monte Carlo simulations while analyzing the impact of decisions and risks.

## What is Decision Risk Engine?

Decision Risk Engine is a sophisticated forecasting tool that combines:

- **Monte Carlo Simulations** - Run thousands of scenarios to understand probability distributions
- **Decision Analysis** - Evaluate how decisions (hiring, delays, scope changes) impact timelines
- **Risk Modeling** - Quantify and track risks with automatic impact propagation
- **Dependency Management** - Model complex work item relationships and cascading effects

## Quick Navigation

### Getting Started
- [Installation Guide](getting-started/installation.md) - Set up your environment
- [Quick Start Tutorial](getting-started/quickstart.md) - Your first forecast in 5 minutes
- [Basic Concepts](getting-started/concepts.md) - Core terminology and ideas

### User Guides
- [Running Forecasts](guides/forecasts.md) - Generate timeline predictions
- [Managing Decisions](guides/decisions.md) - Model what-if scenarios
- [Tracking Risks](guides/risks.md) - Identify and quantify project risks
- [Work Items & Dependencies](guides/work-items.md) - Structure your project

### API Reference
- [REST API Overview](api/overview.md) - API architecture and authentication
- [Forecast Endpoints](api/forecast.md) - Generate predictions
- [Decision Endpoints](api/decisions.md) - Analyze decision impacts
- [Risk Endpoints](api/risks.md) - Model risk scenarios

### Architecture
- [System Architecture](architecture/overview.md) - High-level design
- [Simulation Engine](architecture/engine.md) - How forecasting works
- [Data Models](architecture/models.md) - Core data structures

### Examples
- [Example Scenarios](examples/scenarios.md) - Real-world use cases
- [Sample Projects](examples/projects.md) - Reference implementations

## Key Features

### 📊 Probabilistic Forecasting
Move beyond single-point estimates. Get P10, P50, P90, and P99 completion dates based on thousands of simulations.

### 🎯 Decision Impact Analysis
Understand how hiring, firing, delays, or scope changes affect your timeline before making the decision.

### ⚠️ Risk Quantification
Model risks with probability and impact, then see how they propagate through your dependency chain.

### 🔄 Automatic Ripple Effects
Changes cascade automatically through dependencies - no manual updates needed.

### 🎨 Modern Interface
Clean, intuitive React frontend with real-time updates and interactive visualizations.

## Technology Stack

**Backend**
- Python 3.8+ with FastAPI
- Pydantic for data validation
- Monte Carlo simulation engine

**Frontend**
- React 18 with TypeScript
- Vite for fast development
- Modern CSS with responsive design

## Use Cases

### Project Planning
Generate realistic timeline ranges for project milestones based on historical velocity data.

### Risk Management
Model potential risks and understand their expected impact on delivery dates.

### Resource Allocation
Analyze whether adding team members will meaningfully accelerate delivery.

### Stakeholder Communication
Show probability distributions instead of false precision with single dates.

## Support & Community

- **Issues**: Report bugs and request features on GitHub
- **Documentation**: You're reading it!
- **Examples**: Check the `/examples` directory for sample code

## License

MIT License - see LICENSE file for details.

---

Ready to get started? Head to the [Installation Guide](getting-started/installation.md) to set up your environment.
