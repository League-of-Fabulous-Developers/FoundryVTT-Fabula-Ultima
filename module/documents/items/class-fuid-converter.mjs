import { SYSTEM } from '../../helpers/config.mjs';
import { Flags } from '../../helpers/flags.mjs';
import { CompendiumIndex } from '../../ui/compendium/compendium-index.mjs';

async function convertClassAttributeFromClassLists(item, classes) {
	let updates = {};
	let conversionResolved = true;

	const classAttribute = item.system?.class?.value;
	if (classAttribute) {
		const classNames = classAttribute.includes(',') ? classAttribute.split(',').map((v) => v.trim()) : [classAttribute];
		let fuids = [];
		for (const className of classNames) {
			// If the class attribute matches the slugified version, we can assume it's already the intended value
			const classNameSlug = game.projectfu.util.slugify(className);
			if (className === classNameSlug) {
				fuids.push(classNameSlug);
				continue;
			}

			// Search for a class with the same name or fuid and replace its class attribute
			if (classes) {
				// Search for a class with the same name or with a fuid that matches the slugified name. If found, set the skill's class attribute to match its fu-id
				const classFound = classes.find((classItem) => {
					return classItem.name === className || classItem.system?.fuid === classNameSlug;
				});
				if (classFound?.system?.fuid) {
					fuids.push(classFound.system.fuid);
					continue;
				}
			}

			// Class reference could not be resolved against any known class list. Skip the conversion flag
			// so the converter can retry on a later session when the matching class becomes available.
			conversionResolved = false;
		}

		if (fuids.length > 0) {
			let newClassAttribute = fuids[0];
			for (let i = 1; i < fuids.length; ++i) {
				newClassAttribute += ', ' + fuids[i];
			}
			updates['system.class.value'] = newClassAttribute;
			console.log(`Converted ${item.name} Class Attribute from ${classAttribute} to ${newClassAttribute}`);
		}
	}

	// Only mark the item as converted if every class reference resolved. Items that failed to
	// resolve (e.g., class compendium not yet loaded, or class not present in the world) keep the
	// flag unset so the converter can retry next time.
	if (conversionResolved) {
		updates.flags = {
			[SYSTEM]: {
				[Flags.ClassConverted]: true,
			},
		};
	}

	if (Object.keys(updates).length > 0) {
		await item.update(updates);
	}
}

async function convertActorItemsClassAttributes(actorSource) {
	const items = actorSource.items;
	const itemsToConvert = items.filter((item) => {
		return (item.type === 'skill' || item.type === 'spell' || item.type === 'heroic') && !item.flags?.projectfu?.classConverted;
	});

	if (itemsToConvert.length == 0) {
		return;
	}

	const actorClasses = items.filter((item) => {
		return item.type === 'class';
	});
	const worldClasses = game.items.filter((item) => {
		return item.type === 'class';
	});
	const compendiumClasses = await CompendiumIndex.instance.getClasses();
	const allClasses = actorClasses.concat(worldClasses, compendiumClasses.class);

	for (const itemToConvert of itemsToConvert) {
		await convertClassAttributeFromClassLists(itemToConvert, allClasses);
	}
}

async function convertGameItemsClassAttributes() {
	const itemsToConvert = game.items.filter((item) => {
		return (item.type === 'skill' || item.type === 'spell' || item.type === 'heroic') && !item.flags?.projectfu?.classConverted;
	});

	if (itemsToConvert.length == 0) {
		return;
	}

	const worldClasses = game.items.filter((item) => {
		return item.type === 'class';
	});
	const compendiumClasses = await CompendiumIndex.instance.getClasses();
	const allClasses = worldClasses.concat(compendiumClasses.class);

	for (const itemToConvert of itemsToConvert) {
		await convertClassAttributeFromClassLists(itemToConvert, allClasses);
	}
}

/**
 * Convert a single item's class attribute. Used by the createItem hook so that newly added
 * items get their class reference normalized immediately, rather than waiting for the next
 * world reload.
 * @param {Item} item The newly created item. Skipped if it's not a class-bearing type or
 *                    already has the conversion flag.
 */
async function convertSingleItem(item) {
	if (!item) return;
	if (item.type !== 'skill' && item.type !== 'spell' && item.type !== 'heroic') return;
	if (item.flags?.projectfu?.classConverted) return;

	// Collect class lookup sources: actor classes (if item belongs to an actor), world classes,
	// and compendium classes.
	const actorClasses = item.parent?.items?.filter((i) => i.type === 'class') ?? [];
	const worldClasses = game.items.filter((i) => i.type === 'class');
	const compendiumClasses = await CompendiumIndex.instance.getClasses();
	const allClasses = [...actorClasses, ...worldClasses, ...compendiumClasses.class];

	await convertClassAttributeFromClassLists(item, allClasses);
}

export class ClassFuidConverter {
	static run() {
		for (const actor of game.actors) {
			convertActorItemsClassAttributes(actor);
		}
		convertGameItemsClassAttributes();
	}

	/**
	 * Convert a single item. Safe to call from the createItem hook.
	 * @param {Item} item
	 */
	static convertItem(item) {
		return convertSingleItem(item);
	}
}
