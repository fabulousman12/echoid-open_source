const PRIVATE_KEY_PEPPER = import.meta.env?.VITE_PRIVATE_KEY_PEPPER || "";

export async function hashPrivateKey(privateKeyStr) {
  const data = new TextEncoder().encode(privateKeyStr + PRIVATE_KEY_PEPPER);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(digest));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
