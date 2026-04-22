# CraftLauncher

**CraftLauncher**, Electron ve Node.js teknolojileriyle geliştirilmiş, modern, hızlı ve özelleştirilebilir bir Minecraft başlatıcısıdır (Launcher). Vanilla Minecraft oynamak, projeleri yönetmek, hızlıca modlar arayıp kurmak ve farklı giriş (login) yöntemleriyle kolayca oyuna bağlanmak için tasarlanmıştır.

# Sosyal Ağlar

- **İnstagram :: https://www.instagram.com/sinanmehmet0/
- **Website :: https://sinawer.com.tr/
- **Discord :: Sunucu Bakımda


## 🌟 Özellikler

- **Çoklu Giriş Desteği:** 
  - **Microsoft Girişi (Premium):** Microsoft hesabınızla güvenli bir şekilde giriş yapın.
  - **Ely.by Girişi:** Ely.by hesaplarınızla bağlanarak ücretsiz skin desteğinden faydalanın.
  - **Çevrimdışı (Offline) Giriş:** Sadece bir kullanıcı adı belirterek hızlıca oyuna girin. Ücretsizdir ancak premium sunuculara girmez.
- **Profil Yönetimi:** Farklı Minecraft sürümleri (örn. 1.21.4, 1.20.1 vb.) ve farklı Loader'lar (Vanilla, Fabric, Forge, Quilt, NeoForge) için ayrı profiller oluşturun. İhtiyacınız olmayan profilleri ve dosyalarını "Sil" butonu ile tek tıkla temizleyin.
- **Mod & Modpack Keşfi (Modrinth):** 
  - **Modlar:** Binlerce modu arayın, loader ve sürüm filtreleriyle size uygun olanı bulun ve seçili profilinize anında kurun.
  - **Modpack'ler:** Hazır mod paketlerini keşfedin, detaylarını inceleyin ve `.mrpack` dosyalarını doğrudan indirin.
- **Dinamik Arayüz & Temalar:** Klasik Orman, Nether Kalesi, Derin Karanlık, Okyanus ve Kumsal gibi farklı biyom temaları arasında geçiş yaparak arayüzünüzü dilediğiniz gibi kişiselleştirin.
- **Discord Rich Presence (RPC):** O an hangi profille ve hangi sürümde Minecraft oynadığınızı, Discord durumunuzda gerçek zamanlı olarak ve havalı ikonlarla çevrenize sergileyin.
- **Haberler & Güncellemeler:** Son yapılan değişiklikleri ve Launcher duyurularını doğrudan ana ekrandan takip edin.
- **Gelişmiş Ayarlar:** Özel Java yolunu belirleme imkanı ve oyun başladıktan sonra başlatıcının kapanıp kapanmaması gibi teknik ayarlara erişim. RAM ayırtma (slider ile 1GB ile 16GB arası) gibi performans optimizasyonları.

## 🚀 Teknolojiler & Altyapı

Bu proje modern masaüstü uygulama standartlarına göre inşa edilmiştir:

- **Electron:** Çapraz platform masaüstü uygulama altyapısı.
- **Node.js**: İşletim sistemi ile dosya alışverişi ve yerel entegrasyonlar.
- **minecraft-launcher-core:** Minecraft'ın indirme ve başlatma süreçleri (Vanilla ve modlu sürümler).
- **msmc (Microsoft Server Management Core):** Microsoft Xbox Live tabanlı Premium hesap yetkilendirmeleri.
- **Axios:** REST API'lere yapılan HTTP istekleri (Ely.by login, Modrinth vb.).
- **electron-store:** Hesap bilgilerinin ve kullanıcı ayarlarının lokalde güvenle saklanması.
- **@xhayper/discord-rpc:** Discord zengin durum (Rich Presence) entegrasyonu.

## 📦 Kurulum ve Geliştirme

Geliştirici ortamında projeyi test etmek veya katkıda bulunmak için sisteminizde **Node.js** yüklü olmalıdır.

1. Depoyu bilgisayarınıza klonlayın:
   ```bash
   git clone https://github.com/Sinawer/Craftlauncher.git
   cd craftlauncher
   ```
2. Gerekli kütüphane ve paketleri indirin:
   ```bash
   npm install
   ```
3. Uygulamayı Electron üzerinden başlatın:
   ```bash
   npm start
   ```

> **Dosya Konumları:** Cihazınızda Minecraft dosyaları Electron'un belirlediği `userData` dizininde (`%APPDATA%/craftlauncher/minecraft` vb.) depolanır. Modlu veya Vanilla default klasörlere **Oyna > Klasör** bölümünden doğrudan launcher içinden erişebilirsiniz.

## 🎮 Kısaca Kullanımı

1. **Hesap Ekleme:** Sol menüden "Hesap" sekmesine gidin. Offline, Microsoft veya Ely.by sekmelerinden birini seçip bilgilerinizi girerek oturum açın.
2. **Profil Hazırlama:** "Oyna" sekmesine gelin ve sağ üstten "Yeni" butonuna tıklayın. Açılan pencerede yeni profil isminizi (Örn: Survival 1.21), oyun sürümünü ve Loader altyapısını (Vanilla, Fabric vb.) seçip kaydedin.
3. **Profil Yönetimi:** Mevcut bir profili silmek isterseniz, yanındaki **"Sil"** butonuna basarak profili ve ona ait tüm dosyaları kalıcı olarak kaldırabilirsiniz.
4. **Mod & Modpack Kurulumu:** "Modlar" sekmesini ziyaret edin. 
   - **Modlar** sekmesinden tekil modları arayıp istediğiniz profile kurun.
   - **Modpack'ler** sekmesinden hazır paketleri keşfedip detaylarını inceleyerek indirin.
5. **RAM Düzenleme:** Seçili profilinizin detay ekranında beliren RAM kaydırıcısı ile tahsis etmek istediğiniz bellek(GB) miktarını belirleyin.
6. **Oyuna Giriş:** "Oyna" sekmesindeki "Oyunu Başlat" butonu ile maceraya atılın. İndirme işlemi bitiminde oyun otomatik açılacaktır!

## 📄 Lisans

Bu proje **MIT** Lisansı altında açık kaynak olarak dağıtılmaktadır. Daha fazla detay için `package.json` yapısına veya projedeki varsa lisans bilgisine göz atabilirsiniz.

---
*Geliştirici: Sinawer*
