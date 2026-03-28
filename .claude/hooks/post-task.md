# Post-Task Hook — After Every Coding Task

## Instructions for Claude Code

After completing any coding task, run through this checklist before responding "done":

---

## ✅ Code Quality
- [ ] Run linter: `npm run lint` (frontend) or `ruff check .` (backend)
- [ ] Fix ALL warnings, not just errors
- [ ] Remove any leftover `console.log`, `print()`, or debug statements
- [ ] Remove any TODO comments that were resolved

## ✅ Documentation
- [ ] Does every NEW function have a JSDoc block (TypeScript) or docstring (Python)?
- [ ] JSDoc format (TypeScript):
  ```typescript
  /**
   * Brief description of what this function does.
   * @param paramName - Description of parameter
   * @returns Description of return value
   */
  ```
- [ ] Python docstring format:
  ```python
  """
  Brief description of what this function does.

  Args:
      param_name: Description of parameter

  Returns:
      Description of return value

  Raises:
      ErrorType: When this error is raised
  """
  ```

## ✅ Architecture Update
- [ ] Did this task change the API (new endpoints, changed request/response)?
  → Update the API table in `.claude/CLAUDE.md`
- [ ] Did this task add new files or change the directory structure?
  → Update the Directory Structure in `.claude/CLAUDE.md`
- [ ] Did this task change any environment variables?
  → Update `.env.example` AND the env var table in `CLAUDE.md`

## ✅ No Hardcoded Values
- [ ] No hardcoded `localhost` or `127.0.0.1` — use env vars
- [ ] No hardcoded file paths — use `Path` (Python) or `import.meta.env` (Vite)
- [ ] No magic numbers — use named constants

## ✅ Test the Happy Path Mentally
- Walk through the feature mentally:
  1. User does X
  2. Frontend calls Y
  3. Backend does Z
  4. Response is W
  5. UI shows V
- Is every step correct?

## ✅ Final Verification
- [ ] TypeScript: `npm run type-check` passes with 0 errors
- [ ] Python: `mypy .` passes (or at minimum no new errors)
