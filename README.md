# GrammarFix

A Vencord userplugin that adds a **Fix Grammar (Gemini)** action to the chat input context menu. It sends the current draft to Gemini for spelling and grammar correction, then replaces the draft with the corrected text.

The plugin uses a native main-process helper for the Gemini request.

## Quick Setup

Upload the plugin folder to the location where it belongs in your Vencord source tree, then run:

```powershell
Remove-Item -Recurse -Force dist
pnpm build
pnpm inject
```

After injection, enable `GrammarFix` in Vencord if needed.

## Installation

1. Put the plugin folder in `src/userplugins/<Name>/`.
2. Export a default `definePlugin` from `index.tsx` or `index.ts`.
3. Because the plugin makes a network request from the main process, include `native.ts`.
4. Export the native IPC handlers through `VencordNative.pluginHelpers.<ExactPluginName>.<fn>`.
5. The native helper key must match the plugin name exactly: `GrammarFix`.
6. Use Vencord APIs such as `@api/*`, `@utils/*`, and `@webpack/common`.
7. Rebuild/reinject after making changes.

For development, `pnpm watch` can be used instead of a full rebuild.

## How It Works

### Context menu

The plugin patches the global context menu for `navId="textarea-context"`, which is the context menu opened by right-clicking inside the chat input.

It adds:

```text
Fix Grammar (Gemini)
```

### Reading the draft

The current draft is read with:

```text
DraftStore.getDraft(channelId, 0)
```

The active channel ID comes from:

```text
SelectedChannelStore.getChannelId()
```

If the draft is empty or contains only whitespace, the plugin returns without making a request.

### Gemini prompt

The draft is sent to Gemini with instructions to:

- Correct spelling and grammar.
- Fix capitalization and apostrophes where appropriate.
- Preserve the user's casual tone.
- Return only the corrected text.

### Gemini request

`callGemini` invokes the native `makeGeminiRequest` handler using the configured API key and:

```text
gemini-3.1-flash-lite
```

The returned Gemini response is parsed to extract the generated text.

### Applying the correction

The corrected text replaces the current chat draft through:

```text
ComponentDispatch.dispatchToLastSubscribed(
    "UPDATE_CHANNEL_TEXT_AREA",
    { textValue: fixedText }
)
```

Errors are shown in the chat input.

## Files

### `index.tsx`

Renderer-side implementation containing:

- Chat-input context menu patch.
- Draft retrieval.
- Prompt construction.
- Gemini request invocation.
- Chat input update.
- Settings.

### `native.ts`

Main-process implementation containing:

- Gemini HTTP request.
- Electron `net.fetch` usage.
- Response handling.
- `{ status, data }` result format.

The native request follows the same Gemini HTTP request pattern as `answerWithAI`.

## Native Networking

The Gemini request uses Electron's `net.fetch` rather than a renderer-side request. This avoids Discord page CSP restrictions and uses Electron's Chromium network/proxy stack.

## Settings

The plugin requires an `apiKey` setting containing a Gemini API key.

If the key is missing or the Gemini request fails, the plugin reports the error through the chat input.

## Notes

- Native helper key: `"GrammarFix"`.
- Plugin name: `"GrammarFix"`.
- Empty or whitespace-only drafts are ignored.
- The Gemini model is currently `gemini-3.1-flash-lite`.
- The plugin corrects the existing draft rather than sending a message automatically.
