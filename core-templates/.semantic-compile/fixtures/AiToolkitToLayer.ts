import { Effect } from 'effect';
declare const ProductToolkit: { readonly [key: string]: (...args: any[]) => Effect.Effect<any, any, any> };
type ProductToolkit = any;
const __out = (ProductToolkit.toLayer({ SearchProducts: ({ query }) => Effect.succeed([]), GetInventory: ({ productId }) => Effect.succeed({ productId, available: 0 }) }));
