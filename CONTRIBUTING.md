# Contributing to NEXUS ARENA

Thank you for your interest in contributing to **NEXUS ARENA**!

## Development Workflow

1. Fork & clone the repository.
2. Install dependencies: `npm install`
3. Run strict typechecks and tests before submitting PRs:
   ```bash
   npm run typecheck
   npm run test
   npm run build
   ```

## Guidelines
- Write strict TypeScript code with full type annotations.
- Maintain server authority: never calculate scores on the client side.
- Ensure all new features include unit or integration tests.
