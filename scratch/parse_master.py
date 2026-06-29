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

def determine_group_and_status(title, category):
    # Web掲載に不適切な雑費等は非表示にする
    unwanted_keywords = [
        "オンラインシステム料", "処方箋FAX代", "領収書再発行", 
        "オルカ 交通費", "点滴オプション", "ファックス代", "交通費"
    ]
    for kw in unwanted_keywords:
        if kw in title:
            return "非掲載", "非表示"
            
    # 重複する診察料等は、片方を非表示に
    if "初診料" in title and "自己注射" in title and "自費" in title:
        # 重複排除のため
        pass

    # 自由診療系（美容・ウェルネス）
    aesthetic_categories = ["美容注射・点滴", "自己注射", "内服薬・サプリメント", "予防接種"]
    if category in aesthetic_categories:
        # 予防接種（定期）は自由診療ではなく公費/定期健診系なので除外または非表示
        if "定期" in title or "免除" in title:
            return "一般健診・書類", "非表示"
        return "自由診療", "表示中"
        
    # 一般健診・保険付随の自費・書類代
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
        
        # 説明文のクリーンアップ
        desc = re.sub(r'^マスタ変更可）', '', raw_desc)
        desc = re.sub(r'\s*\d+円$', '', desc)
        
        group, status = determine_group_and_status(title, category)
        item_id = f"item_{code}"
        
        # プラセンタ注射やビタミンC点滴などはデフォルトでおすすめに設定
        featured = False
        badge = ""
        if "プラセンタ" in title and "５回" not in title:
            featured = True
            badge = "おすすめ"
        elif "美白注射" in title:
            featured = True
            badge = "人気"
            
        menu_list.append({
            "status": status,
            "id": item_id,
            "group": group,
            "category": category,
            "title": title,
            "price": price,
            "description": desc,
            "detail": "",
            "featured": featured,
            "badge": badge
        })
        
    print(f"Parsed {len(menu_list)} items.")
    
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
