import { ClassFeatureDataModel, RollableClassFeatureDataModel } from './class-feature-data-model.mjs';
import { FeatureDataModelRegistry } from '../../../fields/feature-data-model-registry.mjs';

export class ClassFeatureRegistry extends FeatureDataModelRegistry {
	constructor() {
		super({
			kind: 'Class Feature',
			baseClass: ClassFeatureDataModel,
			rollableClass: RollableClassFeatureDataModel,
		});
	}

	static instance = new ClassFeatureRegistry();
}
