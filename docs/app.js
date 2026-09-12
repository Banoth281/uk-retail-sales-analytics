const DATA_URL = "data/uk_retail_sales.csv";
const colours = { green: "#34d399", blue: "#60a5fa", amber: "#fbbf24", red: "#fb7185", muted: "#9fb0c6" };
const plotLayout = {
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "rgba(0,0,0,0)",
  font: { color: colours.muted, family: "Inter, system-ui, sans-serif", size: 11 },
  margin: { l: 55, r: 20, t: 20, b: 48 },
  xaxis: { gridcolor: "#263852", zerolinecolor: "#263852" },
  yaxis: { gridcolor: "#263852", zerolinecolor: "#263852" },
  legend: { orientation: "h", y: 1.12, x: 0 }
};
const plotConfig = { responsive: true, displayModeBar: false };
let orders = [];

const gbp = value => new Intl.NumberFormat("en-GB", {
  style: "currency", currency: "GBP", maximumFractionDigits: 0
}).format(value);

function uniqueValues(key) {
  return [...new Set(orders.map(row => row[key]))].sort();
}

function populateSelect(id, values) {
  const select = document.getElementById(id);
  values.forEach(value => select.add(new Option(value, value)));
}

function sum(rows, key) {
  return rows.reduce((total, row) => total + Number(row[key] || 0), 0);
}

function aggregate(rows, key) {
  const result = {};
  rows.forEach(row => {
    const group = row[key];
    if (!result[group]) result[group] = { revenue: 0, profit: 0, orders: 0, units: 0 };
    result[group].revenue += row.Revenue;
    result[group].profit += row.Profit;
    result[group].orders += 1;
    result[group].units += row.Quantity;
  });
  return result;
}

function selectedRows() {
  const region = document.getElementById("region").value;
  const channel = document.getElementById("channel").value;
  const category = document.getElementById("category").value;
  return orders.filter(row =>
    (region === "All" || row.Region === region) &&
    (channel === "All" || row.Channel === channel) &&
    (category === "All" || row.Category === category)
  );
}

function updateKpis(rows) {
  const revenue = sum(rows, "Revenue");
  const profit = sum(rows, "Profit");
  const returned = rows.filter(row => row.Returned === "Yes").length;
  const avgRating = rows.length ? sum(rows, "Rating") / rows.length : 0;
  document.getElementById("orders").textContent = rows.length.toLocaleString("en-GB");
  document.getElementById("revenue").textContent = gbp(revenue);
  document.getElementById("profit").textContent = gbp(profit);
  document.getElementById("margin").textContent = revenue ? `${(profit / revenue * 100).toFixed(1)}% margin` : "— margin";
  document.getElementById("aov").textContent = rows.length ? gbp(revenue / rows.length) : "£0";
  document.getElementById("returns").textContent = rows.length ? `${(returned / rows.length * 100).toFixed(1)}%` : "0%";
  document.getElementById("rating").textContent = `${avgRating.toFixed(1)} / 5 average rating`;
  document.getElementById("orders-note").textContent = `${rows.length.toLocaleString("en-GB")} filtered transactions`;
}

function drawMonthly(rows) {
  const monthly = aggregate(rows, "Month");
  const labels = Object.keys(monthly).sort();
  Plotly.react("monthly-chart", [
    { x: labels, y: labels.map(x => monthly[x].revenue), name: "Revenue", type: "scatter", mode: "lines+markers", line: { color: colours.blue, width: 3 } },
    { x: labels, y: labels.map(x => monthly[x].profit), name: "Profit", type: "scatter", mode: "lines+markers", line: { color: colours.green, width: 3 } }
  ], { ...plotLayout, yaxis: { ...plotLayout.yaxis, tickprefix: "£" } }, plotConfig);
}

function drawCategory(rows) {
  const grouped = aggregate(rows, "Category");
  const labels = Object.keys(grouped).sort((a, b) => grouped[a].revenue - grouped[b].revenue);
  Plotly.react("category-chart", [{
    x: labels.map(x => grouped[x].revenue), y: labels, type: "bar", orientation: "h",
    marker: { color: labels.map(x => grouped[x].profit), colorscale: [[0, "#1d4ed8"], [1, "#60a5fa"]], showscale: false },
    hovertemplate: "%{y}<br>Revenue: £%{x:,.0f}<extra></extra>"
  }], { ...plotLayout, xaxis: { ...plotLayout.xaxis, tickprefix: "£" } }, plotConfig);
}

function drawRegions(rows) {
  const grouped = aggregate(rows, "Region");
  const labels = Object.keys(grouped).sort((a, b) => grouped[a].profit - grouped[b].profit);
  Plotly.react("region-chart", [{
    x: labels.map(x => grouped[x].profit), y: labels, type: "bar", orientation: "h",
    marker: { color: colours.green },
    hovertemplate: "%{y}<br>Profit: £%{x:,.0f}<extra></extra>"
  }], { ...plotLayout, xaxis: { ...plotLayout.xaxis, tickprefix: "£" } }, plotConfig);
}

function drawChannels(rows) {
  const grouped = aggregate(rows, "Channel");
  const labels = Object.keys(grouped);
  Plotly.react("channel-chart", [{
    labels, values: labels.map(x => grouped[x].revenue), type: "pie", hole: .58,
    marker: { colors: [colours.green, colours.blue, colours.amber] },
    textinfo: "label+percent", hovertemplate: "%{label}<br>£%{value:,.0f}<extra></extra>"
  }], { ...plotLayout, margin: { l: 10, r: 10, t: 15, b: 15 }, showlegend: false }, plotConfig);
}

function updateInsights(rows) {
  const region = aggregate(rows, "Region");
  const category = aggregate(rows, "Category");
  const channel = aggregate(rows, "Channel");
  const top = (groups, metric) => Object.keys(groups).sort((a, b) => groups[b][metric] - groups[a][metric])[0] || "No data";
  const cards = [
    [top(channel, "revenue"), "Highest-revenue sales channel for the current selection."],
    [top(region, "profit"), "Strongest UK region by profit for the current selection."],
    [top(category, "profit"), "Most profitable product category for the current selection."]
  ];
  document.getElementById("insight-cards").innerHTML = cards.map(([title, text]) =>
    `<div class="insight-card"><strong>${title}</strong><span>${text}</span></div>`
  ).join("");
}

function updateTable(rows) {
  const topRows = [...rows].sort((a, b) => b.Revenue - a.Revenue).slice(0, 10);
  document.getElementById("row-count").textContent = `Top 10 of ${rows.length.toLocaleString("en-GB")}`;
  document.getElementById("orders-table").innerHTML = topRows.map(row => `
    <tr>
      <td>${row["Order ID"]}</td><td>${row["Order Date"]}</td><td>${row.Region}</td>
      <td>${row.Channel}</td><td>${row.Category}</td><td>${gbp(row.Revenue)}</td>
      <td>${gbp(row.Profit)}</td><td>${row.Rating.toFixed(1)}</td>
      <td class="${row.Returned === "Yes" ? "returned" : ""}">${row.Returned}</td>
    </tr>`).join("");
}

function render() {
  const rows = selectedRows();
  updateKpis(rows);
  drawMonthly(rows);
  drawCategory(rows);
  drawRegions(rows);
  drawChannels(rows);
  updateInsights(rows);
  updateTable(rows);
}

function initialise(rawRows) {
  orders = rawRows.map(row => ({
    ...row,
    Quantity: Number(row.Quantity),
    Revenue: Number(row.Revenue),
    Profit: Number(row.Profit),
    Rating: Number(row.Rating)
  }));
  populateSelect("region", uniqueValues("Region"));
  populateSelect("channel", uniqueValues("Channel"));
  populateSelect("category", uniqueValues("Category"));
  ["region", "channel", "category"].forEach(id => document.getElementById(id).addEventListener("change", render));
  document.getElementById("reset").addEventListener("click", () => {
    ["region", "channel", "category"].forEach(id => document.getElementById(id).value = "All");
    render();
  });
  document.getElementById("loading").style.display = "none";
  render();
}

Papa.parse(DATA_URL, {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: results => initialise(results.data),
  error: error => {
    document.getElementById("loading").innerHTML =
      `Unable to load the retail dataset.<br><small>${error.message}</small>`;
  }
});
