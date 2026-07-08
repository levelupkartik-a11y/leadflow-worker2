/* ==========================================================================
   NŪMA Beauty & Salon — Interactive JavaScript Logic
   Handles dynamic text cycling, scroll reveals, bag drawer, booking modal,
   and testimonials carousel inspired by Seattle Dental Co.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initScrollReveal();
  initStickyNavbar();
  initTypedText();
  initTestimonialsSlider();
  initShoppingBagDrawer();
  initBookingModal();
  initMobileMenu();
  initAccordions();
  initCategoryFilters();
  initProductGallery();
});

/* --------------------------------------------------------------------------
   1. Scroll Reveal Observer (Fade In & Slide Up)
   -------------------------------------------------------------------------- */
function initScrollReveal() {
  const revealElements = document.querySelectorAll('.reveal-on-scroll');
  
  if (!('IntersectionObserver' in window)) {
    revealElements.forEach(el => el.classList.add('is-revealed'));
    return;
  }

  const observer = new IntersectionObserver((entries, observerInstance) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        observerInstance.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  });

  revealElements.forEach(el => observer.observe(el));
}

/* --------------------------------------------------------------------------
   2. Sticky Glassmorphic Navbar
   -------------------------------------------------------------------------- */
function initStickyNavbar() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }, { passive: true });
}

/* --------------------------------------------------------------------------
   3. Dynamic Text Cycling (Hero Headline)
   -------------------------------------------------------------------------- */
function initTypedText() {
  const typedTarget = document.getElementById('typed-words');
  if (!typedTarget) return;

  const words = [
    'daily ritual.',
    'glowing skin.',
    'calm spirit.',
    'pure radiance.',
    'mindful beauty.'
  ];

  let wordIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let typeSpeed = 80;

  function type() {
    const currentWord = words[wordIndex];
    
    if (isDeleting) {
      typedTarget.textContent = currentWord.substring(0, charIndex - 1);
      charIndex--;
      typeSpeed = 40;
    } else {
      typedTarget.textContent = currentWord.substring(0, charIndex + 1);
      charIndex++;
      typeSpeed = 80;
    }

    if (!isDeleting && charIndex === currentWord.length) {
      typeSpeed = 2200; // Pause at end of word
      isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      wordIndex = (wordIndex + 1) % words.length;
      typeSpeed = 400; // Pause before typing next word
    }

    setTimeout(type, typeSpeed);
  }

  setTimeout(type, 1000);
}

/* --------------------------------------------------------------------------
   4. Testimonials Slider (Seattle Dental Co Inspired)
   -------------------------------------------------------------------------- */
function initTestimonialsSlider() {
  const track = document.getElementById('testimonials-track');
  if (!track) return;

  const slides = track.querySelectorAll('.testimonial-slide');
  const dots = document.querySelectorAll('.slider-dot');
  const prevBtn = document.getElementById('slider-prev');
  const nextBtn = document.getElementById('slider-next');
  
  if (slides.length === 0) return;

  let currentIndex = 0;
  let autoPlayTimer;

  function goToSlide(index) {
    if (index < 0) index = slides.length - 1;
    if (index >= slides.length) index = 0;
    
    currentIndex = index;
    track.style.transform = `translateX(-${currentIndex * 100}%)`;

    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentIndex);
    });
  }

  if (prevBtn) prevBtn.addEventListener('click', () => {
    goToSlide(currentIndex - 1);
    resetAutoPlay();
  });

  if (nextBtn) nextBtn.addEventListener('click', () => {
    goToSlide(currentIndex + 1);
    resetAutoPlay();
  });

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      goToSlide(i);
      resetAutoPlay();
    });
  });

  function startAutoPlay() {
    autoPlayTimer = setInterval(() => {
      goToSlide(currentIndex + 1);
    }, 6000);
  }

  function resetAutoPlay() {
    clearInterval(autoPlayTimer);
    startAutoPlay();
  }

  // Touch Swipe Support
  let touchStartX = 0;
  let touchEndX = 0;

  track.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
    clearInterval(autoPlayTimer);
  }, { passive: true });

  track.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
    startAutoPlay();
  }, { passive: true });

  function handleSwipe() {
    if (touchStartX - touchEndX > 50) {
      goToSlide(currentIndex + 1);
    } else if (touchEndX - touchStartX > 50) {
      goToSlide(currentIndex - 1);
    }
  }

  startAutoPlay();
}

/* --------------------------------------------------------------------------
   5. Shopping Bag Drawer & Cart State
   -------------------------------------------------------------------------- */
let bagItems = [
  {
    id: 'oil-1',
    name: 'Radiance Ritual Face Oil',
    price: 85,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDYmqeCvEkFzyHLBBvNp7k9z7qkWrOohSw84R1RK4QbPWHztCwy6GiFsJRH8x-za_6LZB8hMFtiRaDcVWkx9ZQROdAvUDZQxq7jF91uv1_i_Q3_fHVjDxeFvoNIWmk7u_SIIO-G6hkqHDqDcEJ2WxZt2z0DkdNati1JhpC7gxNLKFnAJCIZ5rR_rqdOSecaiFh03KShsKAYR-BnCJ2Ya2BGW5cRef1nKX8j3JhQigszF1hgPhcKCScj8dIywKESjfX6x9ZgsgbfJ9o',
    qty: 1
  }
];

function initShoppingBagDrawer() {
  const bagBtn = document.getElementById('open-bag-btn');
  const bagDrawer = document.getElementById('bag-drawer');
  const bagClose = document.getElementById('close-bag-btn');
  const overlay = document.getElementById('main-overlay');
  const bagBadge = document.getElementById('bag-badge-count');
  const bagList = document.getElementById('bag-items-list');
  const bagTotal = document.getElementById('bag-subtotal-val');

  function updateBagUI() {
    if (!bagList || !bagTotal || !bagBadge) return;

    const count = bagItems.reduce((acc, item) => acc + item.qty, 0);
    bagBadge.textContent = count;
    if (count > 0) {
      bagBadge.style.display = 'flex';
      bagBadge.classList.add('pulse');
      setTimeout(() => bagBadge.classList.remove('pulse'), 300);
    } else {
      bagBadge.style.display = 'none';
    }

    if (bagItems.length === 0) {
      bagList.innerHTML = `<div style="text-align:center; padding: 48px 0; color: var(--secondary);">Your ritual bag is empty.</div>`;
      bagTotal.textContent = `$0.00`;
      return;
    }

    let subtotal = 0;
    bagList.innerHTML = bagItems.map((item, index) => {
      subtotal += item.price * item.qty;
      return `
        <div class="bag-item">
          <img src="${item.image}" alt="${item.name}" class="bag-item-img" />
          <div class="bag-item-details">
            <div>
              <h4 style="font-size: 0.9375rem; font-weight: 600; color: var(--primary);">${item.name}</h4>
              <p style="font-size: 0.875rem; color: var(--secondary);">$${item.price}.00 x ${item.qty}</p>
            </div>
            <button class="bag-item-remove" onclick="removeBagItem(${index})">Remove</button>
          </div>
        </div>
      `;
    }).join('');

    bagTotal.textContent = `$${subtotal}.00`;
  }

  window.removeBagItem = function(index) {
    bagItems.splice(index, 1);
    updateBagUI();
  };

  window.addToBag = function(name, price, image) {
    const existing = bagItems.find(item => item.name === name);
    if (existing) {
      existing.qty += 1;
    } else {
      bagItems.push({ id: 'item-' + Date.now(), name, price, image, qty: 1 });
    }
    updateBagUI();
    showToast(`Added ${name} to bag`);
    openBag();
  };

  function openBag() {
    if (bagDrawer) bagDrawer.classList.add('active');
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeBag() {
    if (bagDrawer) bagDrawer.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (bagBtn) bagBtn.addEventListener('click', e => {
    e.preventDefault();
    openBag();
  });

  if (bagClose) bagClose.addEventListener('click', closeBag);
  if (overlay) overlay.addEventListener('click', () => {
    closeBag();
    closeModal();
    closeMobileMenu();
  });

  // Attach quick add triggers
  document.querySelectorAll('.js-add-to-bag').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      e.preventDefault();
      const name = btn.getAttribute('data-name');
      const price = parseInt(btn.getAttribute('data-price'), 10);
      const img = btn.getAttribute('data-img');
      window.addToBag(name, price, img);
    });
  });

  updateBagUI();
}

/* --------------------------------------------------------------------------
   6. Booking Modal (Seattle Dental Co Inspired)
   -------------------------------------------------------------------------- */
function initBookingModal() {
  const bookingModal = document.getElementById('booking-modal');
  const closeBtn = document.getElementById('close-booking-btn');
  const overlay = document.getElementById('main-overlay');
  const form = document.getElementById('booking-form');
  const triggers = document.querySelectorAll('.js-open-booking');

  window.openModal = function(serviceName = '') {
    if (!bookingModal) return;
    bookingModal.classList.add('active');
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    const serviceSelect = document.getElementById('booking-service');
    if (serviceSelect && serviceName) {
      serviceSelect.value = serviceName;
    }
  };

  window.closeModal = function() {
    if (!bookingModal) return;
    bookingModal.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  };

  triggers.forEach(trigger => {
    trigger.addEventListener('click', e => {
      e.preventDefault();
      const service = trigger.getAttribute('data-service') || '';
      window.openModal(service);
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', window.closeModal);

  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      form.innerHTML = `
        <div style="text-align: center; padding: 40px 0;">
          <span class="material-symbols-outlined" style="font-size: 48px; color: var(--primary); margin-bottom: 16px;">check_circle</span>
          <h3 class="headline-md" style="margin-bottom: 12px; color: var(--primary);">Ritual Reserved</h3>
          <p class="body-md" style="color: var(--on-surface-variant); margin-bottom: 24px;">
            We have received your appointment request and will send a confirmation email shortly. We look forward to welcoming you to NŪMA.
          </p>
          <button type="button" class="btn btn-primary" onclick="closeModal()">Return to Site</button>
        </div>
      `;
    });
  }
}

/* --------------------------------------------------------------------------
   7. Mobile Menu Drawer
   -------------------------------------------------------------------------- */
function initMobileMenu() {
  const toggleBtn = document.getElementById('mobile-menu-btn');
  const mobileDrawer = document.getElementById('mobile-drawer');
  const closeBtn = document.getElementById('close-mobile-btn');
  const overlay = document.getElementById('main-overlay');

  function openMenu() {
    if (mobileDrawer) mobileDrawer.classList.add('active');
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  window.closeMobileMenu = function() {
    if (mobileDrawer) mobileDrawer.classList.remove('active');
    if (overlay && !document.getElementById('bag-drawer')?.classList.contains('active')) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  };

  if (toggleBtn) toggleBtn.addEventListener('click', openMenu);
  if (closeBtn) closeBtn.addEventListener('click', window.closeMobileMenu);
}

/* --------------------------------------------------------------------------
   8. Accordions (Product Detail & FAQ)
   -------------------------------------------------------------------------- */
function initAccordions() {
  const items = document.querySelectorAll('.accordion-item');
  items.forEach(item => {
    const header = item.querySelector('.accordion-header');
    const content = item.querySelector('.accordion-content');
    if (!header || !content) return;

    header.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      
      // Close others (optional)
      items.forEach(other => {
        other.classList.remove('active');
        const otherContent = other.querySelector('.accordion-content');
        if (otherContent) otherContent.style.maxHeight = null;
      });

      if (!isActive) {
        item.classList.add('active');
        content.style.maxHeight = content.scrollHeight + 'px';
      }
    });
  });
}

/* --------------------------------------------------------------------------
   9. Category Filter Tabs (Shop & Rituals)
   -------------------------------------------------------------------------- */
function initCategoryFilters() {
  const tabs = document.querySelectorAll('.filter-tab');
  const cards = document.querySelectorAll('.filterable-card');
  if (tabs.length === 0 || cards.length === 0) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const filter = tab.getAttribute('data-filter');

      cards.forEach(card => {
        const category = card.getAttribute('data-category');
        if (filter === 'all' || category === filter) {
          card.style.display = '';
          card.style.opacity = '0';
          setTimeout(() => { card.style.opacity = '1'; }, 50);
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

/* --------------------------------------------------------------------------
   10. Product Detail Image Gallery
   -------------------------------------------------------------------------- */
function initProductGallery() {
  const mainImg = document.getElementById('main-gallery-img');
  const thumbs = document.querySelectorAll('.gallery-thumb');
  if (!mainImg || thumbs.length === 0) return;

  thumbs.forEach(thumb => {
    thumb.addEventListener('click', () => {
      const src = thumb.getAttribute('data-src');
      mainImg.style.opacity = '0.5';
      setTimeout(() => {
        mainImg.src = src;
        mainImg.style.opacity = '1';
      }, 200);

      thumbs.forEach(t => t.style.borderColor = 'transparent');
      thumb.style.borderColor = 'var(--primary)';
    });
  });
}

/* --------------------------------------------------------------------------
   11. Toast Notification Helper
   -------------------------------------------------------------------------- */
function showToast(message) {
  let toast = document.getElementById('global-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span class="material-symbols-outlined">spa</span><span>${message}</span>`;
  toast.classList.add('active');

  setTimeout(() => {
    toast.classList.remove('active');
  }, 3500);
}
