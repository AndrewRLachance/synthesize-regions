import { Effect, Schema } from 'effect';
import { LanguageModel } from 'effect/unstable/ai';
const __out = (Effect.flatMap(LanguageModel.LanguageModel, (model) => model.generateObject({ prompt: "Draft a launch plan", schema: Schema.Struct({ title: Schema.String }) })));
