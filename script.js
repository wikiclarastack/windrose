const SUPABASE_URL = "https://ltgxlyrvzonudpkffepv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0Z3hseXJ2em9udWRwa2ZmZXB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTIxMDksImV4cCI6MjA4OTc4ODEwOX0.KsgdcMA8u5j9TBh0pqk9k4rXLXIjX5h38VTR8DZ2DLs";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const OWNER_ID = "1419845373534670848";
const LEADER_DEV_ID = "1078454283038642226";
let currentUser = null;

// --- LÓGICA DE LOGIN (SÓ RODA NA INDEX) ---
const loginBtn = document.getElementById('login-btn');
if (loginBtn) {
    loginBtn.onclick = async () => {
        const { error } = await _supabase.auth.signInWithOAuth({
            provider: 'discord',
            options: {
                scopes: 'identify guilds guilds.members.read',
                redirectTo: 'https://devwindrosestudios.vercel.app/dashboard.html'
            }
        });
        if (error) alert("Erro: " + error.message);
    };
}

// --- FUNÇÕES GERAIS (SÓ RODA NO DASHBOARD) ---
function switchTab(tabId, el) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
    const target = document.getElementById(tabId);
    if(target) target.classList.add('active');
    if(el) el.classList.add('active');
}

async function loadAll() {
    const { data: invs } = await _supabase.from('investments').select('*').order('date', {ascending: false});
    const tableBody = document.getElementById('table-body');
    const totalRobux = document.getElementById('total-robux');

    if (invs && tableBody) {
        let total = 0;
        tableBody.innerHTML = invs.map(i => {
            total += parseInt(i.value || 0);
            return `<tr><td>${i.name}</td><td style="color:#00b2ff">R$ ${i.value}</td><td>${new Date(i.date).toLocaleDateString()}</td></tr>`;
        }).join('');
        if(totalRobux) totalRobux.innerText = total.toLocaleString();
    }
}

// --- VERIFICAÇÃO AO CARREGAR ---
window.onload = async () => {
    const { data: { session } } = await _supabase.auth.getSession();
    
    // Se estiver no dashboard e não tiver sessão, expulsa
    if(!session && window.location.pathname.includes('dashboard')) {
        window.location.href = 'index.html';
        return;
    }

    if(session) {
        const meta = session.user.user_metadata;
        currentUser = { id: meta.provider_id, name: meta.full_name, avatar: meta.avatar_url };
        
        // Só tenta preencher campos se eles existirem (evita o erro do console)
        const userDisplay = document.getElementById('user-display-name');
        if(userDisplay) userDisplay.innerText = currentUser.name.split(' ')[0];

        if(window.location.pathname.includes('dashboard')) {
            loadAll();
            // Mostrar Admin apenas se tiver permissão
            const adminNav = document.getElementById('admin-nav');
            if(adminNav && (currentUser.id === OWNER_ID || currentUser.id === LEADER_DEV_ID)) {
                adminNav.style.display = 'flex';
            }
        }
    }
};

// Logout seguro
const logoutBtn = document.getElementById('logout-btn');
if(logoutBtn) {
    logoutBtn.onclick = async () => {
        await _supabase.auth.signOut();
        window.location.href = 'index.html';
    };
}
