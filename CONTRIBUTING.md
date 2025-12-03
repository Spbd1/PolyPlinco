# Contributing to PolyPlinko

Thank you for your interest in contributing to PolyPlinko! This document provides guidelines for contributing to the project.

## Code of Conduct

Be respectful and constructive in all interactions.

## How to Contribute

### Reporting Bugs

Before creating a bug report:
1. Check existing issues to avoid duplicates
2. Collect relevant information (tx hash, error messages, screenshots)
3. Try to reproduce the issue consistently

Create an issue with:
- Clear title describing the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment details (browser, wallet, network)
- Screenshots if applicable

### Suggesting Features

Feature requests are welcome! Please:
- Search existing issues first
- Explain the use case clearly
- Describe the proposed solution
- Consider backwards compatibility

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes following our coding standards
4. Add tests for new functionality
5. Run the test suite: `npm test`
6. Commit with clear messages: `git commit -m 'Add amazing feature'`
7. Push to your fork: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Coding Standards

**Solidity:**
- Follow OpenZeppelin style guide
- Use NatSpec comments for all public functions
- Keep functions focused and modular
- Write comprehensive tests

**TypeScript/React:**
- Use TypeScript strict mode
- Follow existing code structure
- Use functional components with hooks
- Add JSDoc comments for complex functions

**Commits:**
- Use present tense: "Add feature" not "Added feature"
- Reference issues: "Fix #123: Resolve swap slippage issue"
- Keep commits atomic and focused

### Testing

All contributions should include tests:
- Smart contracts: Hardhat tests in `/test`
- Frontend: React Testing Library tests
- Run full test suite before submitting PR

## Development Setup

See README.md for setup instructions.

## Questions?

Open a discussion or reach out on Discord.

Thank you for contributing! 🎉
