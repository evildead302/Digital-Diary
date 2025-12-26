// app.js - Main Application with Google Drive Integration

// ==================== GLOBAL VARIABLES ====================
const pages = document.querySelectorAll(".page");
let heads = JSON.parse(localStorage.getItem("heads")) || {};
let tempEntries = [];
let isEditing = false;
let editingEntryId = null;

// ==================== PAGE NAVIGATION ====================
function showPage(id) {
    try {
        pages.forEach(p => {
            p.classList.remove("active");
            p.style.display = "none";
        });
        
        const page = document.getElementById(id);
        if (page) {
            page.style.display = "block";
            page.classList.add("active");
            
            // Initialize specific pages with error handling
            try {
                switch(id) {
                    case 'home':
                        loadHomeData();
                        break;
                    case 'entry':
                        updateEntryDropdowns();
                        loadSaved();
                        resetEntryForm();
                        break;
                    case 'balance':
                        calcTotal();
                        break;
                    case 'ledger':
                        updateLedgerCategories();
                        loadLedger();
                        break;
                    case 'search':
                        updateSearchCategories();
                        break;
                    case 'backup':
                        updateBackupStatus();
                        break;
                    case 'settings':
                        updateDriveUI();
                        break;
                }
            } catch (pageError) {
                console.error(`Error initializing page ${id}:`, pageError);
                if (id === 'settings') {
                    // Show basic settings page even if updateDriveUI fails
                    const statusElement = document.getElementById('driveStatus');
                    if (statusElement) {
                        statusElement.innerHTML = '<span style="color: #ff9800;">⚠️ Settings loaded with errors</span>';
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error in showPage:", error);
        // Fallback to home page if navigation fails
        const homePage = document.getElementById('home');
        if (homePage) {
            pages.forEach(p => {
                p.classList.remove("active");
                p.style.display = "none";
            });
            homePage.style.display = "block";
            homePage.classList.add("active");
        }
    }
}

// Initialize with home page
showPage("home");

// ==================== CATEGORY MANAGEMENT ====================
function saveHeads() {
    localStorage.setItem("heads", JSON.stringify(heads));
    renderHeads();
    updateAllDropdowns();
}

function renderHeads() {
    try {
        const mainForSub = document.getElementById("mainForSub");
        const entryMain = document.getElementById("entryMain");
        const headList = document.getElementById("headList");
        
        // Clear all
        if (mainForSub) mainForSub.innerHTML = '<option value="">-- Select Main --</option>';
        if (entryMain) entryMain.innerHTML = '<option value="">-- Select Main --</option>';
        if (headList) headList.innerHTML = '';
        
        // Populate
        for(let main in heads) {
            // Add to dropdowns
            if (mainForSub) {
                const option1 = document.createElement("option");
                option1.value = main;
                option1.textContent = main;
                mainForSub.appendChild(option1);
            }
            
            if (entryMain) {
                const option2 = document.createElement("option");
                option2.value = main;
                option2.textContent = main;
                entryMain.appendChild(option2);
            }
            
            // Add to list
            if (headList) {
                const li = document.createElement("li");
                li.innerHTML = `
                    <div class="category-item">
                        <span class="main-category"><strong>${main}</strong></span>
                        <button onclick="deleteMainHead('${main}')" class="small-btn danger-btn">🗑️ Delete</button>
                        <ul class="subcategory-list">
                            ${heads[main].map(sub => `
                                <li>
                                    <span>${sub}</span>
                                    <button onclick="deleteSubHead('${main}','${sub}')" class="small-btn">❌</button>
                                </li>
                            `).join("")}
                        </ul>
                    </div>
                `;
                headList.appendChild(li);
            }
        }
    } catch (error) {
        console.error("Error in renderHeads:", error);
    }
}

// Initialize categories
renderHeads();

// Update all dropdowns
function updateAllDropdowns() {
    updateEntryDropdowns();
    updateLedgerCategories();
    updateSearchCategories();
}

// ==================== ENTRY PAGE FUNCTIONS ====================
function updateEntryDropdowns() {
    try {
        const entryMain = document.getElementById("entryMain");
        const entrySub = document.getElementById("entrySub");
        
        if (!entryMain || !entrySub) return;
        
        // Save current selection
        const selectedMain = entryMain.value;
        
        // Update main categories
        entryMain.innerHTML = '<option value="">-- Select Main --</option>';
        for (let main in heads) {
            const option = document.createElement("option");
            option.value = main;
            option.textContent = main;
            if (main === selectedMain) option.selected = true;
            entryMain.appendChild(option);
        }
        
        // Update sub categories based on selected main
        updateEntrySubheads();
    } catch (error) {
        console.error("Error in updateEntryDropdowns:", error);
    }
}

function updateEntrySubheads() {
    try {
        const entryMain = document.getElementById("entryMain");
        const entrySub = document.getElementById("entrySub");
        
        if (!entryMain || !entrySub) return;
        
        const selectedMain = entryMain.value;
        entrySub.innerHTML = '<option value="">-- Select Sub --</option>';
        
        if (selectedMain && heads[selectedMain]) {
            heads[selectedMain].forEach(sub => {
                const option = document.createElement("option");
                option.value = sub;
                option.textContent = sub;
                entrySub.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Error in updateEntrySubheads:", error);
    }
}

// ==================== DATE FUNCTIONS ====================
function formatDate(v) {
    try {
        const d = new Date(v);
        return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth()+1).padStart(2, "0")}-${d.getFullYear()}`;
    } catch (error) {
        const today = new Date();
        return `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth()+1).padStart(2, "0")}-${today.getFullYear()}`;
    }
}

function genID(i) {
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    const ss = String(d.getSeconds()).padStart(2, "0");
    const ms = String(d.getMilliseconds()).padStart(3, "0");
    return `${ymd}${ss}${ms}${i+1}`;
}

// ==================== TEMPORARY ENTRIES ====================
function addTemp() {
    try {
        // Get form elements
        const entryMain = document.getElementById("entryMain");
        const entrySub = document.getElementById("entrySub");
        const desc = document.getElementById("desc");
        const amount = document.getElementById("amount");
        const date = document.getElementById("date");
        
        // Validate inputs
        if (!entryMain || !entryMain.value) {
            alert("Please select a main category");
            return;
        }
        
        if (!entrySub || !entrySub.value) {
            alert("Please select a sub category");
            return;
        }
        
        if (!desc || !desc.value.trim()) {
            alert("Please enter a description");
            return;
        }
        
        const amountValue = parseFloat(amount.value);
        if (isNaN(amountValue)) {
            alert("Please enter a valid amount");
            return;
        }
        
        // Use today's date if not specified
        const entryDate = date.value ? formatDate(date.value) : formatDate(new Date());
        
        // Add to temp entries
        tempEntries.push({
            date: entryDate,
            desc: desc.value.trim(),
            amount: amountValue,
            main: entryMain.value,
            sub: entrySub.value,
            synced: false,
            syncRemarks: "new"
        });
        
        // Clear only description and amount, keep categories
        desc.value = "";
        amount.value = "";
        
        renderTemp();
    } catch (error) {
        console.error("Error in addTemp:", error);
        alert("Error adding temporary entry: " + error.message);
    }
}

function renderTemp() {
    try {
        const tempList = document.getElementById("tempList");
        if (!tempList) return;
        
        tempList.innerHTML = "";
        
        if (tempEntries.length === 0) {
            tempList.innerHTML = '<div class="no-entries">No temporary entries</div>';
            return;
        }
        
        // Create table container with scrolling
        const tableContainer = document.createElement("div");
        tableContainer.className = "table-container scrollable-table";
        tableContainer.style.maxHeight = "400px";
        tableContainer.style.overflowY = "auto";
        tableContainer.style.overflowX = "auto";
        tableContainer.style.borderRadius = "8px";
        tableContainer.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
        
        // Create table
        const table = document.createElement("table");
        table.className = "fixed-table";
        table.style.width = "100%";
        table.style.minWidth = "800px";
        table.style.borderCollapse = "collapse";
        
        // Create header with white text
        const thead = document.createElement("thead");
        thead.style.position = "sticky";
        thead.style.top = "0";
        thead.style.zIndex = "10";
        thead.innerHTML = `
            <tr>
                <th>Date</th>
                <th>Main Category</th>
                <th>Sub Category</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Actions</th>
            </tr>
        `;
        
        // Style header cells
        const headerCells = thead.querySelectorAll("th");
        headerCells.forEach(cell => {
            cell.style.backgroundColor = "#4a6fa5";
            cell.style.color = "white";
            cell.style.padding = "14px 12px";
            cell.style.textAlign = "left";
            cell.style.fontWeight = "600";
            cell.style.fontSize = "0.9em";
            cell.style.textTransform = "uppercase";
            cell.style.letterSpacing = "0.5px";
            cell.style.borderBottom = "3px solid #2d4468";
            cell.style.position = "sticky";
            cell.style.top = "0";
        });
        
        table.appendChild(thead);
        
        // Create body
        const tbody = document.createElement("tbody");
        
        tempEntries.forEach((e, i) => {
            const row = document.createElement("tr");
            row.style.borderLeft = e.amount < 0 ? "4px solid #f44336" : "4px solid #4caf50";
            row.style.transition = "all 0.25s ease";
            
            row.innerHTML = `
                <td style="padding: 12px; border-bottom: 1px solid #eaeaea; min-width: 110px;">${e.date}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eaeaea; min-width: 130px;">${e.main}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eaeaea; min-width: 130px;">${e.sub}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eaeaea; min-width: 180px; max-width: 350px; word-wrap: break-word; white-space: normal; line-height: 1.5;">${e.desc}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eaeaea; min-width: 130px; text-align: right; font-weight: 700; font-size: 1.05em; color: ${e.amount < 0 ? '#c62828' : '#2e7d32'}">
                    ${e.amount < 0 ? '-' : '+'}PKR ${Math.abs(e.amount).toFixed(2)}
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #eaeaea; min-width: 110px; text-align: center;">
                    <button onclick="editTemp(${i})" class="small-btn edit-btn">✏️</button>
                    <button onclick="deleteTemp(${i})" class="small-btn danger-btn">🗑️</button>
                </td>
            `;
            
            // Alternate row colors
            row.style.backgroundColor = i % 2 === 0 ? '#f8fafc' : '#ffffff';
            
            // Hover effect
            row.addEventListener('mouseenter', () => {
                row.style.backgroundColor = e.amount < 0 ? '#ffebee' : '#f1f8e9';
                row.style.transform = "translateX(2px)";
            });
            
            row.addEventListener('mouseleave', () => {
                row.style.backgroundColor = i % 2 === 0 ? '#f8fafc' : '#ffffff';
                row.style.transform = "translateX(0)";
            });
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        tableContainer.appendChild(table);
        tempList.appendChild(tableContainer);
    } catch (error) {
        console.error("Error in renderTemp:", error);
        const tempList = document.getElementById("tempList");
        if (tempList) {
            tempList.innerHTML = '<div class="no-entries" style="color: #f44336;">Error displaying temporary entries</div>';
        }
    }
}

function editTemp(i) {
    try {
        const e = tempEntries[i];
        
        // Fill form with entry data
        document.getElementById("date").value = e.date.split("-").reverse().join("-");
        document.getElementById("desc").value = e.desc;
        document.getElementById("amount").value = e.amount;
        
        // Set categories
        const entryMain = document.getElementById("entryMain");
        const entrySub = document.getElementById("entrySub");
        
        if (entryMain) {
            entryMain.value = e.main;
            updateEntrySubheads();
            
            setTimeout(() => {
                if (entrySub) entrySub.value = e.sub;
            }, 100);
        }
        
        // Remove from temp entries
        tempEntries.splice(i, 1);
        renderTemp();
    } catch (error) {
        console.error("Error in editTemp:", error);
        alert("Error editing temporary entry: " + error.message);
    }
}

function deleteTemp(i) {
    if (confirm("Delete this temporary entry?")) {
        tempEntries.splice(i, 1);
        renderTemp();
    }
}

function clearTemp() {
    if (tempEntries.length > 0 && confirm("Clear all temporary entries?")) {
        tempEntries = [];
        renderTemp();
    }
}

// ==================== SAVE ALL ENTRIES ====================
function saveAll() {
    try {
        if (tempEntries.length === 0 && !isEditing) {
            alert("No entries to save");
            return;
        }
        
        if (isEditing && editingEntryId) {
            // Save edited entry
            getAllEntries(async d => {
                try {
                    const existingEntry = d.find(x => x.id === editingEntryId);
                    if (!existingEntry) return;
                    
                    const editedEntry = {
                        id: editingEntryId,
                        date: formatDate(document.getElementById("date").value),
                        desc: document.getElementById("desc").value.trim(),
                        amount: parseFloat(document.getElementById("amount").value),
                        main: document.getElementById("entryMain").value,
                        sub: document.getElementById("entrySub").value,
                        synced: existingEntry.synced,
                        syncRemarks: existingEntry.synced ? "edited" : "new"
                    };
                    
                    await saveEntry(editedEntry);
                    
                    cancelEdit();
                    loadSaved();
                    calcTotal();
                    loadLedger();
                    
                    alert("✅ Entry updated successfully!");
                } catch (error) {
                    console.error("Error saving edited entry:", error);
                    alert("Error updating entry: " + error.message);
                }
            });
            return;
        }
        
        if (tempEntries.length > 0) {
            if (!confirm(`Save ${tempEntries.length} entries to database?`)) {
                return;
            }
            
            // Save each entry
            tempEntries.forEach((e, i) => {
                e.id = genID(i);
                e.synced = false;
                e.syncRemarks = "new";
                saveEntry(e);
            });
            
            // Clear temp entries
            tempEntries = [];
            renderTemp();
            
            // Update UI
            loadSaved();
            calcTotal();
            
            alert(`✅ Successfully saved ${tempEntries.length} entries!`);
        }
    } catch (error) {
        console.error("Error in saveAll:", error);
        alert("Error saving entries: " + error.message);
    }
}

// ==================== SAVED ENTRIES MANAGEMENT ====================
function loadSaved() {
    getAllEntries(d => {
        try {
            const savedEntryList = document.getElementById("savedEntryList");
            if (!savedEntryList) return;
            
            savedEntryList.innerHTML = "";
            
            // Filter out deleted entries
            const activeEntries = d.filter(e => e.syncRemarks !== "deleted");
            
            // Sort by date (newest first)
            activeEntries.sort((a, b) => {
                const dateA = new Date(a.date.split("-").reverse().join("-"));
                const dateB = new Date(b.date.split("-").reverse().join("-"));
                return dateB - dateA;
            });
            
            // Take only recent entries (20)
            const recentEntries = activeEntries.slice(0, 20);
            
            if (recentEntries.length === 0) {
                savedEntryList.innerHTML = '<div class="no-entries">No saved entries</div>';
                return;
            }
        
            // Create table container with scrolling
            const tableContainer = document.createElement("div");
            tableContainer.className = "table-container scrollable-table";
            tableContainer.style.maxHeight = "400px";
            tableContainer.style.overflowY = "auto";
            tableContainer.style.overflowX = "auto";
            tableContainer.style.borderRadius = "8px";
            tableContainer.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
            
            // Create table
            const table = document.createElement("table");
            table.className = "fixed-table";
            table.style.width = "100%";
            table.style.minWidth = "800px";
            table.style.borderCollapse = "collapse";
            
            // Create header with white text
            const thead = document.createElement("thead");
            thead.style.position = "sticky";
            thead.style.top = "0";
            thead.style.zIndex = "10";
            thead.innerHTML = `
                <tr>
                    <th>Date</th>
                    <th>Main Category</th>
                    <th>Sub Category</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Sync Status</th>
                    <th>Actions</th>
                </tr>
            `;
            
            // Style header cells
            const headerCells = thead.querySelectorAll("th");
            headerCells.forEach(cell => {
                cell.style.backgroundColor = "#4a6fa5";
                cell.style.color = "white";
                cell.style.padding = "14px 12px";
                cell.style.textAlign = "left";
                cell.style.fontWeight = "600";
                cell.style.fontSize = "0.9em";
                cell.style.textTransform = "uppercase";
                cell.style.letterSpacing = "0.5px";
                cell.style.borderBottom = "3px solid #2d4468";
                cell.style.position = "sticky";
                cell.style.top = "0";
            });
            
            table.appendChild(thead);
            
            // Create body
            const tbody = document.createElement("tbody");
            
            recentEntries.forEach((e, i) => {
                const row = document.createElement("tr");
                row.style.borderLeft = e.amount < 0 ? "4px solid #f44336" : "4px solid #4caf50";
                row.style.transition = "all 0.25s ease";
                
                const syncStatus = e.synced ? 
                    (e.syncRemarks === 'edited' ? '✏️ Edited' : '✅ Synced') : 
                    '🔄 Pending';
                
                row.innerHTML = `
                    <td style="padding: 12px; border-bottom: 1px solid #eaeaea; min-width: 110px;">${e.date}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eaeaea; min-width: 130px;">${e.main}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eaeaea; min-width: 130px;">${e.sub}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eaeaea; min-width: 180px; max-width: 350px; word-wrap: break-word; white-space: normal; line-height: 1.5;">${e.desc}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eaeaea; min-width: 130px; text-align: right; font-weight: 700; font-size: 1.05em; color: ${e.amount < 0 ? '#c62828' : '#2e7d32'}">
                        ${e.amount < 0 ? '-' : '+'}PKR ${Math.abs(e.amount).toFixed(2)}
                    </td>
                    <td style="padding: 12px; border-bottom: 1px solid #eaeaea; min-width: 120px; text-align: center;">
                        ${syncStatus}
                    </td>
                    <td style="padding: 12px; border-bottom: 1px solid #eaeaea; min-width: 110px; text-align: center;">
                        <button onclick="editSavedEntry('${e.id}')" class="small-btn edit-btn">✏️</button>
                        <button onclick="markEntryAsDeleted('${e.id}')" class="small-btn danger-btn">🗑️</button>
                    </td>
                `;
                
                row.style.backgroundColor = i % 2 === 0 ? '#f8fafc' : '#ffffff';
                
                row.addEventListener('mouseenter', () => {
                    row.style.backgroundColor = e.amount < 0 ? '#ffebee' : '#f1f8e9';
                    row.style.transform = "translateX(2px)";
                });
                
                row.addEventListener('mouseleave', () => {
                    row.style.backgroundColor = i % 2 === 0 ? '#f8fafc' : '#ffffff';
                    row.style.transform = "translateX(0)";
                });
                
                tbody.appendChild(row);
            });
            
            table.appendChild(tbody);
            tableContainer.appendChild(table);
            savedEntryList.appendChild(tableContainer);
        } catch (error) {
            console.error("Error in loadSaved:", error);
            const savedEntryList = document.getElementById("savedEntryList");
            if (savedEntryList) {
                savedEntryList.innerHTML = '<div class="no-entries" style="color: #f44336;">Error loading saved entries</div>';
            }
        }
    });
}

function markEntryAsDeleted(id) {
    if (!confirm("Mark this entry as deleted? It will be removed from balance but kept for Google Drive sync.")) {
        return;
    }
    
    getAllEntries(async d => {
        try {
            const entry = d.find(x => x.id === id);
            if (!entry) return;
            
            entry.syncRemarks = "deleted";
            entry.synced = false;
            
            await saveEntry(entry);
            
            loadSaved();
            calcTotal();
            loadLedger();
            
            alert("✅ Entry marked as deleted. Will be removed on next sync.");
        } catch (error) {
            console.error("Error marking entry as deleted:", error);
            alert("Error marking entry as deleted: " + error.message);
        }
    });
}

function editSavedEntry(id) {
    try {
        isEditing = true;
        editingEntryId = id;
        
        getAllEntries(d => {
            try {
                const e = d.find(x => x.id === id);
                if (!e) return;
                
                document.getElementById("date").value = e.date.split("-").reverse().join("-");
                document.getElementById("desc").value = e.desc;
                document.getElementById("amount").value = e.amount;
                
                const entryMain = document.getElementById("entryMain");
                const entrySub = document.getElementById("entrySub");
                
                if (entryMain) {
                    entryMain.value = e.main;
                    updateEntrySubheads();
                    
                    setTimeout(() => {
                        if (entrySub) entrySub.value = e.sub;
                    }, 100);
                }
                
                const cancelBtn = document.getElementById("cancelEditBtn");
                if (cancelBtn) cancelBtn.style.display = "inline-block";
                
                const saveBtn = document.querySelector('button[onclick="saveAll()"]');
                if (saveBtn) saveBtn.textContent = "💾 Update Entry";
                
                const msg = document.createElement('div');
                msg.className = 'edit-message';
                msg.innerHTML = '<p style="color: #ff9800; margin: 10px 0;">✏️ Editing mode active. Make changes or click Cancel to keep original.</p>';
                
                const form = document.querySelector('.entry-form');
                if (form && !form.querySelector('.edit-message')) {
                    form.appendChild(msg);
                }
            } catch (error) {
                console.error("Error in editSavedEntry:", error);
                alert("Error loading entry for editing: " + error.message);
            }
        });
    } catch (error) {
        console.error("Error in editSavedEntry:", error);
        alert("Error entering edit mode: " + error.message);
    }
}

function cancelEdit() {
    if (isEditing) {
        isEditing = false;
        editingEntryId = null;
        
        const cancelBtn = document.getElementById("cancelEditBtn");
        if (cancelBtn) cancelBtn.style.display = "none";
        
        const saveBtn = document.querySelector('button[onclick="saveAll()"]');
        if (saveBtn) saveBtn.textContent = "💾 Save All";
        
        const msg = document.querySelector('.edit-message');
        if (msg) msg.remove();
        
        resetEntryForm();
    }
}

function resetEntryForm() {
    try {
        const today = new Date().toISOString().split("T")[0];
        document.getElementById("date").value = today;
        document.getElementById("desc").value = "";
        document.getElementById("amount").value = "";
        document.getElementById("entryMain").value = "";
        document.getElementById("entrySub").value = "";
        
        isEditing = false;
        editingEntryId = null;
        
        const cancelBtn = document.getElementById("cancelEditBtn");
        if (cancelBtn) cancelBtn.style.display = "none";
        
        const saveBtn = document.querySelector('button[onclick="saveAll()"]');
        if (saveBtn) saveBtn.textContent = "💾 Save All";
        
        const msg = document.querySelector('.edit-message');
        if (msg) msg.remove();
    } catch (error) {
        console.error("Error in resetEntryForm:", error);
    }
}

// ==================== BALANCE CALCULATION ====================
function calcTotal() {
    getAllEntries(d => {
        try {
            const activeEntries = d.filter(e => e.syncRemarks !== "deleted");
            
            const total = activeEntries.reduce((a, b) => a + b.amount, 0);
            const income = activeEntries.filter(e => e.amount > 0).reduce((a, b) => a + b.amount, 0);
            const expense = Math.abs(activeEntries.filter(e => e.amount < 0).reduce((a, b) => a + b.amount, 0));
            
            const totalBalance = document.getElementById("totalBalance");
            if (totalBalance) {
                totalBalance.innerText = `PKR ${total.toFixed(2)}`;
                totalBalance.style.color = total >= 0 ? "#2e7d32" : "#c62828";
            }
            
            const totalIncome = document.getElementById("totalIncome");
            const totalExpense = document.getElementById("totalExpense");
            const netBalance = document.getElementById("netBalance");
            
            if (totalIncome) totalIncome.innerText = `PKR ${income.toFixed(2)}`;
            if (totalExpense) totalExpense.innerText = `PKR ${expense.toFixed(2)}`;
            if (netBalance) {
                netBalance.innerText = `PKR ${total.toFixed(2)}`;
                netBalance.style.color = total >= 0 ? "#2e7d32" : "#c62828";
            }
            
            const entryCount = document.getElementById("entryCount");
            if (entryCount) entryCount.innerText = `📝 Total Entries: ${activeEntries.length}`;
            
            renderBalance(activeEntries);
            updateSyncStatus(d);
            loadRecentEntries(activeEntries);
        } catch (error) {
            console.error("Error in calcTotal:", error);
        }
    });
}

function renderBalance(d) {
    try {
        const balanceList = document.getElementById("balanceList");
        if (!balanceList) return;
        
        let map = {};
        
        d.forEach(e => {
            map[e.main] = map[e.main] || {};
            map[e.main][e.sub] = (map[e.main][e.sub] || 0) + e.amount;
        });
        
        balanceList.innerHTML = "";
        
        for(let main in map) {
            const li = document.createElement("li");
            li.className = "category-balance";
            
            const mainTotal = Object.values(map[main]).reduce((a, b) => a + b, 0);
            
            li.innerHTML = `
                <div class="main-category-balance">
                    <span class="main-cat-name">${main}</span>
                    <span class="main-cat-total ${mainTotal >= 0 ? 'positive' : 'negative'}">
                        PKR ${Math.abs(mainTotal).toFixed(2)}
                    </span>
                </div>
                <ul class="subcategory-balance">
                    ${Object.entries(map[main]).map(([sub, amount]) => `
                        <li>
                            <span class="sub-cat-name">${sub}</span>
                            <span class="sub-cat-amount ${amount >= 0 ? 'positive' : 'negative'}">
                                ${amount >= 0 ? '+' : '-'}PKR ${Math.abs(amount).toFixed(2)}
                            </span>
                        </li>
                    `).join("")}
                </ul>
            `;
            
            balanceList.appendChild(li);
        }
    } catch (error) {
        console.error("Error in renderBalance:", error);
        const balanceList = document.getElementById("balanceList");
        if (balanceList) {
            balanceList.innerHTML = '<div class="no-entries" style="color: #f44336;">Error calculating balance</div>';
        }
    }
}

function loadRecentEntries(entries) {
    try {
        const recentEntries = document.getElementById("recentEntries");
        if (!recentEntries) return;
        
        entries.sort((a, b) => {
            const dateA = new Date(a.date.split("-").reverse().join("-"));
            const dateB = new Date(b.date.split("-").reverse().join("-"));
            return dateB - dateA;
        });
        
        const recent = entries.slice(0, 10);
        
        recentEntries.innerHTML = "";
        
        if (recent.length === 0) {
            recentEntries.innerHTML = '<div class="no-entries">No recent transactions</div>';
            return;
        }
        
        const tableContainer = document.createElement("div");
        tableContainer.className = "table-container scrollable-table";
        tableContainer.style.maxHeight = "400px";
        tableContainer.style.overflowY = "auto";
        tableContainer.style.overflowX = "auto";
        tableContainer.style.borderRadius = "8px";
        tableContainer.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
        tableContainer.style.marginTop = "15px";
        
        const table = document.createElement("table");
        table.className = "fixed-table";
        table.style.width = "100%";
        table.style.minWidth = "800px";
        table.style.borderCollapse = "collapse";
        
        const thead = document.createElement("thead");
        thead.style.position = "sticky";
        thead.style.top = "0";
        thead.style.zIndex = "10";
        thead.innerHTML = `
            <tr>
                <th>Date</th>
                <th>Main Category</th>
                <th>Sub Category</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Sync</th>
            </tr>
        `;
        
        const headerCells = thead.querySelectorAll("th");
        headerCells.forEach(cell => {
            cell.style.backgroundColor = "#4a6fa5";
            cell.style.color = "white";
            cell.style.padding = "14px 12px";
            cell.style.textAlign = "left";
            cell.style.fontWeight = "600";
            cell.style.fontSize = "0.9em";
            cell.style.textTransform = "uppercase";
            cell.style.letterSpacing = "0.5px";
            cell.style.borderBottom = "3px solid #2d4468";
            cell.style.position = "sticky";
            cell.style.top = "0";
        });
        
        table.appendChild(thead);
        
        const tbody = document.createElement("tbody");
        
        recent.forEach((e, i) => {
            const row = document.createElement("tr");
            row.style.borderLeft = e.amount < 0 ? "4px solid #f44336" : "4px solid #4caf50";
            row.style.transition = "all 0.25s ease";
            
            const syncIcon = e.synced ? '✅' : '🔄';
            
            row.innerHTML = `
                <td style="padding: 12px; border-bottom: 1px solid #eaeaea; min-width: 110px;">${e.date}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eaeaea; min-width: 130px;">${e.main}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eaeaea; min-width: 130px;">${e.sub}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eaeaea; min-width: 180px; max-width: 350px; word-wrap: break-word; white-space: normal; line-height: 1.5;">${e.desc}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eaeaea; min-width: 130px; text-align: right; font-weight: 700; font-size: 1.05em; color: ${e.amount < 0 ? '#c62828' : '#2e7d32'}">
                    ${e.amount < 0 ? '-' : '+'}PKR ${Math.abs(e.amount).toFixed(2)}
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #eaeaea; min-width: 80px; text-align: center;">
                    ${syncIcon}
                </td>
            `;
            
            row.style.backgroundColor = i % 2 === 0 ? '#f8fafc' : '#ffffff';
            
            row.addEventListener('mouseenter', () => {
                row.style.backgroundColor = e.amount < 0 ? '#ffebee' : '#f1f8e9';
                row.style.transform = "translateX(2px)";
            });
            
            row.addEventListener('mouseleave', () => {
                row.style.backgroundColor = i % 2 === 0 ? '#f8fafc' : '#ffffff';
                row.style.transform = "translateX(0)";
            });
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        tableContainer.appendChild(table);
        recentEntries.appendChild(tableContainer);
    } catch (error) {
        console.error("Error in loadRecentEntries:", error);
        const recentEntries = document.getElementById("recentEntries");
        if (recentEntries) {
            recentEntries.innerHTML = '<div class="no-entries" style="color: #f44336;">Error loading recent entries</div>';
        }
    }
}

function loadHomeData() {
    calcTotal();
}

// ==================== GOOGLE DRIVE CONFIGURATION FUNCTIONS ====================
function updateDriveUI() {
    try {
        // Update form fields with saved values
        const config = JSON.parse(localStorage.getItem('gdriveConfig') || '{}');
        
        // Safely get form elements
        const clientIdInput = document.getElementById('gdriveClientId');
        const apiKeyInput = document.getElementById('gdriveApiKey');
        const folderIdInput = document.getElementById('gdriveFolderId');
        
        if (clientIdInput) clientIdInput.value = config.clientId || '';
        if (apiKeyInput) apiKeyInput.value = config.apiKey || '';
        if (folderIdInput) folderIdInput.value = config.folderId || '';
        
        // Update status display
        const statusElement = document.getElementById('driveStatus');
        const connectBtn = document.getElementById('driveConnectBtn');
        const disconnectBtn = document.getElementById('driveDisconnectBtn');
        
        // Check if driveSync exists
        if (!window.driveSync) {
            if (statusElement) {
                statusElement.innerHTML = '<span style="color: #f44336;">❌ Drive sync not loaded</span>';
                statusElement.className = 'status-indicator status-disconnected';
            }
            if (connectBtn) {
                connectBtn.disabled = true;
                connectBtn.style.display = 'inline-block';
            }
            if (disconnectBtn) {
                disconnectBtn.style.display = 'none';
            }
            return;
        }
        
        const status = driveSync.getConfigStatus();
        
        if (statusElement) {
            if (status.isConnected) {
                statusElement.innerHTML = '<span style="color: #4caf50;">✅ Connected to Google Drive</span>';
                statusElement.className = 'status-indicator status-connected';
            } else if (status.isConfigured) {
                statusElement.innerHTML = '<span style="color: #ff9800;">🔄 Configured but not connected</span>';
                statusElement.className = 'status-indicator status-configured';
            } else {
                statusElement.innerHTML = '<span style="color: #f44336;">❌ Not configured</span>';
                statusElement.className = 'status-indicator status-disconnected';
            }
        }
        
        if (connectBtn) {
            connectBtn.disabled = !status.isConfigured;
            connectBtn.style.display = status.isConnected ? 'none' : 'inline-block';
        }
        
        if (disconnectBtn) {
            disconnectBtn.style.display = status.isConnected ? 'inline-block' : 'none';
        }
        
    } catch (error) {
        console.error('Error in updateDriveUI:', error);
        const statusElement = document.getElementById('driveStatus');
        if (statusElement) {
            statusElement.innerHTML = `<span style="color: #f44336;">❌ Error: ${error.message}</span>`;
            statusElement.className = 'status-indicator status-disconnected';
        }
        
        // Ensure buttons are in a safe state
        const connectBtn = document.getElementById('driveConnectBtn');
        const disconnectBtn = document.getElementById('driveDisconnectBtn');
        
        if (connectBtn) {
            connectBtn.disabled = true;
            connectBtn.style.display = 'inline-block';
        }
        if (disconnectBtn) {
            disconnectBtn.style.display = 'none';
        }
    }
}

function saveDriveConfig() {
    try {
        const clientId = document.getElementById('gdriveClientId').value.trim();
        const apiKey = document.getElementById('gdriveApiKey').value.trim();
        const folderId = document.getElementById('gdriveFolderId').value.trim();
        
        // Validate inputs
        if (!clientId) {
            alert('Please enter Client ID');
            return;
        }
        
        if (!clientId.includes('.apps.googleusercontent.com')) {
            if (!confirm('Client ID should end with .apps.googleusercontent.com\nContinue anyway?')) {
                return;
            }
        }
        
        if (!apiKey) {
            alert('Please enter API Key');
            return;
        }
        
        if (!apiKey.startsWith('AIza')) {
            if (!confirm('API Key should start with AIza\nContinue anyway?')) {
                return;
            }
        }
        
        if (!folderId) {
            alert('Please enter Folder ID');
            return;
        }
        
        // Check if driveSync is available
        if (!window.driveSync) {
            alert('Drive sync library not loaded. Please refresh the page.');
            return;
        }
        
        // Save configuration
        const success = driveSync.saveConfig(clientId, apiKey, folderId);
        
        if (success) {
            alert('✅ Credentials saved successfully!\n\nNow click "Connect to Google Drive" to authenticate.');
            updateDriveUI();
        } else {
            alert('❌ Failed to save credentials');
        }
    } catch (error) {
        console.error('Save config error:', error);
        alert('Error saving credentials: ' + error.message);
    }
}

function clearDriveConfig() {
    if (confirm('Clear all Google Drive credentials? This will disconnect you.')) {
        try {
            if (window.driveSync) {
                driveSync.clearConfig();
            } else {
                localStorage.removeItem('gdriveConfig');
            }
            updateDriveUI();
            alert('✅ Credentials cleared');
        } catch (error) {
            console.error('Clear config error:', error);
            alert('Error clearing credentials: ' + error.message);
        }
    }
}

async function connectDrive() {
    try {
        const connectBtn = document.getElementById('driveConnectBtn');
        const originalText = connectBtn?.textContent || 'Connect';
        
        if (connectBtn) {
            connectBtn.textContent = '🔄 Connecting...';
            connectBtn.disabled = true;
        }
        
        // Check if driveSync exists
        if (!window.driveSync) {
            throw new Error('Drive sync library not loaded. Please refresh the page.');
        }
        
        await driveSync.connect();
        
        alert('✅ Successfully connected to Google Drive!');
        updateDriveUI();
        updateSyncStatus();
        
    } catch (error) {
        console.error('Connect error:', error);
        
        let errorMessage = error.message || 'Unknown error';
        if (error.error === 'popup_closed_by_user') {
            errorMessage = 'Login window was closed. Please try again.';
        } else if (error.error === 'access_denied') {
            errorMessage = 'Permission denied. Please grant access when prompted.';
        }
        
        alert('❌ Failed to connect: ' + errorMessage);
        
    } finally {
        const connectBtn = document.getElementById('driveConnectBtn');
        if (connectBtn) {
            connectBtn.textContent = '🔗 Connect to Google Drive';
            if (window.driveSync) {
                connectBtn.disabled = !driveSync.isConfigured;
            } else {
                connectBtn.disabled = true;
            }
        }
        updateDriveUI();
    }
}

function disconnectDrive() {
    if (confirm('Disconnect from Google Drive?')) {
        try {
            if (window.driveSync) {
                driveSync.disconnect();
            }
            updateDriveUI();
            updateSyncStatus();
            alert('✅ Disconnected from Google Drive');
        } catch (error) {
            console.error('Disconnect error:', error);
            alert('Error disconnecting: ' + error.message);
        }
    }
}

async function testDriveConnection() {
    if (!window.driveSync || !driveSync.isConfigured) {
        alert('Please configure Google Drive credentials first.');
        return;
    }
    
    const testBtn = document.querySelector('button[onclick="testDriveConnection()"]');
    const originalText = testBtn?.textContent || 'Test Connection';
    
    if (testBtn) {
        testBtn.textContent = '🧪 Testing...';
        testBtn.disabled = true;
    }
    
    try {
        const result = await driveSync.testConnection();
        alert(result.message);
    } catch (error) {
        alert('❌ Test failed: ' + error.message);
    } finally {
        if (testBtn) {
            testBtn.textContent = originalText;
            testBtn.disabled = false;
        }
    }
}

// ==================== GOOGLE DRIVE SYNC FUNCTIONS ====================
async function uploadToDrive() {
    if (!window.driveSync || !driveSync.isConnected) {
        alert('Please connect to Google Drive in Settings first!');
        showPage('settings');
        return;
    }
    
    try {
        getAllEntries(async entries => {
            // Get entries that need sync
            const entriesToSync = entries.filter(e => 
                !e.synced || (e.syncRemarks && e.syncRemarks !== 'synced')
            );
            
            // Filter out entries that are new and deleted (should be removed locally)
            const filteredEntries = entriesToSync.filter(e => {
                if (!e.synced && e.syncRemarks === 'deleted') {
                    // New entry that was deleted before sync - remove from local DB
                    const transaction = db.transaction(["entries"], "readwrite");
                    const store = transaction.objectStore("entries");
                    store.delete(e.id);
                    console.log(`Removed unsynced deleted entry: ${e.id}`);
                    return false;
                }
                return true;
            });
            
            if (filteredEntries.length === 0) {
                alert('✅ All entries are already synced!');
                return;
            }
            
            const uploadBtn = document.querySelector('button[onclick="uploadToDrive()"]');
            const originalText = uploadBtn?.textContent || "Upload to Cloud";
            
            if (uploadBtn) {
                uploadBtn.textContent = `⏳ Uploading ${filteredEntries.length} entries...`;
                uploadBtn.disabled = true;
            }
            
            const result = await driveSync.uploadEntries(filteredEntries);
            
            if (result.success) {
                // Mark uploaded entries as synced
                for (const entry of filteredEntries) {
                    if (entry.syncRemarks !== 'deleted') {
                        entry.synced = true;
                        entry.syncRemarks = 'synced';
                        await saveEntry(entry);
                    } else {
                        // For deleted entries that were synced, remove from local DB
                        const transaction = db.transaction(["entries"], "readwrite");
                        const store = transaction.objectStore("entries");
                        store.delete(entry.id);
                    }
                }
                
                alert(`✅ Successfully uploaded ${result.entriesCount} entries to Google Drive!\n\nFilename: ${result.filename}\n\nYou can now run the backend to import these to Neon.`);
                
            } else {
                throw new Error('Upload failed');
            }
            
            if (uploadBtn) {
                uploadBtn.textContent = originalText;
                uploadBtn.disabled = false;
            }
            
            updateSyncStatus();
            loadSaved();
            calcTotal();
            loadLedger();
            
        });
    } catch (error) {
        console.error('Upload error:', error);
        alert('❌ Upload failed: ' + error.message);
        
        const uploadBtn = document.querySelector('button[onclick="uploadToDrive()"]');
        if (uploadBtn) {
            uploadBtn.disabled = false;
            uploadBtn.textContent = "📤 Upload to Google Drive";
        }
    }
}

async function restoreFromDrive() {
    if (!window.driveSync || !driveSync.isConnected) {
        alert('Please connect to Google Drive in Settings first!');
        showPage('settings');
        return;
    }
    
    try {
        const importFiles = await driveSync.getImportFiles();
        
        if (importFiles.length === 0) {
            alert('📭 No import files found in Google Drive.');
            return;
        }
        
        // Show file selection dialog
        let fileList = '📁 Available import files:\n\n';
        importFiles.forEach((file, index) => {
            const date = new Date(file.createdTime).toLocaleString();
            fileList += `${index + 1}. ${file.name} (${date})\n`;
        });
        
        const fileIndex = prompt(`${fileList}\nEnter file number to import (1-${importFiles.length}):`);
        const index = parseInt(fileIndex) - 1;
        
        if (isNaN(index) || index < 0 || index >= importFiles.length) {
            alert('❌ Invalid selection');
            return;
        }
        
        const selectedFile = importFiles[index];
        
        if (!confirm(`Import from "${selectedFile.name}"?\n\nThis will merge data with your local database.`)) {
            return;
        }
        
        const restoreBtn = document.querySelector('button[onclick="restoreFromDrive()"]');
        const originalText = restoreBtn?.textContent || "Restore from Cloud";
        
        if (restoreBtn) {
            restoreBtn.textContent = "⏳ Restoring from Drive...";
            restoreBtn.disabled = true;
        }
        
        const entries = await driveSync.importFromFile(selectedFile.id);
        
        if (entries.length === 0) {
            throw new Error('No entries found in file');
        }
        
        // Merge entries with local database
        getAllEntries(async localEntries => {
            try {
                let importedCount = 0;
                let updatedCount = 0;
                
                for (const cloudEntry of entries) {
                    const existingEntry = localEntries.find(e => e.id === cloudEntry.id);
                    
                    if (!existingEntry) {
                        // New entry
                        await saveEntry(cloudEntry);
                        importedCount++;
                    } else {
                        // Update existing entry if cloud is newer
                        const cloudTime = new Date(selectedFile.createdTime);
                        const localTime = new Date(existingEntry.updated_at || existingEntry.created_at);
                        
                        if (cloudTime > localTime) {
                            existingEntry.date = cloudEntry.date;
                            existingEntry.desc = cloudEntry.desc;
                            existingEntry.amount = cloudEntry.amount;
                            existingEntry.main = cloudEntry.main;
                            existingEntry.sub = cloudEntry.sub;
                            existingEntry.synced = true;
                            existingEntry.syncRemarks = 'synced';
                            await saveEntry(existingEntry);
                            updatedCount++;
                        }
                    }
                }
                
                if (restoreBtn) {
                    restoreBtn.textContent = originalText;
                    restoreBtn.disabled = false;
                }
                
                calcTotal();
                loadSaved();
                loadLedger();
                
                const deleteAfter = confirm(`✅ Imported ${importedCount} new entries, updated ${updatedCount} entries.\n\nDelete "${selectedFile.name}" from Drive?`);
                
                if (deleteAfter) {
                    await driveSync.deleteFile(selectedFile.id);
                    alert('🗑️ File deleted from Drive.');
                }
            } catch (mergeError) {
                console.error('Merge error:', mergeError);
                alert('Error merging entries: ' + mergeError.message);
            }
        });
        
    } catch (error) {
        console.error('Restore error:', error);
        alert('❌ Restore failed: ' + error.message);
        
        const restoreBtn = document.querySelector('button[onclick="restoreFromDrive()"]');
        if (restoreBtn) {
            restoreBtn.disabled = false;
            restoreBtn.textContent = "📥 Restore from Google Drive";
        }
    }
}

function updateSyncStatus(entries = null) {
    try {
        if (!entries) {
            getAllEntries(updateSyncStatus);
            return;
        }
        
        const pendingSync = entries.filter(e => 
            !e.synced || (e.syncRemarks && e.syncRemarks !== 'synced')
        ).length;
        
        const statusElement = document.getElementById("driveGlobalStatus");
        const backupStatus = document.getElementById("driveBackupStatus");
        
        if (statusElement) {
            if (window.driveSync && driveSync.isConnected) {
                statusElement.innerHTML = `🌐 Google Drive: ${pendingSync} pending sync`;
                statusElement.style.color = pendingSync > 0 ? "#ff9800" : "#4caf50";
            } else {
                statusElement.innerHTML = "🌐 Google Drive: Not Connected";
                statusElement.style.color = "#757575";
            }
        }
        
        if (backupStatus) {
            if (window.driveSync && driveSync.isConnected) {
                backupStatus.innerHTML = `☁️ Google Drive: ${pendingSync} pending sync`;
                backupStatus.style.color = pendingSync > 0 ? "#ff9800" : "#4caf50";
            } else {
                backupStatus.innerHTML = "☁️ Google Drive: Not connected";
                backupStatus.style.color = "#757575";
            }
        }
    } catch (error) {
        console.error('Error in updateSyncStatus:', error);
    }
}

function updateBackupStatus() {
    getAllEntries(entries => {
        try {
            const dbInfo = document.getElementById("dbInfo");
            if (dbInfo) {
                const pending = entries.filter(e => !e.synced || (e.syncRemarks && e.syncRemarks !== 'synced')).length;
                const driveStatus = window.driveSync ? driveSync.isConnected : false;
                const lastBackup = driveStatus ? `Connected (${pending} pending)` : "Not connected";
                dbInfo.textContent = `Total Entries: ${entries.length} | Google Drive: ${lastBackup}`;
            }
            updateSyncStatus(entries);
        } catch (error) {
            console.error('Error in updateBackupStatus:', error);
        }
    });
}

// ==================== LEDGER FUNCTIONS ====================
function updateLedgerCategories() {
    try {
        const ledgerMain = document.getElementById("ledgerMain");
        
        if (!ledgerMain) return;
        
        ledgerMain.innerHTML = '<option value="">All Categories</option>';
        
        for (let mainCategory in heads) {
            const option = document.createElement("option");
            option.value = mainCategory;
            option.textContent = mainCategory;
            ledgerMain.appendChild(option);
        }
        
        updateLedgerSubheads();
    } catch (error) {
        console.error("Error in updateLedgerCategories:", error);
    }
}

function updateLedgerSubheads() {
    try {
        const mainSelect = document.getElementById("ledgerMain");
        const subSelect = document.getElementById("ledgerSub");
        
        if (!mainSelect || !subSelect) return;
        
        const selectedMain = mainSelect.value;
        
        subSelect.innerHTML = '<option value="">All Sub-categories</option>';
        
        if (selectedMain && heads[selectedMain]) {
            heads[selectedMain].forEach(subCategory => {
                const option = document.createElement("option");
                option.value = subCategory;
                option.textContent = subCategory;
                subSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Error in updateLedgerSubheads:", error);
    }
}

function loadLedger() {
    getAllEntries(d => {
        try {
            const activeEntries = d.filter(e => e.syncRemarks !== "deleted");
            
            const mainFilter = document.getElementById("ledgerMain")?.value || "";
            const subFilter = document.getElementById("ledgerSub")?.value || "";
            const fromDate = document.getElementById("fromDate")?.value;
            const toDate = document.getElementById("toDate")?.value;
            const typeFilter = document.getElementById("typeFilter")?.value || "all";
            const minAmount = parseFloat(document.getElementById("minAmountFilter")?.value) || -Infinity;
            const maxAmount = parseFloat(document.getElementById("maxAmountFilter")?.value) || Infinity;
            
            const filtered = activeEntries.filter(e => {
                if (mainFilter && e.main !== mainFilter) return false;
                if (subFilter && e.sub !== subFilter) return false;
                if (typeFilter === "income" && e.amount < 0) return false;
                if (typeFilter === "expense" && e.amount > 0) return false;
                if (e.amount < minAmount || e.amount > maxAmount) return false;
                
                if (fromDate || toDate) {
                    const entryDate = new Date(e.date.split("-").reverse().join("-"));
                    const from = fromDate ? new Date(fromDate) : null;
                    const to = toDate ? new Date(toDate + "T23:59:59") : null;
                    
                    if (from && entryDate < from) return false;
                    if (to && entryDate > to) return false;
                }
                
                return true;
            });
            
            filtered.sort((a, b) => {
                const dateA = new Date(a.date.split("-").reverse().join("-"));
                const dateB = new Date(b.date.split("-").reverse().join("-"));
                return dateB - dateA;
            });
            
            const total = filtered.reduce((sum, entry) => sum + entry.amount, 0);
            const incomeTotal = filtered.filter(e => e.amount > 0)
                                      .reduce((sum, e) => sum + e.amount, 0);
            const expenseTotal = filtered.filter(e => e.amount < 0)
                                       .reduce((sum, e) => sum + Math.abs(e.amount), 0);
            
            const statsElement = document.getElementById("ledgerStats");
            if (statsElement) {
                statsElement.innerHTML = `
                    Showing ${filtered.length} transactions | 
                    Total: <span style="color:${total >= 0 ? '#2e7d32' : '#c62828'}">PKR ${total.toFixed(2)}</span> |
                    Income: <span style="color:#2e7d32">PKR ${incomeTotal.toFixed(2)}</span> |
                    Expense: <span style="color:#c62828">PKR ${expenseTotal.toFixed(2)}</span>
                `;
            }
            
            const tbody = document.getElementById("ledgerList");
            if (!tbody) return;
            
            tbody.innerHTML = "";
            
            if (filtered.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 15px;">
                            📭 No transactions found matching your filters.
                        </td>
                    </tr>
                `;
                return;
            }
            
            const table = document.getElementById("ledgerTable");
            if (table) {
                const headerCells = table.querySelectorAll("thead th");
                headerCells.forEach(cell => {
                    cell.style.backgroundColor = "#4a6fa5";
                    cell.style.color = "white";
                    cell.style.padding = "14px 12px";
                    cell.style.textAlign = "left";
                    cell.style.fontWeight = "600";
                    cell.style.fontSize = "0.9em";
                    cell.style.textTransform = "uppercase";
                    cell.style.letterSpacing = "0.5px";
                    cell.style.borderBottom = "3px solid #2d4468";
                    cell.style.position = "sticky";
                    cell.style.top = "0";
                });
            }
            
            filtered.forEach((e, i) => {
                const row = document.createElement("tr");
                row.style.borderLeft = e.amount < 0 ? "4px solid #f44336" : "4px solid #4caf50";
                row.style.transition = "all 0.25s ease";
                
                row.innerHTML = `
                    <td style="padding: 12px; border-bottom: 1px solid #eaeaea; min-width: 110px;">${e.date}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eaeaea; min-width: 180px; max-width: 350px; word-wrap: break-word; white-space: normal; line-height: 1.5;">${e.desc}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eaeaea; min-width: 130px;">${e.main}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eaeaea; min-width: 130px;">${e.sub}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eaeaea; min-width: 130px; text-align: right; font-weight: 700; font-size: 1.05em; color: ${e.amount >= 0 ? '#2e7d32' : '#c62828'}">
                        ${e.amount >= 0 ? "+" : ""}PKR ${Math.abs(e.amount).toFixed(2)}
                    </td>
                    <td style="padding: 12px; border-bottom: 1px solid #eaeaea; min-width: 110px; text-align: center;">
                        <button onclick="editSavedEntry('${e.id}')" class="small-btn edit-btn">✏️</button>
                        <button onclick="markEntryAsDeleted('${e.id}')" class="small-btn danger-btn">🗑️</button>
                    </td>
                `;
                
                row.style.backgroundColor = i % 2 === 0 ? '#f8fafc' : '#ffffff';
                
                row.addEventListener('mouseenter', () => {
                    row.style.backgroundColor = e.amount < 0 ? '#ffebee' : '#f1f8e9';
                    row.style.transform = "translateX(2px)";
                });
                
                row.addEventListener('mouseleave', () => {
                    row.style.backgroundColor = i % 2 === 0 ? '#f8fafc' : '#ffffff';
                    row.style.transform = "translateX(0)";
                });
                
                tbody.appendChild(row);
            });
        } catch (error) {
            console.error("Error in loadLedger:", error);
            const tbody = document.getElementById("ledgerList");
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 15px; color: #f44336;">
                            ❌ Error loading ledger data
                        </td>
                    </tr>
                `;
            }
        }
    });
}

function resetLedgerFilters() {
    try {
        document.getElementById("ledgerMain").value = "";
        document.getElementById("ledgerSub").value = "";
        document.getElementById("fromDate").value = "";
        document.getElementById("toDate").value = "";
        document.getElementById("typeFilter").value = "all";
        document.getElementById("minAmountFilter").value = "";
        document.getElementById("maxAmountFilter").value = "";
        
        updateLedgerSubheads();
        loadLedger();
    } catch (error) {
        console.error("Error in resetLedgerFilters:", error);
    }
}

function exportLedger() {
    getAllEntries(d => {
        try {
            const mainFilter = document.getElementById("ledgerMain").value;
            const subFilter = document.getElementById("ledgerSub").value;
            
            const filtered = d.filter(e => {
                if (mainFilter && e.main !== mainFilter) return false;
                if (subFilter && e.sub !== subFilter) return false;
                return e.syncRemarks !== "deleted";
            });
            
            let csv = "ID,Date,Description,Main Category,Sub Category,Amount,Type,Sync Status\n";
            filtered.forEach(e => {
                const type = e.amount >= 0 ? "Income" : "Expense";
                const syncStatus = e.synced ? (e.syncRemarks === "edited" ? "Edited" : "Synced") : "Pending";
                csv += `"${e.id}","${e.date}","${e.desc}","${e.main}","${e.sub}",${e.amount},"${type}","${syncStatus}"\n`;
            });
            
            const a = document.createElement("a");
            a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
            const date = new Date().toISOString().split("T")[0];
            a.download = `ledger_export_${date}.csv`;
            a.click();
        } catch (error) {
            console.error("Error in exportLedger:", error);
            alert("Error exporting ledger: " + error.message);
        }
    });
}

// ==================== SEARCH FUNCTIONS ====================
function updateSearchCategories() {
    try {
        const searchCategory = document.getElementById("searchCategory");
        if (!searchCategory) return;
        
        searchCategory.innerHTML = '<option value="">All Categories</option>';
        
        for (let mainCategory in heads) {
            const option = document.createElement("option");
            option.value = mainCategory;
            option.textContent = mainCategory;
            searchCategory.appendChild(option);
        }
    } catch (error) {
        console.error("Error in updateSearchCategories:", error);
    }
}

function performSearch() {
    try {
        const searchTerm = document.getElementById("searchInput").value.toLowerCase().trim();
        const fromDate = document.getElementById("searchFromDate").value;
        const toDate = document.getElementById("searchToDate").value;
        const minAmount = parseFloat(document.getElementById("minAmount").value) || -Infinity;
        const maxAmount = parseFloat(document.getElementById("maxAmount").value) || Infinity;
        const typeFilter = document.getElementById("searchType").value;
        const categoryFilter = document.getElementById("searchCategory").value;
        
        getAllEntries(entries => {
            try {
                const activeEntries = entries.filter(e => e.syncRemarks !== "deleted");
                
                const filtered = activeEntries.filter(entry => {
                    if (searchTerm && !entry.desc.toLowerCase().includes(searchTerm)) {
                        return false;
                    }
                    
                    if (categoryFilter && entry.main !== categoryFilter) {
                        return false;
                    }
                    
                    if (fromDate || toDate) {
                        const entryDate = new Date(entry.date.split("-").reverse().join("-"));
                        const from = fromDate ? new Date(fromDate) : null;
                        const to = toDate ? new Date(toDate + "T23:59:59") : null;
                        
                        if (from && entryDate < from) return false;
                        if (to && entryDate > to) return false;
                    }
                    
                    if (entry.amount < minAmount || entry.amount > maxAmount) {
                        return false;
                    }
                    
                    if (typeFilter === "income" && entry.amount <= 0) return false;
                    if (typeFilter === "expense" && entry.amount >= 0) return false;
                    
                    return true;
                });
                
                displaySearchResults(filtered, searchTerm);
            } catch (error) {
                console.error("Error filtering search results:", error);
                alert("Error performing search: " + error.message);
            }
        });
    } catch (error) {
        console.error("Error in performSearch:", error);
        alert("Error performing search: " + error.message);
    }
}

function displaySearchResults(results, searchTerm = "") {
    try {
        const resultsList = document.getElementById("searchResults");
        const countElement = document.getElementById("searchResultsCount");
        const totalElement = document.getElementById("searchTotal");
        
        if (!resultsList) return;
        
        results.sort((a, b) => {
            const dateA = new Date(a.date.split("-").reverse().join("-"));
            const dateB = new Date(b.date.split("-").reverse().join("-"));
            return dateB - dateA;
        });
        
        const totalAmount = results.reduce((sum, entry) => sum + entry.amount, 0);
        if (countElement) {
            countElement.textContent = `🔍 Found ${results.length} transaction${results.length !== 1 ? "s" : ""}`;
        }
        
        if (totalElement) {
            totalElement.textContent = `💰 Total: PKR ${totalAmount.toFixed(2)}`;
            totalElement.style.color = totalAmount >= 0 ? "#2e7d32" : "#c62828";
        }
        
        resultsList.innerHTML = "";
        
        if (results.length === 0) {
            resultsList.innerHTML = '<div class="no-results">📭 No transactions found</div>';
            return;
        }
        
        const tableContainer = document.createElement("div");
        tableContainer.className = "table-container scrollable-table";
        tableContainer.style.maxHeight = "400px";
        tableContainer.style.overflowY = "auto";
        tableContainer.style.overflowX = "auto";
        tableContainer.style.borderRadius = "8px";
        tableContainer.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
        
        const table = document.createElement("table");
        table.className = "fixed-table";
        table.style.width = "100%";
        table.style.minWidth = "800px";
        table.style.borderCollapse = "collapse";
        
        const thead = document.createElement("thead");
        thead.style.position = "sticky";
        thead.style.top = "0";
        thead.style.zIndex = "10";
        thead.innerHTML = `
            <tr>
                <th>Date</th>
                <th>Main Category</th>
                <th>Sub Category</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Actions</th>
            </tr>
        `;
        
        const headerCells = thead.querySelectorAll("th");
        headerCells.forEach(cell => {
            cell.style.backgroundColor = "#4a6fa5";
            cell.style.color = "white";
            cell.style.padding = "14px 12px";
            cell.style.textAlign = "left";
            cell.style.fontWeight = "600";
            cell.style.fontSize = "0.9em";
            cell.style.textTransform = "uppercase";
            cell.style.letterSpacing = "0.5px";
            cell.style.borderBottom = "3px solid #2d4468";
            cell.style.position = "sticky";
            cell.style.top = "0";
        });
        
        table.appendChild(thead);
        
        const tbody = document.createElement("tbody");
        
        results.forEach((entry, i) => {
            const row = document.createElement("tr");
            row.style.borderLeft = entry.amount < 0 ? "4px solid #f44336" : "4px solid #4caf50";
            row.style.transition = "all 0.25s ease";
            
            let description = entry.desc;
            if (searchTerm) {
                const regex = new RegExp(`(${searchTerm})`, "gi");
                description = description.replace(regex, '<mark>$1</mark>');
            }
            
            row.innerHTML = `
                <td style="padding: 12px; border-bottom: 1px solid #eaeaea; min-width: 110px;">${entry.date}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eaeaea; min-width: 130px;">${entry.main}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eaeaea; min-width: 130px;">${entry.sub}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eaeaea; min-width: 180px; max-width: 350px; word-wrap: break-word; white-space: normal; line-height: 1.5;">${description}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eaeaea; min-width: 130px; text-align: right; font-weight: 700; font-size: 1.05em; color: ${entry.amount >= 0 ? '#2e7d32' : '#c62828'}">
                    ${entry.amount >= 0 ? '+' : ''}PKR ${Math.abs(entry.amount).toFixed(2)}
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #eaeaea; min-width: 110px; text-align: center;">
                    <button onclick="editSavedEntry('${entry.id}')" class="small-btn edit-btn">✏️</button>
                    <button onclick="markEntryAsDeleted('${entry.id}')" class="small-btn danger-btn">🗑️</button>
                </td>
            `;
            
            row.style.backgroundColor = i % 2 === 0 ? '#f8fafc' : '#ffffff';
            
            row.addEventListener('mouseenter', () => {
                row.style.backgroundColor = entry.amount < 0 ? '#ffebee' : '#f1f8e9';
                row.style.transform = "translateX(2px)";
            });
            
            row.addEventListener('mouseleave', () => {
                row.style.backgroundColor = i % 2 === 0 ? '#f8fafc' : '#ffffff';
                row.style.transform = "translateX(0)";
            });
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        tableContainer.appendChild(table);
        resultsList.appendChild(tableContainer);
    } catch (error) {
        console.error("Error in displaySearchResults:", error);
        const resultsList = document.getElementById("searchResults");
        if (resultsList) {
            resultsList.innerHTML = '<div class="no-results" style="color: #f44336;">Error displaying search results</div>';
        }
    }
}

function clearSearch() {
    try {
        document.getElementById("searchInput").value = "";
        document.getElementById("searchFromDate").value = "";
        document.getElementById("searchToDate").value = "";
        document.getElementById("minAmount").value = "";
        document.getElementById("maxAmount").value = "";
        document.getElementById("searchType").value = "all";
        document.getElementById("searchCategory").value = "";
        
        document.getElementById("searchResults").innerHTML = "";
        document.getElementById("searchResultsCount").textContent = "🔍 Found 0 transactions";
        document.getElementById("searchTotal").textContent = "💰 Total: PKR 0.00";
    } catch (error) {
        console.error("Error in clearSearch:", error);
    }
}

function quickSearch() {
    try {
        const term = prompt("Enter search term:");
        if (term) {
            showPage("search");
            document.getElementById("searchInput").value = term;
            setTimeout(() => performSearch(), 100);
        }
    } catch (error) {
        console.error("Error in quickSearch:", error);
    }
}

// ==================== CATEGORY CRUD OPERATIONS ====================
function addMainHead() {
    try {
        const mainHeadInput = document.getElementById("mainHeadInput");
        if (!mainHeadInput || !mainHeadInput.value.trim()) {
            alert("Please enter a main category name");
            return;
        }
        
        const mainHead = mainHeadInput.value.trim();
        
        if (heads[mainHead]) {
            alert("Main category already exists!");
            return;
        }
        
        heads[mainHead] = [];
        mainHeadInput.value = "";
        saveHeads();
        alert(`✅ Added main category: ${mainHead}`);
    } catch (error) {
        console.error("Error in addMainHead:", error);
        alert("Error adding main category: " + error.message);
    }
}

function addSubHead() {
    try {
        const mainForSub = document.getElementById("mainForSub");
        const subHeadInput = document.getElementById("subHeadInput");
        
        if (!mainForSub || !mainForSub.value) {
            alert("Please select a main category first");
            return;
        }
        
        if (!subHeadInput || !subHeadInput.value.trim()) {
            alert("Please enter a sub category name");
            return;
        }
        
        const main = mainForSub.value;
        const sub = subHeadInput.value.trim();
        
        if (heads[main].includes(sub)) {
            alert("Sub category already exists!");
            return;
        }
        
        heads[main].push(sub);
        subHeadInput.value = "";
        saveHeads();
        alert(`✅ Added sub category: ${sub} under ${main}`);
    } catch (error) {
        console.error("Error in addSubHead:", error);
        alert("Error adding sub category: " + error.message);
    }
}

function deleteMainHead(m) {
    if (!confirm(`Delete main category "${m}" and all its sub-categories?`)) {
        return;
    }
    
    try {
        delete heads[m];
        saveHeads();
        alert(`✅ Deleted main category: ${m}`);
    } catch (error) {
        console.error("Error in deleteMainHead:", error);
        alert("Error deleting main category: " + error.message);
    }
}

function deleteSubHead(m, s) {
    if (!confirm(`Delete sub category "${s}" from "${m}"?`)) {
        return;
    }
    
    try {
        heads[m] = heads[m].filter(x => x !== s);
        saveHeads();
        alert(`✅ Deleted sub category: ${s}`);
    } catch (error) {
        console.error("Error in deleteSubHead:", error);
        alert("Error deleting sub category: " + error.message);
    }
}

// ==================== INITIALIZATION ====================
window.onload = function() {
    try {
        const today = new Date().toISOString().split("T")[0];
        const dateInput = document.getElementById("date");
        if (dateInput) dateInput.value = today;
        
        const entryForm = document.querySelector('#entry .entry-form .button-group');
        if (entryForm && !document.getElementById('cancelEditBtn')) {
            const cancelBtn = document.createElement('button');
            cancelBtn.id = 'cancelEditBtn';
            cancelBtn.className = 'secondary-btn';
            cancelBtn.textContent = '❌ Cancel Edit';
            cancelBtn.style.display = 'none';
            cancelBtn.onclick = cancelEdit;
            entryForm.appendChild(cancelBtn);
        }
        
        updateAllDropdowns();
        calcTotal();
        loadSaved();
        updateSyncStatus();
        updateDriveUI();
    } catch (error) {
        console.error("Error in window.onload:", error);
    }
};

document.addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
        const activePage = document.querySelector(".page.active");
        if (activePage && activePage.id === "search") {
            performSearch();
        }
    }
});

// ==================== SERVICE WORKER REGISTRATION ====================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(registration => {
                console.log('✅ Service Worker registered with scope:', registration.scope);
                
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('🔄 New Service Worker found:', newWorker);
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            if (confirm('A new version is available. Refresh to update?')) {
                                window.location.reload();
                            }
                        }
                    });
                });
            })
            .catch(error => {
                console.log('❌ Service Worker registration failed:', error);
            });
    });
}

console.log('✅ app.js loaded with Google Drive sync');