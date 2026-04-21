const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { Client, Authenticator } = require('minecraft-launcher-core');
const Store = require('electron-store');
const axios = require('axios');
const fs = require('fs');
const https = require('https');

const store = new Store();
const launcher = new Client();

let mainWindow;

// ========= VERSION CACHE =========
let cachedVersionData = null;
let versionCacheTime = 0;
const VERSION_CACHE_TTL = 30 * 60 * 1000; // 30 dakika

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    title: 'CraftLauncher',
    icon: path.join(__dirname, 'renderer', 'assets', 'logo-zoom-gray.png'),//logo taskbar
    frame: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.setMenuBarVisibility(false);
  const indexPath = path.join(__dirname, 'renderer', 'index.html');
  mainWindow.loadFile(indexPath);

  // Pencere hazır olunca hemen göster
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Sayfa yüklenince tüm başlangıç verilerini tek seferde gönder
  mainWindow.webContents.on('did-finish-load', () => {
    const initData = {
      account: store.get('account') || null,
      theme: store.get('theme') || null,
      ram: store.get('ram') || null,
      profiles: store.get('profiles') || null,
      customization: store.get('customization') || null,
      mcPath: path.join(app.getPath('userData'), 'minecraft')
    };
    mainWindow.webContents.send('init-data', initData);

    // Versionları arka planda getir, UI'ı bloklamadan
    fetchVersionsCached().then(data => {
      if (data && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('init-versions', data);
      }
    }).catch(() => { });
  });
}

// ========= DISCORD RPC =========
const DiscordRPC = require("discord-rpc");

const clientId = "1488283338618830988";
const rpc = new DiscordRPC.Client({ transport: "ipc" });

let rpcConnected = false;
let startTimestamp = new Date();

function setRPCActivity(details, state, smallText) {
  if (!rpcConnected) return;

  const activity = {
    details: details,
    state: state,
    startTimestamp: startTimestamp,
    largeImageKey: "large",
    largeImageText: "CraftLauncher",
    smallImageKey: "small",
    smallImageText: smallText || "",
    instance: false,
    buttons: [
      {
        label: "CraftLauncher İndir",
        url: "https://github.com/CraftLauncher",
      },
      {
        label: "Web Sitesi",
        url: "https://craftlauncher.com",
      },
    ],
  };

  rpc.setActivity(activity).catch(() => { });
}

rpc.on("ready", () => {
  rpcConnected = true;
  setRPCActivity("CraftLauncher", "Ana Menü", "Hazır");
  console.log("Discord RPC client ready");
});

function connectRPC() {
  rpc.login({ clientId }).catch((err) => {
    // Discord kapalıysa 10 saniye sonra tekrar dene
    setTimeout(connectRPC, 10000);
  });
}

// ========== DIRECTORY REPAIR ==========
function verifyMinecraftDirectories() {
  const rootDir = path.join(app.getPath('userData'), 'minecraft');
  const baseFolders = [
    'assets',
    'libraries',
    'logs',
    'mods',
    'resourcepacks',
    'saves',
    'screenshots',
    'versions',
    'instances'
  ];

  baseFolders.forEach(folder => {
    const folderPath = path.join(rootDir, folder);
    if (!fs.existsSync(folderPath)) {
      try {
        fs.mkdirSync(folderPath, { recursive: true });
        console.log(`[ONARIM] Klasör oluşturuldu: ${folderPath}`);
      } catch (err) {
        console.error(`[HATA] Klasör oluşturulamadı: ${folderPath}`, err);
      }
    }
  });

  console.log('[SYSTEM] Minecraft klasör yapısı onarıldı / doğrulandı.');
}

app.whenReady().then(() => {
  verifyMinecraftDirectories(); // Klasör onarımı
  createWindow();
  // Discord RPC'yi 3 saniye geciktir, başlatmayı yavaşlatmasın
  setTimeout(connectRPC, 3000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ========== WINDOW CONTROLS ==========
ipcMain.on('win-minimize', () => mainWindow?.minimize());
ipcMain.on('win-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('win-close', () => mainWindow?.close());

// ========== MC PATH ==========
ipcMain.handle('get-mc-path', () => {
  return path.join(app.getPath('userData'), 'minecraft');
});

// ========== VERSIONS ==========
// Cachelı version fetch fonksiyonu
async function fetchVersionsCached() {
  const now = Date.now();
  if (cachedVersionData && (now - versionCacheTime) < VERSION_CACHE_TTL) {
    return cachedVersionData;
  }
  try {
    const res = await axios.get('https://launchermeta.mojang.com/mc/game/version_manifest.json', { timeout: 8000 });
    cachedVersionData = res.data;
    versionCacheTime = now;
    return cachedVersionData;
  } catch (err) {
    console.error('Error fetching versions:', err.message);
    return cachedVersionData || null; // Eski cache varsa onu döndür
  }
}

ipcMain.handle('get-versions', async () => {
  return await fetchVersionsCached();
});

// ========== OFFLINE LOGIN ==========
ipcMain.handle('login-offline', async (event, username) => {
  try {
    if (!username || username.trim().length < 3) {
      return { success: false, error: 'Kullanıcı adı en az 3 karakter olmalı.' };
    }
    const session = {
      access_token: '0',
      client_token: '0',
      uuid: '0',
      name: username.trim(),
      user_properties: '{}',
      meta: { type: 'offline', demo: false }
    };
    store.set('account', { type: 'offline', session });
    return { success: true, session };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ========== MICROSOFT LOGIN ==========
ipcMain.handle('login-microsoft', async () => {
  try {
    const msmc = await import('msmc');
    const Auth = msmc.Auth || msmc.default?.Auth || msmc.default;

    if (!Auth) {
      return { success: false, error: 'msmc modülü yüklenemedi.' };
    }

    const authManager = new Auth('select_account');
    const xboxManager = await authManager.launch('electron');
    const token = await xboxManager.getMinecraft();

    if (!token || !token.profile) {
      return { success: false, error: 'Microsoft girişi başarısız.' };
    }

    const session = {
      access_token: token.access_token,
      client_token: token.client_token || '0',
      uuid: token.profile.id,
      name: token.profile.name,
      user_properties: '{}',
      meta: { type: 'msa', demo: false }
    };

    store.set('account', { type: 'microsoft', session });
    return { success: true, session };
  } catch (err) {
    console.error('MS Login Error:', err.message || err);
    if (String(err).includes('gui.closed') || String(err).includes('closed')) {
      return { success: false, error: 'Giriş penceresi kapatıldı.' };
    }
    return { success: false, error: err.message || 'Bilinmeyen hata' };
  }
});

// ========== ELY.BY LOGIN ==========
ipcMain.handle('login-elyby', async (event, username, password) => {
  try {
    if (!username || !password) {
      return { success: false, error: 'Kullanıcı adı ve şifre gerekli.' };
    }

    const res = await axios.post('https://authserver.ely.by/auth/authenticate', {
      username: username,
      password: password,
      clientToken: 'craftlauncher-client',
      requestUser: true
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000 // 5 saniye timeout
    });

    const data = res.data;
    const session = {
      access_token: data.accessToken,
      client_token: data.clientToken,
      uuid: data.selectedProfile?.id || '0',
      name: data.selectedProfile?.name || username,
      user_properties: '{}',
      meta: { type: 'elyby', demo: false }
    };

    store.set('account', { type: 'elyby', session });
    return { success: true, session };
  } catch (err) {
    const msg = err.response?.data?.errorMessage || err.message;
    return { success: false, error: msg };
  }
});

// ========== LOGOUT ==========
ipcMain.handle('logout', () => {
  store.delete('account');
  return { success: true };
});

// ========== GET SAVED ACCOUNT ==========
ipcMain.handle('get-account', () => {
  return store.get('account') || null;
});

// ========== MODRINTH API ==========
ipcMain.handle('modrinth-search', async (event, { query, loaders, versions, offset }) => {
  try {
    let url = `https://api.modrinth.com/v2/search?query=${encodeURIComponent(query)}&limit=20&offset=${offset || 0}`;

    // Always filter to mods only for the regular search
    let facets = [['project_type:mod']];

    if (loaders && loaders.length > 0) {
      facets.push(loaders.map(l => `categories:${l}`));
    }
    if (versions && versions.length > 0) {
      facets.push(versions.map(v => `versions:${v}`));
    }

    if (facets.length > 0) {
      url += `&facets=${JSON.stringify(facets)}`;
    }

    const res = await axios.get(url);
    return res.data;
  } catch (err) {
    console.error('Modrinth search error:', err.message);
    return { hits: [] };
  }
});

ipcMain.handle('modrinth-get-project', async (event, id) => {
  try {
    const res = await axios.get(`https://api.modrinth.com/v2/project/${id}`);
    return res.data;
  } catch (err) {
    return null;
  }
});

ipcMain.handle('modrinth-get-versions', async (event, id) => {
  try {
    const res = await axios.get(`https://api.modrinth.com/v2/project/${id}/version`);
    return res.data;
  } catch (err) {
    return [];
  }
});

// ========== LAUNCH GAME ==========
ipcMain.handle('launch', async (event, args) => {
  const { version, memory, instanceName, loaderType } = args;
  const account = store.get('account');

  const baseRoot = path.join(app.getPath('userData'), 'minecraft');
  let mcRoot = baseRoot;

  if (instanceName && instanceName !== 'Vanilla Default') {
    mcRoot = path.join(baseRoot, 'instances', instanceName);
  }

  if (!fs.existsSync(mcRoot)) fs.mkdirSync(mcRoot, { recursive: true });

  let auth;
  if (account && account.session) {
    auth = account.session;
  } else {
    auth = Authenticator.getAuth('Steve');
  }

  /* 
   * ORTAK ASSETS VE LIBRARIES KULLANIMI MANTIĞI:
   * minecraft-launcher-core (MCLC) varsayılan olarak her şeyi 'root' içine kurar.
   * Profiller (instances) arası assets ve library dosyalarını ortak kullanmak için
   * 'root' ana klasör (baseRoot) olarak ayarlanmalı, ancak profilin kendine özel 
   * mods/saves gibi klasörlerini barındırması için 'overrides.gameDirectory' veya 
   * 'cwd' oyunun çalışma dizinine (instance dizini) yönlendirilmelidir.
   */
  const opts = {
    authorization: auth,
    root: baseRoot, // Temel kaynakların (assets, libraries, versions) okunduğu ortak ana dizin
    version: {
      number: version || '1.21.4',
      type: 'release'
    },
    memory: {
      max: `${memory || 4}G`,
      min: '1G'
    },
    overrides: {
      gameDirectory: mcRoot, // Oyun dosyalarının (saves, mods, resourcepacks) tutulacağı asıl (instance) dizin
      cwd: mcRoot            // Çalışma dizini ataması (uyumluluk için)
    }
  };

  if (args.javaPath && args.javaPath.trim() !== '') {
    opts.javaPath = args.javaPath.trim();
  }


  // RPC'yi güncelle — oyun başladığında
  setRPCActivity(
    `Minecraft ${version || '1.21.4'}`,
    instanceName && instanceName !== 'Vanilla Default' ? `Instance: ${instanceName}` : "Vanilla",
    "Oynuyor"
  );

  launcher.removeAllListeners();
  launcher.on('debug', (e) => event.sender.send('launch-status', { msg: String(e) }));
  launcher.on('download', (e) => event.sender.send('launch-status', { msg: `İndiriliyor: ${e}` }));
  launcher.on('progress', (e) => {
    const pct = Math.round((e.task / e.total) * 100);
    event.sender.send('launch-progress', pct);
  });
  launcher.on('close', () => {
    event.sender.send('launch-finished');
    // Oyun kapandığında RPC'yi sıfırla
    setRPCActivity("CraftLauncher", "Ana Menü", "Hazır");
  });

  try {
    await launcher.launch(opts);
    return { success: true };
  } catch (err) {
    console.error('Launch failed:', err);
    return { success: false, error: err.message };
  }
});

// ========== MOD INSTALLATION ==========
ipcMain.handle('install-mod', async (event, { url, filename, instanceName }) => {
  try {
    const modsDir = path.join(app.getPath('userData'), 'minecraft', 'instances', instanceName, 'mods');
    if (!fs.existsSync(modsDir)) fs.mkdirSync(modsDir, { recursive: true });

    const filePath = path.join(modsDir, filename);
    const file = fs.createWriteStream(filePath);

    return new Promise((resolve, reject) => {
      https.get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve({ success: true });
        });
      }).on('error', (err) => {
        fs.unlink(filePath, () => { });
        reject({ success: false, error: err.message });
      });
    });
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ========== MODRINTH MODPACK API ==========
ipcMain.handle('modrinth-search-modpacks', async (event, { query, loaders, versions, offset, sort }) => {
  try {
    let url = `https://api.modrinth.com/v2/search?query=${encodeURIComponent(query)}&limit=20&offset=${offset || 0}`;

    // Sort logic
    if (sort) {
      const indexMap = {
        'relevance': 'relevance',
        'downloads': 'downloads',
        'follows': 'follows',
        'newest': 'newest',
        'updated': 'updated'
      };
      if (indexMap[sort]) {
        url += `&index=${indexMap[sort]}`;
      }
    }

    let facets = [['project_type:modpack']];
    if (loaders && loaders.length > 0) {
      facets.push(loaders.map(l => `categories:${l}`));
    }
    if (versions && versions.length > 0) {
      facets.push(versions.map(v => `versions:${v}`));
    }

    url += `&facets=${JSON.stringify(facets)}`;

    const res = await axios.get(url);
    return res.data;
  } catch (err) {
    console.error('Modrinth modpack search error:', err.message);
    return { hits: [] };
  }
});

ipcMain.handle('install-modpack', async (event, { url, filename, packTitle }) => {
  try {
    const modpacksDir = path.join(app.getPath('userData'), 'minecraft', 'modpacks');
    if (!fs.existsSync(modpacksDir)) fs.mkdirSync(modpacksDir, { recursive: true });

    const filePath = path.join(modpacksDir, filename);
    const file = fs.createWriteStream(filePath);

    return new Promise((resolve, reject) => {
      https.get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve({ success: true, path: filePath });
        });
      }).on('error', (err) => {
        fs.unlink(filePath, () => { });
        reject({ success: false, error: err.message });
      });
    });
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ========== DELETE PROFILE ==========
ipcMain.handle('delete-profile', async (event, profileName) => {
  try {
    const profiles = store.get('profiles') || [];
    const updatedProfiles = profiles.filter(p => p.name !== profileName);
    store.set('profiles', updatedProfiles);

    // Instance klasörünü de sil (Vanilla Default değilse)
    if (profileName !== 'Vanilla Default') {
      const instancePath = path.join(app.getPath('userData'), 'minecraft', 'instances', profileName);
      if (fs.existsSync(instancePath)) {
        fs.rmSync(instancePath, { recursive: true, force: true });
      }
    }

    return { success: true };
  } catch (err) {
    console.error('Delete profile error:', err);
    return { success: false, error: err.message };
  }
});

// ========== FOLDER ==========
ipcMain.on('open-folder', (event, subfolder) => {
  const root = path.join(app.getPath('userData'), 'minecraft');
  const p = subfolder ? path.join(root, subfolder) : root;
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  shell.openPath(p);
});

// ========== STORE ==========
ipcMain.handle('get-store-val', (event, key) => store.get(key));
ipcMain.handle('set-store-val', (event, key, val) => { store.set(key, val); return true; });