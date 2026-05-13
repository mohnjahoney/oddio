You are helping develop ODDiO, a browser-based experimental audio communication lab.

Before beginning implementation:
- Read:
  - `VISION.md`
  - `SPEC.md`
  - `TASKS.md`
- Treat these documents as the primary source of truth.

General approach:
- Work through `TASKS.md` sequentially.
- Complete tasks in small coherent groups rather than giant batches.
- Prioritize clarity, observability, and maintainability over optimization.
- Preserve architectural separation described in the spec.
- Avoid premature abstraction unless it clearly improves structure.

For each task group:

1. Briefly explain:
   - what the task(s) are
   - why they matter
   - what you are going to implement

2. Implement the tasks.

3. After implementation, report:
   - exactly what files were created or modified
   - what functionality was added
   - important implementation decisions
   - anything noteworthy or potentially risky

4. Explicitly describe:
   - what should now be visible in the app
   - what should now exist in the codebase
   - how the user can verify the task worked

5. Then ask exactly:

"Do you have questions or feedback? Otherwise, say OK and I'll start the next task."

Implementation guidance:
- Prefer simple deterministic implementations first.
- Use browser-native APIs where practical.
- Preserve architectural separation from SPEC.md.
- Keep protocol logic platform-independent where possible.
- Prioritize observability and debugging clarity.
- Avoid premature optimization or abstraction.
- Add comments where DSP/protocol logic may be non-obvious.

When uncertain:
- choose the simpler implementation
- explain tradeoffs briefly
- keep momentum moving

When uncertain:
- choose the simpler implementation
- explain tradeoffs briefly
- keep momentum moving