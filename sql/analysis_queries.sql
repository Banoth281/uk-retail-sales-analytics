-- UK Retail Sales & Customer Insights
-- Run against outputs/uk_retail_sales.db after executing python/load_sqlite.py

-- 1. Executive KPI summary
SELECT
    COUNT(*) AS orders,
    ROUND(SUM(revenue), 2) AS total_revenue,
    ROUND(SUM(profit), 2) AS total_profit,
    ROUND(SUM(profit) * 100.0 / NULLIF(SUM(revenue), 0), 2) AS profit_margin_pct,
    ROUND(AVG(revenue), 2) AS average_order_value,
    ROUND(AVG(rating), 2) AS average_rating
FROM retail_sales;

-- 2. Monthly revenue growth
WITH monthly AS (
    SELECT month, SUM(revenue) AS revenue, SUM(profit) AS profit
    FROM retail_sales
    GROUP BY month
), growth AS (
    SELECT
        month,
        revenue,
        profit,
        LAG(revenue) OVER (ORDER BY month) AS previous_month_revenue
    FROM monthly
)
SELECT
    month,
    ROUND(revenue, 2) AS revenue,
    ROUND(profit, 2) AS profit,
    ROUND((revenue - previous_month_revenue) * 100.0 /
          NULLIF(previous_month_revenue, 0), 2) AS revenue_growth_pct
FROM growth
ORDER BY month;

-- 3. Region ranking
SELECT
    region,
    COUNT(*) AS orders,
    ROUND(SUM(revenue), 2) AS revenue,
    ROUND(SUM(profit), 2) AS profit,
    RANK() OVER (ORDER BY SUM(profit) DESC) AS profit_rank
FROM retail_sales
GROUP BY region
ORDER BY profit_rank;

-- 4. Category profitability
SELECT
    category,
    COUNT(*) AS orders,
    ROUND(SUM(revenue), 2) AS revenue,
    ROUND(SUM(profit), 2) AS profit,
    ROUND(SUM(profit) * 100.0 / NULLIF(SUM(revenue), 0), 2) AS margin_pct
FROM retail_sales
GROUP BY category
ORDER BY profit DESC;

-- 5. Channel performance
SELECT
    channel,
    COUNT(*) AS orders,
    ROUND(SUM(revenue), 2) AS revenue,
    ROUND(AVG(revenue), 2) AS average_order_value,
    ROUND(AVG(rating), 2) AS average_rating
FROM retail_sales
GROUP BY channel
ORDER BY revenue DESC;

-- 6. Return risk by discount band
SELECT
    CASE
        WHEN discount = 0 THEN 'No discount'
        WHEN discount <= 0.10 THEN '1-10%'
        ELSE '11-20%'
    END AS discount_band,
    COUNT(*) AS orders,
    SUM(CASE WHEN returned = 'Yes' THEN 1 ELSE 0 END) AS returned_orders,
    ROUND(100.0 * SUM(CASE WHEN returned = 'Yes' THEN 1 ELSE 0 END) / COUNT(*), 2) AS return_rate_pct
FROM retail_sales
GROUP BY discount_band
ORDER BY discount_band;

-- 7. Top ten customers by lifetime value
SELECT
    customer_id,
    COUNT(*) AS orders,
    ROUND(SUM(revenue), 2) AS lifetime_revenue,
    ROUND(SUM(profit), 2) AS lifetime_profit
FROM retail_sales
GROUP BY customer_id
ORDER BY lifetime_revenue DESC
LIMIT 10;

