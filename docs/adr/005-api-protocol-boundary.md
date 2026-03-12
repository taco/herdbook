# ADR 005: API Protocol Boundary

**Status:** Accepted
**Date:** 2026-03-12

## Context

The API is GraphQL-first — all CRUD operations (horses, riders, sessions, barns) go through a single `/graphql` endpoint. But the first AI feature (voice session parsing) required multipart file upload, and subsequent AI features involve pipeline-style processing (transcribe → extract → resolve) that doesn't map cleanly to the "query or mutate a resource" mental model.

We needed to decide whether to force AI features into GraphQL or carve out an explicit exception.

## Decision

**GraphQL for data operations. REST for AI operations.** The API has two styles, and the boundary is intentional:

| Concern                                            | Protocol | Why                                                             |
| -------------------------------------------------- | -------- | --------------------------------------------------------------- |
| CRUD on domain entities (horses, sessions, riders) | GraphQL  | Client controls shape, typed codegen, cache integration         |
| AI pipelines (voice parsing, summary generation)   | REST     | File uploads, streaming potential, shared rate-limit middleware |

### Criteria for choosing REST over GraphQL

A new endpoint should use REST when any of these apply:

1. **File uploads.** Multipart form data is a first-class HTTP concept. GraphQL requires workarounds (base64 encoding, graphql-upload middleware) that add complexity without benefit.
2. **Pipeline processing.** The operation is a multi-step pipeline (transcribe → parse → resolve IDs) where the response isn't a graph of domain entities — it's a structured result of a process.
3. **Streaming.** If the response may need to stream (SSE, chunked transfer), REST handles this natively. GraphQL subscriptions exist but are heavier infrastructure.

If none of these apply — if the operation reads or writes domain entities and the client benefits from controlling the response shape — it should be GraphQL.

### How the two styles coexist

Both styles share the same Fastify server, authentication (JWT verification), and Prisma instance. REST routes are registered alongside the GraphQL endpoint. Auth context is built the same way — the JWT is verified and `context.rider` is populated before the handler runs.

The key difference is middleware: REST AI endpoints use `withAiRateLimit()` for cost control, while GraphQL uses the schema transformer for auth (see ADR 002). These are different tools for different concerns, not competing patterns.

## Alternatives considered

**GraphQL for everything (including AI).** Use `mutation { parseSession(audio: Upload!) }` with the graphql-upload package. This keeps the API surface uniform — one endpoint, one schema, one codegen pipeline. Rejected because:

- graphql-upload adds middleware that processes _every_ request (not just uploads) to check for multipart boundaries
- File size validation and streaming are more naturally expressed in REST middleware
- The response of "voice parsing" isn't a domain entity — it's a parsing result with confidence scores, alternatives, and resolved IDs. Forcing it into the GraphQL schema adds types that don't belong in the domain model
- Apollo Client's upload handling requires a custom link, adding client complexity

**REST for everything.** Drop GraphQL entirely and use REST endpoints with OpenAPI. Eliminates the "two styles" confusion. Rejected because GraphQL's value is real for the data layer — the frontend fetches different shapes of horse/session/rider data on different pages, and GraphQL eliminates the need for page-specific endpoints. The AI features don't benefit from this flexibility.

**Separate AI service.** Deploy AI features as a separate microservice with its own API. Provides isolation (AI failures don't affect data operations) and independent scaling. Rejected as premature — the AI features share the same database (for ID resolution), auth system, and deployment. Extracting them adds network hops, deployment complexity, and shared-nothing coordination for two endpoints.

**GraphQL subscriptions for streaming AI.** Use subscriptions for features that might stream (e.g., live transcription). Subscriptions require WebSocket infrastructure (connection management, heartbeats, reconnection). REST with SSE or chunked responses is simpler and doesn't require persistent connections. If real-time features grow (live collaboration, presence), subscriptions become more justified.

## Consequences

- The API has two styles, which requires documentation and onboarding. The criteria above make the boundary explicit rather than arbitrary.
- REST endpoints don't get automatic TypeScript codegen from the schema. Response types are defined manually or with Zod schemas (which the prompt registry already uses).
- Frontend code calling AI endpoints uses `fetch()` directly, not Apollo Client. This means no automatic cache integration — but AI results (parsing output, summaries) are typically consumed once, not cached.
- Adding a new AI feature follows the REST pattern. Adding a new data feature follows the GraphQL pattern. If something genuinely fits both (e.g., a mutation that triggers AI processing and returns a domain entity), the mutation should be GraphQL with the AI call internal to the resolver — the client doesn't need to know AI is involved.
