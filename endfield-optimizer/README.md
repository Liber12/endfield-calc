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

**現行Webデータ（リポジトリ v0.10.0 / 工業仕様の抽出元はゲーム1.4系）をデフォルトで読みます。**
**拠点経済の基本値は2026-10-10時点のゲームVer.1.5相当**を `config/outposts_1_5.json` から読みます。
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
  AIC完了時の上限台数、整数設備、電力、廃棄物収支、2026年10月時点の
  6拠点ごとの販売解放Lvと取引券の基礎補充量、転送元・品目・TTV消費量。
- **未対応 / 近似**: 研究未完了状態やオプション別施設解禁、13×13の実配置、
  複数レシピを同じ施設へ詰めるbin packing、拠点の貯蓄済み残高と売却時点・
  ボーナス込みの時間変動、在庫・物流トポロジー、原料供給のゲーム内物流・採取設備の詳細。
- **シナリオ依存**: 取引単価は `config/outpost_prices.csv` の従来手入力値を
  引き継ぎ、壌晶雨発生施設の7品だけを2026年10月時点の資料で追加しました。
  拠点ごとの基礎補充量と上限残高は `config/outposts_1_5.json` に出典付きで保存。
  転送可能品目とTTVコストは現行 `src/data/metastorage.ts` から再生成します。
- **計算値の扱い**: `Optimal` は *このMILP近似モデル内* での最適解を意味し、
  ゲーム内の実現可能性や真の最大利益の証明ではありません。CLIもPREVIEWと表示します。

### Ver.1.5 持続可能な拠点取引のモデル

納品量をまとめて最高単価の拠点に割り当てる旧モデルは利用しません。
`profit` / `balance` は商品ごとに「どの拠点に何個/分で納品するか」も
最適化し、**各拠点の収入 `Σ(販売数/分 × 単価)` を、券の補充量/分以下**
に制約します。複数拠点に同じ商品がある場合も、各拠点へ分けて販売します。

初期値は**6拠点とも解放・発展段階4（最大レベル）、防衛・連絡員ボーナスなし**
というシナリオです。全拠点の券の基礎補充量を足した持続収入の理論上限は
**武陵 1,280.00券/分 / 四号谷地 1,525.00券/分**です。
この値はレシピ・施設・物流条件を満たした**実現可能な最適収入の保証ではありません**。
施設の実配置・保管残高・ゲーム内進捗で変わります。

例: 壌晶雨発生施設を未解放として扱うには
`optimizer_config.json` に `"outpost_levels": {"壌晶雨発生施設": 0}`
を追加します（1～4は発展レベル）。各拠点ごとにレベルを設定できます。

参考資料:
- 公式Ver.1.5「雪氷の幽夢」更新：https://endfield.hypergryph.com/news/2653
- 拠点の基礎収益、商品、段階：https://endfield.wiki.gg/wiki/Outpost
- 新拠点「Xiranflow Cloudseeder Station」：https://endfield.wiki.gg/wiki/Xiranflow_Cloudseeder_Station

**Ver.1.5 資源差分:** 自動生成されたWeb側の `src/data/raw-caps.ts` は
ゲーム1.4系の値を含みます。Pythonソルバーでは
`config/raw_caps_1_5.json` の検証済み差分を重ね、武陵の
**赤銅鉱石420→510個/分 / 息壌ガス100→150個/分** を適用します。
ゲームVer.1.5で武陵の地域建設レベル上限は27に拡張されました。
上記数量は地域建設Lv24以上・新エリア解放と全採集地点の設置を前提とします。
元データが更新されたときは期待旧値を検査し、未知の差分があれば例外にします。
その他の未検証のVer.1.5鉱脈・設備データは現行Webの値を引き継ぎます。

根拠： https://sayo-nyaa.tistory.com/1943 /
https://endfieldhub.org/guides/endgame-blueprints-part-13

PythonとWebの計算目的は異なります。現時点では収益値が両者と一致することを
合格条件にせず、移植された各制約を単体テストと両地域の実データ求解で監視しています。

## 構成

- `src/`: データ変換、データアクセス、MILP モデル、レポート、CLI。
- `config/`: 地域別資源供給、価格、発電、施設上限、転送設定。
- `data/`: 移行時の検証済みデータ。
- `docs/`: ゲーム仕様と既存の課題・ロードマップ。
- `tests/`: 最適解・電力収支・既知収益の回帰テストと、リポジトリ内データの変換テスト。

仮想環境、キャッシュ、実行ログ、生成レポートは Git 管理から除外します。
