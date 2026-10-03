import { Layer } from 'effect';
import { Model } from 'effect/unstable/ai';
const __out = (Model.make({ provider: "openai", modelName: "gpt-5", layer: Layer.empty }));
