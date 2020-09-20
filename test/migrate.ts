import { app, container } from '@dynejs/core'
import { DatabaseModule, Migrator } from '../src'


app([
    DatabaseModule
], process.cwd() + '/test')

const migrator = container().resolve(Migrator)

migrator.migrate().then(() => {
    process.exit(0)
}).catch(err => {
    console.log(err)
    process.exit(1)
})
