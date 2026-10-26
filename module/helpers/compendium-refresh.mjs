import { SYSTEM } from './config.mjs';

/**
 * @param {CompendiumCollection} pack
 * @param {boolean} force
 */
async function refreshPack(pack, force = false) {
	console.log(`Refreshing Compendium Pack data: ${pack.collection}`);
	let cleanup = async () => {};
	if (force && pack.config.locked) {
		console.log(`Unlocking ${pack.collection}`);
		await pack.configure({ locked: false });
		cleanup = () => {
			console.log(`Locking ${pack.collection}`);
			pack.configure({ locked: true });
		};
	}

	const documents = await pack.getDocuments();
	const docClass = pack.documentClass;
	await docClass.deleteDocuments(
		documents.map((d) => d._id),
		{ pack: pack.collection },
	);
	documents.forEach((d) => d.updateSource({}));
	const updatedDocs = await docClass.createDocuments(documents, { pack: pack.collection, keepId: true, keepEmbeddedIds: true });
	// clean ownership data
	await docClass.updateDocuments(
		updatedDocs.map((d) => ({
			_id: d._id,
			ownership: foundry.data.operators.ForcedReplacement.create({ default: d.ownership.default }),
		})),
		{ pack: pack.collection },
	);
	console.log(`Refreshed ${updatedDocs.length} documents in ${pack.collection}`);

	await cleanup();
}

export async function refreshCompendiumData(force = false) {
	for (let [key, pack] of game.packs.entries()) {
		if (key.startsWith(SYSTEM + '.') && (!pack.config.locked || force)) {
			await refreshPack(pack, force);
		}
	}
}
