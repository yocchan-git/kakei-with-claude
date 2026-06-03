# kakei-with-claude 🪙

**Claude Code と対話しながら家計を回す、予実管理のテンプレートです。**
月初に予算を立て、週の終わりに「使いすぎ / 余り」をチェックして翌週を微調整する ── これを Claude Code が代行・伴走します。アプリのインストールや表計算は不要。エンジニアでなくても使えます。

---

## 🚀 使い始める（コピペするだけ・約5分）

### 1. このリポジトリを取り込む

ターミナル（Mac なら「ターミナル.app」）に、次の1行を貼り付けて実行してください：

```bash
git clone https://github.com/yocchan-git/kakei-with-claude.git && cd kakei-with-claude && claude
```

> [Claude Code](https://claude.com/claude-code) が未インストールなら、先に `npm install -g @anthropic-ai/claude-code` を実行してください。

### 2. Claude Code が開いたら、次の文をそのまま貼り付ける

```
このリポジトリのセットアップをしてください。私は非エンジニアです。
通知設定・カレンダー連携・目標設定・初月の予算づくりまで、
あなたが代行できるものは代行し、私の操作が要る部分だけ手順を案内してください。 /setup
```

あとは Claude の案内どおりに進めるだけ。**コマンドを覚える必要はありません。** 通知先（Discord など）の準備も、予算づくりも、Claude が手取り足取り進めます。

---

## これは何？

- **月初に予算を立てる**（カテゴリ別 ＋ 週ごとの配分）
- **週に1回、Claude Code 上で対話しながら予実チェック** → ズレがあれば翌週以降の予算に反映、赤字傾向なら改善、黒字なら継続
- **データは Markdown ＋ JSON**。あなたの手元に残り、いつでも自分で読める（特定アプリに縛られない）
- **自動化は「リマインドだけ」**。お金の判断は Claude との対話で行う（勝手な自動操作はしない）

## 運用フロー

```
■ 月初（毎月1日ごろ）
  通知が届く → 家計簿アプリで前月CSVをダウンロード → Claude Code で /month-start
    → Claude が前月を振り返り、今月の予算を対話で作成

■ 週次（7日 / 14日 / 21日 / 月末日）
  通知が届く → 当月CSVをダウンロード → Claude Code で /weekly
    → Claude が実績を集計・予実突合し、振り返りと翌週調整を提案
```

## 週の区切り

月をまたがないルールで、月ごとに予実を締めます：

| 週 | 日付範囲 |
| --- | --- |
| Week1 | 1日〜7日 |
| Week2 | 8日〜14日 |
| Week3 | 15日〜21日 |
| Week4 | 22日〜月末（7日超もあり／最終調整の週） |

## データ設計

家計データはすべて `data/` の中に置かれます（`.gitignore` 済みで GitHub には上がりません）。

```
data/
├── months/YYYY-MM.md      # 月ごとの予算＋実績＋状態（ダッシュボード）
├── inbox/                 # 家計簿アプリの CSV 置き場（自動取込先）
├── balances.json          # 月末残高の履歴（append-only）
└── TARGETS.md             # 月の手取り収入・目標貯蓄率
```

### 月次予実ファイル `data/months/YYYY-MM.md`

1ヶ月1ファイルのダッシュボード型。月初に `/month-start` で予算を作り、毎週の `/weekly` で実績・差分を同じファイルに追記更新します。フォーマットは [`data/months/EXAMPLE-2026-01.md`](data/months/EXAMPLE-2026-01.md) を参照（カテゴリ別予算 / カテゴリ別予実 / 週別予実 / メモ の4セクション）。

- 数値は整数（円）。状態の凡例: 🟢 余裕 / 🟡 注意 / 🔴 超過
- カテゴリ名は自由。少なく始めて、続けながら調整するのがコツ

### 残高ファイル `data/balances.json`

月末時点の口座残高スナップショット（月初に追記）。形式は [`data/balances.example.json`](data/balances.example.json) を参照。

## 通知（送信先は差し替え式）

リマインダーの送信先は `.env` の `NOTIFY_PROVIDER` で選べます。

| provider | 設定する環境変数 | 備考 |
| --- | --- | --- |
| `discord`（既定・推奨） | `DISCORD_WEBHOOK_URL` | トークン不要。Webhook URL を貼るだけ |
| `slack` | `SLACK_WEBHOOK_URL` | Incoming Webhook |
| `chatwork` | `CHATWORK_API_TOKEN` / `CHATWORK_ROOM_ID` | |
| `console` | （不要） | 画面に出力するだけ |

送信先が未設定でもエラーにはならず、画面出力にフォールバックします（まず動く）。

手動テスト：

```bash
npm run reminder:weekly -- --force      # 日付判定をスキップして即送信
```

## リマインダーの自動化（任意）

「毎日決まった時刻に締め日チェックを走らせる」設定です。どれか1つでOK。

### cron（Mac / Linux）

```cron
# 週次: 毎日21時に締め日判定（7/14/21/月末のみ送信）
0 21 * * *  cd /path/to/kakei-with-claude && npm run reminder:weekly
# 月初: 毎月1日9時
0 9 1 * *   cd /path/to/kakei-with-claude && npm run reminder:month-start
```

### GitHub Actions（PC を起動していなくても動く）

`.github/workflows/` にスケジュール実行の workflow を追加し、通知の secret（`DISCORD_WEBHOOK_URL` 等）をリポジトリの Secrets に登録すれば、クラウド側でリマインドできます。

> macOS の `launchd` を使う方法もあります。設定で迷ったら Claude Code に「リマインダーを毎日21時に自動実行したい」と相談してください。

## カスタマイズ

- **家計簿アプリを変えたい**: `config.json` の `csv.filePattern`（ファイル名の正規表現）を差し替え。既定はマネーフォワード ME 形式。Claude に CSV のファイル名を見せれば設定してくれます。
- **カテゴリを変えたい**: `/month-start` の対話で調整するか、`data/months/*.md` を直接編集。

## ライセンス

[MIT](LICENSE)

## コントリビューション

Issue / PR 歓迎です。`main` ブランチは保護されており、変更はレビュー承認を経てマージされます。
