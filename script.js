const SUPABASE_URL = "https://ltgxlyrvzonudpkffepv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0Z3hseXJ2em9udWRwa2ZmZXB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTIxMDksImV4cCI6MjA4OTc4ODEwOX0.KsgdcMA8u5j9TBh0pqk9k4rXLXIjX5h38VTR8DZ2DLs";
const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1485095056347103283/ZV7F4kjBoH8Pj2k6OECL8TnmBKggSYe5cIth-I-30rmjjEYw4QVoYO9GSkCpU2B5Ad__";

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const ROLES = { OWNER: "1419845373534670848", LEADER: "1457134406555668500", MODELER: "1457134482304925747", SCRIPTER: "1457134516601622782" };
let currentUser = null;

// Notificações
function toast(msg) {
    const host = document.getElementById('notification-host');
    if(!host) return;
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerText = msg;
    host.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}

// TRAVA DE CLIQUE E INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', async () => {
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.onclick = async () => {
            console.log("Iniciando OAuth Discord...");
            const { error } = await _supabase.auth.signInWithOAuth({
                provider: 'discord',
                options: {
                    scopes: 'identify guilds guilds.members.read',
                    redirectTo: window.location.origin + '/dashboard.html'
                }
            });
            if (error) toast("Erro: " + error.message);
        };
    }

    // Carregamento de Sessão
    const { data: { session } } = await _supabase.auth.getSession();
    if (session) {
        await initDashboard(session);
    } else if (window.location.pathname.includes('dashboard')) {
        window.location.href = 'index.html';
    }
});

async function initDashboard(session) {
    const meta = session.user.user_metadata;
    
    // Detecção de cargo via API Discord
    const res = await fetch(`https://discord.com/api/users/@me/guilds/1457130952655503536/member`, { 
        headers: { Authorization: `Bearer ${session.provider_token}` } 
    });
    const member = await res.json();
    
    let role = "Membro";
    if (member.roles?.includes(ROLES.LEADER)) role = "Leader Developer";
    else if (member.roles?.includes(ROLES.SCRIPTER)) role = "Scripter";
    else if (member.roles?.includes(ROLES.MODELER)) role = "Modelador";
    if (meta.provider_id === ROLES.OWNER) role = "Dono";

    currentUser = { id: meta.provider_id, name: meta.full_name, avatar: meta.avatar_url, role: role };

    if (window.location.pathname.includes('dashboard')) {
        document.getElementById('user-avatar-side').src = currentUser.avatar;
        document.getElementById('user-name-side').innerText = currentUser.name.split(' ')[0];
        document.getElementById('user-role-tag').innerText = currentUser.role;
        document.getElementById('my-profile-trigger').onclick = () => viewProfile(currentUser.id);
        
        if (currentUser.id === ROLES.OWNER || role === "Leader Developer") {
            document.getElementById('admin-nav').style.display = 'flex';
        }

        loadData();
        updateOnline();
        setInterval(updateOnline, 30000);
        setInterval(loadOnline, 10000);

        const { data: chats } = await _supabase.from('messages').select('*').order('created_at', {ascending: true}).limit(50);
        if (chats) chats.forEach(m => displayMessage(m));
    }
}

// Funções de Interface
function switchTab(t, el) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
    document.getElementById(t).classList.add('active');
    el.classList.add('active');
}

async function viewProfile(id) {
    let { data } = await _supabase.from('profiles').select('*').eq('id', id).maybeSingle();
    if (!data && id === currentUser.id) {
        data = { id: id, username: currentUser.name, avatar_url: currentUser.avatar, bio: "Dev Wind Rose", specialties: "Nenhuma" };
        await _supabase.from('profiles').upsert(data);
    } else if (!data) return toast("Perfil não encontrado.");

    document.getElementById('profile-modal').style.display = 'flex';
    document.getElementById('p-name-ui').innerText = data.username;
    document.getElementById('p-avatar-ui').src = data.avatar_url || 'https://cdn.discordapp.com/embed/avatars/0.png';
    document.getElementById('p-banner-ui').style.backgroundImage = `url(${data.banner_url || ''})`;
    document.getElementById('p-bio-ui').innerText = data.bio;
    document.getElementById('p-spec-ui').innerText = data.specialties;
    document.getElementById('edit-profile-btn').style.display = (currentUser.id === id) ? 'block' : 'none';
    toggleEditProfile(false);
}

function toggleEditProfile(s) {
    document.getElementById('p-view-mode').style.display = s ? 'none' : 'block';
    document.getElementById('p-edit-mode').style.display = s ? 'block' : 'none';
}

async function saveProfileData() {
    await _supabase.from('profiles').update({
        avatar_url: document.getElementById('edit-avatar').value,
        banner_url: document.getElementById('edit-banner').value,
        bio: document.getElementById('edit-bio').value,
        specialties: document.getElementById('edit-spec').value
    }).eq('id', currentUser.id);
    location.reload();
}

function closeProfile() { document.getElementById('profile-modal').style.display = 'none'; }

// Chat
async function sendMessage() {
    const i = document.getElementById('chat-input');
    if(!i.value) return;
    await _supabase.from('messages').insert([{ user_id: currentUser.id, username: currentUser.name, avatar_url: currentUser.avatar, content: i.value }]);
    i.value = "";
}

function displayMessage(m) {
    const b = document.getElementById('chat-box');
    if(!b) return;
    b.innerHTML += `<div class="user-item">
        <img src="${m.avatar_url}" onclick="viewProfile('${m.user_id}')" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
        <div><strong style="color:#00b2ff; cursor:pointer;" onclick="viewProfile('${m.user_id}')">${m.username}</strong><p style="font-size:14px; opacity:0.8;">${m.content}</p></div>
    </div>`;
    b.scrollTop = b.scrollHeight;
}

// Online
async function updateOnline() { if(currentUser) await _supabase.from('profiles').upsert({ id: currentUser.id, username: currentUser.name, avatar_url: currentUser.avatar, last_seen: new Date().toISOString() }); }
async function loadOnline() {
    const { data } = await _supabase.from('profiles').select('*').gt('last_seen', new Date(Date.now() - 300000).toISOString());
    if(data) {
        document.getElementById('online-count').innerText = data.length;
        document.getElementById('online-count-main').innerText = data.length;
        document.getElementById('user-list').innerHTML = data.map(u => `<div class="user-item" onclick="viewProfile('${u.id}')"><img src="${u.avatar_url}">${u.username}</div>`).join('');
    }
}

// Carregamento Geral
async function loadData() {
    const { data: invs } = await _supabase.from('investments').select('*').order('date', {ascending: false});
    const { data: patches } = await _supabase.from('updates').select('*').order('date', {ascending: false});
    const { data: alerts } = await _supabase.from('dashboard_alerts').select('*').order('created_at', {ascending: false}).limit(1);
    
    if(invs) {
        let t = 0;
        document.getElementById('table-body').innerHTML = invs.map(i => { t += parseInt(i.value); return `<tr><td>${i.name}</td><td>R$ ${i.value}</td><td>${new Date(i.date).toLocaleDateString()}</td></tr>` }).join('');
        document.getElementById('total-robux').innerText = t.toLocaleString();
    }
    if(patches) {
        if(patches.length > 0) document.getElementById('current-version').innerText = patches[0].title;
        document.getElementById('patches-container').innerHTML = patches.map(p => `<div class="card" style="margin-bottom:10px;"><h3>${p.title}</h3><p style="opacity:0.6">${p.description}</p></div>`).join('');
    }
    if(alerts && alerts.length > 0) {
        document.getElementById('top-alert-banner').style.display = 'block';
        document.getElementById('alert-text').innerText = alerts[0].content;
        document.getElementById('alert-author').innerText = "Por: " + alerts[0].author;
    }
}

async function addRobux() { await _supabase.from('investments').insert([{ name: document.getElementById('inv-name').value, value: document.getElementById('inv-amt').value, date: new Date() }]); location.reload(); }
async function addPatch() { await _supabase.from('updates').insert([{ title: document.getElementById('p-title').value, description: document.getElementById('p-desc').value, date: new Date() }]); location.reload(); }
async function createDashAlert() { await _supabase.from('dashboard_alerts').insert([{ content: document.getElementById('dash-alert-input').value, author: currentUser.name }]); location.reload(); }

_supabase.channel('room1').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, p => displayMessage(p.new)).subscribe();

const lout = document.getElementById('logout-btn');
if(lout) lout.onclick = async () => { await _supabase.auth.signOut(); window.location.href = 'index.html'; };
