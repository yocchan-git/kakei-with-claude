/**
 * 週次・月初リマインダー。
 * 「今日が締め日か」を判定して、該当日だけ通知を送る薄いスクリプト。
 * 分析や処理は一切しない（予実の読解と判断は Claude Code の /weekly・/month-start で行う）。
 *
 *   npm run reminder:weekly        # 7/14/21/月末日 のみ送信
 *   npm run reminder:month-start   # いつでも送信（毎月 1 日に cron 等で起動する想定）
 *   ... --force                    # 日付判定をスキップして強制送信（テスト用）
 */
import { notify } from "./notify.js";

type Mode = "weekly" | "month-start";

const PROJECT_PATH = process.env.PROJECT_PATH ?? ".";

function weekOfMonth(date: Date): number {
    return Math.min(Math.ceil(date.getDate() / 7), 4);
}

function isLastDayOfMonth(date: Date): boolean {
    const next = new Date(date);
    next.setDate(date.getDate() + 1);
    return next.getDate() === 1;
}

function isWeeklyTriggerDay(date: Date): boolean {
    const day = date.getDate();
    return day === 7 || day === 14 || day === 21 || isLastDayOfMonth(date);
}

function buildWeeklyMessage(now: Date): string {
    const week = weekOfMonth(now);
    return [
        `📊 週次予実リマインド ${now.getFullYear()}年${now.getMonth() + 1}月 Week${week}`,
        "",
        `Week${week} の締めです。今週の予実をチェックして、必要なら来週の予算を調整しましょう。`,
        "",
        "手順:",
        "1. 家計簿アプリで当月の CSV をダウンロードして data/inbox/ に置く",
        "   （~/Downloads に置いておけば Claude が自動で取り込みます）",
        "2. ターミナルで Claude Code を起動して /weekly を実行:",
        `   cd ${PROJECT_PATH} && claude "/weekly"`,
    ].join("\n");
}

function buildMonthStartMessage(now: Date): string {
    return [
        `🗓 月初リマインド ${now.getFullYear()}年${now.getMonth() + 1}月`,
        "",
        "前月の締めと、今月の予算づくりをしましょう。",
        "",
        "手順:",
        "1. 家計簿アプリで前月末締めの CSV をダウンロードして data/inbox/ に置く",
        "2. ターミナルで Claude Code を起動して /month-start を実行:",
        `   cd ${PROJECT_PATH} && claude "/month-start"`,
    ].join("\n");
}

async function main(): Promise<void> {
    const mode = process.argv[2] as Mode | undefined;
    if (mode !== "weekly" && mode !== "month-start") {
        console.error("Usage: tsx src/reminder.ts <weekly|month-start> [--force]");
        process.exit(1);
    }
    const force = process.argv.includes("--force");
    const now = new Date();

    if (mode === "weekly" && !force && !isWeeklyTriggerDay(now)) {
        console.log(
            `[reminder] Skipped weekly: ${now.toISOString()} is not a week-end day (7/14/21/last-day).`
        );
        return;
    }

    const message =
        mode === "weekly" ? buildWeeklyMessage(now) : buildMonthStartMessage(now);

    await notify(message);
    console.log(`[reminder] Sent ${mode} reminder.`);
}

main().catch(err => {
    console.error("[reminder] Failed:", err);
    process.exit(1);
});
