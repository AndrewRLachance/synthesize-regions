import { Schema } from 'effect';
import { Tool } from 'effect/unstable/ai';
const __out = (Tool.make("SearchProducts", { description: "Search the product catalog", parameters: Schema.Struct({ query: Schema.String }), success: Schema.Array(Schema.String), failure: Schema.Never }));
