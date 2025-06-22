import { ClassFeatureDataModel, RollableClassFeatureDataModel } from './class-feature-data-model.mjs';
import { DataModelRegistry } from '../../../fields/data-model-registry.mjs';

export class ClassFeatureRegistry extends DataModelRegistry {
	constructor() {
		super({
			kind: 'Class Feature',
			baseClass: ClassFeatureDataModel,
			rollableClass: RollableClassFeatureDataModel,
		});
	}

	static instance = new ClassFeatureRegistry();
}
