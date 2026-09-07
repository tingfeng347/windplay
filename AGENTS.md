# WindPlay Repository Guidelines

## Project Structure

WindPlay is a collection of independent browser experiments. Runnable works live under
`works/<kebab-case-name>/`. Each work owns its source, assets, tests, documentation, build scripts,
package metadata, and a tracked standalone artifact at `demo/index.html`. Repository-wide decisions
and references live under `docs/`.

Do not add placeholder category folders. Add a directory when it has a real work or shared module.
Do not create a shared package until at least two works use the code and its interface is stable.

## Development Commands

- `npm ci`: install all workspace dependencies from the root lockfile.
- `npm run dev`: build and serve the launcher at `http://localhost:4173`.
- `npm run build`: build every work and assemble the deployable `_site/` directory.
- `npm test`: test the launcher and every work that declares a test script.
- `npm run dev --workspace <package-name>`: start one work locally.

For Point Cloud Studio, use package name `@windplay/point-cloud-studio` or the root alias
`npm run dev:point-cloud`.

## Conventions

- Use kebab-case for work directories and scoped package names: `works/particle-garden` and
  `@windplay/particle-garden`.
- Keep browser works independently runnable. A work must document its prerequisites, development
  command, build command, output directory, controls, and browser requirements.
- Treat each work's `src/` and original `assets/` as source of truth. Do not hand-edit generated
  `dist/` or `demo/` output. Regenerate both through the work's build command.
- Keep `demo/index.html` self-contained and tracked so a visitor can open it without installing
  dependencies or starting a server. Tests must detect stale demos and unresolved build tokens.
- Keep large generated exports, caches, dependencies, logs, credentials, and local environment files
  out of Git.
- Prefer the existing stack within a work. Do not impose a repository-wide framework on unrelated
  experiments.
- Add focused tests for interaction state, deterministic algorithms, serialization, and exports.

## Changes

Keep edits scoped to the affected work unless a repository-level contract changes. When adding a
work, register its `demo/index.html` in the root README table and ensure root `npm run build` and
`index.html`, then ensure root `npm run build` and `npm test` still pass.
Preserve unrelated user changes and never commit secrets or source media without redistribution
rights.
