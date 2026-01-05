# Project Planning & Risk Analysis Engine

A sophisticated Monte Carlo simulation engine for forecasting work item completion times with advanced decision analysis, risk detection, and what-if scenario planning.

## 🚀 Overview

This application provides a comprehensive suite of project management and forecasting tools:

### Core Features
- **🎲 Monte Carlo Forecasting**: Run sophisticated simulations with probabilistic outcomes (P10/P50/P80/P90/P99)
- **📊 Causal Attribution**: Understand exactly why projects slip with detailed contribution breakdowns
- **🔄 What-If Scenarios**: Explore hypothetical changes before committing
- **⚠️ Risk Detection**: Automated detection of project risks with severity scoring
- **💡 Decision Analysis**: Analyze impact of decisions (hire, fire, delay, accelerate, etc.)
- **🔗 Dependency Intelligence**: Advanced dependency delay calculations with 6-factor analysis
- **🌊 Ripple Effects**: Automatically propagate effects through dependency chains
- **🎯 Mitigation Preview**: Preview the impact of risk mitigations before implementing

## 🏗️ Architecture

### Backend (FastAPI + Python 3.8+)
- **API Layer**: RESTful endpoints with automatic OpenAPI documentation
- **Forecast Engine**: Advanced Monte Carlo simulator with causal tracking
- **Decision Risk Engine**: Analyze decisions and their cascading impacts
- **Dependency Graph**: Intelligent delay calculation with progress tracking
- **Risk Detector**: Automated risk identification from project state
- **Models**: Strict Pydantic models for type safety and validation

### Frontend (React + TypeScript + Vite)
- **Dashboard**: Overview of all work items, risks, and decisions
- **Forecast View**: Interactive Monte Carlo simulations with percentile charts
- **Decision View**: Decision creation and impact analysis
- **Risk View**: Risk management with auto-detection and acceptance workflows
- **What-If Scenarios**: Explore hypothetical changes interactively
- **API Client**: Type-safe API wrappers with error handling

## 🎯 Key Capabilities

### 1. Advanced Forecasting
- **Multi-factor delay calculation** with 6 distinct factors:
  - Progress-based (actual remaining work)
  - Date-based (calendar dependencies)
  - Team history (external vendor reliability)
  - Probabilistic weighting
  - Criticality multipliers
  - Status fallback
- **Contribution breakdown** showing exactly what's causing delays
- **Baseline vs scenario comparison** for decision making

### 2. What-If Scenarios
Explore hypothetical changes without modifying your project state:
- **Dependency delays**: "What if vendor X is 5 days late?"
- **Work removal**: "What if we cut this feature?"
- **Risk materialization**: "What if this risk actually happens?"
- **Combined scenarios**: Test multiple changes together

### 3. Risk Intelligence
- **Auto-detection** of risks from project state:
  - Blocked dependencies
  - External team delays
  - Resource constraints
  - Critical path vulnerabilities
- **Risk acceptance workflow** with expiration tracking
- **Mitigation preview** before committing changes
- **Auto-sync** of risk status with work item state

### 4. Decision Impact Analysis
Analyze the ripple effects of:
- **Hiring/Firing**: Team velocity changes
- **Scope changes**: Add/remove work
- **Resource allocation**: Shift team members
- **Timeline adjustments**: Delay or accelerate work
- **Dependency changes**: Modify blocking relationships

## ⚡ Quick Start

The fastest way to get started:

```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate  # If already set up
bash start.sh

# Terminal 2 - Frontend  
cd frontend
npm install  # First time only
bash start.sh
```

Visit:
- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

📖 **See [QUICKSTART.md](QUICKSTART.md) for detailed setup and testing instructions.**

## 🛠️ Installation

### Prerequisites
- **Python 3.8+** (Python 3.11+ recommended)
- **Node.js 16+** and npm
- **pip** and **venv** module

### Backend Setup

**Option 1: Automated Setup (Recommended)**
```bash
cd backend
chmod +x setup.sh
bash setup.sh
source venv/bin/activate
```

**Option 2: Manual Setup**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

**Start the backend:**
```bash
uvicorn app.main:app --reload
# Or use the start script:
bash start.sh
```

The API will be available at `http://localhost:8000`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Or use the start script:
bash start.sh
```

The frontend will be available at `http://localhost:3000`

### Troubleshooting

**Virtual Environment Issues:**
```bash
# Verify venv is active
which python  # Should show 'venv' in path
bash check_venv.sh  # Run diagnostic script

# If issues persist, recreate venv
deactivate
rm -rf venv
bash setup.sh
```

**Python Version:**
- Python 3.13 is supported with flexible version constraints
- Python 3.11+ recommended for best compatibility
- Use `python3` and `pip3` on macOS if needed

## 📖 Usage

### Via Frontend (Recommended)

#### 1. Running Forecasts
1. Navigate to the **Forecast** tab
2. Select a milestone from the dropdown
3. Adjust simulation count (default: 1000)
4. Click **"Run Forecast"**
5. View results:
   - Percentile predictions (P10/P50/P80/P90/P99)
   - Contribution breakdown (what's causing delays)
   - Visual timeline charts

#### 2. What-If Scenarios
1. In the **Forecast** tab, click **"What-If Scenarios"**
2. Choose scenario type:
   - **Dependency Delay**: Test vendor delays
   - **Work Removal**: Test scope cuts
   - **Risk Materialization**: Test risk impacts
3. Configure parameters and click **"Run Scenario"**
4. Compare baseline vs scenario results side-by-side

#### 3. Risk Management
1. Navigate to the **Risks** tab
2. View **auto-detected risks** or create manual risks
3. For each risk:
   - Set severity (low/medium/high/critical)
   - Set probability (0-1)
   - Define impact (delay days or velocity multiplier)
   - Add affected work items
4. **Accept risks** with expiration dates if needed
5. **Preview mitigations** before committing

#### 4. Decision Analysis
1. Navigate to the **Decisions** tab
2. Click **"Create Decision"**
3. Select decision type and configure:
   - **hire**: Increase team capacity
   - **fire**: Decrease team capacity
   - **delay**: Push out work items
   - **accelerate**: Speed up delivery
   - **change_scope**: Modify work
4. Click **"Analyze Decision"** to see ripple effects
5. Review impact on dependent work items

### Via API

All features are available through the REST API. See the [API Documentation](#-api-reference) section below.

### Via Python Code

```python
from app.engine.forecast import forecastMilestone
from app.data.loader import load_world

# Load project data
world = load_world()

# Run forecast
result = forecastMilestone("milestone_001", world)

# Access results
print(f"P50 Completion: {result.p50_date}")
print(f"Expected Delay: {result.delta_p50_days} days")

# See contribution breakdown
for contrib in result.contribution_breakdown[:5]:
    print(f"  {contrib['cause']}: {contrib['days']:+.1f} days")
```

See [FORECAST_ENGINE_QUICKSTART.md](FORECAST_ENGINE_QUICKSTART.md) for more examples.

## 📊 Data Model

The application uses `data/mock_world.json` which contains:

### Core Entities
- **Work Items**: Tasks with estimates, dependencies, assignments, and progress tracking
  - Fields: `id`, `title`, `status`, `estimated_days`, `remaining_days`, `completion_percentage`
  - Optional: `external_team_id`, `expected_completion_date`
  
- **Milestones**: Target dates with associated work items
  - Fields: `id`, `title`, `target_date`, `work_item_ids`
  
- **Dependencies**: Relationships between work items with criticality
  - Fields: `from_id`, `to_id`, `dependency_type`, `criticality`, `slack_days`, `probability_delay`
  
- **Risks**: Threats to project success
  - Fields: `id`, `title`, `severity`, `probability`, `impact`, `affected_work_item_ids`
  - Status: `open`, `accepted`, `closed`, `mitigated`
  
- **Decisions**: Strategic changes to the project
  - Fields: `id`, `decision_type`, `target_id`, `description`, `timestamp`
  
- **Actors**: Team members and external resources
  - Fields: `id`, `name`, `role`, `capacity`, `velocity`

### Advanced Features
- **External Team History**: Track vendor reliability
  - `avg_slip_days`, `slip_probability`, `reliability_score`
  
- **Dependency Criticality Levels**:
  - `low` (0.5x impact), `medium` (1.0x), `high` (1.5x), `critical` (2.0x)

## 🔌 API Reference

### Forecast Endpoints

**GET `/api/forecast/{milestone_id}`**
Get baseline forecast for a milestone.

```bash
curl http://localhost:8000/api/forecast/milestone_001
```

**POST `/api/forecast/{milestone_id}/scenario`**
Run a what-if scenario.

```bash
curl -X POST http://localhost:8000/api/forecast/milestone_001/scenario \
  -H "Content-Type: application/json" \
  -d '{
    "scenario_type": "dependency_delay",
    "params": {"work_item_id": "wi_002", "delay_days": 5}
  }'
```

**POST `/api/forecast/{milestone_id}/mitigation-preview`**
Preview risk mitigation impact.

```bash
curl -X POST http://localhost:8000/api/forecast/milestone_001/mitigation-preview \
  -H "Content-Type: application/json" \
  -d '{
    "risk_id": "risk_001",
    "expected_impact_reduction_days": 3
  }'
```

### Decision Endpoints

**POST `/api/decisions`**
Create a new decision.

```bash
curl -X POST http://localhost:8000/api/decisions \
  -H "Content-Type: application/json" \
  -d '{
    "id": "dec_001",
    "decision_type": "hire",
    "target_id": "actor_001",
    "description": "Hire 2 senior engineers",
    "timestamp": "2026-01-15T10:00:00Z"
  }'
```

**POST `/api/decisions/analyze`**
Analyze decision impact.

```bash
curl -X POST http://localhost:8000/api/decisions/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "id": "dec_001",
    "decision_type": "hire",
    "target_id": "work_item_001"
  }'
```

**GET `/api/decisions`**
List all decisions.

### Risk Endpoints

**GET `/api/risks`**
List all risks.

**GET `/api/risks/detect`**
Auto-detect risks from current project state.

**POST `/api/risks`**
Create a new risk.

```bash
curl -X POST http://localhost:8000/api/risks \
  -H "Content-Type: application/json" \
  -d '{
    "id": "risk_001",
    "title": "Vendor API Delay",
    "severity": "high",
    "probability": 0.7,
    "impact": {"type": "delay", "value": 5},
    "affected_work_item_ids": ["wi_002", "wi_003"]
  }'
```

**POST `/api/risks/{risk_id}/accept`**
Accept a risk with expiration.

**DELETE `/api/risks/{risk_id}`**
Delete a risk.

### Work Item Endpoints

**GET `/api/work-items`**
List all work items.

**GET `/api/work-items/{work_item_id}`**
Get work item details.

### Metadata Endpoints

**GET `/api/metadata`**
Get project metadata (milestones, work items, dependencies).

**Interactive API Documentation**: Visit http://localhost:8000/docs for full Swagger UI with request/response examples.

## 🎯 Decision Types

| Type | Effect | Use Case |
|------|--------|----------|
| `hire` | Increase team velocity | Adding team members |
| `fire` | Decrease team velocity | Team reduction |
| `delay` | Add delay to work items | External dependencies |
| `accelerate` | Increase velocity, reduce time | Fast-track initiatives |
| `change_scope` | Modify scope of work | Feature cuts or additions |
| `add_resource` | Add resource to team | Specialized skills |
| `remove_resource` | Remove resource from team | Reallocation |

## 📚 Documentation

### Quick References
- **[QUICKSTART.md](QUICKSTART.md)** - Get started in 5 minutes
- **[FORECAST_ENGINE_QUICKSTART.md](FORECAST_ENGINE_QUICKSTART.md)** - Forecast engine guide
- **[DEPENDENCY_DELAYS_FIXED.md](DEPENDENCY_DELAYS_FIXED.md)** - Advanced dependency features

### Feature Documentation
- **[WHAT_IF_SCENARIOS_FIXED.md](WHAT_IF_SCENARIOS_FIXED.md)** - What-if scenario guide
- **[RISK_ACCEPTANCE_WORKFLOW.md](RISK_ACCEPTANCE_WORKFLOW.md)** - Risk acceptance workflow
- **[RISK_AUTO_SYNC_GUIDE.md](RISK_AUTO_SYNC_GUIDE.md)** - Auto-sync risk detection
- **[ISSUES_FEATURE.md](ISSUES_FEATURE.md)** - Issues and blocking feature

### Architecture Documentation
- **[FORECAST_ENGINE_ARCHITECTURE.md](FORECAST_ENGINE_ARCHITECTURE.md)** - Forecast engine design
- **[DECISION_RISK_ENGINE.md](backend/DECISION_RISK_ENGINE.md)** - Decision risk engine overview
- **[FORECAST_ENGINE_DELIVERY.md](FORECAST_ENGINE_DELIVERY.md)** - Implementation details

### API & Guides
- **[docs/](docs/)** - Complete documentation site
  - API reference
  - User guides
  - Examples and tutorials

## 🧪 Testing

### Run Examples

```bash
# Forecast engine examples
cd backend/app/engine
python3 forecast_examples.py

# Improved dependency examples
python3 improved_dependency_examples.py

# Decision risk engine tests
python3 test_decision_risk_engine.py
```

### Test Endpoints

```bash
# Health check
curl http://localhost:8000/health

# Run forecast
curl http://localhost:8000/api/forecast/milestone_001

# Detect risks
curl http://localhost:8000/api/risks/detect

# Get metadata
curl http://localhost:8000/api/metadata
```

## 🌟 Key Features Explained

### Dependency Delay Calculation
Our advanced 6-factor model calculates realistic delays:
1. **Progress tracking** - Uses actual remaining work
2. **Date-based** - Considers calendar dependencies  
3. **Team history** - Factors in vendor reliability
4. **Probabilistic** - Weights by delay probability
5. **Criticality** - Multiplies by importance (0.5x to 2.0x)
6. **Status fallback** - Uses status when data unavailable

### Causal Attribution
Unlike basic forecasts, we track **why** projects are delayed:
- Contribution breakdown for every delay
- Identify bottlenecks and critical dependencies
- Prioritize interventions by impact

### What-If Analysis
Test changes before committing:
- **No side effects** - Scenarios don't modify your data
- **Fast feedback** - Results in milliseconds
- **Compare outcomes** - Baseline vs scenario side-by-side

## 🤝 Contributing

This is a project management and forecasting tool. Key areas for contribution:
- Additional decision types
- New risk detection rules
- Enhanced visualization components
- Performance optimizations

## 📝 License

MIT

## 🔗 Links

- **API Documentation**: http://localhost:8000/docs
- **Frontend**: http://localhost:3000
- **Health Check**: http://localhost:8000/health

