#!/usr/bin/env python3
"""
修复 location_country 格式 - 添加"市"后缀以匹配前端

前端的 extractCities 函数使用正则表达式：
/([\u4e00-\u9fa5]{2,}(市|自治州|特别行政区|盟|地区))/g

这意味着城市名必须以"市"、"自治州"等结尾才能被识别。
所以我们需要确保数据中的城市名包含"市"后缀。
"""

import sqlite3
import sys
import io

# 确保 UTF-8 输出
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

SQL_FILE = "run_page/data.db"

# 城市名称映射：将没有"市"后缀的城市名添加"市"
CITY_SUFFIX_MAP = {
    "呼和浩特": "呼和浩特市",
    "杭州": "杭州市",
    "天津": "天津市",
    "石家庄": "石家庄市",
    "榆林": "榆林市",
    "鄂尔多斯": "鄂尔多斯市",
}


def add_city_suffix(location_country):
    """为城市名添加"市"后缀"""
    if not location_country or "," not in location_country:
        return location_country

    parts = location_country.split(",")
    if len(parts) >= 2:
        city = parts[0].strip()

        # 如果城市在映射表中，替换为带"市"后缀的版本
        if city in CITY_SUFFIX_MAP:
            parts[0] = CITY_SUFFIX_MAP[city]
            return ",".join(parts)

    return location_country


def fix_database():
    """修复数据库中的城市名称，添加"市"后缀"""
    print(f"正在连接数据库: {SQL_FILE}")
    print("=" * 80)

    conn = sqlite3.connect(SQL_FILE)
    cursor = conn.cursor()

    # 获取所有需要修复的活动
    cursor.execute(
        """
        SELECT run_id, name, location_country
        FROM activities
        WHERE location_country IS NOT NULL AND location_country != ''
    """
    )

    activities = cursor.fetchall()
    print(f"找到 {len(activities)} 条包含位置信息的活动\n")

    updated_count = 0

    for run_id, name, location_country in activities:
        # 添加"市"后缀
        new_location = add_city_suffix(location_country)

        # 如果格式有变化，更新数据库
        if new_location != location_country:
            print(f"活动 {run_id} ({name}):")
            print(f"  原格式: {location_country}")
            print(f"  新格式: {new_location}")

            cursor.execute(
                "UPDATE activities SET location_country = ? WHERE run_id = ?",
                (new_location, run_id),
            )
            updated_count += 1
            print(f"  ✓ 已更新\n")

    # 提交更改
    conn.commit()
    print("=" * 80)
    print(f"数据库更新完成:")
    print(f"  - 已更新: {updated_count} 条")
    print(f"  - 总计: {len(activities)} 条\n")

    # 显示更新后的统计
    cursor.execute(
        """
        SELECT location_country, COUNT(*) as count
        FROM activities
        WHERE location_country IS NOT NULL
        GROUP BY location_country
        ORDER BY count DESC
    """
    )

    results = cursor.fetchall()
    print("更新后的城市分布:")
    print("-" * 80)
    for location, count in results:
        print(f"{location}: {count}条")

    conn.close()

    return updated_count


if __name__ == "__main__":
    print("\n" + "=" * 80)
    print('添加城市"市"后缀修复工具')
    print("=" * 80 + "\n")

    updated = fix_database()

    if updated > 0:
        print("\n" + "=" * 80)
        print("✓ 修复完成！")
        print("=" * 80)
        print("\n说明：")
        print('已为城市名添加"市"后缀，以匹配前端的 extractCities 函数。')
        print('前端使用正则表达式匹配城市名，要求城市名必须以"市"结尾。')
        print("\n下一步：")
        print("1. 运行 python regenerate_json.py 重新生成 activities.json")
        print("2. 启动前端查看效果: npm run dev")
    else:
        print("\n" + "=" * 80)
        print("✓ 数据格式已经正确，无需修复")
        print("=" * 80)
