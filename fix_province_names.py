#!/usr/bin/env python3
"""
修复省份名称格式 - 添加"省"后缀

问题：前端正则表达式只匹配以"省"或"自治区"结尾的省份名
解决：为所有省份名添加正确的后缀
"""

import sqlite3
import sys
import io

# 确保 UTF-8 输出
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

SQL_FILE = "run_page/data.db"

# 省份名称映射：将简称改为全称
PROVINCE_NAME_MAP = {
    "浙江": "浙江省",
    "河北": "河北省",
    "陕西": "陕西省",
    # 天津市、内蒙古自治区已经是正确格式，不需要修改
}


def fix_province_names():
    """修复省份名称，添加"省"后缀"""
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
        new_location = location_country

        # 检查是否需要替换省份名
        for short_name, full_name in PROVINCE_NAME_MAP.items():
            if f",{short_name}," in location_country:
                new_location = location_country.replace(
                    f",{short_name},", f",{full_name},"
                )
                break

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
            print("  ✓ 已更新\n")

    # 提交更改
    conn.commit()
    print("=" * 80)
    print("数据库更新完成:")
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
    print("省份名称格式修复工具")
    print("=" * 80 + "\n")

    updated = fix_province_names()

    if updated > 0:
        print("\n" + "=" * 80)
        print("✓ 修复完成！")
        print("=" * 80)
        print("\n说明：")
        print("已将省份简称改为全称，以匹配前端的正则表达式。")
        print('前端使用正则表达式匹配省份名，要求省份名必须以"省"或"自治区"结尾。')
        print("\n修改内容：")
        print("  - 浙江 → 浙江省")
        print("  - 河北 → 河北省")
        print("  - 陕西 → 陕西省")
        print("\n下一步：")
        print("1. 运行 python regenerate_json.py 重新生成 activities.json")
        print("2. 重启前端: npm run dev 或 run_all.bat")
        print("3. 清除浏览器缓存")
        print("4. 查看地图，应该能看到所有省份了")
    else:
        print("\n" + "=" * 80)
        print("✓ 数据格式已经正确，无需修复")
        print("=" * 80)
