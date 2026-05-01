# Contributing to SBTM

Thank you for your interest in contributing to SBTM! This document provides guidelines and instructions for contributing.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Create a branch** for your changes
4. **Make your changes** following our coding standards
5. **Test your changes** thoroughly
6. **Submit a pull request**

## Ways to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, cloud provider, versions)
- Screenshots if applicable

### Suggesting Features

Feature requests are welcome! Please include:
- Clear description of the feature
- Use cases and benefits
- Potential implementation approach
- Any alternatives considered

### Code Contributions

We welcome code contributions! Areas where you can help:
- Bug fixes
- New features
- Documentation improvements
- Test coverage
- Performance optimizations

## Development Setup

1. **Prerequisites**:
   - Node.js 20+
   - Docker & Docker Compose
   - kubectl
   - Azure CLI or gcloud CLI

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Run tests**:
   ```bash
   pnpm test
   ```

4. **Start local development**:
   ```bash
   docker compose up
   ```

## Coding Standards

- **TypeScript**: Use TypeScript for all new code
- **Formatting**: Run `pnpm format` before committing
- **Linting**: Run `pnpm lint` and fix all issues
- **Testing**: Add tests for new features
- **Documentation**: Update docs for user-facing changes

## Commit Messages

Follow conventional commits format:
```
type(scope): subject

body (optional)

footer (optional)
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/tooling changes

Examples:
```
feat(api-gateway): add rate limiting
fix(gps-tracking): resolve memory leak in location service
docs(deployment): update Azure deployment guide
```

## Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new functionality
3. **Ensure all tests pass**
4. **Update CHANGELOG.md** if applicable
5. **Request review** from maintainers
6. **Address feedback** promptly

### PR Guidelines

- Keep PRs focused and small
- Link related issues
- Provide clear description
- Include screenshots for UI changes
- Ensure CI passes

## Testing

- **Unit tests**: Test individual functions/classes
- **Integration tests**: Test service interactions
- **E2E tests**: Test complete workflows

Run tests:
```bash
# All tests
pnpm test

# Specific service
cd services/api-gateway
pnpm test

# With coverage
pnpm test:cov
```

## Documentation

Update documentation for:
- New features
- API changes
- Configuration changes
- Breaking changes

Documentation locations:
- `/docs` - User-facing documentation
- `/README.md` - Project overview
- Service READMEs - Service-specific docs
- Code comments - Complex logic

## License

By contributing, you agree that your contributions will be licensed under:
- **Deployment tools & documentation**: MIT License
- **Source code**: Commercial License (modifications require separate license)

See LICENSE-DEPLOYMENT and LICENSE-COMMERCIAL for details.

## Community

- **GitHub Discussions**: Ask questions, share ideas
- **Issues**: Report bugs, request features
- **Email**: arvinddhasmana@gmail.com for sensitive matters

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project README (for significant contributions)

## Questions?

Not sure where to start? Open a discussion or reach out to arvinddhasmana@gmail.com.

Thank you for contributing to SBTM! 🎉
