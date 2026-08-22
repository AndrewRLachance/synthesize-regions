# AbstractReasoningGraph synthesis design

Generate one complete TypeScript source file. The final synthesis node must use
`AbstractReasoningGraphSourceFile`, with its declaration input referencing one
`AbstractReasoningGraph` node. The wrapper owns the required type-only imports.

The abstract class already declares the public reasoning-graph API. Its seven
member-category collections are optional design choices: an explicit empty
collection is valid and preferred unless the captured TypeScript reference or
task objective demonstrates a concrete shared-state or helper-method need.

Do not invent placeholder state, duplicate API methods, or no-op helpers merely
to populate a category.
