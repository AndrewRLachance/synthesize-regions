import { fragmentCollectionPort, literalPort, rawCodePort } from '../src/templates/compatibility.js'
import { defineTemplate } from '../src/templates/definition.js'
import { buildGraphCompiler } from '../src/templates/graph.js'
import type {
	SynthesisGraph,
	SynthesisNode,
	RawCodePolicy,
	TemplateArtifactInput,
	TemplateArtifactInputMap
} from '../src/templates/graphTypes.js'
import { defineTemplateCatalog } from '../src/templates/registry.js'
import { createGraphRunner } from '../src/templates/runner.js'

const safeExpressionPolicy: RawCodePolicy = {
	description: 'A short, single-line expression without dynamic code loading.',
	maxLength: 200,
	allowNewlines: false,
	forbiddenSubstrings: ['eval', 'Function', 'require', 'process']
}

export const ParseRequestBody = defineTemplate({
	modelId: 'ParseRequestBody',
	version: '1.0.0',
	description: 'Parses the incoming request body once for downstream statements.',
	inputs: {},
	output: { kind: 'statement' },
	source: 'const body = await request.json();'
})

export const ValidateRequiredField = defineTemplate({
	modelId: 'ValidateRequiredField',
	version: '1.0.0',
	description: 'Returns a 400 response when a required string field is absent.',
	inputs: {
		field: literalPort({
			regionKind: 'string',
			schema: { type: 'string' },
			description: 'Property name required in the parsed request body.'
		})
	},
	output: { kind: 'statement' },
	source: `const requiredField = ${"/** @TYPE string id=field **/\"\"/** @END **/"};
if (typeof body[requiredField] !== 'string' || body[requiredField].length === 0) {
	return Response.json({ error: 'Missing required field: ' + requiredField }, { status: 400 });
}`
})

export const FetchUpstreamProfile = defineTemplate({
	modelId: 'FetchUpstreamProfile',
	version: '1.0.0',
	description: 'Forwards the validated request body to an upstream service.',
	inputs: {
		endpoint: rawCodePort({
			regionKind: 'expression',
			policy: safeExpressionPolicy,
			type: { ts: 'string' },
			description: 'Upstream URL expression.'
		}),
		method: literalPort({
			regionKind: 'string',
			schema: { type: 'string', enum: ['POST', 'PUT', 'PATCH'] },
			description: 'HTTP method used for the upstream request.'
		})
	},
	output: { kind: 'statement' },
	source: `const upstreamResponse = await fetch(${"/** @TYPE expression id=endpoint **/undefined/** @END **/"}, {
	method: ${"/** @TYPE string id=method **/\"\"/** @END **/"},
	headers: { 'content-type': 'application/json' },
	body: JSON.stringify(body)
});
if (!upstreamResponse.ok) {
	return Response.json({ error: 'Upstream request failed' }, { status: 502 });
}`
})

export const AuditRequest = defineTemplate({
	modelId: 'AuditRequest',
	version: '1.0.0',
	description: 'Records an audit event after the upstream request succeeds.',
	inputs: {
		event: literalPort({
			regionKind: 'string',
			schema: { type: 'string' },
			description: 'Stable audit event name.'
		})
	},
	output: { kind: 'statement' },
	source: `console.info(${"/** @TYPE string id=event **/\"\"/** @END **/"}, {
	requestId: request.headers.get('x-request-id'),
	upstreamStatus: upstreamResponse.status
});`
})

export const ReturnJsonResponse = defineTemplate({
	modelId: 'ReturnJsonResponse',
	version: '1.0.0',
	description: 'Returns the parsed upstream payload as JSON.',
	inputs: {
		status: literalPort({
			regionKind: 'number',
			schema: { type: 'number' },
			description: 'Success status returned by the route handler.'
		})
	},
	output: { kind: 'statement' },
	source: `const profile = await upstreamResponse.json();
return Response.json({ profile }, { status: ${"/** @TYPE number id=status **/0/** @END **/"} });`
})

const routeStatementModelIds = [
	ParseRequestBody.modelId,
	ValidateRequiredField.modelId,
	FetchUpstreamProfile.modelId,
	AuditRequest.modelId,
	ReturnJsonResponse.modelId
] as const

export const PostRouteHandler = defineTemplate({
	modelId: 'PostRouteHandler',
	version: '1.0.0',
	description: 'Builds a POST route handler from an ordered collection of statement fragments.',
	inputs: {
		statements: fragmentCollectionPort({
			regionKind: 'statement',
			accepts: {
				outputKind: 'statement',
				sourceModelIds: [...routeStatementModelIds]
			},
			minItems: 1,
			separator: '\n',
			description: 'Statements placed in the route handler body in authored order.'
		})
	},
	output: { kind: 'statement' },
	source: `export async function POST(request: Request) {
${"/** @TYPE statement id=statements **/throw new Error(\"placeholder\");/** @END **/"}
}`
})

const templates = defineTemplateCatalog([
	ParseRequestBody,
	ValidateRequiredField,
	FetchUpstreamProfile,
	AuditRequest,
	ReturnJsonResponse,
	PostRouteHandler
])

const routeNode: SynthesisNode = {
	id: 'postRoute',
	templateId: PostRouteHandler.modelId,
	inputs: {
		statements: {
			kind: 'fragmentCollection',
			items: [
				{ $ref: 'parseBody' },
				{ $ref: 'validateBody' },
				{ $ref: 'fetchProfile' },
				{ $ref: 'auditRequest' },
				{ $ref: 'returnResponse' }
			]
		}
	}
}

const graph: SynthesisGraph = {
	nodes: [routeNode],
	finalNodeId: routeNode.id,
	goal: { outputKind: 'statement' }
}

const repairQueue: SynthesisNode[] = [
	{ id: 'parseBody', templateId: ParseRequestBody.modelId, inputs: {} },
	{ id: 'validateBody', templateId: ValidateRequiredField.modelId, inputs: {} },
	{ id: 'fetchProfile', templateId: FetchUpstreamProfile.modelId, inputs: {} },
	{ id: 'auditRequest', templateId: AuditRequest.modelId, inputs: {} },
	{ id: 'returnResponse', templateId: ReturnJsonResponse.modelId, inputs: {} }
]

const artifactValues: Record<string, TemplateArtifactInput> = {
	'validateBody.field': { kind: 'literal', value: 'userId' },
	'fetchProfile.endpoint': { kind: 'rawCode', code: "new URL('/profiles', request.url)" },
	'fetchProfile.method': { kind: 'literal', value: 'POST' },
	'auditRequest.event': { kind: 'literal', value: 'profile.forwarded' },
	'returnResponse.status': { kind: 'literal', value: 201 }
}

function main() {

	const compiler = buildGraphCompiler(templates)
	const runner = createGraphRunner(compiler, graph)

	while (true) switch (runner.state.kind) {
		case 'needsGraphRepair': {

			if (!repairQueue.length) return console.error('No graph repair remains for:', runner.state.diagnostics) ?? runner.state

			graph.nodes.push(repairQueue.shift()!)
			runner.advance({ kind: 'replaceGraph', graph })

			break
		}
		case 'needsArtifactInputs': {

			const inputs: TemplateArtifactInputMap = {}

			for (const unresolved of runner.state.artifact.unresolvedInputs) {
				const lookupKey = `${unresolved.nodeId}.${unresolved.inputName}`
				const value = artifactValues[lookupKey]

				if (!value) {
					console.error(`No artifact value is configured for ${lookupKey}.`)
					return
				}
				inputs[unresolved.id] = value
			}

			runner.advance({ kind: 'fill', inputs })
			break
		}
		case 'complete': 
		case 'failed': return runner.state
		case 'ready': runner.advance()
	}
}

main()
