/* Main JavaScript Logic for Premium Real Estate Landing Page */

document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. Header Scroll Animation
    // ==========================================
    const header = document.getElementById('main-header');
    
    const handleScroll = () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Trigger immediately in case page is refreshed while scrolled down
    
    // ==========================================
    // 2. Hero Background Slideshow
    // ==========================================
    const slides = document.querySelectorAll('.hero-slide');
    let currentSlide = 0;
    
    const nextSlide = () => {
        if (slides.length <= 1) return;
        
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
    };
    
    setInterval(nextSlide, 6000);
    
    // ==========================================
    // 3. Scroll Reveal via Intersection Observer
    // ==========================================
    const revealElements = document.querySelectorAll('.scroll-reveal');
    
    if ('IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    // Stop observing once revealed to maintain state
                    observer.unobserve(entry.target);
                }
            });
        }, {
            root: null, // Viewport
            threshold: 0.1, // Trigger when 10% of element is visible
            rootMargin: '0px 0px -40px 0px' // Offset trigger point slightly
        });
        
        revealElements.forEach(el => revealObserver.observe(el));
    } else {
        // Fallback for older browsers
        revealElements.forEach(el => el.classList.add('revealed'));
    }
    
    // ==========================================
    // 4. Quick Search Tab Sliding Marker
    // ==========================================
    const tabs = document.querySelectorAll('.search-tab');
    const underline = document.getElementById('tab-underline');
    
    const updateTabUnderline = (activeTab) => {
        if (!underline || !activeTab) return;
        
        const tabWidth = activeTab.offsetWidth;
        const tabLeft = activeTab.offsetLeft;
        
        underline.style.width = `${tabWidth}px`;
        underline.style.transform = `translateX(${tabLeft}px)`;
    };
    
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            // Update active state classes on tabs
            tabs.forEach(t => {
                t.classList.remove('active', 'text-ink');
                t.classList.add('text-ink/50');
            });
            
            tab.classList.add('active', 'text-ink');
            tab.classList.remove('text-ink/50');
            
            // Slide the underline
            updateTabUnderline(tab);
        });
    });
    
    // Initialize underline position on load
    const activeTab = document.querySelector('.search-tab.active');
    if (activeTab) {
        // Wrap in timeout to ensure offsetWidth is populated correctly after layout
        setTimeout(() => updateTabUnderline(activeTab), 100);
    }
    
    // Handle window resize to adjust underline position dynamically
    window.addEventListener('resize', () => {
        const currentActive = document.querySelector('.search-tab.active');
        if (currentActive) {
            updateTabUnderline(currentActive);
        }
    });

    // ==========================================
    // 5. Mobile Drawer Menu Navigation
    // ==========================================
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileDrawer = document.getElementById('mobile-drawer');
    const closeDrawerBtn = document.getElementById('close-drawer-btn');
    const drawerContent = document.getElementById('drawer-content');
    
    const openMenu = () => {
        mobileDrawer.classList.add('active');
        mobileDrawer.setAttribute('aria-hidden', 'false');
        mobileMenuBtn.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden'; // Lock background scrolling
    };
    
    const closeMenu = () => {
        mobileDrawer.classList.remove('active');
        mobileDrawer.setAttribute('aria-hidden', 'true');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = ''; // Unlock background scrolling
    };
    
    if (mobileMenuBtn && mobileDrawer && closeDrawerBtn) {
        mobileMenuBtn.addEventListener('click', openMenu);
        closeDrawerBtn.addEventListener('click', closeMenu);
        
        // Close menu when clicking outside of drawer content (on overlay blur)
        mobileDrawer.addEventListener('click', (e) => {
            if (drawerContent && !drawerContent.contains(e.target)) {
                closeMenu();
            }
        });
        
        // Escape key closes the menu
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mobileDrawer.classList.contains('active')) {
                closeMenu();
            }
        });
    }
});
