import path from "node:path";

export interface DistributionAssetRoots {
  appPath?: string;
  projectRoot?: string;
  resourcesPath?: string;
}

export function resolveDistributionAssetCandidates(
  assetPath: string,
  roots: DistributionAssetRoots = {}
): string[] {
  const projectRoot = roots.projectRoot ?? path.resolve(__dirname, "..", "..");
  const candidates = [
    path.resolve(projectRoot, assetPath),
    roots.appPath ? path.resolve(roots.appPath, assetPath) : null,
    roots.resourcesPath ? path.resolve(roots.resourcesPath, assetPath) : null,
    roots.resourcesPath ? path.resolve(roots.resourcesPath, "app.asar", assetPath) : null,
    roots.resourcesPath ? path.resolve(roots.resourcesPath, "app.asar.unpacked", assetPath) : null,
  ].filter((candidate): candidate is string => candidate !== null);
  return [...new Set(candidates)];
}
