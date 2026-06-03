/**
 * 家計簿アプリからダウンロードした CSV を data/inbox/ に取り込む。
 *
 * ファイル名パターンと取り込み先は config.json の `csv` で定義する
 * （config.example.json をコピーして config.json を作成）。
 * デフォルトはマネーフォワード ME のファイル名（収入・支出詳細_…）に対応。
 *
 * ファイル名から年月が取れる場合は data/inbox/YYYY-MM.csv に正規化して保存する。
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

type Config = {
    csv?: {
        downloadsDir?: string;
        filePattern?: string;
        yearGroup?: number;
        monthGroup?: number;
    };
};

function expandHome(p: string): string {
    return p.startsWith("~") ? resolve(homedir(), p.slice(1).replace(/^[/\\]/, "")) : resolve(p);
}

function loadConfig(): Config {
    const path = resolve(process.cwd(), "config.json");
    if (!existsSync(path)) {
        console.log(
            "[import-csv] config.json が無いため既定値（マネーフォワード ME 形式・~/Downloads）で動作します。"
        );
        return {};
    }
    try {
        return JSON.parse(readFileSync(path, "utf-8")) as Config;
    } catch (e) {
        console.warn("[import-csv] config.json の読み込みに失敗。既定値で続行します。", e);
        return {};
    }
}

function main(): void {
    const config = loadConfig();
    const csv = config.csv ?? {};
    const downloadsDir = expandHome(csv.downloadsDir ?? "~/Downloads");
    const pattern = new RegExp(
        csv.filePattern ?? "^収入・支出詳細_(\\d{4})-(\\d{2})-\\d{2}_\\d{4}-\\d{2}-\\d{2}\\.csv$"
    );
    const yearGroup = csv.yearGroup ?? 1;
    const monthGroup = csv.monthGroup ?? 2;

    const inbox = resolve(process.cwd(), "data", "inbox");
    if (!existsSync(inbox)) mkdirSync(inbox, { recursive: true });

    if (!existsSync(downloadsDir)) {
        console.log(`[import-csv] ダウンロードフォルダが見つかりません: ${downloadsDir}`);
        return;
    }

    // 同じ月の CSV が複数あれば mtime の新しい方を最後に処理して上書きで残す。
    const candidates = readdirSync(downloadsDir)
        .filter(f => pattern.test(f))
        .map(f => ({ name: f, mtime: statSync(resolve(downloadsDir, f)).mtimeMs }))
        .sort((a, b) => a.mtime - b.mtime);

    if (candidates.length === 0) {
        console.log(`[import-csv] 取り込み対象の CSV はありません（${downloadsDir}）。`);
        return;
    }

    for (const { name } of candidates) {
        const match = name.match(pattern);
        const year = match?.[yearGroup];
        const month = match?.[monthGroup];
        const destName = year && month ? `${year}-${month}.csv` : name;
        const dest = resolve(inbox, destName);
        renameSync(resolve(downloadsDir, name), dest);
        console.log(`[import-csv] ${name} → data/inbox/${destName}`);
    }
}

main();
