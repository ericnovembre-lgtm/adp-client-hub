export type CSVColumn<T> = {
  header: string;
  accessor: (row: T) => string | number | null | undefined;
};

function escapeCSV(value: string | number | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCSV<T>(data: T[], filename: string, columns: CSVColumn<T>[]) {
  const header = columns.map((c) => escapeCSV(c.header)).join(",");
  const rows = data.map((row) =>
    columns.map((c) => escapeCSV(c.accessor(row))).join(",")
  );
  const csv = [header, ...rows].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export type CSVSection = {
  title: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
};

export function exportMultiSectionCSV(sections: CSVSection[], filename: string) {
  const lines: string[] = [];
  sections.forEach((section, idx) => {
    if (idx > 0) lines.push("", "");
    lines.push(section.title);
    lines.push(section.headers.map(escapeCSV).join(","));
    section.rows.forEach((row) => {
      lines.push(row.map(escapeCSV).join(","));
    });
  });
  const csv = lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
