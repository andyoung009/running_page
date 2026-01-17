#!/usr/bin/env python3
"""
修复 location_country 格式问题

问题分析：
1. 前端通过 location.split(',') 来解析 location_country
2. 前端期望格式：城市,省份,国家 或包含逗号分隔的格式
3. 当前数据格式：城市:省份（例如：呼和浩特:内蒙古自治区）
4. 缺少国家信息，导致前端无法正确渲染国家地图

解决方案：
将 location_country 格式从 "城市:省份" 改为 "城市,省份,中国"
这样前端可以正确提取：
- city: 城市
- province: 省份
- country: 中国
"""

import json
import sqlite3
import sys
import io
import os

# 确保 UTF-8 输出
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 获取项目根目录
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(os.path.dirname(current_dir))

SQL_FILE = os.path.join(project_root, "run_page", "data.db")
JSON_FILE = os.path.join(current_dir, "activities.json")


def fix_location_country_format(location_country):
    """
    修复 location_country 格式

    输入格式：
    - "城市:省份" (例如: "呼和浩特:内蒙古自治区")
    - Keep字典格式 (例如: "{'latitude': 40.847018, 'longitude': 111.683008, 'country': '中国', ...}")
    - 空字符串或None

    输出格式：
    - "城市,省份,中国" (例如: "呼和浩特,内蒙古自治区,中国")
    - 如果输入为空，返回空字符串
    """
    if not location_country or location_country == "":
        return ""

    # 检查是否是Keep的字典格式
    if location_country.startswith('{') and 'latitude' in location_country:
        try:
            import ast
            region = ast.literal_eval(location_country)
            city = region.get('city', '')
            province = region.get('province', '')

            # 保留城市名中的"市"后缀，前端需要它来匹配城市
            # 注意：不要移除"市"后缀，因为前端的extractCities函数需要它

            if city and province:
                return f"{city},{province},中国"
            elif province:
                return f"{province},中国"
            elif city:
                return f"{city},中国"
        except:
            pass

    # 如果已经包含逗号，说明格式可能已经正确，检查是否有国家信息
    if ',' in location_country:
        parts = location_country.split(',')
        # 如果最后一部分看起来像国家名（包含"国"字），则认为格式正确
        if len(parts) >= 2 and ('国' in parts[-1] or len(parts[-1]) > 1):
            return location_country
        # 否则添加国家信息
        return f"{location_country},中国"

    # 如果包含冒号，转换格式
    if ':' in location_country:
        # 将 "城市:省份" 转换为 "城市,省份,中国"
        location_country = location_country.replace(':', ',')
        return f"{location_country},中国"

    # 如果只有省份信息（包含"省"或"自治区"）
    if '省' in location_country or '自治区' in location_country:
        return f"{location_country},中国"

    # 其他情况，假设是城市名，添加中国
    return f"{location_country},中国"


def fix_database():
    """修复数据库中的 location_country 格式"""
    print(f"正在连接数据库: {SQL_FILE}")
    print("="*80)

    conn = sqlite3.connect(SQL_FILE)
    cursor = conn.cursor()

    # 获取所有需要修复的活动
    cursor.execute("""
        SELECT run_id, name, location_country
        FROM activities
        WHERE location_country IS NOT NULL AND location_country != ''
    """)

    activities = cursor.fetchall()
    print(f"找到 {len(activities)} 条包含位置信息的活动\n")

    updated_count = 0
    unchanged_count = 0

    for run_id, name, location_country in activities:
        # 修复格式
        new_location = fix_location_country_format(location_country)

        # 如果格式有变化，更新数据库
        if new_location != location_country:
            print(f"活动 {run_id} ({name}):")
            print(f"  原格式: {location_country}")
            print(f"  新格式: {new_location}")

            cursor.execute(
                'UPDATE activities SET location_country = ? WHERE run_id = ?',
                (new_location, run_id)
            )
            updated_count += 1
            print(f"  ✓ 已更新\n")
        else:
            unchanged_count += 1

    # 提交更改
    conn.commit()
    print("="*80)
    print(f"数据库更新完成:")
    print(f"  - 已更新: {updated_count} 条")
    print(f"  - 未变化: {unchanged_count} 条")
    print(f"  - 总计: {len(activities)} 条\n")

    conn.close()

    return updated_count


def regenerate_activities_json():
    """从数据库重新生成 activities.json"""
    print(f"正在从数据库生成 activities.json...")
    print("="*80)

    conn = sqlite3.connect(SQL_FILE)
    cursor = conn.cursor()

    # 获取所有活动数据
    cursor.execute("""
        SELECT run_id, name, distance, moving_time, type, subtype,
               start_date, start_date_local, location_country,
               summary_polyline, average_heartrate, average_speed, elevation_gain
        FROM activities
        WHERE distance > 0.1
        ORDER BY start_date_local
    """)

    activities = cursor.fetchall()
    conn.close()

    activity_list = []
    streak = 0
    last_date = None

    import datetime

    for activity in activities:
        (run_id, name, distance, moving_time, type_, subtype,
         start_date, start_date_local, location_country,
         summary_polyline, average_heartrate, average_speed, elevation_gain) = activity

        # 计算连续天数
        date = datetime.datetime.strptime(start_date_local, "%Y-%m-%d %H:%M:%S").date()
        if last_date is None:
            streak = 1
        elif date == last_date:
            pass
        elif date == last_date + datetime.timedelta(days=1):
            streak += 1
        else:
            streak = 1
        last_date = date

        # 构建活动字典
        activity_dict = {
            "run_id": run_id,
            "name": name,
            "distance": distance,
            "moving_time": moving_time,
            "type": type_,
            "subtype": subtype,
            "start_date": start_date,
            "start_date_local": start_date_local,
            "location_country": location_country,
            "summary_polyline": summary_polyline,
            "average_heartrate": average_heartrate,
            "average_speed": average_speed,
            "elevation_gain": elevation_gain,
            "streak": streak,
        }

        activity_list.append(activity_dict)

    # 写入 JSON 文件
    with open(JSON_FILE, "w", encoding="utf-8") as f:
        json.dump(activity_list, f, ensure_ascii=False)

    print(f"✓ 已生成 {len(activity_list)} 条活动数据到: {JSON_FILE}\n")

    # 显示一些示例
    print("修复后的 location_country 示例:")
    print("-"*80)
    for i, activity in enumerate(activity_list[:10]):
        location = activity.get("location_country", "")
        name = activity.get("name", "")
        if location:
            print(f"{i+1}. {name}: {location}")

    return len(activity_list)


def main():
    """主函数"""
    print("\n" + "="*80)
    print("location_country 格式修复工具")
    print("="*80 + "\n")

    print("步骤 1: 修复数据库中的 location_country 格式")
    print("-"*80)
    updated_count = fix_database()

    if updated_count > 0:
        print("\n步骤 2: 重新生成 activities.json")
        print("-"*80)
        regenerate_activities_json()

        print("\n" + "="*80)
        print("✓ 修复完成！")
        print("="*80)
        print("\n使用说明：")
        print("1. 数据库已更新，location_country 格式已修复")
        print("2. activities.json 已重新生成")
        print("3. 前端现在可以正确解析城市、省份和国家信息")
        print("4. 国家地图应该可以正常渲染了")
        print("\n格式说明：")
        print("  - 原格式: 城市:省份 (例如: 呼和浩特:内蒙古自治区)")
        print("  - 新格式: 城市,省份,中国 (例如: 呼和浩特,内蒙古自治区,中国)")
        print("\n前端解析结果：")
        print("  - city: 城市名")
        print("  - province: 省份名")
        print("  - country: 中国")
    else:
        print("\n" + "="*80)
        print("✓ 数据格式已经正确，无需修复")
        print("="*80)


if __name__ == "__main__":
    main()
