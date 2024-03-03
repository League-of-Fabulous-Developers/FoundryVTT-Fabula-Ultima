export class FUActiveEffect extends ActiveEffect {
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
