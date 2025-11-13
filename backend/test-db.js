const db = require('./models/database');

async function test() {
    try {
        await db.init();
        console.log('✅ Couchbase funciona correctamente');
        
        const users = await db.getContentByType('music');
        console.log('Contenido:', users);
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

test();