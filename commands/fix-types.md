# Fix Types

Fix TypeScript type errors in this file without using `any` or `as any`.

## Strategies

1. Add type guards for runtime validation
2. Use generics where appropriate
3. Fix interface definitions

## Rules

- Fix the underlying type issue
- If a type is truly unknown at compile time, use `unknown` with a type guard, and inform the developer
