import { OptionalFeatureDataModel, RollableOptionalFeatureDataModel } from './optional-feature-data-model.mjs';
import { FeatureRegistry } from '../feature/feature-registry.mjs';

export class OptionalFeatureRegistry extends FeatureRegistry {
	constructor() {
		super({
			kind: 'Optional Feature',
			baseClass: OptionalFeatureDataModel,
			rollableClass: RollableOptionalFeatureDataModel,
		});
	}

	static instance = new OptionalFeatureRegistry();
}
