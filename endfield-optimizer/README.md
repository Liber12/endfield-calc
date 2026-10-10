# Endfield Factory Optimizer

エンドフィールドの生産計画を、資源・電力・施設数の制約のもとで最適化する Python CLI です。Web 計算機と同じリポジトリで管理し、地域ごとの納品利益、設備構成、循環レシピ、材料の用途を分析します。

## セットアップと実行

Python 3.13 を推奨します。以下はリポジトリ直下から実行します。

```powershell
python -m venv endfield-optimizer/.venv
endfield-optimizer/.venv/Scripts/python -m pip install -r endfield-optimizer/requirements.txt
endfield-optimizer/.venv/Scripts/python endfield-optimizer/src/solver.py 武陵 balance
endfield-optimizer/.venv/Scripts/python endfield-optimizer/tests/smoke_test.py
```

macOS / Linux では Python のパスを `endfield-optimizer/.venv/bin/python` に置き換えます。

`solver.py` のモードは `balance` / `profit`。`recipe_tracer.py [アイテム名] [-f]` は材料・用途の追跡、`analyze_loops.py [地域]` は循環生産の分析です。設定は `config/`、ゲーム仕様の資料は `docs/` にあります。Web アプリへの実行環境の追加は不要です。

## データの管理

今回移行した `data/master_data.json` と参照 CSV は、元プロジェクトの v0.6.2 データに基づく検証済みスナップショットです。既存の回帰テスト（転送なし武陵 balance: 1126.75 券/分）を維持しています。手編集せず、データ更新と地域設定・モデルの検証を一緒に行ってください。

データ変換処理の標準参照先は、このリポジトリの `src/data/` と `public/locales/ja/` です。最新データを別ディレクトリへ生成し、先に比較できます。

```powershell
endfield-optimizer/.venv/Scripts/python endfield-optimizer/src/master_converter.py --csv --output-dir endfield-optimizer/reports/data-preview
```

`--output-dir` を省略すると `data/` を上書きします。`--source-root PATH` で別の計算機チェックアウトを指定できます。現在の計算機データは読み込み可能ですが、v0.10.0 で再生成したデータでは既知の収益値は再現しません。新しいガス・触媒・地域設備などの制約は Python モデルにまだ取り込んでいないため、新データでの収益を検証済み結果として扱わないでください。今回の移行では元の最適化モデルを維持しています。

## 構成

- `src/`: データ変換、データアクセス、MILP モデル、レポート、CLI。
- `config/`: 地域別資源供給、価格、発電、施設上限、転送設定。
- `data/`: 移行時の検証済みデータ。
- `docs/`: ゲーム仕様と既存の課題・ロードマップ。
- `tests/`: 最適解・電力収支・既知収益の回帰テストと、リポジトリ内データの変換テスト。

仮想環境、キャッシュ、実行ログ、生成レポートは Git 管理から除外します。
