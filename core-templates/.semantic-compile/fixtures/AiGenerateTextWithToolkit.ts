import { Effect } from 'effect';
import { LanguageModel, Toolkit } from 'effect/unstable/ai';
const __out = (Effect.flatMap(LanguageModel.LanguageModel, (model) => model.generateText({ prompt: "What is the stock for p-1?", toolkit: Toolkit.empty, toolChoice: "auto" })));
