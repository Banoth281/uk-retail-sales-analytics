from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "uk_retail_sales.csv"
OUTPUT_DIR = ROOT / "outputs" / "python_charts"


def load_and_validate() -> pd.DataFrame:
    df = pd.read_csv(DATA_PATH, parse_dates=["Order Date"])
    assert not df.empty, "Dataset is empty"
    assert df["Order ID"].is_unique, "Duplicate Order IDs found"
    assert not df.isna().any().any(), "Null values found"
    assert (df[["Quantity", "Unit Price", "Revenue", "Profit"]] >= 0).all().all()
    return df


def print_kpis(df: pd.DataFrame) -> None:
    revenue = df["Revenue"].sum()
    profit = df["Profit"].sum()
    print(f"Orders: {len(df):,}")
    print(f"Revenue: £{revenue:,.2f}")
    print(f"Profit: £{profit:,.2f}")
    print(f"Profit margin: {profit / revenue:.1%}")
    print(f"Average order value: £{df['Revenue'].mean():,.2f}")
    print(f"Return rate: {(df['Returned'] == 'Yes').mean():.1%}")


def create_charts(df: pd.DataFrame) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    sns.set_theme(style="whitegrid")

    monthly = df.groupby("Month", as_index=False)[["Revenue", "Profit"]].sum()
    fig, ax = plt.subplots(figsize=(12, 5))
    ax.plot(monthly["Month"], monthly["Revenue"], marker="o", label="Revenue")
    ax.plot(monthly["Month"], monthly["Profit"], marker="o", label="Profit")
    ax.set_title("Monthly Revenue and Profit")
    ax.set_ylabel("GBP")
    ax.tick_params(axis="x", rotation=60)
    ax.legend()
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / "monthly_performance.png", dpi=160)
    plt.close(fig)

    regional = df.groupby("Region", as_index=False)["Profit"].sum().sort_values("Profit")
    fig, ax = plt.subplots(figsize=(9, 5))
    sns.barplot(data=regional, x="Profit", y="Region", color="#2A9D8F", ax=ax)
    ax.set_title("Profit by UK Region")
    ax.set_xlabel("Profit (GBP)")
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / "regional_profit.png", dpi=160)
    plt.close(fig)

    category = df.groupby("Category", as_index=False)["Revenue"].sum().sort_values("Revenue", ascending=False)
    fig, ax = plt.subplots(figsize=(9, 5))
    sns.barplot(data=category, x="Revenue", y="Category", color="#176B87", ax=ax)
    ax.set_title("Revenue by Product Category")
    ax.set_xlabel("Revenue (GBP)")
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / "category_revenue.png", dpi=160)
    plt.close(fig)


if __name__ == "__main__":
    sales = load_and_validate()
    print_kpis(sales)
    create_charts(sales)
    print(f"Charts saved to {OUTPUT_DIR}")

