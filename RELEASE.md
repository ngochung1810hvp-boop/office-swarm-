# Release Workflow

OpenSwarm releases are GitHub Release driven. The release tag, npm package version, lockfile version, and Python project metadata must use the same version.

## Release Inputs

- Source version: `package.json`
- Matching metadata: `package-lock.json` and `pyproject.toml`
- GitHub tag format: `vX.Y.Z`
- GitHub release assets:
  - `agentswarm-darwin-arm64`
  - `agentswarm-darwin-x64`
  - `agentswarm-linux-x64`
  - `agentswarm-windows-x64.exe`

## Release Steps

1. Bump `package.json`, `package-lock.json`, and `pyproject.toml` to the same version.
2. Merge the version bump to `main`.
3. Run the `Build TUI Binaries` workflow from the `main` branch in GitHub Actions. Leave `version` blank to use `package.json`, or pass the exact version without the `v` prefix.
4. Confirm the workflow creates `vX.Y.Z` with all required binary assets.
5. Let `Publish npm on Release` publish `@vrsen/openswarm` from the release tag.

Pushing a matching `vX.Y.Z` tag also runs the binary release workflow, but the manual workflow is the preferred path because it builds assets and publishes the GitHub Release in one run.

## Release Gates

- The binary release workflow fails if the tag/input version does not match `package.json`, `package-lock.json`, and `pyproject.toml`.
- The npm publish workflow fails if the GitHub Release is missing any required TUI binary asset.
- The npm package uses `publishConfig.access=public` so scoped publishes do not depend on CLI flags alone.
