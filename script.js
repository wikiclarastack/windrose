const SUPABASE_URL = "https://ltgxlyrvzonudpkffepv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0Z3hseXJ2em9udWRwa2ZmZXB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTIxMDksImV4cCI6MjA4OTc4ODEwOX0.KsgdcMA8u5j9TBh0pqk9k4rXLXIjX5h38VTR8DZ2DLs";
const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1485095056347103283/ZV7F4kjBoH8Pj2k6OECL8TnmBKggSYe5cIth-I-30rmjjEYw4QVoYO9GSkCpU2B5Ad__";

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// IDs de Cargos do Servidor (Wind Rose)
const ROLES = { 
    OWNER: "1419845373534670848", 
    LEADER: "1457134406555668500", 
    MODELER: "1457134482304925747", 
    SCRIPTER: "1457134516601622782" 
};

let currentUser = null;

// --- SISTEMA DE NOTIFICAÇÕES (TOAST) ---
function toast(msg) {
    const host = document.getElementById('notification-host');
    if (!host) return;
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerText = msg;
    host.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}

// --- LOGS PARA DISCORD ---
async function logToDiscord(user, role) {
    try {
        await fetch(DISCORD_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                embeds: [{
                    title: "🚀 Login no Painel Wind Rose",
                    description: `**Usuário:** ${user}\n**Cargo Detectado:** ${role}\n**Status:** Online`,
                    color: 0x00b2ff,
                    timestamp: new Date()
                }]
            })
        });
    } catch(e) { console.error("Erro no webhook", e); }
}

// --- GESTÃO DE INTERFACE ---
function switchTab(t, el) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
    document.getElementById(t).classList.add('active');
    el.classList.add('active');
}

// --- SISTEMA DE PERFIL (CORREÇÃO DO ERRO 406) ---
async function viewProfile(id) {
    // maybeSingle não quebra se o perfil não existir
    let { data, error } = await _supabase.from('profiles').select('*').eq('id', id).maybeSingle();

    // Se não existir perfil no banco e for o MEU ID, cria um automático
    if (!data && id === currentUser.id) {
        const newData = {
            id: currentUser.id,
            username: currentUser.name,
            avatar_url: currentUser.avatar,
            bio: "Desenvolvedor na Wind Rose",
            specialties: "Não definido"
        };
        await _supabase.from('profiles').upsert(newData);
        data = newData;
    } else if (!data) {
        return toast("Este utilizador ainda não configurou o perfil.");
    }

    // Preenche o Modal
    document.getElementById('profile-modal').style.display = 'flex';
    document.getElementById('p-name-ui').innerText = data.username;
    document.getElementById('p-avatar-ui').src = data.avatar_url || 'https://cdn.discordapp.com/embed/avatars/0.png';
    document.getElementById('p-banner-ui').style.backgroundImage = `url(${data.banner_url || ''})`;
    document.getElementById('p-bio-ui').innerText = data.bio || "Sem bio.";
    document.getElementById('p-spec-ui').innerText = data.specialties || "Nenhuma.";
    
    // Botão editar só aparece para o dono do perfil
    const editBtn = document.getElementById('edit-profile-btn');
    if(editBtn) editBtn.style.display = (currentUser.id === id) ? 'block' : 'none';
    
    toggleEditProfile(false);
}

function toggleEditProfile(s) {
    document.getElementById('p-view-mode').style.display = s ? 'none' : 'block';
    document.getElementById('p-edit-mode').style.display = s ? 'block' : 'none';
}

async function saveProfileData() {
    const avatar = document.getElementById('edit-avatar').value;
    const banner = document.getElementById('edit-banner').value;
    const bio = document.getElementById('edit-bio').value;
    const spec = document.getElementById('edit-spec').value;

    const { error } = await _supabase.from('profiles').update({
        avatar_url: avatar,
        banner_url: banner,
        bio: bio,
        specialties: spec
    }).eq('id', currentUser.id);

    if(!error) {
        toast("Perfil atualizado!");
        location.reload();
    } else {
        toast("Erro ao salvar. Verifica as permissões.");
    }
}

function closeProfile() { document.getElementById('profile-modal').style.display = 'none'; }

// --- CHAT E REALTIME ---
async function sendMessage() {
    const i = document.getElementById('chat-input');
    if(!i.value) return;
    await _supabase.from('messages').insert([{ 
        user_id: currentUser.id, 
        username: currentUser.name, 
        avatar_url: currentUser.avatar, 
        content: i.value 
    }]);
    i.value = "";
}

function displayMessage(m) {
    const box = document.getElementById('chat-box');
    if(!box) return;
    const isAdm = m.user_id === ROLES.OWNER || m.user_id === ROLES.LEADER;
    
    box.innerHTML += `
        <div class="user-item">
            <img src="${m.avatar_url}" onclick="viewProfile('${m.user_id}')" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
            <div>
                <strong style="color:${isAdm ? '#00b2ff' : '#fff'}; cursor:pointer;" onclick="viewProfile('${m.user_id}')">
                    ${m.username}
                </strong>
                <p style="font-size:14px; opacity:0.8; margin-top:2px;">${m.content}</p>
            </div>
        </div>`;
    box.scrollTop = box.scrollHeight;
}

// --- CARREGAMENTO DE DADOS (ROBUX, PATCHES, ALERTAS) ---
async function loadData() {
    const { data: invs } = await _supabase.from('investments').select('*').order('date', {ascending: false});
    const { data: patches } = await _supabase.from('updates').select('*').order('date', {ascending: false});
    const { data: alerts } = await _supabase.from('dashboard_alerts').select('*').order('created_at', {ascending: false}).limit(1);
    
    if(invs) {
        let t = 0;
        document.getElementById('table-body').innerHTML = invs.map(i => { 
            t += parseInt(i.value); 
            return `<tr><td>${i.name}</td><td style="color:#00b2ff">R$ ${i.value}</td><td>${new Date(i.date).toLocaleDateString()}</td></tr>`;
        }).join('');
        document.getElementById('total-robux').innerText = t.toLocaleString();
    }
    
    if(patches) {
        if(patches.length > 0) document.getElementById('current-version').innerText = patches[0].title;
        document.getElementById('patches-container').innerHTML = patches.map(p => `
            <div class="card" style="margin-bottom:15px; border-left:3px solid #00b2ff;">
                <h3>${p.title}</h3>
                <p style="opacity:0.6; margin-top:5px; font-size:14px;">${p.description}</p>
            </div>`).join('');
    }

    if(alerts && alerts.length > 0) {
        document.getElementById('top-alert-banner').style.display = 'block';
        document.getElementById('alert-text').innerText = alerts[0].content;
        document.getElementById('alert-author').innerText = "Publicado por: " + alerts[0].author;
    }
}

// --- FUNÇÕES ADMIN ---
async function addRobux() {
    const n = document.getElementById('inv-name').value;
    const v = document.getElementById('inv-amt').value;
    if(!n || !v) return toast("Preenche tudo!");
    await _supabase.from('investments').insert([{ name: n, value: v, date: new Date() }]);
    location.reload();
}

async function addPatch() {
    const t = document.getElementById('p-title').value;
    const d = document.getElementById('p-desc').value;
    if(!t || !d) return toast("Preenche tudo!");
    await _supabase.from('updates').insert([{ title: t, description: d, date: new Date() }]);
    location.reload();
}

async function createDashAlert() {
    const c = document.getElementById('dash-alert-input').value;
    if(!c) return;
    await _supabase.from('dashboard_alerts').insert([{ content: c, author: currentUser.name }]);
    toast("Alerta enviado!");
    location.reload();
}

// --- SUBSCRIPÇÃO REALTIME ---
_supabase.channel('room1').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, p => displayMessage(p.new)).subscribe();

// --- INICIALIZAÇÃO E AUTH ---
window.onload = async () => {
    const { data: { session } } = await _supabase.auth.getSession();
    
    if(session) {
        const meta = session.user.user_metadata;
        const res = await fetch(`https://discord.com/api/users/@me/guilds/1457130952655503536/member`, { 
            headers: { Authorization: `Bearer ${session.provider_token}` } 
        });
        const member = await res.json();
        
        // Detecção de Cargos
        let role = "Membro";
        if(member.roles?.includes(ROLES.LEADER)) role = "Leader Developer";
        else if(member.roles?.includes(ROLES.SCRIPTER)) role = "Scripter";
        else if(member.roles?.includes(ROLES.MODELER)) role = "Modelador";
        if(meta.provider_id === ROLES.OWNER) role = "Dono";

        currentUser = { id: meta.provider_id, name: meta.full_name, avatar: meta.avatar_url, role: role };
        
        if(window.location.pathname.includes('dashboard')) {
            // UI Sidebar
            document.getElementById('user-avatar-side').src = currentUser.avatar;
            document.getElementById('user-name-side').innerText = currentUser.name.split(' ')[0];
            document.getElementById('user-role-tag').innerText = currentUser.role;
            document.getElementById('my-profile-trigger').onclick = () => viewProfile(currentUser.id);
            
            // Permissão Admin
            if(currentUser.id === ROLES.OWNER || currentUser.role === "Leader Developer") {
                document.getElementById('admin-nav').style.display = 'flex';
            }
            
            // Online Status & Webhook
            logToDiscord(currentUser.name, currentUser.role);
            await _supabase.from('profiles').upsert({ id: currentUser.id, username: currentUser.name, avatar_url: currentUser.avatar, last_seen: new Date().toISOString() });
            
            loadData();
            
            // Carregar mensagens antigas
            const { data: chats } = await _supabase.from('messages').select('*').order('created_at', {ascending: true}).limit(50);
            if(chats) chats.forEach(m => displayMessage(m));
        }
    } else if(window.location.pathname.includes('dashboard')) {
        window.location.href = 'index.html';
    }
};

const logoutBtn = document.getElementById('logout-btn');
if(logoutBtn) logoutBtn.onclick = async () => { await _supabase.auth.signOut(); window.location.href = 'index.html'; };
