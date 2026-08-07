// ===== DATOS DE EJEMPLO =====
let bids = [
    // Formato: { name: 'Ana', email: 'ana@mail.com', amount: 100 }
];

// ===== ELEMENTOS DEL DOM =====
const bidsList = document.getElementById('bidsList');
const bidForm = document.getElementById('bidForm');
const artPrice = document.querySelector('.art-price strong');
const artBids = document.querySelector('.art-bids strong');

// ===== ACTUALIZAR LISTA DE OFERTAS =====
function updateBidsList() {
    if (!bidsList) return;

    // Ordenar ofertas de mayor a menor
    const sortedBids = [...bids].sort((a, b) => b.amount - a.amount);

    if (sortedBids.length === 0) {
        bidsList.innerHTML = `
            <div class="bid-empty">
                <p>No hay ofertas aún. ¡Sé el primero!</p>
            </div>
        `;
        return;
    }

    // Generar HTML para cada oferta
    bidsList.innerHTML = sortedBids.map((bid, index) => `
        <div class="bid-item">
            <div class="bidder-info">
                <span class="bidder-name">${bid.name}</span>
                <span class="bidder-email">${bid.email}</span>
            </div>
            <span class="bid-amount">$${bid.amount}</span>
        </div>
    `).join('');

    // Actualizar stats
    if (artPrice) {
        const highestBid = sortedBids[0];
        artPrice.textContent = `$${highestBid.amount} USD`;
    }
    if (artBids) {
        artBids.textContent = bids.length;
    }
}

// ===== AÑADIR NUEVA OFERTA =====
function addBid(name, email, amount) {
    // Validar que la oferta sea mayor que la actual
    const highestBid = bids.reduce((max, bid) => Math.max(max, bid.amount), 0);
    
    if (amount <= highestBid && bids.length > 0) {
        alert(`⚠️ La oferta debe ser mayor a $${highestBid} USD`);
        return false;
    }

    // Agregar oferta
    bids.push({ name, email, amount });
    updateBidsList();
    return true;
}

// ===== MANEJAR ENVÍO DEL FORMULARIO =====
if (bidForm) {
    bidForm.addEventListener('submit', (e) => {
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

        // Agregar oferta
        const success = addBid(name, email, amount);

        if (success) {
            // Limpiar formulario
            bidForm.reset();
            
            // Feedback visual
            const btn = bidForm.querySelector('.btn-submit-bid');
            const originalText = btn.textContent;
            btn.textContent = '✅ ¡Oferta enviada!';
            btn.style.background = 'linear-gradient(135deg, #00b894, #00a381)';
            
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '';
            }, 2000);
        }
    });
}

// ===== DATOS DE EJEMPLO INICIALES =====
// (opcional, descomentar para tener ofertas de ejemplo)
/*
bids = [
    { name: 'Carlos Méndez', email: 'carlos@mail.com', amount: 150 },
    { name: 'Laura Rivera', email: 'laura@mail.com', amount: 120 },
    { name: 'Miguel Torres', email: 'miguel@mail.com', amount: 100 },
];
updateBidsList();
*/

// ===== INICIALIZAR =====
updateBidsList();