import { FUTableRenderer } from './table-renderer.mjs';
import { CommonDescriptions } from './common-descriptions.mjs';
import { CommonColumns } from './common-columns.mjs';
import { systemTemplatePath } from '../system-utils.mjs';
import { FU } from '../config.mjs';

export class BasicAttacksTableRenderer extends FUTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'basic-attacks-table',
		getItems: (d) => d.itemTypes.basic,
		renderDescription: CommonDescriptions.simpleDescription(),
		columns: {
			name: CommonColumns.itemNameColumn({
				columnName: 'FU.BasicAttacks',
				cssClass: (item) => (item.system.type.value === 'melee' ? 'before-melee-icon' : 'before-ranged-icon'),
				renderCaption: BasicAttacksTableRenderer.#renderCaption,
			}),
			check: CommonColumns.checkColumn({ columnLabel: 'FU.Attack', getCheck: BasicAttacksTableRenderer.#getCheck }),
			damage: CommonColumns.damageColumn({ columnLabel: 'FU.Damage', getDamage: BasicAttacksTableRenderer.#getDamage }),
			controls: CommonColumns.itemControlsColumn({ label: 'FU.BasicAttack', type: 'basic' }),
		},
	};

	static #renderCaption(item) {
		const data = {
			type: FU.weaponTypes[item.system.type.value],
			defense: FU.defenses[item.system.defense].abbr,
		};

		return foundry.applications.handlebars.renderTemplate(systemTemplatePath('table/caption/caption-basic-attack'), data);
	}

	static #getCheck(item) {
		return {
			primary: item.system.attributes.primary.value,
			secondary: item.system.attributes.secondary.value,
			bonus: item.system.accuracy.value,
		};
	}

	static #getDamage(item) {
		return {
			damage: item.system.damage.value,
			type: item.system.damageType.value,
			hrZero: item.system.rollInfo.useWeapon.hrZero.value,
		};
	}
}
