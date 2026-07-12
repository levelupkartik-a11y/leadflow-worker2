/**
 * Aura Dental & Wellness Co.
 * Interactive Animation & Logic Engine (Stitch MCP + Seattle Dental Co Inspired)
 */

document.addEventListener('DOMContentLoaded', () => {
  initTypedAnimation();
  initScrollObserver();
  initStickyHeader();
  initMobileMenu();
  initAccordions();
  initTestimonialSlider();
  initDropdownMobile();
  initBookingForm();
});

/**
 * 1. DYNAMIC TYPED ROOT CYCLING ANIMATION
 * Inspired by Seattle Dental Co's "CO-operative, CO-smetic, CO-mprehensive..." hero text animation.
 * Smoothly types out and erases suffixes attached to a root prefix.
 */
function initTypedAnimation() {
  const suffixElement = document.querySelector('.typed-suffix');
  if (!suffixElement) return;

  // Words to cycle through that attach to the "CO-" root prefix
  const words = [
    "operative Dentistry",
    "smetic Makeovers",
    "mprehensive Care",
    "mfortable Treatment",
    "llaborative Health",
    "nfident Smiles"
  ];

  let wordIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let typingSpeed = 70;

  function typeStep() {
    const currentWord = words[wordIndex];

    if (isDeleting) {
      // Erase characters
      charIndex--;
      typingSpeed = 35; // Erase faster
    } else {
      // Type characters
      charIndex++;
      typingSpeed = 70;
    }

    suffixElement.textContent = currentWord.substring(0, charIndex);

    // If word is completely typed out
    if (!isDeleting && charIndex === currentWord.length) {
      isDeleting = true;
      typingSpeed = 2600; // Pause at end before erasing
    } 
    // If word is completely erased
    else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      wordIndex = (wordIndex + 1) % words.length;
      typingSpeed = 400; // Pause before typing next word
    }

    setTimeout(typeStep, typingSpeed);
  }

  // Start typing loop after slight delay
  setTimeout(typeStep, 600);
}

/**
 * 2. SCROLL REVEAL OBSERVER
 * Uses IntersectionObserver with custom cubic-bezier curves for smooth, staggered reveals.
 */
function initScrollObserver() {
  const revealElements = document.querySelectorAll('.reveal-up, .reveal-fade');
  if (revealElements.length === 0) return;

  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -60px 0px',
    threshold: 0.12
  };

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        // Unobserve after revealing to prevent re-triggering jank
        obs.unobserve(entry.target);
      }
    });
  }, observerOptions);

  revealElements.forEach(el => observer.observe(el));
}

/**
 * 3. STICKY HEADER & ELEVATION TOGGLE
 */
function initStickyHeader() {
  const header = document.querySelector('.header');
  if (!header) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header.classList.add('is-scrolled');
    } else {
      header.classList.remove('is-scrolled');
    }
  }, { passive: true });
}

/**
 * 4. MOBILE MENU DRAWER
 */
function initMobileMenu() {
  const toggleBtn = document.querySelector('.menu-toggle');
  const navMenu = document.querySelector('.nav-menu');
  const navLinks = document.querySelectorAll('.nav-link');

  if (!toggleBtn || !navMenu) return;

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleBtn.classList.toggle('is-active');
    navMenu.classList.toggle('is-open');
    document.body.style.overflow = navMenu.classList.contains('is-open') ? 'hidden' : '';
  });

  // Close menu & set active state when clicking a navigation link
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      if (navMenu.classList.contains('is-open')) {
        toggleBtn.classList.remove('is-active');
        navMenu.classList.remove('is-open');
        document.body.style.overflow = '';
      }
    });
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (navMenu.classList.contains('is-open') && !navMenu.contains(e.target) && !toggleBtn.contains(e.target)) {
      toggleBtn.classList.remove('is-active');
      navMenu.classList.remove('is-open');
      document.body.style.overflow = '';
    }
  });
}

/**
 * 5. INTERACTIVE ACCORDION / FAQ
 */
function initAccordions() {
  const accordionHeaders = document.querySelectorAll('.accordion-header');
  if (accordionHeaders.length === 0) return;

  accordionHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const currentItem = header.parentElement;
      const isActive = currentItem.classList.contains('is-active');

      // Optional: Close other open accordions in the same container for clean UX
      const parentContainer = currentItem.parentElement;
      parentContainer.querySelectorAll('.accordion-item.is-active').forEach(item => {
        if (item !== currentItem) {
          item.classList.remove('is-active');
        }
      });

      // Toggle current item
      if (isActive) {
        currentItem.classList.remove('is-active');
      } else {
        currentItem.classList.add('is-active');
      }
    });
  });
}

/**
 * 6. TESTIMONIAL CAROUSEL / SLIDER
 */
function initTestimonialSlider() {
  const track = document.querySelector('.testimonial-track');
  const prevBtn = document.querySelector('.slider-prev');
  const nextBtn = document.querySelector('.slider-next');
  const cards = document.querySelectorAll('.testimonial-card');

  if (!track || cards.length === 0) return;

  let currentIndex = 0;
  const totalSlides = cards.length;
  let autoPlayTimer = null;

  function goToSlide(index) {
    if (index < 0) {
      currentIndex = totalSlides - 1;
    } else if (index >= totalSlides) {
      currentIndex = 0;
    } else {
      currentIndex = index;
    }

    track.style.transform = `translateX(-${currentIndex * 100}%)`;
  }

  function startAutoPlay() {
    stopAutoPlay();
    autoPlayTimer = setInterval(() => {
      goToSlide(currentIndex + 1);
    }, 6500);
  }

  function stopAutoPlay() {
    if (autoPlayTimer) clearInterval(autoPlayTimer);
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      stopAutoPlay();
      goToSlide(currentIndex - 1);
      startAutoPlay();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      stopAutoPlay();
      goToSlide(currentIndex + 1);
      startAutoPlay();
    });
  }

  // Touch Swipe Support for Mobile
  let startX = 0;
  let endX = 0;

  track.addEventListener('touchstart', (e) => {
    stopAutoPlay();
    startX = e.touches[0].clientX;
  }, { passive: true });

  track.addEventListener('touchend', (e) => {
    endX = e.changedTouches[0].clientX;
    const diffX = startX - endX;

    if (Math.abs(diffX) > 50) {
      if (diffX > 0) {
        goToSlide(currentIndex + 1); // Swipe left -> next
      } else {
        goToSlide(currentIndex - 1); // Swipe right -> prev
      }
    }
    startAutoPlay();
  }, { passive: true });

  startAutoPlay();
}

/**
 * 7. DROPDOWN MENU FOR MOBILE
 */
function initDropdownMobile() {
  const dropdownWraps = document.querySelectorAll('.dropdown-wrap');
  if (window.innerWidth <= 768) {
    dropdownWraps.forEach(wrap => {
      const link = wrap.querySelector('.nav-link');
      if (link) {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          wrap.classList.toggle('is-open');
        });
      }
    });
  }
}

/**
 * 8. APPOINTMENT RESERVATION FORM HANDLER
 */
function initBookingForm() {
  const form = document.getElementById('bookingForm');
  const successMessage = document.getElementById('formSuccess');
  
  if (!form || !successMessage) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    form.style.display = 'none';
    successMessage.style.display = 'block';
    successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}
