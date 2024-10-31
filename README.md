# Project FU

![Fabula Ultima Mod Logo - White Background](https://github.com/League-of-Fabulous-Developers/FoundryVTT-Fabula-Ultima/assets/16845165/040a116d-3419-47ee-af36-5aed128bdb2d)

![foundry-v11-green](https://img.shields.io/badge/foundry-v11-green)
![foundry-v12-green](https://img.shields.io/badge/foundry-v12-green)

Welcome to the ProjectFU system for [Foundry Virtual Tabletop](https://foundryvtt.com/).

ProjectFU is an independent production by the [League of Fabulous Developers](https://github.com/League-of-Fabulous-Developers) and is not affiliated with Need Games or Rooster Games. Supplied game rules in the system compendium adhere to and are published under the [Fabula Ultima Third Party Tabletop License 1.0](https://need.games/wp-content/uploads/2024/06/Fabula-Ultima-Third-Party-Tabletop-License-1.0.pdf). We adhere to RoosterEma's guidelines, ensuring that the core book and its supplements remain integral to your experience. To fully utilize this system, you will need the [Fabula Ultima Core Rulebook](https://www.needgames.it/fabula-ultima-en/).

This repository's source code is subject to the terms of the [MIT License](https://github.com/League-of-Fabulous-Developers/FoundryVTT-Fabula-Ultima/blob/main/LICENSE.md). For further details, please refer to the [LICENSE](https://github.com/League-of-Fabulous-Developers/FoundryVTT-Fabula-Ultima/blob/main/LICENSE.md) file included in this repository.

Fabula Ultima is a roleplaying game created by Emanuele Galletto and published by [Need Games](https://www.needgames.it/). Fabula Ultima is © Need Games and Rooster Games.

## Preview

![image](https://github.com/user-attachments/assets/be988378-d111-432c-bbe6-b07f97a09fef)

## Installation

### Semi-Automatic Installation

1. Open the Foundry Setup screen and navigate to the Game Systems tab.
2. Click the "Install System" button.
3. Use the following Manifest URL: `https://github.com/League-of-Fabulous-Developers/FoundryVTT-Fabula-Ultima/releases/latest/download/system.json`
4. Click "Install."

### Manual Installation

1. Visit the [Release](https://github.com/League-of-Fabulous-Developers/FoundryVTT-Fabula-Ultima/releases '‌') page to find your desired version.
2. Download the `projectfu.zip` file for your chosen version.
3. Unzip the downloaded file to your FoundryVTT Data systems folder. (For more details, refer to the [FoundryVTT Configuration Guide](https://foundryvtt.com/article/configuration/#where-user-data '‌')).
4. [Mandatory] Ensure that you have the `socketLib` module installed.
5. Restart FoundryVTT if necessary.

### Updating from Legacy Build

1. Uninstall any previous versions of the system in FoundryVTT.
2. Refer to `Semi-Automatic Installation` above.
3. Refer to the [Project FU Migration Tutorial](https://github.com/League-of-Fabulous-Developers/FoundryVTT-Fabula-Ultima/wiki/Migration-Tutorial) on how to migrate pre-existing worlds or older system version to the latest version.

## Communication Channels

If you have any questions or concerns, feel free to reach out to us through the following channels:

- Discord: [Rooster Games Discord](https://discord.gg/G9qGbn2) - `#bot-and-tool-discussion` channel
- Discord: [Project FU Discord](https://discord.gg/SNuxpzCgVB) - `#support` channel

## Submitting Issues

Issues reported on [GitHub](https://github.com/League-of-Fabulous-Developers/FoundryVTT-Fabula-Ultima/issues) and support channels will be reviewed and tracked on our [Trello Board](https://trello.com/b/VEa8VQHc/fabula-ultima-system). Please follow the guidelines below for different types of issues. If you wish to contribute to the project, refer to the [Contributing Guidelines](https://github.com/League-of-Fabulous-Developers/FoundryVTT-Fabula-Ultima/blob/main/CONTRIBUTING.md) page.

### Bugs

Before submitting a bug report, ensure the following:

- Bugs are reproducible without active modules. If module-related, contact the module author.
- Provide relevant hosting details.
- Include clear instructions on reproducing the issue and the expected vs actual outcome.

## Project Contributors

Major thanks to the following contributors:

- [zarick1342](https://github.com/zarick1342/) - This system is a fork of their [Fabula Ultima Boilerplate System](https://github.com/zarick1342/fabula-ultima-system)
- [serpuss](https://github.com/serpuss) - Various upgrades and CSS design improvements.
- [spyrella](https://github.com/spyrella) - For ongoing updates to the system and maintainence of the project.
- [Savantford](https://github.com/Savantford) - For providing and allowing us to utilize their clock code.
- [xeqi](https://github.com/xeqi) - Various fixes to the codebase (bonds, status effects, etc) + their fultimator importer module.
- [Shourn](https://github.com/Shourn) - Refactoring of code infrastructure, the establishment of the system data model, and implementing new features.
- [Wigginns](https://github.com/Wigginns) - Various improvements (collapsible descriptions) & fixes.
- [KzMz](https://github.com/KzMz) - Combat HUD.
- drak273 - Assisted with system compendium setup and selection of item art.
- nyxthegender (SPG: [Link](https://startplaying.games/gm/nyxthegender)) - Assisted with restructuring system compendium and setting up journal entries.

- Special thanks to the following contributors found here: [Contributors Link](https://github.com/League-of-Fabulous-Developers/FoundryVTT-Fabula-Ultima/graphs/contributors)

As well as the following localizers who translated the System UI to their respective language:

- Italian ([KzMz](https://github.com/KzMz), RaurosHuntor), German ([Shourn](https://github.com/Shourn)), French ([Zakarik](https://github.com/Zakarik)), Spanish (Jakob_LP, Alejabar), Brazilian Portuguese (Lamegal), Russian (FreeDay), Polish (Hirtus and Picollo)
and Chinese (moroboshikan_42246 (诸星观)).

The following assets/code were used from the following projects:

- **Pixeltier** - All pixel item art referenced in the system compendium are purchased from [Pixeltier](https://itch.io/s/39748/pixeltiers-complete-asset-bundle).
- **Javier Aumente (Tarot)** (**Email:** <jaauvel@gmail.com>) - All classes/skills/heroic pixel art in the system compendium were provided by Tarot with explicit permission to use for the ProjectFU/Fultimator project.
- **Replacement Art** - iron-knuckle.png icon from **RubenE** (**Social:** @/only_ruben_draw) & magic-tent.png icon from **drak273** with explicit permission to use for ProjectFU project.
- **Status Effect Icons**: [styles\static\icons] - default status effect icons from [@\_t3nshi](https://twitter.com/_t3nshi). Explicit permission granted by t3nshi for the use of the Status Effect Icons exclusively in Fabula Ultima games. These icons are not authorized for use in other media without obtaining additional permission from t3nshi.
- **game-icons**: [game-icons.net](https://game-icons.net), various icons were used from here, licensed under the [CC-BY-3.0 license](https://creativecommons.org/licenses/by/3.0/).
- **fultimator**: [fultimator](https://github.com/codeclysm/fultimator) by codeclysm, specifically project/ritual/sp counter code, licensed under the [MIT License](https://github.com/codeclysm/fultimator/blob/main/LICENSE.md)
- **animate.css**: [animate.css](https://animate.style/) by Daniel Eden, licensed under the [Hippocratic License](https://github.com/animate-css/animate.css/blob/main/LICENSE-HIPPOCRATIC).
- **RPG-Awesome**: [RPG-Awesome](https://nagoshiashumari.github.io/Rpg-Awesome/) by Daniela Howe and Ivan Montiel, licensed under the [BSD 2-Clause "Simplified" License](https://github.com/NagoshiAshumari/Rpg-Awesome/blob/master/LICENSE).

The complete list of utilized assets and their respective licenses is available [here](https://github.com/League-of-Fabulous-Developers/FoundryVTT-Fabula-Ultima/blob/main/COPYRIGHT.md)
