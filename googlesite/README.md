# Google Sites embed package

This directory is a self-contained export of the single-player ThunderCats game. It includes eighteen missions, 20 distinct boss villains, and 31 runtime artwork assets. It does not need the parent project's files, Node.js or npm after hosting.

Backgrounds use soft scenery overlaps and gradual ground/lighting changes between sections. The Cat’s Lair blends into the forest, and vehicle terrain blends at its vertical joins.

## Recommended: paste the iframe snippet

1. Upload this directory to a public HTTPS static host. Preserve its `src` and `assets` folders. If the directory is available at `https://your-host.example/googlesite/`, that is the game URL. If your host publishes this directory as its root, use the root URL instead.
2. Open [embed-code.html](embed-code.html) in a text editor. Replace `https://YOUR-HOST.example/googlesite/` with that actual public game URL.
3. In Google Sites, select **Insert → Embed → Embed code**, paste the snippet, click **Next**, then **Insert**. Resize the embed to approximately 720 pixels high. A **Full page embed** is also supported by Google Sites.
4. Publish the Google Site. Click inside the game before using the keyboard. Sound starts after a user interaction. Fullscreen and controllers depend on permissions granted by the embedding page; keyboard and touch continue to work when controller access is denied.

Google's official instructions: [Add website content or HTML/CSS/JavaScript to Google Sites](https://support.google.com/sites/answer/90569?hl=en).

The snippet is a template: its `.example` URL is deliberately not a live website. A Windows path, `file://` URL, or `localhost` address is not a public game URL. Google Sites does not host this directory just by pasting the iframe snippet. The external host must permit framing; `X-Frame-Options: DENY`, `SAMEORIGIN`, or an incompatible CSP `frame-ancestors` policy will prevent a Google Sites embed.

## Optional: one HTML file, including all artwork

[standalone.html](standalone.html) includes the complete game code, styles, and embedded PNG artwork. It runs without requesting additional scripts, images or fonts. It can be hosted as one HTML file or opened locally for an offline preview.

Google Sites accepts HTML, CSS and JavaScript through Embed code, so this file contains the full pasteable code. However, it is approximately **82 MiB** because of the game's HD artwork. Direct paste acceptance and saving at that size have **not** been verified in the Google Sites editor; the small hosted iframe snippet above is recommended. Do not paste only a portion of the standalone file.

In an opaque sandbox, browser storage is unavailable: the game still plays, but saves and settings cannot persist there. Prefer the hosted URL for normal browser-local saving. Browser policies may also limit storage in third-party embeds.

## Local preview

From the parent project, restart the development server after this update:

```sh
npm run dev
```

Open `http://localhost:4173/googlesite/embed-preview.html` to test the iframe, or `http://localhost:4173/googlesite/` for the compact game page. This is a local preview, not a public URL for Google Sites visitors.

## Verification

[TEST-RESULTS.json](TEST-RESULTS.json) records the successful local checks:

- All 46 exported runtime files served correctly beneath `/googlesite/`, with JavaScript MIME types and a trailing-slash redirect.
- Private project files remained inaccessible through the preview server.
- The hosted version played in a cross-origin sandboxed iframe with gamepad access explicitly denied.
- The standalone version played in an opaque-origin sandbox with gamepad access and local storage unavailable, fetching only its HTML document.
- Character switching, new illustrated expeditions, paired bosses, keyboard movement, jumping, hole falls with damage and one-second return protection, steering, firing, special charging, all six vehicle routes, and mobile iframe layout passed without page errors.
- Both embeds spawned the complete 20-villain roster and loaded the artwork for all 18 boss fights.

These are local browser tests that reproduce iframe restrictions. They do not claim publication or testing inside a signed-in, published Google Site.

To rebuild from the parent project and rerun the iframe tests:

```sh
npm run build:googlesite
npm run test:googlesite
```

`build-manifest.json` lists export hashes and sizes. Rebuild after source changes, then rerun the checks. The parent `assets/ART.md` documents artwork references and generation prompts.

The seven new on-foot environments use two illustrated atlases, fetched only when first needed in the normal hosted version. The standalone file embeds them up front. Switching uses 1–4, Q/E, RB/R1 or the on-screen roster. Health percentage, charge and continues are shared; vehicle hull is preserved when changing pilots. Old checkpoints restore by mission identity, including the final pyramid.
