import { FUTableRenderer } from './table-renderer.mjs';

export class TradableTableRenderer extends FUTableRenderer {
	/**
	 * @returns {{hideFavorite: (function(*): boolean), hideShare: (function(*): boolean), hideSell: (function(*): boolean), hideLoot: (function(*): boolean)}}
	 */
	static getCellOptions() {
		return {
			hideFavorite: (item) => !item.actor.isCharacterType,
			hideShare: (item) => {
				if (!game.user.isGM) {
					return true;
				}
				return item.actor.type !== 'party';
			},
			hideSell: (item) => {
				if (item.actor.type !== 'stash') {
					return true;
				}
				return !item.actor.system.merchant;
			},
			hideLoot: (item) => {
				if (item.actor.type === 'stash') {
					return !!item.actor.system.merchant;
				} else if (item.actor.type === 'party') {
					return game.user.isGM;
				}
				return false;
			},
		};
	}
}
