.PHONY: build
build:
	deno compile -A --unstable --output ./runjs ./main.ts
