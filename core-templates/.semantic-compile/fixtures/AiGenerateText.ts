import { Effect } from 'effect';
import { LanguageModel } from 'effect/unstable/ai';
const __out = (Effect.flatMap(LanguageModel.LanguageModel, (model) => model.generateText({ prompt: "Explain retry budgets in one paragraph" })));
