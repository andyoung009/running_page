#!/usr/bin/env python3
"""统计activities.json中的城市、省份和国家分布"""

import json
import sys
import io

# 确保 UTF-8 输出
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

# 读取 activities.json
with open("src/static/activities.json", encoding="utf-8") as f:
    data = json.load(f)

cities = {}
countries = set()
provinces = set()

for activity in data:
    location = activity.get("location_country", "")
    if location and "," in location:
        parts = location.split(",")
        if len(parts) >= 3:
            city = parts[0].strip()
            province = parts[1].strip()
            country = parts[2].strip()

            if city:
                cities[city] = cities.get(city, 0) + 1
            if province:
                provinces.add(province)
            if country:
                countries.add(country)

print("=" * 80)
print("最终统计结果")
print("=" * 80)

print(f"\n国家数量: {len(countries)}")
print(f"国家列表: {list(countries)}")

print(f"\n省份数量: {len(provinces)}")
print(f"省份列表: {sorted(provinces)}")

print(f"\n城市数量: {len(cities)}")
print("\n城市分布（按活动数量排序）:")
for city, count in sorted(cities.items(), key=lambda x: x[1], reverse=True):
    print(f"  {city}: {count}条")

print(f"\n总活动数: {len(data)}条")
print("=" * 80)
