# Known Issues & Limitations

## 1. Environment & Setup
- **Issue**: docker-dependent commands (`supabase db reset`) fail in non-Docker environments.
- **Workaround**: Use manual SQL migrations in Supabase Dashboard.
- **Severity**: Medium

## 2. Testing Constraints
- **Issue**: D3.js charts (Knowledge Graph) are mocked in tests because `jsdom` lacks full SVG/Canvas support.
- **Workaround**: Tests only verify component mounting, not visual correctness.
- **Severity**: Low

## 3. TypeScript / Linting
- **Issue**: Supabase generated types for JSONB columns (`trigger_details`) are sometimes loose.
- **Workaround**: Manual type assertions are used in hooks.
- **Severity**: Low

## 4. Edge Functions
- **Issue**: Local testing of Edge Functions requires Docker.
- **Workaround**: Functions are tested by deploying to remote Supabase project.
- **Severity**: Medium

## 5. Mobile Safari
- **Issue**: 100vh calculation can be glitchy on iOS Safari due to address bar.
- **Workaround**: Use `dwg` or `min-h-screen` classes (Partial support implemented).
- **Severity**: Low
