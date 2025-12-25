// csv.js - CSV Export/Import with SyncAction

function exportCSV() {
    getAllEntries(d => {
        // Filter out entries that are synced and not modified
        const entriesToExport = d.filter(e => 
            !e.synced || (e.syncRemarks && e.syncRemarks !== 'synced')
        );
        
        if (entriesToExport.length === 0) {
            alert("No unsynced entries to export");
            return;
        }
        
        // Create CSV header with SyncAction
        let csv = "ID,Date,Description,Amount,MainCategory,SubCategory,SyncAction\n";
        
        // Add each entry as a row
        entriesToExport.forEach(e => {
            let syncAction = 'new';
            
            if (e.syncRemarks === 'deleted') {
                syncAction = 'deleted';
            } else if (e.synced) {
                syncAction = 'edited';
            }
            
            const row = [
                e.id,
                `"${e.date}"`,
                `"${e.desc.replace(/"/g, '""')}"`,
                e.amount,
                `"${e.main.replace(/"/g, '""')}"`,
                `"${e.sub.replace(/"/g, '""')}"`,
                syncAction
            ];
            csv += row.join(",") + "\n";
        });
        
        // Create and trigger download
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        
        if (navigator.msSaveBlob) {
            navigator.msSaveBlob(blob, `accounts_export_${new Date().toISOString().split("T")[0]}.csv`);
        } else {
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = `export_${getTimestamp()}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
        
        alert(`Exported ${entriesToExport.length} entries to CSV`);
    });
}

function getTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

function importCSV(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!confirm("Import entries from CSV? This will add new entries without deleting existing ones.")) {
        event.target.value = "";
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const csvText = e.target.result;
        const lines = csvText.split("\n");
        
        let importedCount = 0;
        let skippedCount = 0;
        
        // Skip header row (index 0)
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Parse CSV row
            const row = parseCSVRow(line);
            
            if (row.length >= 7) {
                try {
                    const syncAction = row[6].replace(/"/g, "");
                    
                    // Skip deleted entries in import
                    if (syncAction === 'deleted') {
                        skippedCount++;
                        continue;
                    }
                    
                    const entry = {
                        id: row[0] || genID(i),
                        date: row[1].replace(/"/g, ""),
                        desc: row[2].replace(/"/g, ""),
                        main: row[4].replace(/"/g, ""),
                        sub: row[5].replace(/"/g, ""),
                        amount: parseFloat(row[3]),
                        synced: true, // Mark as synced when imported
                        syncRemarks: 'synced'
                    };
                    
                    // Validate entry
                    if (entry.desc && !isNaN(entry.amount)) {
                        saveEntry(entry);
                        importedCount++;
                    } else {
                        skippedCount++;
                    }
                } catch (error) {
                    console.error("Error parsing row:", row, error);
                    skippedCount++;
                }
            }
        }
        
        // Reset file input
        event.target.value = "";
        
        // Update UI
        setTimeout(() => {
            calcTotal();
            loadSaved();
            loadLedger();
            updateSyncStatus();
            
            alert(`Import complete!\n\nImported: ${importedCount} entries\nSkipped: ${skippedCount} entries`);
        }, 500);
    };
    
    reader.onerror = function() {
        alert("Error reading file");
        event.target.value = "";
    };
    
    reader.readAsText(file);
}

// Helper function to parse CSV row (handling quoted fields with commas)
function parseCSVRow(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current);
    return result;
}

function exportToDriveCSV(entries) {
    let csv = "ID,Date,Description,Amount,MainCategory,SubCategory,SyncAction\n";
    
    entries.forEach(e => {
        let syncAction = 'new';
        
        if (e.syncRemarks === 'deleted') {
            syncAction = 'deleted';
        } else if (e.synced) {
            syncAction = 'edited';
        }
        
        const row = [
            e.id,
            `"${e.date}"`,
            `"${e.desc.replace(/"/g, '""')}"`,
            e.amount,
            `"${e.main.replace(/"/g, '""')}"`,
            `"${e.sub.replace(/"/g, '""')}"`,
            syncAction
        ];
        csv += row.join(",") + "\n";
    });
    
    return csv;
}

function parseDriveCSV(csvText) {
    const lines = csvText.split("\n");
    const entries = [];
    
    if (lines.length < 2) return entries;
    
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const row = parseCSVRow(line);
        if (row.length < 7) continue;
        
        const entry = {
            id: row[0].replace(/"/g, ''),
            date: row[1].replace(/"/g, ''),
            desc: row[2].replace(/"/g, ''),
            amount: parseFloat(row[3]),
            main: row[4].replace(/"/g, ''),
            sub: row[5].replace(/"/g, ''),
            syncRemarks: 'synced',
            synced: true
        };
        
        entries.push(entry);
    }
    
    return entries;
}

// Export categories to CSV
function exportCategoriesCSV() {
    const heads = JSON.parse(localStorage.getItem("heads")) || {};
    
    if (Object.keys(heads).length === 0) {
        alert("No categories to export");
        return;
    }
    
    let csv = "Main Category,Sub Category\n";
    
    for (let main in heads) {
        if (heads[main].length === 0) {
            csv += `"${main.replace(/"/g, '""')}",\n`;
        } else {
            heads[main].forEach(sub => {
                csv += `"${main.replace(/"/g, '""')}","${sub.replace(/"/g, '""')}"\n`;
            });
        }
    }
    
    // Create and trigger download
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.href = url;
    link.download = `categories_backup_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert("Categories exported to CSV");
}

// Import categories from CSV
function importCategoriesCSV(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!confirm("Import categories from CSV? This will add new categories without deleting existing ones.")) {
        event.target.value = "";
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const csvText = e.target.result;
        const lines = csvText.split("\n");
        const heads = JSON.parse(localStorage.getItem("heads")) || {};
        
        let importedCount = 0;
        
        // Skip header row (index 0)
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const row = parseCSVRow(line);
            
            if (row.length >= 2) {
                const main = row[0].replace(/"/g, "").trim();
                const sub = row[1].replace(/"/g, "").trim();
                
                if (main) {
                    if (!heads[main]) {
                        heads[main] = [];
                    }
                    
                    if (sub && !heads[main].includes(sub)) {
                        heads[main].push(sub);
                        importedCount++;
                    }
                }
            }
        }
        
        // Save back to localStorage
        localStorage.setItem("heads", JSON.stringify(heads));
        
        // Reset file input
        event.target.value = "";
        
        // Update UI
        setTimeout(() => {
            renderHeads();
            updateAllDropdowns();
            alert(`Imported ${importedCount} categories from CSV`);
        }, 100);
    };
    
    reader.onerror = function() {
        alert("Error reading file");
        event.target.value = "";
    };
    
    reader.readAsText(file);
}

// Helper function to generate ID (same as in app.js)
function genID(i) {
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    const ss = String(d.getSeconds()).padStart(2, "0");
    const ms = String(d.getMilliseconds()).padStart(3, "0");
    return `${ymd}${ss}${ms}${i+1}`;
}
