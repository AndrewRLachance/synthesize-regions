# Effect V4 Security / Secrets / Auth Cross-Boundary Templates

This pack adds security-focused graph templates above the existing HTTP/REST, CLI, Child Process, observability, application-assembly, and service-boundary catalogs.

It intentionally **does not** invent a first-party JWT/OAuth verifier or cryptographic key-management API. Effect V4 currently supplies credential transport/declaration primitives (`HttpApiSecurity`), Redacted values, Config/Schema support, header redaction, cookie helpers, middleware contracts, and general services. Authentication and authorization policy remain application-defined callbacks/services.

## Pack contents

- `effect-security-template-helpers.ts`
- `effect-v4-security-foundational-templates.ts`
- `effect-v4-security-cross-boundary-templates.ts`
- `effect-v4-security-cross-boundary-template-catalog.ts`
- `effect-v4-expanded-with-security-cross-boundary-template-catalog.ts`
- `validate-security-cross-boundary-pack.js`
- `security-cross-boundary-validation.json`

The pack contains **59 concrete templates**:

- **39 foundations**
- **20 cross-boundary / production compositions**

## Security model

### Redacted reduces accidental disclosure; it is not encryption

`Redacted<A>` masks string, JSON, and inspection output but the underlying value remains in memory and is recoverable with `Redacted.value` until wiped or garbage-collected. `wipeUnsafe` removes the wrapper's registry entry; it does not zero memory and does not affect other references.

The templates therefore make reveal/wipe operations explicit and label the acquire/use/wipe composition as appropriate only for **exclusively owned wrappers**.

### Secret configuration

`SecurityConfigRedacted` uses the current V4 `Config.Redacted(name)` constructor.

Schema support distinguishes:

- `Schema.RedactedFromValue(inner)` — decodes a raw input and wraps the decoded value in `Redacted`.
- `Schema.Redacted(inner)` — expects a Redacted runtime value on both sides.
- `SecuritySchemaNonSerializableSecret` — sets `disallowJsonEncode: true` so JSON representation fails instead of serializing the hidden value.

### HTTP header redaction

Effect's HTTP `Headers` service already treats common credential headers as sensitive during inspection/tracing. The current default redacted names include `authorization`, `cookie`, `set-cookie`, and `x-api-key`.

The pack adds:

- explicit `Headers.redact` graph nodes,
- `Headers.isRedactedName`,
- an Effect-scoped override of `Headers.CurrentRedactedNames` for custom credential headers.

### HttpApi authentication

`HttpApiSecurity` supports:

- Bearer tokens,
- Basic credentials,
- API keys in headers, query parameters, or cookies,
- custom HTTP Authorization schemes.

A security scheme only describes **where/how credentials are decoded**. It does not authenticate requests by itself. Authentication is implemented by the middleware service attached to the API.

This pack reuses the previously generated `HttpApiSecurityBearer`, `HttpApiSecurityBasic`, and `HttpApiSecurityApiKey` templates rather than duplicating their model IDs, then adds:

- custom HTTP schemes,
- security annotations,
- explicit credential decoding,
- secure API-key cookie issuance,
- bearer/API-key/basic principal middleware,
- endpoint-aware authorization middleware,
- combined authentication + authorization Layers.

### Authorization

The pack introduces two catalog-local service shapes:

```text
AuthenticationService<C, P, E, R>
    authenticate(C) -> Effect<P, E, R>

AuthorizationService<P, A, Resource, E, R>
    authorize(P, A, Resource) -> Effect<void, E, R>
```

These are not new Effect framework APIs; they are reusable application-service contracts built from normal `Context.Service` / `Layer` semantics. They let HTTP, RPC, workers, CLI handlers, workflows, and ordinary service operations share the same authentication/authorization policy implementation.

### Generated HTTP clients

Current `HttpApiMiddleware.layerClient` supports client middleware that runs around generated client requests. The pack provides:

- dynamic bearer-token middleware,
- dynamic Basic-auth middleware,
- dynamic API-key-header middleware,
- Config-backed variants that resolve credentials at Layer construction.

Dynamic provider templates are suitable when credential rotation is needed between requests; Config-backed static Layers intentionally load once.

### Cookie sessions

`HttpClient.withCookiesRef` supplies shared cookie storage to an HTTP client so `Set-Cookie` responses are retained and sent on later requests.

`SecuritySessionHttpClientLayer` creates a Ref-backed cookie jar over a base HttpClient Layer.

`SecurityStrictSessionCookie` issues an API-key cookie with:

- `secure: true`,
- `httpOnly: true`,
- `sameSite: "strict"`,
- explicit path.

The lower-level `HttpApiBuilder.securitySetCookie` itself also defaults `secure` and `httpOnly` to true unless overridden.

### Browser security headers

The pack intentionally does **not** hard-code production CSP or HSTS values. Those policies are deployment-specific and incorrect defaults can either break applications or create a false sense of security.

`SecurityBrowserHardeningHeaders` always includes `X-Content-Type-Options: nosniff`, while CSP, HSTS, Referrer-Policy, and Permissions-Policy remain explicit inputs.

### CLI credential acquisition

The CLI compositions prefer `Redacted` Config values and masked `Prompt.Password` input.

`SecurityCliConfigOrPromptSecret` is useful for interactive developer/admin commands, but it catches Config failure and falls back to prompting. For unattended production processes, prefer failing closed on configuration errors rather than prompting.

### Child process secret handoff

The pack deliberately provides **no template that puts secrets into argv or environment variables**.

`SecurityChildProcessSecretStdinCommand` sends a Redacted secret through child stdin. This avoids common argv/process-list and environment leakage paths, but the child still receives plaintext bytes and can log/store them. It is a transport boundary, not cryptographic protection.

## Foundational templates

1. `SecurityRedactedMakeLabeled`
2. `SecurityRedactedIsRedacted`
3. `SecurityRedactedRevealEffect`
4. `SecurityRedactedWipeEffect`
5. `SecuritySchemaRedactedFromValue`
6. `SecuritySchemaRedactedRuntime`
7. `SecuritySchemaNonSerializableSecret`
8. `SecurityConfigRedacted`
9. `SecurityHeadersRedact`
10. `SecurityHeadersIsRedactedName`
11. `SecurityEffectWithHeaderRedactionPatterns`
12. `SecurityHttpApiCustomScheme`
13. `SecurityHttpApiSecurityAnnotate`
14. `SecurityHttpApiSecurityAnnotateMerge`
15. `SecurityHttpApiDecodeCredential`
16. `SecurityHttpApiSetApiKeyCookie`
17. `SecurityHttpClientRequestApiKeyHeader`
18. `SecurityHttpClientRequestCustomAuth`
19. `SecurityCookieJarMake`
20. `SecurityHttpClientWithCookieJar`
21. `SecurityHttpServerResponseSecurityHeaders`
22. `SecurityHttpMiddlewareSecurityHeaders`
23. `SecurityHttpServerResponseExpireCookie`
24. `SecurityCredentialProviderLayer`
25. `SecurityCredentialProviderGet`
26. `SecurityAuthenticationServiceLayer`
27. `SecurityAuthenticateCredential`
28. `SecurityAuthorizationServiceLayer`
29. `SecurityAuthorizePrincipal`
30. `SecurityPrincipalLayer`
31. `SecurityPrincipalGet`
32. `SecurityBearerPrincipalMiddlewareLayer`
33. `SecurityApiKeyPrincipalMiddlewareLayer`
34. `SecurityBasicPrincipalMiddlewareLayer`
35. `SecurityAuthorizationHttpApiMiddlewareLayer`
36. `SecurityDynamicBearerClientMiddlewareLayer`
37. `SecurityDynamicBasicClientMiddlewareLayer`
38. `SecurityDynamicApiKeyHeaderClientMiddlewareLayer`
39. `SecurityEphemeralRedactedUse`

## Cross-boundary compositions

1. `SecurityConfigCredentialProviderLayer`
2. `SecurityConfigBearerClientMiddlewareLayer`
3. `SecurityConfigApiKeyClientMiddlewareLayer`
4. `SecurityConfigBasicClientMiddlewareLayer`
5. `SecurityBearerAuthnAuthzLayers`
6. `SecurityApiKeyAuthnAuthzLayers`
7. `SecurityBasicAuthnAuthzLayers`
8. `SecuritySessionHttpClientLayer`
9. `SecurityStrictSessionCookie`
10. `SecurityBrowserHardeningHeaders`
11. `SecurityCliConfigOrPromptSecret`
12. `SecurityCliBearerRequest`
13. `SecurityCliApiKeyRequest`
14. `SecurityChildProcessSecretStdinCommand`
15. `SecurityObservedAuthentication`
16. `SecurityObservedAuthorization`
17. `SecurityApplicationLayer`
18. `SecurityServerSourceFile`
19. `SecurityClientSourceFile`
20. `SecurityCliSourceFile`

## Deliberate exclusions

This pack does not synthesize:

- JWT signature verification,
- OAuth authorization-code/device/client-credentials protocols,
- password hashing,
- key derivation,
- encryption/decryption,
- certificate/private-key storage,
- KMS/HSM adapters,
- CSRF token algorithms.

Those require a verified cryptographic/security provider or an explicit external library/provider contract. Bearer and API-key values in this pack are treated as opaque credentials whose meaning is defined by application authentication callbacks.

## Validation

The validator checks:

- TypeScript module syntax,
- fallback-generated syntax,
- one physical marker for every declared input,
- no undeclared or repeated markers,
- no generic placeholder leakage into source initializers,
- factory-produced model IDs,
- duplicate model IDs,
- collisions against prior generated catalog files.

All **59 model IDs pass** these checks.

This remains structural/source validation, **not** a module-resolved `tsc --strict` compile against a pinned Effect installation.

## API audit

Audited against current Effect V4 sources/docs on 2026-09-30.

The current repository package metadata visible during the audit reports `effect` `4.0.0-rc.117`, while current V4 documentation pages report `4.0.0-rc.118`. The HTTP/HttpApi surfaces remain unstable, so pin matching Effect/platform/tool versions in applications that consume generated templates.
