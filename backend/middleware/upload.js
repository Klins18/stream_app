const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Crear directorios si no existen
const uploadsDir = path.join(__dirname, '../uploads');
const musicDir = path.join(uploadsDir, 'music');
const moviesDir = path.join(uploadsDir, 'movies');
const booksDir = path.join(uploadsDir, 'books');
const thumbnailsDir = path.join(uploadsDir, 'thumbnails');
const profilePicturesDir = path.join(uploadsDir, 'profile_pictures');

// Crear todos los directorios necesarios
[uploadsDir, musicDir, moviesDir, booksDir, thumbnailsDir, profilePicturesDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Directorio creado: ${dir}`);
    }
});

// Configurar almacenamiento
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadPath = uploadsDir;
        
        switch (file.fieldname) {
            case 'musicFile':
                uploadPath = musicDir;
                break;
            case 'movieFile':
                uploadPath = moviesDir;
                break;
            case 'bookFile':
                uploadPath = booksDir;
                break;
            case 'thumbnail':
                uploadPath = thumbnailsDir;
                break;
            case 'profilePicture':
                uploadPath = profilePicturesDir;
                break;
            default:
                uploadPath = uploadsDir;
        }
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Generar nombre único: timestamp-randomNumber-extensión
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

// Filtrar tipos de archivo
const fileFilter = (req, file, cb) => {
    const allowedTypes = {
        musicFile: ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/flac', 'audio/m4a'],
        movieFile: ['video/mp4', 'video/avi', 'video/mkv', 'video/mov', 'video/webm'],
        bookFile: ['application/pdf', 'application/epub+zip'],
        thumbnail: ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'],
        profilePicture: ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp']
    };

    if (allowedTypes[file.fieldname] && allowedTypes[file.fieldname].includes(file.mimetype)) {
        cb(null, true);
    } else {
        const error = new Error(`Tipo de archivo no permitido para ${file.fieldname}. Tipo recibido: ${file.mimetype}`);
        error.status = 400;
        cb(error, false);
    }
};

// Configurar multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB máximo para archivos grandes
        files: 5 // Máximo 5 archivos
    }
});

// Middleware para subir múltiples archivos
const uploadFiles = upload.fields([
    { name: 'musicFile', maxCount: 1 },
    { name: 'movieFile', maxCount: 1 },
    { name: 'bookFile', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
    { name: 'profilePicture', maxCount: 1 }
]);

// Middleware para manejar errores de multer
const handleUploadErrors = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'El archivo es demasiado grande. Máximo 100MB.' });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ error: 'Demasiados archivos.' });
        }
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({ error: 'Tipo de archivo no esperado.' });
        }
    }
    
    if (error) {
        return res.status(400).json({ error: error.message });
    }
    
    next();
};

module.exports = { 
    uploadFiles, 
    handleUploadErrors 
};