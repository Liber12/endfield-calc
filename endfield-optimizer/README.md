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

`solver.py` のモードは `balance` / `profit`。通常のCLI実行では同じリポジトリの現行Webデータをその場で変換します。旧データでの比較が必要な場合だけ `solver.py 武陵 balance --snapshot` を指定します。`recipe_tracer.py [アイテム名] [-f]` は材料・用途の追跡、`analyze_loops.py [地域]` は循環生産の分析です。設定は `config/`、ゲーム仕様の資料は `docs/` にあります。Web アプリへの実行環境の追加は不要です。

## データの管理

**現行Webデータ（リポジトリ v0.10.0 / ゲーム1.4系）をデフォルトで読みます。**
`src/data/` と `public/locales/ja/`、AIC設備上限、原料採集上限、地域固有レシピ、
触媒・ガス維持情報をPython向けに変換します。変換に必要な規則が見つからない場合は
黙って欠落させず失敗させます。

`data/master_data.json` は **v0.6.2の歴史的検証用スナップショット** です。
旧条件の回帰テスト（転送なし武陵: 1126.75券/分）は `--snapshot` 相当の
専用テストだけで保持しています。現在の収益目標値として利用しないでください。

別ファイルでデータを点検したい場合は以下で出力できます。

```powershell
endfield-optimizer/.venv/Scripts/python endfield-optimizer/src/master_converter.py --csv --output-dir endfield-optimizer/reports/data-preview
```

### 現行モデルの適用範囲と既知の制限

- **実装済み**: 採集上限と地域ごとの原料可用性、触媒の稼働率比例消費、ガス気化器の
  常時消費と台数近似、原料ポンプの処理能力・消費電力、地域別最低生産条件、
  AIC完了時の上限台数、整数設備、電力、廃棄物収支。
- **未対応 / 近似**: 研究未完了状態やオプション別施設解禁、13×13の実配置、
  複数レシピを同じ施設へ詰めるbin packing、拠点ごとの納品量上限・発展段階、
  在庫・物流トポロジー、原料供給のゲーム内物流・採取設備の詳細。
- **シナリオ依存**: `config/outpost_prices.csv` の納品単価と
  `config/optimizer_config.json` の転送設定は旧手入力値のため、ゲーム画面と
  照合するまで最新・正確と見なせません。
- **計算値の扱い**: `Optimal` は *このMILP近似モデル内* での最適解を意味し、
  ゲーム内の実現可能性や真の最大利益の証明ではありません。CLIもPREVIEWと表示します。

PythonとWebの計算目的は異なります。現時点では収益値が両者と一致することを
合格条件にせず、移植された各制約を単体テストと両地域の実データ求解で監視しています。

## 構成

- `src/`: データ変換、データアクセス、MILP モデル、レポート、CLI。
- `config/`: 地域別資源供給、価格、発電、施設上限、転送設定。
- `data/`: 移行時の検証済みデータ。
- `docs/`: ゲーム仕様と既存の課題・ロードマップ。
- `tests/`: 最適解・電力収支・既知収益の回帰テストと、リポジトリ内データの変換テスト。

仮想環境、キャッシュ、実行ログ、生成レポートは Git 管理から除外します。
