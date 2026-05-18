/* app.js */
// Menú ahora es estático. No necesitamos menuData.

let cart = [];
let pendingItem = null;
const phone_number = '2107713679';
const APPS_SCRIPT_URL = 'TU_APPS_SCRIPT_URL'; // ← Pega aqui la URL de tu Google Apps Script
let customerLocationUrl = '';
let customerLocationText = '';
let customerLocationAddress = '';
let currentLocTab = 'gps';
let currentOrderType = 'pickup';

// Usa OpenStreetMap gratuito — sin API Key necesaria

// Elementos del DOM
const menuContainer = document.getElementById('menu-container');
const cartIcon = document.getElementById('cart-icon');
const cartModal = document.getElementById('cart-modal');
const closeCart = document.getElementById('close-cart');
const cartItemsContainer = document.getElementById('cart-items');
const cartCount = document.getElementById('cart-count');
const cartTotal = document.getElementById('cart-total');
const checkoutBtn = document.getElementById('checkout-btn');
const customerNameInput = document.getElementById('customer-name');
const customerPhoneInput = document.getElementById('customer-phone');
const orderTypeRadios = document.getElementsByName('order-type');
const locationSection = document.getElementById('location-section');
const getLocationBtn = document.getElementById('get-location-btn');
const locationStatus = document.getElementById('location-status');
const waitTimeDisplay = document.getElementById('wait-time-display');

// Modal de modificaciones
const modsModal = document.getElementById('mods-modal');
const closeModsBtn = document.getElementById('close-mods');
const modsItemName = document.getElementById('mods-item-name');
const modsSkipBtn = document.getElementById('mods-skip');
const modsConfirmBtn = document.getElementById('mods-confirm');
const modsNotes = document.getElementById('mods-notes');

function init() {
    setupEventListeners();
}

// Menú estático renderizado en HTML

function addToCart(productoId, productoNombre) {
    const selectEl = document.getElementById(`select-${productoId}`);
    const selectedOption = selectEl.options[selectEl.selectedIndex];

    // Guardar item pendiente y abrir modal de modificaciones
    pendingItem = {
        id: Date.now(),
        productoId: productoId,
        nombre: productoNombre,
        tamano: selectedOption.text.split(' - ')[0],
        precio: parseFloat(selectedOption.value),
        modificaciones: []
    };
    abrirModsModal(productoNombre);
}

// Hacerlo disponible globalmente para el onclick del HTML
window.addToCart = addToCart;

function removeFromCart(itemId) {
    cart = cart.filter(item => item.id !== itemId);
    updateCart();
}

window.removeFromCart = removeFromCart;

function updateCart() {
    cartCount.innerText = cart.length;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-cart">Tu carrito está vacío 🥺</p>';
        cartTotal.innerText = '$0.00';
        return;
    }

    let html = '';
    let total = 0;

    cart.forEach(item => {
        total += item.precio;
        const modsHtml = item.modificaciones && item.modificaciones.length > 0
            ? `<p class="item-mods">✏️ ${item.modificaciones.join(' · ')}</p>`
            : '';
        html += `
            <div class="cart-item">
                <div class="item-details">
                    <h4>${item.nombre}</h4>
                    <p>${item.tamano} (+ Chips & Refresco)</p>
                    ${modsHtml}
                    <p><strong>$${item.precio.toFixed(2)}</strong></p>
                </div>
                <button class="remove-btn" onclick="removeFromCart(${item.id})">Quitar</button>
            </div>
        `;
    });

    cartItemsContainer.innerHTML = html;
    cartTotal.innerText = '$' + total.toFixed(2);
}

function setupEventListeners() {
    cartIcon.addEventListener('click', () => {
        cartModal.classList.add('active');
    });

    closeCart.addEventListener('click', () => {
        cartModal.classList.remove('active');
    });

    cartModal.addEventListener('click', (e) => {
        if (e.target === cartModal) {
            cartModal.classList.remove('active');
        }
    });

    orderTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentOrderType = e.target.value;
            if (currentOrderType === 'delivery') {
                locationSection.style.display = 'block';
                waitTimeDisplay.innerHTML = '⏱️ Tiempo estimado: <strong>45 minutos</strong>';
            } else {
                locationSection.style.display = 'none';
                waitTimeDisplay.innerHTML = '⏱️ Tiempo estimado: <strong>20 minutos</strong>';
            }
        });
    });

    getLocationBtn.addEventListener('click', obtenerUbicacion);
    document.getElementById('search-address-btn').addEventListener('click', buscarDireccion);
    document.getElementById('tab-gps').addEventListener('click', () => cambiarTab('gps'));
    document.getElementById('tab-address').addEventListener('click', () => cambiarTab('address'));
    checkoutBtn.addEventListener('click', generarWhatsApp);

    // ── Modal de modificaciones ──
    closeModsBtn.addEventListener('click', cerrarModsModal);
    modsModal.addEventListener('click', (e) => { if (e.target === modsModal) cerrarModsModal(); });
    modsSkipBtn.addEventListener('click', () => confirmarConMods(false));
    modsConfirmBtn.addEventListener('click', () => confirmarConMods(true));

    // Toggle visual de chips
    document.querySelectorAll('.mod-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            chip.classList.toggle('selected');
            const cb = chip.querySelector('input[type="checkbox"]');
            cb.checked = !cb.checked;
        });
    });
}

// ─── MODIFICACIONES ──────────────────────────────────────────────────────────

function abrirModsModal(nombre) {
    modsItemName.textContent = nombre;
    // Resetear selecciones previas
    document.querySelectorAll('.mod-chip').forEach(c => c.classList.remove('selected'));
    document.querySelectorAll('.mod-chip input').forEach(cb => cb.checked = false);
    modsNotes.value = '';
    modsModal.classList.add('active');
}

function cerrarModsModal() {
    modsModal.classList.remove('active');
    pendingItem = null;
}

function confirmarConMods(conMods) {
    if (!pendingItem) return;
    if (conMods) {
        const mods = [];
        document.querySelectorAll('.mod-chip input:checked').forEach(cb => mods.push(cb.value));
        const nota = modsNotes.value.trim();
        if (nota) mods.push(`📝 ${nota}`);
        pendingItem.modificaciones = mods;
    }
    cart.push(pendingItem);
    pendingItem = null;
    modsModal.classList.remove('active');
    updateCart();
    cartIcon.style.transform = 'scale(1.2)';
    setTimeout(() => cartIcon.style.transform = 'scale(1)', 200);
}

// ─── TABS DE UBICACIÓN ───────────────────────────────────────────────────────

function cambiarTab(tab) {
    currentLocTab = tab;
    customerLocationUrl = '';
    customerLocationText = '';
    customerLocationAddress = '';
    const tabGps  = document.getElementById('tab-gps');
    const tabAddr = document.getElementById('tab-address');
    const panelGps  = document.getElementById('panel-gps');
    const panelAddr = document.getElementById('panel-address');
    if (tab === 'gps') {
        tabGps.classList.add('active');   tabAddr.classList.remove('active');
        panelGps.style.display = 'block'; panelAddr.style.display = 'none';
    } else {
        tabAddr.classList.add('active');  tabGps.classList.remove('active');
        panelAddr.style.display = 'block'; panelGps.style.display = 'none';
    }
}

// ─── GEOLOCALIZACIÓN GPS ──────────────────────────────────────────────────────

function obtenerUbicacion() {
    if (!navigator.geolocation) {
        mostrarError('Tu navegador no soporta geolocalización.');
        return;
    }
    getLocationBtn.disabled = true;
    getLocationBtn.textContent = '⏳ Obteniendo ubicación...';
    document.getElementById('location-status').innerHTML = '';

    navigator.geolocation.getCurrentPosition(
        (pos) => mostrarUbicacion(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
        (err) => {
            const mensajes = {
                1: 'Permiso denegado. Habilita la ubicación en tu navegador.',
                2: 'No se pudo determinar la posición. Verifica tu conexión.',
                3: 'Tiempo de espera agotado. Intenta de nuevo.'
            };
            mostrarError(mensajes[err.code] || 'Error al obtener ubicación.');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
}

function mostrarUbicacion(lat, lng, accuracy, etiquetaDireccion) {
    customerLocationUrl = `https://maps.google.com/?q=${lat},${lng}`;
    customerLocationText = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    if (etiquetaDireccion) customerLocationAddress = etiquetaDireccion;

    const precisionTexto = accuracy < 50 ? 'Alta precisión' :
                           accuracy < 200 ? 'Precisión media' : 'Precisión aproximada';
    const delta = 0.003;
    const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
    const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;

    const statusEl = currentLocTab === 'address'
        ? document.getElementById('address-status')
        : document.getElementById('location-status');

    statusEl.innerHTML = `
        <span style="color:#25D366; font-weight:600;">✅ Ubicación confirmada</span><br>
        ${etiquetaDireccion
            ? `<small style="color:var(--text-muted);">${etiquetaDireccion}</small><br>`
            : `<small style="color:var(--text-muted);">${precisionTexto} (±${Math.round(accuracy)}m)</small><br>`
        }
        <a href="${customerLocationUrl}" target="_blank"
           style="color:var(--primary); font-size:0.85rem; text-decoration:none; display:inline-block; margin:0.25rem 0;">
           📍 Abrir en Google Maps ↗
        </a>
        <iframe
            src="${mapSrc}"
            title="Mapa de ubicación"
            style="width:100%; height:160px; border-radius:10px; margin-top:0.5rem;
                   border:1px solid rgba(255,255,255,0.15); display:block;"
            loading="lazy" allowfullscreen
        ></iframe>
    `;

    if (currentLocTab === 'gps') {
        getLocationBtn.textContent = '📍 Actualizar ubicación';
        getLocationBtn.disabled = false;
    }
}

function mostrarError(msg) {
    const statusEl = currentLocTab === 'address'
        ? document.getElementById('address-status')
        : document.getElementById('location-status');
    statusEl.innerHTML = `<span style="color:#ff4444">${msg}</span>`;
    getLocationBtn.textContent = '📍 Obtener mi ubicación actual';
    getLocationBtn.disabled = false;
}

// ─── BÚSQUEDA DE DIRECCIÓN — OpenStreetMap Nominatim (gratis, sin API key) ────────

async function buscarDireccion() {
    const street = document.getElementById('addr-street').value.trim();
    const apt    = document.getElementById('addr-apt').value.trim();
    const city   = document.getElementById('addr-city').value.trim() || 'San Antonio';
    const zip    = document.getElementById('addr-zip').value.trim();
    const statusEl = document.getElementById('address-status');
    const searchBtn = document.getElementById('search-address-btn');

    if (!street) {
        statusEl.innerHTML = '<span style="color:#ff4444">⚠️ Ingresa tu calle y número primero.</span>';
        return;
    }

    const query = [street, apt, city, 'TX', zip, 'USA'].filter(Boolean).join(', ');
    const apiUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=3&countrycodes=us&addressdetails=1`;

    searchBtn.disabled = true;
    searchBtn.textContent = '⏳ Buscando...';
    statusEl.innerHTML = '';

    try {
        const res = await fetch(apiUrl, { headers: { 'Accept-Language': 'es' } });
        const results = await res.json();

        if (!results.length) {
            statusEl.innerHTML = `<span style="color:#ff4444">❌ No encontramos esa dirección.</span><br>
                <small style="color:var(--text-muted)">Revisa el ZIP o la ortografía.</small>`;
        } else if (results.length === 1) {
            seleccionarDireccion(results[0].lat, results[0].lon, results[0].display_name);
        } else {
            // Mostrar lista de opciones si hay más de 1 resultado
            let optsHtml = '<p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.4rem">¿Cuál es tu dirección?</p>';
            results.forEach(r => {
                const name = r.display_name.replace(/"/g, '&quot;');
                optsHtml += `<button type="button" onclick="seleccionarDireccion('${r.lat}','${r.lon}','${name}')"
                    style="display:block;width:100%;text-align:left;background:rgba(255,255,255,0.05);
                    border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:0.5rem 0.75rem;
                    color:var(--text-muted);font-family:inherit;font-size:0.82rem;cursor:pointer;margin-bottom:0.4rem;">
                    📍 ${r.display_name}
                </button>`;
            });
            statusEl.innerHTML = optsHtml;
        }
    } catch (e) {
        statusEl.innerHTML = '<span style="color:#ff4444">Error de conexión. Intenta de nuevo.</span>';
    }

    searchBtn.disabled = false;
    searchBtn.textContent = '🔍 Buscar mi Dirección';
}

function seleccionarDireccion(lat, lng, displayName) {
    mostrarUbicacion(parseFloat(lat), parseFloat(lng), 150, displayName);
}
window.seleccionarDireccion = seleccionarDireccion;

function generarWhatsApp() {
    const nombre = customerNameInput.value.trim();
    const telefono = customerPhoneInput.value.trim();
    if (!nombre) {
        alert('Por favor, ingresa tu nombre para el pedido.');
        customerNameInput.focus();
        return;
    }

    if (cart.length === 0) {
        alert('Agrega al menos una torta a tu pedido.');
        return;
    }

    if (currentOrderType === 'delivery' && !customerLocationUrl) {
        const confirmar = confirm('Aún no has compartido tu ubicación. ¿Quieres continuar sin enviarla? (Recomendamos enviarla para que el repartidor sepa a dónde ir)');
        if (!confirmar) return;
    }

    let total = 0;
    let mensaje = `*NUEVO PEDIDO - TORTAS TORTUGA* 🐢%0A`;
    mensaje += `*Cliente:* ${nombre}%0A`;
    if (telefono) mensaje += `*Teléfono:* ${telefono}%0A`;

    const tipoTexto = currentOrderType === 'delivery' ? 'Entrega a Domicilio' : 'Recoger en Tienda';
    const tiempoEspera = currentOrderType === 'delivery' ? '45 minutos' : '20 minutos';
    mensaje += `*Tipo:* ${tipoTexto}%0A`;
    mensaje += `*Tiempo Estimado:* ${tiempoEspera}%0A`;

    if (currentOrderType === 'delivery' && customerLocationUrl) {
        if (customerLocationAddress) {
            mensaje += `*🏠 Dirección:* ${customerLocationAddress}%0A`;
        }
        mensaje += `*📍 Mapa:* ${customerLocationUrl}%0A`;
        if (!customerLocationAddress && customerLocationText) {
            mensaje += `*Coordenadas:* ${customerLocationText}%0A`;
        }
    }

    mensaje += `%0A*Orden:*%0A`;

    cart.forEach(item => {
        total += item.precio;
        mensaje += `- 1x ${item.nombre} (${item.tamano}) - $${item.precio}%0A`;
        if (item.modificaciones && item.modificaciones.length > 0) {
            mensaje += `  ✏️ Mods: ${item.modificaciones.join(', ')}%0A`;
        }
    });

    mensaje += `%0A*TOTAL: $${total.toFixed(2)}*%0A`;
    mensaje += `_Todos los combos incluyen Chips y Refresco._%0A%0A`;

    if (currentOrderType === 'delivery') {
        mensaje += `%0A⚡ *Para rastreo en tiempo real:* por favor comparte tu *Ubicación en Vivo* por WhatsApp después de enviar este mensaje 📲%0A`;
    }

    mensaje += `¿Cómo te gustaría pagar? (Zelle, Cash App o Efectivo al entregar)`;

    const url = `https://wa.me/${phone_number}?text=${mensaje}`;

    // ─── GUARDAR EN BASE DE DATOS (Google Sheets) ────────────────────────
    if (APPS_SCRIPT_URL !== 'TU_APPS_SCRIPT_URL') {
        // Construir lista de items legible
        const itemsTexto = cart.map(item => {
            let linea = `${item.nombre} (${item.tamano}) $${item.precio}`;
            if (item.modificaciones && item.modificaciones.length > 0) {
                linea += ` | Mods: ${item.modificaciones.join(', ')}`;
            }
            return linea;
        }).join('\n');

        const orderData = {
            nombre:    nombre,
            telefono:  telefono,
            tipo:      currentOrderType === 'delivery' ? 'Entrega a Domicilio' : 'Recoger en Tienda',
            items:     itemsTexto,
            total:     `$${total.toFixed(2)}`,
            ubicacion: customerLocationAddress || customerLocationUrl || 'No especificada'
        };

        guardarPedidoEnDB(orderData);
    }
    // ────────────────────────────────────────────────────────────────

    window.open(url, '_blank');
}

// ─── GUARDAR PEDIDO EN GOOGLE SHEETS ──────────────────────────────────
async function guardarPedidoEnDB(data) {
    try {
        await fetch(APPS_SCRIPT_URL, {
            method:  'POST',
            mode:    'no-cors', // Necesario para Google Apps Script
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(data)
        });
        console.log('✅ Pedido guardado en base de datos');
    } catch(e) {
        console.warn('⚠️ No se pudo guardar en DB:', e);
    }
}

// Iniciar aplicación
init();
