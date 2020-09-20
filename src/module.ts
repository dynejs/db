import { Module, Command } from '@dynejs/core'
import { Migrator, Connection } from './index'
import { MigrationCommand } from './commands/migration.command'
import { RollbackCommand } from './commands/rollback.command'

export class DatabaseModule extends Module {

    /**
     * Registering services
     */
    register() {
        this.container.registerMany([
            Migrator,
            Connection
        ])

        this.registerCommands()

        // We connect right away
        this.connect()
    }

    /**
     * Register database commands
     */
    registerCommands() {
        const commands = this.container.resolve(Command)

        commands.add('migration:migrate', MigrationCommand)
        commands.add('migration:rollback', RollbackCommand)
    }

    /**
     * Make a database connection
     */
    connect() {
        this.container.resolve(Connection).connect()
    }
}
