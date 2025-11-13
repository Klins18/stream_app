const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = 'your-secret-key';

class AuthController {
    static async login(req, res) {
        try {
            const { email, password } = req.body;
            
            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }

            if (user.status !== 'active') {
                return res.status(401).json({ error: 'Cuenta inactiva. Contacta al administrador.' });
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
            res.status(500).json({ error: 'Error del servidor' });
        }
    }

    static async register(req, res) {
        try {
            const { username, email, password, role } = req.body;
            
            // Validar roles permitidos en registro
            const allowedRoles = ['client', 'artist'];
            if (!allowedRoles.includes(role)) {
                return res.status(400).json({ error: 'Rol no permitido' });
            }

            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                return res.status(400).json({ error: 'El usuario ya existe' });
            }

            const user = await User.create({ username, email, password, role });
            
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
            res.status(500).json({ error: 'Error del servidor' });
        }
    }
}

module.exports = AuthController;