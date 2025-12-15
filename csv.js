// Export all entries to CSV
function exportCSV() {
    getAllEntries(d => {
        if (d.length === 0) {
            alert("No entries to export");
            return;
        }
        
        // Create CSV header
        let csv = "ID,Date,Description,Main Category,Sub Category,Amount,Sync Status\n";
        
        // Add each entry as a row
        d.forEach(e => {
            const syncStatus = e.syncRemarks || (e.synced ? "synced" : "pending");
            const row = [
                e.id,
                `"${e.date}"`,
                `"${e.desc.replace(/"/g, '""')}"`,
                `"${e.main.replace(/"/g, '""')}"`,
                `"${e.sub.replace(/"/g, '""')}"`,
                e.amount,
                syncStatus
            ];
            csv += row.join(",") + "\n";
        });
        
        // Create and trigger download
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        
        if (navigator.msSaveBlob) {
            // For IE
            navigator.msSaveBlob(blob, "accounts_backup.csv");
        } else {
            // For modern browsers
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = `accounts_backup_${new Date().toISOString().split("T")[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
        
        alert(`Exported ${d.length} entries to CSV`);
    });
}

// Import entries from CSV file
function importCSV(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!confirm("Import entries from CSV? This will add new entries without deleting existing ones.")) {
        event.target.value = ""; // Reset file input
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
            if (!line) continue; // Skip empty lines
            
            // Parse CSV row
            const row = parseCSVRow(line);
            
            if (row.length >= 6) {
                try {
                    const entry = {
                        id: row[0] || genID(i),
                        date: row[1].replace(/"/g, ""),
                        desc: row[2].replace(/"/g, ""),
                        main: row[3].replace(/"/g, ""),
                        sub: row[4].replace(/"/g, ""),
                        amount: parseFloat(row[5]),
                        synced: row[6] === "synced",
                        syncRemarks: row[6] || "new"
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
            updateGlobalNeonStatus();
            
            alert(`Import complete!\n\nImported: ${importedCount} entries\nSkipped: ${skippedCount} entries`);
        }, 500);
    };
    
    reader.onerror = function() {
        alert("Error reading file");
        event.target.value = ""; // Reset file input
    };
    
    reader.readAsText(file);
}

// Helper function to parse CSV row (handling quoted fields with commas)
function parseCSVRow(line) {
    const result = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            // Toggle quote mode
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            // End of field
            result.push(current);
            current = "";
        } else {
            current += char;
        }
    }
    
    // Add last field
    result.push(current);
    
    return result;
}

// Helper function to generate ID (same as in app.js)
function genID(i) {
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    const ss = String(d.getSeconds()).padStart(2, "0");
    const ms = String(d.getMilliseconds()).padStart(3, "0");
    return `${ymd}${ss}${ms}${i+1}`;
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
