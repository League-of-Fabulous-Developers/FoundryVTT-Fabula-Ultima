# Unofficial Fabula Ultima System (Project FU)

![fu-sitecover.jpg](https://trello.com/1/cards/64db0994c4a8791322c8b2e2/attachments/64f476a7f1dc332714f44c8c/download/fu-sitecover.jpg)

![foundry-v10-green](https://img.shields.io/badge/foundry-v10-green)
![foundry-v11-green](https://img.shields.io/badge/foundry-v11-yellow)

Welcome to the Unofficial Fabula Ultima System for the {Foundry Virtual Tabletop}(<https://foundryvtt.com/>). This system is designed to enhance your experience of playing [Fabula Ultima](https://www.needgames.it/fabula-ultima-en/) by [Need Games](https://www.needgames.it/). Please note that licensed Fabula Ultima content is not provided with this system. We adhere RoosterEma's guidelines and strive to ensure that the core book and supplements remain essential to your experience.

**Disclaimer:** This system is currently in it's testing phase. We recommend backing up your world before trying it.

## Installation

### Semi-Automatic Installation

1. Open the Foundry Setup screen and navigate to the Game Systems tab.
2. Click the "Install System" button.
3. Use the following Manifest URL: `https://github.com/League-of-Fabulous-Developers/FoundryVTT-Fabula-Ultima/releases/latest/download/system.json`
4. Click "Install."

### Manual Installation

1. Visit the [Release](https://github.com/League-of-Fabulous-Developers/FoundryVTT-Fabula-Ultima/releases "‌") page to find your desired version.
2. Download the `projectfu.zip` file for your chosen version.
3. Unzip the downloaded file to your FoundryVTT Data systems folder. (For more details, refer to the [FoundryVTT Configuration Guide](https://foundryvtt.com/article/configuration/#where-user-data "‌")).
4. [Mandatory] Ensure that you have the `socketLib` module installed.
5. Restart FoundryVTT if necessary.

### Updating from Legacy Build

1. Uninstall any previous versions of the system in FoundryVTT.
2. Refer to `Semi-Automatic Installation` above.
3. Refer to the [Project FU World Migration Guide](https://github.com/League-of-Fabulous-Developers/FoundryVTT-Fabula-Ultima/wiki/Migration-Tutorial) on how to migrate pre-existing worlds to the latest version.

### Migrating Pre-Existing Worlds to New System

To avoid any clashes with developers of other unofficial fabula ultima systems, we're making a small change. We need to switch the package ID from `fabulaultima` to `projectfu`. This ensures smooth updates for users who want both systems installed on Forge/Foundry without any conflicts. For users with pre-existing worlds, this involves editing a JSON file to make your world compatible with the new system. Make sure to back up your world before making any changes.

**Changes:**

1. Package ID: `fabulaultima` ➔ `projectfu`
2. Path: Update records to point to `systems/projectfu/`

**For World Migration:**

1. Open your world's folder.
2. Edit `world.json`.
3. Change `"system": "fabulaultima"` to `"system": "projectfu"`.

For detailed guidance, check out the [Project FU World Migration Guide](https://github.com/League-of-Fabulous-Developers/FoundryVTT-Fabula-Ultima/wiki/Migration-Tutorial).

## Feedback

You can find a list of feature suggestions and ideas on our [Trello board](https://trello.com/b/VEa8VQHc/fabula-ultima-boilerplate-system "‌"). Feel free to review the existing suggestions and the general guidelines section before making new ones to avoid duplication.

Please report any bugs or suggest features using the Issues tab on GitHub.

For questions and discussions for all things related to Fabula Ultima, you can join the Rooster Games Discord Server at [#bots-and-tools-discussion](https://discord.gg/G9qGbn2 "‌").

Before suggesting new features, please review the existing issues to avoid duplication.

## Project Contributors

Major thanks to the following contributors:

- **Fabula Ultima Boilerplate System**: This system is a fork of the [Fabula Ultima Boilerplate System](https://github.com/zarick1342/fabula-ultima-system) by [zarick1342](https://github.com/zarick1342/).
- **Design and CSS Improvements**: Various upgrades and CSS design improvements by [\@serpuss/quake](https://github.com/serpuss).
- **Current Maintainer**: [spyrella](https://github.com/spyrella) - for ongoing updates to the system.

A few assets/code were used from the following projects:

- **game-icons**: [game-icons.net](https://game-icons.net), various icons were used from here, licensed under the  [CC-BY-3.0 license](https://creativecommons.org/licenses/by/3.0/)
- **fultimator**: [fultimator](https://github.com/codeclysm/fultimator) by codeclysm, specifically project/ritual/sp counter code, licensed under the [MIT License](https://github.com/codeclysm/fultimator/blob/main/LICENSE.md)
- **animate.css**: [animate.css](https://animate.style/) by Daniel Eden, licensed under the [Hippocratic License](https://github.com/animate-css/animate.css/blob/main/LICENSE-HIPPOCRATIC).
- **RPG-Awesome**: [RPG-Awesome](https://nagoshiashumari.github.io/Rpg-Awesome/) by Daniela Howe and Ivan Montiel, licensed under the [BSD 2-Clause "Simplified" License](https://github.com/NagoshiAshumari/Rpg-Awesome/blob/master/LICENSE).
- [Savantford](https://github.com/Savantford), specifically for providing code for clocks and helping me set it up.
