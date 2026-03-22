const _supabase = supabase.createClient(
    'https://ltgxlyrvzonudpkffepv.supabase.co', 
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0Z3hseXJ2em9udWRwa2ZmZXB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTIxMDksImV4cCI6MjA4OTc4ODEwOX0.KsgdcMA8u5j9TBh0pqk9k4rXLXIjX5h38VTR8DZ2DLs'
);

const loginBtn = document.getElementById('login-btn');

// Função para Logar
if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        await _supabase.auth.signInWithOAuth({
            provider: 'discord',
            options: {
                redirectTo: window.location.origin + '/dashboard.html'
            }
        });
    });
}

// Lógica para a página de Dashboard (Coloque isso no topo do dashboard.html ou aqui)
async function checkAuth() {
    const { data: { session } } = await _supabase.auth.getSession();
    
    if (!session) {
        window.location.href = 'index.html';
        return;
    }

    // Verificar se o ID do Discord está na tabela 'developers'
    const { data: isDev, error } = await _supabase
        .from('developers')
        .select('*')
        .eq('discord_id', session.user.user_metadata.provider_id)
        .single();

    if (!isDev || error) {
        alert("Você não tem permissão de desenvolvedor.");
        await _supabase.auth.signOut();
        window.location.href = 'index.html?error=unauthorized';
    }
}
