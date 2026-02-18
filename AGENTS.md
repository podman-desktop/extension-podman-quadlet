# Guidelines

This repository is the source code for a Podman Desktop extension named Quadlet.

## Quadlets

Podman supports building and starting containers (and creating volumes) via systemd by using a systemd generator called quadlet. 
These files are read during boot (and when systemctl daemon-reload is run) and generate corresponding regular systemd service unit files. Both system and user systemd units are supported. 
All options and tables available in standard systemd unit files are supported. For example, options defined in the [Service] table and [Install] tables pass directly to systemd and are handled by it. 

See [podman-systemd.unit](https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html) for more details.

## Directory Structure

We have four packages located in `packages`

- `backend`

In the `packages/backend/package.json`, the name field is set to `quadlet`.

When Podman Desktop loads an extension, it will search for an `activate` function in the exports of the package. This function is available in `packages/backend/src/extension.ts`.

The backend uses the `shared` and `podlet-js` packages. To build successfully, we need to build them first.

- `frontend`

In the `packages/frontend/package.json`, the name field is set to `frontend`.

- `podlet-js`

In the `packages/podlet-js/package.json`, the name field is set to `podlet-js`.

The `podlet-js` package is a similar implementation of the [podlet](https://github.com/containers/podlet) project.
The main difference is that podlet-js uses resource inspect to generate Quadlet where podlet uses podman create command.

- `shared`

In the `packages/shared/package.json`, the name field is set to `@podman-desktop/quadlet-extension-core-api`.

## `@podman-desktop/extensions-api`

As the Quadlet extension is a Podman Desktop extension, it uses the `@podman-desktop/extensions-api` package to interact with the core, which is loaded at runtime and not available in unit tests.
Only the `backend` package can use the `@podman-desktop/extensions-api` package. The `shared` package can use it for type definitions.

## Tools

### `vite`

In every package there is a `vite.config.ts` file. Providing configuration for building the package. 

See [vite](https://vitejs.dev/guide/) for more details.

### `vitest`

We use vitest for unit testing. We use the `projects` feature, allowing to run scoped tests. 

To test a specific file we can directly use vitest command:

See [vitest](https://vitest.dev/guide/) for more details.

```bash
vitest --run project=<package-name> <file>
```

#### Examples

Testing `packages/backend/src/services/main-service.spec.ts`

```bash
vitest --run project=backend src/services/main-service.spec.ts
```

Testing `packages/shared/src/messages/message-proxy.spec.ts`

```bash
vitest --run project=@podman-desktop/quadlet-extension-core-api src/messages/message-proxy.spec.ts
```

### `Svelte`

We are using vanilla Svelte for building the frontend. We stick to Svelte 5 syntax, which uses runes (`$state`, `$derived` etc.).

## Best Practices

- Use TypeScript
- Use vitest for unit testing
- Write unit tests for new code
- Check existing tests for examples
- Be consistent with the existing code
- Use `pnpm format:fix` to format the code
- Use `pnpm lint:fix` to lint the code
- Use `pnpm typecheck` to check the types
- Use `pnpm test:unit` to run unit tests for every package
- Use `pnpm build` to build everything
- Avoid using `npx`
