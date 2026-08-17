// =====================================================
// 1. CONFIGURACIÓN DE SUPABASE
// =====================================================

const SUPABASE_URL = 'https://omaklvjndanwfdxsalkm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tYWtsdmpuZGFud2ZkeHNhbGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0OTk2OTYsImV4cCI6MjEwMjA3NTY5Nn0.QFWJRs4DLOTQVrzl3JadzGnKXXDXlLMGa37iQxaGFw0';
const SPECIAL_AUCTION_ID = 'ecb5b431-6da8-4340-be7f-62eed499f8d3';

// =====================================================
// 2. INICIALIZAR SUPABASE
// =====================================================

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =====================================================
// 3. OBTENER DATOS DE LA SUBASTA ESPECIAL
// =====================================================

async function getAuctionData() {
    try {
        const { data: auction, error } = await supabaseClient
            .from('specialauctions')
            .select('title, description, image_url, starting_price, current_price, is_active, end_date')
            .eq('id', SPECIAL_AUCTION_ID)
            .single();
        
        if (error) {
            console.error('Error al obtener subasta:', error);
            return null;
        }
        return auction;
    } catch (error) {
        console.error('Error en getAuctionData:', error);
        return null;
    }
}

// =====================================================
// 4. OBTENER LA OFERTA MÁS ALTA DESDE SPECIALBIDS
// =====================================================

async function getHighestBidFromBids() {
    try {
        const { data: bids, error } = await supabaseClient
            .from('specialbids')
            .select('amount')
            .eq('auction_id', SPECIAL_AUCTION_ID)
            .order('amount', { ascending: false })
            .limit(1);
        
        if (error) {
            console.error('Error al obtener oferta más alta:', error);
            return 0;
        }
        
        if (bids && bids.length > 0) {
            return bids[0].amount;
        }
        return 0;
    } catch (error) {
        console.error('Error en getHighestBidFromBids:', error);
        return 0;
    }
}

// =====================================================
// 5. OBTENER TODAS LAS OFERTAS
// =====================================================

async function getBids() {
    try {
        const { data: bids, error } = await supabaseClient
            .from('specialbids')
            .select('bidder_name, bidder_email, amount, created_at')
            .eq('auction_id', SPECIAL_AUCTION_ID)
            .order('amount', { ascending: false });
        
        if (error) {
            console.error('Error al obtener ofertas:', error);
            return [];
        }
        return bids;
    } catch (error) {
        console.error('Error en getBids:', error);
        return [];
    }
}

// =====================================================
// 6. HACER UNA OFERTA
// =====================================================

async function placeBid(name, email, amount) {
    try {
        if (isNaN(amount) || amount <= 0) {
            alert('⚠️ La oferta debe ser un número mayor a 0 / The bid must be a number greater than 0.');
            return false;
        }

        const highestBid = await getHighestBidFromBids();
        const auction = await getAuctionData();
        
        if (!auction) {
            alert('❌ Error al cargar la subasta. Intenta de nuevo. / Error loading auction. Please try again.');
            return false;
        }

        if (!auction.is_active) {
            alert('❌ Esta subasta ya está cerrada. No se aceptan más ofertas. / This auction is now closed. No further bids are being accepted.');
            return false;
        }

        const minBid = highestBid > 0 ? highestBid : auction.starting_price;
        
        if (amount <= minBid) {
            alert(`⚠️ La oferta debe ser mayor a $${minBid} USD / Your bid must be higher than $${minBid} USD`);
            return false;
        }

        const { error: bidError } = await supabaseClient
            .from('specialbids')
            .insert({
                auction_id: SPECIAL_AUCTION_ID,
                bidder_name: name,
                bidder_email: email,
                amount: amount
            });
        
        if (bidError) {
            console.error('Error al insertar oferta:', bidError);
            throw bidError;
        }

        const { error: updateError } = await supabaseClient
            .from('specialauctions')
            .update({ 
                current_price: amount,
                updated_at: new Date().toISOString()
            })
            .eq('id', SPECIAL_AUCTION_ID);
        
        if (updateError) {
            console.error('Error al actualizar precio:', updateError);
            throw updateError;
        }

        return true;
        
    } catch (error) {
        console.error('Error al hacer la oferta:', error);
        alert('❌ Ocurrió un error al procesar tu oferta. Intenta de nuevo. / An error occurred while processing your offer. Please try again.');
        return false;
    }
}

// =====================================================
// 7. ACTUALIZAR INTERFAZ
// =====================================================

async function loadAuctionData() {
    try {
        const auction = await getAuctionData();
        if (!auction) {
            document.getElementById('artTitle').textContent = 'No se encontró la subasta';
            document.getElementById('artDescription').textContent = 'Verifica que el ID sea correcto';
            return;
        }
        
        const highestBid = await getHighestBidFromBids();
        const displayPrice = highestBid > 0 ? highestBid : auction.starting_price;
        
        const imgElement = document.getElementById('artImage');
        if (imgElement) {
            imgElement.src = auction.image_url || 'https://via.placeholder.com/600x600/7c3aed/fff?text=Special+Auction';
            imgElement.alt = auction.title;
        }
        
        document.getElementById('artTitle').textContent = auction.title;
        document.getElementById('artDescription').textContent = auction.description || 'Sin descripción';
        document.getElementById('currentPrice').textContent = `$${displayPrice} USD`;
        
        // Fecha de terminación
        const endDateElement = document.getElementById('endDate');
        if (auction.end_date) {
            const endDate = new Date(auction.end_date);
            const options = { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            };
            endDateElement.textContent = endDate.toLocaleDateString('es-ES', options);
            endDateElement.setAttribute('data-end-date', auction.end_date);
            updateCountdown();
        } else {
            endDateElement.textContent = 'No definida';
        }
        
        // Estado
        const statusEl = document.getElementById('auctionStatus');
        if (auction.is_active) {
            statusEl.innerHTML = '<span style="color: #7c3aed;">✅ Subasta activa / Active auction</span>';
            document.getElementById('submitBidBtn').disabled = false;
            document.getElementById('submitBidBtn').textContent = '🚀 Enviar oferta / Send offer';
        } else {
            statusEl.innerHTML = '<span style="color: #e17055;">🔒 Subasta cerrada / Auction closed</span>';
            document.getElementById('submitBidBtn').disabled = true;
            document.getElementById('submitBidBtn').textContent = '🔒 Subasta cerrada / Auction closed';
        }
    } catch (error) {
        console.error('Error en loadAuctionData:', error);
    }
}

// =====================================================
// 8. CONTADOR REGRESIVO
// =====================================================

function updateCountdown() {
    const endDateElement = document.getElementById('endDate');
    if (!endDateElement) return;
    
    const endDateStr = endDateElement.getAttribute('data-end-date');
    if (!endDateStr) return;
    
    const endDate = new Date(endDateStr);
    const now = new Date();
    const diff = endDate - now;
    
    if (diff <= 0) {
        endDateElement.innerHTML = '⏰ <strong>Subasta finalizada / Auction closed</strong>';
        return;
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    let text = '';
    if (days > 0) text += `${days}d `;
    if (hours > 0 || days > 0) text += `${hours}h `;
    text += `${minutes}m`;
    
    endDateElement.innerHTML = `⏳ <strong>${text}</strong> restante / remaining`;
}

setInterval(updateCountdown, 60000);

// =====================================================
// 9. CARGAR OFERTAS (SIN CORREO VISIBLE)
// =====================================================

async function loadBids() {
    try {
        const bids = await getBids();
        const bidsList = document.getElementById('bidsList');
        
        if (!bidsList) return;
        
        if (bids.length === 0) {
            bidsList.innerHTML = `
                <div class="bid-empty">
                    <p>No hay ofertas aún. ¡Sé el primero! / No offers yet. Be the first!</p>
                </div>
            `;
            document.getElementById('totalBids').textContent = '0';
            return;
        }
        
        bidsList.innerHTML = bids.map((bid) => `
            <div class="bid-item">
                <div class="bidder-info">
                    <span class="bidder-name">${escapeHtml(bid.bidder_name)}</span>
                </div>
                <span class="bid-amount">$${bid.amount}</span>
            </div>
        `).join('');
        
        document.getElementById('totalBids').textContent = bids.length;
    } catch (error) {
        console.error('Error en loadBids:', error);
    }
}

// =====================================================
// 10. ESCAPAR HTML
// =====================================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// =====================================================
// 11. REFRESCAR TODO
// =====================================================

async function refreshAll() {
    await loadAuctionData();
    await loadBids();
}

// =====================================================
// 12. MANEJAR ENVÍO DEL FORMULARIO
// =====================================================

document.addEventListener('DOMContentLoaded', function() {
    const bidForm = document.getElementById('bidForm');
    
    if (bidForm) {
        bidForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('bidName').value.trim();
            const email = document.getElementById('bidEmail').value.trim();
            const amount = parseInt(document.getElementById('bidAmount').value);

            if (!name || !email || !amount) {
                alert('⚠️ Por favor, llena todos los campos / Please fill in all the fields.');
                return;
            }

            if (amount <= 0) {
                alert('⚠️ La oferta debe ser mayor a $0. / The offer must be greater than $0.');
                return;
            }

            const btn = document.getElementById('submitBidBtn');
            btn.disabled = true;
            btn.textContent = '⏳ Procesando... / Processing...';

            const success = await placeBid(name, email, amount);

            if (success) {
                bidForm.reset();
                btn.textContent = '✅ ¡Oferta enviada! / Offer sent!';
                btn.style.background = 'linear-gradient(135deg, #7c3aed, #4c1d95)';
                await refreshAll();
                
                setTimeout(() => {
                    btn.textContent = '🚀 Enviar oferta / Send offer';
                    btn.style.background = '';
                    btn.disabled = false;
                }, 2000);
            } else {
                btn.textContent = '🚀 Enviar oferta / Send offer';
                btn.style.background = '';
                btn.disabled = false;
            }
        });
    }
    
    refreshAll();
});

// =====================================================
// 13. ESCUCHAR CAMBIOS EN TIEMPO REAL
// =====================================================

supabaseClient
    .channel('special-auction-updates')
    .on(
        'postgres_changes',
        {
            event: 'UPDATE',
            schema: 'public',
            table: 'specialauctions',
            filter: `id=eq.${SPECIAL_AUCTION_ID}`
        },
        (payload) => {
            const newPrice = payload.new.current_price;
            document.getElementById('currentPrice').textContent = `$${newPrice} USD`;
            
            const statusEl = document.getElementById('auctionStatus');
            if (payload.new.is_active) {
                statusEl.innerHTML = '<span style="color: #7c3aed;">✅ Subasta activa / Active auction</span>';
                document.getElementById('submitBidBtn').disabled = false;
                document.getElementById('submitBidBtn').textContent = '🚀 Enviar oferta / Send offer';
            } else {
                statusEl.innerHTML = '<span style="color: #e17055;">🔒 Subasta cerrada / Auction closed</span>';
                document.getElementById('submitBidBtn').disabled = true;
                document.getElementById('submitBidBtn').textContent = '🔒 Subasta cerrada / Auction closed';
            }
            
            if (payload.new.end_date) {
                const endDateElement = document.getElementById('endDate');
                const endDate = new Date(payload.new.end_date);
                const options = { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                };
                endDateElement.textContent = endDate.toLocaleDateString('es-ES', options);
                endDateElement.setAttribute('data-end-date', payload.new.end_date);
                updateCountdown();
            }
        }
    )
    .subscribe();

supabaseClient
    .channel('special-bids-updates')
    .on(
        'postgres_changes',
        {
            event: 'INSERT',
            schema: 'public',
            table: 'specialbids',
            filter: `auction_id=eq.${SPECIAL_AUCTION_ID}`
        },
        () => {
            loadBids();
            loadAuctionData();
        }
    )
    .subscribe();