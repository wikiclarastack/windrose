// script.js
const SUPABASE_URL = "https://ltgxlyrvzonudpkffepv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0Z3hseXJ2em9udWRwa2ZmZXB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTIxMDksImV4cCI6MjA4OTc4ODEwOX0.KsgdcMA8u5j9TBh0pqk9k4rXLXIjX5h38VTR8DZ2DLs";

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 1. LOGIN DISCORD
const loginBtn = document.getElementById('login-btn');
if (loginBtn) {
    loginBtn.onclick = async () => {
        await _supabase.auth.signInWithOAuth({
            provider: 'discord',
            options: {
                scopes: 'identify guilds guilds.members.read',
                redirectTo: 'https://devwindrosestudios.vercel.app/dashboard.html'
            }
        });
    };
}

// 2. NAVEGAÇÃO ENTRE ABAS
function switchTab(tabId, el) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    el.classList.add('active');
}

// 3. CARREGAR DADOS DO SUPABASE
async function loadData() {
    const { data: invs } = await _supabase.from('investments').select('*').order('date', {ascending: false});
    const { data: updates } = await _supabase.from('updates').select('*').order('date', {ascending: false});

    // Renderizar Investimentos
    if (invs) {
        let total = 0;
        document.getElementById('table-body').innerHTML = invs.map(i => {
            total += parseInt(i.value || 0);
            return `<tr><td>${i.name}</td><td style="color:#00b2ff">R$ ${i.value}</td><td>${new Date(i.date).toLocaleDateString()}</td></tr>`;
        }).join('');
        document.getElementById('total-robux').innerText = total.toLocaleString();
    }

    // Renderizar Patches
    if (updates) {
        if(updates.length > 0) document.getElementById('current-v').innerText = updates[0].title;
        document.getElementById('patches-container').innerHTML = updates.map(u => `
            <div class="card" style="margin-bottom:15px;">
                <h3 style="color:#00b2ff">${u.title}</h3>
                <p style="margin-top:10px; color:#888;">${u.description}</p>
            </div>
        `).join('');
    }
}

// 4. FUNÇÕES DE ADIÇÃO
async function addRobux() {
    const name = document.getElementById('inv-name').value;
    const value = document.getElementById('inv-amt').value;
    if(!name || !value) return alert("Preencha os campos!");

    const { error } = await _supabase.from('investments').insert([{ name, value, date: new Date() }]);
    if(!error) { 
        alert("Sucesso!");
        location.reload(); 
    }
}

async function addPatch() {
    const title = document.getElementById('p-title').value;
    const description = document.getElementById('p-desc').value;
    if(!title || !description) return alert("Preencha os campos!");

    const { error } = await _supabase.from('updates').insert([{ title, description, date: new Date() }]);
    if(!error) { 
        alert("Publicado!");
        location.reload(); 
    }
}

// 5. LOGOUT E SESSÃO
document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await _supabase.auth.signOut();
    window.location.href = 'index.html';
});

// AUTO-EXECUTA NO DASHBOARD
if (window.location.pathname.includes('dashboard.html')) {
    _supabase.auth.getSession().then(({data}) => {
        if(!data.session) window.location.href = 'index.html';
        else {
            document.getElementById('user-name').innerText = data.session.user.user_metadata.full_name.split(' ')[0];
            loadData();
        }
    });
}
