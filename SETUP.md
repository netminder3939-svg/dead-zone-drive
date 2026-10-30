# Dead Zone Drive: setup (free, about 15 minutes)

The game already works without any of this. It runs in **Local Demo** mode, which saves on your phone and shows fake teammates and a test boss. Do the steps below when you want the whole crew to see each other live.

## 1. Put the game online (GitHub Pages, free)
1. Make a new GitHub repo (for example `deadzonedrive`) and upload **everything in this folder** to the top level.
2. Go to the repo's **Settings → Pages**. Set Source to "Deploy from a branch", choose `main` and `/ (root)`, then Save.
3. After about a minute, the game is at `https://<your-github-name>.github.io/deadzonedrive/`.

## 2. Make a free Firebase project
1. Go to https://console.firebase.google.com and sign in with any Google account.
2. Click **Add project** and name it `deadzonedrive`. You can turn off Google Analytics, then click Create.
3. The project uses the free **Spark** plan, so no card is needed. Don't upgrade.

## 3. Turn on sign-in and the database
1. Click **Build → Authentication → Get started**, then **Sign-in method**, then **Anonymous** → Enable → Save.
2. Click **Build → Firestore Database → Create database**. Pick a location near you (`us-west1` is fine) and start in **production mode**.
3. In Firestore, open the **Rules** tab, delete what's there, paste in everything from `firestore.rules`, and click **Publish**.
4. In **Authentication → Settings → Authorized domains**, add `<your-github-name>.github.io`.

## 4. Connect the game
1. Click the gear icon (Project settings), then under "Your apps" click the **</>** (Web) button. Name it `deadzonedrive`. Skip Hosting.
2. Firebase shows a `firebaseConfig = { ... }` block. Copy those values into `firebase-config.js` in your repo, replacing the empty quotes.
3. Commit. Refresh the game, and the top-left label should change from **LOCAL DEMO** to **LIVE · team rathdrum-crew**.

## 5. Invite the crew
Send everyone the link. On iPhone, open it in Safari, then tap Share → **Add to Home Screen**. Everyone uses the **same team code** on the first screen. Allow location when Safari asks.

## Testing at home
Tap 🧪 at the top right:
- **Auto-walk** walks you around.
- **Tap map = teleport** moves you to wherever you tap.
- **Test boss** makes a fake teammate find a boss (Local Demo only).
- **Rathdrum** jumps you to Rathdrum.
- **Reset** wipes your progress on this phone.

Add `?local` to the URL to force Local Demo even after Firebase is connected.

## What gets stored online (Stage 1)
- **Members:** name, level, Stronghold level, contribution stats, and last active time. **No GPS or home location is ever saved or shown.** The rules block location fields.
- **Alliance Bank:** shared balances. Any member can deposit or withdraw, there are no limits, and balances can't go below zero.
- **Bank log and Activity feed:** add-only (no edits or deletes) and stamped with Firebase's own clock.
- After changing `firestore.rules`, paste it into Firestore → Rules again and click **Publish**.

## Notes
- Free limits are around 50k reads and 20k writes a day, which is plenty for a family crew.
- In this version, your gear, level, skills, Stronghold, and personal resources are saved **on your phone**. Clearing Safari data wipes them; cloud saves are coming in Stage 2.
- Stronghold timers use the phone clock, so changing the phone's time could cheat them. That's fine for family; Stage 3 moves timers to a server.
- Map territory, raids, the alliance roster, the bank, and the activity feed are shared. Teammate positions are not.
