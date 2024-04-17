/**
 * Handle the study roll interaction
 * @param {DocumentSheet} app - The rendered NPC sheet
 */
export async function handleStudyRoll(app) {
    const coreRule = [10, 13, 16];
    const revisedRule = [7, 10, 13];
    const useRevisedStudyRule = game.settings.get('projectfu', 'useRevisedStudyRule');
    const optionStudySavePath = game.settings.get('projectfu', 'optionStudySavePath');
    const difficultyThresholds = useRevisedStudyRule ? revisedRule : coreRule;

    const contentRows = [
        `<tr><td>${difficultyThresholds[0]}+</td><td>Rank, Species, HP, MP.</td></tr>`,
        `<tr><td>${difficultyThresholds[1]}+</td><td>Traits, Attributes, Defense, Magic Defense, Affinities.</td></tr>`,
        `<tr><td>${difficultyThresholds[2]}+</td><td>Basic Attacks and Spells.</td></tr>`,
    ];

    const dialogContent = `
        <div class="desc mb-5">
            <table>
                <tr><th>Result</th><th>Information Revealed</th></tr>
                ${contentRows.map((row) => `<tr><td>${row}</td></tr>`).join('')}
            </table>
        </div>
        <div class="desc">
            <p>Enter Study Check total:</p>
            <input type="number" id="study-input">
        </div>
        <hr>`;

    const dialog = new Dialog(
        {
            title: 'Study Check',
            content: dialogContent,
            buttons: {
                ok: {
                    label: 'Submit',
                    callback: async (html) => {
                        const studyValue = parseInt(html.find('#study-input').val());
                        let difficulty;
                        let replacement = false;
                        const existingJournal = game.journal.getName(this.actor.name);
                        if (existingJournal) {
                            replacement = true;
                            existingJournal.delete();
                        }

                        if (studyValue >= difficultyThresholds[0] && studyValue < difficultyThresholds[1]) difficulty = 'Basic';
                        else if (studyValue >= difficultyThresholds[1] && studyValue < difficultyThresholds[2]) difficulty = 'Normal';
                        else if (studyValue >= difficultyThresholds[2]) difficulty = 'Hard';
                        else difficulty = 'Failed';

                        const headerStyle = `background: linear-gradient(to right, #532853, #bfb8c4);border-color: #c1b7c7;display: flex;align-items: center;padding: 2px;border-right: groove #ffffff 3px;padding-left: 16px;padding-right: 16px;`;
                        const headerText = `font-family: Antonio;font-weight: bold;font-size: 1.25rem;text-transform: uppercase;color: #ffffff;text-shadow: 2px 1px 1px black;`;
                        const divideText = `padding: 5px; border-bottom: 1px solid #c1b7c7; border-image: linear-gradient(45deg, #532853, #bfb8c4) 1;`;
                        const attrBoxStyle = `padding: 5px; background-color: rgb(239, 236, 245); border-right: 1px solid rgb(255, 255, 255);`;

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
                                    <label>LV ${system.level.value}</label>
                                    <span class="diamond-symbol" style="color: #532853;">⬥</span>
                                    <label>${system.species.value}</label>
                                    <span class="diamond-symbol" style="color: #532853;">⬥</span>
                                    <label>${system.resources.hp.max} <span style="color: #cd1619;">HP</span></label>
                                    <span class="diamond-symbol" style="color: #532853;">⬥</span>
                                    <label>${system.resources.mp.max} <span style="color: #009ee3;">MP</span></label>
                                </div>
                            </div>`;
                            }

                            function addNormalInfo() {
                                const { system } = actorData;
                                if (!(system && system.traits && system.attributes && system.derived)) {
                                    console.error('Normal Info Error: Some properties are undefined.');
                                    return '';
                                }

                                const affinityMap = { '-1': 'VU', 0: '-', 1: 'RS', 2: 'IM', 3: 'AB' };
                                const affinityNameMap = { physical: 'Physical', air: 'Air', bolt: 'Bolt', dark: 'Dark', earth: 'Earth', fire: 'Fire', ice: 'Ice', light: 'Light', poison: 'Poison' };
                                const affinityIconMap = {
                                    physical: 'fun fu-phys',
                                    air: 'fun fu-wind',
                                    bolt: 'fun fu-bolt',
                                    dark: 'fun fu-dark',
                                    earth: 'fun fu-earth',
                                    fire: 'fun fu-fire',
                                    ice: 'fun fu-ice',
                                    light: 'fun fu-light',
                                    poison: 'fun fu-poison',
                                };

                                let affinitiesDisplay = '';
                                if (system.affinities) {
                                    affinitiesDisplay = `<div class="affinities resource-content flex-group-center grid grid-9col" style="display: flex; justify-content: space-between; padding: 0 8px;">
                                    ${Object.entries(system.affinities)
                                            .map(([affinity, values]) => {
                                                const acronymValue = affinityMap[values.current] || values.current;
                                                const fullName = affinityNameMap[affinity] || affinity;
                                                const iconClass = affinityIconMap[affinity] || '';
                                                const opacity = values.current === 0 ? '0.25' : '1';
                                                return `<div class="affinity resource-content flex-group-center" style="opacity: ${opacity}; display: flex; justify-content: space-between; margin: 2px; gap: 5px;">
                                                <i class="${iconClass} icon-aff"></i>
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
                                            <label style="${attrBoxStyle}">DEX d${system.attributes.dex.base}</label>
                                            <label style="${attrBoxStyle}">INS d${system.attributes.ins.base}</label>
                                            <label style="${attrBoxStyle}">MIG d${system.attributes.mig.base}</label>
                                            <label style="${attrBoxStyle}">WLP d${system.attributes.wlp.base}</label>
                                        </div>
                                        
                                        <div class="resource-label-m grid grid-3col flex-group-center">
                                            <div style="${attrBoxStyle}">DEF ${system.derived.def.value}</div>
                                            <div style="${attrBoxStyle}">M.DEF ${system.derived.mdef.value}</div>
                                            <div style="${attrBoxStyle}">INIT ${system.derived.init.value}</div>
                                        </div>
                                    </div>
                                    
                                    <li class="flex-group-center grid grid-6col ${divideText}">
                                        <label class="resource-label-m">Traits</label>
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

                                const filteredItems = items.filter((item) => ['basic', 'weapon', 'spell'].includes(item.type));
                                let basicItems = '';
                                let weaponItems = '';
                                let spellItems = '';

                                filteredItems.forEach((item) => {
                                    const itemType = item.type.charAt(0).toUpperCase() + item.type.slice(1);
                                    const name = item.name;
                                    const damage = item.system.damage?.value ? `【HR + ${item.system.damage.value}】` : '';
                                    const damageType = item.system.damageType?.value ? `<strong>${item.system.damageType.value}</strong> damage` : 'N/A';
                                    const primaryAttribute = item.system.attributes?.primary?.value.toUpperCase();
                                    const secondaryAttribute = item.system.attributes?.secondary?.value.toUpperCase();
                                    const attributesDisplay = primaryAttribute && secondaryAttribute ? `【${primaryAttribute} + ${secondaryAttribute}】 ` : '';
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

                                return `<div class="hard-info">
                                <div class="sheet-details">
                                    ${basicItems
                                        ? `
                                        <div style="${headerStyle}">
                                            <span style="${headerText}">
                                                <strong>Basic Attacks</strong>
                                            </span>
                                        </div>
                                        <div class="basic-content">
                                            <table>
                                                <thead>
                                                <tr>
                                                    <th style="text-align: left;">Name</th>
                                                    <th style="text-align: center;">Accuracy</th>
                                                    <th style="text-align: center;">Damage</th>
                                                    <th style="text-align: center;">Damage Type</th>
                                                    <th style="text-align: left;">Description</th>
                                                    <th style="text-align: left;">Special</th>
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
                        
                                    ${weaponItems
                                        ? `
                                        <div style="${headerStyle}">
                                            <span style="${headerText}">
                                                <strong>Weapons</strong>
                                            </span>
                                        </div>
                                        <div class="weapon-content">
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th style="text-align: left;">Name</th>
                                                        <th style="text-align: center;">Accuracy</th>
                                                        <th style="text-align: center;">Damage</th>
                                                        <th style="text-align: center;">Damage Type</th>
                                                        <th style="text-align: left;">Description</th>
                                                        <th style="text-align: left;">Quality</th>
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
                        
                                    ${spellItems
                                        ? `
                                        <div style="${headerStyle}">
                                            <span style="${headerText}">
                                                <strong>Spells</strong>
                                            </span>
                                        </div>
                                        <div class="spell-content">
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th style="text-align: left;">Name</th>
                                                        <th style="text-align: center;">Accuracy</th>
                                                        <th style="text-align: center;">Damage</th>
                                                        <th style="text-align: center;">Damage Type</th>
                                                        <th style="text-align: left;">Description</th>
                                                        <th style="text-align: left;">Opportunity</th>
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
                        const folder = folderName ? game.folders.find(f => f.name === folderName && f.type === "JournalEntry") || await Folder.create({ name: folderName, type: "JournalEntry", parent: null }) : null;
                        const folderId = folder?.id || null;      
                        
                        const imgSrc = this.actor.img;
                        let tableContent = difficulty === 'Failed' ? '' : makeTable(this.actor, difficulty);                  

                        const entry = await JournalEntry.create({
                            name: this.actor.name,
                            content: `
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
                                <img src="${imgSrc}" alt="${this.actor.name}" width="200">
                                <div style="${headerStyle}">
                                  <span style="${headerText}">
                                    <strong>${this.actor.name}</strong>
                                  </span>
                                </div>
                                ${tableContent}
                              </div>
                            </div>
                          `,
                            folder: folderId,
                            permission: {
                                default: 3,
                            },
                        });

                        const entryLink = `@JournalEntry[${entry.id}]{${entry.name}}`;
                        let msg = (replacement ? `Journal updated for ` : `You've learned more information about the `) + `${entryLink}.`;

                        ChatMessage.create({
                            speaker: ChatMessage.getSpeaker({
                                token: this,
                            }),
                            content: msg,
                        });
                    },
                },

                cancel: {
                    label: 'Cancel',
                },
            },
            default: 'ok',
        },
        {
            classes: ['dialog', 'backgroundstyle'],
        },
    );

    dialog.render(true);
}
