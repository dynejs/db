import path = require('path')
import { Config, Injectable } from '@dynejs/core'
import { Connection } from './connection'

@Injectable()
export class Migrator {

    /**
     * Directories where the migration files exists
     */
    dirs: string[]

    /**
     * Connection service
     */
    private connection: Connection

    constructor(config: Config, connection: Connection) {
        this.connection = connection
        this.dirs = []
        const baseDirs = config.get('migrations')

        if (baseDirs && Array.isArray(baseDirs)) {
            baseDirs.forEach(dir => this.addDir(dir))
        }
    }

    /**
     * Add new directory to migration dirs
     * Should be used in module register
     *
     * @param dir
     */
    addDir(dir: string) {
        this.dirs.push(path.normalize(dir))
    }

    /**
     * Migrating the database
     */
    async migrate() {
        const db = this.connection.active()
        await db.migrate.latest({
            disableMigrationsListValidation: true,
            directory: this.dirs
        })

        console.log('Migrated')

        return true
    }

    /**
     * Rollback a migration
     */
    async rollback() {
        const db = this.connection.active()
        await db.migrate.rollback({
            disableMigrationsListValidation: true,
            directory: this.dirs
        })

        console.log('Rolled back')

        return true
    }
}




