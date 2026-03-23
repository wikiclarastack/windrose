const SUPABASE_URL = "https://ltgxlyrvzonudpkffepv.supabase.co";
const SUPABASE_KEY = "SUA_KEY_AQUI"; // Use a que você me passou
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Alternar Abas sem quebrar o layout
function showTab(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    
    document.getElementById(id).classList.add('active');
    event.currentTarget.classList.add('active');
}

// Salvar Investimentos (ROBUX)
async function saveInvestment() {
    const name = document.getElementById('inv-name').value;
    const amount = document.getElementById('inv-amt').value;

    if(!name || !amount) return alert("Preencha tudo!");

    const { error } = await _supabase.from('investments').insert([{ name, value: amount, date: new Date() }]);
    
    if(!error) {
        document.getElementById('inv-name').value = "";
        document.getElementById('inv-amt').value = "";
        loadData();
    }
}

// Carregar Dados
async function loadData() {
    // Carregar Investimentos
    const { data: invs } = await _supabase.from('investments').select('*').order('date', {ascending: false});
    const table = document.getElementById('table-inv');
    let total = 0;

    if(invs) {
        table.innerHTML = invs.map(i => {
            total += parseInt(i.value);
            return `<tr><td>${i.name}</td><td style="color: #00b2ff">R$ ${parseInt(i.value).toLocaleString()}</td><td>${new Date(i.date).toLocaleDateString()}</td></tr>`;
        }).join('');
        document.getElementById('total-robux').innerText = total.toLocaleString();
    }

    // Carregar Patches
    const { data: patches } = await _supabase.from('updates').select('*').order('date', {ascending: false});
    if(patches) {
        document.getElementById('count-patches').innerText = patches.length;
        document.getElementById('patches-list').innerHTML = patches.map(p => `
            <div class="card" style="margin-bottom: 15px;">
                <h3 style="color: var(--accent)">${p.title}</h3>
                <p style="margin-top: 10px; color: var(--text-dim)">${p.description}</p>
                <small style="display:block; margin-top: 10px; opacity: 0.5;">${new Date(p.date).toLocaleDateString()}</small>
            </div>
        `).join('');
    }
}

// Logout
document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await _supabase.auth.signOut();
    window.location.href = 'index.html';
});

// Inicialização
if (window.location.pathname.includes('dashboard.html')) {
    loadData();
    // Pegar nome do usuário logado
    _supabase.auth.getSession().then(({data}) => {
        if(data.session) {
            document.getElementById('user-display').innerText = data.session.user.user_metadata.full_name;
        }
    });
}
