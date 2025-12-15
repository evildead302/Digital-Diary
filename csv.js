function exportCSV() {
  getAllEntries(d => {
    let csv = "id,main,sub,date,desc,amount\n";
    d.forEach(e => {
      csv += `${e.id},${e.main},${e.sub},${e.date},${e.desc},${e.amount}\n`;
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "accounts_backup.csv";
    a.click();
  });
}

function importCSV(e) {
  const file = e.target.files[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    const rows = r.result.split("\n").slice(1);
    rows.forEach((row, i) => {
      const [id, main, sub, date, desc, amount] = row.split(",");
      if (!main) return;
      saveEntry({
        id: Date.now().toString().slice(-2) + i,
        main, sub, date, desc,
        amount: parseFloat(amount)
      });
    });
    calculateTotal();
  };
  r.readAsText(file);
}
