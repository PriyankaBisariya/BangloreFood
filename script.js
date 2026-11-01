/* ════════════════════════════════════════════════════════════════════
   NAMMA BENGALURU BHOJAN — INTERACTIVE LOGIC & TOOLS ENGINE
   Search, Multi-Filtering, Live Open/Closed Status, Detail Modals &
   Food Roulette Decision Maker.
   ════════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  // Check if RESTAURANTS_DATA is available
  const allRestaurants = (typeof RESTAURANTS_DATA !== 'undefined') ? RESTAURANTS_DATA : [];

  // DOM Elements
  const cardsGrid        = document.getElementById('cardsGrid');
  const searchInput      = document.getElementById('searchInput');
  const searchClearBtn   = document.getElementById('searchClearBtn');
  const areaSelect       = document.getElementById('areaSelect');
  const sortSelect       = document.getElementById('sortSelect');
  const categoryPills    = document.querySelectorAll('.category-btn');
  const toggleChips      = document.querySelectorAll('.toggle-chip');
  const resultsCountText = document.getElementById('resultsCountText');
  const resetFiltersBtn  = document.getElementById('resetFiltersBtn');

  // Modal Elements
  const detailsModal     = document.getElementById('detailsModal');
  const modalCloseBtn    = document.getElementById('modalCloseBtn');
  const modalCategory    = document.getElementById('modalCategory');
  const modalTitle       = document.getElementById('modalTitle');
  const modalRating      = document.getElementById('modalRating');
  const modalReviews     = document.getElementById('modalReviews');
  const modalQuoteSource = document.getElementById('modalQuoteSource');
  const modalQuoteText   = document.getElementById('modalQuoteText');
  const modalTimings     = document.getElementById('modalTimings');
  const modalParking     = document.getElementById('modalParking');
  const modalPrice       = document.getElementById('modalPrice');
  const modalArea        = document.getElementById('modalArea');
  const modalMustTry     = document.getElementById('modalMustTry');
  const modalTipText     = document.getElementById('modalTipText');
  const modalDescText    = document.getElementById('modalDescText');
  const modalMapsBtn     = document.getElementById('modalMapsBtn');
  const modalCopyBtn     = document.getElementById('modalCopyBtn');

  // Surprise Roulette Elements
  const surpriseBtnNav   = document.getElementById('surpriseBtnNav');
  const rouletteModal    = document.getElementById('rouletteModal');
  const rouletteCloseBtn = document.getElementById('rouletteCloseBtn');
  const rouletteCardArea = document.getElementById('rouletteCardArea');
  const spinRouletteBtn  = document.getElementById('spinRouletteBtn');
  const toastNotice      = document.getElementById('toastNotice');

  // State Management
  const state = {
    search: '',
    category: 'all',
    area: 'all',
    sort: 'rating-desc',
    vegOnly: false,
    barOnly: false,
    valetOnly: false,
    lateNightOnly: false,
    topRatedOnly: false
  };

  let currentlyModalRestaurant = null;

  /* ── 1. HELPER: LIVE TIME CALCULATOR ── */
  function getLiveStatus(openHour, closeHour) {
    const now = new Date();
    // Convert current time to fractional hours (e.g., 23:45 is 23.75)
    let currentHour = now.getHours() + (now.getMinutes() / 60);

    // If closeHour is > 24 (e.g. 25.0 = 1 AM next day)
    // If it's early morning (e.g. 12:30 AM is 0.5), we can check against previous day cycle
    let isOpen = false;

    if (closeHour > 24) {
      if (currentHour >= openHour || currentHour < (closeHour - 24)) {
        isOpen = true;
      }
    } else {
      if (currentHour >= openHour && currentHour < closeHour) {
        isOpen = true;
      }
    }

    // Format human readable closing time
    const formatH = (h) => {
      let norm = h % 24;
      let suffix = norm >= 12 ? 'PM' : 'AM';
      let hour12 = Math.floor(norm % 12);
      if (hour12 === 0) hour12 = 12;
      let mins = Math.round((norm % 1) * 60);
      let minsStr = mins > 0 ? `:${mins.toString().padStart(2, '0')}` : '';
      return `${hour12}${minsStr} ${suffix}`;
    };

    if (isOpen) {
      return {
        isOpen: true,
        badgeText: `Open Now • Closes ${formatH(closeHour)}`,
        badgeClass: 'open'
      };
    } else {
      return {
        isOpen: false,
        badgeText: `Closed • Opens ${formatH(openHour)}`,
        badgeClass: 'closed'
      };
    }
  }

  /* ── 2. TOAST NOTIFICATION ── */
  function showToast(message) {
    if (!toastNotice) return;
    toastNotice.textContent = message;
    toastNotice.classList.add('show');
    setTimeout(() => {
      toastNotice.classList.remove('show');
    }, 2800);
  }

  /* ── 3. UPDATE CATEGORY PILL COUNTS ── */
  function updateCategoryCounts() {
    const counts = { all: allRestaurants.length };
    allRestaurants.forEach(r => {
      counts[r.category] = (counts[r.category] || 0) + 1;
    });

    categoryPills.forEach(pill => {
      const cat = pill.dataset.category;
      const countEl = pill.querySelector('.category-count');
      if (countEl) {
        countEl.textContent = counts[cat] || 0;
      }
    });
  }

  /* ── 4. RENDER RESTAURANT CARDS ── */
  function renderCards(restaurants) {
    if (!cardsGrid) return;

    if (restaurants.length === 0) {
      cardsGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <h3 class="empty-title">No matching restaurants found</h3>
          <p class="empty-desc">Try clearing some of your search filters or selecting a different category.</p>
          <button class="btn-card-action btn-details" id="emptyResetBtn" style="display:inline-flex; width:auto; padding:0 24px;">Reset All Filters</button>
        </div>
      `;
      const emptyReset = document.getElementById('emptyResetBtn');
      if (emptyReset) emptyReset.addEventListener('click', resetAllFilters);
      return;
    }

    cardsGrid.innerHTML = restaurants.map(item => {
      const liveStatus = getLiveStatus(item.openHour, item.closeHour);
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.mapsQuery || (item.name + ' ' + item.area + ' Bangalore'))}`;

      return `
        <article class="restaurant-card" data-id="${item.id}">
          <div class="card-header-top">
            <div class="card-title-group">
              <span class="card-category-tag">${item.categoryLabel}</span>
              <h3 class="card-title">${item.name}</h3>
            </div>
            <div class="card-rating-badge">
              <div class="rating-pill">★ ${item.rating.toFixed(1)}</div>
              <span class="rating-reviews">${item.reviewsCount}</span>
            </div>
          </div>

          <!-- Authentic Newspaper / Critic Citation -->
          <div class="card-press-box">
            <div class="press-source-header">${item.pressSource}</div>
            <p class="press-quote-text">${item.pressQuote}</p>
          </div>

          <!-- Interactive Details & Tools Matrix -->
          <div class="card-tools-matrix">
            <div class="tool-row">
              <span class="tool-icon">📍</span>
              <span class="tool-label">Area:</span>
              <span>${item.area}</span>
            </div>
            <div class="tool-row">
              <span class="tool-icon">🕒</span>
              <span class="tool-label">Hours:</span>
              <span style="flex:1;">${item.timings}</span>
            </div>
            <div class="tool-row">
              <span class="tool-icon">⏱️</span>
              <span class="tool-label">Status:</span>
              <span class="tool-badge-live ${liveStatus.badgeClass}">
                <span class="pulse-dot"></span>
                ${liveStatus.badgeText}
              </span>
            </div>
            <div class="tool-row">
              <span class="tool-icon">🚗</span>
              <span class="tool-label">Parking:</span>
              <span style="font-size:0.82rem; font-weight:500;">${item.parking}</span>
            </div>
          </div>

          <!-- Feature Meta Chips -->
          <div class="card-badge-row">
            <span class="meta-chip price">💰 ${item.priceForTwo}</span>
            ${item.isVeg ? '<span class="meta-chip veg">🌱 Pure Veg</span>' : ''}
            ${item.hasBar ? '<span class="meta-chip bar">🍸 Craft Beer & Bar</span>' : ''}
            ${item.hasValet ? '<span class="meta-chip valet">🚗 Valet Available</span>' : ''}
          </div>

          <!-- Must Try Signature Dishes -->
          <div class="card-must-try-box">
            <div class="must-try-title">✨ Signature Must-Try Dishes:</div>
            <div class="dish-tags">
              ${item.mustTry.slice(0, 3).map(dish => `<span class="dish-tag">${dish}</span>`).join('')}
              ${item.mustTry.length > 3 ? `<span class="dish-tag">+${item.mustTry.length - 3} more</span>` : ''}
            </div>
          </div>

          <!-- Direct Card Tools Actions -->
          <div class="card-actions-row">
            <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="btn-card-action btn-directions">
              🗺️ Directions
            </a>
            <button type="button" class="btn-card-action btn-details" data-detail-id="${item.id}">
              🔍 Full Details
            </button>
          </div>
        </article>
      `;
    }).join('');

    // Attach event listeners to detail buttons
    document.querySelectorAll('[data-detail-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.detailId;
        openDetailModal(id);
      });
    });
  }

  /* ── 5. FILTERING AND SORTING ENGINE ── */
  function applyFilters() {
    let filtered = allRestaurants.filter(item => {
      // 1. Category
      if (state.category !== 'all' && item.category !== state.category) {
        return false;
      }

      // 2. Neighborhood Area
      if (state.area !== 'all') {
        const itemArea = item.area.toLowerCase();
        const filterArea = state.area.toLowerCase();
        if (!itemArea.includes(filterArea)) return false;
      }

      // 3. Search Query
      if (state.search.trim() !== '') {
        const q = state.search.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesArea = item.area.toLowerCase().includes(q);
        const matchesDesc = item.description.toLowerCase().includes(q);
        const matchesDishes = item.mustTry.some(d => d.toLowerCase().includes(q));
        const matchesPress = item.pressSource.toLowerCase().includes(q) || item.pressQuote.toLowerCase().includes(q);

        if (!matchesName && !matchesArea && !matchesDesc && !matchesDishes && !matchesPress) {
          return false;
        }
      }

      // 4. Feature Toggles
      if (state.vegOnly && !item.isVeg) return false;
      if (state.barOnly && !item.hasBar) return false;
      if (state.valetOnly && !item.hasValet) return false;
      if (state.lateNightOnly && !item.isLateNight) return false;
      if (state.topRatedOnly && item.rating < 4.6) return false;

      return true;
    });

    // 5. Sorting
    filtered.sort((a, b) => {
      switch (state.sort) {
        case 'rating-desc':
          return b.rating - a.rating;
        case 'reviews-desc': {
          const numA = parseInt(a.reviewsCount.replace(/[^0-9]/g, '')) || 0;
          const numB = parseInt(b.reviewsCount.replace(/[^0-9]/g, '')) || 0;
          return numB - numA;
        }
        case 'price-asc':
          return a.priceRange - b.priceRange;
        case 'price-desc':
          return b.priceRange - a.priceRange;
        case 'name-asc':
          return a.name.localeCompare(b.name);
        default:
          return b.rating - a.rating;
      }
    });

    // Update Counter Text
    if (resultsCountText) {
      resultsCountText.textContent = `Showing ${filtered.length} of ${allRestaurants.length} verified culinary spots`;
    }

    renderCards(filtered);
  }

  /* ── 6. RESET ALL FILTERS ── */
  function resetAllFilters() {
    state.search = '';
    state.category = 'all';
    state.area = 'all';
    state.sort = 'rating-desc';
    state.vegOnly = false;
    state.barOnly = false;
    state.valetOnly = false;
    state.lateNightOnly = false;
    state.topRatedOnly = false;

    if (searchInput) {
      searchInput.value = '';
      if (searchClearBtn) searchClearBtn.style.display = 'none';
    }
    if (areaSelect) areaSelect.value = 'all';
    if (sortSelect) sortSelect.value = 'rating-desc';

    categoryPills.forEach(pill => {
      if (pill.dataset.category === 'all') pill.classList.add('active');
      else pill.classList.remove('active');
    });

    toggleChips.forEach(chip => chip.classList.remove('active'));

    applyFilters();
    showToast("Filters reset to default! ✨");
  }

  /* ── 7. EVENT LISTENERS: TOOLBAR ── */
  // Search input
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.search = e.target.value;
      if (searchClearBtn) {
        searchClearBtn.style.display = state.search.length > 0 ? 'block' : 'none';
      }
      applyFilters();
    });
  }

  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', () => {
      searchInput.value = '';
      state.search = '';
      searchClearBtn.style.display = 'none';
      applyFilters();
      searchInput.focus();
    });
  }

  // Neighborhood selector
  if (areaSelect) {
    areaSelect.addEventListener('change', (e) => {
      state.area = e.target.value;
      applyFilters();
    });
  }

  // Sort selector
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      state.sort = e.target.value;
      applyFilters();
    });
  }

  // Category Pills
  categoryPills.forEach(pill => {
    pill.addEventListener('click', () => {
      categoryPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.category = pill.dataset.category;
      applyFilters();
    });
  });

  // Feature Toggle Chips
  toggleChips.forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('active');
      const filterKey = chip.dataset.filter;

      if (filterKey === 'veg') state.vegOnly = chip.classList.contains('active');
      if (filterKey === 'bar') state.barOnly = chip.classList.contains('active');
      if (filterKey === 'valet') state.valetOnly = chip.classList.contains('active');
      if (filterKey === 'latenight') state.lateNightOnly = chip.classList.contains('active');
      if (filterKey === 'toprated') state.topRatedOnly = chip.classList.contains('active');

      applyFilters();
    });
  });

  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', resetAllFilters);
  }

  /* ── 8. DETAIL MODAL LOGIC ── */
  function openDetailModal(id) {
    const item = allRestaurants.find(r => r.id === id);
    if (!item || !detailsModal) return;

    currentlyModalRestaurant = item;

    modalCategory.textContent = item.categoryLabel;
    modalTitle.textContent = item.name;
    modalRating.textContent = `★ ${item.rating.toFixed(1)}`;
    modalReviews.textContent = item.reviewsCount;
    modalQuoteSource.textContent = item.pressSource;
    modalQuoteText.textContent = item.pressQuote;
    modalTimings.textContent = item.timings;
    modalParking.textContent = item.parking;
    modalPrice.textContent = item.priceForTwo;
    modalArea.textContent = item.area;
    modalDescText.textContent = item.description;
    modalTipText.textContent = item.insiderTip;

    modalMustTry.innerHTML = item.mustTry
      .map(d => `<span class="dish-tag" style="background:#FFF7ED; border-color:#FFD8A8; color:#9A3412;">${d}</span>`)
      .join('');

    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.mapsQuery || (item.name + ' ' + item.area + ' Bangalore'))}`;
    modalMapsBtn.href = mapsUrl;

    detailsModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDetailModal() {
    if (!detailsModal) return;
    detailsModal.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeDetailModal);
  if (detailsModal) {
    detailsModal.addEventListener('click', (e) => {
      if (e.target === detailsModal) closeDetailModal();
    });
  }

  // Copy Details to Clipboard Tool
  if (modalCopyBtn) {
    modalCopyBtn.addEventListener('click', () => {
      if (!currentlyModalRestaurant) return;
      const r = currentlyModalRestaurant;
      const textToCopy = `🍛 ${r.name} (${r.area})\n⭐ Rating: ${r.rating}★ (${r.reviewsCount})\n🕒 Hours: ${r.timings}\n🚗 Parking: ${r.parking}\n💰 Cost: ${r.priceForTwo}\n✨ Must-Try: ${r.mustTry.join(', ')}\n📍 Address: ${r.address}\n\nRecommended by Namma Bengaluru Bhojan Guide`;

      navigator.clipboard.writeText(textToCopy).then(() => {
        showToast("Copied restaurant details to clipboard! 📋");
      }).catch(() => {
        showToast("Error copying details.");
      });
    });
  }

  /* ── 9. SURPRISE ME (FOOD ROULETTE DECISION MAKER) ── */
  function openRoulette() {
    if (!rouletteModal) return;
    spinRandomRestaurant();
    rouletteModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeRoulette() {
    if (!rouletteModal) return;
    rouletteModal.classList.remove('open');
    document.body.style.overflow = '';
  }

  function spinRandomRestaurant() {
    if (!rouletteCardArea || allRestaurants.length === 0) return;

    // Pick random restaurant from current filter or overall
    const randomIndex = Math.floor(Math.random() * allRestaurants.length);
    const chosen = allRestaurants[randomIndex];
    const liveStatus = getLiveStatus(chosen.openHour, chosen.closeHour);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(chosen.mapsQuery || (chosen.name + ' ' + chosen.area + ' Bangalore'))}`;

    rouletteCardArea.innerHTML = `
      <div style="font-size:0.75rem; font-weight:700; color:var(--primary-terracotta); text-transform:uppercase; margin-bottom:4px;">
        ${chosen.categoryLabel} • ${chosen.area}
      </div>
      <h3 style="font-family:var(--font-serif); font-size:1.6rem; color:var(--text-main); margin-bottom:8px;">
        ${chosen.name}
      </h3>
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
        <span class="rating-pill">★ ${chosen.rating.toFixed(1)}</span>
        <span style="font-size:0.85rem; color:var(--text-muted);">${chosen.reviewsCount}</span>
        <span class="tool-badge-live ${liveStatus.badgeClass}">${liveStatus.badgeText}</span>
      </div>
      <p style="font-size:0.88rem; color:var(--text-body); margin-bottom:12px; line-height:1.5;">
        ${chosen.description}
      </p>
      <div style="font-size:0.82rem; font-weight:600; color:#92400E; margin-bottom:14px; background:#FEF3C7; padding:8px 12px; border-radius:8px;">
        🚗 <strong>Parking:</strong> ${chosen.parking}
      </div>
      <div style="margin-bottom:16px;">
        <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:4px;">Signature Must-Try:</div>
        <div class="dish-tags">
          ${chosen.mustTry.map(d => `<span class="dish-tag">${d}</span>`).join('')}
        </div>
      </div>
      <div style="display:flex; gap:10px;">
        <a href="${mapsUrl}" target="_blank" class="btn-card-action btn-directions" style="flex:1;">
          🗺️ Get Directions
        </a>
        <button type="button" class="btn-card-action btn-details" id="rouletteViewFullBtn" style="flex:1;">
          🔍 Full Details
        </button>
      </div>
    `;

    const viewFullBtn = document.getElementById('rouletteViewFullBtn');
    if (viewFullBtn) {
      viewFullBtn.addEventListener('click', () => {
        closeRoulette();
        setTimeout(() => openDetailModal(chosen.id), 200);
      });
    }
  }

  if (surpriseBtnNav) surpriseBtnNav.addEventListener('click', openRoulette);
  if (rouletteCloseBtn) rouletteCloseBtn.addEventListener('click', closeRoulette);
  if (rouletteModal) {
    rouletteModal.addEventListener('click', (e) => {
      if (e.target === rouletteModal) closeRoulette();
    });
  }
  if (spinRouletteBtn) {
    spinRouletteBtn.addEventListener('click', () => {
      spinRouletteBtn.disabled = true;
      spinRouletteBtn.textContent = '🎲 Picking best spot...';
      setTimeout(() => {
        spinRandomRestaurant();
        spinRouletteBtn.disabled = false;
        spinRouletteBtn.textContent = '🎲 Spin Again / Different Spot';
      }, 350);
    });
  }

  // Keyboard shortcut to close modals with ESC
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDetailModal();
      closeRoulette();
    }
  });

  /* ── 10. INITIALIZATION ── */
  updateCategoryCounts();
  applyFilters();
});
