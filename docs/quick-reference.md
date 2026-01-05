# Quick Reference Guide

This is your one-page cheat sheet for the Decision Risk Engine documentation.

## 🎯 Start Here Based on Your Role

| Role | Start With | Time | Next Steps |
|------|------------|------|------------|
| **Business User** | [Quick Start](../QUICKSTART.md) | 10 min | [Forecast Engine Summary](../FORECAST_ENGINE_SUMMARY.md) |
| **Developer** | [Quick Start](../QUICKSTART.md) + [Forecast Engine Quick Start](../FORECAST_ENGINE_QUICKSTART.md) | 30 min | [Usage Guides](#usage-guides) |
| **Architect** | [Architecture Docs](#architecture) | 2 hours | [Implementation Details](#implementation) |
| **Manager** | [Summaries](#summaries) | 30 min | [Feature Guides](#feature-guides) |

---

## 📚 Documentation Categories

### 🚀 Quick Starts (Start Here!)

Get running in 5-10 minutes:

| Document | Purpose | Audience |
|----------|---------|----------|
| [Project Quick Start](../QUICKSTART.md) | Get the app running | Everyone |
| [Forecast Engine Quick Start](../FORECAST_ENGINE_QUICKSTART.md) | Use forecast features | Developers |
| [Decision-Risk Engine Quick Start](../backend/QUICKSTART_DECISION_RISK_ENGINE.md) | Use decision analysis | Developers |

### 📑 Index Pages (Navigation Hubs)

Your roadmap to all documentation:

| Document | Purpose |
|----------|---------|
| [Main Documentation Hub](index.md) | Complete site index |
| [Forecast Engine Index](../FORECAST_ENGINE_INDEX.md) | Forecast engine navigation |
| [Decision-Risk Engine Index](../backend/DECISION_RISK_ENGINE_INDEX.md) | Decision-risk navigation |
| [Site Navigation](navigation.md) | Organized navigation structure |

### 📝 Summaries (High-Level Overview)

Understand what was built without code:

| Document | What It Covers |
|----------|----------------|
| [Forecast Engine Summary](../FORECAST_ENGINE_SUMMARY.md) | Forecast capabilities |
| [Decision-Risk Engine Summary](../backend/DECISION_RISK_ENGINE_SUMMARY.md) | Decision analysis capabilities |
| [Project README](../README.md) | Overall project overview |

### 🏗️ Architecture (System Design)

For understanding how it all works:

| Document | Focus |
|----------|-------|
| [Forecast Engine Architecture](../FORECAST_ENGINE_ARCHITECTURE.md) | Forecast system design |
| [Decision-Risk Engine Architecture](../backend/DECISION_RISK_ENGINE_ARCHITECTURE.md) | Decision-risk system design |

### 📖 Complete Documentation (Technical Deep Dive)

Full technical reference:

| Document | Content |
|----------|---------|
| [Forecast Engine README](../backend/app/engine/FORECAST_ENGINE_README.md) | Complete forecast API & usage |
| [Decision-Risk Engine README](../backend/app/engine/README_DECISION_RISK_ENGINE.md) | Complete decision-risk API |
| [Decision-Risk Engine Usage](../backend/DECISION_RISK_ENGINE_USAGE.md) | Detailed usage examples |

### 🎯 Feature Guides (Specific Capabilities)

#### Dependencies
- [Dependency Delays Quick Start](../DEPENDENCY_DELAYS_QUICK_START.md) - Get started with delays
- [Improved Dependency Delays](../IMPROVED_DEPENDENCY_DELAYS.md) - Advanced features
- [Testing Blocked Dependencies](../TESTING_BLOCKED_DEPENDENCIES.md) - Testing guide

#### Risk Management
- [Risk Acceptance Workflow](../RISK_ACCEPTANCE_WORKFLOW.md) - Accept risks properly
- [Risk Auto-Close Fix](../RISK_AUTO_CLOSE_FIX.md) - Automatic closure
- [Risk Auto-Sync Guide](../RISK_AUTO_SYNC_GUIDE.md) - Sync functionality

#### Scenarios
- [What-If Scenarios Fixed](../WHAT_IF_SCENARIOS_FIXED.md) - Run what-if analysis
- [How to Use Improved Forecasting](../HOW_TO_USE_IMPROVED_FORECASTING.md) - Advanced forecasting

### 🛠️ Implementation (Build It Yourself)

For developers implementing features:

| Document | Purpose |
|----------|---------|
| [Decision-Risk Engine Implementation](../backend/DECISION_RISK_ENGINE_IMPLEMENTATION.md) | Implementation guide |
| [Decision-Risk Engine Deliverables](../backend/DECISION_RISK_ENGINE_DELIVERABLES.md) | What was delivered |
| [Decision-Risk Engine Rules Status](../backend/DECISION_RISK_ENGINE_RULES_STATUS.md) | Rule implementation status |

---

## 🎯 Common Tasks

### "I want to..."

| Task | Go To |
|------|-------|
| **Get started quickly** | [Quick Start Guide](../QUICKSTART.md) |
| **Run forecasts** | [Forecast Engine Quick Start](../FORECAST_ENGINE_QUICKSTART.md) |
| **Analyze decisions** | [Decision-Risk Engine Quick Start](../backend/QUICKSTART_DECISION_RISK_ENGINE.md) |
| **Manage risks** | [Risk Acceptance Workflow](../RISK_ACCEPTANCE_WORKFLOW.md) |
| **Handle dependencies** | [Dependency Delays Quick Start](../DEPENDENCY_DELAYS_QUICK_START.md) |
| **Run what-if scenarios** | [What-If Scenarios Fixed](../WHAT_IF_SCENARIOS_FIXED.md) |
| **Understand the architecture** | [Architecture Docs](#architecture) |
| **Integrate with API** | [API Documentation](http://localhost:8000/docs) |
| **Set up environment** | [Python Setup](../PYENV_SETUP.md) |

---

## 📊 Feature Matrix

| Feature | Forecast Engine | Decision-Risk Engine | Docs |
|---------|----------------|---------------------|------|
| **Monte Carlo Simulation** | ✅ | ❌ | [Forecast README](../backend/app/engine/FORECAST_ENGINE_README.md) |
| **What-If Scenarios** | ✅ | ❌ | [What-If Scenarios](../WHAT_IF_SCENARIOS_FIXED.md) |
| **Dependency Analysis** | ✅ | ✅ | [Dependency Guide](../DEPENDENCY_DELAYS_QUICK_START.md) |
| **Risk Detection** | ❌ | ✅ | [Risk Auto-Sync](../RISK_AUTO_SYNC_GUIDE.md) |
| **Decision Impact** | ❌ | ✅ | [Decision-Risk Usage](../backend/DECISION_RISK_ENGINE_USAGE.md) |
| **Mitigation Preview** | ✅ | ✅ | [Forecast README](../backend/app/engine/FORECAST_ENGINE_README.md) |
| **Event-Driven** | ❌ | ✅ | [Decision-Risk Architecture](../backend/DECISION_RISK_ENGINE_ARCHITECTURE.md) |
| **REST API** | ✅ | ✅ | [API Docs](http://localhost:8000/docs) |

---

## 🚀 Quick Commands

### Running the Application
```bash
# Backend
cd backend && source venv/bin/activate && bash start.sh

# Frontend
cd frontend && npm run dev
```

### Running Examples
```bash
# Forecast Engine
cd backend/app/engine && python3 forecast_examples.py

# Decision-Risk Engine
cd backend && ./venv/bin/python -m app.engine.demo_decision_risk_engine
```

### API Testing
```bash
# Health check
curl http://localhost:8000/health

# Forecast
curl http://localhost:8000/api/forecast/milestone_001

# Decision-risk health
curl http://localhost:8000/api/decision-risk-engine/health
```

---

## 📖 Learning Paths

### Beginner (1 hour)
1. [Project Quick Start](../QUICKSTART.md) - 10 min
2. [Forecast Engine Summary](../FORECAST_ENGINE_SUMMARY.md) - 20 min
3. [Decision-Risk Engine Summary](../backend/DECISION_RISK_ENGINE_SUMMARY.md) - 20 min
4. Run examples - 10 min

### Intermediate (4 hours)
1. Complete Beginner path - 1 hour
2. [Forecast Engine Quick Start](../FORECAST_ENGINE_QUICKSTART.md) - 30 min
3. [Decision-Risk Engine Quick Start](../backend/QUICKSTART_DECISION_RISK_ENGINE.md) - 30 min
4. Read architecture docs - 1 hour
5. Explore feature guides - 1 hour

### Advanced (2 days)
1. Complete Intermediate path - 4 hours
2. Read complete technical documentation - 3 hours
3. Review source code - 4 hours
4. Test all API endpoints - 2 hours
5. Implement custom features - 3 hours

---

## 🎓 By Experience Level

### New to the Project
**Start:** [Main README](../README.md) → [Quick Start](../QUICKSTART.md)

**Then:** Pick a feature that interests you and follow its quick start guide

### Familiar with Basics
**Explore:** [Index Pages](#index-pages-navigation-hubs) for navigation

**Deep Dive:** Choose between [Forecast Engine](#forecast-engine) or [Decision-Risk Engine](#decision-risk-engine)

### Ready to Build
**Study:** [Architecture](#architecture) and [Implementation](#implementation) docs

**Practice:** Run examples and test API endpoints

---

## 📞 Quick Links

### External Resources
- **API Docs**: http://localhost:8000/docs (when running)
- **Health Check**: http://localhost:8000/health
- **Frontend**: http://localhost:3000

### Internal Resources
- [Complete File List](index.md#all-documentation-files)
- [Site Navigation](navigation.md)
- [Deployment Guide](README.md)

---

## ✅ Checklists

### First-Time Setup
- [ ] Read [Quick Start Guide](../QUICKSTART.md)
- [ ] Set up [Python environment](../PYENV_SETUP.md)
- [ ] Start backend server
- [ ] Start frontend app
- [ ] Test API health check
- [ ] Run forecast example
- [ ] Run decision-risk demo

### Before Using in Production
- [ ] Read relevant architecture docs
- [ ] Test all API endpoints
- [ ] Review security considerations
- [ ] Set up monitoring
- [ ] Configure deployment
- [ ] Train team on features
- [ ] Create runbooks

### Adding New Features
- [ ] Review architecture docs
- [ ] Check implementation guides
- [ ] Write tests
- [ ] Update documentation
- [ ] Test API changes
- [ ] Update frontend if needed

---

## 🎯 Key Concepts

### Forecast Engine
- **Monte Carlo Simulation** - Probabilistic forecasting
- **Percentiles** - P10, P50, P80, P90, P99 dates
- **What-If Scenarios** - Test interventions before committing
- **Mitigation Preview** - See impact before approving
- **Contribution Breakdown** - Understand why dates slip

### Decision-Risk Engine
- **Events** - Immutable facts (e.g., "dependency blocked")
- **Commands** - Actions to take (e.g., "create risk")
- **Rules** - Logic mapping events to commands
- **State Snapshot** - Immutable system state view
- **Deterministic** - Same input always produces same output

---

## 🔍 Search Tips

### Finding Information
1. **Start with index pages** - They organize everything
2. **Use quick starts** - For immediate action
3. **Check summaries** - For high-level understanding
4. **Read architecture** - For system design
5. **Dive into READMEs** - For complete details

### Document Naming Convention
- `INDEX.md` - Navigation hub
- `QUICKSTART.md` - 5-10 minute guide
- `SUMMARY.md` - High-level overview
- `ARCHITECTURE.md` - System design
- `README.md` - Complete documentation
- `USAGE.md` - How to use
- `IMPLEMENTATION.md` - How it was built

---

## 📊 Documentation Statistics

- **Total Markdown Files**: 33+
- **Main Categories**: 8
- **Quick Start Guides**: 3
- **Architecture Docs**: 2
- **Complete READMEs**: 2
- **Feature Guides**: 17+
- **Index/Navigation**: 3

---

## 💡 Pro Tips

1. **Always start with index pages** - They save time
2. **Use quick starts for demos** - Impress stakeholders quickly
3. **Keep architecture docs handy** - Reference during development
4. **Bookmark API docs** - http://localhost:8000/docs
5. **Run examples first** - Understand before building
6. **Read summaries for meetings** - Quick prep material

---

**Last Updated**: January 2026

**Need Help?** Start with the [Main Documentation Hub](index.md) or [Site Navigation](navigation.md)

[↑ Back to Top](#quick-reference-guide)

