import os
import json
import re

def parse_price(val):
    val = val.strip()
    if not val:
        return ""
    if val.startswith("¥") or val.startswith("\\"):
        return val + "（税込）"
    return f"¥{val}（税込）"

def map_category(cat):
    cat = cat.strip()
    if "内服" in cat:
        return "内服薬・サプリメント"
    elif "自己注射" in cat:
        return "自己注射"
    elif "ワクチン" in cat:
        return "予防接種"
    elif "注射" in cat or "点滴" in cat:
        return "美容注射・点滴"
    elif "健診" in cat:
        return "健康診断"
    elif "血液検査" in cat:
        return "血液検査"
    elif "画像" in cat or "生理" in cat:
        return "画像・生理検査"
    elif "書類" in cat:
        return "書類代"
    elif "診察" in cat:
        return "診察料"
    return "その他"

# 美容注射・点滴や主要な自由診療メニューの「謳い文句」と「施術詳細」の辞書
AESTHETIC_CONTENT = {
    "プラセンタ注射（メルスモン）": {
        "description": "美肌効果、エイジングケア、更年期障害の症状緩和、慢性的な疲労回復に優れたヒト胎盤エキス注射です。",
        "detail": "【期待できる効果】肌荒れ改善、シミ・シワの予防、新陳代謝の活性化、更年期症状の改善、冷え性改善。\n【所要時間】約5〜10分（筋肉注射）\n【推奨ペース】週1〜2回\n【副作用・注意点】注射部位の赤みや痛みが一時的に生じることがあります。特定生物由来製品（ヒト胎盤）を使用しているため、接種後は献血が行えなくなります。"
    },
    "プラセンタ注射（ラエンネック）": {
        "description": "肝機能の保護に加え、高いエイジングケア効果や抗酸化作用により、日々の活力をサポートする胎盤エキス注射です。",
        "detail": "【期待できる効果】疲労回復、免疫力の向上、自律神経の調整、美肌・美白作用、肩こりの軽減。\n【所要時間】約5〜10分（皮下または筋肉注射）\n【推奨ペース】週1〜2回\n【副作用・注意点】まれに発疹や注射部位の腫れが生じます。特定生物由来製品（ヒト胎盤）を使用しているため、接種後は献血が行えなくなります。"
    },
    "高濃度ビタミンＣ2000mg注射": {
        "description": "強力な抗酸化作用でメラニンの生成を抑え、シミやくすみを予防して透明感のある瑞々しい素肌へ導きます。",
        "detail": "【期待できる効果】美白作用（コラーゲン生成促進）、肌のハリ・弾力の向上、免疫力強化、疲労回復。\n【所要時間】約10分（静脈注射）\n【推奨ペース】週1回または隔週\n【副作用・注意点】静脈に沿った一時的な血管痛（のどの渇き等）を感じる場合があります。水分を多めに摂るようにしてください。"
    },
    "美白注射（ビタミンＣ2000mg＋トランサミン＋ビオチン＋αリポ酸）": {
        "description": "シミ・肝斑の予防に効果的なトランサミンと美髪・美肌をサポートする成分を網羅した、当院おすすめの美白スペシャル注射です。",
        "detail": "【期待できる効果】シミ・肝斑の改善、全身の美白・トーンアップ、ニキビや肌荒れの予防、アンチエイジング。\n【所要時間】約10〜15分（静脈注射または点滴）\n【推奨ペース】月2〜4回\n【副作用・注意点】一時的な血管痛、吐き気、胃部不快感などが生じる場合があります。血栓症の既往がある方は必ず事前にご相談ください。"
    },
    "白玉ハーフ注射（グルタチオン６００ｍｇ）": {
        "description": "海外でも人気の高い美白成分「グルタチオン」を適量配合。メラニンを抑え、くすみのない健康的な素肌を目指します。",
        "detail": "【期待できる効果】抗酸化作用、メラニンの生成抑制（日焼け予防・美白）、肌のトーンアップ、デトックス作用。\n【所要時間】約10分（静脈注射）\n【推奨ペース】週1回を数週間継続\n【副作用・注意点】血管痛、まれに吐き気、発疹など。気になる症状があればすぐに医師にお申し出ください。"
    },
    "白玉注射（グルタチオン１２００ｍｇ）": {
        "description": "グルタチオンを贅沢に1200mg配合。強力なデトックス作用と抗酸化作用で、全身の本格的な美白・美肌アプローチを行います。",
        "detail": "【期待できる効果】強力な美白作用（全身のトーンアップ）、シミ・色素沈着の改善、疲労回復、二日酔いの解消、肝機能改善。\n【所要時間】約10〜15分（静脈注射または点滴）\n【推奨ペース】週1回または隔週\n【副作用・注意点】高容量のため、まれに血管痛や頭痛が生じる場合があります。施術中はリラックスしてお受けいただけます。"
    },
    "αリポ酸（チオクト酸25ｍｇ）": {
        "description": "ビタミンC・Eの約400倍の抗酸化力。新陳代謝を劇的に促進し、ダイエット（脂肪燃焼）やむくみの改善をサポートします。",
        "detail": "【期待できる効果】代謝向上による脂肪燃焼促進、冷え性・むくみの改善、強い疲労の回復、アンチエイジング。\n【所要時間】約5分（静脈注射）\n【推奨ペース】週1〜2回（運動やダイエットとの併用がおすすめ）\n【副作用・注意点】注射部位の痛み、まれに低血糖症状（冷や汗、手震えなど）。インスリン異常のある方は事前にお知らせください。"
    },
    "アリナミン１００ｍｇ注射": {
        "description": "いわゆる「にんにく注射」です。高濃度のビタミンB1が体内に直接行き渡り、蓄積した疲労や肩こり、夏バテをリセットします。",
        "detail": "【期待できる効果】筋肉疲労の回復、慢性疲労の改善、肩こり・腰痛の軽減、夏バテ予防、冷え性改善。\n【所要時間】約5分（静脈注射）\n【推奨ペース】疲労を感じた時、または週1回程度\n【副作用・注意点】注入中、一時的ににんにくのような臭いを感じますが、周囲の人には臭いません（数分で消えます）。まれに血管痛。"
    },
    "ビオチン１ｍｇ注射": {
        "description": "「美髪・美肌ビタミン（ビタミンH）」をダイレクトに補給。髪のハリやコシの向上、肌荒れやアトピー性皮膚炎の緩和に役立ちます。",
        "detail": "【期待できる効果】髪や爪の健康維持（コラーゲン生成促進）、湿疹や肌荒れ・ニキビの改善、新陳代謝の促進。\n【所要時間】約5分（皮下または静脈注射）\n【推奨ペース】週1回\n【副作用・注意点】大きな副作用は極めてまれですが、一時的な皮膚の赤みや痒みが生じる場合があります。"
    },
    "エルカルチン注射": {
        "description": "脂肪を燃焼してエネルギーに変換する「L-カルニチン」を配合。運動効率を高め、無理のないウェイト管理と活力を応援します。",
        "detail": "【期待できる効果】脂肪代謝の促進（痩身サポート）、運動時のスタミナ向上、疲労回復、筋肉量の維持。\n【所要時間】約5〜10分（静脈注射）\n【推奨ペース】週1〜2回（有酸素運動の30分前が特に効果的）\n【副作用・注意点】軽度の胃腸障害、まれに頭痛が生じる場合があります。"
    },
    "アスコルビン酸５００ｍｇ注射": {
        "description": "手軽に摂れるビタミンC注射。日焼け後のアフターケアや、日常の免疫力アップ、肌荒れが気になる際におすすめです。",
        "detail": "【期待できる効果】抗酸化作用、メラニンの還元（シミくすみの改善）、免疫力向上。\n【所要時間】約5分（静脈注射）\n【推奨ペース】週1回\n【副作用・注意点】特になし。注入時の血管痛がまれにあります。"
    },
    "トラネキサム酸１０００ｍｇ注射": {
        "description": "抗炎症作用・抗プラスミン作用に優れ、女性特有の肌悩みである「肝斑（かんぱん）」の発生をブロックし、美白を支えます。",
        "detail": "【期待できる効果】肝斑・シミの改善、色素沈着の抑制、肌の赤みや炎症の鎮静。\n【所要時間】約5分（静脈注射）\n【推奨ペース】週1回\n【副作用・注意点】血栓症の既往がある方はご使用いただけません。ピルを内服中の方は医師にご相談ください。"
    },
    "リベルサス": {
        "description": "世界初の飲むGLP-1（経口薬）です。自然に食欲を抑え、食事量をコントロールすることでリバウンドの少ない医療ダイエットをサポートします。",
        "detail": "【期待できる効果】食欲抑制、満腹感の持続、内臓脂肪の減少、太りにくい体質への改善。\n【服用方法】1日1回、朝の空腹時にコップ半分の水（約120ml以下）で服用し、その後30分以上は飲食を避けてください。\n【副作用】服用初期に吐き気、胃のむくつき、便秘、下痢などの胃腸障害がみられることがあります（通常、数日〜数週間で自然に落ち着きます）。"
    },
    "マンジャロ": {
        "description": "週1回投与の最新GLP-1/GIP受容体作動薬（自己注射）です。脳に直接働きかけて強力に食欲を抑え、効率的な体重管理を実現します。",
        "detail": "【期待できる効果】強力な食欲抑制作用、内臓脂肪および皮下脂肪の減少、基礎代謝の維持サポート。\n【使用方法】週に1回、ご自身で太ももやお腹などに皮下注射を行っていただきます。極細の針が内蔵されたペン型注射器のため、痛みはほとんどありません。\n【副作用】吐き気、便秘、下痢、低血糖症状など。徐々に用量を調整し、安全に導入します。"
    }
}

def determine_group_and_status(title, category):
    unwanted_keywords = [
        "オンラインシステム料", "処方箋FAX代", "領収書再発行", 
        "オルカ 交通費", "点滴オプション", "ファックス代", "交通費"
    ]
    for kw in unwanted_keywords:
        if kw in title:
            return "非掲載", "非表示"
            
    # 自由診療系
    aesthetic_categories = ["美容注射・点滴", "自己注射", "内服薬・サプリメント", "予防接種"]
    if category in aesthetic_categories:
        if "定期" in title or "免除" in title:
            return "一般健診・書類", "非表示"
        return "自由診療", "表示中"
        
    # 一般健診・保険付随の自費
    general_categories = ["健康診断", "血液検査", "画像・生理検査", "書類代", "診察料"]
    if category in general_categories:
        return "一般健診・書類", "表示中"
        
    return "一般健診・書類", "表示中"

def parse():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    raw_path = os.path.join(base_dir, 'scratch', 'raw_master.txt')
    fallback_path = os.path.join(base_dir, 'src', 'data', 'menu_fallback.json')
    setup_js_path = os.path.join(base_dir, 'scratch', 'setup_private_services_spreadsheet.js')
    
    if not os.path.exists(raw_path):
        print(f"Error: {raw_path} not found.")
        return

    with open(raw_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    menu_list = []
    seen_keys = set()
    
    for line in lines:
        if not line.strip():
            continue
        parts = line.split('\t')
        if len(parts) < 6:
            continue
            
        raw_cat = parts[0]
        code = parts[3]
        title = parts[5].strip()
        raw_desc = parts[6].strip()
        price_raw = parts[11].strip() if len(parts) > 11 else ""
        
        # 999999円などは除外
        if "999999" in price_raw or "999,999" in price_raw:
            continue
            
        # 重複排除
        seen_key = f"{title}_{price_raw}"
        if seen_key in seen_keys:
            continue
        seen_keys.add(seen_key)
        
        category = map_category(raw_cat)
        price = parse_price(price_raw)
        
        # デフォルト説明文
        desc = re.sub(r'^マスタ変更可）', '', raw_desc)
        desc = re.sub(r'\s*\d+円$', '', desc)
        detail = ""
        
        # 美容・自由診療メニューの謳い文句・詳細マッピング
        matched_content = None
        for key, value in AESTHETIC_CONTENT.items():
            if key in title:
                matched_content = value
                break
                
        if matched_content:
            desc = matched_content["description"]
            detail = matched_content["detail"]
            
        group, status = determine_group_and_status(title, category)
        item_id = f"item_{code}"
        
        # おすすめ設定
        featured = False
        badge = ""
        if "プラセンタ" in title and "５回" not in title:
            featured = True
            badge = "おすすめ"
        elif "美白注射" in title:
            featured = True
            badge = "人気"
        elif "高濃度ビタミンＣ" in title:
            featured = True
            badge = "定番"
            
        menu_list.append({
            "status": status,
            "id": item_id,
            "group": group,
            "category": category,
            "title": title,
            "price": price,
            "description": desc,
            "detail": detail,
            "featured": featured,
            "badge": badge
        })
        
    print(f"Parsed {len(menu_list)} items with rich descriptions.")
    
    # 1. fallback JSONの書き出し
    with open(fallback_path, 'w', encoding='utf-8') as f:
        json.dump(menu_list, f, ensure_ascii=False, indent=2)
    print(f"Updated fallback JSON at {fallback_path}")

    # 2. setup_private_services_spreadsheet.js の初期値書き換え
    if os.path.exists(setup_js_path):
        with open(setup_js_path, 'r', encoding='utf-8') as f:
            js_content = f.read()
            
        # GASの配列形式
        gas_rows = []
        for item in menu_list:
            gas_rows.append([
                item["status"],
                item["id"],
                item["group"],
                item["category"],
                item["title"],
                item["price"],
                item["description"],
                item["detail"],
                item["featured"],
                item["badge"]
            ])
            
        js_rows_str = json.dumps(gas_rows, ensure_ascii=False, indent=4)
        
        pattern = r'(var initialMenu = )\[[\s\S]*?\];'
        replacement = f'var initialMenu = {js_rows_str};'
        new_js_content = re.sub(pattern, replacement, js_content)
        
        with open(setup_js_path, 'w', encoding='utf-8') as f:
            f.write(new_js_content)
        print(f"Updated setup script at {setup_js_path}")

if __name__ == "__main__":
    parse()
