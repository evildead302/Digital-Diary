let db;

const request = indexedDB.open("AccountsDiaryDB", 1);

request.onupgradeneeded = e => {
  db = e.target.result;
  db.createObjectStore("entries", { keyPath: "id" });
};

request.onsuccess = e => {
  db = e.target.result;
  loadSavedEntries();
};

function saveEntry(entry) {
  const tx = db.transaction("entries", "readwrite");
  tx.objectStore("entries").put(entry);
}

function getAllEntries(cb) {
  const tx = db.transaction("entries", "readonly");
  const req = tx.objectStore("entries").getAll();
  req.onsuccess = () => cb(req.result);
}
