// Configurações do Wind Rose Studios
const SUPABASE_URL = "https://ltgxlyrvzonudpkffepv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0Z3hseXJ2em9udWRwa2ZmZXB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTIxMDksImV4cCI6MjA4OTc4ODEwOX0.KsgdcMA8u5j9TBh0pqk9k4rXLXIjX5h38VTR8DZ2DLs";

const SERVER_ID = "1455264719714783254"; // ID do Servidor
const ROLE_ID = "1455265266006102220";   // ID do Cargo de Dev

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- 1. LÓGICA DE LOGIN (PÁGINA INICIAL) ---
const loginBtn = document.getElementById('login-btn');

if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        const { error } = await _supabase.auth.signInWithOAuth({
            provider: 'discord',
            options: {
                // Solicita permissão para ver servidores e membros
                scopes: 'identify guilds guilds.members.read',
                redirectTo: 'https://devwindrosestudios.vercel.app/dashboard.html'
            }
        });
        if (error) alert("Erro no login: " + error.message);
    });
}

// --- 2. VERIFICAÇÃO DE CARGO NO DISCORD ---
async function validarAcessoPeloDiscord(session) {
    const accessToken = session.provider_token;

    try {
        // Consulta se o usuário é membro do servidor específico
        const response = await fetch(`https://discord.com/api/users/@me/guilds/${SERVER_ID}/member`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            console.error("Usuário não está no servidor ou erro na API");
            return false;
        }

        const member = await response.json();
        
        // Verifica se o ID do cargo solicitado está na lista de cargos do usuário
        return member.roles.includes(ROLE_ID);
    } catch (err) {
        console.error("Erro ao validar cargo:", err);
        return false;
    }
}

// --- 3. CONTROLE DE ACESSO DO DASHBOARD ---
async function checkAuth() {
    const { data: { session } } = await _supabase.auth.getSession();

    // Se não houver sessão, volta pro login
    if (!session) {
        window.location.href = 'index.html';
        return;
    }

    // Valida o cargo em tempo real no Discord
    const autorizado = await validarAcessoPeloDiscord(session);

    if (!autorizado) {
        alert("ACESSO NEGADO: Você precisa ter o cargo de desenvolvedor no servidor oficial.");
        await _supabase.auth.signOut();
        window.location.href = 'index.html?error=sem_cargo';
        return;
    }

    // Se autorizado, carrega a interface
    console.log("Acesso autorizado para:", session.user.user_metadata.full_name);
    renderDashboard(session.user.user_metadata);
}

// --- 4. RENDERIZAÇÃO DA INTERFACE ---
function renderDashboard(user) {
    const nameEl = document.getElementById('user-name');
    const avatarEl = document.getElementById('user-avatar');

    if (nameEl) nameEl.innerText = user.full_name || user.name;
    if (avatarEl) avatarEl.src = user.avatar_url;

    // Carregar dados adicionais do banco (Investimentos e Patch Notes)
    loadData();
}

async function loadData() {
    // Exemplo de busca de atualizações
    const { data: updates } = await _supabase
        .from('updates')
        .select('*')
        .order('date', { ascending: false });

    const list = document.getElementById('updates-list');
    if (list && updates) {
        list.innerHTML = updates.map(up => `
            <tr>
                <td>${up.title}</td>
                <td>${new Date(up.date).toLocaleDateString()}</td>
                <td>${up.developer || 'Equipe'}</td>
                <td><span class="status-badge">Live</span></td>
            </tr>
        `).join('');
    }
}

// --- 5. LOGOUT ---
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await _supabase.auth.signOut();
        window.location.href = 'index.html';
    });
}

// Executa a verificação se estiver na página do Dashboard
if (window.location.pathname.includes('dashboard.html')) {
    checkAuth();
}

// ... (mantenha o início do script anterior com as chaves do Supabase)

// Alternar Abas (Navegação)
function switchTab(tabId) {
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

// Salvar Investimento Real
async function addInvestment() {
    const name = document.getElementById('inv-name').value;
    const value = document.getElementById('inv-value').value;

    const { error } = await _supabase.from('investments').insert([{ name, value, date: new Date() }]);
    
    if (error) alert("Erro ao salvar");
    else {
        alert("Salvo com sucesso!");
        loadInvestments();
    }
}

// Carregar Dados Reais do Banco
async function loadInvestments() {
    const { data } = await _supabase.from('investments').select('*');
    const list = document.getElementById('list-inv');
    let total = 0;

    list.innerHTML = data.map(i => {
        total += parseFloat(i.value);
        return `<tr><td>${i.name}</td><td>R$ ${i.value}</td><td>${new Date(i.date).toLocaleDateString()}</td></tr>`;
    }).join('');

    document.getElementById('total-val').innerText = `R$ ${total.toLocaleString()}`;
}

// Chamar ao carregar o dashboard
async function checkAuth() {
    // ... (mantenha a lógica de verificação de cargo do Discord que fizemos)
    
    // Se passar na verificação:
    loadInvestments();
    loadUpdates();
    document.getElementById('user-role-display').innerText = "Desenvolvedor";
}
