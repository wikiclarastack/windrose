// Configuração do Supabase com as suas credenciais
const SUPABASE_URL = "https://ltgxlyrvzonudpkffepv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0Z3hseXJ2em9udWRwa2ZmZXB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTIxMDksImV4cCI6MjA4OTc4ODEwOX0.KsgdcMA8u5j9TBh0pqk9k4rXLXIjX5h38VTR8DZ2DLs";

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- LÓGICA DE LOGIN (INDEX.HTML) ---
const loginBtn = document.getElementById('login-btn');

if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        const { error } = await _supabase.auth.signInWithOAuth({
            provider: 'discord',
            options: {
                // Redireciona para o dashboard após o login
                redirectTo: 'https://devwindrosestudios.vercel.app/dashboard.html'
            }
        });
        if (error) console.error("Erro ao logar:", error.message);
    });
}

// --- LÓGICA DO DASHBOARD (DASHBOARD.HTML) ---
async function checkAuth() {
    // 1. Verifica se existe uma sessão ativa
    const { data: { session }, error: sessionError } = await _supabase.auth.getSession();

    if (sessionError || !session) {
        // Se não estiver logado, volta para a home
        window.location.href = 'index.html';
        return;
    }

    // 2. Pegar os dados do desenvolvedor na tabela 'developers'
    // Importante: O discord_id no Supabase Auth fica em session.user.user_metadata.provider_id
    const discordId = session.user.user_metadata.provider_id;

    const { data: devData, error: devError } = await _supabase
        .from('developers')
        .select('*')
        .eq('discord_id', discordId)
        .single();

    // 3. Bloqueio de Segurança: Se logou com Discord mas não está na tabela de devs
    if (devError || !devData) {
        alert("Acesso Negado: Você não está na lista de desenvolvedores autorizados.");
        await _supabase.auth.signOut();
        window.location.href = 'index.html?error=unauthorized';
        return;
    }

    // 4. Se chegou aqui, está autorizado! Vamos preencher a UI
    renderUserProfile(session.user.user_metadata, devData.role);
    loadInvestments();
    loadUpdates();
}

function renderUserProfile(metadata, role) {
    const nameElement = document.getElementById('user-name');
    const avatarElement = document.getElementById('user-avatar');

    if (nameElement) nameElement.innerText = metadata.full_name || metadata.name;
    if (avatarElement) avatarElement.src = metadata.avatar_url;
    
    // Opcional: Mostrar o cargo (role) que veio da tabela do banco
    console.log("Logado como:", role);
}

// --- BUSCAR DADOS DO BANCO ---

async function loadInvestments() {
    const { data, error } = await _supabase
        .from('investments')
        .select('*')
        .order('date', { ascending: false });

    if (!error && data) {
        // Aqui você pode criar uma função para injetar os dados no HTML da tabela
        console.log("Investimentos carregados:", data);
    }
}

async function loadUpdates() {
    const { data, error } = await _supabase
        .from('updates')
        .select('*')
        .order('date', { ascending: false });

    if (!error && data) {
        const list = document.getElementById('updates-list');
        if (list) {
            list.innerHTML = data.map(update => `
                <tr>
                    <td>${update.title}</td>
                    <td>${new Date(update.date).toLocaleDateString()}</td>
                    <td>Dev</td>
                    <td><span class="status-badge">Ativo</span></td>
                </tr>
            `).join('');
        }
    }
}

// --- BOTÃO DE SAIR ---
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await _supabase.auth.signOut();
        window.location.href = 'index.html';
    });
}

// Inicializar apenas se estivermos no Dashboard
if (window.location.pathname.includes('dashboard.html')) {
    checkAuth();
}
