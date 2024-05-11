# Contributing Guidelines for Unofficial Fabula Ultima System (Project FU)

## Introduction

Welcome to the contribution guidelines for Project FU! We appreciate your interest in improving our system. Please follow the guidelines below for code and content contributions.

## Communication Channels

If you have any questions or concerns, feel free to reach out to us through the following channels:

-   Discord: [Rooster Games Discord](https://discord.gg/G9qGbn2) - `#bot-and-tool-discussion` channel
-   Discord: [Project FU Discord](https://discord.gg/SNuxpzCgVB) - `#support` channel

## Submitting Issues

Issues reported on [GitHub](https://github.com/) and support channels will be reviewed and tracked on our [Trello Board](https://trello.com/b/VEa8VQHc/fabula-ultima-system). Please follow the guidelines below for different types of issues.

### Bugs

Before submitting a bug report, ensure the following:

-   Bugs are reproducible without active modules. If module-related, contact the module author.
-   Provide relevant hosting details.
-   Include clear instructions on reproducing the issue and the expected vs actual outcome.

## Tooling and Setup

Project FU is based on the [Boilerplate Template](https://foundryvtt.wiki/en/development/guides/SD-tutorial/SD01-Getting-started), using plain JavaScript and [Gulp](https://gulpjs.com/) for build tasks. Future plans include incorporating new frameworks such as [Tailwind](https://tailwindcss.com/)/[PostCSS](https://postcss.org/), migrating to [Vite](https://vitejs.dev/) as the default bundler, and using [Svelte](https://svelte.dev/)/[TyphonJS](https://github.com/typhonjs-fvtt-demo/template-svelte-esm) for UI components.

### Branches

-   **main:** Mainline branch for v11 releases and above.
-   **v10-maintenance:** Mainline branch for v10 builds.
-   **dev:** Primary development branch for V10 and V11.

When opening a PR, ensure it goes into the most relevant branch.

### Prerequisite Software

-   [Git](https://git-scm.com/)
-   [Node.js LTS](https://nodejs.org)
-   Code editor (recommended: [Visual Studio Code](https://code.visualstudio.com/))

### Setup

Clone the repository and run:

```bash
npm install
```

### Building from Source

Start the build process in watch mode:

```bash
npm run watch
```

Or for a one-time build:

```bash
npm run build
```

Enable the _Hot-Reload Package Files_ option in your Foundry application configuration for an improved developer experience.

## Code Contributions

To contribute code, [fork the repository](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/fork-a-repo) and submit a [pull request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests).
