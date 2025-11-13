const couchbase = require('couchbase');

class CouchbaseManager {
    constructor() {
        this.cluster = null;
        this.bucket = null;
        this.collection = null;
        this.initialized = false;
        this.couchbase = couchbase; // Exportar couchbase para usar MutateInSpec
    }

    async init() {
        try {
            console.log('🔌 Conectando a Couchbase...');
            
            this.cluster = await couchbase.connect('couchbase://127.0.0.1', {
                username: 'Administrator',
                password: 'password123'
            });

            this.bucket = this.cluster.bucket('mediaapp');
            this.collection = this.bucket.defaultCollection();
            
            // Crear índices primarios
            try {
                await this.cluster.query('CREATE PRIMARY INDEX ON `mediaapp`');
                console.log('✅ Índice primario creado');
            } catch (e) {
                console.log('ℹ️  Índice ya existe');
            }

            // Insertar datos iniciales
            await this.initializeData();
            
            this.initialized = true;
            console.log('✅ Couchbase conectado y configurado');
            
        } catch (error) {
            console.error('❌ Error conectando a Couchbase:', error.message);
            this.initialized = false;
        }
    }

    async initializeData() {
        try {
            // Verificar si ya existen datos
            const userCheck = await this.getUserByEmail('admin@ucsp.edu');
            if (!userCheck) {
                console.log('📝 Insertando datos iniciales...');
                
                // Usuario admin
                const adminUser = {
                    id: 'user::admin_1',
                    username: 'Administrador',
                    email: 'admin@ucsp.edu',
                    password: '$2a$10$8K1p/a0dRTlM7kA5I0nZLOq6QY9QzJjJ8kZ8VnV8vX6vY5V2n2n2', // "password" encriptado
                    role: 'admin',
                    status: 'active',
                    created_at: new Date().toISOString()
                };
                await this.collection.upsert(adminUser.id, adminUser);

                // Contenido de ejemplo
                const sampleContent = [
                    {
                        id: 'content::1',
                        title: 'Bandas UCSP 2024',
                        type: 'music',
                        description: 'Compilación musical de talentos UCSP',
                        thumbnail: 'https://via.placeholder.com/200x120/1a1a2e/00a8ff?text=Música+UCSP',
                        duration: '45:00',
                        genre: 'Variado',
                        status: 'approved',
                        created_at: new Date().toISOString()
                    },
                    {
                        id: 'content::2',
                        title: 'Documental Científico UCSP',
                        type: 'movie',
                        description: 'Investigación y desarrollo en la universidad',
                        thumbnail: 'https://via.placeholder.com/200x120/1a1a2e/00a8ff?text=Documental',
                        duration: '30:00',
                        genre: 'Documental',
                        status: 'approved',
                        created_at: new Date().toISOString()
                    },
                    {
                        id: 'content::3',
                        title: 'Textos Académicos UCSP',
                        type: 'book',
                        description: 'Material de estudio e investigación',
                        thumbnail: 'https://via.placeholder.com/200x120/1a1a2e/00a8ff?text=Libros+UCSP',
                        duration: '320 págs',
                        genre: 'Académico',
                        status: 'approved',
                        created_at: new Date().toISOString()
                    }
                ];

                for (const content of sampleContent) {
                    await this.collection.upsert(content.id, content);
                }

                console.log('✅ Datos iniciales insertados');
            }
        } catch (error) {
            console.error('Error insertando datos iniciales:', error);
        }
    }

    async getUserByEmail(email) {
        try {
            const result = await this.cluster.query(
                `SELECT * FROM \`mediaapp\` WHERE email = $1 AND id LIKE 'user::%'`,
                [email]
            );
            return result.rows.length > 0 ? result.rows[0] : null;
        } catch (error) {
            return null;
        }
    }

    async createUser(userData) {
        const userId = `user::${Date.now()}`;
        const user = {
            ...userData,
            id: userId,
            created_at: new Date().toISOString()
        };
        await this.collection.upsert(userId, user);
        return user;
    }

    async getContentByType(type, limit = 10) {
        try {
            let query = `SELECT * FROM \`mediaapp\` WHERE id LIKE 'content::%' AND status = 'approved'`;
            const params = [];
            
            if (type) {
                query += ` AND type = $1`;
                params.push(type);
            }
            
            query += ` ORDER BY created_at DESC LIMIT ${limit}`;
            
            const result = await this.cluster.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Error getting content:', error);
            return [];
        }
    }
}

module.exports = new CouchbaseManager();