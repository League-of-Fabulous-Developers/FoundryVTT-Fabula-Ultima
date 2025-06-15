import { CollectionUtils } from '../../../helpers/collection-utils.mjs';

/**
 * @description Rolls a random behavior for the given actor and displays the result in a chat message.
 * @param {FUActorSheet} sheet
 * @returns {void}
 */
function rollBehavior(sheet) {
	const actor = sheet.actor;
	// Filter items in the actor's inventory to find behaviors
	const behaviors = actor.items.filter((item) => ['basic', 'weapon', 'shield', 'armor', 'accessory', 'spell', 'miscAbility', 'behavior'].includes(item.type) && item.system.isBehavior?.value);

	// Prepare an array to map behaviors with their weights
	const behaviorMap = [];

	// Populate the behaviorMap based on behavior weights
	behaviors.forEach((behavior) => {
		const weight = behavior.system.weight.value;
		const nameVal = behavior.name;
		const descVal = behavior.system.description;
		const idVal = behavior.id;

		for (let i = 0; i < weight; i++) {
			behaviorMap.push({
				name: nameVal,
				desc: descVal,
				id: idVal,
			});
		}
	});

	// Check if there are behaviors to choose from
	if (behaviorMap.length === 0) {
		console.error('No behavior selected.');
		return;
	}

	// Randomly select a behavior from the behaviorMap
	const randVal = Math.floor(Math.random() * behaviorMap.length);
	const selected = behaviorMap[randVal];

	// Get the item from the actor's items by id
	const item = actor.items.get(selected.id); // Use "this.actor" to access the actor's items

	if (item) {
		// Call the item's roll method
		item.roll();
	}

	// Call _targetPriority method passing the selected behavior
	targetPriority(selected);

	// Check if the selected behavior's type is "item"
	if (selected.type === 'item') {
		// Get the item from the actor's items by id
		const item = actor.items.get(selected.id);
		// Check if the item exists
		if (item) {
			// Return the result of item.roll()
			item._onRoll.bind(sheet);
		}
	}
}

function targetPriority(actor, selected = undefined) {
	// Get the array of targeted tokens
	let targetedTokens = Array.from(game.user.targets);

	// Define the content variable
	let content;

	// Extract the name of the selected behavior
	const behaviorName = selected ? selected.name : '';

	if (targetedTokens.length > 0) {
		// Map targeted tokens to numbered tokens with actor names
		const numberedTokens = targetedTokens.map((token, index) => `${index + 1} (${token.actor.name})`);

		// Shuffle the array of numbered tokens
		CollectionUtils.shuffleArray(numberedTokens);

		// Prepare the content for the chat message
		content = `<b>Actor:</b> ${actor.name}${behaviorName ? `<br /><b>Selected behavior:</b> ${behaviorName}` : ''}<br /><b>Target priority:</b> ${numberedTokens.join(' -> ')}`;
	} else {
		// Get the value of optionTargetPriority from game settings
		const settingValue = game.settings.get('projectfu', 'optionTargetPriority');

		// Prepare an array for target priority with a length equal to settingValue
		const targetArray = Array.from({ length: settingValue }, (_, index) => index + 1);

		// Shuffle the array of numbered tokens
		CollectionUtils.shuffleArray(targetArray);

		// Prepare the content for the chat message
		content = `<b>Actor:</b> ${actor.name}${behaviorName ? `<br /><b>Selected behavior:</b> ${behaviorName}` : ''}<br /><b>Target priority:</b> ${targetArray.join(' -> ')}`;
	}

	// Prepare chat data for displaying the message
	const chatData = {
		user: game.user._id,
		speaker: ChatMessage.getSpeaker(),
		whisper: game.user._id,
		content,
	};

	// Create a chat message with the chat data
	ChatMessage.create(chatData);
}

export const BehaviorRoll = Object.freeze({
	rollBehavior,
	targetPriority,
});
