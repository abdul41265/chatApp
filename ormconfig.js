module.exports = {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    username: 'postgres',
    password: '123',
    database: 'chatApp',
    synchronize: true,
    logging: true,
    entities: [process.env.NODE_ENV === 'production' ? './src/**/*.entity.ts': undefined, './dist/**/*.entity.js']
}