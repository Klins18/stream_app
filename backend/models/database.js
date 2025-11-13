const couchbase = require('couchbase');

const clusterConnStr = 'couchbase://localhost';
const username = 'Administrator';
const password = 'password';
const bucketName = 'mediaapp';

let cluster;
let bucket;

async function initDatabase() {
    try {
        cluster = await couchbase.connect(clusterConnStr, {
            username: username,
            password: password,
        });
        bucket = cluster.bucket(bucketName);
        console.log('Connected to Couchbase');
        return { cluster, bucket };
    } catch (error) {
        console.error('Database connection failed:', error);
        throw error;
    }
}

module.exports = { initDatabase, getBucket: () => bucket, getCluster: () => cluster };