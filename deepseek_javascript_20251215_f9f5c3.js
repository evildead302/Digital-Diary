let db;

// Open or create IndexedDB database
const req = indexedDB.open("AccountsDiaryDB", 2);

req.onupgradeneeded = e => {
    db = e.target.result;
    
    // Create object store for entries if it doesn't exist
    if (!db.objectStoreNames.contains("entries")) {
        const store = db.createObjectStore("entries", { keyPath: "id" });
        
        // Create indexes for faster queries
        store.createIndex("date", "date", { unique: false });
        store.createIndex("main", "main", { unique: false });
        store.createIndex("sub", "sub", { unique: false });
        store.createIndex("amount", "amount", { unique: false });
        store.createIndex("synced", "synced", { unique: false });
    }
    
    // Create object store for sync metadata if it doesn't exist
    if (!db.objectStoreNames.contains("syncMeta")) {
        db.createObjectStore("syncMeta", { keyPath: "key" });
    }
};

req.onsuccess = e => {
    db = e.target.result;
    console.log("Database opened successfully");
    
    // Initialize data after database is ready
    setTimeout(() => {
        if (typeof calcTotal === "function") {
            calcTotal();
        }
        if (typeof loadSaved === "function") {
            loadSaved();
        }
    }, 100);
};

req.onerror = e => {
    console.error("Database error:", e.target.error);
    alert("Failed to open database. Please check if IndexedDB is supported.");
};

// Save entry to database
function saveEntry(entry) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Database not initialized"));
            return;
        }
        
        const transaction = db.transaction(["entries"], "readwrite");
        const store = transaction.objectStore("entries");
        const request = store.put(entry);
        
        request.onsuccess = () => {
            console.log("Entry saved:", entry.id);
            resolve(entry);
        };
        
        request.onerror = () => {
            console.error("Failed to save entry:", request.error);
            reject(request.error);
        };
    });
}

// Get all entries from database
function getAllEntries(callback) {
    if (!db) {
        console.error("Database not initialized");
        callback([]);
        return;
    }
    
    const transaction = db.transaction(["entries"], "readonly");
    const store = transaction.objectStore("entries");
    const request = store.getAll();
    
    request.onsuccess = () => {
        callback(request.result || []);
    };
    
    request.onerror = () => {
        console.error("Failed to get entries:", request.error);
        callback([]);
    };
}

// Get entries with filters
function getEntriesWithFilters(filters = {}) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Database not initialized"));
            return;
        }
        
        getAllEntries(entries => {
            let filtered = entries;
            
            // Apply filters
            if (filters.main) {
                filtered = filtered.filter(e => e.main === filters.main);
            }
            
            if (filters.sub) {
                filtered = filtered.filter(e => e.sub === filters.sub);
            }
            
            if (filters.type === "income") {
                filtered = filtered.filter(e => e.amount > 0);
            } else if (filters.type === "expense") {
                filtered = filtered.filter(e => e.amount < 0);
            }
            
            if (filters.fromDate) {
                const from = new Date(filters.fromDate);
                filtered = filtered.filter(e => {
                    const entryDate = new Date(e.date.split("-").reverse().join("-"));
                    return entryDate >= from;
                });
            }
            
            if (filters.toDate) {
                const to = new Date(filters.toDate + "T23:59:59");
                filtered = filtered.filter(e => {
                    const entryDate = new Date(e.date.split("-").reverse().join("-"));
                    return entryDate <= to;
                });
            }
            
            resolve(filtered);
        });
    });
}

// Get entry by ID
function getEntryById(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Database not initialized"));
            return;
        }
        
        const transaction = db.transaction(["entries"], "readonly");
        const store = transaction.objectStore("entries");
        const request = store.get(id);
        
        request.onsuccess = () => {
            resolve(request.result);
        };
        
        request.onerror = () => {
            reject(request.error);
        };
    });
}

// Get unsynced entries
function getUnsyncedEntries() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Database not initialized"));
            return;
        }
        
        getAllEntries(entries => {
            const unsynced = entries.filter(e => !e.synced);
            resolve(unsynced);
        });
    });
}

// Mark entries as synced
function markAsSynced(entryIds) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Database not initialized"));
            return;
        }
        
        const transaction = db.transaction(["entries"], "readwrite");
        const store = transaction.objectStore("entries");
        
        // Get all entries first
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
            const entries = getAllRequest.result;
            let updatedCount = 0;
            
            entries.forEach(entry => {
                if (entryIds.includes(entry.id) && !entry.synced) {
                    entry.synced = true;
                    const updateRequest = store.put(entry);
                    updateRequest.onsuccess = () => {
                        updatedCount++;
                    };
                }
            });
            
            transaction.oncomplete = () => {
                resolve(updatedCount);
            };
            
            transaction.onerror = () => {
                reject(transaction.error);
            };
        };
        
        getAllRequest.onerror = () => {
            reject(getAllRequest.error);
        };
    });
}

// Get database statistics
function getDatabaseStats() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Database not initialized"));
            return;
        }
        
        getAllEntries(entries => {
            const stats = {
                totalEntries: entries.length,
                totalIncome: entries.filter(e => e.amount > 0).reduce((sum, e) => sum + e.amount, 0),
                totalExpense: Math.abs(entries.filter(e => e.amount < 0).reduce((sum, e) => sum + e.amount, 0)),
                unsyncedCount: entries.filter(e => !e.synced).length,
                categories: {}
            };
            
            // Count entries per category
            entries.forEach(e => {
                stats.categories[e.main] = (stats.categories[e.main] || 0) + 1;
            });
            
            resolve(stats);
        });
    });
}

// Clear all entries (use with caution!)
function clearAllEntries() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Database not initialized"));
            return;
        }
        
        if (!confirm("This will delete ALL entries. Are you sure?")) {
            reject(new Error("Operation cancelled"));
            return;
        }
        
        const transaction = db.transaction(["entries"], "readwrite");
        const store = transaction.objectStore("entries");
        const request = store.clear();
        
        request.onsuccess = () => {
            console.log("All entries cleared");
            resolve();
        };
        
        request.onerror = () => {
            console.error("Failed to clear entries:", request.error);
            reject(request.error);
        };
    });
}