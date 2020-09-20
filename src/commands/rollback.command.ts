import { ICommand } from '@dynejs/core'
import { Migrator } from '../migrator'

export class RollbackCommand implements ICommand {
    async handle({ container }) {
        await container.resolve(Migrator).rollback()
    }
}
