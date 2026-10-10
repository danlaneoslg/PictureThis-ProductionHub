# Picture This Production Hub

Standalone local Windows video editor built with Electron and React/TypeScript. Originals are referenced read-only. Projects and encrypted API credentials live under Electron's user data directory, separate from Studio. No deployment or Cloudflare integration.

## Run

Use Node.js 22.12+ and npm. Run `npm install`, `npm run build`, then `npm run desktop`.

For normal use, double-click `Start Production Hub.cmd`. It runs the installed Electron executable directly, clears inherited Node-only launch flags, enables software rendering, and focuses an existing instance. On failure it displays the captured error and waits for a keypress. Logs are under `data/logs/`: `launcher.log`, `startup.log`, and `chromium.log`. The launcher resolves its own directory before changing folders, so relative-path launches also work.

`Start Production Hub.cmd --startup-check` performs a read-only check of the real saved project, renderer, and source metadata. Diagnostic browser caches are separate from the normal app. Startup parse errors retain all saved files and exit with a logged error instead of silently replacing the active project with a blank workspace. Source preview serves byte-range requests for seeking.

This computer now has FFmpeg/ffprobe and an isolated Whisper installation under the ignored `data/` folder. Production Hub reads `data/toolchain.json` and fills default executable paths automatically. Whisper's base model is preloaded under `data/models/`. Transcription runs on CPU and sends no audio to a provider. Keep this project folder in place because the Python environment uses absolute paths. On another computer, install the tools separately and enter paths in Settings.

Import footage, preview a source, trim clip in/out points, split at the source playhead, and reorder clips with the up/down arrows. Preview joined edit plays the selected ranges in timeline order. Export video joins all timeline rows into one 1080p landscape or vertical MP4. Each row's Export clip saves only that selected range as its own MP4. Save edit explicitly saves the editable project; field edits also autosave. Export saves the latest draft before opening its save dialog and reports the output path afterward. Open restores an existing project from the app data folder.

Import adds the full recording as the first timeline row. To create a highlight compilation, remove that row using × after adding your chosen highlights. Removing a row does not remove the original from the source library or disk. Default exports go to Videos/PictureThis Exports with unique filenames. A new export may also be saved alongside recordings; original recordings and existing output files are never overwritten. Vertical exports fit footage with padding.

If an original was moved or renamed, select its source-library row and click Relink selected source. Choose the same original recording. The app checks its duration and preserves clip IDs, ranges, transcript, and edit order. Relinking only updates the project reference; it does not move or overwrite any recording.

Preview joined edit renders the exact timeline order and trimmed ranges into one cached 640×360 landscape (or 360×640 vertical) MP4. Preparation takes time on long edits. Its seek bar covers the entire joined edit. Changing clip order, boundaries, source references, or format requires refreshing the preview. This never alters originals and uses no paid AI. `npm run desktop -- --preview-smoke --disable-gpu` verifies two non-adjacent ranges join to four seconds, playback can seek into the second range, and an unchanged timeline reuses its cache.

## AI budget

The project-wide limit is fixed at $1, counted in integer millionths of USD. Local transcription and candidate heuristics use no paid API. Optional Anthropic analysis sends only timestamped transcript text. Configure your model ID, API key, and verified standard USD input/output rates per million tokens before using it. Rates are deliberately unset; this app does not assume current provider prices. API keys are encrypted using Electron safeStorage on Windows.

The estimate reserves UTF-8 input bytes plus prompt overhead and the full maximum output allowance. The user approves each paid call. Reservations are persisted before network requests, including retries. Uncertain charges retain their full reservation. Actual reported usage settles successful requests. Identical results are cached within the project. The cap depends on correctly configured provider pricing; provider-side price changes cannot be controlled by this client. There is no UI to raise the approved cap.

## Verification and current scope

`npm test` checks cumulative and restart budget enforcement, quote construction, and boundary validation. `npm run build` checks renderer types and generates production assets.

This initial MVP uses direct source preview and sequential FFmpeg exports. Proxy generation, relinking, rolling recovery snapshots, caption rendering, installer packaging, and multi-project databases are subsequent milestones. No paid analysis runs during development or tests.

Installed-tool verification: `npm run desktop -- --media-smoke --disable-gpu` uses the generated speech/video fixture under `data/testsource/`, transcribes it using the same backend as the app, renders both export presets, and checks output dimensions with ffprobe. This passed on this computer. The test uses a separate app data directory and does not alter real projects.

Local transcription uses four CPU threads at below-normal process priority, pauses preview playback, and throttles progress notifications. The status shows elapsed time; editing operations are disabled while the job owns the project, and Cancel remains available. Cancellation terminates the entire Whisper/Python process tree. Errors are shown in the app and retained in `data/logs/media-jobs.log` and `startup.log`. A one-minute copy of the original recording passed `--recording-smoke`, including renderer responsiveness checks during transcription. Long recordings still take time to process.
