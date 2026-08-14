const DEFAULT_RELEASE_IDENTITY = Object.freeze({
  productName: "OpenWhispr",
  appId: "com.gizmolabs.openwhispr",
  protocolScheme: "openwhispr",
});

function resolveReleaseIdentity(value) {
  if (!value || typeof value !== "object") {
    return DEFAULT_RELEASE_IDENTITY;
  }

  const productName = typeof value.productName === "string" ? value.productName.trim() : "";
  const appId = typeof value.appId === "string" ? value.appId.trim() : "";
  const protocolScheme =
    typeof value.protocolScheme === "string" ? value.protocolScheme.trim().toLowerCase() : "";

  if (!/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,63}$/.test(productName)) {
    return DEFAULT_RELEASE_IDENTITY;
  }
  if (
    !/^[A-Za-z0-9][A-Za-z0-9.-]{2,127}$/.test(appId) ||
    !appId.includes(".") ||
    appId.includes("..")
  ) {
    return DEFAULT_RELEASE_IDENTITY;
  }
  if (!/^[a-z][a-z0-9+.-]{1,31}$/.test(protocolScheme)) {
    return DEFAULT_RELEASE_IDENTITY;
  }

  return Object.freeze({ productName, appId, protocolScheme });
}

module.exports = {
  DEFAULT_RELEASE_IDENTITY,
  resolveReleaseIdentity,
};
