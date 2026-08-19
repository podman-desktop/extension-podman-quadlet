FROM registry.access.redhat.com/ubi10/nodejs-24-minimal:10.1-1766060610 AS builder

WORKDIR /opt/app-root/src

RUN npm i -g corepack@0.31.0 && corepack enable

COPY --chown=1001:1001 . .

RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM scratch

COPY --from=builder /opt/app-root/src/packages/backend/dist/ /extension/dist
COPY --from=builder /opt/app-root/src/packages/backend/package.json /extension/
COPY --from=builder /opt/app-root/src/packages/backend/quadlet-icon.woff2 /extension/
COPY --from=builder /opt/app-root/src/packages/backend/media/ /extension/media
COPY --from=builder /opt/app-root/src/LICENSE /extension/
COPY --from=builder /opt/app-root/src/packages/backend/icon.png /extension/
COPY --from=builder /opt/app-root/src/README.md /extension/
# ssh2 package need to be copied
COPY --from=builder /opt/app-root/src/node_modules/ssh2 /extension/dist/node_modules/ssh2
# ssh2 depends on asn1
COPY --from=builder /opt/app-root/src/node_modules/asn1 /extension/dist/node_modules/asn1
# asn1 depends on safer-buffer
COPY --from=builder /opt/app-root/src/node_modules/safer-buffer /extension/dist/node_modules/safer-buffer
# ssh2 depends on bcrypt-pbkdf
COPY --from=builder /opt/app-root/src/node_modules/bcrypt-pbkdf /extension/dist/node_modules/bcrypt-pbkdf
# bcrypt-pbkdf depends on tweetnacl
COPY --from=builder /opt/app-root/src/node_modules/tweetnacl /extension/dist/node_modules/tweetnacl

LABEL org.opencontainers.image.title="Podman Quadlet Extension" \
        org.opencontainers.image.description="Podman Quadlet Extension" \
        org.opencontainers.image.vendor="axel7083" \
        io.podman-desktop.api.version=">= 1.22.0"
