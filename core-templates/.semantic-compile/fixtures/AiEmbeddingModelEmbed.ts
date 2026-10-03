import { Effect } from 'effect';
import { EmbeddingModel } from 'effect/unstable/ai';
const __out = (Effect.flatMap(EmbeddingModel.EmbeddingModel, (model) => model.embed("retry budget guidance")));
