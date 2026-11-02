# 1) Frontend. The result is the same for every architecture, so it is built only once.
FROM --platform=$BUILDPLATFORM node:22-alpine AS web
WORKDIR /src
COPY cardspec/ ./cardspec/
COPY web/package.json web/package-lock.json ./web/
RUN npm --prefix web ci --no-audit --no-fund
COPY web/ ./web/
RUN npm --prefix web run build

# 2) Go binary with the frontend embedded. Cross-compiling is much faster than emulation.
FROM --platform=$BUILDPLATFORM golang:1.27-alpine AS build
ARG TARGETOS
ARG TARGETARCH
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=web /src/web/dist/ ./web/dist/
# The release workflow passes the version. Declared this late so it can't invalidate the layers above.
ARG VERSION=dev
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -trimpath -ldflags="-s -w -X main.version=$VERSION" -o /out/arkanum .

# 3) Small runtime image
FROM alpine:3.22
RUN apk add --no-cache ca-certificates tzdata \
    && adduser -D -H -u 10001 arkanum \
    && mkdir /pb_data \
    && chown arkanum /pb_data
COPY --from=build /out/arkanum /usr/local/bin/arkanum
USER arkanum
VOLUME /pb_data
EXPOSE 8090
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8090/api/health || exit 1
ENTRYPOINT ["/usr/local/bin/arkanum"]
CMD ["serve", "--http=0.0.0.0:8090", "--dir=/pb_data"]
