import { FU } from './config.mjs';
import { FUHooks } from '../hooks.mjs';

/**
 * Handle the study roll interaction with targeted actors
 * @param {DocumentSheet} app - The rendered NPC sheet
 * @param {number} rollResult - The result of the study roll
 */
export async function handleStudyTarget(app, studyValue) {
	// Get all currently targeted tokens
	let targets = Array.from(game.user.targets);

	if (targets.length === 0) {
		ui.notifications.error('You must target at least one actor to study.');
		return;
	}

	// Iterate over each targeted token
	for (const target of targets) {
		const actor = target.actor;

		if (!actor) {
			ui.notifications.error('One of the targeted tokens does not have an associated actor.');
			return;
		}

		// // Call handleStudyRoll with the targeted actor bound to it, passing the rollResult
		// await handleStudyRoll.bind({ actor: actor })(app, rollResult);
		// Call handleStudyRollCallback directly
		await handleStudyRollCallback(app, actor, studyValue);
	}
}

/**
 * Handle the study roll interaction
 * @param {DocumentSheet} app - The rendered NPC sheet
 */
export async function handleStudyRoll(app) {
	const useRevisedStudyRule = game.settings.get('projectfu', 'useRevisedStudyRule');
	const difficultyThresholds = useRevisedStudyRule ? FU.studyRoll.revised : FU.studyRoll.core;

	const submit = game.i18n.localize(`FU.Submit`);

	const dataTitleResult = game.i18n.localize(`FU.StudyTitleResult`);
	const dataTitle = game.i18n.localize(`FU.StudyTitle`);
	const data1 = game.i18n.localize(`FU.StudyResultOne`);
	const data2 = game.i18n.localize(`FU.StudyResultTwo`);
	const data3 = game.i18n.localize(`FU.StudyResultThree`);
	const dataResult = game.i18n.localize(`FU.StudyTotalField`);

	const contentRows = [`<tr><td>${difficultyThresholds[0]}+</td><td>${data1}</td></tr>`, `<tr><td>${difficultyThresholds[1]}+</td><td>${data2}</td></tr>`, `<tr><td>${difficultyThresholds[2]}+</td><td>${data3}</td></tr>`];

	const dialogContent = `
        <div class="desc mb-5">
            <table>
                <tr><th>${dataTitleResult}</th><th>${dataTitle}</th></tr>
                ${contentRows.map((row) => `<tr><td>${row}</td></tr>`).join('')}
            </table>
        </div>
        <div class="desc">
            <p>${dataResult}</p>
            <input type="number" id="study-input">
        </div>
        <hr>`;

	const dialog = new Dialog(
		{
			title: game.i18n.localize(`FU.StudyRoll`),
			content: dialogContent,
			buttons: {
				ok: {
					label: submit,
					callback: async (html) => {
						const studyValue = parseInt(html.find('#study-input').val());
						const actor = this.actor;
						handleStudyRollCallback(app, actor, studyValue);
					},
				},

				cancel: { label: game.i18n.localize(`FU.Cancel`) },
			},
			default: 'ok',
		},
		{
			classes: ['projectfu', 'unique-dialog', 'backgroundstyle'],
		},
	);

	dialog.render(true);
}

async function handleStudyRollCallback(app, actor, studyValue) {
	const coreRule = [10, 13, 16];
	const revisedRule = [7, 10, 13];
	const useRevisedStudyRule = game.settings.get('projectfu', 'useRevisedStudyRule');
	const difficultyThresholds = useRevisedStudyRule ? revisedRule : coreRule;
	const optionStudySavePath = game.settings.get('projectfu', 'optionStudySavePath');
	const update = game.i18n.localize(`FU.StudyJournalUpdate`);
	const update2 = game.i18n.localize(`FU.StudyJournalUpdate2`);
	let difficulty;
	let replacement = false;
	const existingJournal = game.journal.getName(actor.name);
	if (existingJournal) {
		replacement = true;
		existingJournal.delete();
	}

	if (studyValue >= difficultyThresholds[0] && studyValue < difficultyThresholds[1]) difficulty = 'Basic';
	else if (studyValue >= difficultyThresholds[1] && studyValue < difficultyThresholds[2]) difficulty = 'Normal';
	else if (studyValue >= difficultyThresholds[2]) difficulty = 'Hard';
	else difficulty = 'Failed';

	const headerStyle = `background: linear-gradient(to right, #532853, #bfb8c4);border-color: #c1b7c7;display: flex;align-items: center;padding: 2px;border-right: groove #ffffff 3px;padding-left: 16px;padding-right: 16px;`;
	const headerText = `font-family: Antonio;font-weight: bold;font-size: 1.25rem;font-variant: small-caps;color: #ffffff;text-shadow: 2px 1px 1px black;`;
	const divideText = `border-bottom: 1px solid #c1b7c7; border-image: linear-gradient(45deg, #532853, #bfb8c4) 1;`;
	const attrBoxStyle = `background-color: rgb(239, 236, 245); border-right: 1px solid rgb(255, 255, 255);`;

	function makeTable(actorData, difficulty) {
		let tableData = '';

		function addBasicInfo() {
			const { system } = actorData;
			if (!(system && system.level && system.species && system.resources)) {
				console.error('Basic Info Error: Some properties are undefined.');
				return '';
			}

			return `<div class="basic-info resource-content">
            <div class="resource-label-l grid grid-7col flex-group-center ${divideText}" style="padding: 5px;">
                <label>${game.i18n.localize(`FU.LevelAbbr`)} ${system.level.value}</label>
                <span class="diamond-symbol" style="color: #532853;">⬥</span>
                <label>${game.i18n.localize(`FU.${system.species.value.charAt(0).toUpperCase()}${system.species.value.slice(1)}`)}</label>
                <span class="diamond-symbol" style="color: #532853;">⬥</span>
                <label>${system.resources.hp.max} <span style="color: #cd1619;">${game.i18n.localize(`FU.HealthAbbr`)}</span></label>
                <span class="diamond-symbol" style="color: #532853;">⬥</span>
                <label>${system.resources.mp.max} <span style="color: #009ee3;">${game.i18n.localize(`FU.MindAbbr`)}</span></label>
                </div>
            </div>`;
		}

		function addNormalInfo() {
			const { system } = actorData;
			if (!(system && system.traits && system.attributes && system.derived)) return console.log('Normal Info Error: Some properties are undefined.');
			const affinityMap = {
				'-1': game.i18n.localize(`FU.AffinityVulnerableAbbr`),
				0: '-',
				1: game.i18n.localize(`FU.AffinityResistanceAbbr`),
				2: game.i18n.localize(`FU.AffinityImmuneAbbr`),
				3: game.i18n.localize(`FU.AffinityAbsorptionAbbr`),
			};
			const affinityNameMap = {
				physical: game.i18n.localize(`FU.DamagePhysical`),
				air: game.i18n.localize(`FU.DamageWind`),
				bolt: game.i18n.localize(`FU.DamageLightning`),
				dark: game.i18n.localize(`FU.DamageDark`),
				earth: game.i18n.localize(`FU.DamageEarth`),
				fire: game.i18n.localize(`FU.DamageFire`),
				ice: game.i18n.localize(`FU.DamageIce`),
				light: game.i18n.localize(`FU.DamageLight`),
				poison: game.i18n.localize(`FU.DamagePoison`),
			};
			const affinityIconMap = { physical: 'fua fu-phys', air: 'fua fu-wind', bolt: 'fua fu-bolt', dark: 'fua fu-dark', earth: 'fua fu-earth', fire: 'fua fu-fire', ice: 'fua fu-ice', light: 'fua fu-light', poison: 'fua fu-poison' };

			let affinitiesDisplay = '';
			if (system.affinities) {
				affinitiesDisplay = `<div class="affinities resource-content flex-group-center grid grid-9col" style="display: flex; justify-content: space-between; padding: 0 8px;">
                ${Object.entries(system.affinities)
					.map(([affinity, values]) => {
						const acronymValue = affinityMap[values.current] || values.current;
						const fullName = affinityNameMap[affinity] || affinity;
						const iconClass = affinityIconMap[affinity] || '';
						const opacity = values.current === 0 ? '0.25' : '1';
						return `<div class="affinity resource-content flex-group-center" style="opacity: ${opacity}; display: flex; justify-content: space-between; margin: 2px; gap: 5px; line-height: 1;">
                            <i class="${iconClass}"></i>
                            <label class="resource-label-xl" style="cursor: pointer;" data-tooltip="${fullName}: ${acronymValue}">
                                ${acronymValue}
                            </label>
                        </div>`;
					})
					.join('')}
            </div>`;
			}

			return `<div class="normal-info">
            <div class="flex-group-center resource-content" style="line-height: 1.68;">
                <div class="flexrow ${divideText}">
                    <div class="resource-label-m grid grid-4col flex-group-center">
                        <label style="${attrBoxStyle}">${game.i18n.localize(`FU.AttributeDexAbbr`)} d${system.attributes.dex.base}</label>
                        <label style="${attrBoxStyle}">${game.i18n.localize(`FU.AttributeInsAbbr`)} d${system.attributes.ins.base}</label>
                        <label style="${attrBoxStyle}">${game.i18n.localize(`FU.AttributeMigAbbr`)} d${system.attributes.mig.base}</label>
                        <label style="${attrBoxStyle}">${game.i18n.localize(`FU.AttributeWlpAbbr`)} d${system.attributes.wlp.base}</label>
                    </div>
                    
                    <div class="resource-label-m grid grid-3col flex-group-center">
                        <div style="${attrBoxStyle}">${game.i18n.localize(`FU.DefenseAbbr`)} ${system.derived.def.value}</div>
                        <div style="${attrBoxStyle}">${game.i18n.localize(`FU.MagicDefenseAbbr`)} ${system.derived.mdef.value}</div>
                        <div style="${attrBoxStyle}">${game.i18n.localize(`FU.InitiativeAbbr`).toUpperCase()} ${system.derived.init.value}</div>
                    </div>
                </div>
                
                <li class="flex-group-center grid grid-6col ${divideText}">
                    <label class="resource-label-m">${game.i18n.localize(`FU.Traits`)}</label>
                    <div class="grid-span-5">${system.traits.value}</div>
                </li>

                ${affinitiesDisplay}
            </div>
        </div>`;
		}

		function addHardInfo() {
			const { items } = actorData;
			if (!items) {
				console.error('Hard Info Error: Items are undefined.');
				return '';
			}

			const filteredItems = items.filter((item) => ['basic', 'weapon'].includes(item.type));
			let basicItems = '';
			let weaponItems = '';

			filteredItems.forEach((item) => {
				const name = item.name;
				const damage = item.system.damage?.value ? `【${game.i18n.localize(`FU.HighRollAbbr`)} + ${item.system.damage.value}】` : '';
				const damageType = item.system.damageType?.value ? `<strong>${game.i18n.localize(`FU.Damage${item.system.damageType.value.charAt(0).toUpperCase()}${item.system.damageType.value.slice(1).toLowerCase()}`)}</strong>` : '-';
				const primaryAttribute = item.system.attributes?.primary?.value.toUpperCase();
				const secondaryAttribute = item.system.attributes?.secondary?.value.toUpperCase();
				const attributesDisplay =
					primaryAttribute && secondaryAttribute
						? `【${game.i18n.localize(`FU.Attribute${primaryAttribute.charAt(0).toUpperCase()}${primaryAttribute.slice(1).toLowerCase()}Abbr`)} + ${game.i18n.localize(`FU.Attribute${secondaryAttribute.charAt(0).toUpperCase()}${secondaryAttribute.slice(1).toLowerCase()}Abbr`)}】`
						: '';
				const accuracy = item.system.accuracy?.value ? `${attributesDisplay}+ ${item.system.accuracy.value}` : attributesDisplay;
				const description = item.system.description || '';
				const qualText = item.system.quality?.value || '';
				const opporText = item.system?.opportunity || '';

				const itemRow = `<tr>
                <td><strong>${name}</strong></td>
                <td><strong>${accuracy}</strong></td>
                <td><strong>${damage}</strong></td>
                <td>${damageType}</td>
                <td>${description}</td>
                <td>${qualText} ${opporText}</td>
                </tr>`;

				if (item.type === 'basic') basicItems += itemRow;
				else if (item.type === 'weapon') weaponItems += itemRow;
				else if (item.type === 'spell') spellItems += itemRow;
			});

			const spells = items.filter((item) => item.type === 'spell');
			let spellItems = '';
			spells.forEach((item) => {
				const name = item.name;
				const damage = item.system.rollInfo.damage?.value ? `【${game.i18n.localize(`FU.HighRollAbbr`)} + ${item.system.rollInfo.damage.value}】` : '';
				const damageType = damage ? `<strong>${game.i18n.localize(`FU.Damage${item.system.rollInfo.damage.type.value.toLowerCase().capitalize()}`)}</strong>` : '-';
				const primaryAttribute = item.system.rollInfo.attributes?.primary?.value.toUpperCase();
				const secondaryAttribute = item.system.rollInfo.attributes?.secondary?.value.toUpperCase();
				const attributesDisplay =
					primaryAttribute && secondaryAttribute
						? `【${game.i18n.localize(`FU.Attribute${primaryAttribute.toLowerCase().capitalize()}Abbr`)} + ${game.i18n.localize(`FU.Attribute${secondaryAttribute.toLowerCase().capitalize()}Abbr`)}】`
						: '';
				const accuracy = item.system.rollInfo.accuracy?.value ? `${attributesDisplay}+ ${item.system.accuracy.value}` : attributesDisplay;
				const description = item.system.description || '';
				const qualText = item.system.quality?.value || '';
				const opporText = item.system?.opportunity || '';

				const itemRow = `<tr>
                <td><strong>${name}</strong></td>
                <td><strong>${accuracy}</strong></td>
                <td><strong>${damage}</strong></td>
                <td>${damageType}</td>
                <td>${description}</td>
                <td>${qualText} ${opporText}</td>
                </tr>`;

				spellItems += itemRow;
			});

			return `<div class="hard-info">
            <div class="sheet-details">
                ${
					basicItems
						? `
                    <div style="${headerStyle}">
                        <span style="${headerText}">
                            <strong>${game.i18n.localize(`FU.BasicAttacks`)}</strong>
                        </span>
                    </div>
                    <div class="basic-content">
                        <table>
                            <thead>
                            <tr>
                                <th style="text-align: left;">${game.i18n.localize(`FU.Name`)}</th>
                                <th style="text-align: center;">${game.i18n.localize(`FU.Accuracy`)}</th>
                                <th style="text-align: center;">${game.i18n.localize(`FU.Damage`)}</th>
                                <th style="text-align: center;">${game.i18n.localize(`FU.DamageType`)}</th>
                                <th style="text-align: left;">${game.i18n.localize(`FU.Description`)}</th>
                                <th style="text-align: left;">${game.i18n.localize(`FU.Special`)}</th>
                            </tr>
                            </thead>
                            <tbody>
                                ${basicItems}
                            </tbody>
                        </table>
                    </div>
                `
						: ''
				}
    
                ${
					weaponItems
						? `
                    <div style="${headerStyle}">
                        <span style="${headerText}">
                            <strong>${game.i18n.localize(`FU.Weapons`)}</strong>
                        </span>
                    </div>
                    <div class="weapon-content">
                        <table>
                            <thead>
                                <tr>
                                    <th style="text-align: left;">${game.i18n.localize(`FU.Name`)}</th>
                                    <th style="text-align: center;">${game.i18n.localize(`FU.Accuracy`)}</th>
                                    <th style="text-align: center;">${game.i18n.localize(`FU.Damage`)}</th>
                                    <th style="text-align: center;">${game.i18n.localize(`FU.DamageType`)}</th>
                                    <th style="text-align: left;">${game.i18n.localize(`FU.Description`)}</th>
                                    <th style="text-align: left;">${game.i18n.localize(`FU.Quality`)}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${weaponItems}
                            </tbody>
                        </table>
                    </div>
                `
						: ''
				}
    
                ${
					spellItems
						? `
                    <div style="${headerStyle}">
                        <span style="${headerText}">
                            <strong>${game.i18n.localize(`FU.Spells`)}</strong>
                        </span>
                    </div>
                    <div class="spell-content">
                        <table>
                            <thead>
                                <tr>
                                    <th style="text-align: left;">${game.i18n.localize(`FU.Name`)}</th>
                                    <th style="text-align: center;">${game.i18n.localize(`FU.Accuracy`)}</th>
                                    <th style="text-align: center;">${game.i18n.localize(`FU.Damage`)}</th>
                                    <th style="text-align: center;">${game.i18n.localize(`FU.DamageType`)}</th>
                                    <th style="text-align: left;">${game.i18n.localize(`FU.Description`)}</th>
                                    <th style="text-align: left;">${game.i18n.localize(`FU.Opportunity`)}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${spellItems}
                            </tbody>
                        </table>
                    </div>
                `
						: ''
				}
            </div>
        </div>`;
		}

		if (['Basic', 'Normal', 'Hard'].includes(difficulty)) tableData += addBasicInfo();
		if (['Normal', 'Hard'].includes(difficulty)) tableData += addNormalInfo();
		if (difficulty === 'Hard') tableData += addHardInfo();

		return `<div class="table-container">
        <div class="table">
            <div class="tbody">
                ${tableData}
            </div>
        </div>
    </div>`;
	}

	const folderName = optionStudySavePath;
	const folder = folderName ? game.folders.find((f) => f.name === folderName && f.type === 'JournalEntry') || (await Folder.create({ name: folderName, type: 'JournalEntry', parent: null })) : null;
	const folderId = folder?.id || null;

	const imgSrc = actor.img;
	let tableContent = difficulty === 'Failed' ? '' : makeTable(actor, difficulty);

	const isV12OrLater = game.version && game.version >= '12.0.0';

	const journalEntryData = {
		name: actor.name,
		folder: folderId,
		...(isV12OrLater ? { ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER } } : { permission: { default: CONST.DOCUMENT_PERMISSION_LEVELS.OBSERVER } }),
	};

	const JournalEntryClass = getDocumentClass('JournalEntry');
	const journalEntry = await JournalEntryClass.create(journalEntryData);

	const pageContent = `
        <div style="
            background-color: #fff;
            box-shadow: #1a1c1833 0px 2px 1px -1px, #1a1c1824 0px 1px 1px 0px, #1a1c181f 0px 1px 3px 0px;
            border-radius: 4px;
            max-width: 500px;
            overflow: hidden;
        ">
            <div style="
                display: flex;
                flex-direction: column;
            ">
            <img src="${imgSrc}" alt="${actor.name}" width="200">
            <div style="${headerStyle}">
              <span style="${headerText}">
                <strong>${actor.name}</strong>
              </span>
            </div>
            ${tableContent}
          </div>
        </div>
		`;

	const pageData = {
		name: actor.name,
		type: 'text',
		text: {
			content: pageContent,
			format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML,
		},
	};

	await journalEntry.createEmbeddedDocuments('JournalEntryPage', [pageData]);

	const entryLink = `@JournalEntry[${journalEntry.id}]{${journalEntry.name}}`;
	let msg = (replacement ? update : update2) + `${entryLink}.`;

	ChatMessage.create({
		speaker: ChatMessage.getSpeaker({
			token: this,
		}),
		content: msg,
	});

	Hooks.callAll(FUHooks.ROLL_STUDY, actor, journalEntry);
}
