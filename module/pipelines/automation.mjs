import { AsyncHooks } from '../helpers/async-hooks.mjs';
import { FUHooks } from '../hooks.mjs';
import { SYSTEM } from '../helpers/config.mjs';
import { SETTINGS } from '../settings.js';
import { ResourcePipeline, ResourceRequest } from './resource-pipeline.mjs';
import { InlineSourceInfo } from '../helpers/inline-helper.mjs';

function initialize() {
	// Spend Resource
	AsyncHooks.on(
		FUHooks.EXPENSE_EVENT,
		/** @param {CalculateExpenseEvent} event **/ async (event) => {
			if (game.settings.get(SYSTEM, SETTINGS.automationSpendResource)) {
				const sourceInfo = InlineSourceInfo.fromInstance(event.source.actor, event.item);
				const request = new ResourceRequest(sourceInfo, [event.source.actor], event.expense.resource, -event.expense.amount);
				return ResourcePipeline.process(request);
			}
		},
	);
}

export const AutomationPipeline = Object.freeze({
	initialize,
});
