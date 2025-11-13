const { getBucket } = require('./database');

class Content {
    static async create(contentData) {
        const bucket = getBucket();
        const contentId = `content_${Date.now()}`;
        
        const content = {
            id: contentId,
            title: contentData.title,
            description: contentData.description,
            type: contentData.type,
            file_path: contentData.file_path,
            artist_id: contentData.artist_id,
            upload_date: new Date().toISOString(),
            duration: contentData.duration,
            genre: contentData.genre,
            status: 'pending',
            thumbnail: contentData.thumbnail
        };

        await bucket.collection('content').insert(contentId, content);
        return content;
    }

    static async findByType(type) {
        const bucket = getBucket();
        const query = `SELECT * FROM \`mediaapp\`.\`_default\`.\`content\` WHERE type = $1 AND status = 'approved'`;
        const result = await bucket.scope('_default').query(query, [type]);
        return result.rows;
    }

    static async findPending() {
        const bucket = getBucket();
        const query = `SELECT * FROM \`mediaapp\`.\`_default\`.\`content\` WHERE status = 'pending'`;
        const result = await bucket.scope('_default').query(query);
        return result.rows;
    }
}

module.exports = Content;