/**
 * ==========================================================================
 * NUMA Beauty & Salon — Interactive Logic & Animation Engine (main.js)
 * Inspired by Phenomenon Studio's NUMA Dribbble showcase.
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  initScrollTelemetry();
  initNavbarScroll();
  initMobileNav();
  initCartDrawer();
  initBookingModal();
  initTreatmentTabs();
  initShopFilters();
  initMagneticButtons();
  initQuickView();
});

/**
 * 1. IntersectionObserver Scroll Reveal Telemetry
 * Automatically triggers .reveal-up, .reveal-scale, and .reveal-fade when entering viewport.
 */
function initScrollTelemetry() {
  const revealElements = document.querySelectorAll('.reveal-up, .reveal-scale, .reveal-fade');
  if (!revealElements.length) return;

  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -80px 0px',
    threshold: 0.15
  };

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        obs.unobserve(entry.target);
      }
    });
  }, observerOptions);

  revealElements.forEach(el => observer.observe(el));
}

/**
 * 2. Floating Navbar Scroll Effect
 */
function initNavbarScroll() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }, { passive: true });
}

/**
 * 3. Mobile Navigation Drawer
 */
function initMobileNav() {
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const closeBtn = document.querySelector('.mobile-nav-close');
  const navDrawer = document.querySelector('.mobile-nav');
  const navLinks = document.querySelectorAll('.mobile-nav a');

  if (!menuBtn || !navDrawer) return;

  menuBtn.addEventListener('click', () => {
    navDrawer.classList.add('open');
    document.body.style.overflow = 'hidden';
  });

  const closeNav = () => {
    navDrawer.classList.remove('open');
    document.body.style.overflow = '';
  };

  if (closeBtn) closeBtn.addEventListener('click', closeNav);
  navLinks.forEach(link => link.addEventListener('click', closeNav));
}

/**
 * 4. E-Commerce Cart Bag Drawer & Logic
 */
let cartItems = [
  {
    id: 'prod-1',
    title: 'Radiance Nectar Serum',
    price: 145,
    qty: 1,
    category: 'Serum',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'prod-2',
    title: 'Hydra-Silk Cellular Creme',
    price: 180,
    qty: 1,
    category: 'Creme',
    image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=600&q=80'
  }
];

function initCartDrawer() {
  const triggers = document.querySelectorAll('.cart-trigger');
  const drawer = document.querySelector('.cart-drawer');
  const overlay = document.querySelector('.cart-overlay');
  const closeBtn = document.querySelector('.drawer-close');

  if (!drawer || !overlay) return;

  const openCart = () => {
    renderCart();
    drawer.classList.add('open');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  const closeCart = () => {
    drawer.classList.remove('open');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  };

  triggers.forEach(t => t.addEventListener('click', (e) => {
    e.preventDefault();
    openCart();
  }));

  if (closeBtn) closeBtn.addEventListener('click', closeCart);
  overlay.addEventListener('click', closeCart);

  // Global Add to Cart listeners
  document.querySelectorAll('.btn-add-cart, .btn-quick-add').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const card = btn.closest('.product-card') || btn.closest('.product-detail-card');
      if (!card) return;

      const id = card.dataset.id || 'prod-custom';
      const title = card.querySelector('.product-title')?.textContent || 'Botanical Elixir';
      const priceText = card.querySelector('.product-price')?.textContent || '₹120';
      const price = parseInt(priceText.replace(/[^0-9]/g, '')) || 120;
      const category = card.querySelector('.product-category')?.textContent || 'Skincare';
      const image = card.querySelector('img')?.src || 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=600&q=80';

      addToBag({ id, title, price, category, image });
      openCart();
    });
  });

  renderCart();
}

function addToBag(product) {
  const existing = cartItems.find(item => item.id === product.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cartItems.push({ ...product, qty: 1 });
  }
  renderCart();
}

function removeFromBag(id) {
  cartItems = cartItems.filter(item => item.id !== id);
  renderCart();
}

function updateQty(id, delta) {
  const item = cartItems.find(i => i.id === id);
  if (item) {
    item.qty += delta;
    if (item.qty <= 0) {
      removeFromBag(id);
    } else {
      renderCart();
    }
  }
}

function renderCart() {
  const container = document.querySelector('.cart-items-list');
  const badge = document.querySelector('.cart-badge');
  const subtotalEl = document.querySelector('.cart-subtotal');

  let totalQty = 0;
  let totalPrice = 0;

  cartItems.forEach(item => {
    totalQty += item.qty;
    totalPrice += item.price * item.qty;
  });

  if (badge) badge.textContent = totalQty;
  if (subtotalEl) subtotalEl.textContent = `₹${totalPrice}`;

  if (!container) return;

  if (cartItems.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
        <p style="font-family: var(--font-display); font-size: 1.25rem; margin-bottom: 8px;">Your bag is empty</p>
        <p style="font-size: 0.9rem;">Discover cellular botanical luxury in our curated skincare boutique.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = cartItems.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <img src="${item.image}" alt="${item.title}" class="cart-item-img">
      <div style="flex-grow: 1;">
        <p style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">${item.category}</p>
        <p style="font-weight: 600; font-size: 0.95rem; margin-bottom: 6px;">${item.title}</p>
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span style="font-weight: 600; color: var(--accent);">₹${item.price}</span>
          <div style="display: flex; align-items: center; gap: 8px; background: var(--bg-surface); padding: 2px 8px; border-radius: var(--radius-full);">
            <button onclick="updateQty('${item.id}', -1)" style="font-size: 1.1rem; padding: 0 4px;">-</button>
            <span style="font-size: 0.85rem; font-weight: 600;">${item.qty}</span>
            <button onclick="updateQty('${item.id}', 1)" style="font-size: 1.1rem; padding: 0 4px;">+</button>
          </div>
        </div>
      </div>
      <button onclick="removeFromBag('${item.id}')" style="color: var(--text-muted); font-size: 1.2rem; padding: 4px;" title="Remove">&times;</button>
    </div>
  `).join('');
}

// Make functions accessible globally for inline onclicks
window.updateQty = updateQty;
window.removeFromBag = removeFromBag;

/**
 * 5. Salon Treatment Booking Wizard Modal (4 Steps)
 */
function initBookingModal() {
  const triggers = document.querySelectorAll('.btn-book-trigger');
  const modal = document.querySelector('.booking-modal');
  const overlay = document.querySelector('.booking-overlay');
  const closeBtn = document.querySelector('.booking-close');

  if (!modal || !overlay) return;

  let currentStep = 1;
  const maxSteps = 4;

  const updateStepView = (step) => {
    document.querySelectorAll('.wizard-step-pane').forEach(pane => {
      pane.style.display = 'none';
    });
    const currentPane = document.querySelector(`.wizard-step-pane[data-step="${step}"]`);
    if (currentPane) currentPane.style.display = 'block';

    document.querySelectorAll('.wizard-step-ind').forEach((ind, idx) => {
      if (idx + 1 <= step) {
        ind.classList.add('active');
      } else {
        ind.classList.remove('active');
      }
    });
  };

  const openBooking = (treatmentTitle) => {
    currentStep = 1;
    updateStepView(currentStep);
    
    // Pre-select treatment if clicked from specific card
    if (treatmentTitle && typeof treatmentTitle === 'string') {
      const selectEl = document.querySelector('#wizard-treatment-select');
      if (selectEl) {
        Array.from(selectEl.options).forEach(opt => {
          if (opt.text.toLowerCase().includes(treatmentTitle.toLowerCase())) {
            selectEl.value = opt.value;
          }
        });
      }
    }

    modal.classList.add('open');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  const closeBooking = () => {
    modal.classList.remove('open');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  };

  triggers.forEach(btn => btn.addEventListener('click', (e) => {
    e.preventDefault();
    const title = btn.dataset.treatment || btn.closest('.treatment-item')?.querySelector('.treatment-title')?.textContent;
    openBooking(title);
  }));

  if (closeBtn) closeBtn.addEventListener('click', closeBooking);
  overlay.addEventListener('click', closeBooking);

  document.querySelectorAll('.btn-wizard-next').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (currentStep < maxSteps) {
        currentStep++;
        updateStepView(currentStep);
      }
    });
  });

  document.querySelectorAll('.btn-wizard-prev').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (currentStep > 1) {
        currentStep--;
        updateStepView(currentStep);
      }
    });
  });
}

/**
 * 6. Treatment Menu Accordion & Category Filtering
 */
function initTreatmentTabs() {
  const tabBtns = document.querySelectorAll('.treatment-tabs .tab-btn');
  const items = document.querySelectorAll('.treatment-item');

  if (!tabBtns.length || !items.length) return;

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.category;

      items.forEach(item => {
        const cat = item.dataset.category;
        if (filter === 'all' || cat === filter) {
          item.style.display = 'flex';
          setTimeout(() => {
            item.style.opacity = '1';
            item.style.transform = 'translateY(0)';
          }, 50);
        } else {
          item.style.opacity = '0';
          item.style.transform = 'translateY(10px)';
          setTimeout(() => {
            item.style.display = 'none';
          }, 250);
        }
      });
    });
  });
}

/**
 * 7. Skincare Shop Category Filtering
 */
function initShopFilters() {
  const filterBtns = document.querySelectorAll('.shop-filter-btn');
  const products = document.querySelectorAll('.shop-grid .product-card');

  if (!filterBtns.length || !products.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const target = btn.dataset.filter;

      products.forEach(prod => {
        const cat = prod.dataset.category;
        if (target === 'all' || cat === target) {
          prod.style.display = 'flex';
          setTimeout(() => prod.style.opacity = '1', 50);
        } else {
          prod.style.opacity = '0';
          setTimeout(() => prod.style.display = 'none', 250);
        }
      });
    });
  });
}

/**
 * 8. Magnetic Hover Effect on Primary CTA Buttons
 */
function initMagneticButtons() {
  const buttons = document.querySelectorAll('.btn-magnetic');
  if (!buttons.length) return;

  buttons.forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) * 0.25;
      const y = (e.clientY - rect.top - rect.height / 2) * 0.25;
      btn.style.transform = `translate(${x}px, ${y}px)`;
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate(0px, 0px)';
    });
  });
}

/**
 * 9. Quick View Product Modal
 */
function initQuickView() {
  const modal = document.querySelector('.quickview-modal');
  const overlay = document.querySelector('.quickview-overlay');
  const closeBtn = document.querySelector('.quickview-close');

  if (!modal || !overlay) return;

  const closeView = () => {
    modal.classList.remove('open');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  };

  if (closeBtn) closeBtn.addEventListener('click', closeView);
  overlay.addEventListener('click', closeView);

  document.querySelectorAll('.product-quick-view').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const card = trigger.closest('.product-card');
      if (!card) return;

      const title = card.querySelector('.product-title')?.textContent || 'Botanical Elixir';
      const price = card.querySelector('.product-price')?.textContent || '₹145';
      const category = card.querySelector('.product-category')?.textContent || 'Skincare';
      const img = card.querySelector('img')?.src || '';

      if (modal.querySelector('.qv-title')) modal.querySelector('.qv-title').textContent = title;
      if (modal.querySelector('.qv-price')) modal.querySelector('.qv-price').textContent = price;
      if (modal.querySelector('.qv-category')) modal.querySelector('.qv-category').textContent = category;
      if (modal.querySelector('.qv-img')) modal.querySelector('.qv-img').src = img;

      modal.classList.add('open');
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  });
}
