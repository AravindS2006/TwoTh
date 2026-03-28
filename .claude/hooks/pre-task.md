# Pre-Task Hook — Before Every Coding Task

## Instructions for Claude Code

Before writing ANY code for this project, run through this checklist mentally (or literally):

---

## ✅ Type Safety Check
- [ ] Are all TypeScript interfaces defined in `frontend/src/types/index.ts` before use?
- [ ] Are all Pydantic models defined in `backend/models.py` or inline before use?
- [ ] Will this code introduce any `any` TypeScript types? If yes, justify or eliminate.

## ✅ Import Verification
- [ ] Do all imported packages exist in `package.json` (frontend) or `requirements.txt` (backend)?
- [ ] Are component imports using the correct relative paths?
- [ ] Are there any circular imports?

## ✅ Error Boundary Check
- [ ] Does every new async operation (API calls, file I/O, subprocess) have a try/catch?
- [ ] Does every new React component that fetches data have an error state?
- [ ] Are all promises awaited or `.catch()` handled?

## ✅ Three.js Memory Check (Frontend only)
- [ ] Does any new Three.js code create geometries, materials, or textures?
- [ ] If yes, is there a `useEffect` cleanup function that calls `.dispose()` on them?

## ✅ Security Check
- [ ] No hardcoded file paths — using env vars?
- [ ] No secrets or API keys in code?
- [ ] Input validation present for any new endpoint?

## ✅ Context Check
- [ ] Have I read `CLAUDE.md` in this session to understand current architecture?
- [ ] Does this task change the architecture? If yes, plan to update `CLAUDE.md` after.

---

## Quick Command Before Starting
Run this to see current project state:
```
cat .claude/CLAUDE.md
```
