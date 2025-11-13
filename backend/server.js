const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Datos en memoria (para pruebas)
let users = [
    {
        id: 'admin_1',
        username: 'Administrador',
        email: 'admin@ucsp.edu',
        password: '$2a$10$8K1p/a0dRTlM7kA5I0nZLOq6QY9QzJjJ8kZ8VnV8vX6vY5V2n2n2', // password
        role: 'admin',
        status: 'active'
    }
];
let content = [
    {
        id: 'music_1',
        title: 'Bandas UCSP 2024',
        type: 'music',
        description: 'Compilación musical de talentos UCSP',
        thumbnail: 'https://via.placeholder.com/200x120/1a1a2e/00a8ff?text=Música+UCSP',
        duration: '45:00',
        genre: 'Variado',
        status: 'approved'
    },
    {
        id: 'movie_1',
        title: 'Documental Científico',
        type: 'movie',
        description: 'Investigación y desarrollo en UCSP',
        thumbnail: 'https://via.placeholder.com/200x120/1a1a2e/00a8ff?text=Documental',
        duration: '30:00',
        genre: 'Documental',
        status: 'approved'
    },
    {
        id: 'book_1',
        title: 'Textos Académicos UCSP',
        type: 'book',
        description: 'Material de estudio y investigación',
        thumbnail: 'https://via.placeholder.com/200x120/1a1a2e/00a8ff?text=Libros+UCSP',
        duration: '320 págs',
        genre: 'Académico',
        status: 'approved'
    }
];

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

// Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'UCSPstream funcionando correctamente',
        timestamp: new Date().toISOString()
    });
});

// Registro
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        // Validar roles permitidos
        const allowedRoles = ['client', 'artist'];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ error: 'Rol no permitido en registro' });
        }

        // Verificar si el usuario existe
        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
            return res.status(400).json({ error: 'El usuario ya existe' });
        }

        // Crear usuario
        const user = {
            id: `user_${Date.now()}`,
            username,
            email,
            password: await bcrypt.hash(password, 10),
            role: role,
            created_at: new Date().toISOString(),
            status: 'active'
        };

        users.push(user);

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
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = users.find(u => u.email === email);
        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Para el usuario admin de prueba
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
app.get('/api/content', auth, (req, res) => {
    try {
        const { type, limit } = req.query;
        
        let filteredContent = content.filter(item => item.status === 'approved');
        
        if (type) {
            filteredContent = filteredContent.filter(item => item.type === type);
        }
        
        if (limit) {
            filteredContent = filteredContent.slice(0, parseInt(limit));
        }
        
        res.json(filteredContent);
    } catch (error) {
        console.error('Content error:', error);
        res.status(500).json({ error: 'Error al obtener contenido' });
    }
});

// Contenido recomendado
app.get('/api/content/recommended', auth, (req, res) => {
    try {
        const recommended = content
            .filter(item => item.status === 'approved')
            .slice(0, 4);
        res.json(recommended);
    } catch (error) {
        console.error('Recommended content error:', error);
        res.status(500).json({ error: 'Error al obtener contenido recomendado' });
    }
});

// Contenido reciente
app.get('/api/content/recent', auth, (req, res) => {
    try {
        const recent = content
            .filter(item => item.status === 'approved')
            .slice(0, 3);
        res.json(recent);
    } catch (error) {
        console.error('Recent content error:', error);
        res.status(500).json({ error: 'Error al obtener contenido reciente' });
    }
});

// Perfil de usuario
app.get('/api/users/profile', auth, (req, res) => {
    try {
        const user = users.find(u => u.id === req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const { password, ...userData } = user;
        res.json(userData);
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Error al obtener perfil' });
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`UCSPstream Server running on port ${PORT}`);
    console.log(`Local: http://localhost:${PORT}`);
    console.log(`Network: http://[YOUR_IP]:${PORT}`);
    console.log(`Health: http://localhost:${PORT}/api/health`);
    console.log(`\nUsuarios de prueba:`);
    console.log(`   Admin: admin@ucsp.edu / password`);
    console.log(`   Puedes registrar nuevos usuarios desde la app`);
});