document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!token || !user) {
        window.location.href = 'index.html';
        return;
    }

    // Mostrar información del usuario
    document.getElementById('userWelcome').textContent = `Hola, ${user.username} (${getRoleName(user.role)})`;

    // Cargar todo el contenido
    loadDashboardContent();

    // Configurar eventos
    setupEventListeners();

    // Configurar búsqueda en tiempo real
    setupSearchFunctionality();
});

function getRoleName(role) {
    const roles = {
        'admin': 'Administrador',
        'artist': 'Artista',
        'client': 'Cliente'
    };
    return roles[role] || role;
}

function setupEventListeners() {
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    });

    // Navegación entre secciones
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.getAttribute('href') === '#') {
                e.preventDefault();
            }
        });
    });

    // Botones de reproducción
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('play-btn')) {
            const contentId = e.target.getAttribute('data-content-id');
            playContent(contentId);
        }

        if (e.target.classList.contains('favorite-btn')) {
            const contentId = e.target.getAttribute('data-content-id');
            toggleFavorite(contentId, e.target);
        }
    });
}

function setupSearchFunctionality() {
    const searchInput = document.querySelector('.search-bar input');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            filterContent(searchTerm);
        });
    }
}

async function loadDashboardContent() {
    try {
        showLoadingState();
        
        // Cargar todo el contenido en paralelo
        await Promise.all([
            loadRecommendedContent(),
            loadMusicContent(),
            loadMoviesContent(),
            loadBooksContent(),
            loadContinueWatching(),
            loadRecentUploads()
        ]);

        hideLoadingState();
        
    } catch (error) {
        console.error('Error loading dashboard content:', error);
        showError('Error al cargar el contenido');
    }
}

function showLoadingState() {
    const sections = document.querySelectorAll('.content-cards');
    sections.forEach(section => {
        section.innerHTML = `
            <div class="loading-placeholder">
                <div class="loading-spinner"></div>
                <p>Cargando contenido...</p>
            </div>
        `;
    });
}

function hideLoadingState() {
    const placeholders = document.querySelectorAll('.loading-placeholder');
    placeholders.forEach(placeholder => {
        placeholder.remove();
    });
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <div class="message error">
            ${message}
            <button onclick="this.parentElement.remove()" class="close-btn">×</button>
        </div>
    `;
    document.querySelector('.main-content').prepend(errorDiv);
}

async function loadRecommendedContent() {
    try {
        const container = document.getElementById('recommendedContent');
        if (!container) return;

        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3000/api/content/recommended', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const content = await response.json();
            displayContentCards(container, content, 'recomendado');
        } else {
            // Mostrar contenido de ejemplo si falla la API
            displaySampleContent(container, 'Recomendado para ti', 'recomendado');
        }
    } catch (error) {
        console.error('Error loading recommended content:', error);
        const container = document.getElementById('recommendedContent');
        displaySampleContent(container, 'Recomendado para ti', 'recomendado');
    }
}

async function loadMusicContent() {
    try {
        const container = document.getElementById('musicContent');
        if (!container) return;

        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3000/api/content?type=music&limit=6', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const content = await response.json();
            displayContentCards(container, content, 'música');
        } else {
            displaySampleContent(container, 'Música UCSP', 'music');
        }
    } catch (error) {
        console.error('Error loading music content:', error);
        const container = document.getElementById('musicContent');
        displaySampleContent(container, 'Música UCSP', 'music');
    }
}

async function loadMoviesContent() {
    try {
        const container = document.getElementById('moviesContent');
        if (!container) return;

        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3000/api/content?type=movie&limit=6', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const content = await response.json();
            displayContentCards(container, content, 'película');
        } else {
            displaySampleContent(container, 'Películas Educativas', 'movie');
        }
    } catch (error) {
        console.error('Error loading movies content:', error);
        const container = document.getElementById('moviesContent');
        displaySampleContent(container, 'Películas Educativas', 'movie');
    }
}

async function loadBooksContent() {
    try {
        const container = document.getElementById('booksContent');
        if (!container) return;

        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3000/api/content?type=book&limit=6', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const content = await response.json();
            displayContentCards(container, content, 'libro');
        } else {
            displaySampleContent(container, 'Biblioteca Digital', 'book');
        }
    } catch (error) {
        console.error('Error loading books content:', error);
        const container = document.getElementById('booksContent');
        displaySampleContent(container, 'Biblioteca Digital', 'book');
    }
}

async function loadContinueWatching() {
    try {
        const container = document.getElementById('continueWatching');
        if (!container) return;

        // Simular contenido en progreso
        const progressContent = [
            {
                id: 'content_001',
                title: 'Documental Científico UCSP',
                type: 'movie',
                progress: 65,
                thumbnail: 'https://via.placeholder.com/200x120/1a1a2e/00a8ff?text=Docu+UCSP',
                duration: '45:00'
            },
            {
                id: 'content_002',
                title: 'Curso de Programación',
                type: 'book',
                progress: 30,
                thumbnail: 'https://via.placeholder.com/200x120/1a1a2e/00a8ff?text=Programación',
                duration: '320 págs'
            }
        ];

        displayProgressCards(container, progressContent);
    } catch (error) {
        console.error('Error loading continue watching:', error);
    }
}

async function loadRecentUploads() {
    try {
        const container = document.getElementById('recentUploads');
        if (!container) return;

        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3000/api/content/recent', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const content = await response.json();
            displayContentCards(container, content, 'reciente');
        } else {
            // Mostrar contenido de ejemplo
            const sampleContent = [
                {
                    id: 'content_new_1',
                    title: 'Nueva Música UCSP',
                    type: 'music',
                    thumbnail: 'https://via.placeholder.com/200x120/1a1a2e/00a8ff?text=Nuevo',
                    description: 'Últimos lanzamientos'
                },
                {
                    id: 'content_new_2',
                    title: 'Conferencia Actual',
                    type: 'movie',
                    thumbnail: 'https://via.placeholder.com/200x120/1a1a2e/00a8ff?text=Conferencia',
                    description: 'Grabación reciente'
                }
            ];
            displayContentCards(container, sampleContent, 'reciente');
        }
    } catch (error) {
        console.error('Error loading recent uploads:', error);
    }
}

function displayContentCards(container, content, sectionType) {
    if (!content || content.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No hay contenido ${sectionType} disponible</p>
                <button class="btn-secondary" onclick="loadDashboardContent()">Reintentar</button>
            </div>
        `;
        return;
    }

    const cardsHTML = content.map(item => `
        <div class="content-card" data-content-id="${item.id}" data-type="${item.type}">
            <div class="card-image">
                <img src="${item.thumbnail || 'https://via.placeholder.com/200x120/1a1a2e/00a8ff?text=UCSP'}" 
                     alt="${item.title}" 
                     onerror="this.src='https://via.placeholder.com/200x120/1a1a2e/00a8ff?text=UCSP'">
                <div class="card-overlay">
                    <button class="play-btn" data-content-id="${item.id}">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    </button>
                    <button class="favorite-btn" data-content-id="${item.id}">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                    </button>
                </div>
                ${item.duration ? `<div class="duration-badge">${item.duration}</div>` : ''}
            </div>
            <div class="card-info">
                <h3>${item.title}</h3>
                <p>${item.description || getTypeDescription(item.type)}</p>
                <div class="card-meta">
                    <span class="content-type">${getTypeName(item.type)}</span>
                    ${item.genre ? `<span class="content-genre">${item.genre}</span>` : ''}
                </div>
            </div>
        </div>
    `).join('');

    container.innerHTML = cardsHTML;
}

function displayProgressCards(container, content) {
    if (!content || content.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No hay contenido en progreso</p>
                <p class="small">Comienza a ver algún contenido para continuar después</p>
            </div>
        `;
        return;
    }

    const cardsHTML = content.map(item => `
        <div class="content-card progress-card" data-content-id="${item.id}">
            <div class="card-image">
                <img src="${item.thumbnail}" alt="${item.title}">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${item.progress}%"></div>
                </div>
                <div class="card-overlay">
                    <button class="play-btn" data-content-id="${item.id}">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    </button>
                </div>
                <div class="duration-badge">${item.duration}</div>
            </div>
            <div class="card-info">
                <h3>${item.title}</h3>
                <p>${item.progress}% completado</p>
                <div class="progress-text">Continuar viendo</div>
            </div>
        </div>
    `).join('');

    container.innerHTML = cardsHTML;
}

function displaySampleContent(container, sectionTitle, type) {
    const sampleData = {
        music: [
            {
                id: 'music_1',
                title: 'Bandas UCSP 2024',
                type: 'music',
                thumbnail: 'https://via.placeholder.com/200x120/1a1a2e/00a8ff?text=UCSP+Music',
                description: 'Compilación musical',
                duration: '60:00',
                genre: 'Variado'
            },
            {
                id: 'music_2',
                title: 'Concierto Clásico',
                type: 'music',
                thumbnail: 'https://via.placeholder.com/200x120/1a1a2e/00a8ff?text=Orquesta',
                description: 'Orquesta UCSP',
                duration: '45:30',
                genre: 'Clásica'
            }
        ],
        movie: [
            {
                id: 'movie_1',
                title: 'Documental Científico',
                type: 'movie',
                thumbnail: 'https://via.placeholder.com/200x120/1a1a2e/00a8ff?text=Documental',
                description: 'Investigación UCSP',
                duration: '30:00',
                genre: 'Documental'
            },
            {
                id: 'movie_2',
                title: 'Conferencia Tecnología',
                type: 'movie',
                thumbnail: 'https://via.placeholder.com/200x120/1a1a2e/00a8ff?text=Conferencia',
                description: 'Últimas tendencias',
                duration: '90:00',
                genre: 'Educativo'
            }
        ],
        book: [
            {
                id: 'book_1',
                title: 'Textos Académicos',
                type: 'book',
                thumbnail: 'https://via.placeholder.com/200x120/1a1a2e/00a8ff?text=Libros',
                description: 'Compilación UCSP',
                duration: '320 págs',
                genre: 'Académico'
            },
            {
                id: 'book_2',
                title: 'Guías de Estudio',
                type: 'book',
                thumbnail: 'https://via.placeholder.com/200x120/1a1a2e/00a8ff?text=Guías',
                description: 'Material de apoyo',
                duration: '150 págs',
                genre: 'Educativo'
            }
        ],
        recomendado: [
            {
                id: 'rec_1',
                title: 'UCSP TV Especial',
                type: 'movie',
                thumbnail: 'https://via.placeholder.com/200x120/1a1a2e/00a8ff?text=UCSP+TV',
                description: 'Video institucional',
                duration: '25:00',
                genre: 'Institucional'
            },
            {
                id: 'rec_2',
                title: 'Podcast Universitario',
                type: 'music',
                thumbnail: 'https://via.placeholder.com/200x120/1a1a2e/00a8ff?text=Podcast',
                description: 'Entrevistas y debates',
                duration: '45:00',
                genre: 'Conversación'
            }
        ]
    };

    const content = sampleData[type] || sampleData.recomendado;
    displayContentCards(container, content, sectionTitle.toLowerCase());
}

function getTypeName(type) {
    const types = {
        'music': 'Música',
        'movie': 'Película',
        'book': 'Libro',
        'video': 'Video'
    };
    return types[type] || 'Contenido';
}

function getTypeDescription(type) {
    const descriptions = {
        'music': 'Contenido musical',
        'movie': 'Película o video',
        'book': 'Libro digital',
        'video': 'Contenido video'
    };
    return descriptions[type] || 'Multimedia';
}

function filterContent(searchTerm) {
    const contentCards = document.querySelectorAll('.content-card');
    
    contentCards.forEach(card => {
        const title = card.querySelector('h3').textContent.toLowerCase();
        const description = card.querySelector('p').textContent.toLowerCase();
        const genre = card.querySelector('.content-genre')?.textContent.toLowerCase() || '';
        
        const matches = title.includes(searchTerm) || 
                       description.includes(searchTerm) || 
                       genre.includes(searchTerm);
        
        card.style.display = matches ? 'block' : 'none';
    });
}

async function playContent(contentId) {
    try {
        // Guardar en historial reciente
        const recent = JSON.parse(localStorage.getItem('recentContent') || '[]');
        const newRecent = recent.filter(item => item.id !== contentId);
        newRecent.unshift({ id: contentId, timestamp: Date.now() });
        localStorage.setItem('recentContent', JSON.stringify(newRecent.slice(0, 10)));

        // Redirigir al reproductor
        window.location.href = `player.html?id=${contentId}`;
        
    } catch (error) {
        console.error('Error playing content:', error);
        showError('Error al reproducir el contenido');
    }
}

async function toggleFavorite(contentId, button) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:3000/api/content/${contentId}/favorite`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const result = await response.json();
            const isFavorite = result.isFavorite;
            
            // Actualizar UI
            const svg = button.querySelector('svg');
            if (isFavorite) {
                svg.style.fill = '#00a8ff';
                svg.style.stroke = '#00a8ff';
            } else {
                svg.style.fill = 'none';
                svg.style.stroke = 'white';
            }
            
            // Mostrar feedback
            showQuickMessage(isFavorite ? 'Agregado a favoritos' : 'Removido de favoritos');
        }
    } catch (error) {
        console.error('Error toggling favorite:', error);
        showQuickMessage('Error al actualizar favoritos', 'error');
    }
}

function showQuickMessage(message, type = 'success') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `quick-message ${type}`;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// Función para cargar más contenido
function loadMoreContent(section) {
    const container = document.getElementById(section + 'Content');
    if (!container) return;

    const loadingHTML = `
        <div class="loading-more">
            <div class="loading-spinner small"></div>
            <p>Cargando más contenido...</p>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', loadingHTML);

    // Simular carga de más contenido
    setTimeout(() => {
        const loadingElement = container.querySelector('.loading-more');
        if (loadingElement) {
            loadingElement.remove();
        }
        
        // Aquí iría la lógica real para cargar más contenido
        console.log(`Cargando más contenido para: ${section}`);
    }, 1500);
}

// Exportar funciones para uso global
window.loadDashboardContent = loadDashboardContent;
window.playContent = playContent;
window.loadMoreContent = loadMoreContent;