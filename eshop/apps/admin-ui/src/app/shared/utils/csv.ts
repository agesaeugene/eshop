const csvCell = (value: unknown) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

export const downloadCSV = (
    filename: string,
    header: string[],
    rows: unknown[][]
) => {
    const csv = [
        header.map(csvCell).join(","),
        ...rows.map((r) => r.map(csvCell).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleDateString() : "-";