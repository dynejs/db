import assert = require('assert')
import { app, container } from '@dynejs/core'
import { Connection } from '../src'
import { DatabaseModule } from '../src'

describe('Connection', function() {
    before(() => {
        app([
            DatabaseModule
        ], process.cwd() + '/test')
    })

    it('should connect with configuration and store active', function() {
        assert(container().resolve(Connection).active())
    })
})
