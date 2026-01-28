FROM node:24-slim AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm i -g corepack@0.31.0 && corepack enable

COPY . /app
WORKDIR /app
RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM scratch

COPY --from=builder /app/packages/backend/dist/ /extension/dist
COPY --from=builder /app/packages/backend/package.json /extension/
COPY --from=builder /app/packages/backend/quadlet-icon.woff2 /extension/
COPY --from=builder /app/packages/backend/media/ /extension/media
COPY --from=builder /app/LICENSE /extension/
COPY --from=builder /app/packages/backend/icon.png /extension/
COPY --from=builder /app/README.md /extension/
# ssh2 package need to be copied
COPY --from=builder /app/node_modules/ssh2 /extension/dist/node_modules/ssh2
# ssh2 depends on asn1
COPY --from=builder /app/node_modules/asn1 /extension/dist/node_modules/asn1
# asn1 depends on safer-buffer
COPY --from=builder /app/node_modules/safer-buffer /extension/dist/node_modules/safer-buffer
# ssh2 depends on bcrypt-pbkdf
COPY --from=builder /app/node_modules/bcrypt-pbkdf /extension/dist/node_modules/bcrypt-pbkdf
# bcrypt-pbkdf depends on tweetnacl
COPY --from=builder /app/node_modules/tweetnacl /extension/dist/node_modules/tweetnacl

LABEL org.opencontainers.image.title="Podman Quadlet Extension" \
        org.opencontainers.image.description="Podman Quadlet Extension" \
        org.opencontainers.image.vendor="axel7083" \
        io.podman-desktop.api.version=">= 1.14.0"
