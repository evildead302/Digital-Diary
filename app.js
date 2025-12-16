// ====================
// GLOBAL VARIABLES
// ====================

const pages = document.querySelectorAll(".page");
let heads = JSON.parse(localStorage.getItem("heads")) || {};
let neonConfig = JSON.parse(localStorage.getItem("neonConfig")) || null;
let tempEntries = [];
let isEditing = false;
let editingEntryId = null;

// ====================
// PAGE NAVIGATION
// ====================

function showPage(id) {
    pages.forEach(p => {
        p.classList.remove("active");
        p.style.display = "none";
    });
    
    const page = document.getElementById(id);
    if (page) {
        page.style.display = "block";
        page.classList.add("active");
        
        // Initialize specific pages
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
                initNeonUI();
                break;
        }
    }
}

// Initialize with home page
showPage("home");

// ====================
// CATEGORY MANAGEMENT
// ====================

function saveHeads() {
    localStorage.setItem("heads", JSON.stringify(heads));
    renderHeads();
    updateAllDropdowns();
}

function renderHeads() {
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
}

// Initialize categories
renderHeads();

// Update all dropdowns
function updateAllDropdowns() {
    updateEntryDropdowns();
    updateLedgerCategories();
    updateSearchCategories();
}

// ====================
// ENTRY PAGE FUNCTIONS
// ====================

function updateEntryDropdowns() {
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
}

function updateEntrySubheads() {
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
}

// ====================
// DATE FUNCTIONS
// ====================

function formatDate(v) {
    const d = new Date(v);
    return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth()+1).padStart(2, "0")}-${d.getFullYear()}`;
}

function genID(i) {
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    const ss = String(d.getSeconds()).padStart(2, "0");
    const ms = String(d.getMilliseconds()).padStart(3, "0");
    return `${ymd}${ss}${ms}${i+1}`;
}

// ====================
// TEMPORARY ENTRIES - FIXED TABLE LAYOUT WITH SCROLLING
// ====================

function addTemp() {
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
}

function renderTemp() {
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
}

function editTemp(i) {
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

// ====================
// SAVE ALL ENTRIES
// ====================

function saveAll() {
    if (tempEntries.length === 0 && !isEditing) {
        alert("No entries to save");
        return;
    }
    
    if (isEditing && editingEntryId) {
        // Save edited entry
        getAllEntries(async d => {
            const existingEntry = d.find(x => x.id === editingEntryId);
            if (!existingEntry) return;
            
            const editedEntry = {
                id: editingEntryId, // Keep same ID
                date: formatDate(document.getElementById("date").value),
                desc: document.getElementById("desc").value.trim(),
                amount: parseFloat(document.getElementById("amount").value),
                main: document.getElementById("entryMain").value,
                sub: document.getElementById("entrySub").value,
                synced: existingEntry.synced,
                syncRemarks: existingEntry.synced ? "edited" : "new" // Mark as edited if synced before
            };
            
            await saveEntry(editedEntry);
            
            // Reset editing mode
            cancelEdit();
            
            // Update UI
            loadSaved();
            calcTotal();
            loadLedger();
            
            alert("✅ Entry updated successfully!");
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
        
        // Auto-sync if enabled
        if (document.getElementById("autoSync")?.checked && neonConfig) {
            setTimeout(uploadToNeon, 1000);
        }
        
        alert(`✅ Successfully saved ${tempEntries.length} entries!`);
    }
}

// ====================
// SAVED ENTRIES MANAGEMENT - FIXED TABLE WITH SCROLLING
// ====================

function loadSaved() {
    getAllEntries(d => {
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
            
            row.innerHTML = `
                <td style="padding: 12px; border-bottom: 1px solid #eaeaea; min-width: 110px;">${e.date}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eaeaea; min-width: 130px;">${e.main}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eaeaea; min-width: 130px;">${e.sub}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eaeaea; min-width: 180px; max-width: 350px; word-wrap: break-word; white-space: normal; line-height: 1.5;">${e.desc}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eaeaea; min-width: 130px; text-align: right; font-weight: 700; font-size: 1.05em; color: ${e.amount < 0 ? '#c62828' : '#2e7d32'}">
                    ${e.amount < 0 ? '-' : '+'}PKR ${Math.abs(e.amount).toFixed(2)}
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #eaeaea; min-width: 110px; text-align: center;">
                    <button onclick="editSavedEntry('${e.id}')" class="small-btn edit-btn">✏️</button>
                    <button onclick="markEntryAsDeleted('${e.id}')" class="small-btn danger-btn">🗑️</button>
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
        savedEntryList.appendChild(tableContainer);
    });
}

function markEntryAsDeleted(id) {
    if (!confirm("Mark this entry as deleted? It will be removed from balance but kept for Neon sync.")) {
        return;
    }
    
    getAllEntries(async d => {
        const entry = d.find(x => x.id === id);
        if (!entry) return;
        
        // Mark as deleted but keep in database
        entry.syncRemarks = "deleted";
        entry.synced = false; // Needs to be synced to Neon
        
        await saveEntry(entry);
        
        // Update UI
        loadSaved();
        calcTotal();
        loadLedger();
        
        alert("✅ Entry marked as deleted. Will be removed from Neon on next sync.");
    });
}

function editSavedEntry(id) {
    isEditing = true;
    editingEntryId = id;
    
    getAllEntries(d => {
        const e = d.find(x => x.id === id);
        if (!e) return;
        
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
        
        // Show cancel button
        const cancelBtn = document.getElementById("cancelEditBtn");
        if (cancelBtn) cancelBtn.style.display = "inline-block";
        
        // Change save button text
        const saveBtn = document.querySelector('button[onclick="saveAll()"]');
        if (saveBtn) saveBtn.textContent = "💾 Update Entry";
        
        // Show message
        const msg = document.createElement('div');
        msg.className = 'edit-message';
        msg.innerHTML = '<p style="color: #ff9800; margin: 10px 0;">✏️ Editing mode active. Make changes or click Cancel to keep original.</p>';
        
        const form = document.querySelector('.entry-form');
        if (form && !form.querySelector('.edit-message')) {
            form.appendChild(msg);
        }
    });
}

function cancelEdit() {
    if (isEditing) {
        isEditing = false;
        editingEntryId = null;
        
        // Hide cancel button
        const cancelBtn = document.getElementById("cancelEditBtn");
        if (cancelBtn) cancelBtn.style.display = "none";
        
        // Reset save button text
        const saveBtn = document.querySelector('button[onclick="saveAll()"]');
        if (saveBtn) saveBtn.textContent = "💾 Save All";
        
        // Remove edit message
        const msg = document.querySelector('.edit-message');
        if (msg) msg.remove();
        
        // Clear form
        resetEntryForm();
    }
}

function resetEntryForm() {
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("date").value = today;
    document.getElementById("desc").value = "";
    document.getElementById("amount").value = "";
    document.getElementById("entryMain").value = "";
    document.getElementById("entrySub").value = "";
    
    // Reset editing mode
    isEditing = false;
    editingEntryId = null;
    
    // Hide cancel button
    const cancelBtn = document.getElementById("cancelEditBtn");
    if (cancelBtn) cancelBtn.style.display = "none";
    
    // Reset save button text
    const saveBtn = document.querySelector('button[onclick="saveAll()"]');
    if (saveBtn) saveBtn.textContent = "💾 Save All";
    
    // Remove edit message
    const msg = document.querySelector('.edit-message');
    if (msg) msg.remove();
}

// ====================
// BALANCE CALCULATION - EXCLUDE DELETED ENTRIES
// ====================

function calcTotal() {
    getAllEntries(d => {
        // Filter out deleted entries
        const activeEntries = d.filter(e => e.syncRemarks !== "deleted");
        
        // Calculate totals
        const total = activeEntries.reduce((a, b) => a + b.amount, 0);
        const income = activeEntries.filter(e => e.amount > 0).reduce((a, b) => a + b.amount, 0);
        const expense = Math.abs(activeEntries.filter(e => e.amount < 0).reduce((a, b) => a + b.amount, 0));
        
        // Update display on home page
        const totalBalance = document.getElementById("totalBalance");
        if (totalBalance) {
            totalBalance.innerText = `PKR ${total.toFixed(2)}`;
            totalBalance.style.color = total >= 0 ? "#2e7d32" : "#c62828";
        }
        
        // Update display on balance page
        const totalIncome = document.getElementById("totalIncome");
        const totalExpense = document.getElementById("totalExpense");
        const netBalance = document.getElementById("netBalance");
        
        if (totalIncome) totalIncome.innerText = `PKR ${income.toFixed(2)}`;
        if (totalExpense) totalExpense.innerText = `PKR ${expense.toFixed(2)}`;
        if (netBalance) {
            netBalance.innerText = `PKR ${total.toFixed(2)}`;
            netBalance.style.color = total >= 0 ? "#2e7d32" : "#c62828";
        }
        
        // Update entry count
        const entryCount = document.getElementById("entryCount");
        if (entryCount) entryCount.innerText = `📝 Total Entries: ${activeEntries.length}`;
        
        // Render balance by category
        renderBalance(activeEntries);
        
        // Update Neon status
        updateNeonStatus(d);
        
        // Load recent entries on home page - LAST 10 ENTRIES WITH SCROLLING
        loadRecentEntries(activeEntries);
    });
}

function renderBalance(d) {
    const balanceList = document.getElementById("balanceList");
    if (!balanceList) return;
    
    let map = {};
    
    // Group by category
    d.forEach(e => {
        map[e.main] = map[e.main] || {};
        map[e.main][e.sub] = (map[e.main][e.sub] || 0) + e.amount;
    });
    
    balanceList.innerHTML = "";
    
    for(let main in map) {
        const li = document.createElement("li");
        li.className = "category-balance";
        
        // Calculate main category total
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
}

function loadRecentEntries(entries) {
    const recentEntries = document.getElementById("recentEntries");
    if (!recentEntries) return;
    
    // Sort by date (newest first)
    entries.sort((a, b) => {
        const dateA = new Date(a.date.split("-").reverse().join("-"));
        const dateB = new Date(b.date.split("-").reverse().join("-"));
        return dateB - dateA;
    });
    
    // Take only last 10 entries
    const recent = entries.slice(0, 10);
    
    recentEntries.innerHTML = "";
    
    if (recent.length === 0) {
        recentEntries.innerHTML = '<div class="no-entries">No recent transactions</div>';
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
    tableContainer.style.marginTop = "15px";
    
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
    
    recent.forEach((e, i) => {
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
    recentEntries.appendChild(tableContainer);
}

function loadHomeData() {
    calcTotal();
}

// ====================
// LEDGER FUNCTIONS (FIXED SUB-HEADS)
// ====================

function updateLedgerCategories() {
    const ledgerMain = document.getElementById("ledgerMain");
    
    if (!ledgerMain) return;
    
    // Clear and add default option
    ledgerMain.innerHTML = '<option value="">All Categories</option>';
    
    // Add main categories
    for (let mainCategory in heads) {
        const option = document.createElement("option");
        option.value = mainCategory;
        option.textContent = mainCategory;
        ledgerMain.appendChild(option);
    }
    
    // Update sub-heads based on current selection
    updateLedgerSubheads();
}

function updateLedgerSubheads() {
    const mainSelect = document.getElementById("ledgerMain");
    const subSelect = document.getElementById("ledgerSub");
    
    if (!mainSelect || !subSelect) return;
    
    const selectedMain = mainSelect.value;
    
    // Clear sub-select options
    subSelect.innerHTML = '<option value="">All Sub-categories</option>';
    
    // If a main category is selected, populate its sub-categories
    if (selectedMain && heads[selectedMain]) {
        heads[selectedMain].forEach(subCategory => {
            const option = document.createElement("option");
            option.value = subCategory;
            option.textContent = subCategory;
            subSelect.appendChild(option);
        });
    }
}

function loadLedger() {
    getAllEntries(d => {
        // Filter out deleted entries
        const activeEntries = d.filter(e => e.syncRemarks !== "deleted");
        
        const mainFilter = document.getElementById("ledgerMain")?.value || "";
        const subFilter = document.getElementById("ledgerSub")?.value || "";
        const fromDate = document.getElementById("fromDate")?.value;
        const toDate = document.getElementById("toDate")?.value;
        const typeFilter = document.getElementById("typeFilter")?.value || "all";
        const minAmount = parseFloat(document.getElementById("minAmountFilter")?.value) || -Infinity;
        const maxAmount = parseFloat(document.getElementById("maxAmountFilter")?.value) || Infinity;
        
        // Filter entries
        const filtered = activeEntries.filter(e => {
            // Main category filter
            if (mainFilter && e.main !== mainFilter) return false;
            
            // Sub category filter
            if (subFilter && e.sub !== subFilter) return false;
            
            // Type filter
            if (typeFilter === "income" && e.amount < 0) return false;
            if (typeFilter === "expense" && e.amount > 0) return false;
            
            // Amount range filter
            if (e.amount < minAmount || e.amount > maxAmount) return false;
            
            // Date range filter
            if (fromDate || toDate) {
                const entryDate = new Date(e.date.split("-").reverse().join("-"));
                const from = fromDate ? new Date(fromDate) : null;
                const to = toDate ? new Date(toDate + "T23:59:59") : null;
                
                if (from && entryDate < from) return false;
                if (to && entryDate > to) return false;
            }
            
            return true;
        });
        
        // Sort by date (newest first)
        filtered.sort((a, b) => {
            const dateA = new Date(a.date.split("-").reverse().join("-"));
            const dateB = new Date(b.date.split("-").reverse().join("-"));
            return dateB - dateA;
        });
        
        // Calculate totals
        const total = filtered.reduce((sum, entry) => sum + entry.amount, 0);
        const incomeTotal = filtered.filter(e => e.amount > 0)
                                  .reduce((sum, e) => sum + e.amount, 0);
        const expenseTotal = filtered.filter(e => e.amount < 0)
                                   .reduce((sum, e) => sum + Math.abs(e.amount), 0);
        
        // Update stats
        const statsElement = document.getElementById("ledgerStats");
        if (statsElement) {
            statsElement.innerHTML = `
                Showing ${filtered.length} transactions | 
                Total: <span style="color:${total >= 0 ? '#2e7d32' : '#c62828'}">PKR ${total.toFixed(2)}</span> |
                Income: <span style="color:#2e7d32">PKR ${incomeTotal.toFixed(2)}</span> |
                Expense: <span style="color:#c62828">PKR ${expenseTotal.toFixed(2)}</span>
            `;
        }
        
        // Display results in table
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
        
        // Create header with white text
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
    });
}

function resetLedgerFilters() {
    document.getElementById("ledgerMain").value = "";
    document.getElementById("ledgerSub").value = "";
    document.getElementById("fromDate").value = "";
    document.getElementById("toDate").value = "";
    document.getElementById("typeFilter").value = "all";
    document.getElementById("minAmountFilter").value = "";
    document.getElementById("maxAmountFilter").value = "";
    
    // Update sub-heads dropdown
    updateLedgerSubheads();
    
    // Reload with no filters
    loadLedger();
}

function exportLedger() {
    getAllEntries(d => {
        // Apply current filters
        const mainFilter = document.getElementById("ledgerMain").value;
        const subFilter = document.getElementById("ledgerSub").value;
        
        const filtered = d.filter(e => {
            if (mainFilter && e.main !== mainFilter) return false;
            if (subFilter && e.sub !== subFilter) return false;
            return e.syncRemarks !== "deleted"; // Don't export deleted entries
        });
        
        // Generate CSV
        let csv = "ID,Date,Description,Main Category,Sub Category,Amount,Type,Sync Status\n";
        filtered.forEach(e => {
            const type = e.amount >= 0 ? "Income" : "Expense";
            const syncStatus = e.synced ? (e.syncRemarks === "edited" ? "Edited" : "Synced") : "Pending";
            csv += `"${e.id}","${e.date}","${e.desc}","${e.main}","${e.sub}",${e.amount},"${type}","${syncStatus}"\n`;
        });
        
        // Download
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        const date = new Date().toISOString().split("T")[0];
        a.download = `ledger_export_${date}.csv`;
        a.click();
    });
}

// ====================
// SEARCH IMPLEMENTATION
// ====================

function updateSearchCategories() {
    const searchCategory = document.getElementById("searchCategory");
    if (!searchCategory) return;
    
    searchCategory.innerHTML = '<option value="">All Categories</option>';
    
    for (let mainCategory in heads) {
        const option = document.createElement("option");
        option.value = mainCategory;
        option.textContent = mainCategory;
        searchCategory.appendChild(option);
    }
}

function performSearch() {
    const searchTerm = document.getElementById("searchInput").value.toLowerCase().trim();
    const fromDate = document.getElementById("searchFromDate").value;
    const toDate = document.getElementById("searchToDate").value;
    const minAmount = parseFloat(document.getElementById("minAmount").value) || -Infinity;
    const maxAmount = parseFloat(document.getElementById("maxAmount").value) || Infinity;
    const typeFilter = document.getElementById("searchType").value;
    const categoryFilter = document.getElementById("searchCategory").value;
    
    getAllEntries(entries => {
        // Filter out deleted entries
        const activeEntries = entries.filter(e => e.syncRemarks !== "deleted");
        
        const filtered = activeEntries.filter(entry => {
            // Search term
            if (searchTerm && !entry.desc.toLowerCase().includes(searchTerm)) {
                return false;
            }
            
            // Category filter
            if (categoryFilter && entry.main !== categoryFilter) {
                return false;
            }
            
            // Date range
            if (fromDate || toDate) {
                const entryDate = new Date(entry.date.split("-").reverse().join("-"));
                const from = fromDate ? new Date(fromDate) : null;
                const to = toDate ? new Date(toDate + "T23:59:59") : null;
                
                if (from && entryDate < from) return false;
                if (to && entryDate > to) return false;
            }
            
            // Amount range
            if (entry.amount < minAmount || entry.amount > maxAmount) {
                return false;
            }
            
            // Type filter
            if (typeFilter === "income" && entry.amount <= 0) return false;
            if (typeFilter === "expense" && entry.amount >= 0) return false;
            
            return true;
        });
        
        displaySearchResults(filtered, searchTerm);
    });
}

function displaySearchResults(results, searchTerm = "") {
    const resultsList = document.getElementById("searchResults");
    const countElement = document.getElementById("searchResultsCount");
    const totalElement = document.getElementById("searchTotal");
    
    if (!resultsList) return;
    
    // Sort by date (newest first)
    results.sort((a, b) => {
        const dateA = new Date(a.date.split("-").reverse().join("-"));
        const dateB = new Date(b.date.split("-").reverse().join("-"));
        return dateB - dateA;
    });
    
    // Update summary
    const totalAmount = results.reduce((sum, entry) => sum + entry.amount, 0);
    if (countElement) {
        countElement.textContent = `🔍 Found ${results.length} transaction${results.length !== 1 ? "s" : ""}`;
    }
    
    if (totalElement) {
        totalElement.textContent = `💰 Total: PKR ${totalAmount.toFixed(2)}`;
        totalElement.style.color = totalAmount >= 0 ? "#2e7d32" : "#c62828";
    }
    
    // Display results
    resultsList.innerHTML = "";
    
    if (results.length === 0) {
        resultsList.innerHTML = '<div class="no-results">📭 No transactions found</div>';
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
    
    results.forEach((entry, i) => {
        const row = document.createElement("tr");
        row.style.borderLeft = entry.amount < 0 ? "4px solid #f44336" : "4px solid #4caf50";
        row.style.transition = "all 0.25s ease";
        
        // Highlight search term
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
        
        // Alternate row colors
        row.style.backgroundColor = i % 2 === 0 ? '#f8fafc' : '#ffffff';
        
        // Hover effect
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
}

function clearSearch() {
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
}

function quickSearch() {
    const term = prompt("Enter search term:");
    if (term) {
        showPage("search");
        document.getElementById("searchInput").value = term;
        setTimeout(() => performSearch(), 100);
    }
}

// ====================
// NEON FUNCTIONS - UPDATED FOR REPLIT BACKEND
// ====================

function initNeonUI() {
    const neonConnection = document.getElementById("neonConnection");
    const syncStatusInfo = document.getElementById("syncStatusInfo");
    
    if (neonConfig && neonConfig.backendUrl) {
        // Show the saved backend URL
        neonConnection.value = neonConfig.backendUrl;
        neonConnection.type = "text";
        
        if (syncStatusInfo) {
            syncStatusInfo.textContent = "✅ Configuration loaded";
        }
    } else if (neonConnection) {
        // Set default placeholder
        neonConnection.value = "";
        neonConnection.type = "text";
        neonConnection.placeholder = "https://workspace.mega31.repl.co";
    }
    
    // Update global status
    updateGlobalNeonStatus();
}

function updateGlobalNeonStatus() {
    getAllEntries(entries => {
        // Count entries that need sync (new, edited, or deleted)
        const pendingSync = entries.filter(e => 
            !e.synced || (e.syncRemarks && e.syncRemarks !== "synced")
        ).length;
        
        const statusElement = document.getElementById("neonStatus");
        const backupStatus = document.getElementById("neonBackupStatus");
        
        if (statusElement) {
            if (neonConfig && neonConfig.backendUrl) {
                statusElement.innerHTML = `🌐 Backend: ${pendingSync} pending sync`;
                statusElement.style.color = pendingSync > 0 ? "#ff9800" : "#4caf50";
            } else {
                statusElement.innerHTML = "🌐 Backend: Not Configured";
                statusElement.style.color = "#757575";
            }
        }
        
        if (backupStatus) {
            if (neonConfig && neonConfig.backendUrl) {
                backupStatus.innerHTML = `☁️ Cloud: ${pendingSync} pending sync`;
                backupStatus.style.color = pendingSync > 0 ? "#ff9800" : "#4caf50";
            } else {
                backupStatus.innerHTML = "☁️ Cloud: Not configured";
                backupStatus.style.color = "#757575";
            }
        }
    });
}

function saveNeonConfig() {
    const connectionString = document.getElementById("neonConnection").value.trim();
    
    if (!connectionString) {
        alert("Please enter your Replit backend URL");
        return;
    }
    
    // Remove any trailing slashes
    const backendUrl = connectionString.replace(/\/+$/, '');
    
    // Validate it's a URL
    try {
        new URL(backendUrl);
    } catch (error) {
        alert("Please enter a valid URL (e.g., https://workspace.mega31.repl.co)");
        return;
    }
    
    // Save the configuration
    neonConfig = {
        backendUrl: backendUrl,
        type: "replit-backend"
    };
    
    localStorage.setItem("neonConfig", JSON.stringify(neonConfig));
    
    // Update neonSync backend URL
    if (typeof neonSync !== 'undefined') {
        neonSync.backendUrl = backendUrl;
    }
    
    // Test the connection
    testNeonConnection();
}

async function testNeonConnection() {
    if (!neonConfig || !neonConfig.backendUrl) {
        alert("No backend URL configured. Please save configuration first.");
        return;
    }
    
    const testResult = document.getElementById("testResult");
    if (testResult) {
        testResult.innerHTML = '<span style="color: #2196f3;">🔍 Testing backend connection...</span>';
        testResult.style.display = "inline-block";
    }
    
    try {
        // Set the backend URL in neonSync
        if (typeof neonSync !== 'undefined') {
            neonSync.backendUrl = neonConfig.backendUrl;
        }
        
        const result = await neonSync.testConnection();
        
        if (!result.success) {
            throw new Error(result.message);
        }
        
        if (testResult) {
            testResult.innerHTML = '<span style="color: #4caf50;">✅ Backend connected! Database ready.</span>';
        }
        
        updateGlobalNeonStatus();
        alert("✅ Backend connected successfully! Ready to sync.");
        
    } catch (error) {
        if (testResult) {
            testResult.innerHTML = '<span style="color: #f44336;">❌ ' + error.message + '</span>';
        }
        alert("❌ Connection failed: " + error.message);
    }
}

async function uploadToNeon() {
    if (!neonConfig || !neonConfig.backendUrl) {
        alert("Please configure Replit backend in Settings first!");
        showPage("settings");
        return;
    }
    
    try {
        // First check backend connection
        if (typeof neonSync === 'undefined' || !neonSync.testConnection) {
            throw new Error("Neon module not loaded properly");
        }
        
        const connectionResult = await neonSync.testConnection();
        if (!connectionResult.success) {
            alert("❌ Cannot upload: " + connectionResult.message);
            return;
        }
        
        getAllEntries(async entries => {
            // Get entries that need sync
            const entriesToSync = entries.filter(e => 
                !e.synced || (e.syncRemarks && e.syncRemarks !== "synced")
            );
            
            if (entriesToSync.length === 0) {
                alert("✅ All entries are already synced!");
                return;
            }
            
            // Show progress
            const uploadBtn = document.querySelector('button[onclick="uploadToNeon()"]');
            const originalText = uploadBtn?.textContent || "Upload to Cloud";
            
            if (uploadBtn) {
                uploadBtn.textContent = `⏳ Syncing ${entriesToSync.length} entries...`;
                uploadBtn.disabled = true;
            }
            
            // Upload entries
            const result = await neonSync.uploadEntries(entriesToSync);
            
            if (result.success) {
                // Mark as synced locally
                for (const entry of entriesToSync) {
                    if (entry.syncRemarks !== "deleted") {
                        entry.synced = true;
                        entry.syncRemarks = "synced";
                        await saveEntry(entry);
                    }
                }
                
                // Remove deleted entries from local DB after successful sync
                const deletedEntries = entriesToSync.filter(e => e.syncRemarks === "deleted" && e.synced);
                if (deletedEntries.length > 0) {
                    setTimeout(() => {
                        deletedEntries.forEach(e => {
                            const transaction = db.transaction(["entries"], "readwrite");
                            const store = transaction.objectStore("entries");
                            store.delete(e.id);
                        });
                    }, 1000);
                }
                
                // Show results
                let message = `✅ Successfully synced ${result.uploaded} entries to cloud!`;
                if (result.failed > 0) {
                    message += `\n❌ ${result.failed} entries failed to sync`;
                }
                
                alert(message);
                
            } else {
                throw new Error(result.message);
            }
            
            // Update UI
            if (uploadBtn) {
                uploadBtn.textContent = originalText;
                uploadBtn.disabled = false;
            }
            
            updateGlobalNeonStatus();
            
            // Refresh UI
            loadSaved();
            calcTotal();
            loadLedger();
            
        });
    } catch (error) {
        alert("❌ Upload failed: " + error.message);
        console.error("Upload error:", error);
        
        // Re-enable button
        const uploadBtn = document.querySelector('button[onclick="uploadToNeon()"]');
        if (uploadBtn) {
            uploadBtn.disabled = false;
            uploadBtn.textContent = "☁️ Upload to Cloud";
        }
    }
}

async function restoreFromNeon() {
    if (!neonConfig || !neonConfig.backendUrl) {
        alert("Please configure Replit backend in Settings first!");
        showPage("settings");
        return;
    }
    
    if (!confirm("This will fetch all data from cloud and merge with local data (no deletions). Continue?")) {
        return;
    }
    
    try {
        // Check backend connection
        if (typeof neonSync === 'undefined' || !neonSync.testConnection) {
            throw new Error("Neon module not loaded properly");
        }
        
        const connectionResult = await neonSync.testConnection();
        if (!connectionResult.success) {
            alert("Cannot restore: " + connectionResult.message);
            return;
        }
        
        // Show progress
        const restoreBtn = document.querySelector('button[onclick="restoreFromNeon()"]');
        const originalText = restoreBtn?.textContent || "Restore from Cloud";
        
        if (restoreBtn) {
            restoreBtn.textContent = "⏳ Restoring from cloud...";
            restoreBtn.disabled = true;
        }
        
        // Fetch entries from cloud
        const result = await neonSync.fetchEntries();
        
        if (!result.success) {
            throw new Error(result.message);
        }

        const cloudEntries = result.entries;
        let importedCount = 0;
        let updatedCount = 0;

        // Merge with local entries
        getAllEntries(async localEntries => {
            for (const cloudEntry of cloudEntries) {
                try {
                    // Check if entry exists locally
                    const existingEntry = localEntries.find(e => e.id === cloudEntry.id);
                    
                    if (!existingEntry) {
                        // New entry - add it
                        await saveEntry(cloudEntry);
                        importedCount++;
                    } else {
                        // Check which is newer
                        const cloudDate = new Date(cloudEntry.updated_at || cloudEntry.created_at);
                        const localDate = new Date(existingEntry.updated_at || existingEntry.created_at);
                        
                        if (cloudDate > localDate) {
                            // Cloud has newer version
                            existingEntry.main = cloudEntry.main;
                            existingEntry.sub = cloudEntry.sub;
                            existingEntry.date = cloudEntry.date;
                            existingEntry.desc = cloudEntry.desc;
                            existingEntry.amount = cloudEntry.amount;
                            existingEntry.synced = true;
                            existingEntry.syncRemarks = "synced";
                            await saveEntry(existingEntry);
                            updatedCount++;
                        }
                    }
                } catch (error) {
                    console.error("Error processing cloud entry:", error);
                }
            }

            // Update UI
            if (restoreBtn) {
                restoreBtn.textContent = originalText;
                restoreBtn.disabled = false;
            }

            calcTotal();
            loadSaved();
            loadLedger();

            alert(`✅ Restored ${importedCount} new entries from cloud! ${updatedCount > 0 ? `(${updatedCount} updated)` : ''}`);

        });

    } catch (error) {
        alert("❌ Restore failed: " + error.message);
        console.error("Restore error:", error);
        
        // Re-enable button
        const restoreBtn = document.querySelector('button[onclick="restoreFromNeon()"]');
        if (restoreBtn) {
            restoreBtn.disabled = false;
            restoreBtn.textContent = "⬇️ Restore from Cloud";
        }
    }
}

function clearNeonConfig() {
    if (confirm("Are you sure you want to clear backend configuration?")) {
        localStorage.removeItem("neonConfig");
        neonConfig = null;
        
        const neonConnection = document.getElementById("neonConnection");
        const testResult = document.getElementById("testResult");
        const syncStatusInfo = document.getElementById("syncStatusInfo");
        
        if (neonConnection) {
            neonConnection.value = "";
            neonConnection.type = "text";
        }
        if (testResult) {
            testResult.innerHTML = "";
            testResult.style.display = "none";
        }
        if (syncStatusInfo) syncStatusInfo.textContent = "Not configured";
        
        updateGlobalNeonStatus();
        alert("✅ Backend configuration cleared!");
    }
}

function forceSync() {
    uploadToNeon();
}

function manualSync() {
    uploadToNeon();
}

function updateNeonStatus(d) {
    updateGlobalNeonStatus();
}

function updateBackupStatus() {
    getAllEntries(entries => {
        const dbInfo = document.getElementById("dbInfo");
        if (dbInfo) {
            const pending = entries.filter(e => !e.synced || (e.syncRemarks && e.syncRemarks !== "synced")).length;
            const lastBackup = neonConfig ? `Configured (${pending} pending)` : "Never";
            dbInfo.textContent = `Total Entries: ${entries.length} | Last Backup: ${lastBackup}`;
        }
        updateGlobalNeonStatus();
    });
}

// ====================
// CATEGORY CRUD OPERATIONS
// ====================

function addMainHead() {
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
}

function addSubHead() {
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
}

function deleteMainHead(m) {
    if (!confirm(`Delete main category "${m}" and all its sub-categories?`)) {
        return;
    }
    
    delete heads[m];
    saveHeads();
    alert(`✅ Deleted main category: ${m}`);
}

function deleteSubHead(m, s) {
    if (!confirm(`Delete sub category "${s}" from "${m}"?`)) {
        return;
    }
    
    heads[m] = heads[m].filter(x => x !== s);
    saveHeads();
    alert(`✅ Deleted sub category: ${s}`);
}

// ====================
// INITIALIZATION
// ====================

// Set today's date as default
window.onload = function() {
    const today = new Date().toISOString().split("T")[0];
    const dateInput = document.getElementById("date");
    if (dateInput) dateInput.value = today;
    
    // Add cancel button to entry form
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
    
    // Initialize all dropdowns
    updateAllDropdowns();
    
    // Load initial data
    calcTotal();
    loadSaved();
    updateGlobalNeonStatus();
};

// Add Enter key support for search
document.addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
        const activePage = document.querySelector(".page.active");
        if (activePage && activePage.id === "search") {
            performSearch();
        }
    }
});

// ====================
// SERVICE WORKER REGISTRATION
// ====================

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(registration => {
                console.log('✅ Service Worker registered with scope:', registration.scope);
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('🔄 New Service Worker found:', newWorker);
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('🔄 New content is available; please refresh.');
                            // You can show an update notification here
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

console.log('✅ app.js loaded successfully');
