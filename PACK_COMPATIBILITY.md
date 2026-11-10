# Multi-version Java packs and pack inspection

The browser uploads one ZIP to the Rust backend and downloads one Java ZIP containing version metadata, generated overlays and a build report. Processing uses Rust and does not start a Minecraft client or Java runtime.

## Release catalog

The default range is 1.20.2–1.21.4. The broader catalog is a set of recognized format boundaries, not a claim that every asset can be automatically ported. Snapshots and versions before overlays were introduced are excluded.

| Java release group | Resource pack format |
| --- | --- |
| 1.20.2 | 18 |
| 1.20.3–1.20.4 | 22 |
| 1.20.5–1.20.6 | 32 |
| 1.21–1.21.1 | 34 |
| 1.21.2–1.21.3 | 42 |
| 1.21.4 | 46 |
| 1.21.5 | 55 |
| 1.21.6 | 63 |
| 1.21.7–1.21.8 | 64 |
| 1.21.9–1.21.10 | 69 |
| 1.21.11 | 75 |
| 26.1 | 84 |
| 26.2 | 88 |
| 26.3 | 97.1 |

The frontend and backend bundle the same `javaVersions.json` / `java_versions.json` catalog. Keep these files synchronized when adding releases.

## Output behavior

- Original model, texture, font and shader assets are retained. Only `pack.mcmeta`, the generated overlay directories and `conversion_report.json` are written in the private extracted copy. The uploaded ZIP remains unchanged.
- Ranges including older formats use `pack_format` and `supported_formats`. Ranges including the newer metadata schema also receive `min_format` and `max_format`, including explicit minor numbers. Entirely modern ranges omit obsolete metadata keys.
- Existing overlay entries retain their order, directory, range and extra fields. Their range syntax is normalized for the selected metadata schemas. If any retained overlay includes formats below 65, all overlay entries keep legacy `formats`, including for an otherwise modern-only pack. Generated entries precede authored entries so authored overrides keep priority. Name collisions create a distinct generated directory.
- Legacy models with plain numeric `custom_model_data` predicates receive a 1.21.4+ item-definition overlay. Thresholds preserve the last matching original override, even if source predicates are unsorted or repeated. The fallback references the actual original base model.
- A simple modern numeric range dispatch can receive a pre-1.21.4 model overlay when the pack includes its base model and an untinted matching fallback. Direct plain model definitions can receive a legacy parent model. Arbitrary custom item-model component IDs cannot infer a legacy host item.
- For 1.21.11+, root item-model references and inherited model textures seed additional `items` atlas sources. Unrelated block textures are not all copied into the item atlas. Overlay-only graphs, atlas filters and renderer-specific behavior need game testing.
- Unsupported states, shader changes and unsafe backports are reported. No renderer, shader, font, equipment or vanilla texture-layout port is inferred from a format number. Runtime tints and special fallback renderers require review. Server plugins must also send item data appropriate for each client version.

`conversion_report.json` has `schema_version: 1`, `kind: "multiversion"`, the selected range and release groups, generated counts/directories, retained overlay counts, warnings and limitations. Review counts are grouped by category, retaining up to eight examples per category so repeated item-binding notices do not hide shader or atlas warnings. `prepared` means the builder completed its supported transformations. `needs_review` means explicit review items were found. Neither status certifies game behavior.

## Backend API

Use the existing authenticated `POST /convert` multipart endpoint:

```text
file             Java resource-pack ZIP
conversionMode   multiversion
minVersion       1.20.2
maxVersion       1.21.4
```

Values use catalog IDs. Invalid, unknown and reversed ranges return HTTP 400 before admission or quota charging. Bedrock conversion and the older `targetFormat` API remain available for existing clients. Results use the existing owner-scoped `/status/:id`, `/tasks` and `/download/:id` endpoints. Conversion reports are retained in the output ZIP and restored after backend restart.

`POST /scan` accepts `file`, `minPixel` and `minKb`. These thresholds affect only the highlighted oversized-file lists. The task's `result` retains the older scan fields and adds optional `health` with declared formats, asset counts, categorized findings, overlays, texture audit, recommendations and inspection scope. Old persisted reports without `health` remain readable.

## Inspector scope and resource use

Inspection checks JSON syntax, animation metadata/decoding, root model-parent cycles, missing custom texture references, overlay declarations, shader/mod-dependent assets and duplicate bytes. Missing custom references can be supplied by a different pack or mod and are warnings, not proof of a broken pack. Vanilla references are not falsely marked missing just because vanilla assets are absent from the ZIP.

Texture inspection runs the shared atlas/animation planner with both transform switches off. A regression test compares every source file before and after inspection. Findings and path lists are bounded; their totals can exceed the retained details. JSON inspection is capped at 2 MiB per file. Duplicate hashing streams 64 KiB chunks. Existing decoder limits apply. CPU-heavy scan and multi-version building run off Tokio's async workers so status polling remains available. Neither operation starts a JVM or downloads game assets.

RGBA totals describe inspected decoded sheets, including animation frames, rather than measured game/GPU RAM. Atlas estimates exclude vanilla, other enabled packs, mods and actual driver/stitcher behavior. Neither report predicts FPS. Duplicate byte totals do not establish that resource IDs can safely be removed.

The browser saves a bounded account/tool/backend-specific task checkpoint, without tokens, uploaded files or full reports. After reload, it fetches the current result from the server. Inspection results remain available in Tasks while retained by the backend. JSON export downloads the retained report locally.

## Verification and format references

Automated coverage includes threshold precedence, minor-version metadata, overlay priority and collisions, legacy-only backports, invalid range admission, original asset preservation, strictly read-only inspection, bounded duplicate paths, persisted queue results and frontend filters/ranges. Game behavior on every selected release and Android device still requires manual testing.

Official format changes: [1.20.2 overlays](https://feedback.minecraft.net/hc/en-us/articles/19703470383757-Minecraft-Java-Edition-1-20-2), [1.21.4 item definitions](https://feedback.minecraft.net/hc/en-us/articles/32385811139085-Minecraft-Java-Edition-1-21-4-The-Garden-Awakens), [1.21.9 metadata](https://www.minecraft.net/en-us/article/minecraft-java-edition-1-21-9), [1.21.11 item atlas](https://www.minecraft.net/en-us/article/minecraft-java-edition-1-21-11), [26.1](https://feedback.minecraft.net/hc/en-us/articles/44551668333837-Minecraft-Java-Edition-26-1), [26.2](https://feedback.minecraft.net/hc/en-us/articles/46690753273997-Minecraft-Java-Edition-26-2), [26.3 shader and pack-format changes](https://www.minecraft.net/en-us/article/minecraft-java-edition-26-3).
