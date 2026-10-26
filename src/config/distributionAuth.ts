import { distribution } from "./distribution";

// Oppulence sessions live in the oppulence-cloud extension, so sign-out clears
// them there instead of on the upstream auth server. This wraps the client
// rather than editing signOut(): upstream tests run signOut() in a sandbox
// that has no distribution config.
export function withDistributionSignOut<T extends object>(client: T): T {
  if (!distribution.extensions.includes("oppulence-cloud")) return client;
  const signOut = async () => {
    await window.electronAPI?.distributionExtensions?.invoke("oppulence-cloud", "clearSession");
  };
  return new Proxy(client, {
    get: (target, prop, receiver) =>
      prop === "signOut" ? signOut : Reflect.get(target, prop, receiver),
  });
}
