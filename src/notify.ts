/**
 * 通知アダプタ。送信先（プロバイダ）を環境変数で差し替えられる。
 *
 * NOTIFY_PROVIDER = discord（推奨）/ slack / chatwork / console
 * 送信先が未設定でもエラーにせず console 出力にフォールバックする（「まず動く」を担保）。
 */

type Provider = "discord" | "slack" | "chatwork" | "console";

export async function notify(message: string): Promise<void> {
    const provider = (process.env.NOTIFY_PROVIDER ?? "discord") as Provider;

    switch (provider) {
        case "discord":
            return notifyDiscord(message);
        case "slack":
            return notifySlack(message);
        case "chatwork":
            return notifyChatwork(message);
        case "console":
        default:
            console.log(message);
            return;
    }
}

async function notifyDiscord(message: string): Promise<void> {
    const url = process.env.DISCORD_WEBHOOK_URL;
    if (!url) {
        console.warn("[notify] DISCORD_WEBHOOK_URL が未設定のため、コンソールに出力します。");
        console.log(message);
        return;
    }
    // Discord のメッセージ上限は 2000 文字。
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: message.slice(0, 2000) }),
    });
    if (!res.ok) {
        throw new Error(`Discord webhook error: ${res.status} ${await res.text()}`);
    }
}

async function notifySlack(message: string): Promise<void> {
    const url = process.env.SLACK_WEBHOOK_URL;
    if (!url) {
        console.warn("[notify] SLACK_WEBHOOK_URL が未設定のため、コンソールに出力します。");
        console.log(message);
        return;
    }
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message }),
    });
    if (!res.ok) {
        throw new Error(`Slack webhook error: ${res.status} ${await res.text()}`);
    }
}

async function notifyChatwork(message: string): Promise<void> {
    const token = process.env.CHATWORK_API_TOKEN;
    const roomId = process.env.CHATWORK_ROOM_ID;
    if (!token || !roomId) {
        console.warn(
            "[notify] CHATWORK_API_TOKEN / CHATWORK_ROOM_ID が未設定のため、コンソールに出力します。"
        );
        console.log(message);
        return;
    }
    const res = await fetch(`https://api.chatwork.com/v2/rooms/${roomId}/messages`, {
        method: "POST",
        headers: {
            "X-ChatWorkToken": token,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ body: message, self_unread: "1" }),
    });
    if (!res.ok) {
        throw new Error(`Chatwork API error: ${res.status} ${await res.text()}`);
    }
}
