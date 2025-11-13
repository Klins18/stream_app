const { getBucket } = require('./database');
const bcrypt = require('bcryptjs');

class User {
    static async create(userData) {
        const bucket = getBucket();
        const userId = `user_${Date.now()}`;
        
        const user = {
            id: userId,
            username: userData.username,
            email: userData.email,
            password: await bcrypt.hash(userData.password, 10),
            role: userData.role || 'client', // client, artist, admin
            created_at: new Date().toISOString(),
            status: 'active',
            profile_picture: null
        };

        await bucket.collection('users').insert(userId, user);
        return user;
    }

    static async findByEmail(email) {
        const bucket = getBucket();
        const query = `SELECT * FROM \`mediaapp\`.\`_default\`.\`users\` WHERE email = $1`;
        const result = await bucket.scope('_default').query(query, [email]);
        return result.rows[0] || null;
    }

    static async findById(id) {
        const bucket = getBucket();
        try {
            const result = await bucket.collection('users').get(id);
            return result.content;
        } catch (error) {
            return null;
        }
    }

    static async findAll() {
        const bucket = getBucket();
        const query = `SELECT * FROM \`mediaapp\`.\`_default\`.\`users\` WHERE role != 'admin'`;
        const result = await bucket.scope('_default').query(query);
        return result.rows;
    }

    static async updateStatus(userId, status) {
        const bucket = getBucket();
        await bucket.collection('users').mutateIn(userId, [
            couchbase.MutateInSpec.upsert('status', status)
        ]);
    }
}

module.exports = User;