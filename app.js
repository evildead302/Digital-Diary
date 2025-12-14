let tempEntries = [];

let mainHeads = JSON.parse(localStorage.getItem("mainHeads")) || [];
let subHeads = JSON.parse(localStorage.getItem("subHeads")) || [];

const mainHead = document.getElementById("mainHead");
const subHead = document.getElementById("subHead");

renderHeads();

function renderHeads() {
  mainHead.innerHTML = "<option value=''>Select Main Head</option>";
  subHead.innerHTML = "<option value=''>Select Sub Head</option>";

  mainHeads.forEach(h => mainHead.innerHTML += `<option>${h}</option>`);
  subHeads.forEach(h => subHead.innerHTML += `<option>${h}</option>`);
}

function addMainHead() {
  const v = newMainHead.value.trim();
  if (!v) return;
  mainHeads.push(v);
  localStorage.setItem("mainHeads", JSON.stringify(mainHeads));
  newMainHead.value = "";
  renderHeads();
}

function addSubHead() {
  const v = newSubHead.value.trim();
  if (!v) return;
  subHeads.push(v);
  localStorage.setItem("subHeads", JSON.stringify(subHeads));
  newSubHead.value = "";
  renderHeads();
}

function formatDate(v) {
  const d = new Date(v);
  return `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`;
}

function addTempEntry() {
  if (!mainHead.value || !subHead.value) {
    alert("Select Main & Sub Head");
    return;
  }

  if (!date.value) return alert("Select date");

  const amt = amount.value.trim();

  if (!/^[-+]?\d+(\.\d+)?$/.test(amt)) {
    alert("Enter valid amount with + or -");
    return;
  }

  tempEntries.push({
    date: formatDate(date.value),
    description: description.value.trim(),
    amount: parseFloat(amt)
  });

  description.value = "";
  amount.value = "";
  renderTemp();
}

function renderTemp() {
  tempList.innerHTML = "";
  tempEntries.forEach(e => {
    const li = document.createElement("li");
    li.textContent = `${e.date} | ${e.description} | ${e.amount}`;
    tempList.appendChild(li);
  });
}

function generateID(sec, i) {
  return sec + (i + 1);
}

function saveAll() {
  const sec = new Date().getSeconds().toString().padStart(2, "0");

  tempEntries.forEach((e, i) => {
    saveEntry({
      id: generateID(sec, i),
      mainHead: mainHead.value,
      subHead: subHead.value,
      ...e
    });
  });

  tempEntries = [];
  renderTemp();
  loadSavedEntries();
}

function loadSavedEntries() {
  getAllEntries(entries => {
    savedList.innerHTML = "";
    entries.forEach(e => {
      const li = document.createElement("li");
      li.className = e.amount >= 0 ? "income" : "expense";
      li.textContent = `${e.id} | ${e.date} | ${e.description} | ${e.amount}`;
      savedList.appendChild(li);
    });
  });
}
