# Contributing to Snuggle

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## 📋 Prerequisites

- Node.js 18+
- Firebase CLI
- Git
- Basic knowledge of React and TypeScript

## 🚀 Getting Started

1. **Fork the repository**
2. **Clone your fork**
   ```bash
   git clone https://github.com/yourusername/snuggle.git
   ```
3. **Create a branch from `dev`**
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feature/your-feature-name
   ```

## 💻 Development Workflow

### 1. Set Up Environment
```bash
npm install
cd functions && npm install && cd ..
firebase emulators:start
npm run dev
```

### 2. Make Changes
- Write code following existing patterns
- Add tests for new features
- Update documentation if needed

### 3. Test Your Changes
```bash
# Run unit tests
npm test

# Run linting
npm run lint:fix

# Run E2E tests (optional for small changes)
npm run test:e2e
```

### 4. Commit
```bash
git add .
git commit -m "feat: add new feature"
```

**Commit Message Format:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Test changes
- `refactor:` - Code refactoring
- `style:` - Formatting changes
- `chore:` - Build/config changes

### 5. Push and Create PR
```bash
git push origin feature/your-feature-name
```

Create a Pull Request to the `dev` branch.

## ✅ Pull Request Guidelines

### Required
- [ ] PR targets `dev` branch (not `main`)
- [ ] All tests passing
- [ ] No linting errors
- [ ] Code follows existing style
- [ ] TypeScript compiles without errors
- [ ] New features have tests
- [ ] Documentation updated (if applicable)

### PR Title Format
```
feat: Add user profile editing
fix: Fix message timestamp display
docs: Update README with new deployment steps
```

### PR Description Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- Tested manually in dev environment
- Added unit tests for X
- E2E tests pass

## Screenshots (if applicable)
[Add screenshots]

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed code
- [ ] Commented hard-to-understand areas
- [ ] Updated documentation
- [ ] No new warnings
- [ ] Added tests
- [ ] All tests passing
```

## 🧪 Testing Requirements

### For All Changes
- Unit tests for new functions/utilities
- Component tests for UI changes

### For Features
- E2E test for critical user flows
- Security rules tests if touching RTDB structure

### For Bug Fixes
- Regression test to prevent recurrence

## 📝 Code Style

### TypeScript
- Use strict mode
- Prefer `const` over `let`
- Avoid `any` (use `unknown` if needed)
- Define interfaces for complex objects
- Use optional chaining (`?.`)

### React
- Functional components only
- Custom hooks for reusable logic
- Proper prop types
- Meaningful component names

### Naming Conventions
- Components: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Files: `PascalCase.tsx` for components, `camelCase.ts` for utilities

## 🚫 What Not to Do

- ❌ Commit directly to `main` or `dev`
- ❌ Include `console.log` in production code
- ❌ Commit secrets or API keys
- ❌ Disable ESLint rules without justification
- ❌ Submit PRs with failing tests
- ❌ Make breaking changes without discussion

## 🔐 Security

- Never commit `.env.production`
- Report security vulnerabilities privately
- Follow security best practices
- Sanitize all user input

## 📖 Documentation

Update documentation when:
- Adding new features
- Changing environment variables
- Modifying deployment process
- Changing data models

## 🤝 Code Review

All PRs require:
1. One approval from maintainer
2. All CI checks passing
3. No merge conflicts

Reviewers check for:
- Code quality
- Test coverage
- Documentation
- Performance impact
- Security concerns

## 🎯 Priority Levels

- **Critical** - Security issues, data loss bugs
- **High** - Breaking bugs, major features
- **Medium** - Minor bugs, improvements
- **Low** - Nice-to-have features

## 💬 Communication

- **Issues** - Bug reports, feature requests
- **Discussions** - Questions, ideas
- **PR Comments** - Code-specific discussions

## 📅 Release Process

1. Changes merged to `dev`
2. Tested in staging environment
3. Create release PR to `main`
4. Deploy to production
5. Tag release
6. Update CHANGELOG.md

## 🏆 Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes
- Project documentation

---

**Thank you for contributing to Snuggle! 🐾**
