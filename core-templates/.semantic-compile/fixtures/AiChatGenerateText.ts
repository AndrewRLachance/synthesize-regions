import { Chat } from 'effect/unstable/ai';
import { Effect } from 'effect';
const __out = (Effect.flatMap(Chat.empty, (chat) => chat.generateText({ prompt: "Summarize our discussion so far" })));
