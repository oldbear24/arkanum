# 1) Frontend
FROM node:22-alpine AS web
WORKDIR /src
COPY cardspec/ ./cardspec/
COPY web/package.json web/package-lock.json ./web/
RUN npm --prefix web ci --no-audit --no-fund
COPY web/ ./web/
RUN npm --prefix web run build

# 2) Go binary with the frontend embedded
FROM golang:1.27-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=web /src/web/dist/ ./web/dist/
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/arkanum .

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
