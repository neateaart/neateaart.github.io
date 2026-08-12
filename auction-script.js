// =====================================================
// 1. CONFIGURACIÓN DE SUPABASE (YA CONFIGURADO)
// =====================================================

const SUPABASE_URL = 'https://omaklvjndanwfdxsalkm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tYWtsdmpuZGFud2ZkeHNhbGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0OTk2OTYsImV4cCI6MjEwMjA3NTY5Nn0.QFWJRs4DLOTQVrzl3JadzGnKXXDXlLMGa37iQxaGFw0';
const AUCTION_ID = '03ebbc88-6399-4325-81dd-f3211964cd75';

// =====================================================
// 2. INICIALIZAR SUPABASE
// =====================================================

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =====================================================
// 3. OBTENER DATOS DE LA SUBASTA
// =====================================================

async function getAuctionData() {
    const { data: auction, error } = await supabase
        .from('auctions')
        .select('title, description, image_url, current_price, is_active')
        .eq('id', AUCTION_ID)
        .single();
    
    if (error) {
        console.error('Error al obtener subasta:', error);
        return null;
    }
    return auction;
}

// =====================================================
// 4. OBTENER OFERTAS
// =====================================================

async function getBids() {
    const { data: bids, error } = await supabase
        .from('bids')
        .select('bidder_name, bidder_email, amount, created_at')
        .eq('auction_id', AUCTION_ID)
        .order('amount', { ascending: false });
    
    if (error) {
        console.error('Error al obtener ofertas:', error);
        return [];
    }
    return bids;
}

// =====================================================
// 5. HACER UNA OFERTA
// =====================================================

async function placeBid(name, email, amount) {
    try {
        // 1. Obtener estado actual de la subasta
        const auction = await getAuctionData();
        
        if (!auction) {
            alert('❌ Error al cargar la subasta. Intenta de nuevo.');
            return false;
        }
        
        // 2. Validar si está activa
        if (!auction.is_active) {
            alert('❌ Esta subasta ya está cerrada. No se aceptan más ofertas.');
            return false;
        }
        
        // 3. Validar que la oferta sea mayor a la actual
        if (amount <= auction.current_price) {
            alert(`⚠️ La oferta debe ser mayor a $${auction.current_price} USD`);
            return false;
        }
        
        // 4. Insertar la oferta en la tabla bids
        const { error: bidError } = await supabase
            .from('bids')
            .insert({
                auction_id: AUCTION_ID,
                bidder_name: name,
                bidder_email: email,
                amount: amount
            });
        
        if (bidError) throw bidError;
        
        // 5. Actualizar el current_price en auctions
        const { error: updateError } = await supabase
            .from('auctions')
            .update({ 
                current_price: amount,
                updated_at: new Date().toISOString()
            })
            .eq('id', AUCTION_ID);
        
        if (updateError) throw updateError;
        
        return true;
        
    } catch (error) {
        console.error('Error al hacer la oferta:', error);
        alert('❌ Ocurrió un error al procesar tu oferta. Intenta de nuevo.');
        return false;
    }
}

// =====================================================
// 6. ACTUALIZAR INTERFAZ
// =====================================================

async function loadAuctionData() {
    const auction = await getAuctionData();
    if (!auction) return;
    
    // Actualizar imagen
    document.getElementById('artImage').src = auction.image_url || 'https://via.placeholder.com/600x600/00bcd4/fff?text=Arte+en+Subasta';
    document.getElementById('artImage').alt = auction.title;
    
    // Actualizar título y descripción
    document.getElementById('artTitle').textContent = auction.title;
    document.getElementById('artDescription').textContent = auction.description || 'Sin descripción';
    
    // Actualizar precio
    document.getElementById('currentPrice').textContent = `$${auction.current_price} USD`;
    
    // Actualizar estado
    const statusEl = document.getElementById('auctionStatus');
    if (auction.is_active) {
        statusEl.innerHTML = '<span style="color: #00b894;">✅ Subasta activa</span>';
    } else {
        statusEl.innerHTML = '<span style="color: #e17055;">🔒 Subasta cerrada</span>';
        document.getElementById('submitBidBtn').disabled = true;
        document.getElementById('submitBidBtn').textContent = '🔒 Subasta cerrada';
    }
}

async function loadBids() {
    const bids = await getBids();
    const bidsList = document.getElementById('bidsList');
    
    if (bids.length === 0) {
        bidsList.innerHTML = `
            <div class="bid-empty">
                <p>No hay ofertas aún. ¡Sé el primero!</p>
            </div>
        `;
        document.getElementById('totalBids').textContent = '0';
        return;
    }
    
    // Generar HTML para cada oferta
    bidsList.innerHTML = bids.map((bid) => `
        <div class="bid-item">
            <div class="bidder-info">
                <span class="bidder-name">${bid.bidder_name}</span>
                <span class="bidder-email">${bid.bidder_email}</span>
            </div>
            <span class="bid-amount">$${bid.amount}</span>
        </div>
    `).join('');
    
    document.getElementById('totalBids').textContent = bids.length;
}

async function refreshAll() {
    await loadAuctionData();
    await loadBids();
}

// =====================================================
// 7. MANEJAR ENVÍO DEL FORMULARIO
// =====================================================

const bidForm = document.getElementById('bidForm');

bidForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('bidName').value.trim();
    const email = document.getElementById('bidEmail').value.trim();
    const amount = parseInt(document.getElementById('bidAmount').value);

    // Validaciones
    if (!name || !email || !amount) {
        alert('⚠️ Por favor, llena todos los campos.');
        return;
    }

    if (amount <= 0) {
        alert('⚠️ La oferta debe ser mayor a $0.');
        return;
    }

    // Deshabilitar botón mientras se procesa
    const btn = document.getElementById('submitBidBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Procesando...';

    // Hacer la oferta
    const success = await placeBid(name, email, amount);

    if (success) {
        // Limpiar formulario
        bidForm.reset();
        
        // Feedback visual
        btn.textContent = '✅ ¡Oferta enviada!';
        btn.style.background = 'linear-gradient(135deg, #00b894, #00a381)';
        
        // Actualizar la lista de ofertas y datos
        await refreshAll();
        
        setTimeout(() => {
            btn.textContent = '🚀 Enviar oferta';
            btn.style.background = '';
            btn.disabled = false;
        }, 2000);
    } else {
        btn.textContent = '🚀 Enviar oferta';
        btn.disabled = false;
    }
});

// =====================================================
// 8. ESCUCHAR CAMBIOS EN TIEMPO REAL
// =====================================================

supabase
    .channel('auction-updates')
    .on(
        'postgres_changes',
        {
            event: 'UPDATE',
            schema: 'public',
            table: 'auctions',
            filter: `id=eq.${AUCTION_ID}`
        },
        (payload) => {
            // Actualizar precio en tiempo real
            const newPrice = payload.new.current_price;
            document.getElementById('currentPrice').textContent = `$${newPrice} USD`;
            
            // Actualizar estado
            const statusEl = document.getElementById('auctionStatus');
            if (payload.new.is_active) {
                statusEl.innerHTML = '<span style="color: #00b894;">✅ Subasta activa</span>';
                document.getElementById('submitBidBtn').disabled = false;
                document.getElementById('submitBidBtn').textContent = '🚀 Enviar oferta';
            } else {
                statusEl.innerHTML = '<span style="color: #e17055;">🔒 Subasta cerrada</span>';
                document.getElementById('submitBidBtn').disabled = true;
                document.getElementById('submitBidBtn').textContent = '🔒 Subasta cerrada';
            }
        }
    )
    .subscribe();

supabase
    .channel('bids-updates')
    .on(
        'postgres_changes',
        {
            event: 'INSERT',
            schema: 'public',
            table: 'bids',
            filter: `auction_id=eq.${AUCTION_ID}`
        },
        () => {
            loadBids();
        }
    )
    .subscribe();

// =====================================================
// 9. INICIALIZAR TODO AL CARGAR LA PÁGINA
// =====================================================

refreshAll();