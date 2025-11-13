const User = require('../models/User');

class UserController {
    static async getProfile(req, res) {
        try {
            const user = await User.findById(req.user.userId);
            if (!user) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            // No enviar la contraseña
            const { password, ...userData } = user;
            res.json(userData);
        } catch (error) {
            res.status(500).json({ error: 'Error del servidor' });
        }
    }

    static async getAllUsers(req, res) {
        try {
            // Solo administradores pueden ver todos los usuarios
            if (req.user.role !== 'admin') {
                return res.status(403).json({ error: 'No autorizado' });
            }

            const users = await User.findAll();
            res.json(users);
        } catch (error) {
            res.status(500).json({ error: 'Error del servidor' });
        }
    }

    static async updateUserStatus(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ error: 'No autorizado' });
            }

            const { userId } = req.params;
            const { status } = req.body;

            await User.updateStatus(userId, status);
            res.json({ message: 'Estado actualizado correctamente' });
        } catch (error) {
            res.status(500).json({ error: 'Error del servidor' });
        }
    }
}

module.exports = UserController;