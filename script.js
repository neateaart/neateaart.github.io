// ===== DATOS DE IMÁGENES (cambia por tus URLs) =====
const images = [
    'https://via.placeholder.com/600x600/ff6b6b/fff?text=Obra+1',
    'https://via.placeholder.com/600x600/4ecdc4/fff?text=Obra+2',
    'https://via.placeholder.com/600x600/45b7d1/fff?text=Obra+3',
    'https://via.placeholder.com/600x600/f9ca24/fff?text=Obra+4',
    'https://via.placeholder.com/600x600/a29bfe/fff?text=Obra+5',
    'https://via.placeholder.com/600x600/fd79a8/fff?text=Obra+6',
    'https://via.placeholder.com/600x600/00b894/fff?text=Obra+7',
    'https://via.placeholder.com/600x600/e17055/fff?text=Obra+8',
    'https://via.placeholder.com/600x600/0984e3/fff?text=Obra+9',
    'https://via.placeholder.com/600x600/fdcb6e/fff?text=Obra+10',
    'https://via.placeholder.com/600x600/6c5ce7/fff?text=Obra+11',
    'https://via.placeholder.com/600x600/00cec9/fff?text=Obra+12',
];

// ===== RENDERIZAR GALERÍA =====
const grid = document.getElementById('galleryGrid');
if (grid) {
    images.forEach((url) => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.innerHTML = `<img src="${url}" alt="Obra de arte" loading="lazy" />`;
        grid.appendChild(item);
    });
}

// ===== LIGHTBOX =====
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const closeBtn = document.getElementById('closeLightbox');

// Delegación de eventos: clic en cualquier .gallery-item
document.addEventListener('click', (e) => {
    const item = e.target.closest('.gallery-item');
    if (!item) return;
    const img = item.querySelector('img');
    if (img) {
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt || 'Ampliada';
        lightbox.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
});

// Cerrar con botón
if (closeBtn) {
    closeBtn.addEventListener('click', cerrarLightbox);
}

// Cerrar haciendo clic fuera de la imagen
lightbox?.addEventListener('click', (e) => {
    if (e.target === lightbox) cerrarLightbox();
});

// Cerrar con tecla ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrarLightbox();
});

function cerrarLightbox() {
    lightbox?.classList.remove('show');
    document.body.style.overflow = '';
}