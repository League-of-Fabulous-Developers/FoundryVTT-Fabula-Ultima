import { FUItem } from '../../items/item.mjs';
import { ClassFeatureTypeDataModel } from '../../items/classFeature/class-feature-type-data-model.mjs';
import { MagiseedDataModel } from '../../items/classFeature/floralist/magiseed-data-model.mjs';
import { GardenDataModel } from '../../items/classFeature/floralist/garden-data-model.mjs';
import { EmbeddedItemUuidField } from '../../../fields/embedded-item-uuid-field.mjs';

/**
 * @property {FUItem} planted
 * @property {FUItem} garden
 */
export class FloralistDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		return {
			planted: new EmbeddedItemUuidField({
				validate: (doc) => doc.system instanceof ClassFeatureTypeDataModel && doc.system.data instanceof MagiseedDataModel,
			}),
			garden: new EmbeddedItemUuidField({
				validate: (doc) => doc.system instanceof ClassFeatureTypeDataModel && doc.system.data instanceof GardenDataModel,
			}),
		};
	}

	prepareData() {
		if (!this.garden) {
			// need to use Object#defineProperty here because `planted` and `garden` get defined as a getter/setter with no-op setter
			Object.defineProperty(this, 'planted', { value: null, configurable: true });
		}
	}

	async togglePlantedMagiseed(magiseed) {
		if (this.garden && this.#isMagiseed(magiseed)) {
			if (this.planted === magiseed) {
				await this.parent.actor.update({
					'system.floralist.planted': null,
				});
				return magiseed.system.data.postRemoved();
			} else {
				await this.parent.actor.update({
					'system.floralist.planted': magiseed.uuid,
				});
				return magiseed.system.data.postPlanted();
			}
		} else {
			ui.notifications.error('Could not plant.');
			console.error('Could not plant.', magiseed);
		}
	}

	#isMagiseed(magiseed) {
		return magiseed instanceof FUItem && magiseed.system instanceof ClassFeatureTypeDataModel && magiseed.system.data instanceof MagiseedDataModel;
	}

	async toggleActiveGarden(garden) {
		if (this.#isGarden(garden)) {
			if (this.garden === garden) {
				await this.parent.actor.update({
					'system.floralist.garden': null,
					'system.floralist.planted': null,
				});
			} else {
				await this.parent.actor.update({
					'system.floralist.garden': garden.uuid,
				});
			}
		} else {
			ui.notifications.error('Not a valid garden.');
			console.error('Not a valid garden.', garden);
		}
	}

	#isGarden(garden) {
		return garden instanceof FUItem && garden.system instanceof ClassFeatureTypeDataModel && garden.system.data instanceof GardenDataModel;
	}
}
