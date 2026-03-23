const SUPABASE_URL = "https://ltgxlyrvzonudpkffepv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0Z3hseXJ2em9udWRwa2ZmZXB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTIxMDksImV4cCI6MjA4OTc4ODEwOX0.KsgdcMA8u5j9TBh0pqk9k4rXLXIjX5h38VTR8DZ2DLs";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const GUILD_ID = "1457130952655503536";
const ROLES = {
    LEADER: "1457134406555668500",
    MODELER: "1457134482304925747",
    SCRIPTER: "1457134516601622782",
    OWNER: "1419845373534670848"
};

let currentUser = null;

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

function switchTab(tabId, el) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    el.classList.add('active');
}

async function getDiscordMember(token) {
    try {
        const res = await fetch(`https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return res.ok ? await res.json() : null;
    } catch { return null; }
}

async function sendMessage(isAnnounce = false) {
    const input = document.getElementById('chat-input');
    if (!input.value || !currentUser) return;
    await _supabase.from('messages').insert([{
        user_id: currentUser.id,
        username: currentUser.name,
        avatar_url: currentUser.avatar,
        content: input.value,
        is_announcement: isAnnounce
    }]);
    input.value = "";
}

function displayMessage(msg) {
    const box = document.getElementById('chat-box');
    if (!box) return;
    const isSpecial = msg.is_announcement;
    const isAdm = msg.user_id === ROLES.OWNER || msg.user_id === ROLES.LEADER;
    
    const html = `
        <div style="display:flex; gap:15px; padding:15px; border-radius:15px; background:${isSpecial ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.03)'}; border:${isSpecial ? '1px solid #f59e0b' : '1px solid transparent'}">
            <img src="${msg.avatar_url}" style="width:40px; height:40px; border-radius:10px; border:2px solid ${isAdm ? '#00b2ff' : '#333'}">
            <div style="flex:1">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong style="color:${isAdm ? '#00b2ff' : '#fff'}; font-size:13px;">${msg.username}</strong>
                    ${(currentUser.id === ROLES.OWNER || currentUser.id === ROLES.LEADER) ? `<span onclick="deleteMsg('${msg.id}')" style="color:#ff4b4b; cursor:pointer;">&times;</span>` : ''}
                </div>
                <p style="font-size:14px; margin-top:5px; opacity:0.8;">${msg.content}</p>
            </div>
        </div>`;
    box.innerHTML += html;
    box.scrollTop = box.scrollHeight;
}

async function deleteMsg(id) {
    await _supabase.from('messages').delete().eq('id', id);
    location.reload();
}

async function addRobux() {
    const n = document.getElementById('inv-name').value;
    const v = document.getElementById('inv-amt').value;
    await _supabase.from('investments').insert([{ name: n, value: v, date: new Date() }]);
    location.reload();
}

async function addPatch() {
    const t = document.getElementById('p-title').value;
    const d = document.getElementById('p-desc').value;
    await _supabase.from('updates').insert([{ title: t, description: d, date: new Date() }]);
    location.reload();
}

async function createDashAlert() {
    const c = document.getElementById('dash-alert-input').value;
    await _supabase.from('dashboard_alerts').insert([{ content: c, author: currentUser.name }]);
    location.reload();
}

async function loadData() {
    const { data: invs } = await _supabase.from('investments').select('*').order('date', {ascending: false});
    const { data: patches } = await _supabase.from('updates').select('*').order('date', {ascending: false});
    const { data: alerts } = await _supabase.from('dashboard_alerts').select('*').order('created_at', {ascending: false}).limit(1);
    const { data: chats } = await _supabase.from('messages').select('*').order('created_at', {ascending: true}).limit(50);

    if (invs) {
        let t = 0;
        document.getElementById('table-body').innerHTML = invs.map(i => {
            t += parseInt(i.value);
            return `<tr><td>${i.name}</td><td style="color:#00b2ff">R$ ${i.value}</td><td>${new Date(i.date).toLocaleDateString()}</td></tr>`;
        }).join('');
        document.getElementById('total-robux').innerText = t.toLocaleString();
    }
    if (patches) {
        document.getElementById('total-patches').innerText = patches.length;
        document.getElementById('patches-container').innerHTML = patches.map(p => `
            <div class="card" style="margin-bottom:15px;">
                <h3 style="color:#00b2ff">${p.title}</h3>
                <p style="opacity:0.6; font-size:14px; margin-top:8px;">${p.description}</p>
            </div>`).join('');
    }
    if (alerts && alerts.length > 0) {
        document.getElementById('top-alert-banner').style.display = 'block';
        document.getElementById('alert-text').innerText = alerts[0].content;
        document.getElementById('alert-author').innerText = "Por: " + alerts[0].author;
    }
    if (chats) chats.forEach(m => displayMessage(m));
}

_supabase.channel('global').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, p => displayMessage(p.new)).subscribe();

window.onload = async () => {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session && window.location.pathname.includes('dashboard')) {
        window.location.href = 'index.html';
        return;
    }
    if (session) {
        const member = await getDiscordMember(session.provider_token);
        if (!member && window.location.pathname.includes('dashboard')) {
            alert("Você não faz parte do servidor Wind Rose.");
            await _supabase.auth.signOut();
            window.location.href = 'index.html';
            return;
        }

        const meta = session.user.user_metadata;
        const roles = member.roles;
        let roleTag = "Membro";
        if (roles.includes(ROLES.LEADER)) roleTag = "Leader Developer";
        else if (roles.includes(ROLES.MODELER)) roleTag = "Modelador";
        else if (roles.includes(ROLES.SCRIPTER)) roleTag = "Scripter";
        if (meta.provider_id === ROLES.OWNER) roleTag = "Dono";

        currentUser = { id: meta.provider_id, name: meta.full_name, avatar: meta.avatar_url, role: roleTag };

        if (window.location.pathname.includes('dashboard')) {
            document.getElementById('user-name-side').innerText = currentUser.name.split(' ')[0];
            document.getElementById('user-avatar-side').src = currentUser.avatar;
            document.getElementById('user-role-tag').innerText = currentUser.role;

            if (currentUser.id === ROLES.OWNER || currentUser.role === "Leader Developer") {
                document.getElementById('admin-nav').style.display = 'flex';
                document.getElementById('btn-chat-announcement').style.display = 'block';
            }
            loadData();
        }
    }
};

const lout = document.getElementById('logout-btn');
if (lout) lout.onclick = async () => { await _supabase.auth.signOut(); window.location.href = 'index.html'; };
