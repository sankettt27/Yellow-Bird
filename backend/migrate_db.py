import sqlite3
import os

def migrate():
    if not os.path.exists('transport.db'):
        print("No local transport.db found — skipping SQLite migration.")
        return
    conn = sqlite3.connect('transport.db')
    cursor = conn.cursor()
    
    # bus_stops missing columns
    try:
        cursor.execute("ALTER TABLE bus_stops ADD COLUMN landmark TEXT")
    except Exception as e: print("landmark:", e)
    
    try:
        cursor.execute("ALTER TABLE bus_stops ADD COLUMN locality TEXT")
    except Exception as e: print("locality:", e)
    
    try:
        cursor.execute("ALTER TABLE bus_stops ADD COLUMN city TEXT")
    except Exception as e: print("city:", e)
    
    try:
        cursor.execute("ALTER TABLE bus_stops ADD COLUMN postal_code TEXT")
    except Exception as e: print("postal_code:", e)
    
    try:
        cursor.execute("ALTER TABLE bus_stops ADD COLUMN created_by TEXT")
    except Exception as e: print("created_by:", e)

    # routes missing columns
    try:
        cursor.execute("ALTER TABLE routes ADD COLUMN status VARCHAR(20) DEFAULT 'DRAFT'")
    except Exception as e: print("status:", e)
        
    try:
        cursor.execute("ALTER TABLE routes ADD COLUMN route_geometry TEXT")
    except Exception as e: print("route_geometry:", e)
        
    try:
        cursor.execute("ALTER TABLE routes ADD COLUMN version INTEGER DEFAULT 1")
    except Exception as e: print("version:", e)
        
    try:
        cursor.execute("ALTER TABLE routes ADD COLUMN created_by TEXT")
    except Exception as e: print("created_by (routes):", e)
        
    # route_stops missing columns
    try:
        cursor.execute("ALTER TABLE route_stops ADD COLUMN distance_from_prev_km REAL DEFAULT 0.0")
    except Exception as e: print("distance_from_prev_km:", e)

    try:
        cursor.execute("ALTER TABLE route_stops ADD COLUMN duration_from_prev_mins REAL DEFAULT 0.0")
    except Exception as e: print("duration_from_prev_mins:", e)
        
    conn.commit()
    conn.close()
    print("Migration finished!")

if __name__ == '__main__':
    migrate()
