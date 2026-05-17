/* app.js */
const menuData = [
    {
        id: 'original',
        nombre: '1. La Original',
        desc: 'Nuestra torta clásica con nuestra receta original de carnes frías. Incluye aguacate, cebolla morada, tomate, lechuga, queso y mayo.',
        precios: [
            { nombre: '3 Rebanadas', precio: 14 },
            { nombre: '6 Rebanadas', precio: 16 },
            { nombre: '10 Rebanadas', precio: 17 }
        ]
    },
    {
        id: 'pavo',
        nombre: '2. Pavo',
        desc: 'Una opción más ligera pero igual de deliciosa con exquisito jamón de pavo. Incluye vegetales frescos.',
        precios: [
            { nombre: '3 Rebanadas', precio: 14 },
            { nombre: '6 Rebanadas', precio: 16 },
            { nombre: '10 Rebanadas', precio: 17 }
        ]
    },
    {
        id: 'puerco',
        nombre: '3. Puerco',
        desc: 'Para los que buscan un sabor más intenso con nuestro jamón de puerco horneado y vegetales frescos.',
        precios: [
            { nombre: '3 Rebanadas', precio: 14 },
            { nombre: '6 Rebanadas', precio: 16 },
            { nombre: '10 Rebanadas', precio: 17 }
        ]
    }
];

let cart = [];
const phone_number = '12100000000'; // Placeholder para el número de Texas

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

function init() {
    renderMenu();
    setupEventListeners();
}

function renderMenu() {
    menuData.forEach((producto) => {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        let optionsHtml = '';
        producto.precios.forEach(p => {
            optionsHtml += `<option value="${p.precio}">${p.nombre} - $${p.precio}</option>`;
        });

        card.innerHTML = `
            <h3 class="product-title">${producto.nombre}</h3>
            <p class="product-desc">${producto.desc}</p>
            <div class="product-includes">✅ Incluye Chips y Refresco</div>
            <select class="size-selector" id="select-${producto.id}">
                ${optionsHtml}
            </select>
            <button class="add-to-cart" onclick="addToCart('${producto.id}')">Agregar al Pedido</button>
        `;
        menuContainer.appendChild(card);
    });
}

function addToCart(productoId) {
    const producto = menuData.find(p => p.id === productoId);
    const selectEl = document.getElementById(`select-${productoId}`);
    const selectedOption = selectEl.options[selectEl.selectedIndex];
    
    const item = {
        id: Date.now(),
        productoId: producto.id,
        nombre: producto.nombre,
        tamano: selectedOption.text.split(' - ')[0],
        precio: parseFloat(selectedOption.value)
    };

    cart.push(item);
    updateCart();
    
    // Animación simple del carrito
    cartIcon.style.transform = 'scale(1.2)';
    setTimeout(() => cartIcon.style.transform = 'scale(1)', 200);
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
        html += `
            <div class="cart-item">
                <div class="item-details">
                    <h4>${item.nombre}</h4>
                    <p>${item.tamano} (+ Chips & Refresco)</p>
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

    checkoutBtn.addEventListener('click', generarWhatsApp);
}

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

    let total = 0;
    let mensaje = `*NUEVO PEDIDO - TORTAS TORTUGA* 🐢%0A`;
    mensaje += `*Cliente:* ${nombre}%0A`;
    if (telefono) mensaje += `*Teléfono:* ${telefono}%0A`;
    mensaje += `%0A*Orden:*%0A`;

    cart.forEach(item => {
        total += item.precio;
        mensaje += `- 1x ${item.nombre} (${item.tamano}) - $${item.precio}%0A`;
    });

    mensaje += `%0A*TOTAL: $${total.toFixed(2)}*%0A`;
    mensaje += `_Todos los combos incluyen Chips y Refresco._%0A%0A`;
    mensaje += `¿Cómo te gustaría pagar? (Zelle, Cash App o Efectivo al entregar)`;

    const url = `https://wa.me/${phone_number}?text=${mensaje}`;
    
    window.open(url, '_blank');
}

// Iniciar aplicación
init();
