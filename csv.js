function exportCSV(){
  getAllEntries(d=>{
    let csv="id,main,sub,date,desc,amount\n";
    d.forEach(e=>{
      csv+=`${e.id},${e.main},${e.sub},${e.date},${e.desc},${e.amount}\n`;
    });
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([csv]));
    a.download="accounts_backup.csv";
    a.click();
  });
}
