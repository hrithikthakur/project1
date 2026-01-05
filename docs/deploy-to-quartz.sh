#!/bin/bash

# Deploy Decision Risk Engine Documentation to Quartz
# This script copies all markdown documentation to a Quartz installation

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Get the project root directory (parent of docs folder)
PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
DOCS_DIR="$PROJECT_ROOT/docs"

print_info "Decision Risk Engine - Quartz Deployment Script"
echo ""

# Check if Quartz path is provided
if [ -z "$1" ]; then
    print_error "Please provide the path to your Quartz installation"
    echo ""
    echo "Usage: $0 /path/to/quartz"
    echo ""
    echo "Example:"
    echo "  $0 ~/projects/quartz"
    echo ""
    exit 1
fi

QUARTZ_PATH="$1"
QUARTZ_CONTENT="$QUARTZ_PATH/content"

# Verify Quartz installation exists
if [ ! -d "$QUARTZ_PATH" ]; then
    print_error "Quartz installation not found at: $QUARTZ_PATH"
    exit 1
fi

if [ ! -d "$QUARTZ_CONTENT" ]; then
    print_warning "Content directory not found. Creating: $QUARTZ_CONTENT"
    mkdir -p "$QUARTZ_CONTENT"
fi

print_success "Found Quartz installation at: $QUARTZ_PATH"
echo ""

# Create directory structure
print_info "Creating directory structure..."

mkdir -p "$QUARTZ_CONTENT/getting-started"
mkdir -p "$QUARTZ_CONTENT/forecast-engine"
mkdir -p "$QUARTZ_CONTENT/decision-risk-engine"
mkdir -p "$QUARTZ_CONTENT/features/dependencies"
mkdir -p "$QUARTZ_CONTENT/features/risk-management"
mkdir -p "$QUARTZ_CONTENT/features/scenarios"
mkdir -p "$QUARTZ_CONTENT/features/issues"
mkdir -p "$QUARTZ_CONTENT/technical-reference"

print_success "Directory structure created"
echo ""

# Copy main documentation hub files
print_info "Copying documentation hub files..."
cp "$DOCS_DIR/index.md" "$QUARTZ_CONTENT/index.md"
cp "$DOCS_DIR/navigation.md" "$QUARTZ_CONTENT/navigation.md"
print_success "Hub files copied"

# Copy Getting Started docs
print_info "Copying Getting Started documentation..."
cp "$PROJECT_ROOT/README.md" "$QUARTZ_CONTENT/getting-started/README.md"
cp "$PROJECT_ROOT/QUICKSTART.md" "$QUARTZ_CONTENT/getting-started/QUICKSTART.md"
cp "$PROJECT_ROOT/PYENV_SETUP.md" "$QUARTZ_CONTENT/getting-started/PYENV_SETUP.md"
print_success "Getting Started docs copied (3 files)"

# Copy Forecast Engine docs
print_info "Copying Forecast Engine documentation..."
cp "$PROJECT_ROOT/FORECAST_ENGINE_INDEX.md" "$QUARTZ_CONTENT/forecast-engine/"
cp "$PROJECT_ROOT/FORECAST_ENGINE_QUICKSTART.md" "$QUARTZ_CONTENT/forecast-engine/"
cp "$PROJECT_ROOT/FORECAST_ENGINE_SUMMARY.md" "$QUARTZ_CONTENT/forecast-engine/"
cp "$PROJECT_ROOT/FORECAST_ENGINE_ARCHITECTURE.md" "$QUARTZ_CONTENT/forecast-engine/"
cp "$PROJECT_ROOT/FORECAST_ENGINE_DELIVERY.md" "$QUARTZ_CONTENT/forecast-engine/"
cp "$PROJECT_ROOT/backend/app/engine/FORECAST_ENGINE_README.md" "$QUARTZ_CONTENT/forecast-engine/"
print_success "Forecast Engine docs copied (6 files)"

# Copy Decision-Risk Engine docs
print_info "Copying Decision-Risk Engine documentation..."
cp "$PROJECT_ROOT/backend/DECISION_RISK_ENGINE_INDEX.md" "$QUARTZ_CONTENT/decision-risk-engine/"
cp "$PROJECT_ROOT/backend/QUICKSTART_DECISION_RISK_ENGINE.md" "$QUARTZ_CONTENT/decision-risk-engine/"
cp "$PROJECT_ROOT/backend/DECISION_RISK_ENGINE.md" "$QUARTZ_CONTENT/decision-risk-engine/"
cp "$PROJECT_ROOT/backend/DECISION_RISK_ENGINE_SUMMARY.md" "$QUARTZ_CONTENT/decision-risk-engine/"
cp "$PROJECT_ROOT/backend/DECISION_RISK_ENGINE_ARCHITECTURE.md" "$QUARTZ_CONTENT/decision-risk-engine/"
cp "$PROJECT_ROOT/backend/DECISION_RISK_ENGINE_USAGE.md" "$QUARTZ_CONTENT/decision-risk-engine/"
cp "$PROJECT_ROOT/backend/DECISION_RISK_ENGINE_IMPLEMENTATION.md" "$QUARTZ_CONTENT/decision-risk-engine/"
cp "$PROJECT_ROOT/backend/DECISION_RISK_ENGINE_DELIVERABLES.md" "$QUARTZ_CONTENT/decision-risk-engine/"
cp "$PROJECT_ROOT/backend/DECISION_RISK_ENGINE_RULES_STATUS.md" "$QUARTZ_CONTENT/decision-risk-engine/"
cp "$PROJECT_ROOT/backend/app/engine/README_DECISION_RISK_ENGINE.md" "$QUARTZ_CONTENT/decision-risk-engine/"
print_success "Decision-Risk Engine docs copied (10 files)"

# Copy Dependencies docs
print_info "Copying Dependency documentation..."
cp "$PROJECT_ROOT/DEPENDENCY_DELAYS_QUICK_START.md" "$QUARTZ_CONTENT/features/dependencies/"
cp "$PROJECT_ROOT/DEPENDENCY_DELAYS_FIXED.md" "$QUARTZ_CONTENT/features/dependencies/"
cp "$PROJECT_ROOT/IMPROVED_DEPENDENCY_DELAYS.md" "$QUARTZ_CONTENT/features/dependencies/"
cp "$PROJECT_ROOT/DEPENDENCY_DELAY_SCENARIO_FIX.md" "$QUARTZ_CONTENT/features/dependencies/"
cp "$PROJECT_ROOT/DEPENDENCY_DELAY_SCENARIO_FIXED.md" "$QUARTZ_CONTENT/features/dependencies/"
cp "$PROJECT_ROOT/TESTING_BLOCKED_DEPENDENCIES.md" "$QUARTZ_CONTENT/features/dependencies/"
cp "$PROJECT_ROOT/BLOCKED_DEPENDENCY_NAMES_IMPLEMENTATION.md" "$QUARTZ_CONTENT/features/dependencies/"
cp "$PROJECT_ROOT/SUMMARY_BLOCKED_DEPENDENCY_IMPLEMENTATION.md" "$QUARTZ_CONTENT/features/dependencies/"
print_success "Dependency docs copied (8 files)"

# Copy Risk Management docs
print_info "Copying Risk Management documentation..."
cp "$PROJECT_ROOT/RISK_ACCEPTANCE_WORKFLOW.md" "$QUARTZ_CONTENT/features/risk-management/"
cp "$PROJECT_ROOT/RISK_AUTO_CLOSE_FIX.md" "$QUARTZ_CONTENT/features/risk-management/"
cp "$PROJECT_ROOT/RISK_AUTO_SYNC_GUIDE.md" "$QUARTZ_CONTENT/features/risk-management/"
print_success "Risk Management docs copied (3 files)"

# Copy Scenario docs
print_info "Copying Scenario documentation..."
cp "$PROJECT_ROOT/WHAT_IF_SCENARIOS_FIXED.md" "$QUARTZ_CONTENT/features/scenarios/"
cp "$PROJECT_ROOT/HOW_TO_USE_IMPROVED_FORECASTING.md" "$QUARTZ_CONTENT/features/scenarios/"
print_success "Scenario docs copied (2 files)"

# Copy Issues docs
print_info "Copying Issues documentation..."
cp "$PROJECT_ROOT/ISSUES_FEATURE.md" "$QUARTZ_CONTENT/features/issues/"
print_success "Issues docs copied (1 file)"

echo ""
print_success "All documentation files copied successfully!"
echo ""

# Count total files
TOTAL_FILES=$(find "$QUARTZ_CONTENT" -name "*.md" | wc -l)
print_info "Total markdown files in Quartz content: ${TOTAL_FILES}"

echo ""
print_info "Next steps:"
echo "  1. cd $QUARTZ_PATH"
echo "  2. npx quartz build --serve    # Preview locally"
echo "  3. npx quartz build --deploy   # Deploy to production"
echo ""
print_success "Documentation is ready for Quartz!"
echo ""

# Offer to preview
read -p "$(echo -e ${BLUE}Would you like to preview the site now? [y/N]: ${NC})" -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Starting Quartz preview server..."
    cd "$QUARTZ_PATH"
    npx quartz build --serve
fi

