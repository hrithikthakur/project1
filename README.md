# Decision Risk Engine

A Monte Carlo simulation engine for forecasting work item completion times with decision and risk analysis.

## Overview

This application provides:
- **Monte Carlo Forecasting**: Simulate work item completion times with uncertainty
- **Decision Analysis**: Analyze the impact of decisions (hire, fire, delay, etc.) on work items
- **Risk Analysis**: Evaluate how risks affect project timelines
- **Ripple Effects**: Automatically propagate effects through dependency chains

## Architecture

### Backend (FastAPI)
- **API Endpoints**: `/forecast`, `/decisions`, `/risks`
- **Engine**: Monte Carlo simulator with dependency graph and ripple effect propagation
- **Models**: Pydantic models for type safety and validation

### Frontend (React + TypeScript)
- **Components**: ForecastView, DecisionView, RiskView
- **API Client**: Type-safe API wrappers
- **Modern UI**: Clean, responsive interface

## Setup

### Backend

**Prerequisites:** Python 3.8+ and pip

If you don't have Python/pip installed on macOS:

1. **Install Python via Homebrew** (recommended):
   ```bash
   brew install python3
   ```

2. **Or download from python.org**: https://www.python.org/downloads/

3. **Verify installation**:
   ```bash
   python3 --version
   pip3 --version
   ```

**Setup steps:**

**Option 1: Use the setup script (recommended):**
```bash
cd backend
chmod +x setup.sh
bash setup.sh
source venv/bin/activate
uvicorn app.main:app --reload
```

**Option 2: Manual setup:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# IMPORTANT: Use 'python -m pip' to avoid global conflicts
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

uvicorn app.main:app --reload
```

**Troubleshooting virtual environment conflicts:**

If you're getting global package conflicts even with venv activated:

1. **Verify venv is active:**
   ```bash
   which python  # Should show path with 'venv' in it
   which pip     # Should show path with 'venv' in it
   ```

2. **Always use `python -m pip` instead of `pip`:**
   ```bash
   python -m pip install -r requirements.txt
   ```

3. **Check venv status:**
   ```bash
   bash check_venv.sh
   ```

4. **If still having issues, recreate the venv:**
   ```bash
   deactivate
   rm -rf venv
   bash setup.sh
   ```

**Note:** 
- On macOS, you may need to use `python3` and `pip3` instead of `python` and `pip`.
- **Python 3.13 Compatibility**: If you're using Python 3.13, the requirements use flexible version constraints (>=) to ensure compatibility. For Python 3.12 or earlier, you can pin exact versions if preferred.

The API will be available at `http://localhost:8000`

**Quick start:**
```bash
cd backend
source venv/bin/activate
bash start.sh
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`

**Quick start:**
```bash
cd frontend
bash start.sh
```

📖 **See [QUICKSTART.md](QUICKSTART.md) for detailed setup and testing instructions.**

## Usage

### Running Forecasts

1. Navigate to the Forecast view
2. Set the number of simulations (default: 1000)
3. Click "Run Forecast"
4. View percentile results (P10, P50, P90, P99) for each work item

### Analyzing Decisions

1. Navigate to the Decisions view
2. Select a decision type (hire, fire, delay, etc.)
3. Enter the target work item ID
4. Add a description
5. Click "Analyze Decision" to see impact on affected items

### Analyzing Risks

1. Navigate to the Risks view
2. Enter risk details (title, description, severity, probability)
3. Set impact (e.g., velocity multiplier)
4. Add affected work item IDs
5. Click "Analyze Risk" to see expected impact

## Data Model

The application uses `data/mock_world.json` which contains:
- **Work Items**: Tasks with estimates, dependencies, and assignments
- **Milestones**: Target dates with associated work items
- **Dependencies**: Relationships between work items
- **Resources**: Team members and their capacity

## API Endpoints

### POST `/api/forecast`
Generate forecast with optional decisions and risks.

**Request:**
```json
{
  "decisions": [],
  "risks": [],
  "num_simulations": 1000
}
```

### POST `/api/decisions`
Create a new decision.

### POST `/api/decisions/analyze`
Analyze decision impact.

### POST `/api/risks`
Create a new risk.

### POST `/api/risks/analyze`
Analyze risk impact.

## Decision Types

- `hire`: Increase team velocity
- `fire`: Decrease team velocity
- `delay`: Add delay to work items
- `accelerate`: Increase velocity and reduce time
- `change_scope`: Modify scope of work
- `add_resource`: Add resource to team
- `remove_resource`: Remove resource from team

## License

MIT

