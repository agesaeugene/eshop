"use client";

import dynamic from "next/dynamic";
import type { Props } from "react-apexcharts";
import Box from "../box";

// ApexCharts needs `window`, so it must be loaded client-side only
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export const SalesChart = ({
  ordersData,
}: {
  ordersData?: {
    month: string;
    count: number;
  }[];
}) => {
  const chartSeries: Props["series"] = [
    {
      name: "Sales",
      data: ordersData?.map((data) => data.count) || [
        31, 40, 28, 51, 42, 109, 100,
      ],
    },
  ];

  const chartOptions: Props["options"] = {
    chart: {
      type: "area",
      toolbar: { show: false },
      zoom: { enabled: false },
      background: "transparent",
    },
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: 2 },
    colors: ["#60a5fa"],
    fill: {
      type: "gradient",
      gradient: { opacityFrom: 0.4, opacityTo: 0.05 },
    },
    xaxis: {
      categories: ordersData?.map((data) => data.month) || [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul",
      ],
      labels: { style: { colors: "#94a3b8" } },
    },
    yaxis: {
      labels: { style: { colors: "#94a3b8" } },
    },
    grid: { borderColor: "#334155" },
    tooltip: { theme: "dark" },
  };

  return (
    <Box css={{ width: "100%" }}>
      <Chart
        type="area"
        height={300}
        width="100%"
        series={chartSeries}
        options={chartOptions}
      />
    </Box>
  );
};