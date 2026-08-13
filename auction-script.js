// =====================================================
// 1. CONFIGURACIÓN DE SUPABASE
// =====================================================

const SUPABASE_URL = 'https://omaklvjndanwfdxsalkm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tYWtsdmpuZGFud2ZkeHNhbGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0OTk2OTYsImV4cCI6MjEwMjA3NTY5Nn0.QFWJRs4DLOTQVrzl3JadzGnKXXDXlLMGa37iQxaGFw0';
const AUCTION_ID = '03ebbc88-6399-4325-81dd-f3211964cd75';

// =====================================================
// 2. INICIALIZAR SUPABASE
// =====================================================

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =====================================================
// 3. OBTENER DATOS DE LA SUBASTA (INCLUYE END_DATE)
// =====================================================

async function getAuctionData() {
    try {
        const { data: auction, error } = await supabaseClient
            .from('auctions')
            .select('title, description, image_url, starting_price, current_price, is_active, end_date')
            .eq('id', AUCTION_ID)
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
// 4. OBTENER LA OFERTA MÁS ALTA DESDE LA TABLA BIDS
// =====================================================

async function getHighestBidFromBids() {
    try {
        const { data: bids, error } = await supabaseClient
            .from('bids')
            .select('amount')
            .eq('auction_id', AUCTION_ID)
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
            .from('bids')
            .select('bidder_name, bidder_email, amount, created_at')
            .eq('auction_id', AUCTION_ID)
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
        // 1. Validar que la oferta sea un número válido
        if (isNaN(amount) || amount <= 0) {
            alert('⚠️ La oferta debe ser un número mayor a 0.');
            return false;
        }

        // 2. Obtener la oferta más alta actual desde la tabla bids
        const highestBid = await getHighestBidFromBids();
        console.log('💰 Oferta más alta actual en bids:', highestBid);

        // 3. Obtener los datos de la subasta
        const auction = await getAuctionData();
        if (!auction) {
            alert('❌ Error al cargar la subasta. Intenta de nuevo.');
            return false;
        }

        // 4. Validar si la subasta está activa
        if (!auction.is_active) {
            alert('❌ Esta subasta ya está cerrada. No se aceptan más ofertas.');
            return false;
        }

        // 5. Determinar el mínimo permitido
        const minBid = highestBid > 0 ? highestBid : auction.starting_price;
        
        console.log('📊 Precio inicial:', auction.starting_price);
        console.log('🔝 Mínimo permitido:', minBid);
        console.log('📝 Tu oferta:', amount);

        // 6. Validar que la oferta sea mayor al mínimo
        if (amount <= minBid) {
            alert(`⚠️ La oferta debe ser mayor a $${minBid} USD / Your bid must be higher than $${minBid} USD`);
            return false;
        }

        // 7. Insertar la oferta en la tabla bids
        const { error: bidError } = await supabaseClient
            .from('bids')
            .insert({
                auction_id: AUCTION_ID,
                bidder_name: name,
                bidder_email: email,
                amount: amount
            });
        
        if (bidError) {
            console.error('Error al insertar oferta:', bidError);
            throw bidError;
        }

        // 8. Actualizar el current_price en auctions
        const { error: updateError } = await supabaseClient
            .from('auctions')
            .update({ 
                current_price: amount,
                updated_at: new Date().toISOString()
            })
            .eq('id', AUCTION_ID);
        
        if (updateError) {
            console.error('Error al actualizar precio:', updateError);
            throw updateError;
        }

        console.log('✅ Oferta de $' + amount + ' USD realizada por ' + name);
        return true;
        
    } catch (error) {
        console.error('Error al hacer la oferta:', error);
        alert('❌ Ocurrió un error al procesar tu oferta. Intenta de nuevo.');
        return false;
    }
}

// =====================================================
// 7. ACTUALIZAR INTERFAZ (CON FECHA DE TERMINACIÓN)
// =====================================================

async function loadAuctionData() {
    try {
        const auction = await getAuctionData();
        if (!auction) {
            document.getElementById('artTitle').textContent = 'No se encontró la subasta';
            document.getElementById('artDescription').textContent = 'Verifica que el ID sea correcto';
            return;
        }
        
        // OBTENER LA OFERTA MÁS ALTA REAL DESDE LA TABLA BIDS
        const highestBid = await getHighestBidFromBids();
        console.log('🏆 Oferta más alta REAL:', highestBid);
        
        // Determinar qué precio mostrar
        const displayPrice = highestBid > 0 ? highestBid : auction.starting_price;
        console.log('💲 Precio a mostrar:', displayPrice);
        
        // Actualizar imagen
        const imgElement = document.getElementById('artImage');
        if (imgElement) {
            imgElement.src = auction.image_url || 'https://via.placeholder.com/600x600/00bcd4/fff?text=Arte+en+Subasta';
            imgElement.alt = auction.title;
        }
        
        // Actualizar título y descripción
        document.getElementById('artTitle').textContent = auction.title;
        document.getElementById('artDescription').textContent = auction.description || 'Sin descripción';
        
        // ACTUALIZAR PRECIO CON LA OFERTA MÁS ALTA REAL
        document.getElementById('currentPrice').textContent = `$${displayPrice} USD`;
        
        // =============================================
        // ACTUALIZAR FECHA DE TERMINACIÓN
        // =============================================
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
            
            // Guardar fecha para el contador regresivo
            endDateElement.setAttribute('data-end-date', auction.end_date);
            
            // Actualizar contador
            updateCountdown();
        } else {
            endDateElement.textContent = 'No definida';
        }
        
        // Actualizar estado
        const statusEl = document.getElementById('auctionStatus');
        if (auction.is_active) {
            statusEl.innerHTML = '<span style="color: #00b894;">✅ Subasta activa/Active auction</span>';
            document.getElementById('submitBidBtn').disabled = false;
            document.getElementById('submitBidBtn').textContent = '🚀 Enviar oferta/Send offer';
        } else {
            statusEl.innerHTML = '<span style="color: #e17055;">🔒 Subasta cerrada</span>';
            document.getElementById('submitBidBtn').disabled = true;
            document.getElementById('submitBidBtn').textContent = '🔒 Subasta cerrada/Auction closed';
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
    
    // Obtener la fecha de terminación desde el atributo data
    const endDateStr = endDateElement.getAttribute('data-end-date');
    if (!endDateStr) return;
    
    const endDate = new Date(endDateStr);
    const now = new Date();
    const diff = endDate - now;
    
    if (diff <= 0) {
        endDateElement.innerHTML = '⏰ <strong>Subasta finalizada/Auction closed</strong>';
        return;
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    let text = '';
    if (days > 0) text += `${days}d `;
    if (hours > 0 || days > 0) text += `${hours}h `;
    text += `${minutes}m`;
    
    endDateElement.innerHTML = `⏳ <strong>${text}</strong> restante`;
}

// Actualizar contador cada minuto
setInterval(updateCountdown, 60000);

// =====================================================
// 9. CARGAR OFERTAS
// =====================================================

async function loadBids() {
    try {
        const bids = await getBids();
        const bidsList = document.getElementById('bidsList');
        
        if (!bidsList) return;
        
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
// 10. ESCAPAR HTML (seguridad)
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

            const nameInput = document.getElementById('bidName');
            const emailInput = document.getElementById('bidEmail');
            const amountInput = document.getElementById('bidAmount');
            
            const name = nameInput.value.trim();
            const email = emailInput.value.trim();
            const amount = parseInt(amountInput.value);

            // Validaciones
            if (!name || !email || !amount) {
                alert('⚠️ Por favor, llena todos los campos/Please fill in all the fields..');
                return;
            }

            if (amount <= 0) {
                alert('⚠️ La oferta debe ser mayor a $0./The offer must be greater than $0.');
                return;
            }

            // Deshabilitar botón mientras se procesa
            const btn = document.getElementById('submitBidBtn');
            btn.disabled = true;
            btn.textContent = '⏳ Procesando.../Processing...';

            // Hacer la oferta
            const success = await placeBid(name, email, amount);

            if (success) {
                // Limpiar formulario
                bidForm.reset();
                
                // Feedback visual
                btn.textContent = '✅ ¡Oferta enviada!/¡Offer sent!';
                btn.style.background = 'linear-gradient(135deg, #00b894, #00a381)';
                
                // Actualizar la lista de ofertas y datos
                await refreshAll();
                
                setTimeout(() => {
                    btn.textContent = '🚀 Enviar oferta/Send offer';
                    btn.style.background = '';
                    btn.disabled = false;
                }, 2000);
            } else {
                btn.textContent = '🚀 Enviar oferta/Send offer';
                btn.style.background = '';
                btn.disabled = false;
            }
        });
    }
    
    // Inicializar
    refreshAll();
});

// =====================================================
// 13. ESCUCHAR CAMBIOS EN TIEMPO REAL
// =====================================================

// Escuchar cambios en la subasta (precio, estado, fecha)
supabaseClient
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
                statusEl.innerHTML = '<span style="color: #00b894;">✅ Subasta activa/Active auction</span>';
                document.getElementById('submitBidBtn').disabled = false;
                document.getElementById('submitBidBtn').textContent = '🚀 Enviar oferta/Active auction';
            } else {
                statusEl.innerHTML = '<span style="color: #e17055;">🔒 Subasta cerrada/Auction closed</span>';
                document.getElementById('submitBidBtn').disabled = true;
                document.getElementById('submitBidBtn').textContent = '🔒 Subasta cerrada/Auction closed';
            }
            
            // Actualizar fecha si cambió
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

// Escuchar nuevas ofertas
supabaseClient
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
            // Recargar ofertas cuando alguien oferte
            loadBids();
            // También recargar datos de la subasta para actualizar el precio
            loadAuctionData();
        }
    )
    .subscribe();