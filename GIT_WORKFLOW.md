# Git Workflow Guide for luns.se

This document explains the Git workflow and best practices for the luns.se project development.

## 📋 Overview

We use a **Feature Branch Workflow** with the following branch structure:
- `main` - Production-ready code (protected)
- `dev` - Development integration branch (your default working branch)
- `feature/*` - Individual feature branches
- `hotfix/*` - Quick fixes for production issues

## 🌿 Branch Strategy

```
main (production)
├── dev (development)
    ├── feature/user-authentication
    ├── feature/lunch-menu-scraper
    └── feature/api-improvements
```

## 🚀 Daily Development Workflow

### 1. Starting a New Feature

```bash
# Switch to dev branch and get latest changes
git checkout dev
git pull origin dev

# Create a new feature branch
git checkout -b feature/your-feature-name
```

**Example:**
```bash
git checkout -b feature/lunch-menu-improvements
```

### 2. Working on Your Feature

```bash
# Make your changes...
# Then stage and commit
git add .
git commit -m "feat: add lunch menu filtering functionality"

# Push to remote (first time)
git push -u origin feature/your-feature-name

# Subsequent pushes
git push
```

### 3. Completing a Feature

```bash
# Switch back to dev
git checkout dev

# Get latest changes
git pull origin dev

# Merge your feature
git merge feature/your-feature-name

# Push updated dev branch
git push origin dev

# Clean up (optional)
git branch -d feature/your-feature-name
git push origin --delete feature/your-feature-name
```

## 📝 Commit Message Guidelines

Use clear, descriptive commit messages:

```bash
# Good examples:
git commit -m "feat: add user authentication system"
git commit -m "fix: resolve Docker permission issues"
git commit -m "docs: update API documentation"
git commit -m "refactor: improve lunch menu scraper performance"

# Format: type: description
# Types: feat, fix, docs, style, refactor, test, chore
```

## 🛠️ Useful Commands

### Branch Management
```bash
# See all branches (local and remote)
git branch -a

# See current branch
git branch

# Switch branches
git checkout branch-name

# Create and switch to new branch
git checkout -b new-branch-name

# Delete local branch
git branch -d branch-name

# Delete remote branch
git push origin --delete branch-name
```

### Staying Updated
```bash
# Update current branch with remote changes
git pull

# Update dev branch specifically
git pull origin dev

# See what's changed
git status
git log --oneline -10  # Last 10 commits
```

### Emergency Fixes
```bash
# For urgent production fixes
git checkout main
git pull origin main
git checkout -b hotfix/urgent-fix-name

# After fixing...
git add .
git commit -m "hotfix: fix critical production issue"
git push -u origin hotfix/urgent-fix-name

# Merge to main AND dev
git checkout main
git merge hotfix/urgent-fix-name
git push origin main

git checkout dev
git merge hotfix/urgent-fix-name
git push origin dev
```

## 🔄 Development Cycle

1. **Feature Development:** Work on `feature/*` branches
2. **Integration:** Merge completed features into `dev`
3. **Testing:** Test the integrated features on `dev`
4. **Release:** When `dev` is stable, merge to `main`
5. **Deploy:** Deploy `main` to production

## ⚠️ Important Rules

### DO ✅
- Always work on feature branches for new development
- Pull latest changes before creating new branches
- Use descriptive branch names (`feature/lunch-menu-api`, not `feature/stuff`)
- Write clear commit messages
- Test your changes before merging
- Keep `main` branch clean and deployable

### DON'T ❌
- Never commit directly to `main`
- Don't work directly on `dev` for features (use feature branches)
- Don't force push (`git push --force`) to shared branches
- Don't leave broken code in `dev`
- Don't use generic commit messages ("update", "fix stuff")

## 🔧 Setting Up Your Environment

If you're on a new machine or fresh clone:

```bash
# Configure Git (one-time setup)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Clone the project
git clone <repository-url>
cd luns.se

# Switch to dev branch
git checkout dev
git pull origin dev
```

## 🆘 Common Issues & Solutions

### "Your branch is behind"
```bash
git pull origin dev  # or whatever branch you're on
```

### "Merge conflicts"
```bash
# Edit conflicted files, then:
git add .
git commit -m "resolve merge conflicts"
```

### "I committed to the wrong branch"
```bash
# If you haven't pushed yet:
git reset --soft HEAD~1  # Undo last commit, keep changes
git checkout correct-branch
git add .
git commit -m "your message"
```

### "I want to undo my last commit"
```bash
# If you haven't pushed:
git reset --soft HEAD~1  # Keeps your changes

# If you have pushed:
git revert HEAD  # Creates a new commit that undoes the last one
```

## 📚 Additional Resources

- [Git Documentation](https://git-scm.com/doc)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

**Happy coding! 🚀**

> Last updated: $(date)
> For questions or workflow improvements, discuss with the team.
