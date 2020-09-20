module.exports = {
    database: {
        // host: '127.0.0.1',
        // user: 'root',
        // password: '',
        filename: './test.db',
        client: 'sqlite3'
    },
    migrations: [
        __dirname + '/migrations'
    ]
}
