import Knex from 'knex'
import { Injectable, Config } from '@dynejs/core'

export interface ConnectConfig {
    host: string
    user: string
    password: string
    database: string
    client: string
    filename?: string //Testing
}

@Injectable()
export class Connection {

    /**
     * Active connection instance
     */
    connection: Knex

    /**
     * Configuration service
     */
    config: Config

    constructor(config: Config) {
        this.config = config
    }

    /**
     * Create a database connection
     */
    connect() {
        const config = this.config.get('database')

        if (!config || typeof config !== 'object') {
            return
        }

        this.connection = Knex({
            client: this.config.get('database.client', 'mysql'),
            useNullAsDefault: true,
            connection: {
                host: this.config.get('database.host', '127.0.0.1'),
                user: this.config.get('database.user', 'root'),
                password: this.config.get('database.password', ''),
                database: this.config.get('database.database', ''),
                filename: this.config.get('database.filename', '127.0.0.1'),
            }
        })
    }

    /**
     * Get active connection
     */
    active() {
        return this.connection
    }
}
