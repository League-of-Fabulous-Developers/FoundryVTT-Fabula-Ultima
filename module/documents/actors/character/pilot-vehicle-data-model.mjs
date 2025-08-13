import { FUItem } from '../../items/item.mjs';
import { FUActor } from '../actor.mjs';
import { ClassFeatureTypeDataModel } from '../../items/classFeature/class-feature-type-data-model.mjs';
import { VehicleDataModel } from '../../items/classFeature/pilot/vehicle-data-model.mjs';
import { WeaponModuleDataModel } from '../../items/classFeature/pilot/weapon-module-data-model.mjs';
import { ArmorModuleDataModel } from '../../items/classFeature/pilot/armor-module-data-model.mjs';
import { SupportModuleDataModel } from '../../items/classFeature/pilot/support-module-data-model.mjs';
import { LocallyEmbeddedDocumentField } from '../../../fields/locally-embedded-document-field.mjs';

/**
 * @property {FUItem | null} vehicle
 * @property {boolean} embarked
 * @property {FUItem[]} weapons
 * @property {FUItem | null} armor
 * @property {FUItem[]} supports
 */
export class PilotVehicleDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { ArrayField, BooleanField } = foundry.data.fields;
		return {
			vehicle: new LocallyEmbeddedDocumentField(FUItem, FUActor, {
				validate: (doc) => doc.system instanceof ClassFeatureTypeDataModel && doc.system.data instanceof VehicleDataModel,
			}),
			embarked: new BooleanField({ initial: false }),
			weapons: new ArrayField(
				new LocallyEmbeddedDocumentField(FUItem, FUActor, {
					validate: (doc) => doc.system instanceof ClassFeatureTypeDataModel && doc.system.data instanceof WeaponModuleDataModel,
				}),
				{},
			),
			armor: new LocallyEmbeddedDocumentField(FUItem, FUActor, {
				validate: (doc) => doc.system instanceof ClassFeatureTypeDataModel && doc.system.data instanceof ArmorModuleDataModel,
			}),
			supports: new ArrayField(
				new LocallyEmbeddedDocumentField(FUItem, FUActor, {
					validate: (doc) => doc.system instanceof ClassFeatureTypeDataModel && doc.system.data instanceof SupportModuleDataModel,
				}),
				{},
			),
		};
	}

	prepareData() {
		this.weapons = this.weapons.map((value) => (value instanceof Function ? value() : value)).filter((value) => !!value);
		this.supports = this.supports.map((value) => (value instanceof Function ? value() : value)).filter((value) => !!value);
	}

	get usedSlots() {
		const weaponSlots = this.weapons.length;
		const armorSlots = this.armor ? 1 : 0;
		const supportSlots = this.supports.map((value) => (value.system.data.complex ? 2 : 1)).reduce((agg, val) => agg + val, 0);

		return weaponSlots + armorSlots + supportSlots;
	}

	get weaponsActive() {
		return this.embarked && !!this.weapons.length;
	}

	get armorActive() {
		return this.embarked && !!this.armor;
	}

	updateActiveVehicle(vehicle) {
		if (vehicle && vehicle.system.data instanceof VehicleDataModel) {
			if (this.vehicle === vehicle) {
				vehicle = null;
			}
			if (vehicle) {
				return this.updateSource(
					{
						vehicle: vehicle,
					},
					{ dryRun: true },
				);
			} else {
				return this.updateSource(
					{
						vehicle: null,
						embarked: false,
						weapons: [],
						armor: null,
						supports: [],
					},
					{ dryRun: true },
				);
			}
		}
		return {};
	}

	updateEmbarked() {
		if (this.vehicle) {
			return this.updateSource(
				{
					embarked: !this.embarked,
				},
				{ dryRun: true },
			);
		}
		return {};
	}

	updateActiveArmorModule(armor) {
		if (this.vehicle && armor && armor.system.data instanceof ArmorModuleDataModel) {
			if (this.armor === armor) {
				armor = null;
			}
			return this.updateSource(
				{
					armor: armor,
				},
				{ dryRun: true },
			);
		}
		return {};
	}

	updateActiveWeaponModules(weapon) {
		if (this.vehicle && weapon && weapon.system.data instanceof WeaponModuleDataModel) {
			if (this.weapons.includes(weapon)) {
				return this.updateSource(
					{
						weapons: this.weapons.filter((item) => item !== weapon),
					},
					{ dryRun: true },
				);
			} else {
				const complexWeapon = weapon.system.data.complex;
				const complexWeaponEquipped = this.weapons.some((value) => value.system.data.complex);

				let newEquippedWeapons;
				if (complexWeapon || complexWeaponEquipped) {
					newEquippedWeapons = [weapon];
				} else {
					const maxActive = this.vehicle.system.data.weaponSlots;
					newEquippedWeapons = [...this.weapons, weapon].slice(-maxActive).sort((a, b) => a.system.data.isShield - b.system.data.isShield);
				}

				return this.updateSource(
					{
						weapons: newEquippedWeapons,
					},
					{ dryRun: true },
				);
			}
		}
		return {};
	}

	updateActiveSupportModules(support) {
		if (this.vehicle && support && support.system.data instanceof SupportModuleDataModel) {
			let equipped = [...this.supports];
			if (equipped.includes(support)) {
				equipped = equipped.filter((value) => value !== support);
			} else {
				equipped = [support, ...equipped];
			}
			return this.updateSource(
				{
					supports: equipped,
				},
				{ dryRun: true },
			);
		}
		return {};
	}
}
