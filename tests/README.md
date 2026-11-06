# Feature tests (headless, local demo mode)
```
npm i playwright && npx playwright install chromium   # once
node tests/run.js            # all scenarios (~4 min)
node tests/run.js zn pp br   # just some
```
The runner serves `game/` on port 8765 (`PORT=8766` to change), opens the game with `?local` (no Firebase), and runs each file in `scenarios/`. A scenario passes when it exits cleanly with no page errors. Screenshots land in `/tmp/dzd-tests` (`OUT=` to change).

These cover the v20 features (GPS, classes, skills, gear, troops, marks, zones, pipelines, horde brain, rewards, desktop layout). They do **not** replace Grok Bot's regress suite (`gtest/`), which talks to the real Firebase test project. Run both before a test-server deploy.

Also run `node tools/check.js` (needs `npm i` in `tools/`): it fails on global-name collisions between scripts and prints the wrap chains.
