const SUPABASE_URL = "https://ltgxlyrvzonudpkffepv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0Z3hseXJ2em9udWRwa2ZmZXB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTIxMDksImV4cCI6MjA4OTc4ODEwOX0.KsgdcMA8u5j9TBh0pqk9k4rXLXIjX5h38VTR8DZ2DLs";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// IDs DE PERMISSÃO
const OWNER_ID = "1419845373534670848";
const LEADER_DEV_ID = "1078454283038642226";

let currentUser = null;

// --- NAVEGAÇÃO ---
function switchTab(tabId, el) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    el.classList.add('active');
}

// --- CONTROLE DE ACESSO ---
function checkIsAdmin(id) {
    return id === OWNER_ID || id === LEADER_DEV_ID;
}

// --- CHAT E MENSAGENS ---
async function sendMessage(isAnnouncement = false) {
    const input = document.getElementById('chat-input');
    if(!input.value) return;

    await _supabase.from('messages').insert([{
        user_id: currentUser.id,
        username: currentUser.name,
        avatar_url: currentUser.avatar,
        content: input.value,
        is_announcement: isAnnouncement
    }]);
    input.value = "";
}

function displayMessage(msg) {
    const box = document.getElementById('chat-box');
    const isAdm = checkIsAdmin(msg.user_id);
    const isAnnounce = msg.is_announcement ? "border:1px solid #f59e0b; background:rgba(245,158,11,0.05)" : "";
    
    const html = `
        <div class="animate" style="display:flex; gap:12px; padding:12px; border-radius:12px; background:rgba(255,255,255,0.02); ${isAnnounce}">
            <img src="${msg.avatar_url}" style="width:40px; height:40px; border-radius:10px; border:2px solid ${isAdm ? 'var(--accent)' : '#222'}">
            <div style="flex:1">
                <div style="display:flex; justify-content:space-between;">
                    <strong style="color:${isAdm ? 'var(--accent)' : '#fff'}; font-size:13px;">${msg.username} ${isAdm ? '⭐' : ''}</strong>
                    ${checkIsAdmin(currentUser.id) ? `<span onclick="deleteMsg('${msg.id}')" style="color:#ff4b4b; cursor:pointer; font-size:18px;">&times;</span>` : ''}
                </div>
                <p style="font-size:14px; margin-top:4px; line-height:1.4;">${msg.content}</p>
            </div>
        </div>
    `;
    box.innerHTML += html;
    box.scrollTop = box.scrollHeight;
}

async function deleteMsg(id) {
    if(confirm("Deseja apagar esta mensagem?")) {
        await _supabase.from('messages').delete().eq('id', id);
        location.reload();
    }
}

// --- GESTÃO DE DADOS ---
async function addRobux() {
    const name = document.getElementById('inv-name').value;
    const value = document.getElementById('inv-amt').value;
    if(!name || !value) return alert("Preencha os campos!");

    await _supabase.from('investments').insert([{ name, value, date: new Date() }]);
    location.reload();
}

async function addPatch() {
    const title = document.getElementById('p-title').value;
    const description = document.getElementById('p-desc').value;
    if(!title || !description) return alert("Preencha os campos!");

    await _supabase.from('updates').insert([{ title, description, date: new Date() }]);
    location.reload();
}

async function createDashAlert() {
    const content = document.getElementById('dash-alert-input').value;
    await _supabase.from('dashboard_alerts').insert([{
        content,
        author: currentUser.name
    }]);
    alert("Alerta Global Enviado!");
    location.reload();
}

// --- CARREGAMENTO INICIAL ---
async function loadAll() {
    // Carregar Investimentos
    const { data: invs } = await _supabase.from('investments').select('*').order('date', {ascending: false});
    if(invs) {
        let total = 0;
        document.getElementById('table-body').innerHTML = invs.map(i => {
            total += parseInt(i.value);
            return `<tr><td>${i.name}</td><td style="color:var(--accent)">R$ ${parseInt(i.value).toLocaleString()}</td><td>${new Date(i.date).toLocaleDateString()}</td></tr>`;
        }).join('');
        document.getElementById('total-robux').innerText = total.toLocaleString();
    }

    // Carregar Chat
    const { data: chats } = await _supabase.from('messages').select('*').order('created_at', {ascending: true}).limit(50);
    if(chats) chats.forEach(m => displayMessage(m));

    // Carregar Avisos
    const { data: alerts } = await _supabase.from('dashboard_alerts').select('*').order('created_at', {ascending: false}).limit(1);
    if(alerts && alerts.length > 0) {
        document.getElementById('top-alert-banner').style.display = 'block';
        document.getElementById('alert-text').innerText = alerts[0].content;
        document.getElementById('alert-author').innerText = "Publicado por: " + alerts[0].author;
    }
}

// Realtime para Chat
_supabase.channel('room1').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
    displayMessage(payload.new);
}).subscribe();

// Autenticação
window.onload = async () => {
    const { data: { session } } = await _supabase.auth.getSession();
    if(!session && window.location.pathname.includes('dashboard')) {
        window.location.href = 'index.html';
    } else if(session) {
        const meta = session.user.user_metadata;
        currentUser = {
            id: meta.provider_id,
            name: meta.full_name,
            avatar: meta.avatar_url
        };
        
        document.getElementById('user-display-name').innerText = currentUser.name.split(' ')[0];
        
        if(checkIsAdmin(currentUser.id)) {
            document.getElementById('admin-nav').style.display = 'flex';
            document.getElementById('btn-chat-announcement').style.display = 'block';
        }
        loadAll();
    }
};

document.getElementById('logout-btn').onclick = async () => {
    await _supabase.auth.signOut();
    window.location.href = 'index.html';
};
