const pages = document.querySelectorAll(".page");
function showPage(id) {
  pages.forEach(p => p.style.display = "none");
  document.getElementById(id).style.display = "block";
}
showPage("home");

let heads = JSON.parse(localStorage.getItem("heads")) || {};
let tempEntries = [];

function saveHeads() {
  localStorage.setItem("heads", JSON.stringify(heads));
  renderHeads();
}

function renderHeads() {
  mainForSub.innerHTML = "";
  entryMain.innerHTML = "";
  ledgerMain.innerHTML = "<option value=''>All</option>";
  headList.innerHTML = "";

  for (let m in heads) {
    mainForSub.innerHTML += `<option>${m}</option>`;
    entryMain.innerHTML += `<option>${m}</option>`;
    ledgerMain.innerHTML += `<option>${m}</option>`;

    let li = document.createElement("li");
    li.innerHTML = `<b>${m}</b>
      <button onclick="deleteMainHead('${m}')">Delete</button>
      <ul>${heads[m].map(s =>
        `<li>${s} <button onclick="deleteSubHead('${m}','${s}')">X</button></li>`
      ).join("")}</ul>`;
    headList.appendChild(li);
  }
}
renderHeads();

function addMainHead() {
  const v = mainHeadInput.value.trim();
  if (!v || heads[v]) return;
  heads[v] = [];
  mainHeadInput.value = "";
  saveHeads();
}

function addSubHead() {
  const m = mainForSub.value;
  const s = subHeadInput.value.trim();
  if (!s) return;
  heads[m].push(s);
  subHeadInput.value = "";
  saveHeads();
}

function deleteMainHead(m) {
  if (!confirm("Delete main head?")) return;
  delete heads[m];
  saveHeads();
}

function deleteSubHead(m, s) {
  heads[m] = heads[m].filter(x => x !== s);
  saveHeads();
}

entryMain.onchange = () => {
  entrySub.innerHTML = "";
  (heads[entryMain.value] || []).forEach(s =>
    entrySub.innerHTML += `<option>${s}</option>`
  );
};

function formatDate(d) {
  const x = new Date(d);
  return `${String(x.getDate()).padStart(2,"0")}-${String(x.getMonth()+1).padStart(2,"0")}-${x.getFullYear()}`;
}

function generateID(i) {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
  const ss = String(d.getSeconds()).padStart(2,"0");
  return `${ymd}${ss}${i+1}`;
}

function addTemp() {
  if (!/^[-+]?\d+(\.\d+)?$/.test(amount.value)) return alert("Invalid amount");

  tempEntries.push({
    date: formatDate(date.value),
    desc: desc.value,
    amount: parseFloat(amount.value),
    main: entryMain.value,
    sub: entrySub.value
  });

  renderTemp();
  desc.value = amount.value = "";
}

function renderTemp() {
  tempList.innerHTML = "";
  tempEntries.forEach((e, i) => {
    tempList.innerHTML += `
      <li>${e.date} ${e.desc} ${e.amount}
      <button onclick="editTemp(${i})">Edit</button>
      <button onclick="deleteTemp(${i})">Del</button></li>`;
  });
}

function editTemp(i) {
  const e = tempEntries[i];
  desc.value = e.desc;
  amount.value = e.amount;
  tempEntries.splice(i,1);
  renderTemp();
}

function deleteTemp(i) {
  tempEntries.splice(i,1);
  renderTemp();
}

function saveAll() {
  tempEntries.forEach((e,i)=>{
    e.id = generateID(i);
    saveEntry(e);
  });
  tempEntries=[];
  renderTemp();
  loadSaved();
  calculateTotal();
}

function loadSaved() {
  getAllEntries(d=>{
    savedEntryList.innerHTML="";
    d.forEach(e=>{
      savedEntryList.innerHTML+=`
        <li>${e.id} ${e.date} ${e.desc} ${e.amount}
        <button onclick="deleteEntry('${e.id}')">Delete</button></li>`;
    });
  });
}

function deleteEntry(id){
  if(!confirm("Delete entry?"))return;
  db.transaction("entries","readwrite").objectStore("entries").delete(id);
  loadSaved();
  calculateTotal();
}

function calculateTotal(){
  getAllEntries(d=>{
    totalBalance.innerText=d.reduce((a,b)=>a+b.amount,0);
    renderBalanceDetail(d);
  });
}

function renderBalanceDetail(d){
  let map={};
  d.forEach(e=>{
    map[e.main]=map[e.main]||{};
    map[e.main][e.sub]=(map[e.main][e.sub]||0)+e.amount;
  });
  balanceList.innerHTML="";
  for(let m in map){
    balanceList.innerHTML+=`<li><b>${m}</b><ul>${
      Object.entries(map[m]).map(([s,v])=>`<li>${s}: ${v}</li>`).join("")
    }</ul></li>`;
  }
}

function loadLedger(){
  getAllEntries(d=>{
    ledgerList.innerHTML="";
    d.filter(e=>{
      if(ledgerMain.value && e.main!==ledgerMain.value) return false;
      if(ledgerSub.value && e.sub!==ledgerSub.value) return false;
      return true;
    }).forEach(e=>{
      ledgerList.innerHTML+=`<li>${e.date} ${e.desc} ${e.amount}</li>`;
    });
  });
}
