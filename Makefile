IMPORT_MAP="./import_map.json"
OUTPUT="./bin/runjs"

.PHONY: clean
clean:
	@rm -rf $(shell dirname ${OUTPUT})

.PHONY: install
install:
	deno run --allow-ffi --unstable --import-map ${IMPORT_MAP} src/deps.ts

.PHONY: build
build: install
	@mkdir -p $(shell dirname ${OUTPUT})
	deno compile -A --unstable --import-map ${IMPORT_MAP} --output ${OUTPUT} src/main.ts
