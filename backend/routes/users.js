const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { auth, adminAuth } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(auth);

// Perfil del usuario actual
router.get('/profile', UserController.getProfile);

// Rutas solo para administradores
router.get('/admin/users', adminAuth, UserController.getAllUsers);
router.put('/admin/users/:userId/status', adminAuth, UserController.updateUserStatus);

module.exports = router;