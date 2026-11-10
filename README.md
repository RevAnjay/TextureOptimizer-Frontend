# ConvertTexture Frontend

Web interface for inspecting, optimizing, and converting Minecraft resource packs. Upload a Java pack, configure its conversion, and download the resulting Bedrock resource pack with Geyser mappings.

Built with **React 19**, **Vite 8**, and **Tailwind CSS 4**. Resource-pack processing and account management are provided by a separate backend API.

## Features

- **Java → Bedrock conversion** with a downloadable resource pack, Geyser mappings, and conversion report.
- **Local pack inspection** to check ZIP structure, metadata, asset counts, and potential compatibility issues before uploading.
- **Texture optimization** with configurable compression, resizing, and cleanup options.
- **Android profiles** for atlas planning, frame-aware sprite resizing, protected font/GUI layouts, and optional vanilla shaders.
- **Animation cost controls** to disable interpolation or explicitly freeze animations, with a downloadable compatibility report.
- **Local reload-log diagnosis** to distinguish shader compilation, atlas stitching, and memory errors without uploading the pasted log.
- **Pack inspector** with searchable health findings, JSON/animation checks, model parent cycles, missing custom texture references, atlas estimates, version overlays, duplicate byte analysis, and JSON export.
- **Multi-version packs** with version-selected CustomModelData overlays and compatibility metadata in a single Java ZIP.
- **Job monitoring** with progress, server logs, connection retries, and reload recovery for optimization, inspection, multi-version builds, and Bedrock conversion.
- **Account screens** for registration, email verification, sign-in, password recovery, and administration.

## Getting started

### Requirements

- Node.js **24 or newer** and npm.
- A current browser with `DecompressionStream` support for local ZIP inspection.
- A running, compatible backend API for sign-in and pack processing.

### Install and run

From the project directory:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite, usually [http://localhost:5173](http://localhost:5173).

## API configuration

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_API_URL` | `/api` | Base URL of the backend API. |

For local development, leaving this variable unset uses the proxy in `vite.config.js`: requests to `/api/*` are forwarded to `http://127.0.0.1:8000/*`.

To use another backend, create `.env.local` using `.env.example` as a reference:

```dotenv
VITE_API_URL=https://api.example.com
```

Restart the development server after changing environment variables. The backend must allow requests from the frontend's origin, including the `Authorization` header.

`VITE_` variables are included in the browser bundle. Keep JWT signing keys, SMTP credentials, and other server secrets in the backend environment.

## Available commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server with hot reload. |
| `npm test` | Run ZIP inspection, API, job-storage, and optimizer-profile checks. |
| `npm run build` | Create the production build in `dist/`. |
| `npm run preview` | Preview a production build locally. |
| `npm run lint` | Run ESLint. |

## Optimizing for Android launchers

Open **Texture optimizer** and choose **Android compatible** or **Android · low memory**. The latter starts with a 2048 px atlas planning target and 64 px sprites. Both profiles remove pack shader overrides and disable animation interpolation; these changes can alter custom effects and transitions. Freezing animations is a separate opt-in option.

These profiles resize individual animation frames, preserve timing/frame order, and protect font/GUI dimensions. Their frame-aware backend pass skips legacy resizing, duplicate merging and unused cleanup to preserve references. The result includes `optimization_report.json`, also displayed after completion and restored with the task after a page reload. Deploy the updated backend with this frontend to use these options and reports.

Atlas sizes are estimates for uploaded sprites, excluding vanilla, mods, other active packs and exact renderer behavior. Smaller PNG/ZIP files alone do not reduce GPU texture memory or prove an FPS gain. Test the pack on the target Minecraft version, launcher and renderer. The log checker runs locally in the browser and does not upload or persist pasted logs.

## Using the converter

### Multi-version Java packs

Open **Multi-version pack**, upload a Java ZIP, and select the oldest and newest release. The default is **1.20.2–1.21.4**; the extended catalog runs through **26.3**. The builder creates matching item overlays, keeps authored overlays in their original priority order, and includes `conversion_report.json`.

The automatic bridge handles plain numeric CustomModelData overrides. Modern-to-legacy range dispatch requires an authored base model and a matching plain fallback. Complex states, tints, special renderers, shader APIs, fonts and renamed vanilla layouts can require manual overlays. For 1.21.11+, the builder adds item atlas sources from resolved root item-model references; overlay-only graphs and custom atlas filters still need review. Selecting a range does not prove in-game compatibility. Review the report and test the releases your players use.

Both the updated Rust backend and this frontend must be deployed. See [the compatibility implementation notes](PACK_COMPATIBILITY.md) for supported schemas, API fields and official format sources.

### Pack inspector

Inspector performs read-only analysis and retains results with the server task. Search or filter findings by severity, review texture and atlas estimates, inspect overlays and file categories, or export the retained report as JSON. Reloading reconnects to the inspection; previous reports are also accessible from **Tasks**. Duplicate byte totals are not a promise that those resource IDs can safely be deleted.

### Java to Bedrock

1. Sign in and open **Java → Bedrock**.
2. Select or drop a Java resource-pack `.zip` containing `pack.mcmeta` and an `assets/` directory.
3. Review the detected assets and compatibility notices, then choose an output name and identifier setting.
4. Start the conversion and follow its progress in the activity log.
5. Download the bundle and review the conversion report before installing it.

A Bedrock conversion bundle contains:

```text
your_pack_bedrock.zip
├── your_pack.mcpack
├── geyser_mappings.json
├── geyser_blocks.json
└── conversion_report.json
```

Upload limits and account quotas are enforced by the backend. Task progress and downloads require an authenticated session.

Once the server accepts an upload, the browser saves a task checkpoint for that account and tool. Reloading, switching tools, or reopening the browser reconnects to the task and retrieves its latest status. Completed results remain downloadable while the backend retains them; the Tasks page also lists previous jobs. Checkpoints contain task metadata, not the uploaded ZIP or authentication credentials.

Keep the page open while the file is still uploading. An interrupted upload cannot resume automatically. Recovery requires the same browser, site, backend URL, and account with browser storage enabled; clearing site data removes local checkpoints.

## Production deployment

1. Set `VITE_API_URL` to the production backend URL in your hosting provider's build environment.
2. Run `npm ci` and `npm run build`.
3. Publish the generated `dist/` directory.
4. Configure SPA fallback so application routes resolve to `index.html`.
5. Allow the deployed frontend origin in the backend's CORS configuration.

For Vercel, use `npm run build` as the build command and `dist` as the output directory. The included `vercel.json` provides the SPA rewrite.

If you keep the default `/api` URL, configure a production reverse proxy for that path. The local Vite proxy is not part of the generated static files. Changing `VITE_API_URL` for an existing deployment requires a new build.

## Project structure

```text
public/                 Static assets
src/
├── assets/             Application images
├── components/         Shared layouts and interface components
├── hooks/              Conversion-job state and lifecycle
├── lib/                API helpers and browser ZIP inspection
├── pages/              Tool, account, and administration screens
├── App.jsx             Navigation and session management
└── index.css           Global styles and theme
tests/                  Node.js regression tests
```

## Conversion compatibility

Output quality depends on the source pack and the backend's supported features. Modern item predicates, shaders, OptiFine/CIT rules, and custom interfaces can require manual adjustments. Animated item and model textures may use a static frame.

Review `conversion_report.json` and test the output in Minecraft Bedrock. For server setup, refer to the [Geyser custom-item documentation](https://geysermc.org/wiki/geyser/custom-items/).
