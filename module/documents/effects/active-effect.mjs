export class FUActiveEffect extends ActiveEffect {
	async _preCreate(data, options, user) {
		this.updateSource({ name: game.i18n.localize(data.name) });
		return super._preCreate(data, options, user);
	}

	apply(actor, change) {
		if (change.value.startsWith('@system.')) {
			const path = change.value.substring(8);
			const property = foundry.utils.getProperty(this.parent.system, path);
			console.debug('Substituting change variable:', change.value, property);
			change.value = String(property);
		}

		return super.apply(actor, change);
	}
}
