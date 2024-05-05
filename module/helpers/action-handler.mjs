import { createChatMessage, promptCheck, promptOpenCheck } from './checks.mjs';
import { handleStudyTarget } from './study-roll.mjs';

export async function actionHandler(life, actionType, isShift) {
    const actor = life.actor;
    let action = '';

    switch (actionType) {
        case 'equipmentAction':
            action = 'equipment';
            if (!isShift) await createActionMessage(actor, action);
            break;
        case 'guardAction':
            action = 'guard';
            if (!isShift) await toggleGuardEffect(actor);
            break;
        case 'hinderAction':
            action = 'hinder';
            if (!isShift) {
                await promptCheck(actor, 'FU.Hinder');
                createActionMessage(actor, action);
            }
            break;
        case 'inventoryAction':
            action = 'inventory';
            if (!isShift) await createActionMessage(actor, action);
            break;
        case 'objectiveAction':
            action = 'objective';
            if (!isShift) await createActionMessage(actor, action);
            break;
        case 'spellAction':
            action = 'spell';
            if (!isShift) await createActionMessage(actor, action);
            break;
        case 'studyAction':
            action = 'study';
            if (!isShift) await handleStudyAction(actor);
            break;
        case 'skillAction':
            action = 'skill';
            if (!isShift) await createActionMessage(actor, action);
            break;
        default:
            action = 'default';
            break;
    }

    if (action !== 'default' && isShift) {
        createActionMessage(actor, action);
    }
}

/**
 * Handle the study action for a given actor
 * @param {FUActor} actor - The actor performing the study action
 */
async function handleStudyAction(actor) {
    const action = 'study';
    // Prompt the actor for a study roll and get the result
    const { rollResult } = await promptOpenCheck(actor, 'FU.StudyRoll', action);
    await handleStudyTarget(actor, rollResult);
    // TODO: Create Chat Message Button Study Target & Pass rollResult to handleStudyButton
}


export async function createActionMessage(actor, action) {
    const actionName = game.i18n.localize(CONFIG.FU.actionTypes[action] || action);
    const actionRule = game.i18n.localize(CONFIG.FU.actionRule[action] || action);

    let params = {
        details: {
            name: actionName,
        },
        description: actionRule,
        speaker: ChatMessage.getSpeaker({ actor: actor }),
    };

    // Call the createChatMessage function and await its completion
    await createChatMessage(params);
}

async function toggleGuardEffect(actor) {
    const GUARD_EFFECT_ID = 'guard';
    const guardEffect = CONFIG.statusEffects.find((effect) => effect.id === GUARD_EFFECT_ID);

    const guardActive = actor.effects.some((effect) => effect.statuses.has('guard'));

    if (guardActive) {
        // Delete existing guard effects
        actor.effects.filter((effect) => effect.statuses.has('guard')).forEach((effect) => effect.delete());
        ui.notifications.info('Guard is deactivated.');
    } else {
        // Create a new guard effect
        await ActiveEffect.create(guardEffect, { parent: actor });
        ui.notifications.info('Guard is activated.');
        createActionMessage(actor, 'guard');
    }
}