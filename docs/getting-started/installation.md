# Installation Guide

This guide will help you set up the Decision Risk Engine on your local machine.

## Prerequisites

### Required Software

- **Python 3.8 or higher** - Backend runtime
- **Node.js 16 or higher** - Frontend runtime
- **npm or yarn** - Package manager
- **Git** - Version control

### Operating System Support

- macOS 10.15+
- Linux (Ubuntu 20.04+, Debian 10+)
- Windows 10+ (with WSL2 recommended)

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/decision-risk-engine.git
cd decision-risk-engine
```

### 2. Backend Setup

#### Option A: Using the Setup Script (Recommended)

```bash
cd backend
chmod +x setup.sh
./setup.sh
```

This script will:
- Create a Python virtual environment
- Install all required dependencies
- Verify the installation

#### Option B: Manual Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On macOS/Linux
# or
venv\Scripts\activate     # On Windows

# Upgrade pip
python -m pip install --upgrade pip

# Install dependencies
python -m pip install -r requirements.txt
```

#### Verify Backend Installation

```bash
# Make sure venv is activated
python --version  # Should show Python 3.8+

# Check installed packages
pip list

# Run health check
uvicorn app.main:app --reload
# Visit http://localhost:8000/health
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Verify installation
npm run dev
# Visit http://localhost:3000
```

## Platform-Specific Instructions

### macOS

#### Installing Python

**Method 1: Homebrew (Recommended)**
```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Python
brew install python3

# Verify
python3 --version
```

**Method 2: Official Installer**
Download from [python.org](https://www.python.org/downloads/macos/)

#### Installing Node.js

```bash
# Using Homebrew
brew install node

# Verify
node --version
npm --version
```

### Linux (Ubuntu/Debian)

```bash
# Update package list
sudo apt update

# Install Python
sudo apt install python3 python3-pip python3-venv

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs

# Verify installations
python3 --version
node --version
npm --version
```

### Windows

We recommend using WSL2 (Windows Subsystem for Linux) for the best experience.

#### Setting up WSL2

```powershell
# In PowerShell (as Administrator)
wsl --install
```

Then follow the Linux instructions above within WSL2.

#### Native Windows Installation

1. Install Python from [python.org](https://www.python.org/downloads/windows/)
2. Install Node.js from [nodejs.org](https://nodejs.org/)
3. Use Command Prompt or PowerShell for commands

## Configuration

### Environment Variables

Create a `.env` file in the `backend` directory:

```bash
# Backend .env
API_PORT=8000
CORS_ORIGINS=http://localhost:3000
LOG_LEVEL=info
```

Create a `.env` file in the `frontend` directory:

```bash
# Frontend .env
VITE_API_URL=http://localhost:8000
```

### Data Files

The application uses `data/mock_world.json` for sample data. You can customize this file or point to your own data source.

```bash
# Copy the example data file
cp data/mock_world.json.example data/mock_world.json
```

## Starting the Application

### Quick Start

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

### Using Start Scripts

```bash
# Backend
cd backend
./start.sh

# Frontend
cd frontend
./start.sh
```

## Verification

Once both servers are running:

1. **Backend Health Check**
   - Visit: http://localhost:8000/health
   - Should return: `{"status": "healthy"}`

2. **API Documentation**
   - Visit: http://localhost:8000/docs
   - Interactive API documentation (Swagger UI)

3. **Frontend Application**
   - Visit: http://localhost:3000
   - Should show the main dashboard

## Troubleshooting

### Python Virtual Environment Issues

**Problem**: `command not found: python3`
```bash
# macOS/Linux: Install Python
brew install python3  # macOS
sudo apt install python3  # Linux
```

**Problem**: Virtual environment activation fails
```bash
# Recreate the virtual environment
rm -rf venv
python3 -m venv venv
source venv/bin/activate
```

**Problem**: Wrong Python version in venv
```bash
# Specify Python version explicitly
python3.11 -m venv venv
```

### Dependency Installation Issues

**Problem**: `pip install` fails with permission error
```bash
# Always use virtual environment
source venv/bin/activate
# Use python -m pip instead of pip directly
python -m pip install -r requirements.txt
```

**Problem**: Package conflicts
```bash
# Clear pip cache
pip cache purge
# Reinstall dependencies
pip install --force-reinstall -r requirements.txt
```

### Port Already in Use

**Problem**: `Address already in use` error

```bash
# Find process using port 8000
lsof -i :8000  # macOS/Linux
netstat -ano | findstr :8000  # Windows

# Kill the process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows

# Or use a different port
uvicorn app.main:app --reload --port 8001
```

### CORS Errors

If you see CORS errors in the browser console:

1. Check that backend is running on correct port
2. Verify CORS_ORIGINS in backend `.env` matches frontend URL
3. Restart backend after changing CORS settings

### Module Not Found Errors

**Problem**: `ModuleNotFoundError` when running backend

```bash
# Ensure you're in the backend directory
cd backend

# Ensure venv is activated (you should see (venv) in prompt)
source venv/bin/activate

# Verify packages are installed
pip list

# Reinstall if needed
pip install -r requirements.txt
```

## Next Steps

Now that you have the application running:

1. Follow the [Quick Start Tutorial](quickstart.md) to run your first forecast
2. Review [Basic Concepts](concepts.md) to understand the data model
3. Explore the [User Guides](../guides/) for detailed feature documentation

## Getting Help

- Check the [Troubleshooting Guide](troubleshooting.md) for common issues
- Review [FAQ](faq.md) for frequently asked questions
- Open an issue on GitHub for bugs or feature requests

