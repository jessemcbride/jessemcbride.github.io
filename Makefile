.DEFAULT_GOAL := run

PORT ?= 4321
export PORT

.PHONY: run dev install build preview test check refresh spotify deploy doctor help

run dev:
	npm run dev

install:
	npm ci

build:
	npm run build

preview:
	npm run preview

test:
	npm test

check:
	npm run check

refresh:
	npm run refresh

spotify:
	npm run spotify:connect

deploy:
	npm run deploy

doctor:
	npm run doctor

help:
	@printf '%s\n' \
	  'make run      Start site and editor (default target)' \
	  '              Site: http://127.0.0.1:$(PORT)/' \
	  '              Editor: http://127.0.0.1:$(PORT)/manage' \
	  '              Override port: make run PORT=4322' \
	  'make install  Install from package lock' \
	  'make build    Build the static site' \
	  'make preview  Serve production preview' \
	  'make test     Run tests' \
	  'make check    Run tests and build' \
	  'make refresh  Update feeds locally' \
	  'make spotify  Connect Spotify' \
	  'make deploy   Check, confirm, commit and push' \
	  'make doctor   Check local setup'
