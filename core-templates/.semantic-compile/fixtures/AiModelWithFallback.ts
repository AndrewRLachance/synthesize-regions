import { ExecutionPlan } from 'effect';
declare const PrimaryModel: any;
type PrimaryModel = any;
declare const SecondaryModel: any;
type SecondaryModel = any;
const __out = (ExecutionPlan.make(
	{ provide: PrimaryModel, attempts: 3 },
	{ provide: SecondaryModel, attempts: 2 }
));
