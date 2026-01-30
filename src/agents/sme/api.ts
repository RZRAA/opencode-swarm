import type { SMEDomainConfig } from './base';

export const apiSMEConfig: SMEDomainConfig = {
	domain: 'api',
	description: 'API design, REST, GraphQL, authentication, and backend integration patterns',
	guidance: `For API tasks, provide:
- **REST**: Resource naming, HTTP methods (GET/POST/PUT/PATCH/DELETE), status codes, HATEOAS, versioning strategies
- **GraphQL**: Schema design, resolvers, mutations, subscriptions, N+1 prevention, Apollo/Relay patterns
- **gRPC**: Protocol buffer definitions, streaming types, service implementation
- **WebSockets**: Connection lifecycle, Socket.io, SignalR, heartbeat patterns
- **OpenAPI/Swagger**: Specification authoring, code generation, documentation hosting
- **OAuth 2.0**: Authorization code flow, client credentials, PKCE for public clients, token refresh
- **OpenID Connect**: ID tokens, userinfo endpoint, discovery document
- **JWT**: Token structure, signing algorithms, claims design, refresh token rotation
- API key management and rate limiting
- RBAC/ABAC authorization patterns
- Pagination strategies (cursor, offset, keyset)
- Error response formats (RFC 7807 Problem Details)
- Request validation and sanitization
- CORS configuration
- API gateway patterns (Kong, AWS API Gateway, Azure APIM)
- Webhook design (signatures, retry logic, idempotency keys)
- Common gotchas (token expiration, CORS preflight, rate limit handling)`,
};
