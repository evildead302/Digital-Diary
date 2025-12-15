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

function importCSV(e){
  const f=e.target.files[0];
  if(!f)return;
  const r=new FileReader();
  r.onload=()=>{
    r.result.split("\n").slice(1).forEach((row,i)=>{
      const [id,main,sub,date,desc,amount]=row.split(",");
      if(main)saveEntry({
        id:genID(i),
        main,sub,date,desc,
        amount:parseFloat(amount),
        synced:false
      });
    });
    calcTotal();
  };
  r.readAsText(f);
}
