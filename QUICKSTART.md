# Quick Start Guide

## 🚀 Running the Application

### Step 1: Start the Backend Server

Open a terminal and run:

```bash
cd backend

# Make sure virtual environment is activated
source venv/bin/activate

# Start the server
bash start.sh
# OR
uvicorn app.main:app --reload
```

The backend API will be available at:
- **API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

### Step 2: Start the Frontend (in a new terminal)

Open a **new terminal window** and run:

```bash
cd frontend

# Install dependencies (first time only)
npm install

# Start the development server
bash start.sh
# OR
npm run dev
```

The frontend will be available at:
- **Frontend**: http://localhost:3000

## ✅ Verify Everything Works

1. **Check Backend Health**:
   ```bash
   curl http://localhost:8000/health
   ```
   Should return: `{"status":"healthy"}`

2. **Check API Docs**:
   Open http://localhost:8000/docs in your browser to see the interactive API documentation.

3. **Check Frontend**:
   Open http://localhost:3000 in your browser. You should see the Decision Risk Engine interface.

## 🧪 Test the Application

### Test Forecast Endpoint

```bash
curl -X POST "http://localhost:8000/api/forecast" \
  -H "Content-Type: application/json" \
  -d '{
    "decisions": [],
    "risks": [],
    "num_simulations": 100
  }'
```

### Test Decision Analysis

```bash
curl -X POST "http://localhost:8000/api/decisions/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "dec_001",
    "decision_type": "hire",
    "target_id": "work_item_001",
    "description": "Hire 2 engineers",
    "timestamp": "2024-01-15T10:00:00Z"
  }'
```

## 📝 Using the Frontend

1. **Forecast View**: Run Monte Carlo simulations to forecast work item completion times
2. **Decisions View**: Analyze the impact of decisions (hire, fire, delay, etc.) on work items
3. **Risks View**: Evaluate how risks affect project timelines

## 🛑 Stopping the Servers

- Press `Ctrl+C` in each terminal to stop the servers
- Or close the terminal windows

## 🔧 Troubleshooting

### Backend Issues

- **Port 8000 already in use**: Change the port in `start.sh` or kill the process using port 8000
- **Module not found**: Make sure venv is activated and packages are installed
- **Import errors**: Check that you're running from the `backend` directory

### Frontend Issues

- **Port 3000 already in use**: Vite will automatically use the next available port
- **API connection errors**: Make sure the backend is running on port 8000
- **npm install fails**: Try deleting `node_modules` and `package-lock.json`, then run `npm install` again

## 📚 Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Explore the API documentation at http://localhost:8000/docs
- Check out the code structure in `backend/app/` and `frontend/src/`

