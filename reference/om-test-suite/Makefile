# om-test-suite; publisher conformance runner + reader harness
#
# Common targets. All targets are stdlib-only; no external tooling required
# beyond a recent Go.

GO ?= go
SUITE_ADDR ?= :8080

.PHONY: build
build:
	$(GO) build ./...

.PHONY: test
test:
	$(GO) test ./...

.PHONY: vet
vet:
	$(GO) vet ./...

# Run the publisher suite against a live feed. Pass FEED=... DISCOVERY=... .
# Example:
#   make test-publisher FEED=https://pub.example/feed/om/T DISCOVERY=https://pub.example/.well-known/open-membership
.PHONY: test-publisher
test-publisher:
	@if [ -z "$(FEED)" ]; then echo "FEED=... is required"; exit 2; fi
	$(GO) run ./cmd/om-test-publisher --feed "$(FEED)" --discovery "$(DISCOVERY)"

# Run the reader harness. A reader-under-test points its CI at this address.
.PHONY: run-harness
run-harness:
	$(GO) run ./cmd/om-test-harness --addr $(SUITE_ADDR)

# Smoke test: boot the harness in the background, run the publisher suite
# against it, stop the harness. Verifies every moving part on the box.
.PHONY: smoke
smoke:
	@$(GO) run ./cmd/om-test-harness --addr :18899 & HARNESS_PID=$$!; \
	sleep 1; \
	$(GO) run ./cmd/om-test-publisher \
	    --feed http://127.0.0.1:18899/fixture/basic-paid/feed \
	    --discovery http://127.0.0.1:18899/fixture/basic-paid/.well-known/open-membership \
	    > /tmp/om-suite-smoke.json; \
	RESULT=$$?; \
	kill $$HARNESS_PID 2>/dev/null; \
	wait 2>/dev/null; \
	exit $$RESULT

.PHONY: list-tests
list-tests:
	$(GO) run ./cmd/om-test-publisher --list

.PHONY: clean
clean:
	rm -f ./om-test-publisher ./om-test-harness
	$(GO) clean -cache -testcache
