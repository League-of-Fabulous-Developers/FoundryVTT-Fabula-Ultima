import { SYSTEM } from '../../helpers/config.mjs';
import { Flags } from '../../helpers/flags.mjs';
import { CompendiumIndex } from '../../ui/compendium/compendium-index.mjs';

async function convertClassAttributeFromClassLists(item, classes) {
	let updates = {
		flags: {
			[SYSTEM]: {
				[Flags.ClassConverted]: true,
			},
		},
	};

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

	item.update(updates);
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
	const worldClasses = game.items?.filter((item) => {
		return item.type === 'class';
	});
	const compendiumClasses = await CompendiumIndex.instance.getClasses();
	const allClasses = actorClasses.concat(worldClasses, compendiumClasses.class);

	for (const itemToConvert of itemsToConvert) {
		await convertClassAttributeFromClassLists(itemToConvert, allClasses);
	}
}

export class ClassFuidConverter {
	static run() {
		for (const actor of game.actors) {
			convertActorItemsClassAttributes(actor);
		}
	}
}
