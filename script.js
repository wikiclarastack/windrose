const SUPABASE_URL = "https://ltgxlyrvzonudpkffepv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0Z3hseXJ2em9udWRwa2ZmZXB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTIxMDksImV4cCI6MjA4OTc4ODEwOX0.KsgdcMA8u5j9TBh0pqk9k4rXLXIjX5h38VTR8DZ2DLs";
const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1485095056347103283/ZV7F4kjBoH8Pj2k6OECL8TnmBKggSYe5cIth-I-30rmjjEYw4QVoYO9GSkCpU2B5Ad__";

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ROLES = {
    OWNER: "1419845373534670848",
    LEADER: "1457134406555668500",
    MODELER: "1457134482304925747",
    SCRIPTER: "1457134516601622782"
};

let currentUser = null;

// NOTIFICAÇÕES
function toast(msg) {
    const host = document.getElementById('notification-host');
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerText = msg;
    host.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}

// LOGIN WEBHOOK
async function logToDiscord(user, role) {
    await fetch(DISCORD_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            embeds: [{
                title: "Login Detectado",
                description: `**Usuário:** ${user}\n**Cargo:** ${role}\n**Status:** Online no Painel`,
                color: 0x00b2ff,
                timestamp: new Date()
            }]
        })
    });
}

// LOGIN
const loginBtn = document.getElementById('login-btn');
if(loginBtn) {
    loginBtn.onclick = () => _supabase.auth.signInWithOAuth({ 
        provider: 'discord', 
        options: { scopes: 'identify guilds guilds.members.read', redirectTo: window.location.origin + '/dashboard.html' } 
    });
}

function switchTab(t, el) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
    document.getElementById(t).classList.add('active');
    el.classList.add('active');
}

// GESTÃO DE DADOS
async function addRobux() {
    const n = document.getElementById('inv-name').value;
    const v = document.getElementById('inv-amt').value;
    if(!n || !v) return toast("Preencha todos os campos!");
    await _supabase.from('investments').insert([{ name: n, value: v, date: new Date() }]);
    toast("Investimento registrado!");
    loadData();
}

async function addPatch() {
    const t = document.getElementById('p-title').value;
    const d = document.getElementById('p-desc').value;
    if(!t || !d) return toast("Preencha todos os campos!");
    await _supabase.from('updates').insert([{ title: t, description: d, date: new Date() }]);
    toast("Patch Notes publicado!");
    loadData();
}

async function createDashAlert() {
    const c = document.getElementById('dash-alert-input').value;
    await _supabase.from('dashboard_alerts').insert([{ content: c, author: currentUser.name }]);
    toast("Alerta Global enviado!");
}

// CHAT REALTIME
async function sendMessage(isAnn = false) {
    const i = document.getElementById('chat-input');
    if(!i.value) return;
    await _supabase.from('messages').insert([{
        user_id: currentUser.id, username: currentUser.name, avatar_url: currentUser.avatar, content: i.value, is_announcement: isAnn
    }]);
    i.value = "";
}

function displayMessage(m) {
    const box = document.getElementById('chat-box');
    if(!box) return;
    let text = m.content;
    if(currentUser && text.includes(`@${currentUser.name}`)) {
        text = `<span class="mention">@${currentUser.name}</span> ` + text.replace(`@${currentUser.name}`, "");
        if(m.user_id !== currentUser.id) document.getElementById('mention-sound').play();
    }
    const isSpecial = m.user_id === ROLES.OWNER || m.user_id === ROLES.LEADER;
    box.innerHTML += `
        <div class="user-item" style="background:rgba(255,255,255,0.02); margin-bottom:8px; border-left:3px solid ${m.is_announcement ? '#f59e0b' : 'transparent'}">
            <img src="${m.avatar_url}" onclick="viewProfile('${m.user_id}')" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
            <div style="flex:1">
                <div style="display:flex; justify-content:space-between;">
                    <strong style="color:${isSpecial ? '#00b2ff' : '#fff'}; font-size:12px;">${m.username}</strong>
                    ${(currentUser.id === ROLES.OWNER) ? `<span onclick="deleteMsg('${m.id}')" style="color:red; cursor:pointer;">×</span>` : ''}
                </div>
                <p style="font-size:14px; opacity:0.8;">${text}</p>
            </div>
        </div>`;
    box.scrollTop = box.scrollHeight;
}

// ONLINE SYSTEM
async function updateOnline() {
    if(!currentUser) return;
    await _supabase.from('profiles').upsert({ id: currentUser.id, username: currentUser.name, avatar_url: currentUser.avatar, last_seen: new Date().toISOString() });
}

async function loadOnline() {
    const { data } = await _supabase.from('profiles').select('*').gt('last_seen', new Date(Date.now() - 300000).toISOString());
    if(data) {
        document.getElementById('online-count').innerText = data.length;
        document.getElementById('online-count-main').innerText = data.length;
        document.getElementById('user-list').innerHTML = data.map(u => `
            <div class="user-item" onclick="viewProfile('${u.id}')">
                <img src="${u.avatar_url}">${u.username}
            </div>`).join('');
    }
}

// PERFIL
async function viewProfile(id) {
    const { data } = await _supabase.from('profiles').select('*').eq('id', id).single();
    if(data) {
        document.getElementById('profile-modal').style.display = 'flex';
        document.getElementById('p-name').innerText = data.username;
        document.getElementById('p-img').src = data.avatar_url;
        document.getElementById('p-bio').innerText = data.bio || "Sem bio";
        document.getElementById('p-spec').innerText = data.specialties || "Nenhuma";
        document.getElementById('edit-area').style.display = (currentUser.id === id) ? 'block' : 'none';
    }
}

async function saveProfile() {
    const b = document.getElementById('edit-bio').value;
    const s = document.getElementById('edit-spec').value;
    await _supabase.from('profiles').update({ bio: b, specialties: s }).eq('id', currentUser.id);
    toast("Perfil atualizado!");
    location.reload();
}

function closeProfile() { document.getElementById('profile-modal').style.display = 'none'; }

// LOAD DATA
async function loadData() {
    const { data: invs } = await _supabase.from('investments').select('*').order('date', {ascending: false});
    const { data: patches } = await _supabase.from('updates').select('*').order('date', {ascending: false});
    const { data: alerts } = await _supabase.from('dashboard_alerts').select('*').order('created_at', {ascending: false}).limit(1);
    
    if(invs) {
        let t = 0;
        document.getElementById('table-body').innerHTML = invs.map(i => { t += parseInt(i.value); return `<tr><td>${i.name}</td><td style="color:#00b2ff">R$ ${i.value}</td><td>${new Date(i.date).toLocaleDateString()}</td></tr>` }).join('');
        document.getElementById('total-robux').innerText = t.toLocaleString();
    }
    if(patches) {
        if(patches.length > 0) document.getElementById('current-version').innerText = patches[0].title;
        document.getElementById('patches-container').innerHTML = patches.map(p => `
            <div class="card" style="margin-bottom:15px;">
                <h3 style="color:#00b2ff">${p.title}</h3>
                <p style="opacity:0.6; margin-top:10px;">${p.description}</p>
            </div>`).join('');
    }
    if(alerts && alerts.length > 0) {
        document.getElementById('top-alert-banner').style.display = 'block';
        document.getElementById('alert-text').innerText = alerts[0].content;
        document.getElementById('alert-author').innerText = "Enviado por: " + alerts[0].author;
    }
}

_supabase.channel('global').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, p => displayMessage(p.new)).subscribe();

window.onload = async () => {
    const { data: { session } } = await _supabase.auth.getSession();
    if(session) {
        const meta = session.user.user_metadata;
        const res = await fetch(`https://discord.com/api/users/@me/guilds/1457130952655503536/member`, { headers: { Authorization: `Bearer ${session.provider_token}` } });
        const member = await res.json();
        
        let role = "Membro";
        if(member.roles.includes(ROLES.LEADER)) role = "Leader Developer";
        else if(member.roles.includes(ROLES.SCRIPTER)) role = "Scripter";
        else if(member.roles.includes(ROLES.MODELER)) role = "Modelador";
        if(meta.provider_id === ROLES.OWNER) role = "Dono";

        currentUser = { id: meta.provider_id, name: meta.full_name, avatar: meta.avatar_url, role: role };
        
        if(window.location.pathname.includes('dashboard')) {
            document.getElementById('user-avatar-side').src = currentUser.avatar;
            document.getElementById('user-name-side').innerText = currentUser.name.split(' ')[0];
            document.getElementById('user-role-tag').innerText = currentUser.role;
            
            if(currentUser.id === ROLES.OWNER || currentUser.role === "Leader Developer") {
                document.getElementById('admin-nav').style.display = 'flex';
                document.getElementById('btn-chat-announcement').style.display = 'flex';
            }
            logToDiscord(currentUser.name, currentUser.role);
            updateOnline(); loadOnline(); loadData();
            setInterval(updateOnline, 30000); setInterval(loadOnline, 10000);
            
            const { data: chats } = await _supabase.from('messages').select('*').order('created_at', {ascending: true}).limit(50);
            if(chats) chats.forEach(m => displayMessage(m));
        }
    } else if(window.location.pathname.includes('dashboard')) { window.location.href = 'index.html'; }
};

document.getElementById('logout-btn').onclick = async () => { await _supabase.auth.signOut(); window.location.href = 'index.html'; };
