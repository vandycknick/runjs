.PHONY: install
install:
	deno run --allow-ffi --unstable src/deps.ts

.PHONY: build
build:
	deno compile -A --unstable --output ./runjs src/main.ts
