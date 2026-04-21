// --- Current Selection ---
let currentProfileName = 'Vanilla Default';

// --- Page Navigation ---
function showPage(pageName) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const page = document.getElementById('page-' + pageName);
    if (page) page.classList.add('active');
    const navItem = document.querySelector(`.nav-item[data-page="${pageName}"]`);
    if (navItem) navItem.classList.add('active');
}

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        showPage(item.getAttribute('data-page'));
    });
});

// --- Modal ---
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
}

document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('active');
    });
});

// --- Toast ---
function showToast(message, type = 'info') {
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${icons[type]}"></i><span>${message}</span>`;
    const container = document.getElementById('toast-container');
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// --- Play Page ---
function selectProfile(el, name, version, type) {
    document.querySelectorAll('.profile-item').forEach(p => p.classList.remove('active'));
    el.classList.add('active');

    currentProfileName = name; // Update global state

    document.getElementById('selected-name').textContent = name;
    document.getElementById('selected-version').textContent = version;
    document.getElementById('selected-type').textContent = type;

    updateModsBadge(name, type); // Update the badge on Mods page

    const icon = document.getElementById('selected-icon');
    icon.className = 'selected-profile-icon';
    const typeClass = { 'Vanilla': 'vanilla', 'Forge': 'forge', 'Fabric': 'fabric' }[type] || 'vanilla';
    icon.classList.add(typeClass);
    const iconMap = { 'Vanilla': 'fa-cube', 'Forge': 'fa-fire', 'Fabric': 'fa-layer-group' };
    icon.innerHTML = `<i class="fas ${iconMap[type] || 'fa-cube'}"></i>`;
}

function updateRam(value) {
    document.getElementById('ram-label').textContent = value + ' GB';
    document.getElementById('ram-display').textContent = value + ' GB';
    const slider = document.getElementById('ram-slider');
    const pct = ((value - 1) / 15) * 100;
    slider.style.background = `linear-gradient(to right, var(--accent) ${pct}%, var(--bg-tertiary) ${pct}%)`;
}

async function launchGame() {
    const overlay = document.getElementById('launch-overlay');
    overlay.classList.add('active');
    const progressFill = document.getElementById('launch-progress');
    const statusEl = document.getElementById('launch-status');

    const profileName = document.getElementById('selected-name').textContent;
    const version = document.getElementById('selected-version').textContent;
    const type = document.getElementById('selected-type').textContent;
    const ram = parseInt(document.getElementById('ram-slider').value);

    statusEl.textContent = 'Başlatılıyor...';
    progressFill.style.width = '5%';

    window.electron.on('launch-progress', (data) => { progressFill.style.width = data[0] + '%'; });
    window.electron.on('launch-status', (data) => {
        let msg = data[0]?.msg || '';
        if (msg.length > 60) msg = msg.substring(0, 60) + '...';
        statusEl.textContent = msg;
    });
    window.electron.on('launch-finished', () => {
        overlay.classList.remove('active');
        showToast('Oyun kapatıldı.', 'info');
    });

    const javaPathVal = document.getElementById('java-path-input') ? document.getElementById('java-path-input').value : null;

    const result = await window.electron.invoke('launch', {
        version,
        memory: ram,
        instanceName: profileName,
        loaderType: type,
        javaPath: javaPathVal
    });

    if (!result.success) {
        overlay.classList.remove('active');
        showToast('Hata: ' + result.error, 'error');
    } else {
        setTimeout(() => {
            overlay.classList.remove('active');
            showToast('Minecraft başlatıldı!', 'success');
        }, 1500);
    }
}

function cancelLaunch() {
    document.getElementById('launch-overlay').classList.remove('active');
    document.getElementById('launch-progress').style.width = '0%';
    showToast('Başlatma iptal edildi.', 'warning');
}

async function createProfile() {
    const name = document.getElementById('new-profile-name').value.trim();
    const version = document.getElementById('new-profile-version').value;
    const type = document.getElementById('new-profile-type').value;
    if (!name) { showToast('Profil adı boş olamaz!', 'error'); return; }

    const profile = { name, version, type, createdAt: Date.now() };
    const profiles = await window.electron.invoke('get-store-val', 'profiles') || [];
    profiles.push(profile);
    await window.electron.invoke('set-store-val', 'profiles', profiles);

    renderProfileItem(profile);
    closeModal('new-profile-modal');
    document.getElementById('new-profile-name').value = '';
    showToast(`"${name}" profili oluşturuldu!`, 'success');
}

async function deleteSelectedProfile() {
    const profileName = document.getElementById('selected-name').textContent;

    // Vanilla Default silinemez uyarısı (opsiyonel ama güvenli)
    if (profileName === 'Vanilla Default') {
        showToast('Varsayılan profil silinemez!', 'warning');
        return;
    }

    const confirmed = confirm(`"${profileName}" profilini ve tüm verilerini silmek istediğinize emin misiniz?`);
    if (!confirmed) return;

    try {
        const result = await window.electron.invoke('delete-profile', profileName);
        if (result.success) {
            showToast(`"${profileName}" başarıyla silindi.`, 'success');
            // Sayfayı yenile veya profil listesini güncelle
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            showToast('Silme hatası: ' + result.error, 'error');
        }
    } catch (err) {
        showToast('Bilinmeyen bir hata oluştu.', 'error');
        console.error(err);
    }
}

function renderProfileItem(profile) {
    const list = document.getElementById('profile-list');

    // Remove empty state if it's there
    const empty = list.querySelector('.empty-state');
    if (empty) empty.remove();

    const typeClass = { 'Vanilla': 'vanilla', 'Forge': 'forge', 'Fabric': 'fabric', 'Quilt': 'fabric' }[profile.type] || 'vanilla';
    const iconClass = { 'Vanilla': 'fa-cube', 'Forge': 'fa-fire', 'Fabric': 'fa-layer-group', 'Quilt': 'fa-layer-group' }[profile.type] || 'fa-cube';

    const item = document.createElement('div');
    item.className = 'profile-item';
    item.onclick = function () { selectProfile(this, profile.name, profile.version, profile.type); };
    item.innerHTML = `
        <div class="profile-icon ${typeClass}"><i class="fas ${iconClass}"></i></div>
        <div class="profile-info">
            <span class="profile-name">${profile.name}</span>
            <span class="profile-type">${profile.type} • ${profile.version}</span>
        </div>
        <div class="profile-arrow"><i class="fas fa-chevron-right"></i></div>`;
    list.appendChild(item);
}

// ========== MODRINTH SYSTEM ==========

let currentModPage = 0;
const MODS_PER_PAGE = 20;

function changeModPage(direction) {
    if (direction === -1 && currentModPage > 0) {
        currentModPage--;
        searchModsModrinth(true);
    } else if (direction === 1) {
        currentModPage++;
        searchModsModrinth(true);
    }
}

async function searchModsModrinth(isPagination = false) {
    if (!isPagination) {
        currentModPage = 0; // Reset page on new search
    }

    const query = document.getElementById('mod-search-input').value.trim();
    const loaders = Array.from(document.querySelectorAll('.mod-loader-filter:checked')).map(cb => cb.value);
    const version = document.getElementById('mod-version-filter').value;

    const resultsContainer = document.getElementById('mods-results');
    const paginationContainer = document.getElementById('mods-pagination');

    // Yükleniyor durumu
    resultsContainer.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin fa-3x"></i><p>Modlar getiriliyor...</p></div>';
    paginationContainer.style.display = 'none'; // Gizle

    const data = await window.electron.invoke('modrinth-search', {
        query,
        loaders,
        versions: version ? [version] : [],
        offset: currentModPage * MODS_PER_PAGE
    });

    if (!data.hits || data.hits.length === 0) {
        resultsContainer.innerHTML = '<div class="empty-state"><i class="fas fa-search-minus fa-3x"></i><p>Hiç mod bulunamadı.</p></div>';
        return;
    }

    resultsContainer.innerHTML = '';
    data.hits.forEach(mod => {
        const card = document.createElement('div');
        card.className = 'mod-card';
        card.onclick = () => openModDetails(mod);

        const tags = mod.categories.map(c => `<span class="mod-tag">${c}</span>`).slice(0, 3).join('');

        card.innerHTML = `
            <img class="mod-card-icon" src="${mod.icon_url || 'https://api.modrinth.com/assets/images/default_icon.png'}" alt="Icon">
            <div class="mod-card-info">
                <h4>${mod.title}</h4>
                <p>${mod.description}</p>
                <div class="mod-card-meta">${tags}</div>
            </div>
        `;
        resultsContainer.appendChild(card);
    });

    // Sayfalama kontrollerini göster/güncelle
    paginationContainer.style.display = 'flex';
    document.getElementById('mods-page-info').textContent = `Sayfa ${currentModPage + 1}`;

    const prevBtn = document.getElementById('btn-prev-page');
    const nextBtn = document.getElementById('btn-next-page');

    // İlk sayfada önceki butonunu gizle
    if (currentModPage === 0) {
        prevBtn.style.visibility = 'hidden';
    } else {
        prevBtn.style.visibility = 'visible';
    }

    // Gelen veri sayısı limite eşit değilse (daha azsa) son sayfadayız demektir
    if (data.hits.length < MODS_PER_PAGE) {
        nextBtn.style.visibility = 'hidden';
    } else {
        nextBtn.style.visibility = 'visible';
    }
}

async function openModDetails(mod) {
    const title = document.getElementById('mod-detail-title');
    const name = document.getElementById('mod-detail-name');
    const author = document.getElementById('mod-detail-author');
    const icon = document.getElementById('mod-detail-icon');
    const desc = document.getElementById('mod-detail-desc');
    const tags = document.getElementById('mod-detail-tags');
    const versionsList = document.getElementById('mod-versions-list');
    const profileSelect = document.getElementById('mod-install-profile-select');

    title.textContent = mod.title;
    name.textContent = mod.title;
    author.textContent = mod.author ? `Yazar: ${mod.author}` : '';
    icon.src = mod.icon_url || 'https://api.modrinth.com/assets/images/default_icon.png';
    desc.textContent = mod.description;
    tags.innerHTML = mod.categories.map(c => `<span class="mod-tag">${c}</span>`).join('');

    versionsList.innerHTML = '<tr><td colspan="4" style="text-align:center">Sürümler yükleniyor...</td></tr>';

    // Fill profiles and pre-select current
    const profiles = await window.electron.invoke('get-store-val', 'profiles') || [];
    profileSelect.innerHTML = profiles.map(p =>
        `<option value="${p.name}" ${p.name === currentProfileName ? 'selected' : ''}>${p.name} (${p.type} • ${p.version})</option>`
    ).join('');

    if (profiles.length === 0) {
        profileSelect.innerHTML = '<option value="">Önce bir profil oluşturun</option>';
    }

    openModal('mod-detail-modal');

    // Fetch versions
    const versions = await window.electron.invoke('modrinth-get-versions', mod.project_id);
    versionsList.innerHTML = '';

    versions.slice(0, 15).forEach(v => {
        const row = document.createElement('tr');
        const date = new Date(v.date_published).toLocaleDateString('tr-TR');
        const file = v.files[0];

        row.innerHTML = `
            <td><strong>${v.version_number}</strong><br><small>${v.game_versions.join(', ')}</small></td>
            <td>${v.loaders.join(', ')}</td>
            <td>${date}</td>
            <td>
                <button class="btn-launch btn-install-sm" onclick="installMod('${mod.title}', '${file.filename}', '${file.url}')">
                    <i class="fas fa-download"></i> Kur
                </button>
            </td>
        `;
        versionsList.appendChild(row);
    });
}

async function installMod(modTitle, filename, url) {
    const instanceName = document.getElementById('mod-install-profile-select').value;
    if (!instanceName) {
        showToast('Lütfen modun kurulacağı bir profil seçin!', 'warning');
        return;
    }

    showToast(`${modTitle} indiriliyor...`, 'info');

    const result = await window.electron.invoke('install-mod', {
        url,
        filename,
        instanceName
    });

    if (result.success) {
        showToast(`${modTitle} başarıyla kuruldu!`, 'success');
    } else {
        showToast(`Kurulum hatası: ${result.error}`, 'error');
    }
}

function updateModsBadge(name, type) {
    const badge = document.getElementById('mods-active-profile-display');
    if (!badge) return;
    const iconMap = { 'Vanilla': 'fa-cube', 'Forge': 'fa-fire', 'Fabric': 'fa-layer-group', 'Quilt': 'fa-layer-group' };
    const icon = iconMap[type] || 'fa-cube';
    badge.innerHTML = `<i class="fas ${icon}"></i> <span>${name}</span>`;
}

async function openProfileSelector() {
    const list = document.getElementById('profile-selector-list');
    const profiles = await window.electron.invoke('get-store-val', 'profiles') || [];

    list.innerHTML = '';
    if (profiles.length === 0) {
        list.innerHTML = '<p style="text-align:center; padding:20px; font-size:12px;">Henüz hiç profil yok.</p>';
    }

    profiles.forEach(p => {
        const item = document.createElement('div');
        item.className = `selector-item ${p.name === currentProfileName ? 'active' : ''}`;
        const iconMap = { 'Vanilla': 'fa-cube', 'Forge': 'fa-fire', 'Fabric': 'fa-layer-group', 'Quilt': 'fa-layer-group' };
        const icon = iconMap[p.type] || 'fa-cube';

        item.onclick = () => {
            // Find and click the profile in the main list to trigger full sync
            const mainItems = document.querySelectorAll('.profile-item');
            mainItems.forEach(mi => {
                if (mi.querySelector('.profile-name').textContent === p.name) {
                    mi.click();
                }
            });
            closeModal('profile-selector-modal');
            showToast(`Hedef profil: ${p.name}`, 'info');
        };

        item.innerHTML = `
            <div class="profile-icon mini ${p.type.toLowerCase()}"><i class="fas ${icon}"></i></div>
            <div class="selector-item-info">
                <span class="selector-item-name">${p.name}</span>
                <span class="selector-item-meta">${p.type} • ${p.version}</span>
            </div>
        `;
        list.appendChild(item);
    });

    openModal('profile-selector-modal');
}

// ========== MODS/MODPACKS TAB SYSTEM ==========

function switchModsTab(tabId) {
    document.querySelectorAll('.mods-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.mods-tab-content').forEach(c => c.classList.remove('active'));

    document.querySelector(`.mods-tab[data-tab="${tabId}"]`)?.classList.add('active');
    document.getElementById(tabId)?.classList.add('active');
}

// ========== MODPACK SYSTEM ==========

let currentModpackPage = 0;
const MODPACKS_PER_PAGE = 20;

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function changeModpackPage(direction) {
    if (direction === -1 && currentModpackPage > 0) {
        currentModpackPage--;
        searchModpacksModrinth(true);
    } else if (direction === 1) {
        currentModpackPage++;
        searchModpacksModrinth(true);
    }
}

async function searchModpacksModrinth(isPagination = false) {
    if (!isPagination) {
        currentModpackPage = 0;
    }

    const query = document.getElementById('modpack-search-input').value.trim();
    const loaders = Array.from(document.querySelectorAll('.modpack-loader-filter:checked')).map(cb => cb.value);
    const version = document.getElementById('modpack-version-filter').value;
    const sort = document.getElementById('modpack-sort-filter').value;

    const resultsContainer = document.getElementById('modpack-results');
    const paginationContainer = document.getElementById('modpack-pagination');

    resultsContainer.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin fa-3x"></i><p>Modpack\'ler getiriliyor...</p></div>';
    paginationContainer.style.display = 'none';

    const data = await window.electron.invoke('modrinth-search-modpacks', {
        query,
        loaders,
        versions: version ? [version] : [],
        offset: currentModpackPage * MODPACKS_PER_PAGE,
        sort: sort
    });

    if (!data.hits || data.hits.length === 0) {
        resultsContainer.innerHTML = '<div class="empty-state"><i class="fas fa-box-open fa-3x"></i><p>Hiç modpack bulunamadı.</p></div>';
        return;
    }

    resultsContainer.innerHTML = '';
    data.hits.forEach(pack => {
        const card = document.createElement('div');
        card.className = 'modpack-card';
        card.onclick = () => openModpackDetails(pack);

        const tags = pack.categories
            .filter(c => !['fabric', 'forge', 'quilt', 'neoforge'].includes(c))
            .map(c => `<span class="mod-tag">${c}</span>`)
            .slice(0, 3).join('');

        const loaderTags = pack.categories
            .filter(c => ['fabric', 'forge', 'quilt', 'neoforge'].includes(c))
            .map(c => `<span class="mod-tag" style="border-color:var(--accent); color:var(--accent);">${c}</span>`)
            .join('');

        card.innerHTML = `
            <img class="modpack-card-icon" src="${pack.icon_url || 'https://cdn.modrinth.com/placeholder.svg'}" alt="Icon" onerror="this.src='https://api.modrinth.com/assets/images/default_icon.png'">
            <div class="modpack-card-info">
                <h4>${pack.title}</h4>
                <p>${pack.description}</p>
                <div class="modpack-card-footer">
                    <div class="modpack-card-stats">
                        <span><i class="fas fa-download"></i> ${formatNumber(pack.downloads)}</span>
                        <span><i class="fas fa-heart"></i> ${formatNumber(pack.follows)}</span>
                    </div>
                    <div class="modpack-card-tags">${loaderTags}${tags}</div>
                </div>
            </div>
        `;
        resultsContainer.appendChild(card);
    });

    // Pagination
    paginationContainer.style.display = 'flex';
    document.getElementById('modpack-page-info').textContent = `Sayfa ${currentModpackPage + 1}`;

    const prevBtn = document.getElementById('btn-prev-modpack-page');
    const nextBtn = document.getElementById('btn-next-modpack-page');

    prevBtn.style.visibility = currentModpackPage === 0 ? 'hidden' : 'visible';
    nextBtn.style.visibility = data.hits.length < MODPACKS_PER_PAGE ? 'hidden' : 'visible';
}

async function openModpackDetails(pack) {
    const title = document.getElementById('modpack-detail-title');
    const name = document.getElementById('modpack-detail-name');
    const author = document.getElementById('modpack-detail-author');
    const icon = document.getElementById('modpack-detail-icon');
    const desc = document.getElementById('modpack-detail-desc');
    const tags = document.getElementById('modpack-detail-tags');
    const downloads = document.getElementById('modpack-detail-downloads');
    const follows = document.getElementById('modpack-detail-follows');
    const versionsList = document.getElementById('modpack-versions-list');

    title.textContent = pack.title;
    name.textContent = pack.title;
    author.textContent = pack.author ? `Yazar: ${pack.author}` : '';
    icon.src = pack.icon_url || 'https://api.modrinth.com/assets/images/default_icon.png';
    desc.textContent = pack.description;
    downloads.textContent = formatNumber(pack.downloads);
    follows.textContent = formatNumber(pack.follows);
    tags.innerHTML = pack.categories.map(c => `<span class="mod-tag">${c}</span>`).join('');

    versionsList.innerHTML = '<tr><td colspan="5" style="text-align:center">Sürümler yükleniyor...</td></tr>';

    openModal('modpack-detail-modal');

    // Fetch versions
    const versions = await window.electron.invoke('modrinth-get-versions', pack.project_id);
    versionsList.innerHTML = '';

    versions.slice(0, 20).forEach(v => {
        const row = document.createElement('tr');
        const date = new Date(v.date_published).toLocaleDateString('tr-TR');
        const file = v.files[0];
        const fileSize = file ? (file.size / (1024 * 1024)).toFixed(1) + ' MB' : '—';
        const escapedUrl = file ? file.url.replace(/'/g, "\\'") : '';
        const escapedFilename = file ? file.filename.replace(/'/g, "\\'") : '';

        row.innerHTML = `
            <td><strong>${v.version_number}</strong><br><small>${v.game_versions.slice(0, 4).join(', ')}</small></td>
            <td>${v.loaders.join(', ')}</td>
            <td>${date}</td>
            <td>${fileSize}</td>
            <td>
                ${file ? `<button class="btn-launch btn-install-sm" onclick="installModpack('${pack.title.replace(/'/g, "\\'")}', '${escapedFilename}', '${escapedUrl}')">
                    <i class="fas fa-download"></i> İndir
                </button>` : '<span style="color:var(--text-muted)">—</span>'}
            </td>
        `;
        versionsList.appendChild(row);
    });
}

async function installModpack(packTitle, filename, url) {
    showToast(`${packTitle} indiriliyor...`, 'info');

    const result = await window.electron.invoke('install-modpack', {
        url,
        filename,
        packTitle
    });

    if (result.success) {
        showToast(`${packTitle} başarıyla indirildi! Konum: ${result.path}`, 'success');
    } else {
        showToast(`İndirme hatası: ${result.error}`, 'error');
    }
}

// ========== ACCOUNT SYSTEM ==========

function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    document.querySelector(`.auth-tab[data-auth="${tab}"]`)?.classList.add('active');
    document.getElementById('auth-form-' + tab)?.classList.add('active');
}

function updateAccountUI(account) {
    const nameEl = document.getElementById('account-name');
    const avatarEl = document.getElementById('account-avatar');
    const typeEl = document.getElementById('account-type-badge');
    const logoutBtn = document.getElementById('btn-logout');
    const sidebarName = document.getElementById('sidebar-username');
    const sidebarAvatar = document.getElementById('sidebar-avatar');
    const sidebarStatus = document.getElementById('sidebar-status');
    const homeUsername = document.getElementById('home-username');
    const playAccount = document.getElementById('play-account-name');
    const homeType = document.getElementById('home-account-type');

    if (account && account.session) {
        const name = account.session.name;
        const uuid = account.session.uuid;
        const type = account.type;

        const typeLabels = { offline: 'Offline', microsoft: 'Microsoft', elyby: 'Ely.by' };
        const typeIcons = { offline: 'fa-wifi-slash', microsoft: 'fa-microsoft', elyby: 'fa-shield-alt' };
        const typeColors = { offline: '#888', microsoft: '#00a4ef', elyby: '#6c5ce7' };

        nameEl.textContent = name;
        typeEl.innerHTML = `<i class="fas ${typeIcons[type] || 'fa-circle'}" style="color:${typeColors[type]}"></i> ${typeLabels[type] || type}`;
        logoutBtn.style.display = 'flex';

        // Avatar
        let avatarUrl = `https://mc-heads.net/avatar/${name}/80`;
        if (type === 'elyby') avatarUrl = `https://ely.by/services/skins/face/${name}/80`;
        avatarEl.src = avatarUrl;
        sidebarAvatar.src = avatarUrl.replace('/80', '/32');

        sidebarName.textContent = name;
        sidebarStatus.textContent = '● ' + (typeLabels[type] || 'Online');
        sidebarStatus.className = 'user-status online';
        if (homeUsername) homeUsername.textContent = name;
        if (playAccount) playAccount.textContent = name + ' (' + (typeLabels[type] || '') + ')';
        if (homeType) homeType.textContent = (typeLabels[type] || 'Offline') + ' Mod';
    } else {
        nameEl.textContent = 'Giriş Yapılmadı';
        typeEl.innerHTML = '<i class="fas fa-circle" style="color:#888"></i> Çevrimdışı';
        logoutBtn.style.display = 'none';
        avatarEl.src = 'https://mc-heads.net/avatar/Steve/80';
        sidebarAvatar.src = 'https://mc-heads.net/avatar/Steve/32';
        sidebarName.textContent = 'Giriş Yapılmadı';
        sidebarStatus.textContent = '● Çevrimdışı';
        sidebarStatus.className = 'user-status';
        if (homeUsername) homeUsername.textContent = 'Oyuncu';
        if (playAccount) playAccount.textContent = 'Giriş Yapılmadı';
        if (homeType) homeType.textContent = 'Offline Mod';
    }
}

async function loginOffline() {
    const username = document.getElementById('offline-username').value.trim();
    if (!username || username.length < 3) {
        showToast('Kullanıcı adı en az 3 karakter olmalı!', 'error');
        return;
    }
    const result = await window.electron.invoke('login-offline', username);
    if (result.success) {
        showToast('Hoş geldin, ' + username + '!', 'success');
        updateAccountUI({ type: 'offline', session: result.session });
    } else {
        showToast('Hata: ' + result.error, 'error');
    }
}

async function loginMicrosoft() {
    showToast('Microsoft giriş penceresi açılıyor...', 'info');
    const result = await window.electron.invoke('login-microsoft');
    if (result.success) {
        showToast('Hoş geldin, ' + result.session.name + '!', 'success');
        updateAccountUI({ type: 'microsoft', session: result.session });
    } else {
        showToast('Microsoft girişi başarısız: ' + result.error, 'error');
    }
}

async function loginElyby() {
    const username = document.getElementById('elyby-username').value.trim();
    const password = document.getElementById('elyby-password').value;
    if (!username || !password) {
        showToast('Tüm alanları doldurun!', 'error');
        return;
    }
    showToast('Ely.by hesabına giriş yapılıyor...', 'info');
    const result = await window.electron.invoke('login-elyby', username, password);
    if (result.success) {
        showToast('Hoş geldin, ' + result.session.name + '!', 'success');
        updateAccountUI({ type: 'elyby', session: result.session });
    } else {
        showToast('Ely.by girişi başarısız: ' + result.error, 'error');
    }
}

async function logoutAccount() {
    await window.electron.invoke('logout');
    updateAccountUI(null);
    showToast('Oturum kapatıldı.', 'info');
}

// ========== THEME SYSTEM ==========

const ALL_THEMES = ['default', 'nether', 'warden', 'ocean', 'beach', 'end', 'cherry', 'arctic', 'mushroom'];

function changeTheme(themeId) {
    // Tüm tema sınıflarını kaldır
    ALL_THEMES.forEach(t => {
        if (t !== 'default') document.body.classList.remove('theme-' + t);
    });
    if (themeId !== 'default') document.body.classList.add('theme-' + themeId);

    // data-theme attribute'ü ile arka plan resmini güncelle
    document.body.setAttribute('data-theme', themeId === 'default' ? '' : themeId);

    // Ayarlar sayfasındaki tema kartlarını güncelle
    document.querySelectorAll('.theme-card').forEach(card => {
        card.classList.remove('active');
        if (card.getAttribute('data-theme-id') === themeId) card.classList.add('active');
    });

    // Özelleştirme popup'ındaki tema kartlarını güncelle
    document.querySelectorAll('.customize-theme-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-theme') === themeId) item.classList.add('active');
    });

    // Kaydet
    window.electron.invoke('set-store-val', 'theme', themeId);
}

// ========== CUSTOMIZATION POPUP ==========

function openCustomizePopup() {
    document.getElementById('customize-popup').classList.add('active');
}

function closeCustomizePopup() {
    document.getElementById('customize-popup').classList.remove('active');
    // Tüm ayarları tek seferde kaydet
    saveCustomization();
}

function selectCustomizeTheme(el, themeId) {
    changeTheme(themeId);
}

function updateCustomBlur(val) {
    const bgImage = document.querySelector('.bg-main-image');
    if (bgImage) {
        const brightness = document.getElementById('custom-brightness')?.value || 60;
        bgImage.style.filter = `blur(${val}px) brightness(${brightness / 100})`;
    }
    document.getElementById('custom-blur-val').textContent = val + 'px';
}

function updateCustomBrightness(val) {
    const bgImage = document.querySelector('.bg-main-image');
    if (bgImage) {
        const blur = document.getElementById('custom-blur')?.value || 40;
        bgImage.style.filter = `blur(${blur}px) brightness(${val / 100})`;
    }
    document.getElementById('custom-brightness-val').textContent = val + '%';
}

function updateCustomOpacity(val) {
    const bgImage = document.querySelector('.bg-main-image');
    if (bgImage) bgImage.style.opacity = val / 100;
    document.getElementById('custom-opacity-val').textContent = val + '%';
}

function toggleCustomParticles(enabled) {
    const container = document.getElementById('particles');
    if (container) container.style.display = enabled ? 'block' : 'none';
}

function updateSidebarOpacity(val) {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.style.background = `rgba(14, 15, 20, ${val / 100})`;
    document.getElementById('custom-sidebar-val').textContent = val + '%';
}

function saveCustomization() {
    const customization = {
        blur: document.getElementById('custom-blur')?.value || 40,
        brightness: document.getElementById('custom-brightness')?.value || 60,
        opacity: document.getElementById('custom-opacity')?.value || 100,
        particles: document.getElementById('custom-particles')?.checked ?? true,
        sidebarOpacity: document.getElementById('custom-sidebar-opacity')?.value || 95
    };
    window.electron.invoke('set-store-val', 'customization', customization);
}

function loadCustomization(data) {
    if (!data) return;

    // Bulanıklık
    if (data.blur !== undefined) {
        const blurSlider = document.getElementById('custom-blur');
        if (blurSlider) { blurSlider.value = data.blur; updateCustomBlur(data.blur); }
    }
    // Parlaklık
    if (data.brightness !== undefined) {
        const brightSlider = document.getElementById('custom-brightness');
        if (brightSlider) { brightSlider.value = data.brightness; updateCustomBrightness(data.brightness); }
    }
    // Opaklık
    if (data.opacity !== undefined) {
        const opacSlider = document.getElementById('custom-opacity');
        if (opacSlider) { opacSlider.value = data.opacity; updateCustomOpacity(data.opacity); }
    }
    // Parçacıklar
    if (data.particles !== undefined) {
        const partToggle = document.getElementById('custom-particles');
        if (partToggle) { partToggle.checked = data.particles; toggleCustomParticles(data.particles); }
    }
    // Sidebar opaklık
    if (data.sidebarOpacity !== undefined) {
        const sideSlider = document.getElementById('custom-sidebar-opacity');
        if (sideSlider) { sideSlider.value = data.sidebarOpacity; updateSidebarOpacity(data.sidebarOpacity); }
    }
}

// ========== PARTICLES ==========

function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    for (let i = 0; i < 15; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + 'vw';
        p.style.animationDuration = (8 + Math.random() * 12) + 's';
        p.style.animationDelay = (Math.random() * 8) + 's';
        container.appendChild(p);
    }
}

// ========== ESC ==========

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        // Özelleştirme popup'ını kapat
        const cp = document.getElementById('customize-popup');
        if (cp && cp.classList.contains('active')) { closeCustomizePopup(); return; }

        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
        const lo = document.getElementById('launch-overlay');
        if (lo && lo.classList.contains('active')) cancelLaunch();
    }
});

// ========== INIT ==========

// Main process'ten toplu veri al (tek IPC round-trip)
window.electron.on('init-data', (data) => {
    const initData = data[0];
    if (!initData) return;

    // Tema — anında uygula
    if (initData.theme) changeTheme(initData.theme);

    // RAM
    if (initData.ram) {
        const slider = document.getElementById('ram-slider');
        if (slider) {
            slider.value = initData.ram;
            updateRam(initData.ram);
        }
    }

    // MC Path
    if (initData.mcPath) {
        const pathDisplay = document.getElementById('game-path-display');
        if (pathDisplay) pathDisplay.textContent = initData.mcPath;
    }

    // Hesap
    updateAccountUI(initData.account);

    // Profiller
    const profileList = document.getElementById('profile-list');
    if (profileList) {
        if (initData.profiles && initData.profiles.length > 0) {
            profileList.innerHTML = '';
            initData.profiles.forEach(p => renderProfileItem(p));
            const first = profileList.querySelector('.profile-item');
            if (first) first.click();
        } else {
            profileList.innerHTML = `
                <div class="empty-state" style="padding:20px; font-size:12px;">
                    <p>Henüz profil yok. "Yeni" butonuna basarak oluşturun.</p>
                </div>`;
            // Detay panelini de varsayılan duruma getir
            document.getElementById('selected-name').textContent = 'Vanilla Default';
            document.getElementById('selected-version').textContent = '1.21.4';
            document.getElementById('selected-type').textContent = 'Vanilla';
        }
    }

    // Özelleştirme ayarlarını yükle
    if (initData.customization) {
        loadCustomization(initData.customization);
    }

    // Hoşgeldin mesajı
    setTimeout(() => {
        if (!document.querySelector('.nav-item[data-page="home"]')?.classList.contains('active')) return;
        const name = document.getElementById('sidebar-username')?.textContent || 'Oyuncu';
        showToast('Hoş geldin, ' + name + '! 👋', 'success');
    }, 600);
});

// Versionlar ayrı gelir (ağ isteği bitince)
window.electron.on('init-versions', (data) => {
    const versionData = data[0];
    if (versionData && versionData.versions) {
        const select = document.getElementById('new-profile-version');
        if (select) {
            select.innerHTML = versionData.versions
                .filter(v => v.type === 'release')
                .slice(0, 50)
                .map(v => `<option value="${v.id}">${v.id}</option>`)
                .join('');
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    createParticles();
});



//Saat Ve Tarih Fon
function formatRelativeDate(inputDate) {
    const now = new Date();
    const target = new Date(inputDate);

    // Saat farkını yok say
    now.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - now.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays === 0) return "Bugün";
    if (diffDays === -1) return "Dün";
    if (diffDays === 1) return "Yarın";
    if (diffDays < -1) return `${Math.abs(diffDays)} gün önce`;
    if (diffDays > 1) return `${diffDays} gün sonra`;
}

// (YYYY-AA-GG)
const safeSetDate = (id, date) => {
    const el = document.getElementById(id);
    if (el) el.textContent = formatRelativeDate(date);
};

safeSetDate("bugfix-v1", "2026-03-31");
safeSetDate("update1", "2026-03-30");
safeSetDate("update2", "2026-03-30");
safeSetDate("update3", "2026-03-31");
safeSetDate("modfix-v1", "2026-04-12");

safeSetDate("update-name2", "2026-01-01");
safeSetDate("update-name3", "2026-01-01");
safeSetDate("update-name4", "2026-01-01");
safeSetDate("update-name5", "2026-01-01");
safeSetDate("update-name6", "2026-01-01");
safeSetDate("update-name7", "2026-01-01");
safeSetDate("update-name8", "2026-01-01");