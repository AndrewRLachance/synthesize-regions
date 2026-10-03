import { AiError } from 'effect/unstable/ai';
import { Effect } from 'effect';
const __out = (Effect.catchTag(Effect.fail(new AiError.AiError({ reason: { _tag: "UnknownError" } })), "AiError", () => Effect.void));
