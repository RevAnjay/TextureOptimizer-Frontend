# ConvertTexture Frontend

Web interface for inspecting, optimizing, and converting Minecraft resource packs. Upload a Java pack, configure its conversion, and download the resulting Bedrock resource pack with Geyser mappings.

Built with **React 19**, **Vite 8**, and **Tailwind CSS 4**. Resource-pack processing and account management are provided by a separate backend API.

## Features

- **Java → Bedrock conversion** with a downloadable resource pack, Geyser mappings, and conversion report.
- **Local pack inspection** to check ZIP structure, metadata, asset counts, and potential compatibility issues before uploading.
- **Texture optimization** with configurable compression, resizing, and cleanup options.
- **Pack analysis** to identify large textures and inspect asset statistics.
- **Java version conversion** for supported item-model and pack formats.
- **Job monitoring** with progress, server logs, connection retries, and reload recovery for optimization, Java version conversion, and Bedrock conversion.
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
| `npm test` | Run the ZIP-inspection and API-helper tests. |
| `npm run build` | Create the production build in `dist/`. |
| `npm run preview` | Preview a production build locally. |
| `npm run lint` | Run ESLint. |

## Using the converter

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
