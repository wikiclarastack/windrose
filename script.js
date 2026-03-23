const SUPABASE_URL = "https://ltgxlyrvzonudpkffepv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0Z3hseXJ2em9udWRwa2ZmZXB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTIxMDksImV4cCI6MjA4OTc4ODEwOX0.KsgdcMA8u5j9TBh0pqk9k4rXLXIjX5h38VTR8DZ2DLs";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const GUILD_ID = "1457130952655503536";
const ROLES = { OWNER: "1419845373534670848", LEADER: "1457134406555668500", MODELER: "1457134482304925747", SCRIPTER: "1457134516601622782" };

let currentUser = null;

const loginBtn = document.getElementById('login-btn');
if(loginBtn) loginBtn.onclick = () => _supabase.auth.signInWithOAuth({ provider: 'discord', options: { scopes: 'identify guilds guilds.members.read', redirectTo: window.location.origin + '/dashboard.html' } });

function switchTab(t, el) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
    document.getElementById(t).classList.add('active');
    el.classList.add('active');
}

async function getMemberData(token) {
    const res = await fetch(`https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`, { headers: { Authorization: `Bearer ${token}` } });
    return res.ok ? await res.json() : null;
}

async function sendMessage(isAnnounce = false) {
    const i = document.getElementById('chat-input');
    if(!i.value || !currentUser) return;
    await _supabase.from('messages').insert([{ user_id: currentUser.id, username: currentUser.name, avatar_url: currentUser.avatar, content: i.value, is_announcement: isAnnounce }]);
    i.value = "";
}

function displayMessage(m) {
    const b = document.getElementById('chat-box');
    if(!b) return;
    let text = m.content;
    const isMe = currentUser && m.user_id === currentUser.id;
    if(currentUser && text.includes(`@${currentUser.name}`)) {
        text = text.replace(`@${currentUser.name}`, `<span class="mention">@${currentUser.name}</span>`);
        if(!isMe) document.getElementById('mention-sound').play();
    }
    const isAdm = m.user_id === ROLES.OWNER || m.user_id === ROLES.LEADER;
    b.innerHTML += `
        <div class="user-item" style="background:rgba(255,255,255,0.02); margin-bottom:5px; border-left: 3px solid ${m.is_announcement ? '#f59e0b' : 'transparent'}">
            <img src="${m.avatar_url}" onclick="viewProfile('${m.user_id}')" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
            <div style="flex:1">
                <div style="display:flex; justify-content:space-between">
                    <strong style="font-size:12px; color:${isAdm ? '#00b2ff' : '#fff'}">${m.username}</strong>
                    ${(currentUser.id === ROLES.OWNER || currentUser.id === ROLES.LEADER) ? `<span onclick="deleteMsg('${m.id}')" style="color:red; cursor:pointer">×</span>` : ''}
                </div>
                <p style="font-size:14px; opacity:0.9">${text}</p>
            </div>
        </div>`;
    b.scrollTop = b.scrollHeight;
}

async function deleteMsg(id) { await _supabase.from('messages').delete().eq('id', id); location.reload(); }

async function updateOnline() {
    if(!currentUser) return;
    await _supabase.from('profiles').upsert({ id: currentUser.id, username: currentUser.name, avatar_url: currentUser.avatar, last_seen: new Date().toISOString() });
}

async function loadOnline() {
    const { data } = await _supabase.from('profiles').select('*').gt('last_seen', new Date(Date.now() - 300000).toISOString());
    if(data) {
        document.getElementById('online-count').innerText = data.length;
        if(document.getElementById('online-count-main')) document.getElementById('online-count-main').innerText = data.length;
        document.getElementById('user-list').innerHTML = data.map(u => `<div class="user-item" onclick="viewProfile('${u.id}')"><img src="${u.avatar_url}">${u.username}</div>`).join('');
    }
}

async function viewProfile(id) {
    const { data } = await _supabase.from('profiles').select('*').eq('id', id).single();
    if(data) {
        document.getElementById('profile-modal').style.display = 'flex';
        document.getElementById('profile-name').innerText = data.username;
        document.getElementById('profile-img').src = data.avatar_url;
        document.getElementById('profile-bio').innerText = data.bio || "Sem bio";
        document.getElementById('profile-specialties').innerText = data.specialties || "Nenhuma";
        document.getElementById('profile-edit-fields').style.display = (currentUser.id === id) ? 'block' : 'none';
    }
}

async function saveProfile() {
    const b = document.getElementById('edit-bio').value;
    const s = document.getElementById('edit-spec').value;
    await _supabase.from('profiles').update({ bio: b, specialties: s }).eq('id', currentUser.id);
    location.reload();
}

function closeProfile() { document.getElementById('profile-modal').style.display = 'none'; }
function openMyProfile() { viewProfile(currentUser.id); }

async function addRobux() {
    const n = document.getElementById('inv-name').value;
    const v = document.getElementById('inv-amt').value;
    if(!n || !v) return;
    await _supabase.from('investments').insert([{ name: n, value: v, date: new Date() }]);
    location.reload();
}

async function createDashAlert() {
    const c = document.getElementById('dash-alert-input').value;
    if(!c) return;
    await _supabase.from('dashboard_alerts').insert([{ content: c, author: currentUser.name }]);
    location.reload();
}

async function loadData() {
    const { data: invs } = await _supabase.from('investments').select('*').order('date', {ascending: false});
    const { data: alerts } = await _supabase.from('dashboard_alerts').select('*').order('created_at', {ascending: false}).limit(1);
    const { data: chats } = await _supabase.from('messages').select('*').order('created_at', {ascending: true}).limit(50);
    if(invs) {
        let t = 0;
        document.getElementById('table-body').innerHTML = invs.map(i => { t += parseInt(i.value); return `<tr><td>${i.name}</td><td>R$ ${i.value}</td><td>${new Date(i.date).toLocaleDateString()}</td></tr>` }).join('');
        document.getElementById('total-robux').innerText = t.toLocaleString();
    }
    if(alerts && alerts.length > 0) {
        document.getElementById('top-alert-banner').style.display = 'block';
        document.getElementById('alert-text').innerText = alerts[0].content;
        document.getElementById('alert-author').innerText = "Postado por: " + alerts[0].author;
    }
    if(chats) chats.forEach(m => displayMessage(m));
}

_supabase.channel('room1').on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, p => { if(p.eventType === 'INSERT') displayMessage(p.new); else location.reload(); }).subscribe();

window.onload = async () => {
    const { data: { session } } = await _supabase.auth.getSession();
    if(session) {
        const member = await getMemberData(session.provider_token);
        if(!member && window.location.pathname.includes('dashboard')) { await _supabase.auth.signOut(); window.location.href='index.html'; return; }
        const meta = session.user.user_metadata;
        const roles = member.roles;
        let roleTag = "Membro";
        if(roles.includes(ROLES.LEADER)) roleTag = "Leader";
        else if(roles.includes(ROLES.SCRIPTER)) roleTag = "Scripter";
        else if(roles.includes(ROLES.MODELER)) roleTag = "Modelador";
        if(meta.provider_id === ROLES.OWNER) roleTag = "Dono";

        currentUser = { id: meta.provider_id, name: meta.full_name, avatar: meta.avatar_url, role: roleTag };
        if(window.location.pathname.includes('dashboard')) {
            document.getElementById('user-avatar-side').src = currentUser.avatar;
            document.getElementById('user-name-side').innerText = currentUser.name.split(' ')[0];
            document.getElementById('user-role-tag').innerText = currentUser.role;
            if(currentUser.id === ROLES.OWNER || currentUser.id === ROLES.LEADER) {
                document.getElementById('admin-nav').style.display = 'flex';
                document.getElementById('btn-chat-announcement').style.display = 'flex';
            }
            updateOnline(); loadOnline(); loadData();
            setInterval(updateOnline, 30000); setInterval(loadOnline, 10000);
        }
    } else if(window.location.pathname.includes('dashboard')) { window.location.href = 'index.html'; }
};

const logout = document.getElementById('logout-btn');
if(logout) logout.onclick = async () => { await _supabase.auth.signOut(); window.location.href = 'index.html'; };
