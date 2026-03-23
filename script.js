const SUPABASE_URL = "https://ltgxlyrvzonudpkffepv.supabase.co";
const SUPABASE_KEY = "SUA_KEY";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const GUILD_ID = "1457130952655503536";
const ROLES = { LEADER: "1457134406555668500", MODELER: "1457134482304925747", SCRIPTER: "1457134516601622782", OWNER: "1419845373534670848" };

let currentUser = null;

function playMentionSound() { document.getElementById('mention-sound').play(); }

async function sendMessage() {
    const input = document.getElementById('chat-input');
    if (!input.value || !currentUser) return;

    const content = input.value;
    const isMention = content.includes(`@${currentUser.name}`) || content.includes("@everyone");

    await _supabase.from('messages').insert([{
        user_id: currentUser.id,
        username: currentUser.name,
        avatar_url: currentUser.avatar,
        content: content,
        is_announcement: false
    }]);
    input.value = "";
}

function displayMessage(msg) {
    const box = document.getElementById('chat-box');
    if (!box) return;
    
    let formattedContent = msg.content;
    if (currentUser && msg.content.includes(`@${currentUser.name}`)) {
        formattedContent = msg.content.replace(`@${currentUser.name}`, `<span class="mention">@${currentUser.name}</span>`);
        if (msg.user_id !== currentUser.id) playMentionSound();
    }

    const html = `
        <div class="user-list-item animate" onclick="viewProfile('${msg.user_id}')" style="background:rgba(255,255,255,0.02); margin-bottom:10px; padding:15px;">
            <img src="${msg.avatar_url}" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
            <div style="flex:1">
                <div style="display:flex; justify-content:space-between;">
                    <strong style="color:var(--accent); font-size:13px;">${msg.username}</strong>
                </div>
                <p style="font-size:14px; margin-top:5px; opacity:0.9;">${formattedContent}</p>
            </div>
        </div>`;
    box.innerHTML += html;
    box.scrollTop = box.scrollHeight;
}

async function updateOnlineStatus() {
    if (!currentUser) return;
    await _supabase.from('profiles').upsert({
        id: currentUser.id,
        username: currentUser.name,
        avatar_url: currentUser.avatar,
        last_seen: new Date().toISOString()
    });
}

async function loadOnlineUsers() {
    const { data } = await _supabase.from('profiles').select('*').gt('last_seen', new Date(Date.now() - 300000).toISOString());
    if (data) {
        document.getElementById('online-count').innerText = data.length;
        document.getElementById('user-list').innerHTML = data.map(u => `
            <div class="user-list-item" onclick="viewProfile('${u.id}')">
                <div class="status-dot"></div>
                <img src="${u.avatar_url}">
                <p style="font-size:13px;">${u.username}</p>
            </div>
        `).join('');
    }
}

async function viewProfile(id) {
    const { data } = await _supabase.from('profiles').select('*').eq('id', id).single();
    if (data) {
        document.getElementById('profile-modal').style.display = 'flex';
        document.getElementById('profile-name').innerText = data.username;
        document.getElementById('profile-img').src = data.avatar_url;
        document.getElementById('profile-banner').style.backgroundImage = `url(${data.banner_url})`;
        document.getElementById('profile-bio').innerText = data.bio;
        document.getElementById('profile-specialties').innerText = data.specialties;
        
        const isMe = currentUser.id === id;
        document.getElementById('profile-edit-fields').style.display = isMe ? 'block' : 'none';
    }
}

async function saveProfile() {
    const bio = document.getElementById('edit-bio').value;
    const spec = document.getElementById('edit-spec').value;
    await _supabase.from('profiles').update({ bio: bio, specialties: spec }).eq('id', currentUser.id);
    alert("Perfil atualizado!");
    location.reload();
}

function closeProfile() { document.getElementById('profile-modal').style.display = 'none'; }
function openMyProfile() { viewProfile(currentUser.id); }

setInterval(updateOnlineStatus, 60000);
setInterval(loadOnlineUsers, 10000);

_supabase.channel('profiles').on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, loadOnlineUsers).subscribe();
_supabase.channel('chat').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, p => displayMessage(p.new)).subscribe();

window.onload = async () => {
    const { data: { session } } = await _supabase.auth.getSession();
    if (session) {
        const meta = session.user.user_metadata;
        currentUser = { id: meta.provider_id, name: meta.full_name, avatar: meta.avatar_url };
        document.getElementById('user-avatar-side').src = currentUser.avatar;
        document.getElementById('user-name-side').innerText = currentUser.name;
        updateOnlineStatus();
        loadOnlineUsers();
        // Carregar histórico e outros dados...
        const { data: chats } = await _supabase.from('messages').select('*').order('created_at', {ascending: true}).limit(50);
        if (chats) chats.forEach(m => displayMessage(m));
    }
};
