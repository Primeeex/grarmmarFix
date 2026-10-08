import { IpcMainInvokeEvent, net } from "electron";

export async function makeGeminiRequest(
    _: IpcMainInvokeEvent,
    apiKey: string,
    model: string,
    prompt: string
) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const doFetch: typeof fetch = (net as any)?.fetch ? (net as any).fetch.bind(net) : fetch;

    try {
        const res = await doFetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }], role: "user" }],
            }),
        });

        const raw = await res.text();
        try {
            return { status: res.status, data: JSON.parse(raw) };
        } catch {
            return {
                status: res.status,
                data: `Non-JSON response from ${new URL(url).host} (content-type: ${res.headers.get("content-type")}): ${raw.slice(0, 300)}`,
            };
        }
    } catch (e) {
        return { status: -1, data: String(e) };
    }
}