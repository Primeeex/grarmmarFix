import { addGlobalContextMenuPatch, GlobalContextMenuPatchCallback, removeGlobalContextMenuPatch } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { insertTextIntoChatInputBox } from "@utils/discord";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { ComponentDispatch, DraftStore, Menu, SelectedChannelStore } from "@webpack/common";

const GEMINI_MODEL = "gemini-3.1-flash-lite";

// Native helper keyed to exact plugin name "GrammarFix"
const Native = VencordNative.pluginHelpers.GrammarFix as PluginNative<typeof import("./native")>;

const settings = definePluginSettings({
    apiKey: {
        type: OptionType.STRING,
        description: "Your Gemini API key (from Google AI Studio)",
        default: "",
    },
});

async function callGemini(prompt: string, apiKey: string): Promise<string> {
    const { status, data } = await Native.makeGeminiRequest(apiKey, GEMINI_MODEL, prompt);

    if (status !== 200) {
        throw new Error(`Gemini API error ${status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
    }

    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini returned no text content");
    return text.trim();
}

async function handleGrammarFix() {
    const apiKey = settings.store.apiKey?.trim();
    if (!apiKey) {
        insertTextIntoChatInputBox(" [Error: Set your Gemini API key in settings first] ");
        return;
    }

    const channelId = SelectedChannelStore.getChannelId();
    if (!channelId) return;

    // Fetch draft currently typed in the input box (0 represents main input draft)
    const currentText = DraftStore.getDraft(channelId, 0);
    if (!currentText || currentText.trim().length === 0) return;

    const prompt = `You are a grammar and spelling corrector. Fix the following Discord chat message. Keep the casual tone exactly the same (do not make it overly formal), but fix spelling mistakes, missing apostrophes, capitalization, and obvious grammar errors. Return ONLY the fixed message text, with no quotation marks and no extra commentary.

Original message:
${currentText}`;

    try {
        const fixedText = await callGemini(prompt, apiKey);
        
        // Replaces current text in the chat input area
        ComponentDispatch.dispatchToLastSubscribed("UPDATE_CHANNEL_TEXT_AREA", { textValue: fixedText });
    } catch (err: any) {
        console.error("[GrammarFix]", err);
        insertTextIntoChatInputBox(` [Grammar Fix Failed: ${err?.message ?? err}] `);
    }
}

const globalPatch: GlobalContextMenuPatchCallback = (navId, children) => {
    // Triggers when right-clicking inside the chat input text area
    if (navId !== "textarea-context") return;

    children.push(
        <Menu.MenuGroup key="grammar-fix-group">
            <Menu.MenuItem
                id="vc-grammar-fix"
                label="Fix Grammar (Gemini)"
                action={handleGrammarFix}
            />
        </Menu.MenuGroup>
    );
};

export default definePlugin({
    name: "GrammarFix",
    description: "Right-click inside the chat input box and select 'Fix Grammar' to correct spelling and grammar via Gemini.",
    authors: [{ name: "Your Name", id: 0n }],
    settings,

    start() {
        addGlobalContextMenuPatch(globalPatch);
    },

    stop() {
        removeGlobalContextMenuPatch(globalPatch);
    }
});