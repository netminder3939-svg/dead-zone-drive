// Live Firebase (project dead-zone-drive, free Spark plan). With this filled in, the game runs LIVE by default.
// Add ?local to the address to play the offline demo instead (saved on this phone only, fake teammates).
// A web apiKey is not a secret: access is controlled by Anonymous sign-in + firestore.rules.
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDOGxqS_dzpzV3cfPHrQMdtdP6chWUNBVE",
  authDomain: "dead-zone-drive.firebaseapp.com",
  projectId: "dead-zone-drive",
  storageBucket: "dead-zone-drive.firebasestorage.app",
  messagingSenderId: "384586684163",
  appId: "1:384586684163:web:91ee2f554b6f4828d9bb36"
};
// Your alliance = a team code. Everyone who types the same code (or opens an invite link with ?team=CODE) plays together.
window.DEFAULT_TEAM = "rathdrum-crew";
