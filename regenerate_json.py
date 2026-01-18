#!/usr/bin/env python3
"""Regenerate activities.json from database (standalone version)"""

import json
import sqlite3
import sys
import io
import datetime

# Ensure UTF-8 output
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

SQL_FILE = "run_page/data.db"
JSON_FILE = "src/static/activities.json"


def load_activities_from_db():
    """Load activities from database and convert to list of dicts"""
    conn = sqlite3.connect(SQL_FILE)
    cursor = conn.cursor()

    # Get all activities with distance > 0.1, ordered by start_date_local
    cursor.execute(
        """
        SELECT run_id, name, distance, moving_time, type, subtype,
               start_date, start_date_local, location_country,
               summary_polyline, average_heartrate, average_speed, elevation_gain
        FROM activities
        WHERE distance > 0.1
        ORDER BY start_date_local
    """
    )

    activities = cursor.fetchall()
    conn.close()

    activity_list = []
    streak = 0
    last_date = None

    for activity in activities:
        (
            run_id,
            name,
            distance,
            moving_time,
            type_,
            subtype,
            start_date,
            start_date_local,
            location_country,
            summary_polyline,
            average_heartrate,
            average_speed,
            elevation_gain,
        ) = activity

        # Calculate streak
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

        # Build activity dict
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

    return activity_list


def regenerate_activities_json():
    """Regenerate activities.json from the database"""
    print(f"Loading activities from database: {SQL_FILE}")

    activities_list = load_activities_from_db()

    print(f"Loaded {len(activities_list)} activities")
    print(f"Writing to: {JSON_FILE}")

    with open(JSON_FILE, "w", encoding="utf-8") as f:
        json.dump(activities_list, f, ensure_ascii=False)

    print("✓ Successfully regenerated activities.json")

    # Show a few examples of location_country
    print("\nSample location_country values:")
    for i, activity in enumerate(activities_list[:10]):
        location = activity.get("location_country", "")
        name = activity.get("name", "")
        run_id = activity.get("run_id", "")
        if location:
            print(f"  {i+1}. [{run_id}] {name}: {location}")


if __name__ == "__main__":
    regenerate_activities_json()
