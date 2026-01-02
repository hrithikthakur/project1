# Pyenv Setup Guide

If you want to use Python 3.11.8 (recommended for better package compatibility), follow these steps:

## 1. Initialize Pyenv (One-time setup)

Add pyenv initialization to your `~/.zshrc`:

```bash
echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.zshrc
echo '[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.zshrc
echo 'eval "$(pyenv init -)"' >> ~/.zshrc
```

Then reload your shell:
```bash
source ~/.zshrc
```

## 2. Install Python 3.11.8

```bash
pyenv install 3.11.8
```

## 3. Set Python Version for This Project

```bash
cd backend
pyenv local 3.11.8
```

This creates a `.python-version` file that tells pyenv to use Python 3.11.8 for this directory.

## 4. Run Setup

```bash
bash setup_with_pyenv.sh
```

Or use the regular setup script - it will automatically detect and use pyenv if configured:

```bash
bash setup.sh
```

## Verify It's Working

```bash
python --version
# Should show: Python 3.11.8

which python
# Should show: .../.pyenv/versions/3.11.8/bin/python
```

## Benefits of Using Python 3.11.8

- ✅ Better package compatibility (no Python 3.13 issues)
- ✅ More stable ecosystem
- ✅ Can use pinned package versions if desired
- ✅ Avoids build issues with pydantic-core

## Quick Commands

```bash
# List installed Python versions
pyenv versions

# List available Python versions to install
pyenv install --list | grep 3.11

# Set global Python version (affects all projects)
pyenv global 3.11.8

# Set local Python version (affects only current directory)
pyenv local 3.11.8

# Set shell Python version (affects only current terminal)
pyenv shell 3.11.8
```

