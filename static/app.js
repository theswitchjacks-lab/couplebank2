document.addEventListener("DOMContentLoaded", () => {
    // setup includeSpending default BEFORE loading records
    if (localStorage.getItem('includeSpending') === null) {
        localStorage.setItem('includeSpending', 'true');
    }

    const toggleBtn = document.getElementById('toggle-spending');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const cur = localStorage.getItem('includeSpending') === 'true';
            localStorage.setItem('includeSpending', (!cur).toString());
            // refresh current view
            if (window.currentFilteredRecords) {
                updateBalance(window.currentFilteredRecords);
            } else {
                loadRecords();
            }
        });
    }

    loadRecords();
    setupHeaderMenu();
});

function closeSearchForm() {
    const form = document.getElementById('search-entry');
    const overlay = document.getElementById('overlay');

    form.classList.remove('visible');
    overlay.classList.add('hidden');

    // フェードアウト後に hidden を付ける
    setTimeout(() => {
        form.classList.add('hidden');
    }, 300);
}

function setupHeaderMenu() {
    const toggle = document.getElementById('menu-toggle');
    const panel = document.getElementById('header-menu-panel');
    console.log('Menu setup:', { toggle, panel });
    if (!toggle || !panel) {
        console.error('Menu elements not found');
        return;
    }

    toggle.addEventListener('click', (e) => {
        e.stopPropagation();

        const isHidden = panel.hasAttribute('hidden');

        if (isHidden) {
            panel.removeAttribute('hidden');
            toggle.setAttribute('aria-expanded', 'true');
        } else {
            panel.setAttribute('hidden', '');
            toggle.setAttribute('aria-expanded', 'false');
        }
    });


    // New entry: show form with fade-in
    const newBtn = document.getElementById('menu-new');
    if (newBtn) newBtn.addEventListener('click', () => {
        const target = document.getElementById('new-entry');
        if (target) {
            target.classList.remove('hidden');
            // trigger reflow to ensure transition works
            void target.offsetWidth;
            target.classList.add('visible');
            document.getElementById('overlay').classList.remove('hidden');

            const title = document.getElementById('title');
            if (title) {
                setTimeout(() => title.focus(), 100);
            }
        }
        panel.setAttribute('hidden', '');
        toggle.setAttribute('aria-expanded', 'false');
    });

    // Search: open modal search form
    const sBtn = document.getElementById('menu-search');
    if (sBtn) sBtn.addEventListener('click', () => {
        const form = document.getElementById('search-entry');
        if (form) {
            form.classList.remove('hidden');
            void form.offsetWidth; // transition fix
            form.classList.add('visible');
            document.getElementById('overlay').classList.remove('hidden');

            const keyword = document.getElementById('keyword');
            if (keyword) {
                setTimeout(() => keyword.focus(), 100);
            }
        }

        panel.setAttribute('hidden', '');
        toggle.setAttribute('aria-expanded', 'false');
    });

    // close-search handler
    const closeSearch = document.getElementById('close-search');
    if (closeSearch) closeSearch.addEventListener('click', () => {
        const target = document.getElementById('search-entry');
        if (target) {
            target.classList.remove('visible');
            document.getElementById('overlay').classList.add('hidden');

            setTimeout(() => {
                target.classList.add('hidden');
            }, 300);
            toggle.focus();
        }
    });

    // close-new handler inside form: fade-out then hide
    const closeNew = document.getElementById('close-new');
    if (closeNew) closeNew.addEventListener('click', () => {
        const target = document.getElementById('new-entry');
        if (target) {
            target.classList.remove('visible');
            document.getElementById('overlay').classList.add('hidden');

            // wait for fade-out, then hide
            setTimeout(() => {
                target.classList.add('hidden');
            }, 300);
            toggle.focus();
        }
    });

    // close when clicking outside
    document.addEventListener('click', (e) => {
        if (!panel.contains(e.target) && !toggle.contains(e.target)) {
            panel.setAttribute('hidden', '');
            toggle.setAttribute('aria-expanded', 'false');
        }
    });

    // prevent panel close when clicking inside it
    panel.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}



function populateSearchSelects() {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 5;
    const years = [];
    for (let y = currentYear; y >= startYear; y--) {
        years.push(y);
    }

    const monthValues = [];
    for (let m = 1; m <= 12; m++) {
        monthValues.push(("0" + m).slice(-2));
    }

    const yearElements = [
        document.getElementById("search-from-year"),
        document.getElementById("search-to-year")
    ];
    const monthElements = [
        document.getElementById("search-from-month"),
        document.getElementById("search-to-month")
    ];

    // ★ 先頭に「未選択」を追加（＝全期間）
    yearElements.forEach(el => {
        el.innerHTML = "";
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "未選択";
        el.appendChild(opt);
    });

    monthElements.forEach(el => {
        el.innerHTML = "";
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "未選択";
        el.appendChild(opt);
    });

    // 年の生成
    yearElements.forEach(el => {
        years.forEach(y => {
            const option = document.createElement("option");
            option.value = y;
            option.textContent = y + "年";
            el.appendChild(option);
        });
    });

    // 月の生成
    monthElements.forEach(el => {
        monthValues.forEach(m => {
            const option = document.createElement("option");
            option.value = m;
            option.textContent = parseInt(m, 10) + "月";
            el.appendChild(option);
        });
    });

    // ★ デフォルトは「未選択」のまま（＝全期間）
    yearElements.forEach(el => el.value = "");
    monthElements.forEach(el => el.value = "");
}

// -----------------------------
// 履歴読み込み
// -----------------------------
function loadRecords() {
    fetch("/api/records")
        .then(res => res.json())
        .then(data => {
            records = data;  // ← ★ これを追加（グローバルに保存）
            renderRecords(records);
            updateBalance(records);
            updateBalancePeriod("全期間");
        });
}


// -----------------------------
// 履歴描画
// -----------------------------
// -----------------------------
// 履歴描画（貯金トグル対応）
// -----------------------------
function renderRecords(records) {
    const list = document.getElementById("records-list");
    list.innerHTML = "";
    window.currentFilteredRecords = records;

    records.forEach((r, index) => {
        const li = document.createElement("li");
        li.className = `record-item ${r.type}`;

        const takeruValue = parseInt(r.takeru, 10) || 0;
        const miyuuValue = parseInt(r.miyuu, 10) || 0;
        const sharedValue = parseInt(r.shared, 10) || 0;
        const amountBadges = [];

        if (takeruValue !== 0) {
            amountBadges.push(`<span class="amount-pill amount-takeru">TAKERU ${takeruValue}円</span>`);
        }
        if (miyuuValue !== 0) {
            amountBadges.push(`<span class="amount-pill amount-miyuu">MIYUU ${miyuuValue}円</span>`);
        }
        if (sharedValue !== 0) {
            amountBadges.push(`<span class="amount-pill amount-shared">共同 ${sharedValue}円</span>`);
        }

        const amountHtml = amountBadges.length ? `
            <div class="record-amounts">
                ${amountBadges.join("")}
            </div>
        ` : "";

        // ▼ 貯金トグル（saving のときだけ表示）
        const savingToggle = r.type === "saving"
            ? `<span class="saving-toggle ${r.checked ? "checked" : ""}" data-id="${r.id}">貯金</span>`
            : `<span class="record-type spending">支出</span>`;

        li.innerHTML = `
            <div class="record-main">
                <span class="record-date">${r.date}</span>
                <span class="record-title">${r.title}</span>
                ${savingToggle}
            </div>

            <div class="record-bottom-row">
                ${amountHtml}
                <button class="delete-btn" data-id="${r.id}">削除</button>
            </div>

            <div class="record-memo">${r.memo}</div>
        `;

        list.appendChild(li);
    });

    // ▼ 削除処理
    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", function () {
            const id = this.dataset.id;

            if (!confirm("本当に削除しますか？")) return;

            fetch(`/api/delete/${id}`, { method: "POST" })
                .then(res => res.json())
                .then(() => loadRecords());
        });
    });
}

// いろんなイベントリスナーや関数が書いてある
// ...
// loadRecords();
// renderRecords();

// ▼ ここに追加すると安全
document.addEventListener("click", function(e) {
    if (e.target.classList.contains("saving-toggle")) {
        const id = e.target.dataset.id;

        // レコードを探す
        const record = records.find(r => r.id == id);

        // トグル
        record.checked = !record.checked;

        // 見た目反映
        e.target.classList.toggle("checked", record.checked);

        // 保存
        saveRecords();
    }
});


// -----------------------------
// 残高計算
// -----------------------------
function updateBalance(records) {
    // accept optional records, otherwise use last filtered set
    if (!records) records = window.currentFilteredRecords || [];

    const includeSpending = localStorage.getItem('includeSpending') === 'true';

    let takeruGross = 0;
    let miyuuGross = 0;
    let takeru = 0;
    let miyuu = 0;
    let spendingSum = 0;

    records.forEach(r => {
        // skip records explicitly marked not to reflect (default: include)
        if (r.reflect === false) return;  // false means exclude

        const t = parseInt(r.takeru, 10) || 0;
        const m = parseInt(r.miyuu, 10) || 0;
        const s = parseInt(r.shared, 10) || 0;
        const sharedHalf = Math.floor(s / 2);
        const sharedOther = s - sharedHalf;

        takeruGross += t;
        miyuuGross += m;

        if (r.type === 'saving') {
            takeru += t + sharedHalf;
            miyuu += m + sharedOther;
        } else {
            // spending
            spendingSum += (t + m + s);
            if (includeSpending) {
                takeru -= t + sharedHalf;
                miyuu -= m + sharedOther;
            }
        }
    });

    const total = takeru + miyuu;

    document.getElementById("takeru-balance").textContent = takeruGross + "円";
    document.getElementById("miyuu-balance").textContent = miyuuGross + "円";
    document.getElementById("total-balance").textContent = total + "円";

    formatAmounts();

    const historyTotalEl = document.getElementById('history-total-balance');
    if (historyTotalEl) historyTotalEl.textContent = total + '円';

    // update spending total display
    const spendingEl = document.getElementById('spending-total');
    if (spendingEl) spendingEl.textContent = spendingSum + '円';

    // update toggle button text/state
    const toggleBtn = document.getElementById('toggle-spending');
    if (toggleBtn) {
        if (includeSpending) {
            toggleBtn.textContent = '支出を表示しない';
            toggleBtn.classList.remove('excluded');
        } else {
            toggleBtn.textContent = '支出を含める';
            toggleBtn.classList.add('excluded');
        }
    }
}

// -----------------------------
// 新規追加
// -----------------------------
document.getElementById("add-btn").addEventListener("click", () => {
    const data = {
        type: document.querySelector("input[name='type']:checked").value,
        date: document.getElementById("date").value,
        title: document.getElementById("title").value,
        takeru: document.getElementById("takeru").value || 0,
        miyuu: document.getElementById("miyuu").value || 0,
        shared: document.getElementById("shared").value || 0,
        memo: document.getElementById("memo").value
    };

    fetch("/api/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    }).then(() => {
        // reset inputs
        document.getElementById("title").value = "";
        document.getElementById("takeru").value = "";
        document.getElementById("miyuu").value = "";
        document.getElementById("shared").value = "";
        document.getElementById("memo").value = "";

        // reset date to today
        const today = new Date().toISOString().slice(0,10);
        document.getElementById("date").value = today;

        // reload
        loadRecords();

        // ★★★ フォームを閉じる ★★★
        const form = document.getElementById("new-entry");
        form.classList.remove("visible");
        form.classList.add("hidden");
        document.getElementById("overlay").classList.add("hidden");
    });
});

// -----------------------------
// 削除
// -----------------------------
function deleteRecord(id) {
    fetch(`/delete/${id}`, {
        method: "POST"
    })
    .then(res => res.json())
    .then(() => {
        loadRecords();
    });
}






// -----------------------------
// 🔍 検索
// -----------------------------
function search() {
    const keyword = document.getElementById("keyword").value.trim();
    const fromDate = document.getElementById("fromDate").value; // "2026-06-01"
    const toDate   = document.getElementById("toDate").value;   // "2026-06-30"

    fetch("/api/records")
        .then(res => res.json())
        .then(records => {
            let filtered = records;

            // キーワード検索
            if (keyword !== "") {
                filtered = filtered.filter(r =>
                    r.title.includes(keyword) ||
                    r.memo.includes(keyword)
                );
            }

            // 日付範囲フィルタ
            filtered = filtered.filter(r => {
                const recordDate = r.date; // "2026-06-10"

                const afterStart = !fromDate || recordDate >= fromDate;
                const beforeEnd  = !toDate   || recordDate <= toDate;

                return afterStart && beforeEnd;
            });

            // 描画・計算
            renderRecords(filtered);
            updateBalance(filtered);

            // 表示用テキスト
            const displayFrom = fromDate || "指定なし";
            const displayTo   = toDate   || "指定なし";

            updateBalancePeriod(`${displayFrom} ～ ${displayTo}`);

            // 絞り込み表示
            const filterInfo = document.getElementById("filter-info");
            let text = "（絞り込み: ";

            if (keyword !== "") {
                text += `キーワード「${keyword}」 `;
            }

            text += `${displayFrom} ～ ${displayTo}）`;
            filterInfo.textContent = text;

            // フォーム閉じる
            closeSearchForm();
        });
}


// -----------------------------
// 🔄 リセット
// -----------------------------
function resetSearch() {
    document.getElementById("keyword").value = "";
    document.getElementById("fromDate").value = "";
    document.getElementById("toDate").value = "";

    document.getElementById("filter-info").textContent = "";

    loadRecords();
    closeSearchForm();
}


function updateBalancePeriod(text) {
    const periodElement = document.getElementById("balance-period");
    if (periodElement) {
        periodElement.textContent = `期間：${text}`;
    }
}

document.getElementById("search-exec").addEventListener("click", () => {
    search();  // ← これが search() を呼ぶ
});

document.getElementById("search-reset").addEventListener("click", () => {
    resetSearch();
});

// toggle reflect flag for a record at index
function toggleReflect(index) {
    fetch('/api/records')
        .then(res => res.json())
        .then(records => {
            if (index < 0 || index >= records.length) return;
            const record = records[index];
            record.reflect = record.reflect === false ? true : false;

            fetch('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ index: index, record: record })
            }).then(() => {
                loadRecords();
            });
        });
}

function selectType(type) {
    selectedType = type;
    console.log("app.js 読み込まれた！");


    const takeru = document.getElementById("takeru");
    const miyuu = document.getElementById("miyuu");

    if (type === "spending") {
        takeru.disabled = true;
        miyuu.disabled = true;
        takeru.value = 0;
        miyuu.value = 0;
    } else {
        takeru.disabled = false;
        miyuu.disabled = false;
    }
}

function formatAmounts() {
    document.querySelectorAll('#total-balance, #takeru-balance, #miyuu-balance, #spending-total, #history-total-balance')
        .forEach(el => {
            const num = Number(el.textContent.replace(/[^0-9\-]/g, ''));
            if (!isNaN(num)) {
                el.textContent = num.toLocaleString() + "円";
            }
        });
}

// ページ読み込み後に実行
window.addEventListener('DOMContentLoaded', formatAmounts);
