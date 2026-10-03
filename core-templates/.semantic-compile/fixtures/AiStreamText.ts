import { Effect, Stream } from 'effect';
import { LanguageModel } from 'effect/unstable/ai';
const __out = (Stream.unwrap(Effect.map(LanguageModel.LanguageModel, (model) => model.streamText({ prompt: "Count to five slowly" }))));
