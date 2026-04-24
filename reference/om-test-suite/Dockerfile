# Multi-stage build for the reader harness. Target deployment is
# test.open-membership.org once the custodian-held domain is available
# (plans/PHASE-3-4.md §2.3.1); provisional deployment lives anywhere a
# single static binary + port 8080 can run.
#
# The same image can run the publisher CLI via `docker run IMAGE
# /usr/local/bin/om-test-publisher ...`.

# ---- build ----
FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/om-test-harness ./cmd/om-test-harness \
 && CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/om-test-publisher ./cmd/om-test-publisher

# ---- runtime ----
FROM gcr.io/distroless/static:nonroot
COPY --from=build /out/om-test-harness /usr/local/bin/om-test-harness
COPY --from=build /out/om-test-publisher /usr/local/bin/om-test-publisher
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/om-test-harness"]
CMD ["--addr", ":8080"]
