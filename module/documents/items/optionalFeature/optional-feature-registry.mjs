import { OptionalFeatureDataModel, RollableOptionalFeatureDataModel } from './optional-feature-data-model.mjs';
import { DataModelRegistry } from '../../../fields/data-model-registry.mjs';

export class OptionalFeatureRegistry extends DataModelRegistry {
	constructor() {
		super({
			kind: 'Optional Feature',
			baseClass: OptionalFeatureDataModel,
			rollableClass: RollableOptionalFeatureDataModel,
		});
	}

	static instance = new OptionalFeatureRegistry();
}
