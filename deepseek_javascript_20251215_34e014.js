let db;

// Open or create IndexedDB database
const req = indexedDB.open("AccountsDiaryDB", 3); // Version 3 for syncRemarks

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
        store.createIndex("syncRemarks", "syncRemarks", { unique: false });
    }
    
    // Create object store for sync metadata if it doesn't exist
    if (!db.objectStoreNames.contains("syncMeta")) {
        db.createObjectStore("syncMeta", { keyPath: "key" });
    }
    
    // If upgrading from older version, add syncRemarks field to existing entries
    if (e.oldVersion < 3) {
        const transaction = e.target.transaction;
        const store = transaction.objectStore("entries");
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
            const entries = getAllRequest.result;
            entries.forEach(entry => {
                if (!entry.syncRemarks) {
                    entry.syncRemarks = entry.synced ? "synced" : "new";
                    store.put(entry);
                }
                if (!entry.created_at) {
                    entry.created_at = new Date().toISOString();
                    store.put(entry);
                }
                if (!entry.updated_at) {
                    entry.updated_at = new Date().toISOString();
                    store.put(entry);
                }
            });
        };
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
        if (typeof updateGlobalNeonStatus === "function") {
            updateGlobalNeonStatus();
        }
    }, 100);
};

req.onerror = e => {
    console.error("Database error:", e.target.error);
    alert("Failed to open database. Please check if IndexedDB is supported.");
};

// Helper function to generate ID (same as in app.js)
function genID(i) {
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    const ss = String(d.getSeconds()).padStart(2, "0");
    const ms = String(d.getMilliseconds()).padStart(3, "0");
    return `${ymd}${ss}${ms}${i+1}`;
}

// Save entry to database with complete fields
function saveEntry(entry) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Database not initialized"));
            return;
        }
        
        // Ensure entry has all required fields
        const completeEntry = {
            id: entry.id || genID(Math.floor(Math.random() * 1000)),
            date: entry.date || new Date().toISOString().split('T')[0],
            desc: entry.desc || '',
            amount: entry.amount || 0,
            main: entry.main || '',
            sub: entry.sub || '',
            synced: entry.synced || false,
            syncRemarks: entry.syncRemarks || 'new',
            created_at: entry.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        const transaction = db.transaction(["entries"], "readwrite");
        const store = transaction.objectStore("entries");
        const request = store.put(completeEntry);
        
        request.onsuccess = () => {
            console.log("Entry saved:", completeEntry.id, "Sync:", completeEntry.syncRemarks);
            resolve(completeEntry);
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
            
            // Filter out deleted entries unless specifically requested
            if (!filters.includeDeleted) {
                filtered = filtered.filter(e => e.syncRemarks !== "deleted");
            }
            
            resolve(filtered);
        });
    });
}

// Get entries that need sync
function getEntriesNeedingSync() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Database not initialized"));
            return;
        }
        
        getAllEntries(entries => {
            // Get entries that are not synced or have sync remarks
            const needsSync = entries.filter(e => 
                !e.synced || (e.syncRemarks && e.syncRemarks !== "synced")
            );
            resolve(needsSync);
        });
    });
}

// Get unsynced entries (for backward compatibility)
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
        
        let updatedCount = 0;
        let errors = [];
        
        // Process each entry
        const processNext = (index) => {
            if (index >= entryIds.length) {
                transaction.oncomplete = () => {
                    resolve({ updatedCount, errors });
                };
                transaction.onerror = () => {
                    reject(transaction.error);
                };
                return;
            }
            
            const id = entryIds[index];
            const getRequest = store.get(id);
            
            getRequest.onsuccess = () => {
                const entry = getRequest.result;
                if (entry) {
                    entry.synced = true;
                    entry.syncRemarks = "synced";
                    entry.updated_at = new Date().toISOString();
                    
                    const updateRequest = store.put(entry);
                    updateRequest.onsuccess = () => {
                        updatedCount++;
                        processNext(index + 1);
                    };
                    updateRequest.onerror = () => {
                        errors.push({ id, error: updateRequest.error });
                        processNext(index + 1);
                    };
                } else {
                    errors.push({ id, error: "Entry not found" });
                    processNext(index + 1);
                }
            };
            
            getRequest.onerror = () => {
                errors.push({ id, error: getRequest.error });
                processNext(index + 1);
            };
        };
        
        processNext(0);
    });
}

// Permanently delete entries (after successful Neon sync)
function permanentlyDeleteEntries(entryIds) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Database not initialized"));
            return;
        }
        
        if (!confirm("Permanently delete these entries from local database?")) {
            reject(new Error("Operation cancelled"));
            return;
        }
        
        const transaction = db.transaction(["entries"], "readwrite");
        const store = transaction.objectStore("entries");
        
        let deletedCount = 0;
        let errors = [];
        
        entryIds.forEach(id => {
            const request = store.delete(id);
            request.onsuccess = () => {
                deletedCount++;
                console.log("Entry permanently deleted:", id);
            };
            request.onerror = () => {
                errors.push({ id, error: request.error });
            };
        });
        
        transaction.oncomplete = () => {
            resolve({ deletedCount, errors });
        };
        
        transaction.onerror = () => {
            reject(transaction.error);
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
            const activeEntries = entries.filter(e => e.syncRemarks !== "deleted");
            const deletedEntries = entries.filter(e => e.syncRemarks === "deleted");
            const needsSync = entries.filter(e => !e.synced || (e.syncRemarks && e.syncRemarks !== "synced"));
            
            const stats = {
                totalEntries: entries.length,
                activeEntries: activeEntries.length,
                deletedEntries: deletedEntries.length,
                pendingSync: needsSync.length,
                totalIncome: activeEntries.filter(e => e.amount > 0).reduce((sum, e) => sum + e.amount, 0),
                totalExpense: Math.abs(activeEntries.filter(e => e.amount < 0).reduce((sum, e) => sum + e.amount, 0)),
                categories: {},
                syncStatus: {
                    synced: entries.filter(e => e.synced && e.syncRemarks === "synced").length,
                    new: entries.filter(e => e.syncRemarks === "new").length,
                    edited: entries.filter(e => e.syncRemarks === "edited").length,
                    deleted: deletedEntries.length
                }
            };
            
            // Count entries per category
            activeEntries.forEach(e => {
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

// Export database to JSON
function exportDatabase() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Database not initialized"));
            return;
        }
        
        getAllEntries(entries => {
            const exportData = {
                version: "1.0",
                exported_at: new Date().toISOString(),
                entries: entries,
                heads: JSON.parse(localStorage.getItem("heads")) || {},
                neonConfig: JSON.parse(localStorage.getItem("neonConfig")) || null
            };
            
            resolve(exportData);
        });
    });
}

// Import database from JSON
function importDatabase(jsonData) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Database not initialized"));
            return;
        }
        
        if (!confirm("This will replace all current data. Continue?")) {
            reject(new Error("Operation cancelled"));
            return;
        }
        
        const transaction = db.transaction(["entries"], "readwrite");
        const store = transaction.objectStore("entries");
        
        // Clear existing data
        store.clear();
        
        // Import entries
        let importedCount = 0;
        let errors = [];
        
        if (jsonData.entries && Array.isArray(jsonData.entries)) {
            jsonData.entries.forEach((entry, index) => {
                try {
                    const request = store.put(entry);
                    request.onsuccess = () => {
                        importedCount++;
                    };
                    request.onerror = () => {
                        errors.push({ index, error: request.error });
                    };
                } catch (error) {
                    errors.push({ index, error: error.message });
                }
            });
        }
        
        // Import configuration
        if (jsonData.heads) {
            localStorage.setItem("heads", JSON.stringify(jsonData.heads));
        }
        
        if (jsonData.neonConfig) {
            localStorage.setItem("neonConfig", JSON.stringify(jsonData.neonConfig));
        }
        
        transaction.oncomplete = () => {
            resolve({ importedCount, errors });
        };
        
        transaction.onerror = () => {
            reject(transaction.error);
        };
    });
}

// Backup sync metadata
function backupSyncMeta() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Database not initialized"));
            return;
        }
        
        const transaction = db.transaction(["syncMeta"], "readwrite");
        const store = transaction.objectStore("syncMeta");
        
        const meta = {
            key: "last_backup",
            timestamp: new Date().toISOString(),
            stats: {}
        };
        
        // Get stats for backup
        getDatabaseStats().then(stats => {
            meta.stats = stats;
            
            const request = store.put(meta);
            
            request.onsuccess = () => {
                resolve(meta);
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        }).catch(reject);
    });
}

// Get last backup info
function getLastBackupInfo() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Database not initialized"));
            return;
        }
        
        const transaction = db.transaction(["syncMeta"], "readonly");
        const store = transaction.objectStore("syncMeta");
        const request = store.get("last_backup");
        
        request.onsuccess = () => {
            resolve(request.result);
        };
        
        request.onerror = () => {
            // No backup yet
            resolve(null);
        };
    });
}