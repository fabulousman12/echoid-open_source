# Echoid

Echoid is a privacy-focused chat application built with Ionic React and Capacitor. This repository is shared as a learning resource and a base for further development, while keeping deployment-specific setup outside the public codebase.

## What This Repository Includes

- Ionic React application code
- Chat UI and state management
- Media handling and rendering
- WebSocket client logic
- Encryption-related client utilities
- Tests, tooling, and build configuration
- Local plugin source such as `ionic-thumbnail`

## What Is Intentionally Not Tracked

Some files are kept out of the repository because they are local, generated, or tied to a specific deployment:

- `.env` and other local environment files
- `src/data.ts` and other private config variants
- Firebase service config files
- Android and iOS native project folders
- Generated release output, screenshots, and crash logs

This keeps the public repository focused on the core code while avoiding accidental leaks of deployment-specific setup.
## Usage Limitations

Some files are intentionally not included in this repository.  
This mainly affects certain native Android components required to run the application on Android devices.

Because of this, the project can currently only be fully tested using the **web version**.

Features that depend on native Android behavior cannot be tested here, including:

- App dead-state message handling
- Floating window overlays
- Other Android platform–specific behaviors

When contributing or making changes, please ensure that any feature affecting both platforms includes the necessary **Android platform-dependent implementation**, in addition to the web implementation.
## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a local environment file from the example:

```bash
cp .env.example .env
```

3. Create a local data config from the example:

```bash
cp src/data.example.ts src/data.ts
```

4. Fill in the values in your local `.env` and `src/data.ts`.

5. Start the app:

```bash
npm run dev
```

## Notes on Local Configuration

- `.env.example` contains placeholder environment variables.
- `src/data.example.ts` contains a public-safe example config.
- Your real `src/data.ts` stays local and is ignored by git.
- If you need Firebase, Android, or iOS platform files, provide your own project-specific versions locally.

## Open Code, Protected Brand

The source code in this repository is open under the license in [`LICENSE`](./LICENSE).

The Echoid name, logo, artwork, package identity, and related branding are not granted for unrestricted commercial or promotional reuse. If you fork this project, please use your own branding unless you have explicit permission.

## Contributing

Contributions are welcome. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the basic workflow.

## Project Context

This project was built primarily as a solo effort and a real-world learning project. Some areas may still reflect rapid iteration, experiments, or unfinished cleanup. Issues and pull requests that improve clarity, maintainability, and stability are appreciated.

## License

This project is licensed under the MIT License. See [`LICENSE`](./LICENSE).
