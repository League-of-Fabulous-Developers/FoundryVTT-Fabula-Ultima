import { HoplosphereDataModel } from '../documents/items/hoplosphere/hoplosphere-data-model.mjs';
import { MnemosphereDataModel } from '../documents/items/mnemosphere/mnemosphere-data-model.mjs';

const technosphereTypes = ['mnemosphere', 'hoplosphere'];

/**
 * @typedef TechnosphereSlotInfo
 * @property {"mnemosphere", "hoplosphere"} type
 * @property {FUItem} item
 * @property {boolean} occupied
 * @property {boolean} overCapacity
 * @property {string} [tooltip]
 */

/**
 * @param {FUItem[]} slottedTechnospheres
 * @param {number} totalSlots the number of slots supported by the item
 * @param {number} maxMnemospheres the number of mnemospheres supported by the item
 * @return {TechnosphereSlotInfo[]}
 */
export const getTechnosphereSlotInfo = (slottedTechnospheres, totalSlots, maxMnemospheres) => {
	const items = slottedTechnospheres
		.filter((item) => technosphereTypes.includes(item.type))
		.sort((a, b) => {
			const aIdx = technosphereTypes.indexOf(a.type);
			const bIdx = technosphereTypes.indexOf(b.type);
			return aIdx - bIdx;
		});

	const slots = [];

	const usedSlots = items.reduce((previousValue, currentValue) => previousValue + (currentValue.system instanceof HoplosphereDataModel ? currentValue.system.requiredSlots : 1), 0);
	let unusedSlots = totalSlots;

	let unusedMnemosphereSlots = maxMnemospheres;
	const actualTotalSlots = Math.max(usedSlots, totalSlots);

	for (let itemIdx = 0, slotIdx = 0; slotIdx < actualTotalSlots; itemIdx++, slotIdx++, unusedSlots--) {
		const currentItem = items[itemIdx];
		const currentSlot = {
			item: currentItem,
			type: 'hoplosphere',
		};
		slots[slotIdx] = currentSlot;

		if (currentItem?.system instanceof MnemosphereDataModel) {
			currentSlot.overCapacity = slotIdx >= maxMnemospheres;
			currentSlot.type = 'mnemosphere';
			unusedMnemosphereSlots--;
		} else if (currentItem?.system instanceof HoplosphereDataModel) {
			currentSlot.overCapacity = slotIdx >= totalSlots;

			if (currentItem.system.requiredSlots === 2) {
				slotIdx++;
				const occupiedSlot = (slots[slotIdx] = {
					type: 'hoplosphere',
					occupied: true,
					overCapacity: slotIdx >= totalSlots,
				});
				currentSlot.overCapacity = occupiedSlot.overCapacity;
			}
		}

		if (unusedMnemosphereSlots > 0 && (!currentSlot.item || unusedSlots === unusedMnemosphereSlots)) {
			currentSlot.type = 'mnemosphere';
			unusedMnemosphereSlots--;
		}
	}

	for (let slot of slots) {
		if (slot.item) {
			const item = slot.item;

			if (item.type === 'hoplosphere') {
				const tooltipParts = [`${item.name} ${item.system.coagLevel > 1 ? `<i class='fas fa-droplet'></i>${item.system.coagLevel}` : ''}`];
				for (let effect of item.system.activeEffects) {
					tooltipParts.push(effect.summary);
				}
				slot.tooltip = tooltipParts.join('<br>');
			}

			if (item.type === 'mnemosphere') {
				const tooltipParts = [`${item.name} ${item.system.class?.trim() ? `(${item.system?.class})` : ''}`];
				for (let skill of item.system.activeSkills) {
					tooltipParts.push(`${skill.name} (${skill.system.level.value} / ${skill.system.level.value})`);
				}
				for (let heroic of item.system.heroics) {
					tooltipParts.push(heroic.name);
				}
				slot.tooltip = tooltipParts.join('<br>');
			}
		}
	}

	return slots;
};
