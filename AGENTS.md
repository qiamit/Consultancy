# Agent instructions

## Live deploy after code changes

When the user requests a change and application code is modified:

1. Implement and verify the change when practical.
2. Commit and push the working branch.
3. **Deploy to production immediately** so https://qengineering.in updates:

   ```bash
   npm run deploy:live -- "<short summary of change>"
   ```

4. Confirm Railway deployment status is `SUCCESS` before saying it is live.
5. If Railway CLI is not authenticated, run `railway login --browserless`, relay the one-click activate URL to the user immediately, then retry deploy after they sign in.

Skip live deploy only when the user explicitly asks for draft-only / no-deploy work.
