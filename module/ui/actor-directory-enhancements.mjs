import { FU } from '../helpers/config.mjs';

class EnhancedActorDirectory extends foundry.applications.sidebar.tabs.ActorDirectory {
	static DEFAULT_OPTIONS = {
		renderUpdateKeys: ['system.level.value', 'system.species.value', 'system.rank.value', 'system.rank.replacedSoldiers', 'system.references.actor', 'system.resources.identity.name', 'system.merchant'],
	};

	#infoTextsForType = {
		character: this.#characterInfoText.bind(this),
		npc: this.#npcInfoText.bind(this),
		stash: this.#stashInfoText.bind(this),
	};

	async _onRender(context, options) {
		await super._onRender(context, options);
		this.element.querySelectorAll('.directory-item[data-entry-id] a.entry-name').forEach((element) => {
			const actor = game.actors.get(element.closest('[data-entry-id]').dataset.entryId);
			const oldInnerHtml = element.innerHTML;
			const wrapper = document.createElement('div');
			wrapper.style.lineHeight = 'normal';

			const nameDiv = document.createElement('div');
			nameDiv.innerHTML = oldInnerHtml;
			element.innerHTML = '';
			wrapper.appendChild(nameDiv);

			const infoDiv = document.createElement('div');
			infoDiv.style.fontSize = 'smaller';
			infoDiv.style.fontWeight = 'lighter';
			const getInfoText = this.#infoTextsForType[actor.type];
			if (getInfoText) {
				infoDiv.innerText = getInfoText(actor);
			} else {
				infoDiv.innerText = _loc(CONFIG.Actor.typeLabels[actor.type]);
			}
			wrapper.appendChild(infoDiv);

			element.appendChild(wrapper);
		});
	}

	#npcInfoText(actor) {
		if (actor.system.rank.value === 'companion') {
			const companionOwner = actor.system.references.actor;
			const ownerText = companionOwner ? ` (${companionOwner.name})` : '';
			const species = _loc(FU.species[actor.system.species.value]);
			const rank = _loc('FU.Companion');
			return `${species} ${rank}${ownerText}`;
		} else {
			const userLevel = actor.getUserLevel();
			if (userLevel > CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED) {
				const level = actor.system.level.value;
				const species = _loc(FU.species[actor.system.species.value]);
				const rank = _loc(FU.rank[actor.system.rank.value]);
				const rankSuffix = actor.system.rank.value !== 'champion' ? '' : `(${actor.system.rank.replacedSoldiers})`;
				return `${_loc('FU.Level')} ${level} ${species} ${rank}${rankSuffix}`;
			} else {
				return _loc('FU.NonPlayerCharacterAbbr');
			}
		}
	}

	#characterInfoText(actor) {
		return actor.system.resources.identity.name || _loc('FU.Character');
	}

	#stashInfoText(actor) {
		if (actor.system.merchant) {
			return _loc('FU.Merchant');
		} else {
			return _loc('TYPES.Actor.stash');
		}
	}
}

export const ActorDirectoryEnhancements = {
	initialize: () => {
		CONFIG.ui.actors = EnhancedActorDirectory;
	},
};
