/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function () {
	return loadTemplates([
		// Actor Section partials.
		'systems/projectfu/templates/actor/sections/actor-section-classes.hbs',
		'systems/projectfu/templates/actor/sections/actor-section-features.hbs',
		'systems/projectfu/templates/actor/sections/actor-section-spells.hbs',
		'systems/projectfu/templates/actor/sections/actor-section-items.hbs',
		'systems/projectfu/templates/actor/sections/actor-section-combat.hbs',
		'systems/projectfu/templates/actor/sections/actor-section-behavior.hbs',
		'systems/projectfu/templates/actor/sections/actor-section-settings.hbs',

		// Actor Component partials.
		'systems/projectfu/templates/actor/partials/actor-charname.hbs',
		'systems/projectfu/templates/actor/partials/actor-point-bars.hbs',
		'systems/projectfu/templates/actor/partials/actor-defensive.hbs',
		'systems/projectfu/templates/actor/partials/actor-creatures.hbs',
		'systems/projectfu/templates/actor/partials/actor-defensive.hbs',
		'systems/projectfu/templates/actor/partials/actor-equipment-slots.hbs',
		'systems/projectfu/templates/actor/partials/actor-study.hbs',
		'systems/projectfu/templates/actor/partials/actor-affinities.hbs',
		'systems/projectfu/templates/actor/partials/actor-attributes.hbs',
		'systems/projectfu/templates/actor/partials/actor-defensive.hbs',
		'systems/projectfu/templates/actor/partials/actor-header.hbs',
		'systems/projectfu/templates/actor/partials/actor-resources.hbs',
		'systems/projectfu/templates/actor/partials/actor-resource-points.hbs',
		'systems/projectfu/templates/actor/partials/actor-traits.hbs',

		'systems/projectfu/templates/actor/partials/actor-item-name.hbs',
		'systems/projectfu/templates/actor/partials/actor-actions.hbs',
		'systems/projectfu/templates/actor/partials/actor-clocks.hbs',
		'systems/projectfu/templates/actor/partials/actor-npc-items.hbs',
		'systems/projectfu/templates/actor/partials/actor-npc-skills.hbs',
		'systems/projectfu/templates/actor/partials/actor-favorite.hbs',
		'systems/projectfu/templates/actor/partials/actor-bonds.hbs',

		'systems/projectfu/templates/actor/partials/actor-divider.hbs',
		'systems/projectfu/templates/actor/partials/actor-equip.hbs',
		'systems/projectfu/templates/actor/partials/actor-control.hbs',
		'systems/projectfu/templates/actor/partials/actor-progress-clock.hbs',
		'systems/projectfu/templates/actor/partials/actor-progress-clock-xl.hbs',

		// Item partials
		'systems/projectfu/templates/item/partials/item-progress-clock.hbs',
		'systems/projectfu/templates/item/partials/item-resource-points.hbs',
		'systems/projectfu/templates/item/partials/item-controls.hbs',
		'systems/projectfu/templates/item/partials/item-header.hbs',
		'systems/projectfu/templates/item/partials/item-weapon-header.hbs',
		'systems/projectfu/templates/item/partials/item-defense-header.hbs',
		'systems/projectfu/templates/item/partials/item-spell-header.hbs',
		'systems/projectfu/templates/item/partials/item-class-header.hbs',
		'systems/projectfu/templates/item/partials/item-skill-header.hbs',
		'systems/projectfu/templates/item/partials/item-heroic-header.hbs',
		'systems/projectfu/templates/item/partials/item-progress-header.hbs',
		'systems/projectfu/templates/item/partials/item-behavior-field.hbs',

		// Common partials
		'systems/projectfu/templates/common/active-effects.hbs',

		// Dialogs
		'systems/projectfu/templates/dialog/dialog-check.hbs',
		'systems/projectfu/templates/dialog/dialog-check-push.hbs',
		'systems/projectfu/templates/dialog/dialog-check-reroll.hbs',
		'systems/projectfu/templates/dialog/dialog_first_turn.hbs',
		'systems/projectfu/templates/dialog/dialog-group-check.hbs',
		'systems/projectfu/templates/dialog/dialog-group-check-cancel.hbs',

		// Chat Messages
		'systems/projectfu/templates/chat/chat-check.hbs',
		'systems/projectfu/templates/chat/chat-check-flavor-check.hbs',
		'systems/projectfu/templates/chat/chat-check-flavor-item.hbs',
		'systems/projectfu/templates/chat/chat-group-check-initiated.hbs',

		// Chat Message Partials
		'systems/projectfu/templates/chat/partials/chat-accuracy-check.hbs',
		'systems/projectfu/templates/chat/partials/chat-damage.hbs',
		'systems/projectfu/templates/chat/partials/chat-default-check.hbs',
		'systems/projectfu/templates/chat/partials/chat-item-description.hbs',
		'systems/projectfu/templates/chat/partials/chat-item-quality.hbs',
		'systems/projectfu/templates/chat/partials/chat-spell-details.hbs',
		'systems/projectfu/templates/chat/partials/chat-weapon-details.hbs',
		'systems/projectfu/templates/chat/partials/chat-check-push.hbs',
		'systems/projectfu/templates/chat/partials/chat-check-reroll.hbs',
		'systems/projectfu/templates/chat/partials/chat-basic-attack-details.hbs',
		'systems/projectfu/templates/chat/partials/chat-check-details.hbs',
		'systems/projectfu/templates/chat/partials/chat-ability-details.hbs',
		'systems/projectfu/templates/chat/partials/chat-item-opportunity.hbs',
		'systems/projectfu/templates/chat/partials/chat-check-result.hbs',

		// UI Components
		'systems/projectfu/templates/ui/combat-tracker.hbs',

		// Applications
		'systems/projectfu/templates/app/app-group-check.hbs',

		// Class Feature Templates
		'systems/projectfu/templates/feature/feature-basic-preview.hbs',

		'systems/projectfu/templates/feature/arcanist/feature-arcanum-sheet.hbs',
		'systems/projectfu/templates/feature/arcanist/feature-arcanum-preview.hbs',

		'systems/projectfu/templates/feature/tinkerer/feature-gadgets-preview.hbs',
		'systems/projectfu/templates/feature/tinkerer/feature-alchemy-sheet.hbs',
		'systems/projectfu/templates/feature/tinkerer/feature-magitech-sheet.hbs',
		'systems/projectfu/templates/feature/tinkerer/feature-infusions-sheet.hbs',

		'systems/projectfu/templates/feature/chanter/feature-key-sheet.hbs',
		'systems/projectfu/templates/feature/chanter/feature-key-preview.hbs',
		'systems/projectfu/templates/feature/chanter/feature-tone-sheet.hbs',
		'systems/projectfu/templates/feature/chanter/feature-verse-sheet.hbs',
		'systems/projectfu/templates/feature/chanter/feature-verse-preview.hbs',

		'systems/projectfu/templates/feature/dancer/feature-dance-sheet.hbs',

		'systems/projectfu/templates/feature/symbolist/feature-symbol-sheet.hbs',
	]);
};