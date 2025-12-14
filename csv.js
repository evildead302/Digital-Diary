function exportCSV() {
  getAllEntries(entries => {
    let csv = "ID,Main,Sub,Date,Description,Amount\n";
    entries.forEach(e => {
      csv += `${e.id},${e.mainHead},${e.subHead},${e.date},${e.description},${e.amount}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "accounts_backup.csv";
    a.click();
  });
}
