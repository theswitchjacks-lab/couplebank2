// ==============================
// IndexedDB 初期化
// ==============================
const DB_NAME = "couplebank-db";
const STORE_NAME = "records";
let db = null;

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id" });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve();
        };

        request.onerror = (event) => reject(event);
    });
}

function saveRecord(record) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put(record);
        tx.oncomplete = resolve;
        tx.onerror = reject;
    });
}

function getAllRecords() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const req = tx.objectStore(STORE_NAME).getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = reject;
    });
}

function deleteRecordDB(id) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = resolve;
        tx.onerror = reject;
    });
}

async function migrateFromLocalStorage() {
    const oldData = localStorage.getItem("records");
    if (!oldData) return;

    const records = JSON.parse(oldData);
    for (const r of records) await saveRecord(r);

    localStorage.removeItem("records");
    console.log("✔ localStorage → IndexedDB 移行完了");
}

async function loadRecords() {
    const records = await getAllRecords();
    window.recordsData = records;

    renderRecords(records);
    updateBalance(records);
    updateBalancePeriod("全期間");
}

document.getElementById("add-btn").addEventListener("click", async () => {
    const record = {
        id: Date.now(),
        type: document.querySelector("input[name='type']:checked").value,
        date: document.getElementById("date").value,
        title: document.getElementById("title").value,
        takeru: document.getElementById("takeru").value || 0,
        miyuu: document.getElementById("miyuu").value || 0,
        shared: document.getElementById("shared").value || 0,
        memo: document.getElementById("memo").value,
        reflect: true
    };

    await saveRecord(record);
    await loadRecords();

    // フォーム閉じる
    const form = document.getElementById("new-entry");
    form.classList.remove("visible");
    form.classList.add("hidden");
    document.getElementById("overlay").classList.add("hidden");
});

async function removeRecord(id) {
    await deleteRecordDB(id);
    await loadRecords();
}

document.addEventListener("click", async (e) => {
    if (e.target.classList.contains("saving-toggle")) {
        const id = Number(e.target.dataset.id);
        const records = await getAllRecords();
        const record = records.find(r => r.id === id);

        record.checked = !record.checked;
        await saveRecord(record);

        e.target.classList.toggle("checked", record.checked);
        await loadRecords();
    }
});

async function search() {
    const keyword = document.getElementById("keyword").value.trim();
    const fromDate = document.getElementById("fromDate").value;
    const toDate   = document.getElementById("toDate").value;

    let records = await getAllRecords();

    if (keyword !== "") {
        records = records.filter(r =>
            r.title.includes(keyword) ||
            r.memo.includes(keyword)
        );
    }

    records = records.filter(r => {
        const d = r.date;
        const okStart = !fromDate || d >= fromDate;
        const okEnd   = !toDate   || d <= toDate;
        return okStart && okEnd;
    });

    renderRecords(records);
    updateBalance(records);

    updateBalancePeriod(`${fromDate || "指定なし"} ～ ${toDate || "指定なし"}`);
    closeSearchForm();
}

document.addEventListener("DOMContentLoaded", async () => {
    await initDB();
    await migrateFromLocalStorage();
    await loadRecords();
    setupHeaderMenu();
    formatAmounts();
});
