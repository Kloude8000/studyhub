const PDFDocument = require("pdfkit");

const escapeCsvValue = (value) => {
    const text = value == null ? "" : String(value);

    if (/[",\n\r]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }

    return text;
};

const buildCsv = (headers, rows) => {
    const lines = [
        headers.map(escapeCsvValue).join(","),
        ...rows.map((row) => row.map(escapeCsvValue).join(","))
    ];

    return `${lines.join("\n")}\n`;
};

const sendCsv = (res, filename, headers, rows) => {
    const csv = buildCsv(headers, rows);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
    );
    res.send(csv);
};

const sendPdfTable = (res, filename, title, headers, rows) => {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
    );

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    doc.fontSize(18).text(title, { align: "left" });
    doc.moveDown();

    const columnWidth = (doc.page.width - 100) / headers.length;

    doc.fontSize(10).font("Helvetica-Bold");
    headers.forEach((header, index) => {
        doc.text(header, 50 + index * columnWidth, doc.y, {
            width: columnWidth,
            continued: index < headers.length - 1
        });
    });

    doc.moveDown(0.5);
    doc.font("Helvetica");

    rows.forEach((row) => {
        const rowY = doc.y;

        if (rowY > doc.page.height - 80) {
            doc.addPage();
        }

        row.forEach((cell, index) => {
            doc.text(String(cell ?? ""), 50 + index * columnWidth, doc.y, {
                width: columnWidth,
                continued: index < row.length - 1
            });
        });

        doc.moveDown(0.5);
    });

    doc.end();
};

module.exports = {
    buildCsv,
    sendCsv,
    sendPdfTable
};
