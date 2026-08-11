from pathlib import Path
import sqlite3

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "uk_retail_sales.csv"
DB_PATH = ROOT / "outputs" / "uk_retail_sales.db"

df = pd.read_csv(DATA_PATH)
df.columns = [column.strip().lower().replace(" ", "_") for column in df.columns]
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

with sqlite3.connect(DB_PATH) as connection:
    df.to_sql("retail_sales", connection, if_exists="replace", index=False)
    connection.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_order_id ON retail_sales(order_id)")
    connection.execute("CREATE INDEX IF NOT EXISTS idx_month ON retail_sales(month)")

print(f"Loaded {len(df):,} rows into {DB_PATH}")

