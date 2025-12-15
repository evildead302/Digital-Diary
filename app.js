const pages=document.querySelectorAll(".page");
function showPage(id){
  pages.forEach(p=>p.style.display="none");
  document.getElementById(id).style.display="block";
}
showPage("home");

let heads=JSON.parse(localStorage.getItem("heads"))||{};
let neonCfg=JSON.parse(localStorage.getItem("neonCfg"))||null;
let tempEntries=[];

function saveHeads(){
  localStorage.setItem("heads",JSON.stringify(heads));
  renderHeads();
}

function renderHeads(){
  mainForSub.innerHTML="";
  entryMain.innerHTML="";
  ledgerMain.innerHTML="<option value=''>All</option>";
  headList.innerHTML="";

  for(let m in heads){
    mainForSub.innerHTML+=`<option>${m}</option>`;
    entryMain.innerHTML+=`<option>${m}</option>`;
    ledgerMain.innerHTML+=`<option>${m}</option>`;

    headList.innerHTML+=`
      <li><b>${m}</b>
      <button onclick="deleteMainHead('${m}')">Delete</button>
      <ul>
        ${heads[m].map(s=>`
          <li>${s}
          <button onclick="deleteSubHead('${m}','${s}')">X</button></li>
        `).join("")}
      </ul></li>`;
  }
}
renderHeads();

entryMain.onchange=()=>{
  entrySub.innerHTML="";
  (heads[entryMain.value]||[]).forEach(s=>{
    entrySub.innerHTML+=`<option>${s}</option>`;
  });
};

ledgerMain.onchange=()=>{
  ledgerSub.innerHTML="<option value=''>All</option>";
  (heads[ledgerMain.value]||[]).forEach(s=>{
    ledgerSub.innerHTML+=`<option>${s}</option>`;
  });
};

function addMainHead(){
  if(!mainHeadInput.value)return;
  heads[mainHeadInput.value]=[];
  mainHeadInput.value="";
  saveHeads();
}

function addSubHead(){
  heads[mainForSub.value].push(subHeadInput.value);
  subHeadInput.value="";
  saveHeads();
}

function deleteMainHead(m){
  if(confirm("Delete main head?")){
    delete heads[m];
    saveHeads();
  }
}

function deleteSubHead(m,s){
  heads[m]=heads[m].filter(x=>x!==s);
  saveHeads();
}

function formatDate(v){
  const d=new Date(v);
  return `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`;
}

function genID(i){
  const d=new Date();
  const ymd=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
  const ss=String(d.getSeconds()).padStart(2,"0");
  return `${ymd}${ss}${i+1}`;
}

function addTemp(){
  tempEntries.push({
    date:formatDate(date.value),
    desc:desc.value,
    amount:parseFloat(amount.value),
    main:entryMain.value,
    sub:entrySub.value
  });
  renderTemp();
}

function renderTemp(){
  tempList.innerHTML="";
  tempEntries.forEach((e,i)=>{
    tempList.innerHTML+=`
      <li>${e.date} ${e.desc} ${e.amount}
      <button onclick="editTemp(${i})">Edit</button>
      <button onclick="deleteTemp(${i})">Del</button></li>`;
  });
}

function editTemp(i){
  const e=tempEntries[i];
  desc.value=e.desc;
  amount.value=e.amount;
  tempEntries.splice(i,1);
  renderTemp();
}

function deleteTemp(i){
  tempEntries.splice(i,1);
  renderTemp();
}

function saveAll(){
  tempEntries.forEach((e,i)=>{
    e.id=genID(i);
    e.synced=false;
    saveEntry(e);
  });
  tempEntries=[];
  renderTemp();
  loadSaved();
  calcTotal();
}

function loadSaved(){
  getAllEntries(d=>{
    savedEntryList.innerHTML="";
    d.forEach(e=>{
      savedEntryList.innerHTML+=`
        <li class="${e.amount<0?'expense':'income'}">
        ${e.date} ${e.desc} ${e.amount}
        <button onclick="editSaved('${e.id}')">Edit</button>
        <button onclick="deleteEntry('${e.id}')">Del</button></li>`;
    });
  });
}

function editSaved(id){
  getAllEntries(d=>{
    const e=d.find(x=>x.id===id);
    desc.value=e.desc;
    amount.value=e.amount;
    deleteEntry(id,false);
    showPage("entry");
  });
}

function deleteEntry(id,ask=true){
  if(!ask||confirm("Delete entry?")){
    db.transaction("entries","readwrite").objectStore("entries").delete(id);
    loadSaved();
    calcTotal();
  }
}

function calcTotal(){
  getAllEntries(d=>{
    totalBalance.innerText=d.reduce((a,b)=>a+b.amount,0);
    renderBalance(d);
    updateNeonStatus(d);
  });
}

function renderBalance(d){
  let map={};
  d.forEach(e=>{
    map[e.main]=map[e.main]||{};
    map[e.main][e.sub]=(map[e.main][e.sub]||0)+e.amount;
  });
  balanceList.innerHTML="";
  for(let m in map){
    balanceList.innerHTML+=`
      <li><b>${m}</b><ul>
      ${Object.entries(map[m]).map(([s,v])=>
        `<li class="${v<0?'expense':'income'}">${s}: ${v}</li>`
      ).join("")}</ul></li>`;
  }
}

function loadLedger(){
  getAllEntries(d=>{
    ledgerList.innerHTML="";
    d.filter(e=>{
      if(ledgerMain.value && e.main!==ledgerMain.value)return false;
      if(ledgerSub.value && e.sub!==ledgerSub.value)return false;
      if(typeFilter.value==="income" && e.amount<0)return false;
      if(typeFilter.value==="expense" && e.amount>0)return false;
      return true;
    }).forEach(e=>{
      ledgerList.innerHTML+=`
        <li class="${e.amount<0?'expense':'income'}">
        ${e.date} ${e.desc} ${e.amount}
        <button onclick="editSaved('${e.id}')">Edit</button>
        <button onclick="deleteEntry('${e.id}')">Del</button></li>`;
    });
  });
}

function saveNeon(){
  neonCfg={url:neonUrl.value,key:neonKey.value};
  localStorage.setItem("neonCfg",JSON.stringify(neonCfg));
  neonStatus.innerText="Neon: Configured";
}

function updateNeonStatus(d){
  const pending=d.filter(e=>!e.synced).length;
  neonStatus.innerText=neonCfg
    ? `Neon: ${pending} pending upload`
    : "Neon: Not Configured";
}
