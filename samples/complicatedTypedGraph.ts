import { fragmentCollectionPort, fragmentPort, literalPort, rawCodePort } from '../src/templates/compatibility.js'
import { defineTemplate } from '../src/templates/definition.js'
import { buildGraphCompiler } from '../src/templates/graph.js'
import { defineTemplateCatalog } from '../src/templates/registry.js'

const StringLiteral = defineTemplate({
	modelId: 'TypedStringLiteral',
	version: '1.0.0',
	inputs: {
		value: literalPort({
			regionKind: 'string',
			schema: { type: 'string' }
		})
	},
	output: {
		kind: 'string',
		type: { ts: 'string' }
	},
	template: (r) => r('value')
})

const NumberLiteral = defineTemplate({
	modelId: 'TypedNumberLiteral',
	version: '1.0.0',
	inputs: {
		value: literalPort({
			regionKind: 'number',
			schema: { type: 'number' }
		})
	},
	output: {
		kind: 'number',
		type: { ts: 'number' }
	},
	template: (r) => r('value')
})

const EndpointExpression = defineTemplate({
	modelId: 'TypedEndpointExpression',
	version: '1.0.0',
	inputs: {
		code: rawCodePort({
			regionKind: 'expression',
			policy: {
				maxLength: 200,
				allowNewlines: false,
				forbiddenSubstrings: ['eval', 'Function', 'require', 'process']
			},
			type: { ts: 'string | URL' }
		})
	},
	output: {
		kind: 'expression',
		type: { ts: 'string | URL' }
	},
	template: (r) => r('code')
})

const ParseBody = defineTemplate({
	modelId: 'TypedParseBody',
	version: '1.0.0',
	inputs: {},
	output: { kind: 'statement' },
	template: () => 'const body = await request.json();'
})

const ValidateBody = defineTemplate({
	modelId: 'TypedValidateBody',
	version: '1.0.0',
	inputs: {
		field: fragmentPort({
			regionKind: 'string',
			accepts: {
				outputKind: 'string',
				type: { ts: 'string' },
				sourceModelIds: [StringLiteral.modelId]
			}
		})
	},
	output: { kind: 'statement' },
	template: (r) => `if (typeof body[${r('field')}] !== 'string') {
	return Response.json({ error: 'Invalid field: ' + ${r('field')} }, { status: 400 });
}`
})

const FetchProfile = defineTemplate({
	modelId: 'TypedFetchProfile',
	version: '1.0.0',
	inputs: {
		endpoint: fragmentPort({
			regionKind: 'expression',
			accepts: {
				outputKind: 'expression',
				type: { ts: 'string | URL' },
				sourceModelIds: [EndpointExpression.modelId]
			}
		}),
		method: fragmentPort({
			regionKind: 'string',
			accepts: {
				outputKind: 'string',
				type: { ts: 'string' },
				sourceModelIds: [StringLiteral.modelId]
			}
		})
	},
	output: { kind: 'statement' },
	template: (r) => `const upstreamResponse = await fetch(${r('endpoint')}, {
	method: ${r('method')},
	headers: { 'content-type': 'application/json' },
	body: JSON.stringify(body)
});
if (!upstreamResponse.ok) {
	return Response.json({ error: 'Upstream request failed' }, { status: 502 });
}`
})

const AuditProfile = defineTemplate({
	modelId: 'TypedAuditProfile',
	version: '1.0.0',
	inputs: {
		event: fragmentPort({
			regionKind: 'string',
			accepts: {
				outputKind: 'string',
				type: { ts: 'string' },
				sourceModelIds: [StringLiteral.modelId]
			}
		})
	},
	output: { kind: 'statement' },
	template: (r) => `console.info(${r('event')}, {
	requestId: request.headers.get('x-request-id'),
	upstreamStatus: upstreamResponse.status
});`
})

const ReturnProfile = defineTemplate({
	modelId: 'TypedReturnProfile',
	version: '1.0.0',
	inputs: {
		status: fragmentPort({
			regionKind: 'number',
			accepts: {
				outputKind: 'number',
				type: { ts: 'number' },
				sourceModelIds: [NumberLiteral.modelId]
			}
		})
	},
	output: { kind: 'statement' },
	template: (r) => `const profile = await upstreamResponse.json();
return Response.json({ profile }, { status: ${r('status')} });`
})

const routeStatementModelIds = [
	ParseBody.modelId,
	ValidateBody.modelId,
	FetchProfile.modelId,
	AuditProfile.modelId,
	ReturnProfile.modelId
] as const

const PostRoute = defineTemplate({
	modelId: 'TypedPostRoute',
	version: '1.0.0',
	inputs: {
		statements: fragmentCollectionPort({
			regionKind: 'statement',
			accepts: {
				outputKind: 'statement',
				sourceModelIds: [...routeStatementModelIds]
			},
			minItems: 1,
			separator: '\n'
		})
	},
	output: { kind: 'statement' },
	template: (r) => `export async function POST(request: Request) {
${r('statements')}
}`
})

const templates = defineTemplateCatalog([
	StringLiteral,
	NumberLiteral,
	EndpointExpression,
	ParseBody,
	ValidateBody,
	FetchProfile,
	AuditProfile,
	ReturnProfile,
	PostRoute
])

const compiler = buildGraphCompiler(templates)

// defineGraph checks template IDs, input names, required inputs, reference IDs,
// fragment output kinds, and source-model allowlists while this object is authored.
const graph = compiler.defineGraph({
	nodes: [
		{
			id: 'requiredField',
			templateId: 'TypedStringLiteral',
			inputs: { value: { kind: 'literal', value: 'userId' } }
		},
		{
			id: 'httpMethod',
			templateId: 'TypedStringLiteral',
			inputs: { value: { kind: 'literal', value: 'POST' } }
		},
		{
			id: 'auditEvent',
			templateId: 'TypedStringLiteral',
			inputs: { value: { kind: 'literal', value: 'profile.forwarded' } }
		},
		{
			id: 'successStatus',
			templateId: 'TypedNumberLiteral',
			inputs: { value: { kind: 'literal', value: 201 } }
		},
		{
			id: 'profileEndpoint',
			templateId: 'TypedEndpointExpression',
			inputs: { code: { kind: 'rawCode', code: "new URL('/profiles', request.url)" } }
		},
		{ id: 'parseBody', templateId: 'TypedParseBody', inputs: {} },
		{
			id: 'validateBody',
			templateId: 'TypedValidateBody',
			inputs: { field: { $ref: 'requiredField' } }
		},
		{
			id: 'fetchProfile',
			templateId: 'TypedFetchProfile',
			inputs: {
				endpoint: { $ref: 'profileEndpoint' },
				method: { $ref: 'httpMethod' }
			}
		},
		{
			id: 'auditProfile',
			templateId: 'TypedAuditProfile',
			inputs: { event: { $ref: 'auditEvent' } }
		},
		{
			id: 'returnProfile',
			templateId: 'TypedReturnProfile',
			inputs: { status: { $ref: 'successStatus' } }
		},
		{
			id: 'postRoute',
			templateId: 'TypedPostRoute',
			inputs: {
				statements: {
					kind: 'fragmentCollection',
					items: [
						{ $ref: 'parseBody' },
						{ $ref: 'validateBody' },
						{ $ref: 'fetchProfile' },
						{ $ref: 'auditProfile' },
						{ $ref: 'returnProfile' }
					]
				}
			}
		}
	],
	finalNodeId: 'postRoute',
	goal: { outputKind: 'statement' }
})

const result = compiler(graph)

if (!result.ok) console.error('Typed graph compilation failed:', result.diagnostics)
else
	console.log('Generated from a compiler.defineGraph-checked graph:\n') ??
		console.log(result.finalArtifact.code) ??
		console.log('\nProvenance:', result.finalArtifact.provenance)

/*
Try these edits to see compiler.defineGraph reject the graph before runtime:

- Change validateBody.field to { $ref: 'successStatus' } (number -> string).
- Change fetchProfile.endpoint to { $ref: 'requiredField' } (string -> expression).
- Add { $ref: 'requiredField' } to postRoute.statements (string -> statement).
- Misspell an input name or templateId.
- Remove a required input.
*/
