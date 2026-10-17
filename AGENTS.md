<!-- project-managment:managed:start project=bdd7c139-2b81-4fc5-9e28-872878197658 -->

# Project Managment — proje köprüsü

Proje adı: EMA Studio
Proje kimliği: bdd7c139-2b81-4fc5-9e28-872878197658
Proje çalışma alanı: http://127.0.0.1:3210/projects/bdd7c139-2b81-4fc5-9e28-872878197658
GitHub deposu: https://github.com/serkan-uslu/ema-lightning-ui
Depo rolü: Ana depo
GitHub Projects panosu: https://github.com/users/serkan-uslu/projects/9
Yönetilen yapı sürümü: 19

Bu blok Project Managment tarafından yönetilir ve eşitlenir; içini düzenleme. Depoya özel talimatları bloğun dışına yaz. Proje tanımı, kararlar ve geliştirme geçmişi bu dosyada değil, Project Managment veritabanındadır.

## Her oturumda

1. Depoda AGENTS.md veya CLAUDE.md commit edilmemişse ve değişiklik yalnızca Project Managment bloğundaysa, işe başlamadan yalnızca bu iki dosyayı ayrı bir commit olarak al: git commit -m "Refresh Project Managment agent bridge" -- AGENTS.md CLAUDE.md. Bloğun dışında da değişiklik varsa dokunma ve kullanıcıya sor. Gönderme.
2. MCP ile get_project (projectId: bdd7c139-2b81-4fc5-9e28-872878197658) ve get_structure oku: kapsam, mevcut odak, kararlar, son günlük kayıtları ve ortak kurallar. get_structure içinde includeInAgents: true olan bölümler bağlayıcı çalışma kurallarıdır; diğerlerine gerektiğinde başvur.
3. list_tasks ile panonun kayıtlı halini oku. Güncel durum gerekiyorsa sync_project çağır ve yeniden oku.
4. Kullanıcının her geliştirme isteğini panoda bir göreve bağla. Aynı işi kapsayan görev yoksa get_structure içindeki taskRules kurallarına göre create_task ile aç; açıklamada şu bölümler olsun: Amaç, Kapsam, Kabul kriterleri, Doğrulama, Bağımlılıklar; kabul kriterleri zorunludur. İşe başlarken görevi panonun devam eden durumuna al. Görev açmak ve durumunu güncellemek için kalıcı yetkin var; yalnızca soru soran veya bilgi isteyen mesajlar için görev açma. Pano bağlı değilse görev açmadan bunu bildir.
5. Kayıtlı kapsamda kal ve ilerleme bildirmeden önce gerçek depoyu incele.
6. Anlamlı bir işten sonra append_development_log veya record_progress ile gerçekte yapılanı, çalıştırılan kontrolleri ve sonraki adımı yaz. Önemli kararlar için record_decision, mevcut odak için update_project_focus kullan. Kayıtları Türkçe yaz.
7. Görevi yalnızca kabul ölçütleri doğrulanınca Done yap; commit, push veya merge tek başına kanıt değildir. Sırları ve özel notları görevlere, commit'lere veya uzak depolara koyma.
8. Kullanıcı projects klasöründeki mevcut bir projeyi Project Managment'a almanı isterse get_structure içindeki "Mevcut Projeyi Project Managment'a Alma" bölümünü izle. Mevcut bir projede yeni çalışma alanı oluşturan provizyon adımını kullanma.

## Project Managment bağlantısı

Project Managment http://127.0.0.1:3210 adresinde çalışır durumda olmalıdır. Bu proje için kapsamlı MCP sunucusunun adı `project_management_bdd7c1392b814fc59e28872878197658`; genel sunucu `project_management` adını taşır ve her çağrıda `projectId: bdd7c139-2b81-4fc5-9e28-872878197658` ister. MCP araçları görünmüyorsa bunu kullanıcıya bildir; kurulum http://127.0.0.1:3210/settings sayfasında anlatılır. Masaüstü uygulamalarının ayar dosyalarını kendin düzenleme.

MCP kullanılamıyorsa yalnızca bu bilgisayardaki yerel API'yi kullan: GET http://127.0.0.1:3210/api/projects/bdd7c139-2b81-4fc5-9e28-872878197658, GET http://127.0.0.1:3210/api/structure?projectId=bdd7c139-2b81-4fc5-9e28-872878197658 ve gerektiğinde GET http://127.0.0.1:3210/api/projects/bdd7c139-2b81-4fc5-9e28-872878197658/board. İsteklere X-Structure-Client: codex başlığını ekle; bu başlık ve MCP istemci adı doğrulanmış kimlik değildir. Yazma isteklerinde Content-Type: application/json, Origin: http://127.0.0.1:3210, son okunan version ve işlem için benzersiz idempotencyKey gönder. Başarısız isteği başarılı gibi bildirme.
<!-- project-managment:managed:end -->
