import { Relation } from './relation'
import Knex from 'knex'
import { DBRow, Repo } from '../repo'

export class BelongsTo extends Relation {

    query(query: Knex.QueryBuilder) {
        const whereIds = this.result.map(item => item[this.getLocalKey()])
        query.whereIn(this.getForeignKey(), whereIds)
    }

    async appendResult(relatedResult: DBRow[]): Promise<any> {
        const foreignKey = this.getForeignKey()
        const localKey = this.getLocalKey()

        this.result.forEach(item => {
            const relationSet = relatedResult.find(relatedItem => {
                return item[localKey] === relatedItem[foreignKey]
            })

            item[this.meta.as] = Repo.format(this.meta.model(), relationSet)
        })
    }

    private getLocalKey() {
        return this.meta.localKey
            ? this.meta.localKey
            : this.relatedIdentifier()
    }

    private getForeignKey() {
        return this.meta.foreignKey
            ? this.meta.foreignKey
            : 'id'
    }
}
