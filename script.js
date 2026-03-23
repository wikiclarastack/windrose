const SUPABASE_URL = "https://ltgxlyrvzonudpkffepv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0Z3hseXJ2em9udWRwa2ZmZXB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTIxMDksImV4cCI6MjA4OTc4ODEwOX0.KsgdcMA8u5j9TBh0pqk9k4rXLXIjX5h38VTR8DZ2DLs";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const OWNER_ID = "1419845373534670848";
const LEADER_DEV_ID = "1078454283038642226";
let currentUser = null;

// --- LOGIN (INDEX) ---
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

// --- NAVEGAÇÃO ---
function switchTab(tabId, el) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
    const target = document.getElementById(tabId);
    if(target) target.classList.add('active');
    if(el) el.classList.add('active');
}

// --- CHAT ---
async function sendMessage(isAnnouncement = false) {
    const input = document.getElementById('chat-input');
    if(!input || !input.value || !currentUser) return;

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
    if(!box) return;
    const isAdm = (msg.user_id === OWNER_ID || msg.user_id === LEADER_DEV_ID);
    const style = msg.is_announcement ? "border:1px solid #f59e0b; background:rgba(245,158,11,0.05)" : "";
    
    const html = `
        <div class="animate" style="display:flex; gap:12px; padding:12px; border-radius:12px; background:rgba(255,255,255,0.02); margin-bottom:10px; ${style}">
            <img src="${msg.avatar_url}" style="width:40px; height:40px; border-radius:10px; border:2px solid ${isAdm ? '#00b2ff' : '#222'}">
            <div style="flex:1">
                <div style="display:flex; justify-content:space-between;">
                    <strong style="color:${isAdm ? '#00b2ff' : '#fff'}; font-size:13px;">${msg.username} ${isAdm ? '⭐' : ''}</strong>
                    ${currentUser && (currentUser.id === OWNER_ID || currentUser.id === LEADER_DEV_ID) ? `<span onclick="deleteMsg('${msg.id}')" style="color:#ff4b4b; cursor:pointer;">&times;</span>` : ''}
                </div>
                <p style="font-size:14px; margin-top:4px;">${msg.content}</p>
            </div>
        </div>`;
    box.innerHTML += html;
    box.scrollTop = box.scrollHeight;
}

async function deleteMsg(id) {
    if(confirm("Apagar mensagem?")) {
        await _supabase.from('messages').delete().eq('id', id);
        location.reload();
    }
}

// --- BANCO DE DADOS (INVESTIMENTOS E PATCH) ---
async function addRobux() {
    const name = document.getElementById('inv-name').value;
    const value = document.getElementById('inv-amt').value;
    if(!name || !value) return alert("Preencha tudo!");
    await _supabase.from('investments').insert([{ name, value, date: new Date() }]);
    location.reload();
}

async function addPatch() {
    const title = document.getElementById('p-title').value;
    const desc = document.getElementById('p-desc').value;
    if(!title || !desc) return alert("Preencha tudo!");
    await _supabase.from('updates').insert([{ title, description: desc, date: new Date() }]);
    location.reload();
}

async function createDashAlert() {
    const content = document.getElementById('dash-alert-input').value;
    if(!content) return;
    await _supabase.from('dashboard_alerts').insert([{ content, author: currentUser.name }]);
    alert("Alerta Enviado!");
    location.reload();
}

// --- CARREGAMENTO ---
async function loadData() {
    const { data: invs } = await _supabase.from('investments').select('*').order('date', {ascending: false});
    const { data: updates } = await _supabase.from('updates').select('*').order('date', {ascending: false});
    const { data: alerts } = await _supabase.from('dashboard_alerts').select('*').order('created_at', {ascending: false}).limit(1);

    if(invs && document.getElementById('table-body')) {
        let total = 0;
        document.getElementById('table-body').innerHTML = invs.map(i => {
            total += parseInt(i.value || 0);
            return `<tr><td>${i.name}</td><td style="color:#00b2ff">R$ ${i.value}</td><td>${new Date(i.date).toLocaleDateString()}</td></tr>`;
        }).join('');
        document.getElementById('total-robux').innerText = total.toLocaleString();
    }

    if(updates && document.getElementById('patches-container')) {
        document.getElementById('patches-container').innerHTML = updates.map(u => `
            <div class="card" style="margin-bottom:15px;">
                <h3 style="color:#00b2ff">${u.title}</h3>
                <p style="color:#888; font-size:14px; margin-top:5px;">${u.description}</p>
            </div>`).join('');
    }

    if(alerts && alerts.length > 0 && document.getElementById('top-alert-banner')) {
        document.getElementById('top-alert-banner').style.display = 'block';
        document.getElementById('alert-text').innerText = alerts[0].content;
        document.getElementById('alert-author').innerText = "Por: " + alerts[0].author;
    }

    // Carregar histórico de chat
    const { data: chats } = await _supabase.from('messages').select('*').order('created_at', {ascending: true}).limit(50);
    if(chats) chats.forEach(m => displayMessage(m));
}

// Realtime
_supabase.channel('room1').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, p => displayMessage(p.new)).subscribe();

window.onload = async () => {
    const { data: { session } } = await _supabase.auth.getSession();
    if(session) {
        const meta = session.user.user_metadata;
        currentUser = { id: meta.provider_id, name: meta.full_name, avatar: meta.avatar_url };
        
        if(window.location.pathname.includes('dashboard')) {
            const userDisplay = document.getElementById('user-display-name');
            if(userDisplay) userDisplay.innerText = currentUser.name.split(' ')[0];
            
            const isAdmin = (currentUser.id === OWNER_ID || currentUser.id === LEADER_DEV_ID);
            if(isAdmin) {
                if(document.getElementById('admin-nav')) document.getElementById('admin-nav').style.display = 'flex';
                if(document.getElementById('btn-chat-announcement')) document.getElementById('btn-chat-announcement').style.display = 'block';
            }
            loadData();
        }
    } else if (window.location.pathname.includes('dashboard')) {
        window.location.href = 'index.html';
    }
};

const logoutBtn = document.getElementById('logout-btn');
if(logoutBtn) logoutBtn.onclick = async () => { await _supabase.auth.signOut(); window.location.href = 'index.html'; };
