const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const db = require('./models/database');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'ucspstream_secret_key_2024';

// Middleware de autenticación
const auth = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. Token requerido.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
};

// Middleware para verificar base de datos
const checkDB = async (req, res, next) => {
    if (!db.initialized) {
        return res.status(503).json({ error: 'Base de datos no disponible' });
    }
    next();
};

// Routes

// Health check
app.get('/api/health', async (req, res) => {
    res.json({ 
        status: 'OK', 
        database: db.initialized ? 'Connected' : 'Disconnected',
        message: 'UCSPstream funcionando correctamente',
        timestamp: new Date().toISOString()
    });
});

// Registro
app.post('/api/auth/register', checkDB, async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        // Validar roles permitidos
        const allowedRoles = ['client', 'artist'];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ error: 'Rol no permitido en registro' });
        }

        // Verificar si el usuario existe
        const existingUser = await db.getUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'El usuario ya existe' });
        }

        // Crear usuario
        const userData = {
            username,
            email,
            password: await bcrypt.hash(password, 10),
            role: role,
            status: 'active'
        };

        const user = await db.createUser(userData);

        const token = jwt.sign(
            { userId: user.id, role: user.role }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );

        res.status(201).json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// Login
app.post('/api/auth/login', checkDB, async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await db.getUserByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Para el usuario admin de prueba (password sin encriptar en la BD inicial)
        let validPassword;
        if (user.email === 'admin@ucsp.edu' && password === 'password') {
            validPassword = true;
        } else {
            validPassword = await bcrypt.compare(password, user.password);
        }

        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const token = jwt.sign(
            { userId: user.id, role: user.role }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// Obtener contenido
app.get('/api/content', auth, checkDB, async (req, res) => {
    try {
        const { type, limit } = req.query;
        
        const content = await db.getContentByType(type, limit || 20);
        
        res.json(content);
    } catch (error) {
        console.error('Content error:', error);
        res.status(500).json({ error: 'Error al obtener contenido' });
    }
});

// Contenido recomendado
app.get('/api/content/recommended', auth, checkDB, async (req, res) => {
    try {
        const recommended = await db.getContentByType(null, 4);
        res.json(recommended);
    } catch (error) {
        console.error('Recommended content error:', error);
        res.status(500).json({ error: 'Error al obtener contenido recomendado' });
    }
});

// Contenido reciente
app.get('/api/content/recent', auth, checkDB, async (req, res) => {
    try {
        const recent = await db.getContentByType(null, 6);
        res.json(recent);
    } catch (error) {
        console.error('Recent content error:', error);
        res.status(500).json({ error: 'Error al obtener contenido reciente' });
    }
});

// Obtener contenido por ID
app.get('/api/content/:id', auth, checkDB, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.cluster.query(
            `SELECT * FROM \`mediaapp\` WHERE id = $1`,
            [`content::${id}`]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Contenido no encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Content by ID error:', error);
        res.status(500).json({ error: 'Error al obtener contenido' });
    }
});

// Subir nuevo contenido (solo artistas y admin)
app.post('/api/content', auth, checkDB, async (req, res) => {
    try {
        if (req.user.role !== 'artist' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'No autorizado para subir contenido' });
        }

        const { title, description, type, duration, genre } = req.body;

        const contentData = {
            title,
            description,
            type,
            duration,
            genre,
            artist_id: req.user.userId,
            status: req.user.role === 'admin' ? 'approved' : 'pending',
            thumbnail: `https://via.placeholder.com/200x120/1a1a2e/00a8ff?text=${encodeURIComponent(title)}`,
            created_at: new Date().toISOString()
        };

        const contentId = `content::${Date.now()}`;
        await db.collection.upsert(contentId, contentData);

        res.status(201).json({
            id: contentId,
            ...contentData
        });
    } catch (error) {
        console.error('Upload content error:', error);
        res.status(500).json({ error: 'Error al subir contenido' });
    }
});

// Perfil de usuario
app.get('/api/users/profile', auth, checkDB, async (req, res) => {
    try {
        const result = await db.cluster.query(
            `SELECT * FROM \`mediaapp\` WHERE id = $1`,
            [req.user.userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const user = result.rows[0];
        const { password, ...userData } = user;
        
        res.json(userData);
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Error al obtener perfil' });
    }
});

// Actualizar perfil
app.put('/api/users/profile', auth, checkDB, async (req, res) => {
    try {
        const { username } = req.body;
        
        await db.collection.mutateIn(req.user.userId, [
            db.couchbase.MutateInSpec.upsert('username', username)
        ]);

        res.json({ message: 'Perfil actualizado correctamente' });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Error al actualizar perfil' });
    }
});

// Obtener todos los usuarios (solo admin)
app.get('/api/admin/users', auth, checkDB, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        const result = await db.cluster.query(
            `SELECT id, username, email, role, status, created_at 
             FROM \`mediaapp\` 
             WHERE id LIKE 'user::%' AND id != $1`,
            [req.user.userId]
        );

        // Remover passwords de la respuesta
        const users = result.rows.map(user => {
            const { password, ...userData } = user;
            return userData;
        });

        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

// Contenido pendiente de aprobación (solo admin)
app.get('/api/admin/content/pending', auth, checkDB, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        const result = await db.cluster.query(
            `SELECT * FROM \`mediaapp\` 
             WHERE id LIKE 'content::%' AND status = 'pending'`
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Pending content error:', error);
        res.status(500).json({ error: 'Error al obtener contenido pendiente' });
    }
});

// Aprobar/rechazar contenido (solo admin)
app.put('/api/admin/content/:id/status', auth, checkDB, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        const { id } = req.params;
        const { status } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Estado inválido' });
        }

        await db.collection.mutateIn(`content::${id}`, [
            db.couchbase.MutateInSpec.upsert('status', status)
        ]);

        res.json({ message: `Contenido ${status === 'approved' ? 'aprobado' : 'rechazado'}` });
    } catch (error) {
        console.error('Update content status error:', error);
        res.status(500).json({ error: 'Error al actualizar estado del contenido' });
    }
});

// Toggle favorito
app.post('/api/content/:id/favorite', auth, checkDB, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Aquí implementarías la lógica de favoritos
        // Por ahora devolvemos un estado simulado
        const isFavorite = Math.random() > 0.5;
        
        res.json({ isFavorite });
    } catch (error) {
        console.error('Favorite error:', error);
        res.status(500).json({ error: 'Error al actualizar favoritos' });
    }
});

// Stream de contenido
app.get('/api/stream/:id', auth, checkDB, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Por ahora simulamos la URL del archivo
        // En producción aquí iría la lógica de streaming real
        const streamUrl = `/api/content/file/${id}`;
        
        res.json({ streamUrl });
    } catch (error) {
        console.error('Stream error:', error);
        res.status(500).json({ error: 'Error al preparar stream' });
    }
});

// Servir archivos estáticos
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

app.get('/music.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/music.html'));
});

app.get('/movies.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/movies.html'));
});

app.get('/books.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/books.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

app.get('/artist.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/artist.html'));
});

app.get('/profile.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/profile.html'));
});

// Manejo de errores 404
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint no encontrado' });
});

// Manejo de errores global
app.use((error, req, res, next) => {
    console.error('Error global:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
});

// Inicializar servidor
const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        // Inicializar base de datos
        await db.init();
        console.log('✅ Base de datos inicializada');
    } catch (error) {
        console.log('⚠️  Ejecutando en modo sin base de datos');
    }

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 UCSPstream Server running on port ${PORT}`);
        console.log(`📍 Local: http://localhost:${PORT}`);
        console.log(`🌐 Network: http://[YOUR_IP]:${PORT}`);
        console.log(`❤️  Health: http://localhost:${PORT}/api/health`);
        console.log(`\n👤 Usuario admin: admin@ucsp.edu / password`);
        console.log(`📊 Estado BD: ${db.initialized ? 'CONECTADA' : 'NO CONECTADA'}`);
    });
}

startServer();