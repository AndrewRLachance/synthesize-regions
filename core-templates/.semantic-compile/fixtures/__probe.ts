import { Effect } from 'effect';
import { AiError } from 'effect/unstable/ai';
const __out = (Effect.catchTag(Effect.fail(new AiError.AiError({ reason: { _tag: "UnknownError" } })), "AiError", () => Effect.void));
