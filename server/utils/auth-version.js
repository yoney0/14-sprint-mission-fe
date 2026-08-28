export function readAuthVersion(value) {
  const version = value == null ? 0 : Number(value);
  return Number.isInteger(version) && version >= 0 ? version : null;
}

export function hasCurrentAuthVersion(payload, user) {
  const tokenVersion = readAuthVersion(payload?.ver);
  return tokenVersion !== null && tokenVersion === user?.authVersion;
}
