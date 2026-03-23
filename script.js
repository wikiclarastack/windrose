const _supabase = supabase.createClient("https://ltgxlyrvzonudpkffepv.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0Z3hseXJ2em9udWRwa2ZmZXB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTIxMDksImV4cCI6MjA4OTc4ODEwOX0.KsgdcMA8u5j9TBh0pqk9k4rXLXIjX5h38VTR8DZ2DLs");

// 1. Troca de Abas
function switchTab(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    event.currentTarget.classList.add('active');
}

// 2. Salvar Dados
async function saveInvestment() {
    const name = document.getElementById('inv-name').value;
    const value = document.getElementById('inv-amt').value;
    if(!name || !value) return alert("Preencha tudo!");

    await _supabase.from('investments').insert([{ name, value, date: new Date() }]);
    loadData();
}

// 3. Carregar tudo do Banco
async function loadData() {
    const { data: invs } = await _supabase.from('investments').select('*').order('date', {ascending: false});
    const { data: patches } = await _supabase.from('updates').select('*').order('date', {ascending: false});

    if(invs) {
        let total = 0;
        document.getElementById('table-inv').innerHTML = invs.map(i => {
            total += parseInt(i.value);
            return `<tr><td>${i.name}</td><td style="color:#00b2ff">R$ ${i.value}</td><td>${new Date(i.date).toLocaleDateString()}</td></tr>`;
        }).join('');
        document.getElementById('total-robux').innerText = total.toLocaleString();
    }

    if(patches) {
        document.getElementById('total-updates').innerText = patches.length;
        document.getElementById('list-patches').innerHTML = patches.map(p => `
            <div class="card" style="margin-bottom:10px">
                <h3>${p.title}</h3><p style="color:#888">${p.description}</p>
            </div>
        `).join('');
    }
}

// 4. Verificar Sessão ao carregar
window.onload = () => {
    if(window.location.pathname.includes('dashboard.html')) {
        loadData();
    }
};
