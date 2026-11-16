FROM registry.access.redhat.com/ubi10/nodejs-24-minimal:1791463197@sha256:498ccfc43f6fe349a4d87db6af6d83ab420e9450f3800140cdc90c290dcd462f AS builder

WORKDIR /opt/app-root/src

# pnpm runs an implicit dependency check before `run` scripts, which spawns a
# nested `pnpm install`. Setting CI here rather than per-RUN makes every pnpm
# invocation non-interactive, otherwise that nested install blocks on a prompt.
ENV CI=true

RUN npm i -g corepack@0.36.0 && corepack enable

COPY --chown=1001:1001 . .

RUN pnpm install --frozen-lockfile
RUN pnpm build

# Assemble the extension layout, so the final stage is a single COPY
RUN mkdir -p /opt/app-root/extension
RUN cp -r packages/backend/dist /opt/app-root/extension/
RUN cp packages/backend/package.json /opt/app-root/extension/
RUN cp packages/backend/quadlet-icon.woff2 /opt/app-root/extension/
RUN cp -r packages/backend/media /opt/app-root/extension/
RUN cp LICENSE /opt/app-root/extension/
RUN cp packages/backend/icon.png /opt/app-root/extension/
RUN cp README.md /opt/app-root/extension/
# ssh2 package need to be copied
RUN mkdir -p /opt/app-root/extension/dist/node_modules
RUN cp -rL node_modules/ssh2 /opt/app-root/extension/dist/node_modules/
# ssh2 depends on asn1
RUN cp -rL node_modules/asn1 /opt/app-root/extension/dist/node_modules/
# asn1 depends on safer-buffer
RUN cp -rL node_modules/safer-buffer /opt/app-root/extension/dist/node_modules/
# ssh2 depends on bcrypt-pbkdf
RUN cp -rL node_modules/bcrypt-pbkdf /opt/app-root/extension/dist/node_modules/
# bcrypt-pbkdf depends on tweetnacl
RUN cp -rL node_modules/tweetnacl /opt/app-root/extension/dist/node_modules/

FROM scratch

COPY --from=builder /opt/app-root/extension /extension

LABEL org.opencontainers.image.title="Podman Quadlet Extension" \
        org.opencontainers.image.description="Podman Quadlet Extension" \
        org.opencontainers.image.vendor="axel7083" \
        io.podman-desktop.api.version=">= 1.22.0"
