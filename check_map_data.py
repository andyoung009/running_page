#!/usr/bin/env python3
"""检查各城市的地图数据（polyline）情况"""

import sys
import io
import sqlite3

# 确保 UTF-8 输出
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

conn = sqlite3.connect("run_page/data.db")
cursor = conn.cursor()

# 检查各城市的地图数据
cursor.execute(
    """
    SELECT
        location_country,
        COUNT(*) as total_count,
        COUNT(CASE WHEN summary_polyline IS NOT NULL AND summary_polyline != '' THEN 1 END) as with_polyline,
        COUNT(CASE WHEN summary_polyline IS NULL OR summary_polyline = '' THEN 1 END) as without_polyline
    FROM activities
    WHERE location_country IS NOT NULL
    GROUP BY location_country
    ORDER BY total_count DESC
"""
)

results = cursor.fetchall()

print("各城市的地图数据统计:")
print("=" * 100)
print(
    f'{"城市":<35} {"总活动数":>10} {"有地图数据":>12} {"无地图数据":>12} {"地图覆盖率":>12}'
)
print("-" * 100)

for location, total, with_poly, without_poly in results:
    coverage = f"{(with_poly/total*100):.1f}%" if total > 0 else "0%"
    print(
        f"{location:<35} {total:>10} {with_poly:>12} {without_poly:>12} {coverage:>12}"
    )

print("=" * 100)

# 检查每个城市的第一条活动的详细信息
print("\n每个城市的示例活动详情:")
print("=" * 100)

cursor.execute(
    """
    SELECT DISTINCT location_country FROM activities WHERE location_country IS NOT NULL
"""
)
cities = cursor.fetchall()

for (city,) in cities:
    cursor.execute(
        """
        SELECT run_id, name, summary_polyline
        FROM activities
        WHERE location_country = ?
        LIMIT 1
    """,
        (city,),
    )

    result = cursor.fetchone()
    if result:
        run_id, name, polyline = result
        has_polyline = "有" if polyline and polyline != "" else "无"
        polyline_preview = (
            polyline[:50] + "..."
            if polyline and len(polyline) > 50
            else (polyline if polyline else "")
        )

        print(f"\n城市: {city}")
        print(f"  示例活动ID: {run_id}")
        print(f"  活动名称: {name}")
        print(f"  地图数据: {has_polyline}")
        if polyline_preview:
            print(f"  Polyline预览: {polyline_preview}")

conn.close()
