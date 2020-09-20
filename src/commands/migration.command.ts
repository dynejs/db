import { ICommand } from '@dynejs/core'
import { Migrator } from '../migrator'

export class MigrationCommand implements ICommand {
    async handle({ container }) {
        await container.resolve(Migrator).migrate()
    }
}
