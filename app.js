let tempEntries = [];

function generateID(counter) {
  const now = new Date();
  const sec = now.getSeconds().toString().padStart(2, '0');
  return sec + counter;
}

function addTempEntry() {
  const date = date.value;
  const description = description.value;
  const amount = parseFloat(amount.value);

  if (!date || !description || isNaN(amount)) return alert("Invalid entry");

  tempEntries.push({ date, description, amount });
  renderTemp();
}

function renderTemp() {
  tempList.innerHTML = "";
  tempEntries.forEach((e, i) => {
    const li = document.createElement("li");
    li.textContent = `${e.date} | ${e.description} | ${e.amount}`;
    tempList.appendChild(li);
  });
}

function saveAll() {
  const base = new Date().getSeconds().toString().padStart(2, '0');
  tempEntries.forEach((e, i) => {
    const entry = {
      id: base + (i + 1),
      mainHead: mainHead.value,
      subHead: subHead.value,
      ...e
    };
    saveEntry(entry);
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
