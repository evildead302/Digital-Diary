let db;

const req = indexedDB.open("AccountsDiaryDB", 1);

req.onupgradeneeded = e => {
  db = e.target.result;
  db.createObjectStore("entries", { keyPath: "id" });
};

req.onsuccess = e => {
  db = e.target.result;
  calculateTotal();
};

function saveEntry(entry) {
  db.transaction("entries", "readwrite")
    .objectStore("entries")
    .put(entry);
}

function getAllEntries(cb) {
  const r = db.transaction("entries")
    .objectStore("entries")
    .getAll();
  r.onsuccess = () => cb(r.result);
}
