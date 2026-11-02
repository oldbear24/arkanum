.PHONY: dev dev-api dev-web build build-web test test-go test-web test-e2e lint seed clean

ifeq ($(OS),Windows_NT)
  EXE := .exe
endif

BIN := bin/arkanum$(EXE)
NODE_STAMP := web/node_modules/.package-lock.json
GO_SRC := $(wildcard main.go cardspec internal migrations web/embed.go)

# Known password for the demo accounts created by `make seed`. Development only.
export SEED_PASSWORD ?= arkanum-dev

$(NODE_STAMP): web/package-lock.json
	npm --prefix web ci --no-audit --no-fund

# PocketBase on :8090 and Vite on :5173 (Vite proxies /api and /_ to :8090).
dev: $(NODE_STAMP)
	$(MAKE) -j2 dev-api dev-web

dev-api:
	go run . serve --http=127.0.0.1:8090

dev-web:
	npm --prefix web run dev

build-web: $(NODE_STAMP)
	npm --prefix web run build

build: build-web
	go build -trimpath -o $(BIN) .

test: test-go test-web

test-go:
	go test ./...

test-web: $(NODE_STAMP)
	npm --prefix web test

test-e2e: build
	npm --prefix web run test:e2e

lint: $(NODE_STAMP)
	go vet ./...
	$(if $(strip $(shell gofmt -l $(GO_SRC))),$(error gofmt needed: $(shell gofmt -l $(GO_SRC))),@echo gofmt OK)
	npm --prefix web run lint
	npm --prefix web run typecheck

seed:
	go run . seed

clean:
	node -e "for (const d of ['web/dist/assets','web/dist/index.html','web/dist/favicon.svg','bin']) require('fs').rmSync(d,{recursive:true,force:true})"
