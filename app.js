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
  headList.innerHTML = "";

  for (let m in heads) {
    mainForSub.innerHTML += `<option>${m}</option>`;
    entryMain.innerHTML += `<option>${m}</option>`;
    headList.innerHTML += `<li>${m} ➜ ${heads[m].join(", ")}</li>`;
  }
}
renderHeads();

function addMainHead() {
  const m = mainHeadInput.value.trim();
  if (!m || heads[m]) return;
  heads[m] = [];
  mainHeadInput.value = "";
  saveHeads();
}

function addSubHead() {
  const m = mainForSub.value;
  const s = subHeadInput.value.trim();
  if (!s || heads[m].includes(s)) return;
  heads[m].push(s);
  subHeadInput.value = "";
  saveHeads();
}

entryMain.onchange = () => {
  entrySub.innerHTML = "";
  (heads[entryMain.value] || []).forEach(s => {
    entrySub.innerHTML += `<option>${s}</option>`;
  });
};

function addTemp() {
  if (!entryMain.value || !entrySub.value) return alert("Select heads");
  if (!date.value) return alert("Select date");
  if (!/^[-+]?\d+(\.\d+)?$/.test(amount.value)) return alert("Invalid amount");

  tempEntries.push({
    date: date.value,
    desc: desc.value,
    amount: parseFloat(amount.value),
    main: entryMain.value,
    sub: entrySub.value
  });

  tempList.innerHTML += `<li>${desc.value} | ${amount.value}</li>`;
  desc.value = "";
  amount.value = "";
}

function saveAll() {
  const sec = new Date().getSeconds().toString().padStart(2, "0");

  tempEntries.forEach((e, i) => {
    e.id = sec + (i + 1);
    saveEntry(e);
  });

  tempEntries = [];
  tempList.innerHTML = "";
  calculateTotal();
}

function calculateTotal() {
  getAllEntries(d => {
    totalBalance.innerText = d.reduce((a, b) => a + b.amount, 0);
    renderBalanceDetail(d);
  });
}

function renderBalanceDetail(data) {
  let map = {};
  data.forEach(e => {
    if (!map[e.main]) map[e.main] = {};
    map[e.main][e.sub] = (map[e.main][e.sub] || 0) + e.amount;
  });

  balanceList.innerHTML = "";
  for (let m in map) {
    let total = Object.values(map[m]).reduce((a, b) => a + b, 0);
    let li = document.createElement("li");
    li.innerHTML = `<b>${m} : ${total}</b><ul>` +
      Object.entries(map[m]).map(
        ([s, v]) => `<li>${s} : ${v}</li>`
      ).join("") +
      `</ul>`;
    balanceList.appendChild(li);
  }
}
