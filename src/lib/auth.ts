// Tiny demo auth · single hard-coded account, login persisted in
// localStorage. NOT real auth — this is a gate to keep public eyes
// off the demo, not a security boundary.

const STORAGE_KEY = "revspot.auth.v1";

// Hard-coded credentials · changing these forces every signed-in
// session to log in again because the stored token includes a salt
// derived from the password.
export const DEMO_EMAIL = "ankit@revspot.ai";
export const DEMO_PASSWORD = "SpotByRevspot@2026";

/** Returns a tiny salted token so the persisted blob isn't just
 *  "true". Lets us invalidate old sessions by changing the password. */
function tokenFor(email: string, password: string): string {
  // base64 with a salt — not secret, just a discriminator.
  return btoa(`${email}|${password}|spot-by-revspot`);
}

const CURRENT_TOKEN = (() => {
  if (typeof window === "undefined") return "";
  try {
    return tokenFor(DEMO_EMAIL, DEMO_PASSWORD);
  } catch {
    return "";
  }
})();

/** Pure check of submitted credentials against the hard-coded pair. */
export function checkCredentials(email: string, password: string): boolean {
  return (
    email.trim().toLowerCase() === DEMO_EMAIL.toLowerCase() &&
    password === DEMO_PASSWORD
  );
}

/** Is the current browser already signed in? Reads from localStorage. */
export function isAuthed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === CURRENT_TOKEN;
  } catch {
    return false;
  }
}

/** Persist a successful login. Returns true on success. */
export function signIn(email: string, password: string): boolean {
  if (!checkCredentials(email, password)) return false;
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, tokenFor(email, password));
    return true;
  } catch {
    return false;
  }
}

/** Clear the persisted login. */
export function signOut(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
