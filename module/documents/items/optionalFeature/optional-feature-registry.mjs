import { OptionalFeatureDataModel, RollableOptionalFeatureDataModel } from './optional-feature-data-model.mjs';
import { FeatureDataModelRegistry } from '../../../fields/feature-data-model-registry.mjs';

export class OptionalFeatureRegistry extends FeatureDataModelRegistry {
	constructor() {
		super({
			kind: 'Optional Feature',
			baseClass: OptionalFeatureDataModel,
			rollableClass: RollableOptionalFeatureDataModel,
		});
	}

	static instance = new OptionalFeatureRegistry();
}
