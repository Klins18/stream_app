const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const db = require('./models/database');
const { uploadFiles, handleUploadErrors } = require('./middleware/upload');

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

        const validPassword = await bcrypt.compare(password, user.password);
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

// Subir contenido multimedia
app.post('/api/content/upload', auth, checkDB, uploadFiles, handleUploadErrors, async (req, res) => {
    try {
        if (req.user.role !== 'artist' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'No autorizado para subir contenido' });
        }

        const { title, description, type, duration, genre } = req.body;
        
        if (!title || !type) {
            return res.status(400).json({ error: 'Título y tipo son requeridos' });
        }

        // Verificar que se subió el archivo correcto
        let fileField = null;
        switch(type) {
            case 'music':
                fileField = 'musicFile';
                break;
            case 'movie':
                fileField = 'movieFile';
                break;
            case 'book':
                fileField = 'bookFile';
                break;
        }

        if (!req.files || !req.files[fileField]) {
            return res.status(400).json({ error: `Debes subir un archivo de ${type}` });
        }

        // Determinar rutas de archivos
        let filePath = null;
        let thumbnailPath = null;

        if (req.files[fileField]) {
            filePath = `/uploads/${type}s/${req.files[fileField][0].filename}`;
        }
        
        if (req.files.thumbnail) {
            thumbnailPath = `/uploads/thumbnails/${req.files.thumbnail[0].filename}`;
        }

        const contentData = {
            title,
            description: description || '',
            type,
            duration: duration || '',
            genre: genre || '',
            file_path: filePath,
            thumbnail: thumbnailPath || `https://via.placeholder.com/200x120/1a1a2e/00a8ff?text=${encodeURIComponent(title)}`,
            artist_id: req.user.userId,
            status: req.user.role === 'admin' ? 'approved' : 'pending',
            created_at: new Date().toISOString()
        };

        const contentId = `content::${Date.now()}`;
        await db.collection.upsert(contentId, contentData);

        res.status(201).json({
            id: contentId,
            ...contentData,
            message: req.user.role === 'admin' ? 'Contenido subido y aprobado' : 'Contenido subido. Esperando aprobación.'
        });

    } catch (error) {
        console.error('Upload content error:', error);
        res.status(500).json({ error: 'Error al subir contenido' });
    }
});

// Subir foto de perfil
app.post('/api/users/profile/picture', auth, checkDB, uploadFiles, handleUploadErrors, async (req, res) => {
    try {
        if (!req.files || !req.files.profilePicture) {
            return res.status(400).json({ error: 'No se subió ninguna imagen' });
        }

        const profilePicturePath = `/uploads/profile_pictures/${req.files.profilePicture[0].filename}`;
        
        await db.collection.mutateIn(req.user.userId, [
            db.couchbase.MutateInSpec.upsert('profile_picture', profilePicturePath)
        ]);

        res.json({ 
            message: 'Foto de perfil actualizada',
            profile_picture: profilePicturePath
        });
    } catch (error) {
        console.error('Profile picture upload error:', error);
        res.status(500).json({ error: 'Error al subir foto de perfil' });
    }
});

// Eliminar foto de perfil
app.delete('/api/users/profile/picture', auth, checkDB, async (req, res) => {
    try {
        await db.collection.mutateIn(req.user.userId, [
            db.couchbase.MutateInSpec.remove('profile_picture')
        ]);

        res.json({ message: 'Foto de perfil eliminada' });
    } catch (error) {
        console.error('Remove profile picture error:', error);
        res.status(500).json({ error: 'Error al eliminar foto de perfil' });
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

// Actualizar perfil completo
app.put('/api/users/profile', auth, checkDB, async (req, res) => {
    try {
        const { username, fullName, phone, bio, social } = req.body;
        
        const updates = {};
        if (username) updates.username = username;
        if (fullName) updates.full_name = fullName;
        if (phone) updates.phone = phone;
        if (bio) updates.bio = bio;
        if (social) updates.social = social;
        
        await db.collection.mutateIn(req.user.userId, [
            db.couchbase.MutateInSpec.upsert('username', username || ''),
            db.couchbase.MutateInSpec.upsert('full_name', fullName || ''),
            db.couchbase.MutateInSpec.upsert('phone', phone || ''),
            db.couchbase.MutateInSpec.upsert('bio', bio || ''),
            db.couchbase.MutateInSpec.upsert('social', social || {})
        ]);

        res.json({ 
            message: 'Perfil actualizado correctamente',
            user: {
                username,
                full_name: fullName,
                phone,
                bio,
                social
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Error al actualizar perfil' });
    }
});

// Obtener contenido del artista
app.get('/api/content/my', auth, checkDB, async (req, res) => {
    try {
        const { artistId } = req.query;
        
        const result = await db.cluster.query(
            `SELECT * FROM \`mediaapp\` 
             WHERE id LIKE 'content::%' AND artist_id = $1 
             ORDER BY created_at DESC`,
            [artistId || req.user.userId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Get my content error:', error);
        res.status(500).json({ error: 'Error al obtener contenido' });
    }
});

// Servir archivos subidos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Servir archivos estáticos del frontend
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