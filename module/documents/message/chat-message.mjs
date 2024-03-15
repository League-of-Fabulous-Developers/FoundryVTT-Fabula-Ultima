import { InlineDamage } from '../../helpers/inline-damage.mjs';
import { InlineRecovery } from '../../helpers/inline-recovery.mjs';

export class FUChatMessage extends ChatMessage {
	async getHTML() {
		const html = await super.getHTML();

		InlineDamage.activateListeners(html, this);
		InlineRecovery.activateListeners(html, this);

		return html;
	}
}
